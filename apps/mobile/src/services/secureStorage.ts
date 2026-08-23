import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Where the sign-in token lives.
 *
 * The keychain is the right home for a token, but it refuses long values on
 * some phones, so a value is cut into pieces and each piece gets its own key.
 * A phone without a keychain (a simulator, a test run) falls back to normal
 * storage so nothing crashes.
 */

const CHUNK_SIZE = 1800;
const MARKER = 'pgx.parts:';

export interface KeyValueStore {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

let keychainOk: boolean | null = null;

async function keychainAvailable(): Promise<boolean> {
  if (keychainOk !== null) return keychainOk;
  try {
    keychainOk = await SecureStore.isAvailableAsync();
  } catch {
    keychainOk = false;
  }
  return keychainOk;
}

/** Test seam. */
export function __setKeychainAvailable(next: boolean | null): void {
  keychainOk = next;
}

export function splitIntoParts(value: string, size = CHUNK_SIZE): string[] {
  const parts: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    parts.push(value.slice(i, i + size));
  }
  return parts.length > 0 ? parts : [''];
}

export function partKey(key: string, index: number): string {
  return `${key}.p${index}`;
}

export function markerFor(parts: string[]): string {
  return `${MARKER}${parts.length}`;
}

export function readMarker(raw: string | null): number | null {
  if (!raw || !raw.startsWith(MARKER)) return null;
  const count = Number.parseInt(raw.slice(MARKER.length), 10);
  return Number.isFinite(count) && count > 0 ? count : null;
}

async function readCount(key: string): Promise<number | null> {
  try {
    return readMarker(await SecureStore.getItemAsync(key));
  } catch {
    return null;
  }
}

export const secureStorage: KeyValueStore = {
  async getItem(key) {
    if (!(await keychainAvailable())) return AsyncStorage.getItem(key);
    try {
      const head = await SecureStore.getItemAsync(key);
      const count = readMarker(head);
      if (count == null) return head;
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await SecureStore.getItemAsync(partKey(key, i));
        if (part == null) return null;
        parts.push(part);
      }
      return parts.join('');
    } catch {
      return AsyncStorage.getItem(key);
    }
  },

  async setItem(key, value) {
    if (!(await keychainAvailable())) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    const previous = await readCount(key);
    const parts = splitIntoParts(value);
    try {
      for (let i = 0; i < parts.length; i++) {
        await SecureStore.setItemAsync(partKey(key, i), parts[i]);
      }
      await SecureStore.setItemAsync(key, markerFor(parts));
      for (let i = parts.length; i < (previous ?? 0); i++) {
        await SecureStore.deleteItemAsync(partKey(key, i));
      }
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },

  async removeItem(key) {
    if (!(await keychainAvailable())) {
      await AsyncStorage.removeItem(key);
      return;
    }
    const count = await readCount(key);
    try {
      for (let i = 0; i < (count ?? 0); i++) {
        await SecureStore.deleteItemAsync(partKey(key, i));
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      await AsyncStorage.removeItem(key);
    }
  },
};
