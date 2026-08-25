import {
  scheduleFromRow,
  scheduleToRow,
  type ScheduleLookups,
  type ScheduleRow,
} from '../src/services/sync';
import { localPlanId, remotePlanId } from '../src/services/soundIds';
import { SCHEDULE_DEFAULTS, type Schedule } from '../src/state/useSchedules';
import { useProtectionPlans } from '../src/state/useProtectionPlans';

/**
 * The columns both schedule tables hold, out of the account and back into it.
 *
 * The trigger, the offset, the plan and the quiet hours were on this phone
 * only for one release, and a schedule that loses its sunrise on the way up
 * runs at midnight instead. So both directions are pinned here.
 */

const SOUND = { id: 'sys_pigeon_18k', name: 'High-frequency deterrent' };
const PLAN_UUID = '11111111-2222-3333-4444-555555555555';

const lookups: ScheduleLookups = {
  soundFor: () => SOUND,
  planFor: (id) => (id === PLAN_UUID ? { id: PLAN_UUID, name: 'Roof Rotation' } : null),
};

function aRow(over: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id: 'row_1',
    zone_id: 'zone_1',
    profile_id: 'sound_1',
    days: [1, 2, 3, 4, 5],
    start_time: '06:30:00',
    end_time: '09:00:00',
    enabled: true,
    executor: 'reminder',
    trigger: 'sunrise',
    offset_minutes: -30,
    plan_id: PLAN_UUID,
    quiet_start: '22:00:00',
    quiet_end: '07:00:00',
    updated_at: '2026-08-24T10:00:00Z',
    ...over,
  };
}

function aSchedule(over: Partial<Schedule> = {}): Schedule {
  return {
    ...SCHEDULE_DEFAULTS,
    id: 'sch_1',
    name: 'Roof Rotation',
    profileId: 'sys_pigeon_18k',
    profileName: 'High-frequency deterrent',
    days: [1, 2, 3, 4, 5],
    startMinutes: 6 * 60 + 30,
    endMinutes: 9 * 60,
    enabled: true,
    executor: 'reminder',
    trigger: 'sunrise',
    offsetMinutes: -30,
    planId: PLAN_UUID,
    planName: 'Roof Rotation',
    quietStart: '22:00',
    quietEnd: '07:00',
    zoneId: 'zone_1',
    deviceId: null,
    notificationIds: [],
    updatedAt: 0,
    remoteId: 'row_1',
    ...over,
  };
}

beforeEach(() => {
  useProtectionPlans.setState({ plans: [], activeByPlace: {} });
});

describe('a schedule row coming down', () => {
  it('carries the sun, the offset, the plan and the quiet hours', () => {
    const s = scheduleFromRow(aRow(), undefined, lookups);

    expect(s.trigger).toBe('sunrise');
    expect(s.offsetMinutes).toBe(-30);
    expect(s.planId).toBe(PLAN_UUID);
    expect(s.planName).toBe('Roof Rotation');
    expect(s.quietStart).toBe('22:00');
    expect(s.quietEnd).toBe('07:00');
    expect(s.startMinutes).toBe(6 * 60 + 30);
    expect(s.zoneId).toBe('zone_1');
  });

  it('names a run after the plan it runs, and the sound when it runs one', () => {
    expect(scheduleFromRow(aRow(), undefined, lookups).name).toBe('Roof Rotation');
    expect(scheduleFromRow(aRow({ plan_id: null }), undefined, lookups).name).toBe(
      'High-frequency deterrent',
    );
  });

  it('keeps what the phone knew when the account has nothing in the column', () => {
    const known = aSchedule({ trigger: 'sunset', offsetMinutes: 15, quietStart: '21:00' });
    const bare = aRow({
      trigger: null,
      offset_minutes: null,
      plan_id: null,
      quiet_start: null,
      quiet_end: null,
    });

    const s = scheduleFromRow(bare, known, lookups);
    expect(s.trigger).toBe('sunset');
    expect(s.offsetMinutes).toBe(15);
    expect(s.planId).toBe(PLAN_UUID);
    expect(s.quietStart).toBe('21:00');
  });

  it('refuses a trigger the phone has no word for', () => {
    expect(scheduleFromRow(aRow({ trigger: 'moonrise' }), undefined, lookups).trigger).toBe('time');
  });

  it('keeps a place the account cannot hold yet', () => {
    const mine = aSchedule({ placeId: 'plh_1', placeName: 'Back balcony' });
    const s = scheduleFromRow(aRow(), mine, lookups);
    expect(s.placeName).toBe('Back balcony');
  });
});

describe('a schedule going back up', () => {
  it('writes every column the account has for it', () => {
    expect(scheduleToRow(aSchedule(), 'sound_1', PLAN_UUID)).toEqual({
      id: 'row_1',
      zone_id: 'zone_1',
      profile_id: 'sound_1',
      days: [1, 2, 3, 4, 5],
      start_time: '06:30:00',
      end_time: '09:00:00',
      enabled: true,
      executor: 'reminder',
      trigger: 'sunrise',
      offset_minutes: -30,
      plan_id: PLAN_UUID,
      quiet_start: '22:00:00',
      quiet_end: '07:00:00',
    });
  });

  it('says nothing about quiet hours a run does not have', () => {
    const row = scheduleToRow(aSchedule({ quietStart: null, quietEnd: null }), 'sound_1', null);
    expect(row.quiet_start).toBeNull();
    expect(row.quiet_end).toBeNull();
    expect(row.plan_id).toBeNull();
  });

  it('comes back the same after a round trip', () => {
    const before = aSchedule();
    const row = scheduleToRow(before, 'sound_1', PLAN_UUID);
    const after = scheduleFromRow({ ...row, id: 'row_1' }, before, lookups);

    expect(after.trigger).toBe(before.trigger);
    expect(after.offsetMinutes).toBe(before.offsetMinutes);
    expect(after.planId).toBe(before.planId);
    expect(after.quietStart).toBe(before.quietStart);
    expect(after.quietEnd).toBe(before.quietEnd);
    expect(after.startMinutes).toBe(before.startMinutes);
    expect(after.endMinutes).toBe(before.endMinutes);
    expect(after.days).toEqual(before.days);
    expect(after.executor).toBe(before.executor);
    expect(after.zoneId).toBe(before.zoneId);
  });

  it('stays on the side of the list it came from', () => {
    expect(scheduleFromRow(aRow(), aSchedule({ scope: 'org' }), lookups).scope).toBe('org');
    expect(scheduleFromRow(aRow(), undefined, lookups).scope).toBe('user');
  });
});

describe('which plan a schedule points at', () => {
  it('takes a plan a business keeps by the account id it already has', () => {
    expect(remotePlanId(PLAN_UUID)).toBe(PLAN_UUID);
    expect(localPlanId(PLAN_UUID)).toBe(PLAN_UUID);
  });

  it('takes a plan on this phone by the id the account gave it', () => {
    useProtectionPlans.setState({
      plans: [
        {
          id: 'pln_1',
          placeId: 'plh_1',
          name: 'Pigeon Rotation',
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
          updatedAt: 0,
          remoteId: PLAN_UUID,
        },
      ],
      activeByPlace: {},
    });

    expect(remotePlanId('pln_1')).toBe(PLAN_UUID);
    expect(localPlanId(PLAN_UUID)).toBe('pln_1');
  });

  it('says nothing about a plan that has never reached the account', () => {
    expect(remotePlanId('pln_never')).toBeNull();
    expect(remotePlanId(null)).toBeNull();
    expect(localPlanId(null)).toBeNull();
  });
});
