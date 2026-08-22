/**
 * PigeonX entitlement matrix.
 *
 * NOTE: temporary duplicate of `packages/core/entitlements.ts`. When core
 * ships, this file becomes a re-export. Keep the shape identical.
 *
 * Source of truth: docs/superpowers/specs/2026-08-21-pigeonx-platform-design.md §4.2
 */

export type Plan = 'free' | 'pro' | 'business' | 'enterprise';

export const PLAN_ORDER: Plan[] = ['free', 'pro', 'business', 'enterprise'];

export type Feature =
  | 'profiles.all'
  | 'profiles.audible'
  | 'profiles.builder'
  | 'profiles.saved.unlimited'
  | 'session.unlimited'
  | 'schedules.reminder'
  | 'schedules.device'
  | 'bluetooth.remember'
  | 'history.unlimited'
  | 'zones'
  | 'team'
  | 'dashboard'
  | 'org.multiLocation'
  | 'analytics.export';

export const FEATURE_MIN_PLAN: Record<Feature, Plan> = {
  'profiles.all': 'pro',
  'profiles.audible': 'pro',
  'profiles.builder': 'pro',
  'profiles.saved.unlimited': 'pro',
  'session.unlimited': 'pro',
  'schedules.reminder': 'pro',
  'schedules.device': 'business',
  'bluetooth.remember': 'pro',
  'history.unlimited': 'pro',
  zones: 'business',
  team: 'business',
  dashboard: 'business',
  'org.multiLocation': 'enterprise',
  'analytics.export': 'enterprise',
};

export type LimitKey =
  | 'savedProfiles'
  | 'sessionMinutes'
  | 'historyDays'
  | 'teamMembers';

/** `null` means unlimited. */
export const LIMITS: Record<LimitKey, Record<Plan, number | null>> = {
  savedProfiles: { free: 1, pro: null, business: null, enterprise: null },
  sessionMinutes: { free: 15, pro: null, business: null, enterprise: null },
  historyDays: { free: 7, pro: null, business: null, enterprise: null },
  teamMembers: { free: 0, pro: 0, business: 5, enterprise: null },
};

export function planRank(plan: Plan): number {
  return PLAN_ORDER.indexOf(plan);
}

/** Does `plan` unlock `feature`? */
export function can(plan: Plan, feature: Feature): boolean {
  return planRank(plan) >= planRank(FEATURE_MIN_PLAN[feature]);
}

/** Numeric limit for `key` on `plan`. `null` = unlimited. */
export function limit(plan: Plan, key: LimitKey): number | null {
  return LIMITS[key][plan];
}

/** The cheapest plan that unlocks `feature`. */
export function requiredPlan(feature: Feature): Plan {
  return FEATURE_MIN_PLAN[feature];
}

export const PRICES = {
  pro: {
    monthly: { amount: 4.99, currency: 'USD', label: '$4.99', period: 'month' },
    yearly: { amount: 29.99, currency: 'USD', label: '$29.99', period: 'year' },
  },
  business: {
    monthly: {
      amount: 29,
      currency: 'USD',
      label: '$29',
      period: 'place, each month',
    },
  },
  enterprise: { contact: true as const },
} as const;

export const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

/** What the person was trying to do when a plan stopped them. */
export const FEATURE_LABEL: Record<Feature, string> = {
  'profiles.all': 'Every sound',
  'profiles.audible': 'Bird alarm calls and hawk calls',
  'profiles.builder': 'Making your own sound',
  'profiles.saved.unlimited': 'Saving as many sounds as you like',
  'session.unlimited': 'Playing with no time limit',
  'schedules.reminder': 'Schedules',
  'schedules.device': 'A speaker that runs the schedule by itself',
  'bluetooth.remember': 'Remembering your Bluetooth speaker',
  'history.unlimited': 'The full list of what played',
  zones: 'Places, areas and speakers',
  team: 'Your team',
  dashboard: 'The web dashboard',
  'org.multiLocation': 'All your places in one view',
  'analytics.export': 'Downloading what played',
};
