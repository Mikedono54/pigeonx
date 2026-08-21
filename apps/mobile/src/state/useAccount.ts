import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Plan } from '../core/entitlements';
import { persistStorage, STORAGE_KEYS } from './storage';

export interface SimulatedDevice {
  id: string;
  name: string;
  kind: 'simulated' | 'pigeonx_emitter';
  pairedAt: number;
}

interface AccountState {
  /** Sandbox entitlements: real plan resolution lands with RevenueCat/Stripe. */
  plan: Plan;
  guest: boolean;
  email: string | null;
  /** Supabase auth user id once accounts go live. */
  userId: string | null;
  onboarded: boolean;
  devices: SimulatedDevice[];
  activeOrgId: string | null;

  setPlan: (plan: Plan) => void;
  continueAsGuest: () => void;
  setSession: (session: { userId: string; email: string | null } | null) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  addSimulatedDevice: (name?: string) => SimulatedDevice;
  removeDevice: (id: string) => void;
}

export const useAccount = create<AccountState>()(
  persist(
    (set, get) => ({
      plan: 'free',
      guest: true,
      email: null,
      userId: null,
      onboarded: false,
      devices: [],
      activeOrgId: null,

      setPlan: (plan) => set({ plan }),
      continueAsGuest: () => set({ guest: true, userId: null, email: null }),
      setSession: (session) =>
        set(
          session
            ? { userId: session.userId, email: session.email, guest: false }
            : { userId: null, email: null, guest: true }
        ),
      completeOnboarding: () => set({ onboarded: true }),
      resetOnboarding: () => set({ onboarded: false }),

      addSimulatedDevice: (name) => {
        const n = get().devices.length + 1;
        const device: SimulatedDevice = {
          id: `sim_${Date.now().toString(36)}`,
          name: name ?? `Simulated emitter ${n}`,
          kind: 'simulated',
          pairedAt: Date.now(),
        };
        set({ devices: [...get().devices, device] });
        return device;
      },
      removeDevice: (id) =>
        set({ devices: get().devices.filter((d) => d.id !== id) }),
    }),
    { name: STORAGE_KEYS.account, storage: persistStorage }
  )
);
