/**
 * The pure half of billing: turning what RevenueCat and Stripe say into the
 * plan we store. The edge functions do the I/O (verify a signature, write a
 * row); everything worth getting wrong lives here, where it can be tested
 * without a webhook or an account.
 *
 * Spec §4.2: RevenueCat drives `profiles.plan` (free/pro) for individuals,
 * Stripe drives `organizations.plan` (business/enterprise) for teams.
 */

import type { Plan } from './entitlements.js';

/** The single entitlement the app asks about. Configured in RevenueCat. */
export const PRO_ENTITLEMENT_ID = 'pro';

// ─── RevenueCat ───────────────────────────────────────────────────────────────

/** The shape of `CustomerInfo` we depend on — the SDK's type has far more. */
export interface RevenueCatCustomerInfo {
  entitlements?: {
    active?: Record<string, unknown> | null;
  } | null;
}

/**
 * Read the client SDK's `CustomerInfo`. Anything unexpected reads as free: a
 * malformed payload must never hand out a paid plan.
 */
export function planFromRevenueCatCustomerInfo(
  info: RevenueCatCustomerInfo | null | undefined,
): Plan {
  const active = info?.entitlements?.active;
  if (!active || typeof active !== 'object') return 'free';
  return PRO_ENTITLEMENT_ID in active ? 'pro' : 'free';
}

export const REVENUECAT_EVENT_TYPES = [
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'CANCELLATION',
  'EXPIRATION',
] as const;

export type RevenueCatEventType = (typeof REVENUECAT_EVENT_TYPES)[number];

export interface RevenueCatEvent {
  type: RevenueCatEventType;
  app_user_id?: string | null;
  original_app_user_id?: string | null;
  product_id?: string | null;
  entitlement_ids?: string[] | null;
  /** Older events carry a single id instead of the array. */
  entitlement_id?: string | null;
  expiration_at_ms?: number | null;
  purchased_at_ms?: number | null;
}

function grantsPro(event: RevenueCatEvent): boolean {
  const ids = event.entitlement_ids ?? (event.entitlement_id ? [event.entitlement_id] : []);
  return ids.includes(PRO_ENTITLEMENT_ID);
}

function stillWithinPeriod(event: RevenueCatEvent, now: number): boolean {
  // No expiry at all means a non-expiring grant (lifetime), not an expired one.
  return event.expiration_at_ms == null || event.expiration_at_ms > now;
}

/**
 * A cancellation is not a downgrade: RevenueCat sends it when auto-renew is
 * switched off, and the person keeps what they paid for until the period ends.
 * EXPIRATION is the event that actually takes the plan away.
 */
export function planFromRevenueCatEvent(event: RevenueCatEvent, now = Date.now()): Plan {
  if (!REVENUECAT_EVENT_TYPES.includes(event.type)) return 'free';
  if (!grantsPro(event)) return 'free';
  if (event.type === 'EXPIRATION') return 'free';
  return stillWithinPeriod(event, now) ? 'pro' : 'free';
}

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';

export interface RevenueCatSubscriptionRow {
  provider: 'revenuecat';
  product_id: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  plan: Plan;
}

/** What `rc-webhook` upserts into `subscriptions`, plus the plan to stamp. */
export function revenueCatSubscription(
  event: RevenueCatEvent,
  now = Date.now(),
): RevenueCatSubscriptionRow {
  const plan = planFromRevenueCatEvent(event, now);
  const status: SubscriptionStatus =
    event.type === 'EXPIRATION' ? 'expired' : event.type === 'CANCELLATION' ? 'canceled' : 'active';

  return {
    provider: 'revenuecat',
    product_id: event.product_id ?? PRO_ENTITLEMENT_ID,
    status,
    current_period_end:
      event.expiration_at_ms == null ? null : new Date(event.expiration_at_ms).toISOString(),
    plan,
  };
}

// ─── Stripe ───────────────────────────────────────────────────────────────────

/**
 * `past_due` still counts: Stripe retries a failed card for days, and locking a
 * hotel out of its own zones over one declined charge is the wrong trade.
 */
export const STRIPE_ENTITLED_STATUSES = ['active', 'trialing', 'past_due'] as const;

export interface StripeSubscriptionLike {
  id?: string;
  status?: string;
  current_period_end?: number | null;
  items?: {
    data?: Array<{
      price?: { id?: string | null } | null;
      quantity?: number | null;
      current_period_end?: number | null;
    }>;
  } | null;
}

/** Business or nothing — Enterprise is sold by hand, never by a webhook. */
export function planFromStripeSubscription(
  sub: StripeSubscriptionLike | null | undefined,
): 'business' | 'free' {
  const status = sub?.status;
  return status && (STRIPE_ENTITLED_STATUSES as readonly string[]).includes(status)
    ? 'business'
    : 'free';
}

export interface StripeSubscriptionRow {
  provider: 'stripe';
  product_id: string;
  status: string;
  current_period_end: string | null;
  /** Locations billed. The org pays per location (spec §4.2). */
  quantity: number;
  plan: 'business' | 'free';
}

export function stripeSubscriptionRow(sub: StripeSubscriptionLike): StripeSubscriptionRow {
  const item = sub.items?.data?.[0];
  const periodEnd = sub.current_period_end ?? item?.current_period_end ?? null;

  return {
    provider: 'stripe',
    product_id: item?.price?.id ?? sub.id ?? 'unknown',
    status: sub.status ?? 'incomplete',
    current_period_end: periodEnd == null ? null : new Date(periodEnd * 1000).toISOString(),
    quantity: item?.quantity ?? 1,
    plan: planFromStripeSubscription(sub),
  };
}
