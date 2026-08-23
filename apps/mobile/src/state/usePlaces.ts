import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { speakerCount, type Area, type LiveByArea, type Place } from '../core/places';
import * as remote from '../services/placesRemote';
import { somethingChanged } from '../services/syncSignal';
import { persistStorage, STORAGE_KEYS, uid } from './storage';
import { useAccount } from './useAccount';

export type { Area, Place, Speaker } from '../core/places';

/**
 * Places for the Business plan.
 *
 * A place is a building. An area is one part of it, like a roof or a patio.
 * A speaker sits in an area and plays the sound there.
 *
 * One phone keeps its own list. A business keeps its list in the account, so
 * the whole team sees the same thing. Every action below works either way and
 * the screens never have to ask which one they are looking at.
 */

export type PlacesMode = 'phone' | 'business';

export interface PlacesResult {
  ok: boolean;
  message: string;
}

const OK: PlacesResult = { ok: true, message: '' };

interface PlacesState {
  places: Place[];
  mode: PlacesMode;
  orgId: string | null;
  loading: boolean;
  problem: string | null;
  live: LiveByArea;

  useBusiness: (orgId: string | null) => void;
  refresh: () => Promise<void>;
  setLive: (live: LiveByArea) => void;

  addPlace: (name: string) => Promise<PlacesResult>;
  renamePlace: (id: string, name: string) => Promise<PlacesResult>;
  removePlace: (id: string) => Promise<PlacesResult>;
  addArea: (placeId: string, name: string) => Promise<PlacesResult>;
  renameArea: (placeId: string, areaId: string, name: string) => Promise<PlacesResult>;
  removeArea: (placeId: string, areaId: string) => Promise<PlacesResult>;
  addSpeaker: (placeId: string, areaId: string, name?: string) => Promise<PlacesResult>;
  removeSpeaker: (placeId: string, areaId: string, speakerId: string) => Promise<PlacesResult>;
  speakerCount: (place: Place) => number;
  areaById: (areaId: string) => { place: Place; area: Area } | null;
}

export const usePlaces = create<PlacesState>()(
  persist(
    (set, get) => ({
      places: [],
      mode: 'phone',
      orgId: null,
      loading: false,
      problem: null,
      live: {},

      useBusiness: (orgId) => {
        set({
          mode: orgId ? 'business' : 'phone',
          orgId,
          problem: null,
          live: {},
        });
        if (orgId) void get().refresh();
      },

      refresh: async () => {
        const { mode, orgId } = get();
        if (mode !== 'business' || !orgId) return;
        set({ loading: true });
        const result = await remote.fetchPlaces(orgId);
        set({
          loading: false,
          problem: result.ok ? null : result.message,
          places: result.ok ? (result.value ?? []) : get().places,
        });
      },

      setLive: (live) => set({ live }),

      addPlace: async (name) => {
        if (get().mode === 'business' && get().orgId) {
          const result = await remote.addPlace(get().orgId!, name);
          if (result.ok) await get().refresh();
          return { ok: result.ok, message: result.message };
        }
        const place: Place = { id: uid('plc'), name, areas: [] };
        set({ places: [...get().places, place] });
        somethingChanged('place');
        return { ok: true, message: `${name} added.` };
      },

      renamePlace: async (id, name) => {
        if (get().mode === 'business') {
          const result = await remote.renamePlace(id, name);
          if (result.ok) await get().refresh();
          return { ok: result.ok, message: result.message };
        }
        set({
          places: get().places.map((p) => (p.id === id ? { ...p, name } : p)),
        });
        somethingChanged('place');
        return OK;
      },

      removePlace: async (id) => {
        if (get().mode === 'business') {
          const result = await remote.removePlace(id);
          if (result.ok) await get().refresh();
          return { ok: result.ok, message: result.message };
        }
        set({ places: get().places.filter((p) => p.id !== id) });
        somethingChanged('place');
        return OK;
      },

      addArea: async (placeId, name) => {
        if (get().mode === 'business') {
          const result = await remote.addArea(placeId, name);
          if (result.ok) await get().refresh();
          return { ok: result.ok, message: result.message };
        }
        const area: Area = { id: uid('ara'), name, speakerIds: [] };
        set({
          places: get().places.map((p) =>
            p.id === placeId ? { ...p, areas: [...p.areas, area] } : p,
          ),
        });
        somethingChanged('place');
        return { ok: true, message: `${name} added.` };
      },

      renameArea: async (placeId, areaId, name) => {
        if (get().mode === 'business') {
          const result = await remote.renameArea(areaId, name);
          if (result.ok) await get().refresh();
          return { ok: result.ok, message: result.message };
        }
        set({
          places: get().places.map((p) =>
            p.id !== placeId
              ? p
              : {
                  ...p,
                  areas: p.areas.map((a) => (a.id === areaId ? { ...a, name } : a)),
                },
          ),
        });
        somethingChanged('place');
        return OK;
      },

      removeArea: async (placeId, areaId) => {
        if (get().mode === 'business') {
          const result = await remote.removeArea(areaId);
          if (result.ok) await get().refresh();
          return { ok: result.ok, message: result.message };
        }
        set({
          places: get().places.map((p) =>
            p.id === placeId ? { ...p, areas: p.areas.filter((a) => a.id !== areaId) } : p,
          ),
        });
        somethingChanged('place');
        return OK;
      },

      addSpeaker: async (placeId, areaId, name) => {
        if (get().mode === 'business') {
          const result = await remote.addSpeaker(areaId, name ?? 'Test speaker');
          if (result.ok) await get().refresh();
          return { ok: result.ok, message: result.message };
        }
        const speaker = useAccount.getState().addSimulatedDevice(name);
        set({
          places: get().places.map((p) =>
            p.id !== placeId
              ? p
              : {
                  ...p,
                  areas: p.areas.map((a) =>
                    a.id !== areaId ? a : { ...a, speakerIds: [...a.speakerIds, speaker.id] },
                  ),
                },
          ),
        });
        somethingChanged('place');
        return { ok: true, message: `${speaker.name} added.` };
      },

      removeSpeaker: async (placeId, areaId, speakerId) => {
        if (get().mode === 'business') {
          const result = await remote.removeSpeaker(speakerId);
          if (result.ok) await get().refresh();
          return { ok: result.ok, message: result.message };
        }
        set({
          places: get().places.map((p) => ({
            ...p,
            areas: p.areas.map((a) => ({
              ...a,
              speakerIds: a.speakerIds.filter((s) => s !== speakerId),
            })),
          })),
        });
        useAccount.getState().removeDevice(speakerId);
        somethingChanged('place');
        return OK;
      },

      speakerCount,

      areaById: (areaId) => {
        for (const place of get().places) {
          const area = place.areas.find((a) => a.id === areaId);
          if (area) return { place, area };
        }
        return null;
      },
    }),
    {
      name: STORAGE_KEYS.places,
      storage: persistStorage,
      // Only what one phone keeps is worth saving. A business reads its own
      // list from the account every time.
      partialize: (s) => ({ places: s.mode === 'phone' ? s.places : [] }),
    },
  ),
);
