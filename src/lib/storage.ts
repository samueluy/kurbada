import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memoryStorage = new Map<string, string>();

async function getWebStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

export const appStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      const storage = await getWebStorage();
      return storage?.getItem(key) ?? memoryStorage.get(key) ?? null;
    }

    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      const storage = await getWebStorage();
      storage?.setItem(key, value);
      memoryStorage.set(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      const storage = await getWebStorage();
      storage?.removeItem(key);
      memoryStorage.delete(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
};
