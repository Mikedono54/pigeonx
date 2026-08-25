import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { getEngine, type EngineState } from '../audio';
import { limit } from '../core/entitlements';
import { planBlock, type PlanBlock } from '../core/planWindow';
import { SPEAKER_LABEL, type AudioProfile, type OutputKind } from '../core/profiles';
import { rotationOrder, slotMs } from '../core/protectionPlans';
import { dismissRunningNotification, presentRunningNotification } from '../services/notifications';
import { sessionRecorder } from '../services/sessionRecorder';
import { persistStorage, STORAGE_KEYS } from './storage';
import { useAccount } from './useAccount';
import { useHistory, type SessionSource } from './useHistory';
import { usePlacesHome } from './usePlacesHome';
import { useProfiles } from './useProfiles';
import { useProtectionPlans, type ProtectionPlan } from './useProtectionPlans';

const KEEP_SCREEN_ON_TAG = 'pigeonx-play';

/** minutes. null means until you stop it. */
export type DurationChoice = 15 | 30 | 60 | null;

interface SessionState {
  profileId: string;
  output: OutputKind;
  volume: number;
  duration: DurationChoice;
  deviceId: string | null;
  /** what that speaker is called, so a warning can name it */
  deviceName: string | null;
  /** the area this phone plays into, when the business has areas */
  zoneId: string | null;
  zoneName: string | null;

  /**
   * True once somebody picked one sound by hand.
   *
   * A place with a protection plan plays that plan. Picking a single sound on
   * the Sounds screen says "not this time", and Home offers the plan back
   * rather than quietly overruling either choice.
   */
  soundOverride: boolean;

  engineState: EngineState;
  error: string | null;
  startedAt: number | null;
  /** the plan running this session, when a plan is running it */
  planId: string | null;
  planName: string | null;
  /** the sounds of this session, in the order they will play */
  rotation: string[];
  rotationAt: number;
  /**
   * The gate is closed and the clock is held.
   *
   * The engine keeps everything it built to make the sound, so letting go
   * starts again in one step instead of loading the whole thing twice.
   */
  paused: boolean;
  pausedAt: number | null;
  /** when the silence between two sounds of a rotation runs out */
  gapUntil: number | null;
  /** why the last Start refused, when it did */
  blocked: PlanBlock | null;
  /** set when a play stopped because the plan ran out of time */
  hitPlanCap: boolean;
  currentEntryId: string | null;
  notificationId: string | null;

  attach: () => () => void;
  setProfile: (id: string) => void;
  setOutput: (output: OutputKind, deviceId?: string | null, deviceName?: string | null) => void;
  setVolume: (v: number) => void;
  setDuration: (d: DurationChoice) => void;
  setArea: (zoneId: string | null, zoneName?: string | null) => void;
  setParam: (key: string, value: number) => void;
  /** Puts the place's plan back in charge of what plays. */
  usePlanAgain: () => void;
  /** The sound after this one in the rotation, by name. */
  upNext: () => string | null;
  /** The sounds still to come this time round, in order, by name. */
  comingUp: () => string[];
  start: (opts?: {
    profileId?: string;
    source?: SessionSource;
    /** run this plan instead of one sound */
    plan?: ProtectionPlan | null;
  }) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  clearError: () => void;
  clearBlocked: () => void;
  /** time limit in ms for this plan and choice. null means no limit. */
  effectiveCapMs: () => number | null;
  isRunning: () => boolean;
}

let detach: (() => void) | null = null;

/**
 * What one rotation is doing, and when it changes next.
 *
 * It lives outside the store because it belongs to one run rather than to
 * state a screen renders, and because pausing has to move its deadlines
 * without a re-render for every one of them. `clearRotation()` is safe to
 * call at any point.
 */
interface RotationCtx {
  order: string[];
  /** how long each sound gets, in milliseconds */
  slot: number;
  /** the silence between two sounds, in milliseconds */
  gap: number;
  /** when the whole session ends. null means it runs until somebody stops it. */
  sessionEndsAt: number | null;
  /** when the phase we are in now runs out */
  phaseEndsAt: number;
  phase: 'sound' | 'gap';
}

let ctx: RotationCtx | null = null;
let phaseTimer: ReturnType<typeof setTimeout> | null = null;
let sessionTimer: ReturnType<typeof setTimeout> | null = null;
let swapping = false;

function clearTimers(): void {
  if (phaseTimer) clearTimeout(phaseTimer);
  if (sessionTimer) clearTimeout(sessionTimer);
  phaseTimer = null;
  sessionTimer = null;
}

function clearRotation(): void {
  clearTimers();
  ctx = null;
  swapping = false;
}

