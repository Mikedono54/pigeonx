import { getEngine } from '../src/audio';
import { sessionRecorder, type RemoteSink } from '../src/services/sessionRecorder';
import { useAccount } from '../src/state/useAccount';
import { useHistory } from '../src/state/useHistory';
import { usePlacesHome } from '../src/state/usePlacesHome';
import { useProtectionPlans, type ProtectionPlan } from '../src/state/useProtectionPlans';
import { __rotationPending, formatCountdown, useSession } from '../src/state/useSession';

/**
 * Holding a session, and letting a plan refuse one.
 *
 * Pause closes the gate and holds every clock: the sound stops coming out,
 * the countdown stops counting and the rotation stops rotating, and the
 * engine keeps everything it built so letting go costs one step. Quiet hours,
 * the days and the dates are all reasons a Start says no and says why.
 */

const offlineSink: RemoteSink = {
  isAvailable: () => false,
  startSession: async () => null,
  endSession: async () => {},
  reportResult: async () => {},
};

let detach: (() => void) | null = null;

beforeAll(() => {
  sessionRecorder.setSink(offlineSink);
});

/** A Tuesday afternoon, well clear of any quiet hours a test sets. */
function anAfternoon(): void {
  jest.setSystemTime(new Date(2026, 7, 25, 14, 0, 0));
}

beforeEach(() => {
  jest.useFakeTimers();
  anAfternoon();
  useHistory.setState({ entries: [], queue: [] });
  usePlacesHome.setState({ places: [], activeId: null });
  useProtectionPlans.setState({ plans: [], activeByPlace: {} });
  useAccount.setState({ plan: 'pro' });
  useSession.setState({
    profileId: 'sys_pigeon_18k',
    output: 'phone',
    volume: 0.85,
    duration: null,
    engineState: 'idle',
    startedAt: null,
    currentEntryId: null,
    planId: null,
    planName: null,
    rotation: [],
    rotationAt: 0,
    paused: false,
    pausedAt: null,
    gapUntil: null,
    blocked: null,
    soundOverride: false,
  });
  detach = useSession.getState().attach();
});

afterEach(async () => {
  await useSession.getState().stop();
  detach?.();
  detach = null;
  jest.useRealTimers();
});

function plan(over: Partial<ProtectionPlan> = {}): ProtectionPlan {
  const place = usePlacesHome.getState().add({ name: 'Balcony', kind: 'balcony' });
  return useProtectionPlans.getState().upsert({
    placeId: place.id,
    name: 'Pigeon Rotation',
    target: 'pigeons',
    soundIds: ['sys_distress_pigeon', 'sys_predator_hawk'],
    randomizeOrder: false,
    intervalSeconds: 0,
    sessionMinutes: 15,
    output: 'phone',
    volume: 0.85,
    quietStart: null,
    quietEnd: null,
    days: [1, 2, 3, 4, 5, 6, 7],
    startsOn: null,
    endsOn: null,
    ...over,
  });
}

describe('a plan that will not start', () => {
  it('refuses inside quiet hours, and says which hours those are', async () => {
    jest.setSystemTime(new Date(2026, 7, 25, 23, 30, 0));
    const p = plan({ quietStart: '22:00', quietEnd: '07:00' });

    await useSession.getState().start({ plan: p });

    expect(useSession.getState().engineState).toBe('idle');
    expect(useSession.getState().blocked?.reason).toBe('quiet');
    expect(useSession.getState().blocked?.line).toBe(
      'Quiet hours. This plan stays silent between 10:00 PM and 7:00 AM.',
    );
    expect(useHistory.getState().entries).toHaveLength(0);
  });

  it('starts once the quiet hours are over', async () => {
    jest.setSystemTime(new Date(2026, 7, 25, 21, 0, 0));
    const p = plan({ quietStart: '22:00', quietEnd: '07:00' });

    await useSession.getState().start({ plan: p });

    expect(useSession.getState().engineState).toBe('running');
    expect(useSession.getState().blocked).toBeNull();
  });

  it('refuses on a day the plan does not run', async () => {
    // 30 August 2026 is a Sunday.
    jest.setSystemTime(new Date(2026, 7, 30, 10, 0, 0));
    const p = plan({ days: [1, 2, 3, 4, 5] });

    await useSession.getState().start({ plan: p });

    expect(useSession.getState().engineState).toBe('idle');
    expect(useSession.getState().blocked?.reason).toBe('days');
  });

  it('refuses outside the dates the plan covers', async () => {
    const p = plan({ startsOn: '2026-09-01' });

    await useSession.getState().start({ plan: p });

    expect(useSession.getState().blocked?.reason).toBe('dates');
  });

  it('lets a person put the refusal away', async () => {
    const p = plan({ startsOn: '2026-09-01' });
    await useSession.getState().start({ plan: p });

    useSession.getState().clearBlocked();
    expect(useSession.getState().blocked).toBeNull();
  });

  it('never refuses one sound played by hand, because that plan is not running', async () => {
    jest.setSystemTime(new Date(2026, 7, 25, 23, 30, 0));
    plan({ quietStart: '22:00', quietEnd: '07:00' });

    await useSession.getState().start();

    expect(useSession.getState().engineState).toBe('running');
    expect(useSession.getState().blocked).toBeNull();
  });
});

