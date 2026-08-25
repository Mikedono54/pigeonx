import { create } from 'zustand';
import { can, whyNot } from '../core/team';
import { EVERY_DAY, type ProtectionPlan } from './useProtectionPlans';
import { recommendPlan } from '../core/protectionPlans';
import type { BirdTarget } from '../core/personalization';
import type { OutputKind } from '../core/profiles';
import {
  attachOrgPlan,
  fetchOrgPlans,
  removeOrgPlan,
  saveOrgPlan,
  type OrgPlan,
  type OrgPlanDraft,
} from '../services/orgPlansRemote';
import { useAccount } from './useAccount';

export type { OrgPlan, OrgPlanDraft } from '../services/orgPlansRemote';

/**
 * The protection plans a business keeps, as the phone holds them.
 *
 * Read by everybody on the team, written by managers and owners. The account
 * enforces that; this store refuses first so that a teammate is never offered
 * a Save button that would come back rejected.
 *
 * Nothing is written to the phone. A business's plans are read fresh, because
 * two people editing one plan on two phones is the case a stale local copy
 * gets wrong.
 */

/**
 * The same plan, in the shape a session runs.
 *
 * Start does not care whose plan it is: it takes the sounds, the order, the
 * length and the hours it is allowed to run in, and a business's plan answers
 * all four exactly like the one on somebody's phone. The id is the account's
 * own, which is what the run is written down against.
 */
export function asProtectionPlan(plan: OrgPlan): ProtectionPlan {
  return { ...plan, placeId: '', updatedAt: 0, remoteId: plan.id };
}

export interface OrgPlansResult {
  ok: boolean;
  message: string;
}

interface OrgPlansState {
  plans: OrgPlan[];
  loading: boolean;
  /** true once the account has answered, however it answered */
  loaded: boolean;
  problem: string | null;

  refresh: () => Promise<void>;
  reset: () => void;
  byId: (id: string) => OrgPlan | undefined;
  /** the plan looking after one area, when one is */
  forArea: (zoneId: string | null | undefined) => OrgPlan | undefined;
  /** what a person may do to these, from the role they hold */
  mayEdit: () => boolean;
  save: (plan: OrgPlanDraft) => Promise<OrgPlansResult>;
  attach: (planId: string, zoneId: string | null) => Promise<OrgPlansResult>;
  remove: (planId: string) => Promise<OrgPlansResult>;
  /** The opening offer for an area, from the birds the place answered for. */
  draftFor: (
    zoneId: string,
    target: BirdTarget,
    output: OutputKind,
    limitAudible: boolean,
  ) => OrgPlanDraft;
}

export const useOrgPlans = create<OrgPlansState>((set, get) => ({
  plans: [],
  loading: false,
  loaded: false,
  problem: null,

  refresh: async () => {
    const orgId = useAccount.getState().activeOrgId;
    if (!orgId) {
      set({ plans: [], loaded: false, problem: null });
      return;
    }
    set({ loading: true });
    const result = await fetchOrgPlans(orgId);
    set({
      loading: false,
      loaded: result.ok,
      problem: result.ok ? null : result.message,
      plans: result.ok ? (result.value ?? []) : get().plans,
    });
  },

  reset: () => set({ plans: [], loading: false, loaded: false, problem: null }),

  byId: (id) => get().plans.find((p) => p.id === id),

  forArea: (zoneId) => (zoneId ? get().plans.find((p) => p.zoneId === zoneId) : undefined),

  mayEdit: () => can(useAccount.getState().activeOrgRole, 'plans'),

  save: async (plan) => {
    if (!get().mayEdit()) return { ok: false, message: whyNot('plans') };
    const orgId = useAccount.getState().activeOrgId;
    if (!orgId) return { ok: false, message: 'Sign in to change this.' };

    const result = await saveOrgPlan(orgId, plan);
    if (result.ok) await get().refresh();
    return { ok: result.ok, message: result.message };
  },

  attach: async (planId, zoneId) => {
    if (!get().mayEdit()) return { ok: false, message: whyNot('plans') };
    const result = await attachOrgPlan(planId, zoneId);
    if (result.ok) await get().refresh();
    return { ok: result.ok, message: result.message };
  },

  remove: async (planId) => {
    if (!get().mayEdit()) return { ok: false, message: whyNot('plans') };
    const result = await removeOrgPlan(planId);
    if (result.ok) await get().refresh();
    return { ok: result.ok, message: result.message };
  },

  draftFor: (zoneId, target, output, limitAudible) => {
    const offer = recommendPlan(target, limitAudible, output);
    return {
      zoneId,
      name: offer.name,
      target,
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
    };
  },
}));
