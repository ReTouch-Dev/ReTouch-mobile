import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

function getWebStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export async function getSessionItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    return storage ? storage.getItem(key) : null;
  }

  return SecureStore.getItemAsync(key);
}

export async function setSessionItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    if (!storage) throw new Error('Browser storage is unavailable');
    storage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function deleteSessionItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    storage?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
