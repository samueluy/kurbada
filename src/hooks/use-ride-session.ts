import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import { createId } from '@/lib/id';
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
  const store = useRideStore();
  const crashAlertsEnabled = useAppStore((state) => state.crashAlertsEnabled);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const accelSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const crashThresholdSinceRef = useRef<number | null>(null);
  const recentGForcesRef = useRef<number[]>([]);
  const foregroundPointsRef = useRef<RidePoint[]>([]);
  const rideStartedAtRef = useRef<number | null>(null);
  const getRideState = useRideStore.getState;

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
    if (store.state !== 'active') {
      recentGForcesRef.current = [];
      cleanupSubscriptions();
      return;
    }

    // Keep accelerometer only for crash detection (g-force spike).
    accelSubscriptionRef.current = Accelerometer.addListener((reading) => {
      const rawGForce = Math.sqrt(reading.x ** 2 + reading.y ** 2 + reading.z ** 2);
      const currentStore = getRideState();
      currentStore.updateTelemetry({ gForce: rawGForce });
      maybeTriggerCrashAlert(getSmoothedGForce(rawGForce));
    });

    startLocationWatch().catch(() => undefined);

    return cleanupSubscriptions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.state]);

  const latestPosition = foregroundPointsRef.current[foregroundPointsRef.current.length - 1];

  const startRide = async (bikeId: string, fuelPricePerLiter: number, fuelRateKmPerLiter: number) => {
    const fgPerm = await Location.requestForegroundPermissionsAsync();
    if (!fgPerm.granted) {
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

    store.resetRide();
    foregroundPointsRef.current = [];
    crashThresholdSinceRef.current = null;
    recentGForcesRef.current = [];
    store.setBikeId(bikeId);
    store.setFuelPricePerLiter(fuelPricePerLiter);
    store.setFuelRateKmPerLiter(fuelRateKmPerLiter);
    store.setStartedAt(Date.now());
    rideStartedAtRef.current = Date.now();

    await clearStoredCoords();

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

    store.setState('starting');
    await sleep(400);
    store.setState('active');
  };

  const stopRide = async () => {
    if (!store.startedAt) {
      store.setStartedAt(Date.now() - store.telemetry.durationSeconds * 1000);
    }

    const startedAt = store.startedAt!;

    if (!store.bikeId) {
      store.resetRide();
      return null;
    }

    store.setState('stopping');
    cleanupSubscriptions();

    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => undefined);
    } catch {
      // ignore
    }

    const bgPoints = await getStoredCoords();
    const fgPoints = [...foregroundPointsRef.current];
    const allPoints = [...bgPoints, ...fgPoints].sort((a, b) => a.timestamp - b.timestamp);

    const simplified = simplifyRoute(allPoints);
    const routeGeoJson = buildRouteGeoJson(simplified);
    const bounds = computeRouteBounds(simplified.length ? simplified : allPoints);

    const totalDistance = simplified.reduce((sum, p, i) => {
      if (i === 0) return 0;
      return sum + haversineDistanceKm(simplified[i - 1], p);
    }, 0);

    const maxSpeed = simplified.reduce((m, p) => Math.max(m, p.speedKmh), 0);
    const ride = {
      id: createId(),
      bike_id: store.bikeId,
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
      fuel_used_liters: Number(store.telemetry.estimatedFuelLiters.toFixed(2)),
      elevation_gain_m: Number(store.telemetry.elevationGainM.toFixed(1)),
      mood: null,
      route_geojson: routeGeoJson,
      route_point_count_raw: allPoints.length,
      route_point_count_simplified: simplified.length,
      route_bounds: bounds,
    };

    store.setState('saving');
    try {
      await saveRide.mutateAsync(ride);
      await clearStoredCoords();
      rideStartedAtRef.current = null;
      store.resetRide();
      return ride;
    } catch {
      store.setState('active');
      throw new Error('Failed to save ride. Please try again.');
    }
  };

  const dismissCrashAlert = () => {
    store.setCrashCountdown(null);
  };

  const requestHelp = () => {
    store.setCrashCountdown(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    Linking.openURL('tel:911').catch(() => undefined);
  };

  const dismissFatiguePrompt = () => {
    store.setFatiguePromptShown(false);
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
          speedKmh: Math.max(0, (location.coords.speed ?? 0) * 3.6),
          altitude: location.coords.altitude ?? 0,
        };

        const previous = foregroundPointsRef.current[foregroundPointsRef.current.length - 1];
        const distanceDelta = previous ? haversineDistanceKm(previous, point) : 0;
        // Positive altitude deltas only; ignore small GPS jitter (<3m) to keep the total clean.
        let elevationDelta = 0;
        if (previous && previous.altitude != null && point.altitude != null) {
          const rawDelta = point.altitude - previous.altitude;
          if (rawDelta > 3) elevationDelta = rawDelta;
        }
        foregroundPointsRef.current = [...foregroundPointsRef.current, point];
        const currentStore = getRideState();
        currentStore.appendForegroundPoint(point);

        const newDistance = currentStore.telemetry.distanceKm + distanceDelta;
        const newElevationGain = currentStore.telemetry.elevationGainM + elevationDelta;
        const fuelRate = Math.max(currentStore.fuelRateKmPerLiter, 0.1);
        const fuelLiters = newDistance / fuelRate;
        const fuelCost = fuelLiters * currentStore.fuelPricePerLiter;

        const heading = location.coords.heading ?? currentStore.telemetry.heading;

        currentStore.updateTelemetry({
          speedKmh: point.speedKmh,
          altitudeMeters: point.altitude ?? 0,
          distanceKm: newDistance,
          elevationGainM: newElevationGain,
          maxSpeedKmh: Math.max(currentStore.telemetry.maxSpeedKmh, point.speedKmh),
          estimatedFuelLiters: fuelLiters,
          estimatedFuelCost: fuelCost,
          heading: heading || currentStore.telemetry.heading,
        });
      },
    );
  }

  function cleanupSubscriptions() {
    accelSubscriptionRef.current?.remove();
    locationSubscriptionRef.current?.remove();
    accelSubscriptionRef.current = null;
    locationSubscriptionRef.current = null;
  }

  useEffect(() => cleanupSubscriptions, []);

  const previewPoints = simplifyRoute(foregroundPointsRef.current);
  const routePreview = previewPoints.length ? buildRouteGeoJson(previewPoints) : undefined;

  return {
    ...store,
    routePreview,
    latestPosition,
    startRide,
    stopRide,
    dismissCrashAlert,
    requestHelp,
    dismissFatiguePrompt,
    crashEnabled: Platform.OS !== 'web',
  };
}
