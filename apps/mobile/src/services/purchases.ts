import type { Plan } from '../core/entitlements';

export type ProductId = 'pro_monthly' | 'pro_yearly';

export interface PurchaseResult {
  ok: boolean;
  message: string;
}

/**
 * The seam RevenueCat drops into later. Nothing here initialises an SDK — the
 * sandbox implementation just flips the local plan so every gated path is
 * walkable before keys exist (spec §2, §4.2).
 */
export interface PurchaseProvider {
  isLive(): boolean;
  purchase(product: ProductId): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
}

export function createSandboxPurchases(
  setPlan: (plan: Plan) => void
): PurchaseProvider {
  return {
    isLive: () => false,
    async purchase(product) {
      setPlan('pro');
      return {
        ok: true,
        message: `Sandbox: plan upgraded (${
          product === 'pro_yearly' ? 'yearly' : 'monthly'
        })`,
      };
    },
    async restore() {
      return { ok: true, message: 'Sandbox: nothing to restore yet' };
    },
  };
}
