import { describe, expect, it } from 'vitest';
import {
  areaStatus,
  bucketByDay,
  clock,
  countToday,
  duration,
  elapsed,
  executorLabel,
  formatDays,
  formatReport,
  formatWindow,
  monthlyTotal,
  placeStatus,
  speakerKindLabel,
  weekStart,
} from './derive';
import type { LiveArea } from './types';

const NOW = new Date('2026-08-23T18:30:00');

function live(over: Partial<LiveArea> = {}): LiveArea {
  return {
    zone_id: 'z1',
    zone_name: 'Patio',
    running: false,
    current_session_id: null,
    started_at: null,
    profile_name: 'Hawk call',
    ...over,
  };
}

describe('clock', () => {
  it('reads minutes and seconds', () => {
    expect(clock(760)).toBe('12:40');
    expect(clock(5)).toBe('0:05');
  });

  it('adds hours past sixty minutes', () => {
    expect(clock(3750)).toBe('1:02:30');
  });

  it('never goes negative', () => {
    expect(clock(-90)).toBe('0:00');
  });
});

describe('elapsed', () => {
  it('counts from the start time', () => {
    expect(elapsed('2026-08-23T18:17:20', NOW)).toBe('12:40');
  });

  it('returns nothing without a start time', () => {
    expect(elapsed(null, NOW)).toBeNull();
    expect(elapsed('not a date', NOW)).toBeNull();
  });
});

describe('areaStatus', () => {
  it('says Quiet when nothing is running', () => {
    const status = areaStatus(live(), NOW);
    expect(status.playing).toBe(false);
    expect(status.label).toBe('Quiet');
    expect(status.sound).toBe('Hawk call');
  });

  it('says Playing with a running clock', () => {
    const status = areaStatus(
      live({ running: true, started_at: '2026-08-23T18:17:20', profile_name: 'Bird alarm call' }),
      NOW,
    );
    expect(status.playing).toBe(true);
    expect(status.label).toBe('Playing 12:40');
    expect(status.sound).toBe('Bird alarm call');
  });

  it('is honest when no sound is set', () => {
    expect(areaStatus(live({ profile_name: null }), NOW).sound).toBe('No sound set');
  });
});

describe('placeStatus', () => {
  it('points at the next action when there are no areas', () => {
    expect(placeStatus([])).toBe('No areas yet');
  });

  it('counts the areas that are playing', () => {
    expect(placeStatus([live(), live({ running: true })])).toBe('1 of 2 areas playing');
  });

  it('says all quiet when nothing plays', () => {
    expect(placeStatus([live(), live()])).toBe('All quiet');
    expect(placeStatus([live()])).toBe('Quiet');
  });
});

describe('bucketByDay', () => {
  it('keeps seven days, oldest first, with empty days intact', () => {
    const buckets = bucketByDay(['2026-08-23T09:00:00', '2026-08-21T09:00:00'], 7, NOW);
    expect(buckets).toHaveLength(7);
    expect(buckets[0].key).toBe('2026-08-17');
    expect(buckets[6].key).toBe('2026-08-23');
    expect(buckets[6].count).toBe(1);
    expect(buckets[4].count).toBe(1);
    expect(buckets[5].count).toBe(0);
  });

  it('labels each day', () => {
    expect(bucketByDay([], 7, NOW).map((b) => b.label)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
  });

  it('drops timestamps outside the window and junk values', () => {
    const buckets = bucketByDay(['2026-01-01T09:00:00', null, 'nope'], 7, NOW);
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(0);
  });
});

describe('countToday', () => {
  it('counts only today', () => {
    expect(countToday(['2026-08-23T01:00:00', '2026-08-22T23:00:00'], NOW)).toBe(1);
  });
});

describe('duration', () => {
  it('prints minutes, hours and both', () => {
    expect(duration(12)).toBe('12 min');
    expect(duration(60)).toBe('1 hour');
    expect(duration(125)).toBe('2 hours 5 min');
    expect(duration(null)).toBe('0 min');
  });
});

describe('formatReport', () => {
  it('says nothing played when the week is empty', () => {
    const lines = formatReport({ sessions: 0, total_minutes: 0, zones_active: 0 });
    expect(lines.sentence).toBe('Nothing has played here this week.');
  });

  it('handles a missing report the same way', () => {
    expect(formatReport(null).plays).toBe('0');
  });

  it('counts plays, time and areas in one sentence', () => {
    const lines = formatReport({ sessions: 14, total_minutes: 125, zones_active: 3 });
    expect(lines.plays).toBe('14');
    expect(lines.time).toBe('2 hours 5 min');
    expect(lines.sentence).toBe('14 plays across 3 areas, 2 hours 5 min of sound.');
  });

  it('uses singular words for one play in one area', () => {
    const lines = formatReport({ sessions: 1, total_minutes: 6, zones_active: 1 });
    expect(lines.sentence).toBe('1 play across 1 area, 6 min of sound.');
  });
});

describe('weekStart', () => {
  it('walks back to Monday', () => {
    expect(weekStart(new Date('2026-08-23T18:30:00'))).toBe('2026-08-17');
    expect(weekStart(new Date('2026-08-17T00:30:00'))).toBe('2026-08-17');
  });
});

describe('formatDays', () => {
  it('names the common patterns', () => {
    expect(formatDays([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    expect(formatDays([1, 2, 3, 4, 5])).toBe('Mon to Fri');
    expect(formatDays([0, 6])).toBe('Sat and Sun');
  });

  it('lists anything else', () => {
    expect(formatDays([5, 1, 3])).toBe('Mon, Wed, Fri');
    expect(formatDays([])).toBe('No days');
  });
});

describe('formatWindow', () => {
  it('reads as a plain time range', () => {
    expect(formatWindow('06:30:00', '21:00:00')).toBe('6:30 am to 9:00 pm');
    expect(formatWindow('00:00:00', '12:00:00')).toBe('12:00 am to 12:00 pm');
  });
});

describe('labels', () => {
  it('says who runs a schedule', () => {
    expect(executorLabel('device')).toBe('A PigeonX speaker');
    expect(executorLabel('reminder')).toBe('This phone reminds you');
  });

  it('names speakers the way the app does', () => {
    expect(speakerKindLabel('pigeonx_emitter')).toBe('PigeonX speaker');
    expect(speakerKindLabel('bt_speaker')).toBe('Bluetooth speaker');
    expect(speakerKindLabel('simulated')).toBe('Test speaker');
  });
});

describe('monthlyTotal', () => {
  it('is places times the price', () => {
    expect(monthlyTotal(0)).toBe('$0');
    expect(monthlyTotal(3)).toBe('$87');
  });
});
