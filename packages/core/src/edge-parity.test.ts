/**
 * The edge functions cannot import this package: Deno will not resolve the
 * `./x.js` specifiers, and an edge function must not pull in zod. So
 * `supabase/functions/_shared/` holds copies of the pure logic.
 *
 * A copy that silently drifts is worse than no copy, so these tests run both
 * implementations over the same cases and fail the moment they disagree. If one
 * side changes, this is what tells you the other has to.
 */

import { describe, expect, it } from 'vitest';
import * as core from './billing.js';
import * as edge from '../../../supabase/functions/_shared/billing.ts';
import * as coreReports from './reports.js';
import * as edgeReports from '../../../supabase/functions/_shared/reports.ts';

const NOW = Date.UTC(2026, 7, 23, 12, 0, 0);
const FUTURE = NOW + 30 * 86_400_000;
const PAST = NOW - 86_400_000;

const rcEvents: core.RevenueCatEvent[] = [
  { type: 'INITIAL_PURCHASE', entitlement_ids: ['pro'], expiration_at_ms: FUTURE, product_id: 'm' },
  { type: 'RENEWAL', entitlement_ids: ['pro'], expiration_at_ms: FUTURE, product_id: 'm' },
  { type: 'UNCANCELLATION', entitlement_ids: ['pro'], expiration_at_ms: FUTURE },
  { type: 'PRODUCT_CHANGE', entitlement_ids: ['pro'], expiration_at_ms: FUTURE, product_id: 'y' },
  { type: 'CANCELLATION', entitlement_ids: ['pro'], expiration_at_ms: FUTURE },
  { type: 'CANCELLATION', entitlement_ids: ['pro'], expiration_at_ms: PAST },
  { type: 'EXPIRATION', entitlement_ids: ['pro'], expiration_at_ms: PAST },
  { type: 'INITIAL_PURCHASE', entitlement_ids: ['other'], expiration_at_ms: FUTURE },
  { type: 'RENEWAL', entitlement_id: 'pro', expiration_at_ms: FUTURE },
  { type: 'INITIAL_PURCHASE', entitlement_ids: ['pro'] },
];

const customerInfos: core.RevenueCatCustomerInfo[] = [
  { entitlements: { active: { pro: {} } } },
  { entitlements: { active: {} } },
  { entitlements: { active: { other: {} } } },
  {},
];

const stripeSubs: core.StripeSubscriptionLike[] = [
  {
    id: 'sub_1',
    status: 'active',
    current_period_end: 1_800_000_000,
    items: { data: [{ price: { id: 'price_x' }, quantity: 4 }] },
  },
  { id: 'sub_2', status: 'trialing', items: { data: [{ price: { id: 'price_x' }, quantity: 1 }] } },
  { id: 'sub_3', status: 'past_due' },
  { id: 'sub_4', status: 'canceled' },
  { id: 'sub_5', status: 'unpaid', items: { data: [] } },
];

describe('the Deno copy of billing.ts matches packages/core', () => {
  it.each(rcEvents)('planFromRevenueCatEvent agrees on $type', (event) => {
    expect(edge.planFromRevenueCatEvent(event, NOW)).toBe(core.planFromRevenueCatEvent(event, NOW));
  });

  it.each(rcEvents)('revenueCatSubscription agrees on $type', (event) => {
    expect(edge.revenueCatSubscription(event, NOW)).toEqual(
      core.revenueCatSubscription(event, NOW),
    );
  });

  it.each(customerInfos)('planFromRevenueCatCustomerInfo agrees on %o', (info) => {
    expect(edge.planFromRevenueCatCustomerInfo(info)).toBe(
      core.planFromRevenueCatCustomerInfo(info),
    );
  });

  it.each(stripeSubs)('stripeSubscriptionRow agrees on $id', (sub) => {
    expect(edge.stripeSubscriptionRow(sub)).toEqual(core.stripeSubscriptionRow(sub));
    expect(edge.planFromStripeSubscription(sub)).toBe(core.planFromStripeSubscription(sub));
  });

  it('agrees on the entitlement id and the entitled Stripe statuses', () => {
    expect(edge.PRO_ENTITLEMENT_ID).toBe(core.PRO_ENTITLEMENT_ID);
    expect(edge.STRIPE_ENTITLED_STATUSES).toEqual(core.STRIPE_ENTITLED_STATUSES);
    expect(edge.REVENUECAT_EVENT_TYPES).toEqual(core.REVENUECAT_EVENT_TYPES);
  });
});

describe('the Deno copy of reports.ts matches packages/core', () => {
  const days = ['2026-08-10', '2026-08-16', '2026-08-17', '2026-08-23', '2026-09-02', '2027-01-01'];

  it.each(days)('isoWeekStart and lastCompleteWeekStart agree on %s', (day) => {
    const date = new Date(`${day}T09:00:00Z`);
    expect(edgeReports.isoWeekStart(date)).toBe(coreReports.isoWeekStart(date));
    expect(edgeReports.lastCompleteWeekStart(date)).toBe(coreReports.lastCompleteWeekStart(date));
    expect(edgeReports.weekEnd(day)).toBe(coreReports.weekEnd(day));
  });

  it.each([
    { sessions: 0, total_minutes: 0, zones_active: 0 },
    { sessions: 1, total_minutes: 61, zones_active: 1 },
    { sessions: 24, total_minutes: 312.5, zones_active: 3 },
    { sessions: 3, total_minutes: 45, zones_active: 2 },
  ])('weeklyReportEmail agrees on $sessions run(s)', (numbers) => {
    const data = {
      week_start: '2026-08-10',
      week_end: '2026-08-16',
      location_name: 'Harbor Hotel',
      ...numbers,
    };
    expect(edgeReports.weeklyReportEmail(data)).toEqual(coreReports.weeklyReportEmail(data));
  });
});
