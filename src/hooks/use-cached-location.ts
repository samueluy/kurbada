import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

type CachedLocationOptions = {
  enabled?: boolean;
};

export type CachedLocation = {
  lat: number;
  lng: number;
  isFallback: boolean;
};

const DEFAULT_LAT = 14.5995;
const DEFAULT_LNG = 120.9842;

function isValidCoords(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

export async function fetchCachedLocation(): Promise<CachedLocation> {
  if (Platform.OS === 'web') {
    return { lat: DEFAULT_LAT, lng: DEFAULT_LNG, isFallback: true };
  }

  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) {
      return { lat: DEFAULT_LAT, lng: DEFAULT_LNG, isFallback: true };
    }

    const lastKnownPosition = await Location.getLastKnownPositionAsync();
    const seedPosition = lastKnownPosition ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const lat = seedPosition.coords.latitude;
    const lng = seedPosition.coords.longitude;
    if (isValidCoords(lat, lng)) {
      return { lat, lng, isFallback: false };
    }
  } catch {
    // fall through to fallback
  }

  return { lat: DEFAULT_LAT, lng: DEFAULT_LNG, isFallback: true };
}

export function useCachedLocation(options?: CachedLocationOptions) {
  return useQuery({
    queryKey: ['cached-location'],
    enabled: options?.enabled ?? true,
    queryFn: fetchCachedLocation,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });
}
