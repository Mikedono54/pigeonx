import {
  dayHeading,
  dayKey,
  durationLabel,
  filterTimeline,
  groupTimeline,
  itemName,
  itemTime,
  resultLabel,
  type TimelineItem,
} from '../src/core/timeline';
import { historyRowToEntry, mergeHistory } from '../src/services/sync';
import type { SessionEntry } from '../src/state/useHistory';

const NOW = new Date('2026-08-25T18:00:00');
const AT = (iso: string) => new Date(iso).getTime();

function item(over: Partial<TimelineItem> = {}): TimelineItem {
  return {
    id: 'a',
    startedAt: AT('2026-08-25T09:00:00'),
    endedAt: AT('2026-08-25T09:15:00'),
    planName: null,
    profileName: 'High-frequency deterrent',
    placeId: 'plh_1',
    placeName: 'Balcony',
    outputKind: 'phone',
    result: null,
    ...over,
  };
}

describe('a day of sessions', () => {
  it('calls today Today and yesterday Yesterday', () => {
    expect(dayHeading(AT('2026-08-25T09:00:00'), NOW)).toBe('Today');
    expect(dayHeading(AT('2026-08-24T23:59:00'), NOW)).toBe('Yesterday');
  });

  it('names the day inside the week', () => {
    expect(dayHeading(AT('2026-08-21T09:00:00'), NOW)).toBe('Friday');
  });

  it('takes a date past a week, because a weekday would not place it', () => {
    const heading = dayHeading(AT('2026-08-01T09:00:00'), NOW);
    expect(heading).toMatch(/Aug/);
  });

  it('buckets by the calendar day this phone is in', () => {
    expect(dayKey(AT('2026-08-25T23:30:00'))).toBe('2026-08-25');
    expect(dayKey(AT('2026-08-26T00:30:00'))).toBe('2026-08-26');
  });

  it('puts the newest day first and the newest session first inside it', () => {
    const days = groupTimeline(
      [
        item({ id: 'old', startedAt: AT('2026-08-23T09:00:00') }),
        item({ id: 'early', startedAt: AT('2026-08-25T07:00:00') }),
        item({ id: 'late', startedAt: AT('2026-08-25T17:00:00') }),
      ],
      NOW,
    );

    expect(days.map((d) => d.heading)).toEqual(['Today', 'Sunday']);
    expect(days[0].items.map((i) => i.id)).toEqual(['late', 'early']);
  });

  it('keeps a run from another phone in the same day as one from this one', () => {
    const days = groupTimeline(
      [
        item({ id: 'here', startedAt: AT('2026-08-25T09:00:00') }),
        item({ id: 'there', startedAt: AT('2026-08-25T14:00:00'), placeName: 'Dock' }),
      ],
      NOW,
    );

    expect(days).toHaveLength(1);
    expect(days[0].items).toHaveLength(2);
  });
});

describe('what one line says', () => {
  it('names the plan when a plan ran it, and the sound when none did', () => {
    expect(itemName(item({ planName: 'Pigeon Rotation' }))).toBe('Pigeon Rotation');
    expect(itemName(item())).toBe('High-frequency deterrent');
  });

  it('says the time the way every clock in the app does', () => {
    expect(itemTime(item({ startedAt: AT('2026-08-25T07:05:00') }))).toBe('7:05 AM');
  });

  it('says how long it ran, and admits when it has not stopped', () => {
    expect(durationLabel(item())).toBe('15 min');
    expect(durationLabel(item({ endedAt: null }))).toBe('Still going');
    expect(
      durationLabel(
        item({ startedAt: AT('2026-08-25T09:00:00'), endedAt: AT('2026-08-25T09:00:20') }),
      ),
    ).toBe('Under a minute');
  });

  it('says what happened, or says that nobody said', () => {
    expect(resultLabel(item({ result: 'left' }))).toBe('Most birds left');
    expect(resultLabel(item({ result: 'some_left' }))).toBe('Some birds left');
    expect(resultLabel(item({ result: 'not_yet' }))).toBe('Birds stayed');
    expect(resultLabel(item({ result: 'unknown' }))).toBe('Could not tell');
    expect(resultLabel(item())).toBe('No result reported');
  });
});

describe('the filter chips', () => {
  const all = [
    item({ id: 'a', placeId: 'plh_1', result: 'left' }),
    item({ id: 'b', placeId: 'plh_2', result: 'not_yet' }),
    item({ id: 'c', placeId: 'plh_1', result: null }),
    item({ id: 'd', placeId: null, result: 'left' }),
  ];

  it('shows everything when nothing is picked', () => {
    expect(filterTimeline(all)).toHaveLength(4);
  });

  it('narrows to one place', () => {
    expect(filterTimeline(all, { placeId: 'plh_1' }).map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('narrows to one answer', () => {
    expect(filterTimeline(all, { result: 'left' }).map((i) => i.id)).toEqual(['a', 'd']);
  });

  it('finds the sessions nobody answered', () => {
    expect(filterTimeline(all, { result: 'none' }).map((i) => i.id)).toEqual(['c']);
  });

  it('takes both at once', () => {
    expect(filterTimeline(all, { placeId: 'plh_1', result: 'left' }).map((i) => i.id)).toEqual([
      'a',
    ]);
  });
});

describe('this phone and the account, in one list', () => {
  const local: SessionEntry[] = [
    {
      id: 'ses_1',
      profileId: 'sys_pigeon_18k',
      profileName: 'High-frequency deterrent',
      outputKind: 'phone',
      peakFreqHz: 18000,
      startedAt: AT('2026-08-25T09:00:00'),
      endedAt: AT('2026-08-25T09:15:00'),
      source: 'manual',
      zoneId: null,
      deviceId: null,
      placeId: 'plh_1',
      placeName: 'Balcony',
      planId: null,
      planName: null,
      result: 'left',
      resultAsked: true,
      remoteId: 'r1',
      synced: true,
    },
  ];

  it('never shows the same session twice', () => {
    const fromAccount = historyRowToEntry(
      { id: 'r1', started_at: '2026-08-25T09:00:00Z', result: 'left' },
      () => 'A sound',
    );
    expect(mergeHistory(local, [fromAccount])).toHaveLength(1);
  });

  it('groups a session from elsewhere into the timeline like any other', () => {
    const fromAccount = historyRowToEntry(
      {
        id: 'r2',
        started_at: new Date(AT('2026-08-25T14:00:00')).toISOString(),
        ended_at: new Date(AT('2026-08-25T14:20:00')).toISOString(),
        plan_name: 'Gull Rotation',
        place_name: 'Dock',
        result: 'some_left',
      },
      () => 'A sound',
    );

    const days = groupTimeline(mergeHistory(local, [fromAccount]), NOW);

    expect(days).toHaveLength(1);
    expect(days[0].items.map(itemName)).toEqual([
      'Gull Rotation',
      'High-frequency deterrent',
    ]);
    expect(days[0].items.map(resultLabel)).toEqual(['Some birds left', 'Most birds left']);
  });
});
