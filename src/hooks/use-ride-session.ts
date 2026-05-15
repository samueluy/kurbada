import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

import { createId } from '@/lib/id';
import { queryClient } from '@/lib/query-client';
import {
  appendRidePoints,
  type StoredRideSession,
  clearActiveRidePointSession,
  clearRidePoints,
  getStoredRideSession,
  initializeRidePointStorage,
  setStoredRideSession,
  setActiveRidePointSession,
} from '@/lib/ride-point-storage';
import { buildRouteGeoJson, computeRouteBounds, haversineDistanceKm, simplifyRoute } from '@/lib/route';
import { sleep } from '@/lib/time';
import { useAuth } from '@/hooks/use-auth';
import { useRideMutations } from '@/hooks/use-kurbada-data';
import { useRideStore } from '@/store/ride-store';
import { clearStoredCoords, getStoredCoords, LOCATION_TASK_NAME } from '@/tasks/location-task';
import { useAppStore } from '@/store/app-store';
import { cancelRideReminders, scheduleStopRideReminder } from '@/lib/ride-reminder-notifications';
import type { RidePoint } from '@/types/domain';

Accelerometer.setUpdateInterval(100);

const DISPLAY_SPEEDOMETER_BOOST = 1.03;
const LOW_GRAVITY_THRESHOLD_G = 0.45;
const IMPACT_THRESHOLD_G = 4.0;
const SEVERE_IMPACT_THRESHOLD_G = 6.0;
const IMPACT_SEQUENCE_WINDOW_MS = 1800;
const CRASH_TRIGGER_HOLD_MS = 250;
const MAX_REASONABLE_SPEED_KMH = 280;
const MAX_SPEED_DELTA_PER_SECOND_KMH = 36;

function toDisplaySpeedKmh(speedKmh: number) {
  return Number((Math.max(0, speedKmh) * DISPLAY_SPEEDOMETER_BOOST).toFixed(1));
}

