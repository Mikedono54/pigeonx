import { useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  can as canPlan,
  limit as limitPlan,
  requiredPlan,
  type Feature,
  type LimitKey,
  type Plan,
} from '../core/entitlements';
import { useAccount } from '../state/useAccount';

export interface Entitlement {
  plan: Plan;
  can: (feature: Feature) => boolean;
  limit: (key: LimitKey) => number | null;
  requiredPlan: (feature: Feature) => Plan;
  /**
   * Gate a tap. Returns true when the action may proceed; otherwise opens the
   * paywall and returns false — no gated control is ever a dead button.
   */
  guard: (feature: Feature) => boolean;
}

export function useEntitlement(): Entitlement {
  const plan = useAccount((s) => s.plan);

  const guard = useCallback(
    (feature: Feature) => {
      if (canPlan(plan, feature)) return true;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/paywall', params: { feature } });
      return false;
    },
    [plan]
  );

  return useMemo(
    () => ({
      plan,
      can: (feature: Feature) => canPlan(plan, feature),
      limit: (key: LimitKey) => limitPlan(plan, key),
      requiredPlan,
      guard,
    }),
    [plan, guard]
  );
}
