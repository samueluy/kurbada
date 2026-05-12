import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { RidePoint } from '@/types/domain';

export const LOCATION_TASK_NAME = 'kurbada-bg-location';
const STORAGE_PATH = `${FileSystem.documentDirectory}kurbada-ride-coords.json`;

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;

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

  try {
    let existing: RidePoint[] = [];
    const fileInfo = await FileSystem.getInfoAsync(STORAGE_PATH);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(STORAGE_PATH);
      existing = JSON.parse(content);
    }
    const merged = [...existing, ...points];
    await FileSystem.writeAsStringAsync(STORAGE_PATH, JSON.stringify(merged));
  } catch {
    // silently fail
  }
});

export async function getStoredCoords(): Promise<RidePoint[]> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(STORAGE_PATH);
    if (!fileInfo.exists) return [];
    const content = await FileSystem.readAsStringAsync(STORAGE_PATH);
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function clearStoredCoords(): Promise<void> {
  try {
    await FileSystem.deleteAsync(STORAGE_PATH, { idempotent: true });
  } catch {
    // ignore
  }
}

export async function getCoordsCount(): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(STORAGE_PATH);
    if (!fileInfo.exists) return 0;
    const content = await FileSystem.readAsStringAsync(STORAGE_PATH);
    return JSON.parse(content).length;
  } catch {
    return 0;
  }
}
