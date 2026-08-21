import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const memory = new Map<string, string>();

/**
 * AsyncStorage with an in-memory fallback so stores never explode in tests or
 * on a device where storage is temporarily unavailable.
 */
const backing: StateStorage = {
  getItem: async (name) => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      memory.set(name, value);
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      memory.delete(name);
    }
  },
};

export const persistStorage = createJSONStorage(() => backing);

export const STORAGE_KEYS = {
  account: 'pigeonx.account',
  profiles: 'pigeonx.profiles',
  schedules: 'pigeonx.schedules',
  history: 'pigeonx.history',
  session: 'pigeonx.session',
} as const;

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
