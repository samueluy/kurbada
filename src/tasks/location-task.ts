import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import {
  appendRidePoints,
  clearRidePoints,
  getActiveRidePointSession,
  getRidePointCount,
  getRidePoints,
  initializeRidePointStorage,
} from '@/lib/ride-point-storage';
import type { RidePoint } from '@/types/domain';

export const LOCATION_TASK_NAME = 'kurbada-bg-location';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;

  const rideId = await getActiveRidePointSession();
  if (!rideId) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;

  const points: RidePoint[] = locations.map((loc) => ({
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    timestamp: loc.timestamp,
    speedKmh: Math.max(0, (loc.coords.speed ?? 0) * 3.6),
    rawSpeedKmh: Math.max(0, (loc.coords.speed ?? 0) * 3.6),
    locationAccuracyM: loc.coords.accuracy ?? null,
    altitude: loc.coords.altitude ?? 0,
  }));

  await appendRidePoints(rideId, points).catch(() => undefined);
});

export async function primeRidePointStorage() {
  await initializeRidePointStorage();
}

export async function getStoredCoords(rideId: string): Promise<RidePoint[]> {
  return getRidePoints(rideId);
}

export async function clearStoredCoords(rideId: string): Promise<void> {
  await clearRidePoints(rideId);
}

export async function getCoordsCount(rideId: string): Promise<number> {
  return getRidePointCount(rideId);
}
