import {
  can,
  limit,
  requiredPlan,
  FEATURE_MIN_PLAN,
  PLAN_ORDER,
  PRICES,
  type Feature,
  type Plan,
} from '../src/core/entitlements';

describe('can()', () => {
  it('locks every paid feature on Free', () => {
    for (const feature of Object.keys(FEATURE_MIN_PLAN) as Feature[]) {
      expect(can('free', feature)).toBe(false);
    }
  });

  it('gives Pro the solo features but not the Business ones', () => {
    expect(can('pro', 'profiles.all')).toBe(true);
    expect(can('pro', 'profiles.audible')).toBe(true);
    expect(can('pro', 'profiles.builder')).toBe(true);
    expect(can('pro', 'session.unlimited')).toBe(true);
    expect(can('pro', 'schedules.reminder')).toBe(true);
    expect(can('pro', 'bluetooth.remember')).toBe(true);
    expect(can('pro', 'history.unlimited')).toBe(true);

    expect(can('pro', 'schedules.device')).toBe(false);
    expect(can('pro', 'zones')).toBe(false);
    expect(can('pro', 'team')).toBe(false);
    expect(can('pro', 'dashboard')).toBe(false);
  });

  it('gives Business everything except the Enterprise features', () => {
    expect(can('business', 'zones')).toBe(true);
    expect(can('business', 'team')).toBe(true);
    expect(can('business', 'dashboard')).toBe(true);
    expect(can('business', 'schedules.device')).toBe(true);

    expect(can('business', 'org.multiLocation')).toBe(false);
    expect(can('business', 'analytics.export')).toBe(false);
  });

  it('gives Enterprise every feature', () => {
    for (const feature of Object.keys(FEATURE_MIN_PLAN) as Feature[]) {
      expect(can('enterprise', feature)).toBe(true);
    }
  });

  it('is monotonic, so a higher plan never loses a feature', () => {
    for (const feature of Object.keys(FEATURE_MIN_PLAN) as Feature[]) {
      let seenTrue = false;
      for (const plan of PLAN_ORDER) {
        const allowed = can(plan, feature);
        if (allowed) seenTrue = true;
        else expect(seenTrue).toBe(false);
      }
    }
  });
});

describe('limit()', () => {
  it('caps the Free plan and lifts every cap above it', () => {
    expect(limit('free', 'savedProfiles')).toBe(1);
    expect(limit('free', 'sessionMinutes')).toBe(15);
    expect(limit('free', 'historyDays')).toBe(7);

    for (const plan of ['pro', 'business', 'enterprise'] as Plan[]) {
      expect(limit(plan, 'savedProfiles')).toBeNull();
      expect(limit(plan, 'sessionMinutes')).toBeNull();
      expect(limit(plan, 'historyDays')).toBeNull();
    }
  });

  it('allows 5 team members on Business and unlimited on Enterprise', () => {
    expect(limit('free', 'teamMembers')).toBe(0);
    expect(limit('pro', 'teamMembers')).toBe(0);
    expect(limit('business', 'teamMembers')).toBe(5);
    expect(limit('enterprise', 'teamMembers')).toBeNull();
  });
});

describe('requiredPlan()', () => {
  it('names the cheapest plan that unlocks a feature', () => {
    expect(requiredPlan('profiles.builder')).toBe('pro');
    expect(requiredPlan('zones')).toBe('business');
    expect(requiredPlan('analytics.export')).toBe('enterprise');
  });
});

describe('PRICES', () => {
  it('matches the published price sheet', () => {
    expect(PRICES.pro.monthly.amount).toBe(4.99);
    expect(PRICES.pro.yearly.amount).toBe(29.99);
    expect(PRICES.business.monthly.amount).toBe(29);
  });
});
