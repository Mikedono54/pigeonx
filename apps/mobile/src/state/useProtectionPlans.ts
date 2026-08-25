import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BirdTarget } from '../core/personalization';
import type { OutputKind } from '../core/profiles';
import { DEFAULT_SESSION_MINUTES, recommendPlan } from '../core/protectionPlans';
import { somethingChanged } from '../services/syncSignal';
import { persistStorage, STORAGE_KEYS, uid } from './storage';
import type { HomePlace } from './usePlacesHome';

/**
 * A protection plan: the sounds one place plays, in what order, for how long.
 *
 * A plan belongs to a place. A place has at most one plan running the show at
 * a time, and Start uses it. Everything is written to this phone first; the
 * sync layer carries it to `protection_plans` when there is an account.
 *
 * "Plan" on its own still means Free, Pro or Business everywhere else in the
 * app. On screen this one is always a protection plan, or its own name.
 */

export interface ProtectionPlan {
  id: string;
  /** the local place id this plan looks after */
  placeId: string;
  name: string;
  target: BirdTarget;
  /** built-in sound ids, in the order they were saved */
  soundIds: string[];
  randomizeOrder: boolean;
  /** quiet gap between sounds in the rotation, seconds */
  intervalSeconds: number;
  sessionMinutes: number;
  output: OutputKind;
  volume: number;
  /** "22:00", or null when the plan has no quiet hours */
  quietStart: string | null;
  quietEnd: string | null;
  /** 1 is Monday, 7 is Sunday, the way `protection_plans.days` counts */
  days: number[];
  startsOn: string | null;
  endsOn: string | null;
  updatedAt: number;
  remoteId: string | null;
}

export const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];

export type PlanInput = Omit<ProtectionPlan, 'id' | 'updatedAt' | 'remoteId'> & {
  id?: string;
  remoteId?: string | null;
};

interface ProtectionPlansState {
  plans: ProtectionPlan[];
  /** which plan is running the show, per place */
  activeByPlace: Record<string, string>;

  upsert: (input: PlanInput) => ProtectionPlan;
  remove: (id: string) => void;
  byId: (id: string) => ProtectionPlan | undefined;
  forPlace: (placeId: string) => ProtectionPlan[];
  activeFor: (placeId: string | null | undefined) => ProtectionPlan | undefined;
  setActive: (placeId: string, planId: string | null) => void;
  /** Saves the opening offer for a place and puts it in charge. */
  adoptRecommendation: (place: HomePlace, output: OutputKind) => ProtectionPlan;
  setAll: (plans: ProtectionPlan[]) => void;
  markSaved: (id: string, remoteId: string | null) => void;
}

export const useProtectionPlans = create<ProtectionPlansState>()(
  persist(
    (set, get) => ({
      plans: [],
      activeByPlace: {},

      upsert: (input) => {
        const existing = input.id ? get().plans.find((p) => p.id === input.id) : undefined;
        const plan: ProtectionPlan = {
          ...input,
          id: existing?.id ?? uid('pln'),
          updatedAt: Date.now(),
          remoteId: input.remoteId ?? existing?.remoteId ?? null,
        };
        set({
          plans: existing
            ? get().plans.map((p) => (p.id === plan.id ? plan : p))
            : [...get().plans, plan],
        });
        somethingChanged('plan');
        return plan;
      },

      remove: (id) => {
        const plan = get().plans.find((p) => p.id === id);
        const active = { ...get().activeByPlace };
        if (plan && active[plan.placeId] === id) delete active[plan.placeId];
        set({ plans: get().plans.filter((p) => p.id !== id), activeByPlace: active });
        somethingChanged('plan');
      },

      byId: (id) => get().plans.find((p) => p.id === id),

      forPlace: (placeId) => get().plans.filter((p) => p.placeId === placeId),

      activeFor: (placeId) => {
        if (!placeId) return undefined;
        const id = get().activeByPlace[placeId];
        return id ? get().plans.find((p) => p.id === id) : undefined;
      },

      setActive: (placeId, planId) => {
        const active = { ...get().activeByPlace };
        if (planId) active[placeId] = planId;
        else delete active[placeId];
        set({ activeByPlace: active });
        somethingChanged('plan');
      },

      adoptRecommendation: (place, output) => {
        const offer = recommendPlan(place.target, place.limitAudible, output);
        const plan = get().upsert({
          placeId: place.id,
          name: offer.name,
          target: place.target,
          soundIds: offer.soundIds,
          randomizeOrder: offer.randomizeOrder,
          intervalSeconds: 0,
          sessionMinutes: offer.sessionMinutes,
          output,
          volume: 0.85,
          quietStart: null,
          quietEnd: null,
          days: EVERY_DAY,
          startsOn: null,
          endsOn: null,
        });
        get().setActive(place.id, plan.id);
        return plan;
      },

      setAll: (plans) => set({ plans }),

      markSaved: (id, remoteId) =>
        set({
          plans: get().plans.map((p) => (p.id === id ? { ...p, remoteId } : p)),
        }),
    }),
    {
      name: STORAGE_KEYS.protectionPlans,
      storage: persistStorage,
      partialize: (s) => ({ plans: s.plans, activeByPlace: s.activeByPlace }),
    },
  ),
);

/** How a plan reads under its own name: "Two sounds, 15 minutes". */
export function describePlan(plan: ProtectionPlan): string {
  const sounds = plan.soundIds.length;
  const minutes = plan.sessionMinutes || DEFAULT_SESSION_MINUTES;
  return `${sounds} sound${sounds === 1 ? '' : 's'}, ${minutes} minutes`;
}
