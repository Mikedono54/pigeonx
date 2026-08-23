import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { getEngine, type EngineState } from '../audio';
import { limit } from '../core/entitlements';
import {
  SPEAKER_LABEL,
  type AudioProfile,
  type OutputKind,
} from '../core/profiles';
import {
  dismissRunningNotification,
  presentRunningNotification,
} from '../services/notifications';
import { sessionRecorder } from '../services/sessionRecorder';
import { persistStorage, STORAGE_KEYS } from './storage';
import { useAccount } from './useAccount';
import { useHistory, type SessionSource } from './useHistory';
import { useProfiles } from './useProfiles';

const KEEP_SCREEN_ON_TAG = 'pigeonx-play';

/** minutes. null means until you stop it. */
export type DurationChoice = 15 | 30 | 60 | null;

interface SessionState {
  profileId: string;
  output: OutputKind;
  volume: number;
  duration: DurationChoice;
  deviceId: string | null;
  /** the area this phone plays into, when the business has areas */
  zoneId: string | null;
  zoneName: string | null;

  engineState: EngineState;
  error: string | null;
  startedAt: number | null;
  /** set when a play stopped because the plan ran out of time */
  hitPlanCap: boolean;
  currentEntryId: string | null;
  notificationId: string | null;

  attach: () => () => void;
  setProfile: (id: string) => void;
  setOutput: (output: OutputKind, deviceId?: string | null) => void;
  setVolume: (v: number) => void;
  setDuration: (d: DurationChoice) => void;
  setArea: (zoneId: string | null, zoneName?: string | null) => void;
  setParam: (key: string, value: number) => void;
  start: (opts?: {
    profileId?: string;
    source?: SessionSource;
  }) => Promise<void>;
  stop: () => Promise<void>;
  clearError: () => void;
  /** time limit in ms for this plan and choice. null means no limit. */
  effectiveCapMs: () => number | null;
  isRunning: () => boolean;
}

let detach: (() => void) | null = null;

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      profileId: useProfiles.getState().lastUsedId,
      output: 'phone',
      volume: 0.85,
      duration: 15,
      deviceId: null,
      zoneId: null,
      zoneName: null,

      engineState: 'idle',
      error: null,
      startedAt: null,
      hitPlanCap: false,
      currentEntryId: null,
      notificationId: null,

      attach: () => {
        if (detach) return detach;
        const engine = getEngine();
        const off = engine.onStateChange((e) => {
          set({
            engineState: e.state,
            error:
              e.state === 'error'
                ? (e.error ?? "That didn't work. Try again.")
                : null,
          });
          if (e.state === 'idle' && get().currentEntryId) {
            // the engine ended the run itself (duration cap or interruption)
            void finalise(set, get, e.autoStopped === true);
          }
          if (e.state === 'error' && get().currentEntryId) {
            void finalise(set, get, false);
          }
        });
        detach = () => {
          off();
          detach = null;
        };
        return detach;
      },

      setProfile: (id) => {
        set({ profileId: id });
        useProfiles.getState().setLastUsed(id);
      },
      setOutput: (output, deviceId) =>
        set({ output, deviceId: deviceId ?? null }),
      setVolume: (v) => {
        set({ volume: v });
        getEngine().setVolume(v);
      },
      setDuration: (d) => set({ duration: d }),
      setArea: (zoneId, zoneName) =>
        set({ zoneId, zoneName: zoneName ?? null }),
      setParam: (key, value) => {
        getEngine().setParam(key, value);
      },

      effectiveCapMs: () => {
        const plan = useAccount.getState().plan;
        const planCap = limit(plan, 'sessionMinutes');
        const chosen = get().duration;
        const mins =
          planCap == null && chosen == null
            ? null
            : Math.min(planCap ?? Infinity, chosen ?? Infinity);
        return mins == null || !Number.isFinite(mins) ? null : mins * 60_000;
      },

      isRunning: () => get().engineState === 'running',

      start: async (opts) => {
        const engine = getEngine();
        const profileId = opts?.profileId ?? get().profileId;
        const profile = useProfiles.getState().byId(profileId);
        if (!profile) {
          set({ error: 'That sound is gone. Pick another one.' });
          return;
        }
        if (get().engineState === 'running') return;

        set({ error: null, hitPlanCap: false, profileId });
        useProfiles.getState().setLastUsed(profileId);

        try {
          await engine.load(profile);
        } catch {
          return; // the engine already surfaced the error through onStateChange
        }

        engine.setVolume(get().volume);
        engine.setDurationLimitMs(get().effectiveCapMs());
        await engine.start(get().output);

        if (engine.getState() !== 'running') return;

        const entry = await sessionRecorder.start({
          profile,
          output: get().output,
          source: opts?.source ?? 'manual',
          zoneId: get().zoneId,
          deviceId: get().deviceId,
        });

        const notificationId = await presentRunningNotification({
          profileName: profile.name,
          outputLabel: SPEAKER_LABEL[get().output],
        });

        try {
          await activateKeepAwakeAsync(KEEP_SCREEN_ON_TAG);
        } catch {
          // the screen may sleep. The sound keeps playing in the background.
        }

        set({
          startedAt: engine.getStartedAt() ?? Date.now(),
          currentEntryId: entry.id,
          notificationId,
        });
      },

      stop: async () => {
        await getEngine().stop();
        await finalise(set, get, false);
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: STORAGE_KEYS.session,
      storage: persistStorage,
      partialize: (s) => ({
        profileId: s.profileId,
        output: s.output,
        volume: s.volume,
        duration: s.duration,
        deviceId: s.deviceId,
        zoneId: s.zoneId,
        zoneName: s.zoneName,
      }),
    }
  )
);

async function finalise(
  set: (patch: Partial<SessionState>) => void,
  get: () => SessionState,
  hitCap: boolean
): Promise<void> {
  const { currentEntryId, notificationId } = get();
  set({
    startedAt: null,
    currentEntryId: null,
    notificationId: null,
    hitPlanCap: hitCap,
  });

  if (currentEntryId) await sessionRecorder.end(currentEntryId);
  await dismissRunningNotification(notificationId);
  try {
    deactivateKeepAwake(KEEP_SCREEN_ON_TAG);
  } catch {
    // we never asked to keep the screen on
  }
}

/** Helper for screens: mm:ss while a sound plays. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function currentProfile(): AudioProfile | undefined {
  return useProfiles.getState().byId(useSession.getState().profileId);
}

export function todaySessionCount(): number {
  return useHistory.getState().todayCount();
}
