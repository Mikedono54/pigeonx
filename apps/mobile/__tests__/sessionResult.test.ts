import { findSystemProfile } from '../src/core/profiles';
import { SessionRecorder, type RemoteSink } from '../src/services/sessionRecorder';
import { placeFromRow, planFromRow, historyRowToEntry, trimSeconds } from '../src/services/sync';
import { useHistory, type SessionEntry } from '../src/state/useHistory';
import { usePlacesHome } from '../src/state/usePlacesHome';
import { useProtectionPlans } from '../src/state/useProtectionPlans';

const PROFILE = findSystemProfile('sys_pigeon_18k')!;

function makeSink(overrides: Partial<RemoteSink> = {}): RemoteSink {
  return {
    isAvailable: () => true,
    startSession: jest.fn(async () => 'remote-1'),
    endSession: jest.fn(async () => {}),
    reportResult: jest.fn(async () => {}),
    ...overrides,
  };
}

beforeEach(() => {
  useHistory.setState({ entries: [], queue: [] });
  usePlacesHome.setState({ places: [], activeId: null });
  useProtectionPlans.setState({ plans: [], activeByPlace: {} });
});

/** One finished run, the way Home leaves it when the timer runs out. */
async function finishedRun(rec: SessionRecorder): Promise<SessionEntry> {
  const entry = await rec.start({ profile: PROFILE, output: 'phone' });
  await rec.end(entry.id);
  return useHistory.getState().entries[0];
}

describe('the question is put once, and once only', () => {
  it('offers the run that just finished', async () => {
    const rec = new SessionRecorder(makeSink());
    const run = await finishedRun(rec);

    expect(useHistory.getState().pendingResult()?.id).toBe(run.id);
  });

  it('never offers a run that is still going', async () => {
    const rec = new SessionRecorder(makeSink());
    await rec.start({ profile: PROFILE, output: 'phone' });

    expect(useHistory.getState().pendingResult()).toBeUndefined();
  });

  it('stops offering it the moment somebody answers', async () => {
    const rec = new SessionRecorder(makeSink());
    const run = await finishedRun(rec);

    await rec.report(run.id, 'left');

    expect(useHistory.getState().pendingResult()).toBeUndefined();
    expect(useHistory.getState().entries[0].result).toBe('left');
    expect(useHistory.getState().entries[0].resultAsked).toBe(true);
  });

  it('stops offering it when somebody waves it away without answering', async () => {
    const rec = new SessionRecorder(makeSink());
    const run = await finishedRun(rec);

    useHistory.getState().markAsked(run.id);

    expect(useHistory.getState().pendingResult()).toBeUndefined();
    expect(useHistory.getState().entries[0].result).toBeNull();
  });

  it('moves on to the next run, and does not go back to the answered one', async () => {
    const rec = new SessionRecorder(makeSink());
    const first = await finishedRun(rec);
    await rec.report(first.id, 'not_yet');
    const second = await finishedRun(rec);

    expect(useHistory.getState().pendingResult()?.id).toBe(second.id);
    await rec.report(second.id, 'left');
    expect(useHistory.getState().pendingResult()).toBeUndefined();
  });

  it('says nothing about a run it cannot find', async () => {
    const rec = new SessionRecorder(makeSink());
    expect(await rec.report('nope', 'left')).toBeUndefined();
  });
});

describe('an answer given with no account, or with no signal', () => {
  it('lands on this phone whatever the network is doing', async () => {
    const rec = new SessionRecorder(makeSink({ isAvailable: () => false }));
    const run = await finishedRun(rec);

    await rec.report(run.id, 'some_left');

    expect(useHistory.getState().entries[0].result).toBe('some_left');
    expect(useHistory.getState().queue.filter((q) => q.kind === 'result')).toHaveLength(1);
  });

  it('goes up on the next flush, and leaves the queue empty', async () => {
    const offline = makeSink({ isAvailable: () => false });
    const rec = new SessionRecorder(offline);
    const run = await finishedRun(rec);
    await rec.report(run.id, 'left');

    const online = makeSink();
    rec.setSink(online);
    // The run itself has to reach the account before an answer can attach.
    await rec.flush();
    await rec.flush();

    expect(online.reportResult).toHaveBeenCalled();
    expect(useHistory.getState().queue).toHaveLength(0);
  });

  it('waits when the run itself has not reached the account', async () => {
    const rec = new SessionRecorder(makeSink({ startSession: jest.fn(async () => null) }));
    const run = await finishedRun(rec);

    await rec.report(run.id, 'left');

    expect(useHistory.getState().entries[0].result).toBe('left');
    expect(useHistory.getState().queue.filter((q) => q.kind === 'result')).toHaveLength(1);
  });

  it('queues an answer the server refused, and keeps it on the phone', async () => {
    const rec = new SessionRecorder(
      makeSink({
        reportResult: jest.fn(async () => {
          throw new Error('nope');
        }),
      }),
    );
    const run = await finishedRun(rec);
    await rec.report(run.id, 'not_yet');

    expect(useHistory.getState().entries[0].result).toBe('not_yet');
    expect(useHistory.getState().queue.filter((q) => q.kind === 'result')).toHaveLength(1);
  });
});

