import { getEngine } from '../src/audio';
import { sessionRecorder, type RemoteSink } from '../src/services/sessionRecorder';
import { useAccount } from '../src/state/useAccount';
import { useHistory } from '../src/state/useHistory';
import { usePlacesHome } from '../src/state/usePlacesHome';
import { useProtectionPlans, type ProtectionPlan } from '../src/state/useProtectionPlans';
import { useSession } from '../src/state/useSession';

/**
 * A plan turning one Start into a rotation.
 *
 * The engine here is the mock one every engine test uses, so what is being
 * checked is the store's own bookkeeping: which sound is loaded, whether the
 * session survives a swap, and whether it ends when the plan says it does.
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

beforeEach(() => {
  jest.useFakeTimers();
  useHistory.setState({ entries: [], queue: [] });
  usePlacesHome.setState({ places: [], activeId: null });
  useProtectionPlans.setState({ plans: [], activeByPlace: {} });
  useAccount.setState({ plan: 'pro' });
  useSession.setState({
    profileId: 'sys_pigeon_18k',
    output: 'phone',
    duration: null,
    engineState: 'idle',
    startedAt: null,
    currentEntryId: null,
    planId: null,
    planName: null,
    rotation: [],
    rotationAt: 0,
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

describe('one Start, a rotation of sounds', () => {
  it('opens on the first sound of the plan, and says which plan is running', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });

    expect(useSession.getState().engineState).toBe('running');
    expect(useSession.getState().profileId).toBe('sys_distress_pigeon');
    expect(useSession.getState().planName).toBe('Pigeon Rotation');
    expect(useSession.getState().rotation).toEqual([
      'sys_distress_pigeon',
      'sys_predator_hawk',
    ]);
  });

  it('plays the list as written when the plan does not shuffle', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });
    expect(useSession.getState().rotation).toEqual(p.soundIds);
  });

  it('keeps every sound of a shuffled plan, and loses none of them', async () => {
    const p = plan({ randomizeOrder: true, soundIds: ['sys_pigeon_18k', 'sys_pulse_16k', 'sys_sweep_15_19k'] });
    await useSession.getState().start({ plan: p });

    expect([...useSession.getState().rotation].sort()).toEqual([...p.soundIds].sort());
  });

  it('says what is coming up next', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });

    expect(useSession.getState().upNext()).toBe('Red-tailed hawk scream');
  });

  it('says nothing is coming up when one sound is playing on its own', async () => {
    await useSession.getState().start();
    expect(useSession.getState().upNext()).toBeNull();
  });

  it('changes sound part way through without ending the session', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });
    const entryId = useSession.getState().currentEntryId;

    // Half the session: two sounds, fifteen minutes, so seven and a half each.
    await jest.advanceTimersByTimeAsync(7.5 * 60_000 + 10);

    expect(useSession.getState().rotationAt).toBe(1);
    expect(useSession.getState().profileId).toBe('sys_predator_hawk');
    expect(useSession.getState().currentEntryId).toBe(entryId);
    expect(useSession.getState().engineState).toBe('running');
  });

  it('comes back round to the first sound on a long enough session', async () => {
    const p = plan({ sessionMinutes: 30 });
    await useSession.getState().start({ plan: p });

    await jest.advanceTimersByTimeAsync(15 * 60_000 + 10);
    expect(useSession.getState().rotationAt).toBe(1);
    await jest.advanceTimersByTimeAsync(15 * 60_000 + 10);
    expect(useSession.getState().rotationAt).toBe(0);
  });

  it('stops when the plan says the session is over', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });

    await jest.advanceTimersByTimeAsync(15 * 60_000 + 50);

    expect(useSession.getState().engineState).toBe('idle');
    expect(useSession.getState().currentEntryId).toBeNull();
    expect(useSession.getState().rotation).toEqual([]);
  });

  it('writes one session for the whole rotation, not one for each sound', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });
    await jest.advanceTimersByTimeAsync(15 * 60_000 + 50);

    expect(useHistory.getState().entries).toHaveLength(1);
    expect(useHistory.getState().entries[0].planName).toBe('Pigeon Rotation');
    expect(useHistory.getState().entries[0].placeName).toBe('Balcony');
    expect(useHistory.getState().entries[0].endedAt).not.toBeNull();
  });

  it('leaves nothing ticking once it is stopped by hand', async () => {
    const p = plan();
    await useSession.getState().start({ plan: p });
    await useSession.getState().stop();

    expect(useSession.getState().engineState).toBe('idle');
    expect(useSession.getState().rotation).toEqual([]);
  });

  it('keeps the Free time limit over a longer plan', async () => {
    useAccount.setState({ plan: 'free' });
    const p = plan({ sessionMinutes: 60 });
    await useSession.getState().start({ plan: p });

    await jest.advanceTimersByTimeAsync(15 * 60_000 + 50);
    expect(useSession.getState().engineState).toBe('idle');
  });
});

describe('picking one sound by hand', () => {
  it('says so, so Home can offer the plan back instead of overruling either', () => {
    expect(useSession.getState().soundOverride).toBe(false);
    useSession.getState().setProfile('sys_gull_17k');
    expect(useSession.getState().soundOverride).toBe(true);

    useSession.getState().usePlanAgain();
    expect(useSession.getState().soundOverride).toBe(false);
  });

  it('runs one sound with no plan attached', async () => {
    await useSession.getState().start();

    expect(useSession.getState().planId).toBeNull();
    expect(useSession.getState().rotation).toEqual([]);
    expect(getEngine().getState()).toBe('running');
  });
});
