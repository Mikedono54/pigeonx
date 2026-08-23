import {
  historyRowToEntry,
  mergeCollections,
  mergeHistory,
  minutesToTime,
  remoteTime,
  timeToMinutes,
  type LocalRow,
} from '../src/services/sync';
import type { SessionEntry } from '../src/state/useHistory';

interface Row extends LocalRow {
  name: string;
}

const fromRemote = (
  row: { id: string; name?: string | null; updated_at?: string | null },
  match: Row | undefined
): Row => ({
  id: match?.id ?? `local_${row.id}`,
  name: row.name ?? 'unnamed',
  remoteId: row.id,
  updatedAt: remoteTime(row),
});

const AT = (iso: string) => Date.parse(iso);

describe('remoteTime()', () => {
  it('reads when a row last changed', () => {
    expect(remoteTime({ id: 'a', updated_at: '2026-08-20T10:00:00Z' })).toBe(
      AT('2026-08-20T10:00:00Z')
    );
  });

  it('falls back to when it was made', () => {
    expect(remoteTime({ id: 'a', created_at: '2026-08-20T10:00:00Z' })).toBe(
      AT('2026-08-20T10:00:00Z')
    );
  });

  it('treats a row with no time as the oldest thing there is', () => {
    expect(remoteTime({ id: 'a' })).toBe(0);
    expect(remoteTime({ id: 'a', updated_at: 'not a date' })).toBe(0);
  });
});

describe('mergeCollections()', () => {
  it('keeps the copy that changed last when the phone is newer', () => {
    const local: Row[] = [
      { id: 'l1', name: 'Roof at night', remoteId: 'r1', updatedAt: AT('2026-08-21T12:00:00Z') },
    ];
    const remote = [
      { id: 'r1', name: 'Roof', updated_at: '2026-08-20T12:00:00Z' },
    ];

    const result = mergeCollections(local, remote, fromRemote);
    expect(result.keep).toHaveLength(1);
    expect(result.keep[0].name).toBe('Roof at night');
    expect(result.push).toHaveLength(1);
  });

  it('keeps the copy that changed last when the account is newer', () => {
    const local: Row[] = [
      { id: 'l1', name: 'Roof', remoteId: 'r1', updatedAt: AT('2026-08-19T12:00:00Z') },
    ];
    const remote = [
      { id: 'r1', name: 'Roof at night', updated_at: '2026-08-21T12:00:00Z' },
    ];

    const result = mergeCollections(local, remote, fromRemote);
    expect(result.keep[0].name).toBe('Roof at night');
    expect(result.keep[0].id).toBe('l1');
    expect(result.push).toHaveLength(0);
  });

  it('brings down what only the account has', () => {
    const result = mergeCollections(
      [],
      [{ id: 'r9', name: 'Patio', updated_at: '2026-08-21T12:00:00Z' }],
      fromRemote
    );
    expect(result.keep.map((r) => r.name)).toEqual(['Patio']);
    expect(result.push).toHaveLength(0);
  });

  it('sends up what only the phone has', () => {
    const local: Row[] = [
      { id: 'l7', name: 'Dock', remoteId: null, updatedAt: 5 },
    ];
    const result = mergeCollections(local, [], fromRemote);
    expect(result.keep).toEqual(local);
    expect(result.push).toEqual(local);
  });

  it('sends a row up again when the account lost it', () => {
    const local: Row[] = [
      { id: 'l3', name: 'Gone', remoteId: 'r3', updatedAt: 10 },
    ];
    const result = mergeCollections(local, [], fromRemote);
    expect(result.keep[0].remoteId).toBeNull();
    expect(result.push[0].name).toBe('Gone');
  });

  it('never shows the same row twice', () => {
    const local: Row[] = [
      { id: 'l1', name: 'One', remoteId: 'r1', updatedAt: 10 },
      { id: 'l2', name: 'Two', remoteId: null, updatedAt: 20 },
    ];
    const remote = [
      { id: 'r1', name: 'One', updated_at: '2026-08-21T12:00:00Z' },
      { id: 'r5', name: 'Five', updated_at: '2026-08-21T12:00:00Z' },
    ];
    const result = mergeCollections(local, remote, fromRemote);
    expect(result.keep).toHaveLength(3);
    expect(new Set(result.keep.map((r) => r.id)).size).toBe(3);
  });

  it('does the same thing when it runs twice', () => {
    const local: Row[] = [
      { id: 'l1', name: 'One', remoteId: 'r1', updatedAt: 10 },
    ];
    const remote = [
      { id: 'r1', name: 'One', updated_at: '2026-08-21T12:00:00Z' },
    ];
    const first = mergeCollections(local, remote, fromRemote);
    const second = mergeCollections(first.keep, remote, fromRemote);
    expect(second.keep).toEqual(first.keep);
    expect(second.push).toHaveLength(0);
  });
});

