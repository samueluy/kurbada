import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';

import { useRideStore } from '@/store/ride-store';
import { useAppStore } from '@/store/app-store';
import { scheduleStartRideReminder } from '@/lib/ride-reminder-notifications';

const MOVEMENT_SPEED_THRESHOLD_KMH = 12;
const SUSTAINED_WINDOW_SECONDS = 120;
const COOLDOWN_MINUTES = 30;
const POLL_INTERVAL_MS = 10_000;

export function useMovementDetection() {
  const startRideRemindersEnabled = useAppStore((state) => state.startRideRemindersEnabled);
  const lastNotifiedAtRef = useRef(0);
  const recentSpeedsRef = useRef<number[]>([]);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!startRideRemindersEnabled) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      recentSpeedsRef.current = [];
      return;
    }

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Low, timeInterval: POLL_INTERVAL_MS, distanceInterval: 15 },
      (location) => {
        const rideState = useRideStore.getState().state;
        if (rideState !== 'idle') {
          recentSpeedsRef.current = [];
          return;
        }

        const cooldownElapsed = Date.now() - lastNotifiedAtRef.current > COOLDOWN_MINUTES * 60 * 1000;
        if (!cooldownElapsed) return;

        const rawSpeedMs = location.coords.speed ?? 0;
        if (rawSpeedMs < 0) return;

        const speedKmh = rawSpeedMs * 3.6;
        recentSpeedsRef.current.push(speedKmh);

        const maxSamples = Math.ceil(SUSTAINED_WINDOW_SECONDS / (POLL_INTERVAL_MS / 1000)) + 2;
        if (recentSpeedsRef.current.length > maxSamples) {
          recentSpeedsRef.current.shift();
        }

        const requiredSamples = Math.max(1, Math.floor(SUSTAINED_WINDOW_SECONDS / (POLL_INTERVAL_MS / 1000)));
        if (recentSpeedsRef.current.length < requiredSamples) return;

        const allAboveThreshold = recentSpeedsRef.current.every((s) => s >= MOVEMENT_SPEED_THRESHOLD_KMH);
        if (!allAboveThreshold) return;

        lastNotifiedAtRef.current = Date.now();
        recentSpeedsRef.current = [];
        void scheduleStartRideReminder();
      },
    ).then((sub) => { subscriptionRef.current = sub; }).catch(() => undefined);

    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      recentSpeedsRef.current = [];
    };
  }, [startRideRemindersEnabled]);
}
