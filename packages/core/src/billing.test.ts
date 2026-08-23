import { describe, expect, it } from 'vitest';
import {
  PRO_ENTITLEMENT_ID,
  STRIPE_ENTITLED_STATUSES,
  planFromRevenueCatCustomerInfo,
  planFromRevenueCatEvent,
  planFromStripeSubscription,
  revenueCatSubscription,
  stripeSubscriptionRow,
} from './billing.js';

describe('planFromRevenueCatCustomerInfo', () => {
  it("returns pro when the 'pro' entitlement is active", () => {
    expect(
      planFromRevenueCatCustomerInfo({
        entitlements: { active: { pro: { identifier: 'pro', isActive: true } } },
      }),
    ).toBe('pro');
  });

  it('returns free when no entitlement is active', () => {
    expect(planFromRevenueCatCustomerInfo({ entitlements: { active: {} } })).toBe('free');
  });

  it('ignores entitlements that are not the pro one', () => {
    expect(
      planFromRevenueCatCustomerInfo({ entitlements: { active: { legacy_lifetime: {} } } }),
    ).toBe('free');
  });

  it('treats a missing or malformed payload as free rather than throwing', () => {
    expect(planFromRevenueCatCustomerInfo(null)).toBe('free');
    expect(planFromRevenueCatCustomerInfo(undefined)).toBe('free');
    expect(planFromRevenueCatCustomerInfo({})).toBe('free');
    expect(planFromRevenueCatCustomerInfo({ entitlements: {} })).toBe('free');
    expect(planFromRevenueCatCustomerInfo({ entitlements: { active: null } })).toBe('free');
  });

  it('names the entitlement the app checks for', () => {
    expect(PRO_ENTITLEMENT_ID).toBe('pro');
  });
});

describe('planFromRevenueCatEvent', () => {
  const future = Date.now() + 30 * 86_400_000;
  const past = Date.now() - 86_400_000;

  it('grants pro on a purchase', () => {
    expect(
      planFromRevenueCatEvent({
        type: 'INITIAL_PURCHASE',
        entitlement_ids: ['pro'],
        expiration_at_ms: future,
      }),
    ).toBe('pro');
  });

  for (const type of ['RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE'] as const) {
    it(`keeps pro on ${type}`, () => {
      expect(
        planFromRevenueCatEvent({ type, entitlement_ids: ['pro'], expiration_at_ms: future }),
      ).toBe('pro');
    });
  }

  it('keeps pro through a cancellation until the period actually ends', () => {
    expect(
      planFromRevenueCatEvent({
        type: 'CANCELLATION',
        entitlement_ids: ['pro'],
        expiration_at_ms: future,
      }),
    ).toBe('pro');
  });

  it('drops to free on expiration', () => {
    expect(
      planFromRevenueCatEvent({
        type: 'EXPIRATION',
        entitlement_ids: ['pro'],
        expiration_at_ms: past,
      }),
    ).toBe('free');
  });

  it('drops to free once a cancelled period has run out', () => {
    expect(
      planFromRevenueCatEvent({
        type: 'CANCELLATION',
        entitlement_ids: ['pro'],
        expiration_at_ms: past,
      }),
    ).toBe('free');
  });

  it('ignores events for a different entitlement', () => {
    expect(
      planFromRevenueCatEvent({
        type: 'INITIAL_PURCHASE',
        entitlement_ids: ['lifetime_extras'],
        expiration_at_ms: future,
      }),
    ).toBe('free');
  });

  it('accepts the singular entitlement_id RevenueCat sends on older events', () => {
    expect(
      planFromRevenueCatEvent({
        type: 'RENEWAL',
        entitlement_id: 'pro',
        expiration_at_ms: future,
      }),
    ).toBe('pro');
  });

  it('treats a lifetime grant (no expiry) as pro', () => {
    expect(planFromRevenueCatEvent({ type: 'INITIAL_PURCHASE', entitlement_ids: ['pro'] })).toBe(
      'pro',
    );
  });

  it('returns free for an unknown event type', () => {
    expect(planFromRevenueCatEvent({ type: 'TRANSFER', entitlement_ids: ['pro'] } as never)).toBe(
      'free',
    );
  });
});

