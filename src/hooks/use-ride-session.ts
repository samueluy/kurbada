import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import { useEffect, useMemo, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import { createId } from '@/lib/id';
import {
  appendRidePoints,
  clearActiveRidePointSession,
  clearRidePoints,
  initializeRidePointStorage,
  setActiveRidePointSession,
} from '@/lib/ride-point-storage';
import { buildRouteGeoJson, computeRouteBounds, haversineDistanceKm, simplifyRoute } from '@/lib/route';
import { sleep } from '@/lib/time';
import { useAuth } from '@/hooks/use-auth';
import { useRideMutations } from '@/hooks/use-kurbada-data';
import { useRideStore } from '@/store/ride-store';
import { clearStoredCoords, getStoredCoords, LOCATION_TASK_NAME } from '@/tasks/location-task';
import { useAppStore } from '@/store/app-store';
import type { RidePoint } from '@/types/domain';

Accelerometer.setUpdateInterval(100);

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
  const recentGForcesRef = useRef<number[]>([]);
  const recentSpeedsRef = useRef<number[]>([]);
  const foregroundPointsRef = useRef<RidePoint[]>([]);
  const pendingPersistPointsRef = useRef<RidePoint[]>([]);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rideStartedAtRef = useRef<number | null>(null);
  const rideIdRef = useRef<string | null>(null);
  const lastGForcePublishAtRef = useRef(0);
  const getRideState = useRideStore.getState;

  useEffect(() => {
    void initializeRidePointStorage();
  }, []);

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
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (rideState.state !== 'active') {
      recentGForcesRef.current = [];
      recentSpeedsRef.current = [];
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
      maybeTriggerCrashAlert(getSmoothedGForce(rawGForce));
    });

    startLocationWatch().catch(() => undefined);

    return cleanupSubscriptions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideState.state]);

  const startRide = async (bikeId: string, fuelPricePerLiter: number, fuelRateKmPerLiter: number) => {
    rideActions.resetRide();
    foregroundPointsRef.current = [];
    pendingPersistPointsRef.current = [];
    crashThresholdSinceRef.current = null;
    recentGForcesRef.current = [];
    recentSpeedsRef.current = [];
    rideIdRef.current = createId();
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

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 2000,
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Kurbada — Ride in progress',
        notificationBody: 'Tracking your route in the background',
        notificationColor: '#E63946',
      },
    }).catch(() => undefined);

    await sleep(400);
    rideActions.setState('active');
  };

  const stopRide = async () => {
    if (!rideState.startedAt) {
      rideActions.setStartedAt(Date.now() - rideState.telemetry.durationSeconds * 1000);
    }

    const startedAt = rideState.startedAt ?? getRideState().startedAt!;
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

    const normalizedPoints = normalizeRidePoints(allPoints);
    const fullRoutePoints = simplifyRoute(normalizedPoints, 6);
    const previewRoutePoints = simplifyRoute(normalizedPoints, 40);
    const routeGeoJson = buildRouteGeoJson(fullRoutePoints);
    const routePreviewGeoJson = buildRouteGeoJson(
      previewRoutePoints.length ? previewRoutePoints : fullRoutePoints,
    );
    const bounds = computeRouteBounds(fullRoutePoints.length ? fullRoutePoints : normalizedPoints);

    const totalDistance = normalizedPoints.reduce((sum, p, i) => {
      if (i === 0) return 0;
      return sum + haversineDistanceKm(normalizedPoints[i - 1], p);
    }, 0);

    const maxSpeed = normalizedPoints.reduce((m, p) => Math.max(m, p.speedKmh), 0);
    const ride = {
      id: rideId,
      bike_id: rideState.bikeId,
      user_id: session?.user.id,
      mode: 'hustle' as const, // kept for DB backwards compat; UI no longer branches
      started_at: new Date(startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      distance_km: Number(totalDistance.toFixed(1)),
      max_speed_kmh: Number(maxSpeed.toFixed(1)),
      avg_speed_kmh:
        startedAt > 0
          ? Number((totalDistance / ((Date.now() - startedAt) / 3_600_000)).toFixed(1))
          : 0,
      max_lean_angle_deg: null,
      fuel_used_liters: Number(rideState.telemetry.estimatedFuelLiters.toFixed(2)),
      elevation_gain_m: Number(rideState.telemetry.elevationGainM.toFixed(1)),
      mood: null,
      route_geojson: routeGeoJson,
      route_preview_geojson: routePreviewGeoJson,
      route_point_count_raw: normalizedPoints.length,
      route_point_count_simplified: fullRoutePoints.length,
      route_bounds: bounds,
    };

    rideActions.setState('saving');
    try {
      const savedRide = await saveRide.mutateAsync(ride);
      await clearStoredCoords(rideId);
      await clearActiveRidePointSession();
      rideStartedAtRef.current = null;
      rideIdRef.current = null;
      rideActions.resetRide();
      return savedRide;
    } catch {
      rideActions.setState('active');
      throw new Error('Failed to save ride. Please try again.');
    }
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

  function maybeTriggerCrashAlert(gForce: number) {
    const currentStore = getRideState();

    if (!crashAlertsEnabled) return;
    if (gForce > 4.5) {
      if (!crashThresholdSinceRef.current) {
        crashThresholdSinceRef.current = Date.now();
      } else if (Date.now() - crashThresholdSinceRef.current > 250 && currentStore.crashCountdown === null) {
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

        const heading = location.coords.heading ?? currentStore.heading;

        currentStore.updateTelemetry({
          speedKmh: filteredSpeedKmh,
          altitudeMeters: point.altitude ?? 0,
          distanceKm: newDistance,
          elevationGainM: newElevationGain,
          maxSpeedKmh: Math.max(currentStore.maxSpeedKmh, filteredSpeedKmh),
          estimatedFuelLiters: fuelLiters,
          estimatedFuelCost: fuelCost,
          heading: heading || currentStore.heading,
        });
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
    await appendRidePoints(rideIdRef.current, batch).catch(() => {
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
    const rawGpsSpeedKmh = Math.max(0, nextPoint.rawSpeedKmh ?? nextPoint.speedKmh ?? 0);
    const accuracyM = nextPoint.locationAccuracyM ?? 999;
    const secondsDelta = previousPoint ? Math.max(0, (nextPoint.timestamp - previousPoint.timestamp) / 1000) : 0;
    const deltaSpeedKmh = secondsDelta >= 0.8 && secondsDelta <= 12
      ? (distanceDeltaKm / secondsDelta) * 3600
      : null;

    let candidateSpeedKmh = rawGpsSpeedKmh;

    if (deltaSpeedKmh != null && Number.isFinite(deltaSpeedKmh)) {
      if (accuracyM > 35) {
        candidateSpeedKmh = deltaSpeedKmh;
      } else {
        const closeEnough = Math.abs(rawGpsSpeedKmh - deltaSpeedKmh) <= 18;
        candidateSpeedKmh = closeEnough
          ? rawGpsSpeedKmh * 0.55 + deltaSpeedKmh * 0.45
          : rawGpsSpeedKmh < 12
            ? deltaSpeedKmh * 0.65 + rawGpsSpeedKmh * 0.35
            : rawGpsSpeedKmh * 0.35 + deltaSpeedKmh * 0.65;
      }
    }

    if (accuracyM > 70) {
      candidateSpeedKmh = previousFilteredSpeedKmh * 0.8;
    }

    if (previousFilteredSpeedKmh > 0 && Math.abs(candidateSpeedKmh - previousFilteredSpeedKmh) > 55 && accuracyM > 18) {
      candidateSpeedKmh = previousFilteredSpeedKmh + Math.sign(candidateSpeedKmh - previousFilteredSpeedKmh) * 18;
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

    return averagedSpeedKmh < 2 && accuracyM > 20 ? 0 : Number(averagedSpeedKmh.toFixed(1));
  }

  return {
    ...rideState,
    startRide,
    stopRide,
    dismissCrashAlert,
    requestHelp,
    dismissFatiguePrompt,
    crashEnabled: Platform.OS !== 'web',
  };
}