describe('times a schedule keeps', () => {
  it('writes minutes the way the account stores them', () => {
    expect(minutesToTime(6 * 60)).toBe('06:00:00');
    expect(minutesToTime(22 * 60 + 30)).toBe('22:30:00');
    expect(minutesToTime(0)).toBe('00:00:00');
  });

  it('reads them back the way the phone counts them', () => {
    expect(timeToMinutes('06:00:00')).toBe(360);
    expect(timeToMinutes('22:30')).toBe(1350);
    expect(timeToMinutes(null)).toBe(0);
  });

  it('goes there and back without drifting', () => {
    for (const mins of [0, 1, 359, 720, 1439]) {
      expect(timeToMinutes(minutesToTime(mins))).toBe(mins);
    }
  });
});

describe('what played, from both sides', () => {
  const local: SessionEntry[] = [
    {
      id: 'ses_1',
      profileId: 'sys_pigeon_18k',
      profileName: 'Pigeon sound',
      outputKind: 'phone',
      peakFreqHz: 18000,
      startedAt: AT('2026-08-21T09:00:00Z'),
      endedAt: AT('2026-08-21T09:15:00Z'),
      source: 'manual',
      zoneId: null,
      deviceId: null,
      remoteId: 'r1',
      synced: true,
    },
  ];

  it('turns a row from the account into a line on the screen', () => {
    const entry = historyRowToEntry(
      {
        id: 'r2',
        started_at: '2026-08-21T10:00:00Z',
        ended_at: '2026-08-21T10:20:00Z',
        output_kind: 'bt_speaker',
        peak_freq_hz: 17000,
        source: 'schedule',
        profile_id: 'p1',
      },
      () => 'My sound'
    );
    expect(entry.profileName).toBe('My sound');
    expect(entry.outputKind).toBe('bt_speaker');
    expect(entry.source).toBe('schedule');
    expect(entry.synced).toBe(true);
  });

  it('falls back to a speaker it understands', () => {
    const entry = historyRowToEntry(
      { id: 'r3', started_at: '2026-08-21T10:00:00Z', output_kind: 'moon' },
      () => 'A sound'
    );
    expect(entry.outputKind).toBe('phone');
    expect(entry.endedAt).toBeNull();
  });

  it('shows nothing twice', () => {
    const remote = [
      historyRowToEntry(
        { id: 'r1', started_at: '2026-08-21T09:00:00Z' },
        () => 'Pigeon sound'
      ),
      historyRowToEntry(
        { id: 'r2', started_at: '2026-08-21T11:00:00Z' },
        () => 'Pigeon sound'
      ),
    ];
    const merged = mergeHistory(local, remote);
    expect(merged).toHaveLength(2);
    expect(merged.map((e) => e.remoteId)).toEqual(['r2', 'r1']);
  });

  it('puts the newest first', () => {
    const remote = [
      historyRowToEntry(
        { id: 'r7', started_at: '2026-08-22T09:00:00Z' },
        () => 'A sound'
      ),
    ];
    expect(mergeHistory(local, remote)[0].remoteId).toBe('r7');
  });

  it('leaves the list alone when nothing came back', () => {
    expect(mergeHistory(local, [])).toEqual(local);
  });
});
