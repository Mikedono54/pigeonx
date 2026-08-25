import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Plan } from '../core/entitlements';
import { somethingChanged } from '../services/syncSignal';
import { persistStorage, STORAGE_KEYS, uid } from './storage';

export type SpeakerKind = 'simulated' | 'pigeonx_emitter' | 'bt_speaker';

export interface SimulatedDevice {
  id: string;
  name: string;
  kind: SpeakerKind;
  pairedAt: number;
  /** last time this row changed, for last write wins */
  updatedAt: number;
  /** the id the server gave this speaker, once it has one */
  remoteId: string | null;
}

/** What a teammate is allowed to do. */
export type TeamRole = 'owner' | 'manager' | 'staff';

interface AccountState {
  /** Test plan for now. Real plans arrive with RevenueCat or Stripe. */
  plan: Plan;
  guest: boolean;
  email: string | null;
  /** Sign-in user id once accounts go live. */
  userId: string | null;
  onboarded: boolean;
  /**
   * True once we have put the questions about a place to this person, however
   * they answered, including by walking away. We ask once.
   */
  placeAsked: boolean;
  devices: SimulatedDevice[];
  activeOrgId: string | null;
  activeOrgName: string | null;
  activeOrgRole: TeamRole | null;

  setPlan: (plan: Plan) => void;
  continueAsGuest: () => void;
  setSession: (session: { userId: string; email: string | null } | null) => void;
  setBusiness: (org: { id: string; name: string; role: TeamRole } | null) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  markPlaceAsked: () => void;
  addSimulatedDevice: (name?: string, kind?: SpeakerKind) => SimulatedDevice;
  renameDevice: (id: string, name: string) => void;
  removeDevice: (id: string) => void;
  setDevices: (devices: SimulatedDevice[]) => void;
  markDeviceSynced: (id: string, remoteId: string | null) => void;
  isSignedIn: () => boolean;
}

export const useAccount = create<AccountState>()(
  persist(
    (set, get) => ({
      plan: 'free',
      guest: true,
      email: null,
      userId: null,
      onboarded: false,
      placeAsked: false,
      devices: [],
      activeOrgId: null,
      activeOrgName: null,
      activeOrgRole: null,

      setPlan: (plan) => set({ plan }),
      continueAsGuest: () => set({ guest: true, userId: null, email: null }),
      setSession: (session) =>
        set(
          session
            ? { userId: session.userId, email: session.email, guest: false }
            : {
                userId: null,
                email: null,
                guest: true,
                activeOrgId: null,
                activeOrgName: null,
                activeOrgRole: null,
              },
        ),
      setBusiness: (org) =>
        set(
          org
            ? {
                activeOrgId: org.id,
                activeOrgName: org.name,
                activeOrgRole: org.role,
              }
            : { activeOrgId: null, activeOrgName: null, activeOrgRole: null },
        ),
      completeOnboarding: () => set({ onboarded: true }),
      resetOnboarding: () => set({ onboarded: false, placeAsked: false }),
      markPlaceAsked: () => set({ placeAsked: true }),

      addSimulatedDevice: (name, kind = 'simulated') => {
        const n = get().devices.length + 1;
        const device: SimulatedDevice = {
          id: uid('spk'),
          name: name ?? `Test speaker ${n}`,
          kind,
          pairedAt: Date.now(),
          updatedAt: Date.now(),
          remoteId: null,
        };
        set({ devices: [...get().devices, device] });
        somethingChanged('speaker');
        return device;
      },
      renameDevice: (id, name) => {
        set({
          devices: get().devices.map((d) =>
            d.id === id ? { ...d, name, updatedAt: Date.now() } : d,
          ),
        });
        somethingChanged('speaker');
      },
      removeDevice: (id) => {
        set({ devices: get().devices.filter((d) => d.id !== id) });
        somethingChanged('speaker');
      },
      setDevices: (devices) => set({ devices }),
      markDeviceSynced: (id, remoteId) =>
        set({
          devices: get().devices.map((d) => (d.id === id ? { ...d, remoteId } : d)),
        }),
      isSignedIn: () => get().userId !== null,
    }),
    {
      name: STORAGE_KEYS.account,
      storage: persistStorage,
      version: 3,
      migrate: (state) => {
        const s = state as Partial<AccountState> | undefined;
        if (!s) return state as AccountState;
        return {
          ...s,
          // Somebody who has been using the app already is not walked through
          // a setup flow they did not ask for. Their place is already there.
          placeAsked: s.placeAsked ?? s.onboarded ?? false,
          devices: (s.devices ?? []).map((d) => ({
            ...d,
            updatedAt: d.updatedAt ?? d.pairedAt ?? Date.now(),
            remoteId: d.remoteId ?? null,
          })),
        } as AccountState;
      },
    },
  ),
);
