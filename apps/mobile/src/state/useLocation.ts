import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as Location from 'expo-location';

import type { Coords } from '../core/sun';
import { persistStorage, STORAGE_KEYS } from './storage';

/**
 * Roughly where the phone is, and only for one reason.
 *
 * Sunrise is a different time in Seattle and in San Diego, so a schedule that
 * starts at sunrise needs a position to work one out. Nothing else in the app
 * reads this. It asks for the coarsest accuracy the phone will give, keeps
 * one last known position and never sends it anywhere: the sun calculation
 * runs on this phone.
 *
 * Somebody who says no still gets a schedule. It runs on a plain half past
 * six, and every screen that shows one of those times says it is an estimate.
 */

export type LocationPermission = 'unknown' | 'granted' | 'denied';

interface LocationState {
  coords: Coords | null;
  permission: LocationPermission;
  /** when the position was last read, so a stale one can be refreshed */
  fixedAt: number | null;
  /** True once a real position is in hand. */
  hasFix: () => boolean;
  /** Asks once, stores what comes back, and answers whether we got a fix. */
  ask: () => Promise<boolean>;
  forget: () => void;
}

export const useLocation = create<LocationState>()(
  persist(
    (set, get) => ({
      coords: null,
      permission: 'unknown',
      fixedAt: null,

      hasFix: () => get().coords !== null,

      ask: async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            set({ permission: 'denied' });
            return false;
          }

          // The last position the phone happens to have costs nothing and is
          // as good as it needs to be. A fresh one is the fallback, at the
          // coarsest accuracy on offer.
          const fix =
            (await Location.getLastKnownPositionAsync({})) ??
            (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }));

          if (!fix) {
            set({ permission: 'granted' });
            return false;
          }

          set({
            permission: 'granted',
            coords: {
              latitude: fix.coords.latitude,
              longitude: fix.coords.longitude,
            },
            fixedAt: Date.now(),
          });
          return true;
        } catch {
          // A phone with location switched off throws rather than refusing.
          set({ permission: 'denied' });
          return false;
        }
      },

      forget: () => set({ coords: null, permission: 'unknown', fixedAt: null }),
    }),
    {
      name: STORAGE_KEYS.location,
      storage: persistStorage,
      partialize: (s) => ({ coords: s.coords, permission: s.permission, fixedAt: s.fixedAt }),
    },
  ),
);
