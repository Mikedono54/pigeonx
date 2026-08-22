import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, STORAGE_KEYS, uid } from './storage';

/**
 * Places for the Business plan.
 *
 * A place is a building. An area is one part of it, like a roof or a patio.
 * A speaker sits in an area and plays the sound there.
 */

export interface Area {
  id: string;
  name: string;
  /** ids of speakers kept in useAccount */
  speakerIds: string[];
}

export interface Place {
  id: string;
  name: string;
  areas: Area[];
}

interface PlacesState {
  places: Place[];
  addPlace: (name: string) => Place;
  renamePlace: (id: string, name: string) => void;
  removePlace: (id: string) => void;
  addArea: (placeId: string, name: string) => Area | undefined;
  removeArea: (placeId: string, areaId: string) => void;
  addSpeaker: (placeId: string, areaId: string, speakerId: string) => void;
  removeSpeaker: (speakerId: string) => void;
  speakerCount: (place: Place) => number;
}

export const usePlaces = create<PlacesState>()(
  persist(
    (set, get) => ({
      places: [],

      addPlace: (name) => {
        const place: Place = { id: uid('plc'), name, areas: [] };
        set({ places: [...get().places, place] });
        return place;
      },

      renamePlace: (id, name) =>
        set({
          places: get().places.map((p) => (p.id === id ? { ...p, name } : p)),
        }),

      removePlace: (id) =>
        set({ places: get().places.filter((p) => p.id !== id) }),

      addArea: (placeId, name) => {
        const place = get().places.find((p) => p.id === placeId);
        if (!place) return undefined;
        const area: Area = { id: uid('ara'), name, speakerIds: [] };
        set({
          places: get().places.map((p) =>
            p.id === placeId ? { ...p, areas: [...p.areas, area] } : p
          ),
        });
        return area;
      },

      removeArea: (placeId, areaId) =>
        set({
          places: get().places.map((p) =>
            p.id === placeId
              ? { ...p, areas: p.areas.filter((a) => a.id !== areaId) }
              : p
          ),
        }),

      addSpeaker: (placeId, areaId, speakerId) =>
        set({
          places: get().places.map((p) =>
            p.id !== placeId
              ? p
              : {
                  ...p,
                  areas: p.areas.map((a) =>
                    a.id !== areaId
                      ? a
                      : { ...a, speakerIds: [...a.speakerIds, speakerId] }
                  ),
                }
          ),
        }),

      removeSpeaker: (speakerId) =>
        set({
          places: get().places.map((p) => ({
            ...p,
            areas: p.areas.map((a) => ({
              ...a,
              speakerIds: a.speakerIds.filter((s) => s !== speakerId),
            })),
          })),
        }),

      speakerCount: (place) =>
        place.areas.reduce((sum, a) => sum + a.speakerIds.length, 0),
    }),
    {
      name: STORAGE_KEYS.places,
      storage: persistStorage,
      partialize: (s) => ({ places: s.places }),
    }
  )
);
