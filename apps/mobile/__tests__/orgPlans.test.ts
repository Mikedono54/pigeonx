import { orgPlanFromRow, orgPlanToRow } from '../src/services/orgPlansRemote';
import { setBuiltInSoundIds } from '../src/services/soundIds';
import { historyRowToEntry, mergeHistory } from '../src/services/sync';
import { filterTimeline, itemWhere } from '../src/core/timeline';
import { useAccount } from '../src/state/useAccount';
import { useHistory } from '../src/state/useHistory';
import { useOrgPlans } from '../src/state/useOrgPlans';

const PIGEON = 'aaaaaaaa-0000-0000-0000-000000000001';
const HAWK = 'aaaaaaaa-0000-0000-0000-000000000002';

beforeEach(() => {
  setBuiltInSoundIds([
    ['sys_pigeon_18k', PIGEON],
    ['sys_predator_hawk', HAWK],
  ]);
  useOrgPlans.getState().reset();
  useAccount.setState({ activeOrgId: 'org_1', activeOrgRole: 'manager' });
});

describe('a plan a business keeps', () => {
  const row = {
    id: 'plan_1',
    zone_id: 'zone_1',
    name: 'Roof Rotation',
    target: 'pigeons',
    sound_ids: [PIGEON, HAWK],
    randomize_order: true,
    interval_seconds: 20,
    session_minutes: 30,
    output: 'pigeonx_emitter',
    volume: 0.7,
    quiet_start: '22:00:00',
    quiet_end: '07:00:00',
    days: [1, 2, 3, 4, 5],
    starts_on: '2026-09-01',
    ends_on: null,
  };

  it('reads as the sounds this phone knows, in the order they were saved', () => {
    const plan = orgPlanFromRow(row);
    expect(plan.id).toBe('plan_1');
    expect(plan.zoneId).toBe('zone_1');
    expect(plan.soundIds).toEqual(['sys_pigeon_18k', 'sys_predator_hawk']);
    expect(plan.sessionMinutes).toBe(30);
    expect(plan.quietStart).toBe('22:00');
    expect(plan.output).toBe('pigeonx_emitter');
  });

  it('drops a sound this phone has never heard of rather than showing an id', () => {
    const plan = orgPlanFromRow({ ...row, sound_ids: [PIGEON, 'something-else'] });
    expect(plan.soundIds).toEqual(['sys_pigeon_18k']);
  });

  it('falls back on the safest answer for anything it cannot read', () => {
    const plan = orgPlanFromRow({ id: 'plan_2' });
    expect(plan.target).toBe('unsure');
    expect(plan.output).toBe('phone');
    expect(plan.sessionMinutes).toBe(15);
    expect(plan.quietStart).toBeNull();
    expect(plan.days).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('goes back up owned by the business and by nobody else', () => {
    const payload = orgPlanToRow('org_1', orgPlanFromRow(row));
    expect(payload.owner_org_id).toBe('org_1');
    expect(payload.owner_user_id).toBeNull();
    expect(payload.user_place_id).toBeNull();
    expect(payload.zone_id).toBe('zone_1');
    expect(payload.sound_ids).toEqual([PIGEON, HAWK]);
    expect(payload.quiet_start).toBe('22:00:00');
  });

  it('comes back the same after a round trip', () => {
    const before = orgPlanFromRow(row);
    const after = orgPlanFromRow({ id: 'plan_1', ...orgPlanToRow('org_1', before) });
    expect(after).toEqual(before);
  });
});

describe('who may change a plan a business keeps', () => {
  it('lets a manager and an owner write one', () => {
    useAccount.setState({ activeOrgRole: 'manager' });
    expect(useOrgPlans.getState().mayEdit()).toBe(true);
    useAccount.setState({ activeOrgRole: 'owner' });
    expect(useOrgPlans.getState().mayEdit()).toBe(true);
  });

  it('refuses a teammate before it ever reaches the account', async () => {
    useAccount.setState({ activeOrgRole: 'staff' });
    const store = useOrgPlans.getState();
    expect(store.mayEdit()).toBe(false);

    for (const result of [
      await store.save({
        zoneId: 'zone_1',
        name: 'Roof Rotation',
        target: 'pigeons',
        soundIds: ['sys_pigeon_18k'],
        randomizeOrder: true,
        intervalSeconds: 0,
        sessionMinutes: 15,
        output: 'phone',
        volume: 0.85,
        quietStart: null,
        quietEnd: null,
        days: [1, 2, 3, 4, 5, 6, 7],
        startsOn: null,
        endsOn: null,
      }),
      await store.attach('plan_1', 'zone_1'),
      await store.remove('plan_1'),
    ]) {
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Managers can do this. Ask one of yours.');
    }

    // and nothing was written
    expect(useOrgPlans.getState().plans).toEqual([]);
  });

  it('refuses somebody on no team at all', () => {
    useAccount.setState({ activeOrgRole: null });
    expect(useOrgPlans.getState().mayEdit()).toBe(false);
  });

  it('offers an area the plan its building answered for', () => {
    const draft = useOrgPlans.getState().draftFor('zone_1', 'gulls', 'phone', false);
    expect(draft.zoneId).toBe('zone_1');
    expect(draft.target).toBe('gulls');
    expect(draft.name).toBe('Gull Rotation');

    const quiet = useOrgPlans.getState().draftFor('zone_1', 'gulls', 'phone', true);
    expect(quiet.name).toBe('Quiet Gull Plan');
  });
});

describe('what played, across every building', () => {
  const row = {
    id: 'ses_9',
    started_at: '2026-08-25T08:14:00Z',
    ended_at: '2026-08-25T08:29:00Z',
    profile_name: 'High-frequency deterrent',
    plan_name: 'Roof Rotation',
    zone_id: 'zone_1',
    zone_name: 'Roof',
    location_id: 'loc_1',
    location_name: 'Main Street Hotel',
    user_id: 'someone-else',
    result: 'left',
  };

  it('names the building and the part of it', () => {
    const entry = historyRowToEntry(row, () => 'A sound');
    expect(entry.locationId).toBe('loc_1');
    expect(itemWhere(entry)).toBe('Main Street Hotel · Roof');
  });

  it('filters down to one building', () => {
    const here = historyRowToEntry(row, () => 'A sound');
    const elsewhere = historyRowToEntry(
      { ...row, id: 'ses_10', location_id: 'loc_2', location_name: 'Dock' },
      () => 'A sound',
    );

    expect(filterTimeline([here, elsewhere], { locationId: 'loc_1' }).map((e) => e.id)).toEqual([
      here.id,
    ]);
    expect(filterTimeline([here, elsewhere], {})).toHaveLength(2);
  });

  it('never asks this phone about a session somebody else ran', () => {
    useHistory.setState({
      entries: mergeHistory([], [historyRowToEntry(row, () => 'A sound')]),
      queue: [],
    });
    expect(useHistory.getState().pendingResult()).toBeUndefined();
  });

  it('still shows what that person said about it', () => {
    expect(historyRowToEntry(row, () => 'A sound').result).toBe('left');
  });
});
