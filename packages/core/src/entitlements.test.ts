import { describe, expect, it } from 'vitest';
import {
  can,
  FEATURE_MIN_PLAN,
  FREE_SYSTEM_PROFILE_IDS,
  limit,
  LIMITS,
  PLANS,
  PLAN_RANK,
  PRICES,
  type Feature,
  type Plan,
} from './entitlements.js';

/** The spec §4.2 matrix, transcribed. */
const MATRIX: Array<[Feature, Record<Plan, boolean>]> = [
  ['profiles.all', { free: false, pro: true, business: true, enterprise: true }],
  ['profiles.audible', { free: false, pro: true, business: true, enterprise: true }],
  ['profiles.builder', { free: false, pro: true, business: true, enterprise: true }],
  ['profiles.saved.unlimited', { free: false, pro: true, business: true, enterprise: true }],
  ['session.unlimited', { free: false, pro: true, business: true, enterprise: true }],
  ['schedules.reminder', { free: false, pro: true, business: true, enterprise: true }],
  ['schedules.device', { free: false, pro: false, business: true, enterprise: true }],
  ['bluetooth.remember', { free: false, pro: true, business: true, enterprise: true }],
  ['history.unlimited', { free: false, pro: true, business: true, enterprise: true }],
  ['zones', { free: false, pro: false, business: true, enterprise: true }],
  ['team', { free: false, pro: false, business: true, enterprise: true }],
  ['dashboard', { free: false, pro: false, business: true, enterprise: true }],
  ['org.multiLocation', { free: false, pro: false, business: false, enterprise: true }],
  ['analytics.export', { free: false, pro: false, business: false, enterprise: true }],
  ['places.multiple', { free: false, pro: true, business: true, enterprise: true }],
];

describe('PLAN_RANK', () => {
  it('orders free < pro < business < enterprise', () => {
    expect(PLAN_RANK).toEqual({ free: 0, pro: 1, business: 2, enterprise: 3 });
  });

  it('PLANS lists every plan in rank order', () => {
    expect(PLANS).toEqual(['free', 'pro', 'business', 'enterprise']);
  });
});

describe('can()', () => {
  for (const [feature, expected] of MATRIX) {
    for (const plan of Object.keys(expected) as Plan[]) {
      it(`${plan} ${expected[plan] ? 'can' : 'cannot'} ${feature}`, () => {
        expect(can(plan, feature)).toBe(expected[plan]);
      });
    }
  }

  it('covers every declared feature', () => {
    const declared = Object.keys(FEATURE_MIN_PLAN).sort();
    const tested = MATRIX.map(([f]) => f).sort();
    expect(declared).toEqual(tested);
  });

  it('is monotonic — a higher plan never loses a feature', () => {
    for (const feature of Object.keys(FEATURE_MIN_PLAN) as Feature[]) {
      const allowed = PLANS.map((p) => can(p, feature));
      const firstYes = allowed.indexOf(true);
      if (firstYes >= 0) {
        expect(allowed.slice(firstYes).every(Boolean), feature).toBe(true);
      }
    }
  });
});

describe('limit()', () => {
  it('saved profiles: free 1, everyone else unlimited', () => {
    expect(limit('free', 'savedProfiles')).toBe(1);
    expect(limit('pro', 'savedProfiles')).toBeNull();
    expect(limit('business', 'savedProfiles')).toBeNull();
    expect(limit('enterprise', 'savedProfiles')).toBeNull();
  });

  it('session cap: free 15 minutes, everyone else unlimited', () => {
    expect(limit('free', 'sessionMinutes')).toBe(15);
    expect(limit('pro', 'sessionMinutes')).toBeNull();
    expect(limit('enterprise', 'sessionMinutes')).toBeNull();
  });

  it('history: free 7 days, everyone else unlimited', () => {
    expect(limit('free', 'historyDays')).toBe(7);
    expect(limit('pro', 'historyDays')).toBeNull();
  });

  it('team members: none below business, business 5, enterprise unlimited', () => {
    expect(limit('free', 'teamMembers')).toBe(0);
    expect(limit('pro', 'teamMembers')).toBe(0);
    expect(limit('business', 'teamMembers')).toBe(5);
    expect(limit('enterprise', 'teamMembers')).toBeNull();
  });

  it('LIMITS defines every plan for every key', () => {
    for (const [key, byPlan] of Object.entries(LIMITS)) {
      expect(Object.keys(byPlan).sort(), key).toEqual([...PLANS].sort());
    }
  });
});

describe('PRICES', () => {
  it('matches the published display prices', () => {
    expect(PRICES.pro.monthly).toBe(4.99);
    expect(PRICES.pro.yearly).toBe(29.99);
    expect(PRICES.business.perLocationMonthly).toBe(29);
  });
});

describe('FREE_SYSTEM_PROFILE_IDS', () => {
  it('names exactly three free system profiles', () => {
    expect(FREE_SYSTEM_PROFILE_IDS).toHaveLength(3);
    expect(new Set(FREE_SYSTEM_PROFILE_IDS).size).toBe(3);
  });
});

describe('places', () => {
  it('free users get one place and no multi-place feature', () => {
    expect(can('free', 'places.multiple')).toBe(false);
    expect(limit('free', 'places')).toBe(1);
  });
  it('pro and up get multiple places', () => {
    expect(can('pro', 'places.multiple')).toBe(true);
    expect(limit('pro', 'places')).toBeNull();
    expect(can('business', 'places.multiple')).toBe(true);
    expect(limit('enterprise', 'places')).toBeNull();
  });
});
