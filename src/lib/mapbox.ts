import Constants from 'expo-constants';
import { NativeModules, Platform, UIManager } from 'react-native';

type MapboxModule = {
  setAccessToken: (token: string) => void;
  MapView: React.ComponentType<any>;
  Camera: React.ComponentType<any>;
  ShapeSource: React.ComponentType<any>;
  LineLayer: React.ComponentType<any>;
};

let cachedMapboxModule: MapboxModule | null | undefined;

function isExpoGoRuntime() {
  return Boolean(
    Constants.expoGoConfig ||
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === 'storeClient'
  );
}

function canUseNativeMapboxRuntime() {
  if (Platform.OS === 'web' || isExpoGoRuntime()) {
    return false;
  }

  return (
    Constants.executionEnvironment === 'bare' ||
    Constants.executionEnvironment === 'standalone'
  );
}

export function getMapboxModule(): MapboxModule | null {
  if (cachedMapboxModule !== undefined) {
    return cachedMapboxModule;
  }

  if (!canUseNativeMapboxRuntime()) {
    cachedMapboxModule = null;
    return null;
  }

  const hasBridgeModule = Boolean(NativeModules.RNMBXModule || NativeModules.RNMBXMapViewModule);
  const hasViewManager = Boolean(UIManager.getViewManagerConfig?.('RNMBXMapView'));

  if (!hasBridgeModule && !hasViewManager) {
    cachedMapboxModule = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const maybeModule = require('@rnmapbox/maps');
    cachedMapboxModule = maybeModule?.default ?? maybeModule ?? null;
    return cachedMapboxModule ?? null;
  } catch {
    cachedMapboxModule = null;
    return null;
  }
}

export function hasNativeMapbox() {
  return getMapboxModule() !== null;
}
