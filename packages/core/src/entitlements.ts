/**
 * Entitlement matrix — spec §4.2. Every gated action in either app goes
 * through `can()` / `limit()`; nothing else may hard-code a plan name.
 */

export type Plan = 'free' | 'pro' | 'business' | 'enterprise';

export const PLANS = ['free', 'pro', 'business', 'enterprise'] as const satisfies readonly Plan[];

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

export const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  pro: 1,
  business: 2,
  enterprise: 3,
};

/** The lowest plan that unlocks each feature. */
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

/** Numeric caps. `null` means unlimited; `0` means the feature is off entirely. */
export const LIMITS = {
  savedProfiles: { free: 1, pro: null, business: null, enterprise: null },
  sessionMinutes: { free: 15, pro: null, business: null, enterprise: null },
  historyDays: { free: 7, pro: null, business: null, enterprise: null },
  teamMembers: { free: 0, pro: 0, business: 5, enterprise: null },
} as const satisfies Record<string, Record<Plan, number | null>>;

export type LimitKey = keyof typeof LIMITS;

export function can(plan: Plan, feature: Feature): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_MIN_PLAN[feature]];
}

/** `null` = unlimited. */
export function limit<K extends LimitKey>(plan: Plan, k: K): number | null {
  return LIMITS[k][plan];
}

/** Display-only until billing keys exist. */
export const PRICES = {
  pro: { monthly: 4.99, yearly: 29.99 },
  business: { perLocationMonthly: 29 },
} as const;

/** The three system profiles a Free account may run. Kept in sync with `profiles.ts`. */
export const FREE_SYSTEM_PROFILE_IDS = [
  'sys_pigeon_18k',
  'sys_pulse_16k',
  'sys_sweep_15_19k',
] as const satisfies readonly string[];

/**
 * The interface both billing backends implement. `SandboxEntitlements` reads
 * `profiles.plan` / `organizations.plan`; RevenueCat and Stripe drop in later
 * without touching callers.
 */
export interface EntitlementProvider {
  getPlan(): Plan;
  can(feature: Feature): boolean;
  limit<K extends LimitKey>(k: K): number | null;
}

/** Plan-backed provider, good enough for sandbox and for tests. */
export function entitlementsFor(plan: Plan): EntitlementProvider {
  return {
    getPlan: () => plan,
    can: (feature) => can(plan, feature),
    limit: (k) => limit(plan, k),
  };
}
