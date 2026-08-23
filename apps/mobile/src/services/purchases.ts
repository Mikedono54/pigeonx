import { Platform } from 'react-native';
import { PRICES, type Plan } from '../core/entitlements';

export type ProductId = 'pro_monthly' | 'pro_yearly';

export interface PurchaseResult {
  ok: boolean;
  /** One short line for the person. Empty means say nothing. */
  message: string;
  /** true when the person backed out on purpose */
  canceled?: boolean;
}

export interface PurchasePrices {
  monthly: string | null;
  yearly: string | null;
}

/**
 * What the app needs from a store. Two things answer to this: the real store,
 * and a test version that just flips the plan so every locked path is walkable
 * before store keys exist.
 */
export interface PurchaseProvider {
  isLive(): boolean;
  prices(): Promise<PurchasePrices>;
  purchase(product: ProductId): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
  /** Asks the store what this person already has. Quiet on the test store. */
  refresh(): Promise<Plan | null>;
}

export function createSandboxPurchases(setPlan: (plan: Plan) => void): PurchaseProvider {
  return {
    isLive: () => false,
    async prices() {
      return { monthly: null, yearly: null };
    },
    async purchase() {
      setPlan('pro');
      return { ok: true, message: 'Test mode: plan set to Pro' };
    },
    async restore() {
      return { ok: true, message: 'Nothing to bring back yet.' };
    },
    async refresh() {
      return null;
    },
  };
}

/** What the plans screen shows when the store has not said otherwise. */
export const LISTED_PRICES: PurchasePrices = {
  monthly: PRICES.pro.monthly.label,
  yearly: PRICES.pro.yearly.label,
};

/** Where a business sets up billing. The web takes card details, not the app. */
export const BUSINESS_BILLING_URL = 'https://pigeonx.org/app/billing';
export const TERMS_URL = 'https://pigeonx.org/terms';
export const PRIVACY_URL = 'https://pigeonx.org/privacy';

/**
 * Which store to use.
 *
 * With store keys, the real one. Without them, the test one. Nothing starts a
 * store SDK when there is no key for this phone.
 */
export function createPurchases(
  setPlan: (plan: Plan) => void,
  platform: string = Platform.OS,
  env: Record<string, unknown> = process.env as unknown as Record<string, unknown>,
): PurchaseProvider {
  // Loaded here, not at the top, so a build with no keys never pulls the store
  // in at all.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { storeKey, createRevenueCatPurchases } =
    require('./revenuecat') as typeof import('./revenuecat');

  const key = storeKey(platform, env);
  if (!key) return createSandboxPurchases(setPlan);
  return createRevenueCatPurchases(setPlan, key);
}
