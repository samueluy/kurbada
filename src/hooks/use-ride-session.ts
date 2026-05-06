import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { createId } from '@/lib/id';
import { buildRouteGeoJson, computeRouteBounds, haversineDistanceKm, simplifyRoute } from '@/lib/route';
import { sleep } from '@/lib/time';
import { useAuth } from '@/hooks/use-auth';
import { useRideMutations } from '@/hooks/use-kurbada-data';
import { useRideStore } from '@/store/ride-store';
import type { LeanCalibration, RideMode, RidePoint } from '@/types/domain';

Accelerometer.setUpdateInterval(16);
Gyroscope.setUpdateInterval(16);

export function useRideSession() {
  const { session } = useAuth();
  const { saveRide } = useRideMutations(session?.user.id);
  const store = useRideStore();
  const routePointsRef = useRef<RidePoint[]>([]);
  const latestAccelRef = useRef({ x: 0, y: 0, z: 1 });
  const filteredAccelRef = useRef({ x: 0, y: 0, z: 1 });
  const rollRef = useRef(0);
  const lastGyroTimestampRef = useRef<number | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const accelSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const gyroSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const crashThresholdSinceRef = useRef<number | null>(null);
  const calibrationRef = useRef<LeanCalibration | undefined>(store.calibration);

  useEffect(() => {
    calibrationRef.current = store.calibration;
  }, [store.calibration]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (store.state === 'active' && store.startedAt) {
        store.updateTelemetry({
          durationSeconds: Math.max(0, Math.floor((Date.now() - store.startedAt) / 1000)),
        });
      }

      if (store.crashCountdown !== null) {
        if (store.crashCountdown <= 1) {
          requestHelp();
        } else {
          store.setCrashCountdown(store.crashCountdown - 1);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
    // We intentionally bind to the store snapshot here because the ride timer is store-driven state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  useEffect(() => {
    if (!['calibrating', 'active'].includes(store.state)) {
      cleanupSubscriptions();
      return;
    }

    accelSubscriptionRef.current = Accelerometer.addListener((reading) => {
      latestAccelRef.current = reading;
      filteredAccelRef.current = {
        x: 0.8 * filteredAccelRef.current.x + 0.2 * reading.x,
        y: 0.8 * filteredAccelRef.current.y + 0.2 * reading.y,
        z: 0.8 * filteredAccelRef.current.z + 0.2 * reading.z,
      };

      const accelRoll = (Math.atan2(filteredAccelRef.current.y, filteredAccelRef.current.z) * 180) / Math.PI;
      rollRef.current = 0.92 * rollRef.current + 0.08 * accelRoll;

      const gForce = Math.sqrt(reading.x ** 2 + reading.y ** 2 + reading.z ** 2);
      store.updateTelemetry({ gForce });

      if (store.state === 'active' && calibrationRef.current) {
        const adjustedLean = rollRef.current - calibrationRef.current.zeroRollDeg;
        store.updateTelemetry({
          leanAngleDeg: adjustedLean,
          maxLeanAngleDeg: Math.max(store.telemetry.maxLeanAngleDeg, Math.abs(adjustedLean)),
        });
      }

      if (store.state === 'active') {
        maybeTriggerCrashAlert(gForce);
      }
    });

    if (store.mode === 'weekend') {
      gyroSubscriptionRef.current = Gyroscope.addListener((reading) => {
        const now = Date.now();
        if (lastGyroTimestampRef.current) {
          const dt = (now - lastGyroTimestampRef.current) / 1000;
          rollRef.current =
            0.92 * (rollRef.current + (reading.x * dt * 180) / Math.PI) +
            0.08 * ((Math.atan2(filteredAccelRef.current.y, filteredAccelRef.current.z) * 180) / Math.PI);
        }
        lastGyroTimestampRef.current = now;
      });
    }

    startLocationWatch().catch(() => undefined);

    return cleanupSubscriptions;
    // The sensor/session lifecycle is keyed only by ride state and mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.state, store.mode]);

  const simplifiedPreviewPoints = simplifyRoute(routePointsRef.current);
  const routePreview = simplifiedPreviewPoints.length ? buildRouteGeoJson(simplifiedPreviewPoints) : undefined;

  const startRide = async (mode: RideMode, bikeId: string) => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Location permission is required to start a ride.');
    }

    store.resetRide();
    routePointsRef.current = [];
    rollRef.current = 0;
    lastGyroTimestampRef.current = null;
    calibrationRef.current = undefined;
    crashThresholdSinceRef.current = null;
    store.setMode(mode);
    store.setBikeId(bikeId);
    store.setStartedAt(Date.now());
    store.setState('starting');
    await sleep(180);
    store.setState(mode === 'weekend' ? 'calibrating' : 'active');
  };

  const completeCalibration = async () => {
    if (store.mode !== 'weekend') {
      store.setState('active');
      return;
    }

    await sleep(2500);
    const calibration = {
      zeroRollDeg: rollRef.current,
      capturedAt: new Date().toISOString(),
      mountProfileId: 'ride-start',
    };
    calibrationRef.current = calibration;
    store.setCalibration(calibration);
    store.setState('active');
  };

  const stopRide = async () => {
    if (!store.bikeId || !store.startedAt) {
      store.resetRide();
      return;
    }

    store.setState('stopping');
    cleanupSubscriptions();

    const simplified = simplifyRoute(routePointsRef.current);
    const routeGeoJson = buildRouteGeoJson(simplified);
    const ride = {
      id: createId(),
      bike_id: store.bikeId,
      user_id: session?.user.id,
      mode: store.mode,
      started_at: new Date(store.startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      distance_km: Number(store.telemetry.distanceKm.toFixed(1)),
      max_speed_kmh: Number(store.telemetry.maxSpeedKmh.toFixed(1)),
      avg_speed_kmh:
        store.telemetry.durationSeconds > 0
          ? Number((store.telemetry.distanceKm / (store.telemetry.durationSeconds / 3600)).toFixed(1))
          : 0,
      max_lean_angle_deg: store.mode === 'weekend' ? Number(store.telemetry.maxLeanAngleDeg.toFixed(1)) : null,
      fuel_used_liters: Number(store.telemetry.estimatedFuelLiters.toFixed(2)),
      route_geojson: routeGeoJson,
      route_point_count_raw: routePointsRef.current.length,
      route_point_count_simplified: simplified.length,
      route_bounds: computeRouteBounds(simplified.length ? simplified : routePointsRef.current),
    };

    store.setState('saving');
    await saveRide.mutateAsync(ride);
    return ride;
  };

  const dismissCrashAlert = () => {
    store.setCrashCountdown(null);
  };

  const requestHelp = () => {
    store.setCrashCountdown(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    Linking.openURL('tel:911').catch(() => undefined);
  };

  function maybeTriggerCrashAlert(gForce: number) {
    if (gForce > 4.5) {
      if (!crashThresholdSinceRef.current) {
        crashThresholdSinceRef.current = Date.now();
      } else if (Date.now() - crashThresholdSinceRef.current > 150 && store.crashCountdown === null) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        store.setCrashCountdown(30);
      }
    } else {
      crashThresholdSinceRef.current = null;
    }
  }

  async function startLocationWatch() {
    if (locationSubscriptionRef.current) {
      return;
    }

    locationSubscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: store.mode === 'weekend' ? 5000 : 10000,
        distanceInterval: 8,
      },
      (location) => {
        const point: RidePoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
          speedKmh: Math.max(0, (location.coords.speed ?? 0) * 3.6),
          altitude: location.coords.altitude,
        };

        const previous = routePointsRef.current[routePointsRef.current.length - 1];
        const distanceDelta = previous ? haversineDistanceKm(previous, point) : 0;
        routePointsRef.current = [...routePointsRef.current, point];
        store.appendPoint(point);
        store.updateTelemetry({
          speedKmh: point.speedKmh,
          altitudeMeters: point.altitude ?? 0,
          distanceKm: store.telemetry.distanceKm + distanceDelta,
          maxSpeedKmh: Math.max(store.telemetry.maxSpeedKmh, point.speedKmh),
          estimatedFuelLiters: store.mode === 'hustle' ? (store.telemetry.distanceKm + distanceDelta) / 28 : (store.telemetry.distanceKm + distanceDelta) / 22,
        });
      },
    );
  }

  function cleanupSubscriptions() {
    accelSubscriptionRef.current?.remove();
    gyroSubscriptionRef.current?.remove();
    locationSubscriptionRef.current?.remove();
    accelSubscriptionRef.current = null;
    gyroSubscriptionRef.current = null;
    locationSubscriptionRef.current = null;
  }

  useEffect(() => cleanupSubscriptions, []);

  return {
    ...store,
    routePreview,
    startRide,
    completeCalibration,
    stopRide,
    dismissCrashAlert,
    requestHelp,
    crashEnabled: Platform.OS !== 'web',
  };
}