describe('the silence between two sounds', () => {
  it('waits out the interval before the next sound starts', async () => {
    const p = plan({ intervalSeconds: 20 });
    await useSession.getState().start({ plan: p });

    // Two sounds over fifteen minutes: seven and a half each.
    await jest.advanceTimersByTimeAsync(7.5 * 60_000 + 10);

    expect(useSession.getState().gapUntil).not.toBeNull();
    expect(useSession.getState().rotationAt).toBe(0);
    expect(getEngine().getState()).toBe('idle');
    // The silence is part of the session, not the end of it.
    expect(useSession.getState().currentEntryId).not.toBeNull();

    await jest.advanceTimersByTimeAsync(20_000 + 10);

    expect(useSession.getState().gapUntil).toBeNull();
    expect(useSession.getState().rotationAt).toBe(1);
    expect(useSession.getState().profileId).toBe('sys_predator_hawk');
    expect(getEngine().getState()).toBe('running');
  });

  it('goes straight from one sound to the next when the plan asks for no gap', async () => {
    const p = plan({ intervalSeconds: 0 });
    await useSession.getState().start({ plan: p });

    await jest.advanceTimersByTimeAsync(7.5 * 60_000 + 10);

    expect(useSession.getState().gapUntil).toBeNull();
    expect(useSession.getState().rotationAt).toBe(1);
    expect(getEngine().getState()).toBe('running');
  });

  it('counts the wait down the way the line reads it', () => {
    expect(formatCountdown(20_000)).toBe('0:20');
    expect(formatCountdown(65_000)).toBe('1:05');
    expect(formatCountdown(-5)).toBe('0:00');
  });
});

describe('holding a session', () => {
  it('closes the gate and stops the clock, and keeps the engine where it was', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });
    const startedAt = useSession.getState().startedAt;

    await jest.advanceTimersByTimeAsync(60_000);
    useSession.getState().pause();

    expect(useSession.getState().paused).toBe(true);
    expect(getEngine().isGateClosed()).toBe(true);
    // The sound is still loaded and the session is still open.
    expect(getEngine().getState()).toBe('running');
    expect(useSession.getState().currentEntryId).not.toBeNull();
    expect(__rotationPending()).toBe(false);
    expect(useSession.getState().startedAt).toBe(startedAt);
  });

  it('gives the countdown back the time it was held for', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });
    const startedAt = useSession.getState().startedAt!;

    await jest.advanceTimersByTimeAsync(60_000);
    useSession.getState().pause();
    await jest.advanceTimersByTimeAsync(30_000);
    useSession.getState().resume();

    expect(useSession.getState().paused).toBe(false);
    expect(getEngine().isGateClosed()).toBe(false);
    expect(useSession.getState().startedAt).toBe(startedAt + 30_000);
  });

  it('does not change sound while it is held', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });

    await jest.advanceTimersByTimeAsync(60_000);
    useSession.getState().pause();
    await jest.advanceTimersByTimeAsync(20 * 60_000);

    expect(useSession.getState().rotationAt).toBe(0);
    expect(useSession.getState().engineState).toBe('running');
  });

  it('picks the rotation back up where it left off', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });

    await jest.advanceTimersByTimeAsync(7 * 60_000);
    useSession.getState().pause();
    await jest.advanceTimersByTimeAsync(60 * 60_000);
    useSession.getState().resume();

    expect(useSession.getState().rotationAt).toBe(0);

    // Half a minute of the first sound's turn was left when it was held.
    await jest.advanceTimersByTimeAsync(30_000 + 10);
    expect(useSession.getState().rotationAt).toBe(1);
  });

  it('holds a single sound on its time limit too', async () => {
    useSession.setState({ duration: 15 });
    await useSession.getState().start();

    await jest.advanceTimersByTimeAsync(10 * 60_000);
    useSession.getState().pause();
    await jest.advanceTimersByTimeAsync(30 * 60_000);

    expect(useSession.getState().engineState).toBe('running');

    useSession.getState().resume();
    await jest.advanceTimersByTimeAsync(5 * 60_000 + 50);

    expect(useSession.getState().engineState).toBe('idle');
  });

  it('ignores a hold when nothing is playing, and a release when nothing is held', () => {
    useSession.getState().pause();
    expect(useSession.getState().paused).toBe(false);
    useSession.getState().resume();
    expect(useSession.getState().paused).toBe(false);
  });

  it('opens the gate again when the session ends', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });
    useSession.getState().pause();
    await useSession.getState().stop();

    expect(getEngine().isGateClosed()).toBe(false);
    expect(useSession.getState().paused).toBe(false);
  });
});

describe('what is still to come', () => {
  it('names the sounds left this time round', async () => {
    const p = plan({
      soundIds: ['sys_pigeon_18k', 'sys_pulse_16k', 'sys_sweep_15_19k'],
    });
    await useSession.getState().start({ plan: p });

    expect(useSession.getState().comingUp()).toEqual([
      'Unpredictable beeps',
      'Variable pitch sweep',
    ]);
  });

  it('names nothing once the last sound of the round is playing', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });
    await jest.advanceTimersByTimeAsync(7.5 * 60_000 + 10);

    expect(useSession.getState().comingUp()).toEqual([]);
    expect(useSession.getState().upNext()).toBe('Pigeon distress call');
  });

  it('names nothing at all when one sound is playing on its own', async () => {
    await useSession.getState().start();
    expect(useSession.getState().comingUp()).toEqual([]);
  });
});