export function useRideSession() {
  const { session } = useAuth();
  const { saveRide } = useRideMutations(session?.user.id);
  const rideSessionState = useRideStore((state) => state.state);
  const rideBikeId = useRideStore((state) => state.bikeId);
  const rideStartedAt = useRideStore((state) => state.startedAt);
  const rideSpeedKmh = useRideStore((state) => state.speedKmh);
  const rideDistanceKm = useRideStore((state) => state.distanceKm);
  const rideDurationSeconds = useRideStore((state) => state.durationSeconds);
  const rideAltitudeMeters = useRideStore((state) => state.altitudeMeters);
  const rideElevationGainM = useRideStore((state) => state.elevationGainM);
  const rideEstimatedFuelLiters = useRideStore((state) => state.estimatedFuelLiters);
  const rideEstimatedFuelCost = useRideStore((state) => state.estimatedFuelCost);
  const rideCrashCountdown = useRideStore((state) => state.crashCountdown);
  const rideFatiguePromptShown = useRideStore((state) => state.fatiguePromptShown);
  const rideActions = {
    resetRide: useRideStore((state) => state.resetRide),
    setBikeId: useRideStore((state) => state.setBikeId),
    setFuelPricePerLiter: useRideStore((state) => state.setFuelPricePerLiter),
    setFuelRateKmPerLiter: useRideStore((state) => state.setFuelRateKmPerLiter),
    setStartedAt: useRideStore((state) => state.setStartedAt),
    setState: useRideStore((state) => state.setState),
    setCrashCountdown: useRideStore((state) => state.setCrashCountdown),
    setFatiguePromptShown: useRideStore((state) => state.setFatiguePromptShown),
  };
  const telemetry = useMemo(() => ({
    speedKmh: rideSpeedKmh,
    displaySpeedKmh: toDisplaySpeedKmh(rideSpeedKmh),
    distanceKm: rideDistanceKm,
    durationSeconds: rideDurationSeconds,
    maxSpeedKmh: useRideStore.getState().maxSpeedKmh,
    altitudeMeters: rideAltitudeMeters,
    elevationGainM: rideElevationGainM,
    estimatedFuelLiters: rideEstimatedFuelLiters,
    estimatedFuelCost: rideEstimatedFuelCost,
    gForce: useRideStore.getState().gForce,
    heading: useRideStore.getState().heading,
  }), [
    rideAltitudeMeters,
    rideDistanceKm,
    rideDurationSeconds,
    rideElevationGainM,
    rideEstimatedFuelCost,
    rideEstimatedFuelLiters,
    rideSpeedKmh,
  ]);
  const rideState = {
    state: rideSessionState,
    bikeId: rideBikeId,
    startedAt: rideStartedAt,
    telemetry,
    crashCountdown: rideCrashCountdown,
    fatiguePromptShown: rideFatiguePromptShown,
  };
  const crashAlertsEnabled = useAppStore((state) => state.crashAlertsEnabled);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const accelSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const crashThresholdSinceRef = useRef<number | null>(null);
  const lowGravitySinceRef = useRef<number | null>(null);
  const recentGForcesRef = useRef<number[]>([]);
  const recentSpeedsRef = useRef<number[]>([]);
  const foregroundPointsRef = useRef<RidePoint[]>([]);
  const pendingPersistPointsRef = useRef<RidePoint[]>([]);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rideStartedAtRef = useRef<number | null>(null);
  const rideIdRef = useRef<string | null>(null);
  const startingAltitudeRef = useRef<number | null>(null);
  const lastGForcePublishAtRef = useRef(0);
  const stationarySinceRef = useRef<number | null>(null);
  const stopReminderFiredRef = useRef(false);
  const getRideState = useRideStore.getState;

  const invalidateRecoveryQuery = () => {
    void queryClient.invalidateQueries({ queryKey: ['unfinished-ride-recovery'] });
  };

  const persistRideSessionSnapshot = async (overrides?: Partial<StoredRideSession>) => {
    const rideId = overrides?.rideId ?? rideIdRef.current;
    const currentStore = getRideState();

    if (!rideId || !currentStore.bikeId || !currentStore.startedAt) {
      return;
    }

    await setStoredRideSession({
      rideId,
      bikeId: overrides?.bikeId ?? currentStore.bikeId,
      startedAt: overrides?.startedAt ?? currentStore.startedAt,
      fuelPricePerLiter: overrides?.fuelPricePerLiter ?? currentStore.fuelPricePerLiter,
      fuelRateKmPerLiter: overrides?.fuelRateKmPerLiter ?? currentStore.fuelRateKmPerLiter,
      mode: overrides?.mode ?? 'hustle',
      startingAltitude: overrides?.startingAltitude ?? startingAltitudeRef.current,
      lastPointTimestamp:
        overrides?.lastPointTimestamp
        ?? foregroundPointsRef.current[foregroundPointsRef.current.length - 1]?.timestamp
        ?? null,
    });
    invalidateRecoveryQuery();
  };

  useEffect(() => {
    void initializeRidePointStorage();
  }, []);

  const buildTelemetryFromPoints = (
    points: RidePoint[],
    sessionMeta: StoredRideSession,
  ) => {
    const normalizedPoints = normalizeRidePoints(points);
    const totalDistance = normalizedPoints.reduce((sum, p, index) => {
      if (index === 0) return 0;
      return sum + haversineDistanceKm(normalizedPoints[index - 1], p);
    }, 0);
    const maxSpeed = normalizedPoints.reduce((max, point) => Math.max(max, point.speedKmh), 0);
    const latestPoint = normalizedPoints[normalizedPoints.length - 1];

    let elevationGain = 0;
    normalizedPoints.forEach((point, index) => {
      if (index === 0) return;
      const previous = normalizedPoints[index - 1];
      if (previous.altitude == null || point.altitude == null) {
        return;
      }
      const delta = point.altitude - previous.altitude;
      if (delta > 3) {
        elevationGain += delta;
      }
    });

    const relativeAltitude =
      latestPoint?.altitude != null && sessionMeta.startingAltitude != null
        ? latestPoint.altitude - sessionMeta.startingAltitude
        : 0;
    const durationSeconds = Math.max(
      0,
      Math.floor(((latestPoint?.timestamp ?? Date.now()) - sessionMeta.startedAt) / 1000),
    );
    const averageSpeed =
      durationSeconds > 0 ? Number((totalDistance / (durationSeconds / 3600)).toFixed(1)) : 0;
    const fuelRate = Math.max(sessionMeta.fuelRateKmPerLiter, 0.1);
    const estimatedFuelLiters = totalDistance / fuelRate;
    const estimatedFuelCost = estimatedFuelLiters * sessionMeta.fuelPricePerLiter;

    return {
      normalizedPoints,
      totalDistance,
      maxSpeed,
      averageSpeed,
      elevationGain,
      relativeAltitude,
      durationSeconds,
      estimatedFuelLiters,
      estimatedFuelCost,
    };
  };

  const buildRideRecord = (
    sessionMeta: StoredRideSession,
    points: RidePoint[],
  ) => {
    const {
      normalizedPoints,
      totalDistance,
      maxSpeed,
      averageSpeed,
      elevationGain,
      estimatedFuelLiters,
    } = buildTelemetryFromPoints(points, sessionMeta);
    const fullRoutePoints = simplifyRoute(normalizedPoints, 6);
    const previewRoutePoints = simplifyRoute(normalizedPoints, 40);
    const routeGeoJson = buildRouteGeoJson(fullRoutePoints);
    const routePreviewGeoJson = buildRouteGeoJson(
      previewRoutePoints.length ? previewRoutePoints : fullRoutePoints,
    );
    const bounds = computeRouteBounds(fullRoutePoints.length ? fullRoutePoints : normalizedPoints);
    const endedAt = new Date(
      normalizedPoints[normalizedPoints.length - 1]?.timestamp ?? Date.now(),
    ).toISOString();

    return {
      id: sessionMeta.rideId,
      bike_id: sessionMeta.bikeId,
      user_id: session?.user.id,
      mode: sessionMeta.mode,
      started_at: new Date(sessionMeta.startedAt).toISOString(),
      ended_at: endedAt,
      distance_km: Number(totalDistance.toFixed(1)),
      max_speed_kmh: Number(maxSpeed.toFixed(1)),
      avg_speed_kmh: Number(averageSpeed.toFixed(1)),
      max_lean_angle_deg: null,
      fuel_used_liters: Number(estimatedFuelLiters.toFixed(2)),
      elevation_gain_m: Number(elevationGain.toFixed(1)),
      mood: null,
      route_geojson: routeGeoJson,
      route_preview_geojson: routePreviewGeoJson,
      route_point_count_raw: normalizedPoints.length,
      route_point_count_simplified: fullRoutePoints.length,
      route_bounds: bounds,
    };
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const currentStore = getRideState();

      if (currentStore.state === 'active' && currentStore.startedAt) {
        currentStore.updateTelemetry({
          durationSeconds: Math.max(0, Math.floor((Date.now() - currentStore.startedAt) / 1000)),
        });
      }

      if (currentStore.crashCountdown !== null) {
        if (currentStore.crashCountdown <= 1) {
          requestHelp();
        } else {
          currentStore.setCrashCountdown(currentStore.crashCountdown - 1);
        }
      }

      // Fatigue nudge: after 3h continuous ride, prompt a break once
      if (currentStore.state === 'active' && rideStartedAtRef.current) {
        const minutes = Math.floor((Date.now() - rideStartedAtRef.current) / 60000);
        if (minutes >= 180 && !currentStore.fatiguePromptShown) {
          currentStore.setFatiguePromptShown(true);
        }
      }

      // Stationary detection for stop-ride reminder
      const stopRemindersEnabled = useAppStore.getState().stopRideRemindersEnabled;
      if (currentStore.state === 'active' && stopRemindersEnabled && !stopReminderFiredRef.current) {
        const speed = currentStore.speedKmh;
        if (speed < 3) {
          if (!stationarySinceRef.current) {
            stationarySinceRef.current = Date.now();
          }
          const stationarySeconds = Math.floor((Date.now() - stationarySinceRef.current) / 1000);
          currentStore.setStationarySince(stationarySinceRef.current);
          if (stationarySeconds >= 180 && !stopReminderFiredRef.current) {
            stopReminderFiredRef.current = true;
            void scheduleStopRideReminder(Math.round(stationarySeconds / 60));
          }
        } else {
          stationarySinceRef.current = null;
          currentStore.setStationarySince(null);
        }
      }

      // Remote stop trigger from notification tap
      if (currentStore.stopRideRequested && (currentStore.state === 'active' || currentStore.state === 'starting')) {
        currentStore.setStopRideRequested(false);
        void stopRide();
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (rideState.state !== 'active') {
      recentGForcesRef.current = [];
      recentSpeedsRef.current = [];
      startingAltitudeRef.current = null;
      cleanupSubscriptions();
      return;
    }

    // Keep accelerometer only for crash detection (g-force spike).
    accelSubscriptionRef.current = Accelerometer.addListener((reading) => {
      const rawGForce = Math.sqrt(reading.x ** 2 + reading.y ** 2 + reading.z ** 2);
      const currentStore = getRideState();
      if (Date.now() - lastGForcePublishAtRef.current >= 500) {
        lastGForcePublishAtRef.current = Date.now();
        currentStore.updateTelemetry({ gForce: rawGForce });
      }
      maybeTriggerCrashAlert({
        rawGForce,
        smoothedGForce: getSmoothedGForce(rawGForce),
        speedKmh: currentStore.speedKmh,
      });
    });

    startLocationWatch().catch(() => undefined);

    return cleanupSubscriptions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideState.state]);

  useEffect(() => {
    if (rideState.state !== 'active') {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        void flushPendingPoints().then(() => persistRideSessionSnapshot()).catch(() => undefined);
      }
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideState.state]);

  const startRide = async (bikeId: string, fuelPricePerLiter: number, fuelRateKmPerLiter: number) => {
    rideActions.resetRide();
    stationarySinceRef.current = null;
    stopReminderFiredRef.current = false;
    void cancelRideReminders();
    foregroundPointsRef.current = [];
    pendingPersistPointsRef.current = [];
    crashThresholdSinceRef.current = null;
    lowGravitySinceRef.current = null;
    recentGForcesRef.current = [];
    recentSpeedsRef.current = [];
    rideIdRef.current = createId();
    startingAltitudeRef.current = null;
    rideActions.setBikeId(bikeId);
    rideActions.setFuelPricePerLiter(fuelPricePerLiter);
    rideActions.setFuelRateKmPerLiter(fuelRateKmPerLiter);
    rideActions.setStartedAt(Date.now());
    rideActions.setState('starting');
    rideStartedAtRef.current = Date.now();

    const fgPerm = await Location.requestForegroundPermissionsAsync();
    if (!fgPerm.granted) {
      rideActions.resetRide();
      throw new Error('Location permission is required to start a ride.');
    }

    await Location.requestBackgroundPermissionsAsync().catch(() => undefined);

    // Android 13+: foreground service notification won't show without this
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
      } catch {
        // ignore — pre-Android 13 devices don't support this
      }
    }

    await clearRidePoints(rideIdRef.current);
    await setActiveRidePointSession(rideIdRef.current);
    await persistRideSessionSnapshot({
      rideId: rideIdRef.current,
      bikeId,
      startedAt: rideStartedAtRef.current,
      fuelPricePerLiter,
      fuelRateKmPerLiter,
      mode: 'hustle',
      startingAltitude: null,
      lastPointTimestamp: null,
    });

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 2000,
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Ride tracking is active',
        notificationBody: 'Kurbada is recording your route, speed, and crash alerts.',
        notificationColor: '#E63946',
      },
    }).catch(() => undefined);

    await sleep(400);
    rideActions.setState('active');
  };

  const stopRide = async () => {
    stationarySinceRef.current = null;
    stopReminderFiredRef.current = false;
    void cancelRideReminders();

    if (!rideState.startedAt) {
      rideActions.setStartedAt(Date.now() - rideState.telemetry.durationSeconds * 1000);
    }

    const rideId = rideIdRef.current;

    if (!rideState.bikeId || !rideId) {
      rideActions.resetRide();
      return null;
    }

    rideActions.setState('stopping');
    cleanupSubscriptions();
    await flushPendingPoints();

    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => undefined);
    } catch {
      // ignore
    }

    const allPoints = await getStoredCoords(rideId);
    const sessionMeta = await getStoredRideSession();
    const ride = buildRideRecord(
      sessionMeta ?? {
        rideId,
        bikeId: rideState.bikeId,
        startedAt: rideState.startedAt ?? Date.now(),
        fuelPricePerLiter: getRideState().fuelPricePerLiter,
        fuelRateKmPerLiter: getRideState().fuelRateKmPerLiter,
        mode: 'hustle',
        startingAltitude: startingAltitudeRef.current,
        lastPointTimestamp: allPoints[allPoints.length - 1]?.timestamp ?? null,
      },
      allPoints,
    );

    rideActions.setState('saving');
    try {
      const savedRide = await saveRide.mutateAsync(ride);
      await clearStoredCoords(rideId);
      await clearActiveRidePointSession();
      invalidateRecoveryQuery();
      rideStartedAtRef.current = null;
      rideIdRef.current = null;
      startingAltitudeRef.current = null;
      rideActions.resetRide();
      return savedRide;
    } catch {
      rideActions.setState('active');
      throw new Error('Failed to save ride. Please try again.');
    }
  };

  const resumeRecoveredRide = async () => {
    const storedSession = await getStoredRideSession();
    if (!storedSession) {
      throw new Error('No unfinished ride was found.');
    }

    const storedPoints = await getStoredCoords(storedSession.rideId);
    const {
      normalizedPoints,
      totalDistance,
      maxSpeed,
      elevationGain,
      relativeAltitude,
      durationSeconds,
      estimatedFuelLiters,
      estimatedFuelCost,
    } = buildTelemetryFromPoints(storedPoints, storedSession);
    const latestPoint = normalizedPoints[normalizedPoints.length - 1];

    rideActions.resetRide();
    foregroundPointsRef.current = normalizedPoints;
    pendingPersistPointsRef.current = [];
    recentGForcesRef.current = [];
    recentSpeedsRef.current = normalizedPoints.slice(-4).map((point) => point.speedKmh);
    crashThresholdSinceRef.current = null;
    lowGravitySinceRef.current = null;
    rideIdRef.current = storedSession.rideId;
    rideStartedAtRef.current = storedSession.startedAt;
    startingAltitudeRef.current = storedSession.startingAltitude;
    rideActions.setBikeId(storedSession.bikeId);
    rideActions.setFuelPricePerLiter(storedSession.fuelPricePerLiter);
    rideActions.setFuelRateKmPerLiter(storedSession.fuelRateKmPerLiter);
    rideActions.setStartedAt(storedSession.startedAt);
    getRideState().updateTelemetry({
      speedKmh: latestPoint?.speedKmh ?? 0,
      distanceKm: totalDistance,
      durationSeconds,
      maxSpeedKmh: maxSpeed,
      altitudeMeters: relativeAltitude,
      elevationGainM: elevationGain,
      estimatedFuelLiters,
      estimatedFuelCost,
      heading: 0,
    });
    rideActions.setState('active');
    await setActiveRidePointSession(storedSession.rideId);
    await persistRideSessionSnapshot({
      ...storedSession,
      lastPointTimestamp: latestPoint?.timestamp ?? storedSession.lastPointTimestamp,
    });
  };

  const saveRecoveredRide = async () => {
    const storedSession = await getStoredRideSession();
    if (!storedSession) {
      throw new Error('No unfinished ride was found.');
    }

    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => undefined);
    } catch {
      // ignore
    }

    const storedPoints = await getStoredCoords(storedSession.rideId);
    if (storedPoints.length === 0) {
      await clearActiveRidePointSession();
      invalidateRecoveryQuery();
      throw new Error('No stored ride points were found for that unfinished ride.');
    }

    const ride = buildRideRecord(storedSession, storedPoints);
    const savedRide = await saveRide.mutateAsync(ride);
    await clearStoredCoords(storedSession.rideId);
    await clearActiveRidePointSession();
    invalidateRecoveryQuery();
    rideActions.resetRide();
    foregroundPointsRef.current = [];
    pendingPersistPointsRef.current = [];
    rideStartedAtRef.current = null;
    rideIdRef.current = null;
    startingAltitudeRef.current = null;
    return savedRide;
  };

  const discardRecoveredRide = async () => {
    const storedSession = await getStoredRideSession();
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => undefined);
    } catch {
      // ignore
    }
    if (storedSession?.rideId) {
      await clearStoredCoords(storedSession.rideId);
    }
    await clearActiveRidePointSession();
    invalidateRecoveryQuery();
    foregroundPointsRef.current = [];
    pendingPersistPointsRef.current = [];
    rideStartedAtRef.current = null;
    rideIdRef.current = null;
    startingAltitudeRef.current = null;
    rideActions.resetRide();
  };

  const dismissCrashAlert = () => {
    rideActions.setCrashCountdown(null);
  };

  const requestHelp = () => {
    rideActions.setCrashCountdown(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    Linking.openURL('tel:911').catch(() => undefined);
  };

  const dismissFatiguePrompt = () => {
    rideActions.setFatiguePromptShown(false);
  };

  function maybeTriggerCrashAlert({
    rawGForce,
    smoothedGForce,
    speedKmh,
  }: {
    rawGForce: number;
    smoothedGForce: number;
    speedKmh: number;
  }) {
    const currentStore = getRideState();
    const now = Date.now();

    if (!crashAlertsEnabled) return;

    if (rawGForce <= LOW_GRAVITY_THRESHOLD_G) {
      lowGravitySinceRef.current = now;
    }

    const sawRecentLowGravity = lowGravitySinceRef.current != null
      && now - lowGravitySinceRef.current <= IMPACT_SEQUENCE_WINDOW_MS;
    const impactDetected = rawGForce >= IMPACT_THRESHOLD_G || smoothedGForce >= 4.5;
    const severeImpactDetected = rawGForce >= SEVERE_IMPACT_THRESHOLD_G;
    const motionTriggeredImpact = impactDetected && (speedKmh >= 12 || sawRecentLowGravity);

    if (severeImpactDetected || motionTriggeredImpact) {
      if (!crashThresholdSinceRef.current) {
        crashThresholdSinceRef.current = now;
      } else if (now - crashThresholdSinceRef.current > CRASH_TRIGGER_HOLD_MS && currentStore.crashCountdown === null) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        // 15-second cancellable countdown (rider can abort if false positive)
        currentStore.setCrashCountdown(15);
      }
    } else {
      crashThresholdSinceRef.current = null;
    }
  }

  function getSmoothedGForce(nextReading: number) {
    const nextWindow = [...recentGForcesRef.current.slice(-4), nextReading];
    recentGForcesRef.current = nextWindow;
    return nextWindow.reduce((sum, value) => sum + value, 0) / nextWindow.length;
  }

  async function startLocationWatch() {
    if (locationSubscriptionRef.current) return;

    locationSubscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 5,
      },
      (location) => {
        if (startingAltitudeRef.current == null && location.coords.altitude != null) {
          startingAltitudeRef.current = location.coords.altitude;
          void persistRideSessionSnapshot({
            startingAltitude: location.coords.altitude,
            lastPointTimestamp: location.timestamp,
          });
        }

        const point: RidePoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
          speedKmh: 0,
          rawSpeedKmh: Math.max(0, (location.coords.speed ?? 0) * 3.6),
          locationAccuracyM: location.coords.accuracy ?? null,
          altitude: location.coords.altitude ?? 0,
        };

        const previous = foregroundPointsRef.current[foregroundPointsRef.current.length - 1];
        const distanceDelta = previous ? haversineDistanceKm(previous, point) : 0;
        const filteredSpeedKmh = filterRideSpeedKmh({
          nextPoint: point,
          previousPoint: previous,
          previousFilteredSpeedKmh: getRideState().speedKmh,
          distanceDeltaKm: distanceDelta,
        });
        point.speedKmh = filteredSpeedKmh;
        // Positive altitude deltas only; ignore small GPS jitter (<3m) to keep the total clean.
        let elevationDelta = 0;
        if (previous && previous.altitude != null && point.altitude != null) {
          const rawDelta = point.altitude - previous.altitude;
          if (rawDelta > 3) elevationDelta = rawDelta;
        }
        foregroundPointsRef.current.push(point);
        pendingPersistPointsRef.current.push(point);
        schedulePendingPointFlush();
        const currentStore = getRideState();

        const newDistance = currentStore.distanceKm + distanceDelta;
        const newElevationGain = currentStore.elevationGainM + elevationDelta;
        const fuelRate = Math.max(currentStore.fuelRateKmPerLiter, 0.1);
        const fuelLiters = newDistance / fuelRate;
        const fuelCost = fuelLiters * currentStore.fuelPricePerLiter;
        const relativeAltitude = point.altitude != null && startingAltitudeRef.current != null
          ? point.altitude - startingAltitudeRef.current
          : 0;

        const heading = location.coords.heading ?? currentStore.heading;

        currentStore.updateTelemetry({
          speedKmh: point.speedKmh,
          altitudeMeters: relativeAltitude,
          distanceKm: newDistance,
          elevationGainM: newElevationGain,
          maxSpeedKmh: Math.max(currentStore.maxSpeedKmh, point.speedKmh),
          estimatedFuelLiters: fuelLiters,
          estimatedFuelCost: fuelCost,
          heading: heading || currentStore.heading,
        });
        void persistRideSessionSnapshot({ lastPointTimestamp: point.timestamp });
      },
    );
  }

  function cleanupSubscriptions() {
    accelSubscriptionRef.current?.remove();
    locationSubscriptionRef.current?.remove();
    accelSubscriptionRef.current = null;
    locationSubscriptionRef.current = null;
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = null;
    }
  }

  useEffect(() => cleanupSubscriptions, []);

  function schedulePendingPointFlush() {
    if (pendingPersistPointsRef.current.length >= 8) {
      void flushPendingPoints();
      return;
    }

    if (persistTimeoutRef.current) {
      return;
    }

    persistTimeoutRef.current = setTimeout(() => {
      persistTimeoutRef.current = null;
      void flushPendingPoints();
    }, 1500);
  }

  async function flushPendingPoints() {
    if (!rideIdRef.current || pendingPersistPointsRef.current.length === 0) {
      return;
    }

    const batch = pendingPersistPointsRef.current;
    pendingPersistPointsRef.current = [];
    await appendRidePoints(rideIdRef.current, batch)
      .then(() => persistRideSessionSnapshot({ lastPointTimestamp: batch[batch.length - 1]?.timestamp ?? null }))
      .catch(() => {
        pendingPersistPointsRef.current = [...batch, ...pendingPersistPointsRef.current];
      });
  }

  function normalizeRidePoints(points: RidePoint[]) {
    const speedWindow: number[] = [];

    return points.map((point, index) => {
      const previousPoint = index > 0 ? points[index - 1] : undefined;
      const previousFilteredSpeedKmh = speedWindow[speedWindow.length - 1] ?? 0;
      const distanceDeltaKm = previousPoint ? haversineDistanceKm(previousPoint, point) : 0;

      const filteredSpeedKmh = resolveFilteredSpeedKmh({
        nextPoint: point,
        previousPoint,
        previousFilteredSpeedKmh,
        distanceDeltaKm,
        speedWindow,
      });
      speedWindow.push(filteredSpeedKmh);

      return { ...point, speedKmh: filteredSpeedKmh };
    });
  }

  function filterRideSpeedKmh({
    nextPoint,
    previousPoint,
    previousFilteredSpeedKmh,
    distanceDeltaKm,
  }: {
    nextPoint: RidePoint;
    previousPoint?: RidePoint;
    previousFilteredSpeedKmh: number;
    distanceDeltaKm: number;
  }) {
    const averagedSpeedKmh = resolveFilteredSpeedKmh({
      nextPoint,
      previousPoint,
      previousFilteredSpeedKmh,
      distanceDeltaKm,
      speedWindow: recentSpeedsRef.current,
    });
    recentSpeedsRef.current = [...recentSpeedsRef.current.slice(-3), averagedSpeedKmh];
    return averagedSpeedKmh;
  }

  function resolveFilteredSpeedKmh({
    nextPoint,
    previousPoint,
    previousFilteredSpeedKmh,
    distanceDeltaKm,
    speedWindow,
  }: {
    nextPoint: RidePoint;
    previousPoint?: RidePoint;
    previousFilteredSpeedKmh: number;
    distanceDeltaKm: number;
    speedWindow: number[];
  }) {
    const rawGpsSpeedKmh = Math.min(
      MAX_REASONABLE_SPEED_KMH,
      Math.max(0, nextPoint.rawSpeedKmh ?? nextPoint.speedKmh ?? 0),
    );
    const accuracyM = nextPoint.locationAccuracyM ?? 999;
    const secondsDelta = previousPoint ? Math.max(0, (nextPoint.timestamp - previousPoint.timestamp) / 1000) : 0;
    const deltaSpeedKmh = secondsDelta >= 0.8 && secondsDelta <= 12
      ? (distanceDeltaKm / secondsDelta) * 3600
      : null;

    let candidateSpeedKmh = rawGpsSpeedKmh;

    if (
      previousFilteredSpeedKmh < 6
      && distanceDeltaKm < 0.015
      && (accuracyM > 18 || rawGpsSpeedKmh > 22)
    ) {
      candidateSpeedKmh = 0;
    }

    if (deltaSpeedKmh != null && Number.isFinite(deltaSpeedKmh)) {
      const boundedDeltaSpeedKmh = Math.min(MAX_REASONABLE_SPEED_KMH, Math.max(0, deltaSpeedKmh));
      if (accuracyM > 35) {
        candidateSpeedKmh = boundedDeltaSpeedKmh;
      } else {
        const closeEnough = Math.abs(rawGpsSpeedKmh - boundedDeltaSpeedKmh) <= 18;
        candidateSpeedKmh = closeEnough
          ? rawGpsSpeedKmh * 0.55 + boundedDeltaSpeedKmh * 0.45
          : rawGpsSpeedKmh < 12
            ? boundedDeltaSpeedKmh * 0.65 + rawGpsSpeedKmh * 0.35
            : rawGpsSpeedKmh * 0.35 + boundedDeltaSpeedKmh * 0.65;
      }
    }

    if (accuracyM > 70) {
      candidateSpeedKmh = previousFilteredSpeedKmh * 0.8;
    }

    if (secondsDelta > 0 && previousFilteredSpeedKmh > 0) {
      const maxAllowedDelta = Math.max(22, secondsDelta * MAX_SPEED_DELTA_PER_SECOND_KMH);
      if (Math.abs(candidateSpeedKmh - previousFilteredSpeedKmh) > maxAllowedDelta) {
        candidateSpeedKmh =
          previousFilteredSpeedKmh
          + Math.sign(candidateSpeedKmh - previousFilteredSpeedKmh) * maxAllowedDelta;
      }
    }

    if (previousFilteredSpeedKmh > 0 && Math.abs(candidateSpeedKmh - previousFilteredSpeedKmh) > 55 && accuracyM > 18) {
      candidateSpeedKmh = previousFilteredSpeedKmh + Math.sign(candidateSpeedKmh - previousFilteredSpeedKmh) * 18;
    }

    if (candidateSpeedKmh > MAX_REASONABLE_SPEED_KMH) {
      candidateSpeedKmh = MAX_REASONABLE_SPEED_KMH;
    }

    const alpha = candidateSpeedKmh > previousFilteredSpeedKmh
      ? (candidateSpeedKmh < 15 || accuracyM > 25 ? 0.28 : 0.58)
      : (candidateSpeedKmh < 15 || accuracyM > 25 ? 0.22 : 0.4);

    const smoothedSpeedKmh = Math.max(
      0,
      previousFilteredSpeedKmh + (candidateSpeedKmh - previousFilteredSpeedKmh) * alpha,
    );
    const nextWindow = [...speedWindow.slice(-3), smoothedSpeedKmh];
    const averagedSpeedKmh = nextWindow.reduce((sum, value) => sum + value, 0) / nextWindow.length;

    if (averagedSpeedKmh < 3 && accuracyM > 14) {
      return 0;
    }

    return Number(Math.min(MAX_REASONABLE_SPEED_KMH, averagedSpeedKmh).toFixed(1));
  }

  return {
    ...rideState,
    startRide,
    stopRide,
    resumeRecoveredRide,
    saveRecoveredRide,
    discardRecoveredRide,
    dismissCrashAlert,
    requestHelp,
    dismissFatiguePrompt,
    crashEnabled: Platform.OS !== 'web',
  };
}
