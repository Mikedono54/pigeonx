import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { limit } from '../core/entitlements';
import type { AreaSize, BirdTarget, PlaceKind } from '../core/personalization';
import { PLACE_KIND_DEFAULT_NAME } from '../core/personalization';
import { somethingChanged } from '../services/syncSignal';
import { persistStorage, STORAGE_KEYS, uid } from './storage';
import { useAccount } from './useAccount';

/**
 * The place one person is protecting.
 *
 * This is not the Business list. A business owns buildings, areas and the
 * speakers inside them, and that lives in `usePlaces`. This is the balcony,
 * the roof or the boat one person opens the app to look after, plus the eight
 * answers they gave about it. Free keeps one. Pro keeps as many as you like.
 *
 * Everything here works with no account at all. The place is written to this
 * phone first and carried up to `user_places` by the sync layer when there is
 * somewhere to carry it to.
 */

export interface HomePlace {
  id: string;
  name: string;
  kind: PlaceKind;
  target: BirdTarget;
  /** null until somebody answers. Every answer here can be skipped. */
  areaSize: AreaSize | null;
  peopleNearby: boolean;
  limitAudible: boolean;
  /** free text in a person's own words: "early morning", "after lunch" */
  birdsActive: string | null;
  /** when this place last changed on this phone, for last write wins */
  updatedAt: number;
  /** the id the account gave this place, once it has one */
  remoteId: string | null;
}

/** What a place someone never described is called. */
export const DEFAULT_PLACE_NAME = 'My space';

export type PlaceDraft = Partial<Omit<HomePlace, 'id' | 'updatedAt' | 'remoteId'>>;

/** A place with every answer at its "not sure" default. */
export function draftPlace(draft: PlaceDraft = {}): HomePlace {
  const kind = draft.kind ?? 'custom';
  return {
    id: uid('plh'),
    name: draft.name?.trim() || PLACE_KIND_DEFAULT_NAME[kind],
    kind,
    target: draft.target ?? 'unsure',
    areaSize: draft.areaSize ?? null,
    peopleNearby: draft.peopleNearby ?? true,
    // Only meaningful when people are nearby, and false whenever they are not.
    limitAudible: (draft.peopleNearby ?? true) ? (draft.limitAudible ?? false) : false,
    birdsActive: draft.birdsActive?.trim() || null,
    updatedAt: Date.now(),
    remoteId: null,
  };
}

interface PlacesHomeState {
  places: HomePlace[];
  activeId: string | null;

  /**
   * The one place every phone starts with.
   *
   * Runs on first open and on the first open after an update, so somebody who
   * has been playing sounds for a month lands on a Home that already knows
   * where they are. Doing nothing when a place already exists is the point.
   */
  ensureDefault: () => HomePlace;
  /** false once the plan's cap is reached. Free keeps one place. */
  canAdd: () => boolean;
  add: (draft?: PlaceDraft) => HomePlace;
  update: (id: string, patch: PlaceDraft) => void;
  remove: (id: string) => void;
  setActive: (id: string) => void;
  active: () => HomePlace | undefined;
  byId: (id: string) => HomePlace | undefined;
  setAll: (places: HomePlace[]) => void;
  markSynced: (id: string, remoteId: string | null) => void;
}

export const usePlacesHome = create<PlacesHomeState>()(
  persist(
    (set, get) => ({
      places: [],
      activeId: null,

      ensureDefault: () => {
        const existing = get().places[0];
        if (existing) {
          if (!get().activeId) set({ activeId: existing.id });
          return existing;
        }
        const place = draftPlace({ name: DEFAULT_PLACE_NAME, kind: 'custom', target: 'unsure' });
        set({ places: [place], activeId: place.id });
        somethingChanged('place');
        return place;
      },

      canAdd: () => {
        const cap = limit(useAccount.getState().plan, 'places');
        return cap == null || get().places.length < cap;
      },

      add: (draft) => {
        const place = draftPlace(draft);
        set({ places: [...get().places, place], activeId: place.id });
        somethingChanged('place');
        return place;
      },

      update: (id, patch) => {
        set({
          places: get().places.map((p) => {
            if (p.id !== id) return p;
            const peopleNearby = patch.peopleNearby ?? p.peopleNearby;
            return {
              ...p,
              ...patch,
              name: patch.name?.trim() || p.name,
              birdsActive:
                patch.birdsActive === undefined ? p.birdsActive : patch.birdsActive?.trim() || null,
              peopleNearby,
              limitAudible: peopleNearby ? (patch.limitAudible ?? p.limitAudible) : false,
              updatedAt: Date.now(),
            };
          }),
        });
        somethingChanged('place');
      },

      remove: (id) => {
        const left = get().places.filter((p) => p.id !== id);
        set({
          places: left,
          activeId: get().activeId === id ? (left[0]?.id ?? null) : get().activeId,
        });
        somethingChanged('place');
      },

      setActive: (id) => {
        if (!get().places.some((p) => p.id === id)) return;
        set({ activeId: id });
      },

      // A place that was deleted on another phone leaves `activeId` pointing at
      // nothing, so the first place stands in rather than the header going blank.
      active: () => get().places.find((p) => p.id === get().activeId) ?? get().places[0],

      byId: (id) => get().places.find((p) => p.id === id),

      setAll: (places) =>
        set({
          places,
          activeId: places.some((p) => p.id === get().activeId)
            ? get().activeId
            : (places[0]?.id ?? null),
        }),

      markSynced: (id, remoteId) =>
        set({
          places: get().places.map((p) => (p.id === id ? { ...p, remoteId } : p)),
        }),
    }),
    {
      name: STORAGE_KEYS.placesHome,
      storage: persistStorage,
      partialize: (s) => ({ places: s.places, activeId: s.activeId }),
      onRehydrateStorage: () => (state) => {
        state?.ensureDefault();
      },
    },
  ),
);
