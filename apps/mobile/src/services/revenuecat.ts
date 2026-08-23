import { Platform } from 'react-native';
import type { Plan } from '../core/entitlements';
import type { ProductId, PurchasePrices, PurchaseProvider, PurchaseResult } from './purchases';

/**
 * The real store.
 *
 * Nothing in here runs until store keys exist. With no keys the app uses the
 * test version instead, so every screen stays walkable while the store side is
 * being set up.
 */

/** The one thing a paid plan unlocks, as the store knows it. */
export const PRO_ENTITLEMENT = 'pro';
export const BUSINESS_ENTITLEMENT = 'business';

type Bag = Record<string, unknown>;

export function storeKey(
  platform: string = Platform.OS,
  env: Bag = process.env as unknown as Bag,
): string | null {
  const key =
    platform === 'android'
      ? env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
      : env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : null;
}

/** Which plan the store says this person has. */
export function planFromCustomerInfo(info: unknown): Plan {
  if (!info || typeof info !== 'object') return 'free';
  const active = ((info as Bag).entitlements as Bag | undefined)?.active as Bag | undefined;
  if (!active || typeof active !== 'object') return 'free';
  if (active[BUSINESS_ENTITLEMENT]) return 'business';
  if (active[PRO_ENTITLEMENT]) return 'pro';
  return 'free';
}

interface StorePackage {
  identifier?: string;
  packageType?: string;
  product?: { priceString?: string; identifier?: string };
}

export function packagesFrom(offerings: unknown): StorePackage[] {
  const current = (offerings as Bag | null)?.current as Bag | undefined;
  const list = current?.availablePackages;
  return Array.isArray(list) ? (list as StorePackage[]) : [];
}

const YEARLY = ['ANNUAL', 'YEARLY', '$rc_annual'];
const MONTHLY = ['MONTHLY', '$rc_monthly'];

function matches(pkg: StorePackage, names: string[]): boolean {
  const type = (pkg.packageType ?? '').toUpperCase();
  const id = (pkg.identifier ?? '').toLowerCase();
  return names.some((name) => type === name.toUpperCase() || id === name.toLowerCase());
}

export function packageFor(offerings: unknown, product: ProductId): StorePackage | null {
  const names = product === 'pro_yearly' ? YEARLY : MONTHLY;
  return packagesFrom(offerings).find((pkg) => matches(pkg, names)) ?? null;
}

/** What each choice costs, in the money the person's store uses. */
export function pricesFrom(offerings: unknown): PurchasePrices {
  return {
    monthly: packageFor(offerings, 'pro_monthly')?.product?.priceString ?? null,
    yearly: packageFor(offerings, 'pro_yearly')?.product?.priceString ?? null,
  };
}

/* ── the live provider ────────────────────────────────────────────────────── */

interface PurchasesSdk {
  configure: (options: { apiKey: string }) => void;
  getOfferings: () => Promise<unknown>;
  purchasePackage: (pkg: unknown) => Promise<{ customerInfo?: unknown }>;
  restorePurchases: () => Promise<unknown>;
  getCustomerInfo: () => Promise<unknown>;
  logIn?: (userId: string) => Promise<unknown>;
}

let sdk: PurchasesSdk | null = null;
let configured = false;

/** Test seam. Lets a test hand in a pretend store. */
export function __setPurchasesSdk(next: PurchasesSdk | null): void {
  sdk = next;
  configured = false;
}

function loadSdk(): PurchasesSdk | null {
  if (sdk) return sdk;
  try {
    // Loaded only when keys exist, so a build with no store stays quiet.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases');
    sdk = (mod.default ?? mod) as PurchasesSdk;
    return sdk;
  } catch {
    return null;
  }
}

export function createRevenueCatPurchases(
  setPlan: (plan: Plan) => void,
  apiKey: string,
): PurchaseProvider {
  const ready = (): PurchasesSdk | null => {
    const store = loadSdk();
    if (!store) return null;
    if (!configured) {
      try {
        store.configure({ apiKey });
        configured = true;
      } catch {
        return null;
      }
    }
    return store;
  };

  return {
    isLive: () => true,

    async prices() {
      const store = ready();
      if (!store) return { monthly: null, yearly: null };
      try {
        return pricesFrom(await store.getOfferings());
      } catch {
        return { monthly: null, yearly: null };
      }
    },

    async purchase(product: ProductId): Promise<PurchaseResult> {
      const store = ready();
      if (!store) {
        return { ok: false, message: 'The store is not ready. Try again.' };
      }
      try {
        const pkg = packageFor(await store.getOfferings(), product);
        if (!pkg) {
          return { ok: false, message: 'That plan is not for sale right now.' };
        }
        const { customerInfo } = await store.purchasePackage(pkg);
        const plan = planFromCustomerInfo(customerInfo);
        setPlan(plan);
        return plan === 'free'
          ? { ok: false, message: "That didn't work. Try again." }
          : { ok: true, message: 'You are all set.' };
      } catch (e) {
        if (wasCanceled(e)) return { ok: false, message: '', canceled: true };
        return { ok: false, message: "That didn't work. Try again." };
      }
    },

    async restore(): Promise<PurchaseResult> {
      const store = ready();
      if (!store) {
        return { ok: false, message: 'The store is not ready. Try again.' };
      }
      try {
        const plan = planFromCustomerInfo(await store.restorePurchases());
        setPlan(plan);
        return plan === 'free'
          ? { ok: true, message: 'Nothing to bring back on this account.' }
          : { ok: true, message: 'Welcome back. Everything is on again.' };
      } catch {
        return { ok: false, message: "That didn't work. Try again." };
      }
    },

    async refresh() {
      const store = ready();
      if (!store) return null;
      try {
        const plan = planFromCustomerInfo(await store.getCustomerInfo());
        setPlan(plan);
        return plan;
      } catch {
        return null;
      }
    },
  };
}

function wasCanceled(e: unknown): boolean {
  const bag = (e ?? {}) as Bag;
  return bag.userCancelled === true || bag.code === '1';
}
