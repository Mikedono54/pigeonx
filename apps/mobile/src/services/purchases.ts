import type { Plan } from '../core/entitlements';

export type ProductId = 'pro_monthly' | 'pro_yearly';

export interface PurchaseResult {
  ok: boolean;
  message: string;
}

/**
 * The seam RevenueCat drops into later. Nothing here starts a store SDK. The
 * test version just flips the local plan so every locked path is walkable
 * before store keys exist (spec sections 2 and 4.2).
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
    async purchase() {
      setPlan('pro');
      return { ok: true, message: 'Test mode: plan set to Pro' };
    },
    async restore() {
      return { ok: true, message: 'Nothing to bring back yet.' };
    },
  };
}
