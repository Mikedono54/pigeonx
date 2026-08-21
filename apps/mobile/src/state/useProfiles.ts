import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SYSTEM_PROFILES,
  type AudioProfile,
  type ProfileKind,
  type ProfileParams,
} from '../core/profiles';
import { persistStorage, STORAGE_KEYS, uid } from './storage';

interface ProfilesState {
  saved: AudioProfile[];
  lastUsedId: string;

  all: () => AudioProfile[];
  byId: (id: string) => AudioProfile | undefined;
  save: (input: {
    id?: string;
    name: string;
    description: string;
    kind: ProfileKind;
    params: ProfileParams;
  }) => AudioProfile;
  remove: (id: string) => void;
  setLastUsed: (id: string) => void;
}

export const useProfiles = create<ProfilesState>()(
  persist(
    (set, get) => ({
      saved: [],
      lastUsedId: SYSTEM_PROFILES[0].id,

      all: () => [...SYSTEM_PROFILES, ...get().saved],
      byId: (id) => get().all().find((p) => p.id === id),

      save: (input) => {
        const existing = input.id
          ? get().saved.find((p) => p.id === input.id)
          : undefined;
        const profile: AudioProfile = {
          id: existing?.id ?? uid('usr'),
          name: input.name,
          description: input.description,
          kind: input.kind,
          params: input.params,
          minPlan: 'pro',
          isSystem: false,
        };
        set({
          saved: existing
            ? get().saved.map((p) => (p.id === profile.id ? profile : p))
            : [...get().saved, profile],
        });
        return profile;
      },

      remove: (id) => set({ saved: get().saved.filter((p) => p.id !== id) }),
      setLastUsed: (id) => set({ lastUsedId: id }),
    }),
    {
      name: STORAGE_KEYS.profiles,
      storage: persistStorage,
      partialize: (s) => ({ saved: s.saved, lastUsedId: s.lastUsedId }),
    }
  )
);