describe('revenueCatSubscription', () => {
  it('maps an event onto the subscriptions row the webhook writes', () => {
    const expires = Date.now() + 86_400_000;
    const row = revenueCatSubscription({
      type: 'INITIAL_PURCHASE',
      app_user_id: 'user-1',
      product_id: 'pigeonx_pro_monthly',
      entitlement_ids: ['pro'],
      expiration_at_ms: expires,
    });
    expect(row).toEqual({
      provider: 'revenuecat',
      product_id: 'pigeonx_pro_monthly',
      status: 'active',
      current_period_end: new Date(expires).toISOString(),
      plan: 'pro',
    });
  });

  it('records a cancellation as still active but ending', () => {
    const row = revenueCatSubscription({
      type: 'CANCELLATION',
      product_id: 'pigeonx_pro_monthly',
      entitlement_ids: ['pro'],
      expiration_at_ms: Date.now() + 86_400_000,
    });
    expect(row.status).toBe('canceled');
    expect(row.plan).toBe('pro');
  });

  it('records an expiration as expired and free', () => {
    const row = revenueCatSubscription({
      type: 'EXPIRATION',
      product_id: 'pigeonx_pro_monthly',
      entitlement_ids: ['pro'],
      expiration_at_ms: Date.now() - 1000,
    });
    expect(row.status).toBe('expired');
    expect(row.plan).toBe('free');
  });

  it('leaves the period end null when there is none', () => {
    const row = revenueCatSubscription({
      type: 'INITIAL_PURCHASE',
      product_id: 'pigeonx_pro_lifetime',
      entitlement_ids: ['pro'],
    });
    expect(row.current_period_end).toBeNull();
  });
});

describe('planFromStripeSubscription', () => {
  for (const status of STRIPE_ENTITLED_STATUSES) {
    it(`treats ${status} as business`, () => {
      expect(planFromStripeSubscription({ status })).toBe('business');
    });
  }

  for (const status of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused']) {
    it(`treats ${status} as free`, () => {
      expect(planFromStripeSubscription({ status })).toBe('free');
    });
  }

  it('treats a missing subscription as free', () => {
    expect(planFromStripeSubscription(null)).toBe('free');
    expect(planFromStripeSubscription(undefined)).toBe('free');
    expect(planFromStripeSubscription({})).toBe('free');
  });
});

describe('stripeSubscriptionRow', () => {
  it('pulls the price, quantity and period end off the subscription', () => {
    const row = stripeSubscriptionRow({
      id: 'sub_123',
      status: 'active',
      current_period_end: 1_800_000_000,
      items: { data: [{ price: { id: 'price_business_location' }, quantity: 3 }] },
    });
    expect(row).toEqual({
      provider: 'stripe',
      product_id: 'price_business_location',
      status: 'active',
      current_period_end: new Date(1_800_000_000 * 1000).toISOString(),
      quantity: 3,
      plan: 'business',
    });
  });

  it('reads the period end off the item when the subscription has none', () => {
    const row = stripeSubscriptionRow({
      id: 'sub_123',
      status: 'active',
      items: {
        data: [
          {
            price: { id: 'price_business_location' },
            quantity: 1,
            current_period_end: 1_800_000_000,
          },
        ],
      },
    });
    expect(row.current_period_end).toBe(new Date(1_800_000_000 * 1000).toISOString());
  });

  it('falls back to one location and the subscription id when items are missing', () => {
    const row = stripeSubscriptionRow({ id: 'sub_123', status: 'canceled' });
    expect(row.quantity).toBe(1);
    expect(row.product_id).toBe('sub_123');
    expect(row.plan).toBe('free');
    expect(row.current_period_end).toBeNull();
  });
});