/** Test seam: what a rotation is waiting on right now. */
export function __rotationPending(): boolean {
  return phaseTimer !== null || sessionTimer !== null;
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      profileId: useProfiles.getState().lastUsedId,
      output: 'phone',
      volume: 0.85,
      duration: 15,
      deviceId: null,
      deviceName: null,
      zoneId: null,
      zoneName: null,
      soundOverride: false,

      engineState: 'idle',
      error: null,
      startedAt: null,
      planId: null,
      planName: null,
      rotation: [],
      rotationAt: 0,
      paused: false,
      pausedAt: null,
      gapUntil: null,
      blocked: null,
      hitPlanCap: false,
      currentEntryId: null,
      notificationId: null,

      attach: () => {
        if (detach) return detach;
        const engine = getEngine();
        const off = engine.onStateChange((e) => {
          set({
            engineState: e.state,
            error: e.state === 'error' ? (e.error ?? "That didn't work. Try again.") : null,
          });
          // A rotation stops the engine on purpose between sounds. That idle is
          // ours, not the end of the session.
          if (e.state === 'idle' && get().currentEntryId && !swapping) {
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
        set({ profileId: id, soundOverride: true });
        useProfiles.getState().setLastUsed(id);
      },

      usePlanAgain: () => set({ soundOverride: false }),

      upNext: () => {
        const { rotation, rotationAt } = get();
        if (rotation.length < 2) return null;
        const next = rotation[(rotationAt + 1) % rotation.length];
        return useProfiles.getState().byId(next)?.name ?? null;
      },

      comingUp: () => {
        const { rotation, rotationAt } = get();
        if (rotation.length < 2) return [];
        const byId = useProfiles.getState().byId;
        return rotation
          .slice(rotationAt + 1)
          .map((id) => byId(id)?.name)
          .filter((name): name is string => !!name);
      },

      setOutput: (output, deviceId, deviceName) =>
        set({
          output,
          deviceId: deviceId ?? null,
          deviceName: deviceId ? (deviceName ?? get().deviceName) : null,
        }),

      setVolume: (v) => {
        set({ volume: v });
        // While the gate is closed the engine holds the number and plays none
        // of it, so a slider moved during a pause is still silent.
        getEngine().setVolume(v);
      },
      setDuration: (d) => set({ duration: d }),
      setArea: (zoneId, zoneName) => set({ zoneId, zoneName: zoneName ?? null }),
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
        if (get().engineState === 'running') return;

        // A plan turns one Start into a rotation. Everything below runs the
        // same either way; the plan only decides what the list of sounds is
        // and how long the whole thing lasts.
        const plan = opts?.plan ?? null;

        // Quiet hours, the days it runs and the dates it covers are all things
        // a person set on purpose. A Start inside any of them refuses and says
        // which one, rather than playing over the top of the instruction.
        if (plan) {
          const why = planBlock(plan, new Date());
          if (why) {
            set({ blocked: why });
            return;
          }
        }

        const order = plan
          ? rotationOrder(plan.soundIds, plan.randomizeOrder).filter((id) =>
              useProfiles.getState().byId(id),
            )
          : [];
        const profileId = plan ? (order[0] ?? get().profileId) : (opts?.profileId ?? get().profileId);
        const profile = useProfiles.getState().byId(profileId);
        if (!profile) {
          set({ error: 'That sound is gone. Pick another one.' });
          return;
        }

        set({
          error: null,
          blocked: null,
          hitPlanCap: false,
          paused: false,
          pausedAt: null,
          gapUntil: null,
          profileId,
          planId: plan?.id ?? null,
          planName: plan?.name ?? null,
          rotation: plan ? order : [],
          rotationAt: 0,
        });
        useProfiles.getState().setLastUsed(profileId);

        try {
          await engine.load(profile);
        } catch {
          return; // the engine already surfaced the error through onStateChange
        }

        const capMs = get().effectiveCapMs();
        // A rotation is stopped by this store, not by the engine, because the
        // engine only knows about the sound it is playing right now.
        const sessionMs = plan
          ? Math.min(capMs ?? Infinity, plan.sessionMinutes * 60_000)
          : capMs;

        engine.setGateClosed(false);
        engine.setVolume(get().volume);
        engine.setDurationLimitMs(plan ? null : capMs);
        await engine.start(get().output);

        if (engine.getState() !== 'running') return;

        const place = usePlacesHome.getState().active();
        const entry = await sessionRecorder.start({
          profile,
          output: get().output,
          source: opts?.source ?? 'manual',
          zoneId: get().zoneId,
          deviceId: get().deviceId,
          placeId: place?.id ?? null,
          placeName: place?.name ?? null,
          planId: plan?.id ?? null,
          planName: plan?.name ?? null,
        });

        const notificationId = await presentRunningNotification({
          profileName: plan?.name ?? profile.name,
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

        if (plan && order.length > 0) {
          armRotation(order, plan, sessionMs);
        }
      },

      pause: () => {
        const s = get();
        if (s.engineState !== 'running' || s.paused) return;
        const engine = getEngine();
        engine.setGateClosed(true);
        engine.holdAutoStop();
        clearTimers();
        set({ paused: true, pausedAt: Date.now() });
      },

      resume: () => {
        const s = get();
        if (!s.paused || s.pausedAt === null) return;
        const held = Date.now() - s.pausedAt;
        const engine = getEngine();
        engine.setGateClosed(false);
        engine.releaseAutoStop();

        if (ctx) {
          ctx.phaseEndsAt += held;
          if (ctx.sessionEndsAt !== null) ctx.sessionEndsAt += held;
        }

        set({
          paused: false,
          pausedAt: null,
          startedAt: s.startedAt === null ? null : s.startedAt + held,
          gapUntil: s.gapUntil === null ? null : s.gapUntil + held,
        });
        armTimers();
      },

      stop: async () => {
        clearRotation();
        await getEngine().stop();
        await finalise(set, get, false);
      },

      clearError: () => set({ error: null }),
      clearBlocked: () => set({ blocked: null }),
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
        deviceName: s.deviceName,
        zoneId: s.zoneId,
        zoneName: s.zoneName,
        soundOverride: s.soundOverride,
      }),
    },
  ),
);

