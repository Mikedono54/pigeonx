/**
 * Deno-runnable copy of the plan logic in `packages/core/src/billing.ts`.
 *
 * Deno will not resolve the `./x.js` specifiers the workspace package uses, and
 * edge functions must not pull in zod, so the two files are kept deliberately
 * identical in behaviour instead of shared. `packages/core/src/edge-parity.test.ts`
 * runs both against the same table of cases and fails if they ever drift, so a
 * change to one is a change to both.
 */

export type Plan = 'free' | 'pro' | 'business' | 'enterprise';

export const PRO_ENTITLEMENT_ID = 'pro';

export interface RevenueCatCustomerInfo {
  entitlements?: { active?: Record<string, unknown> | null } | null;
}

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
  entitlement_id?: string | null;
  expiration_at_ms?: number | null;
  purchased_at_ms?: number | null;
}

function grantsPro(event: RevenueCatEvent): boolean {
  const ids = event.entitlement_ids ?? (event.entitlement_id ? [event.entitlement_id] : []);
  return ids.includes(PRO_ENTITLEMENT_ID);
}

function stillWithinPeriod(event: RevenueCatEvent, now: number): boolean {
  return event.expiration_at_ms == null || event.expiration_at_ms > now;
}

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
