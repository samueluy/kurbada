import { Platform } from 'react-native';

type MapboxModule = {
  setAccessToken: (token: string) => void;
  MapView: React.ComponentType<any>;
  Camera: React.ComponentType<any>;
  ShapeSource: React.ComponentType<any>;
  LineLayer: React.ComponentType<any>;
  CircleLayer: React.ComponentType<any>;
};

export function getMapboxModule(): MapboxModule | null {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const maybeModule = require('@rnmapbox/maps');
    return maybeModule?.default ?? maybeModule ?? null;
  } catch {
    return null;
  }
}

export function hasNativeMapbox() {
  return getMapboxModule() !== null;
}