/**
 * Sets the clocks a rotation runs on: one for the phase it is in now, and one
 * for the whole session.
 */
function armRotation(order: string[], plan: ProtectionPlan, sessionMs: number | null): void {
  clearRotation();
  const slot = slotMs(plan.sessionMinutes, order.length);
  const gap = Math.max(0, plan.intervalSeconds) * 1000;

  ctx = {
    order,
    slot,
    gap,
    sessionEndsAt:
      sessionMs !== null && Number.isFinite(sessionMs) ? Date.now() + sessionMs : null,
    phaseEndsAt: Date.now() + slot,
    phase: 'sound',
  };
  armTimers();
}

/** Hangs both timers off the deadlines already in the context. */
function armTimers(): void {
  clearTimers();
  if (!ctx) return;
  const now = Date.now();

  if (ctx.sessionEndsAt !== null) {
    sessionTimer = setTimeout(
      () => {
        sessionTimer = null;
        void useSession.getState().stop();
      },
      Math.max(0, ctx.sessionEndsAt - now),
    );
  }

  // One sound alone has nothing to change to. The session clock still runs.
  if (ctx.order.length < 2) return;
  phaseTimer = setTimeout(
    () => {
      phaseTimer = null;
      void nextPhase();
    },
    Math.max(0, ctx.phaseEndsAt - now),
  );
}

/**
 * Moves the rotation on: into the silence between two sounds, or into the
 * next sound itself.
 *
 * A plan with no interval has no silence, and goes straight from one sound to
 * the next. `swapping` stays true for the whole of a gap, so the engine going
 * idle in the middle of one is never read as the session ending.
 */
async function nextPhase(): Promise<void> {
  if (!ctx) return;

  if (ctx.phase === 'sound' && ctx.gap > 0) {
    swapping = true;
    await getEngine().stop();
    if (!ctx) return;
    ctx.phase = 'gap';
    ctx.phaseEndsAt = Date.now() + ctx.gap;
    useSession.setState({ gapUntil: ctx.phaseEndsAt });
    armTimers();
    return;
  }

  swapping = true;
  try {
    await advance();
  } finally {
    swapping = false;
  }
  if (!ctx) return;
  ctx.phase = 'sound';
  ctx.phaseEndsAt = Date.now() + ctx.slot;
  useSession.setState({ gapUntil: null });
  armTimers();
}

/** Swaps to the next sound in the rotation without ending the session. */
async function advance(): Promise<void> {
  const store = useSession.getState();
  const { rotation, rotationAt, currentEntryId } = store;
  if (!currentEntryId || rotation.length < 2) return;

  const at = (rotationAt + 1) % rotation.length;
  const profile = useProfiles.getState().byId(rotation[at]);
  if (!profile) return;

  const engine = getEngine();
  try {
    await engine.stop();
    await engine.load(profile);
    engine.setVolume(store.volume);
    engine.setDurationLimitMs(null);
    await engine.start(store.output);
    useSession.setState({ rotationAt: at, profileId: profile.id });
  } catch {
    // The sound would not load or would not start. The engine has already
    // said so, and the session ends the way any failed run ends.
  }
}

async function finalise(
  set: (patch: Partial<SessionState>) => void,
  get: () => SessionState,
  hitCap: boolean,
): Promise<void> {
  const { currentEntryId, notificationId } = get();
  clearRotation();
  getEngine().setGateClosed(false);
  set({
    startedAt: null,
    currentEntryId: null,
    notificationId: null,
    hitPlanCap: hitCap,
    planId: null,
    planName: null,
    rotation: [],
    rotationAt: 0,
    paused: false,
    pausedAt: null,
    gapUntil: null,
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

/** "0:20", the way the line about the next sound counts down. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function currentProfile(): AudioProfile | undefined {
  return useProfiles.getState().byId(useSession.getState().profileId);
}

export function todaySessionCount(): number {
  return useHistory.getState().todayCount();
}
