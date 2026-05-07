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
import { clearStoredCoords, getStoredCoords, LOCATION_TASK_NAME } from '@/tasks/location-task';
import { useAppStore } from '@/store/app-store';
import type { LeanCalibration, RideMode, RidePoint } from '@/types/domain';

Accelerometer.setUpdateInterval(16);
Gyroscope.setUpdateInterval(16);

export function useRideSession() {
  const { session } = useAuth();
  const { saveRide } = useRideMutations(session?.user.id);
  const store = useRideStore();
  const crashAlertsEnabled = useAppStore((state) => state.crashAlertsEnabled);
  const latestAccelRef = useRef({ x: 0, y: 0, z: 1 });
  const filteredAccelRef = useRef({ x: 0, y: 0, z: 1 });
  const rollRef = useRef(0);
  const lastGyroTimestampRef = useRef<number | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const accelSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const gyroSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const crashThresholdSinceRef = useRef<number | null>(null);
  const calibrationRef = useRef<LeanCalibration | undefined>(store.calibration);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const foregroundPointsRef = useRef<RidePoint[]>([]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.state, store.mode]);

  const latestPosition = foregroundPointsRef.current[foregroundPointsRef.current.length - 1];

  const startRide = async (mode: RideMode, bikeId: string, fuelPricePerLiter: number, fuelRateKmPerLiter: number) => {
    const fgPerm = await Location.requestForegroundPermissionsAsync();
    if (!fgPerm.granted) {
      throw new Error('Location permission is required to start a ride.');
    }

    await Location.requestBackgroundPermissionsAsync().catch(() => undefined);

    store.resetRide();
    foregroundPointsRef.current = [];
    rollRef.current = 0;
    lastGyroTimestampRef.current = null;
    calibrationRef.current = undefined;
    crashThresholdSinceRef.current = null;
    store.setMode(mode);
    store.setBikeId(bikeId);
    store.setFuelPricePerLiter(fuelPricePerLiter);
    store.setFuelRateKmPerLiter(fuelRateKmPerLiter);
    store.setDashboardView(mode === 'weekend' ? 'speed' : 'economy');
    store.setStartedAt(Date.now());

    await clearStoredCoords();

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000,
      distanceInterval: 8,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Kurbada — Ride in progress',
        notificationBody: 'Tracking your route in the background',
        notificationColor: '#E63946',
      },
    }).catch(() => undefined);

    store.setState('starting');
    await sleep(500);
    store.setState(mode === 'weekend' ? 'calibrating' : 'active');
  };

  const completeCalibration = async () => {
    if (store.mode !== 'weekend') {
      store.setState('active');
      return;
    }

    let countdown = 3;
    store.setCalibrationCountdown(countdown);

    countdownIntervalRef.current = setInterval(() => {
      countdown--;
      store.setCalibrationCountdown(countdown);

      if (countdown <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        const calibration = {
          zeroRollDeg: rollRef.current,
          capturedAt: new Date().toISOString(),
          mountProfileId: 'ride-start',
        };
        calibrationRef.current = calibration;
        store.setCalibration(calibration);
        store.setCalibrationCountdown(null);
        store.setState('active');
      }
    }, 1000);
  };

  const stopRide = async () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (!calibrationRef.current && store.mode === 'weekend' && rollRef.current !== undefined) {
      const calibration = {
        zeroRollDeg: rollRef.current,
        capturedAt: new Date().toISOString(),
        mountProfileId: 'ride-stop',
      };
      calibrationRef.current = calibration;
      store.setCalibration(calibration);
      store.setCalibrationCountdown(null);
    }

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
      mode: store.mode,
      started_at: new Date(startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      distance_km: Number(totalDistance.toFixed(1)),
      max_speed_kmh: Number(maxSpeed.toFixed(1)),
      avg_speed_kmh:
        store.telemetry.durationSeconds > 0
          ? Number((totalDistance / (store.telemetry.durationSeconds / 3600)).toFixed(1))
          : 0,
      max_lean_angle_deg: store.mode === 'weekend' ? Number(store.telemetry.maxLeanAngleDeg.toFixed(1)) : null,
      fuel_used_liters: Number(store.telemetry.estimatedFuelLiters.toFixed(2)),
      route_geojson: routeGeoJson,
      route_point_count_raw: allPoints.length,
      route_point_count_simplified: simplified.length,
      route_bounds: bounds,
    };

    store.setState('saving');
    try {
      await saveRide.mutateAsync(ride);
      await clearStoredCoords();
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

  function maybeTriggerCrashAlert(gForce: number) {
    if (!crashAlertsEnabled) return;
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
    if (locationSubscriptionRef.current) return;

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
          altitude: location.coords.altitude ?? 0,
        };

        const previous = foregroundPointsRef.current[foregroundPointsRef.current.length - 1];
        const distanceDelta = previous ? haversineDistanceKm(previous, point) : 0;
        foregroundPointsRef.current = [...foregroundPointsRef.current, point];
        store.appendForegroundPoint(point);

        const newDistance = store.telemetry.distanceKm + distanceDelta;
        const fuelRate = store.fuelRateKmPerLiter;
        const fuelLiters = newDistance / fuelRate;
        const fuelCost = fuelLiters * store.fuelPricePerLiter;

        const heading = location.coords.heading ?? store.telemetry.heading;

        store.updateTelemetry({
          speedKmh: point.speedKmh,
          altitudeMeters: point.altitude ?? 0,
          distanceKm: newDistance,
          maxSpeedKmh: Math.max(store.telemetry.maxSpeedKmh, point.speedKmh),
          estimatedFuelLiters: fuelLiters,
          estimatedFuelCost: fuelCost,
          heading: heading || store.telemetry.heading,
        });
      },
    );
  }

  function cleanupSubscriptions() {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    accelSubscriptionRef.current?.remove();
    gyroSubscriptionRef.current?.remove();
    locationSubscriptionRef.current?.remove();
    accelSubscriptionRef.current = null;
    gyroSubscriptionRef.current = null;
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
    completeCalibration,
    stopRide,
    dismissCrashAlert,
    requestHelp,
    crashEnabled: Platform.OS !== 'web',
  };
}