describe('a run carries the place and the plan it belonged to', () => {
  it('writes both down, so History can say where it happened', async () => {
    const rec = new SessionRecorder(makeSink());
    const entry = await rec.start({
      profile: PROFILE,
      output: 'phone',
      placeId: 'plh_1',
      placeName: 'Back balcony',
      planId: 'pln_1',
      planName: 'Pigeon Rotation',
    });

    expect(entry.placeName).toBe('Back balcony');
    expect(entry.planName).toBe('Pigeon Rotation');
  });

  it('leaves them empty for a play that belonged to nothing', async () => {
    const rec = new SessionRecorder(makeSink());
    const entry = await rec.start({ profile: PROFILE, output: 'phone' });

    expect(entry.placeId).toBeNull();
    expect(entry.planId).toBeNull();
  });
});

describe('what the account sends back about a place', () => {
  it('reads a row as a place, answers and all', () => {
    const place = placeFromRow(
      {
        id: 'p1',
        name: 'Front balcony',
        kind: 'balcony',
        target: 'gulls',
        area_size: 'small',
        people_nearby: true,
        limit_audible: true,
        birds_active: 'early morning',
        updated_at: '2026-08-21T09:00:00Z',
      },
      undefined,
    );

    expect(place.name).toBe('Front balcony');
    expect(place.kind).toBe('balcony');
    expect(place.target).toBe('gulls');
    expect(place.areaSize).toBe('small');
    expect(place.limitAudible).toBe(true);
    expect(place.remoteId).toBe('p1');
  });

  it('never shows a word this phone does not have', () => {
    const place = placeFromRow({ id: 'p2', kind: 'helipad', target: 'emus' }, undefined);

    expect(place.kind).toBe('custom');
    expect(place.target).toBe('unsure');
    expect(place.areaSize).toBeNull();
  });

  it('drops a quiet answer that cannot be true, because nobody is nearby', () => {
    const place = placeFromRow(
      { id: 'p3', people_nearby: false, limit_audible: true },
      undefined,
    );
    expect(place.limitAudible).toBe(false);
  });

  it('keeps the id this phone already gave the place', () => {
    const mine = usePlacesHome.getState().add({ name: 'Roof', kind: 'roof' });
    const merged = placeFromRow({ id: 'p4', name: 'Roof deck' }, mine);

    expect(merged.id).toBe(mine.id);
    expect(merged.name).toBe('Roof deck');
  });
});

describe('what the account sends back about a plan', () => {
  it('turns the sounds back into sounds this phone knows', () => {
    const plan = planFromRow(
      {
        id: 'q1',
        name: 'Pigeon Rotation',
        target: 'pigeons',
        // The seeded ids for the distress call and the hawk.
        sound_ids: [
          '00000000-0000-0000-0000-000000000006',
          '00000000-0000-0000-0000-000000000007',
        ],
        session_minutes: 15,
        randomize_order: true,
        output: 'phone',
      },
      undefined,
    );

    expect(plan.soundIds).toEqual(['sys_distress_pigeon', 'sys_predator_hawk']);
    expect(plan.sessionMinutes).toBe(15);
    expect(plan.randomizeOrder).toBe(true);
  });

  it('drops a sound it has never heard of rather than showing an id', () => {
    const plan = planFromRow(
      { id: 'q2', sound_ids: ['00000000-0000-0000-0000-000000000001', 'who-knows'] },
      undefined,
    );
    expect(plan.soundIds).toEqual(['sys_pigeon_18k']);
  });

  it('says quiet hours the way a card reads them', () => {
    expect(trimSeconds('22:00:00')).toBe('22:00');
    expect(trimSeconds('06:30')).toBe('06:30');
    expect(trimSeconds(null)).toBeNull();
  });

  it('falls back to a speaker every phone has', () => {
    expect(planFromRow({ id: 'q3', output: 'telepathy' }, undefined).output).toBe('phone');
  });
});

describe('what played somewhere else', () => {
  it('carries the result, the plan and the place the account reported', () => {
    const entry = historyRowToEntry(
      {
        id: 'r9',
        started_at: '2026-08-21T10:00:00Z',
        ended_at: '2026-08-21T10:15:00Z',
        result: 'some_left',
        plan_name: 'Gull Rotation',
        place_name: 'Dock',
      },
      () => 'A sound',
    );

    expect(entry.result).toBe('some_left');
    expect(entry.planName).toBe('Gull Rotation');
    expect(entry.placeName).toBe('Dock');
  });

  it('never asks again about a run that happened on another phone', () => {
    const entry = historyRowToEntry({ id: 'r10', started_at: '2026-08-21T10:00:00Z' }, () => 'A sound');

    expect(entry.resultAsked).toBe(true);
    expect(entry.result).toBeNull();
  });

  it('ignores a result word it does not know', () => {
    const entry = historyRowToEntry({ id: 'r11', result: 'maybe?' }, () => 'A sound');
    expect(entry.result).toBeNull();
  });
});
