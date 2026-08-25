import { describe, expect, it } from 'vitest';
import {
  areaStatus,
  attentionCountFor,
  attentionList,
  audibleTag,
  dateLabel,
  bucketByDay,
  clock,
  countToday,
  duration,
  elapsed,
  executorLabel,
  feedbackLine,
  filterPlays,
  formatDays,
  formatPlanDays,
  formatReport,
  formatWindow,
  intervalLabel,
  monthlyTotal,
  nextRun,
  nextRunLine,
  peakFreqHz,
  placeLine,
  placeStatus,
  planLine,
  playCountLine,
  resultLabel,
  runningNow,
  scheduleWindow,
  speakerKindLabel,
  summaryTiles,
  timeline,
  triggerLabel,
  weekStart,
  NO_FILTERS,
} from './derive';
import type {
  LiveArea,
  Place,
  Play,
  ProtectionPlan,
  ScheduleRow,
  Sound,
  Speaker,
} from './types';

/** A Sunday evening. Every test that needs a clock uses this one. */
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

function place(over: Partial<Place> = {}): Place {
  return {
    id: 'p1',
    org_id: 'o1',
    name: 'Harbour House',
    address: null,
    timezone: 'America/Los_Angeles',
    kind: null,
    target: null,
    area_size: null,
    people_nearby: false,
    limit_audible: false,
    birds_active: null,
    ...over,
  };
}

function sound(over: Partial<Sound> = {}): Sound {
  return {
    id: 's1',
    name: 'A sound',
    kind: 'tone',
    is_system: true,
    description: null,
    params: {},
    ...over,
  };
}

function plan(over: Partial<ProtectionPlan> = {}): ProtectionPlan {
  return {
    id: 'pl1',
    owner_org_id: 'o1',
    zone_id: 'a1',
    name: 'Gull Rotation',
    target: 'gulls',
    sound_ids: ['s1', 's2'],
    randomize_order: true,
    interval_seconds: 900,
    session_minutes: 15,
    output: 'pigeonx_emitter',
    volume: 0.85,
    quiet_start: '22:00',
    quiet_end: '06:00',
    days: [1, 2, 3, 4, 5, 6, 7],
    starts_on: null,
    ends_on: null,
    ...over,
  };
}

function schedule(over: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id: 'sc1',
    zone_id: 'a1',
    profile_id: 's1',
    days: [1, 2, 3, 4, 5],
    start_time: '11:00:00',
    end_time: '14:00:00',
    enabled: true,
    executor: 'device',
    trigger: 'time',
    offset_minutes: 0,
    plan_id: null,
    quiet_start: null,
    quiet_end: null,
    area_name: 'Patio',
    place_id: 'p1',
    place_name: 'Harbour House',
    sound_name: 'Hawk call',
    plan_name: null,
    output: null,
    ...over,
  };
}

function speakerRow(id: string, status: Speaker['status']): Speaker {
  return {
    id,
    zone_id: 'a1',
    kind: 'pigeonx_emitter',
    name: id,
    status,
    last_seen_at: null,
  };
}

function playRow(startedAt: string, over: Partial<Play> = {}): Play {
  return {
    id: startedAt,
    started_at: startedAt,
    ended_at: startedAt,
    minutes: 10,
    output_kind: 'pigeonx_emitter',
    source: 'manual',
    result: null,
    user_id: 'me',
    profile_id: 's1',
    profile_name: 'Hawk call',
    plan_id: null,
    plan_name: null,
    zone_id: 'a1',
    zone_name: 'Patio',
    location_id: 'p1',
    location_name: 'Harbour House',
    place_name: 'Harbour House',
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

describe('dateLabel', () => {
  it('prints a plain date', () => {
    expect(dateLabel('2026-05-02T10:00:00')).toBe('May 2, 2026');
  });

  it('says so when there is no date', () => {
    expect(dateLabel(null)).toBe('Not yet');
    expect(dateLabel('nope')).toBe('Not yet');
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

/* ── the 2026-08-24 spec: tiles, attention, timeline, history ─────────── */

describe('placeLine', () => {
  it('says what the location is and which birds, in the app words', () => {
    expect(
      placeLine(
        place({
          kind: 'storefront',
          target: 'corvids',
          area_size: 'small',
          people_nearby: true,
          limit_audible: true,
          birds_active: 'early morning',
        }),
      ),
    ).toBe(
      'Storefront · Crows or jays · Small · People nearby · Keep it quiet · Birds show up early morning',
    );
  });

  it('leaves out what nobody has answered', () => {
    expect(placeLine(place({ target: 'gulls', people_nearby: false }))).toBe('Gulls');
  });

  it('points at the questions when none of them are answered', () => {
    expect(placeLine(place({ people_nearby: false }))).toBe(
      'Nothing set yet. Answer a few questions about this location.',
    );
  });
});

describe('audibleTag', () => {
  it('marks a recording as audible', () => {
    expect(audibleTag(sound({ kind: 'sample', params: { asset: 'predator_hawk' } }), 'phone')).toBe(
      'Audible',
    );
  });

  it('wobbles between 15 and 20 kHz', () => {
    expect(audibleTag(sound({ kind: 'tone', params: { freqHz: 18000 } }), 'phone')).toBe(
      'May be audible',
    );
  });

  it('never promises a phone can play 22 kHz', () => {
    const max = sound({ kind: 'tone', params: { freqHz: 22000 } });
    expect(audibleTag(max, 'phone')).toBe('Needs a PigeonX speaker');
    expect(audibleTag(max, 'pigeonx_emitter')).toBe('Typically inaudible');
  });

  it('reads a sweep at its top end', () => {
    expect(peakFreqHz(sound({ kind: 'sweep', params: { fromHz: 15000, toHz: 19000 } }))).toBe(
      19000,
    );
  });
});

describe('planLine', () => {
  it('says the plan, the rotation, the length and the speaker', () => {
    expect(planLine(plan())).toBe(
      'Gull Rotation · 2 sounds, mixed up · 15 min sessions · PigeonX speaker · Quiet 10:00 pm to 6:00 am',
    );
  });

  it('drops quiet hours when there are none, and keeps the order when it is fixed', () => {
    expect(
      planLine(plan({ randomize_order: false, quiet_start: null, quiet_end: null })),
    ).toBe('Gull Rotation · 2 sounds, in order · 15 min sessions · PigeonX speaker');
  });

  it('is honest when an area has no plan', () => {
    expect(planLine(null)).toBe('No protection plan yet');
  });

  it('counts plan days from Monday', () => {
    expect(formatPlanDays([1, 2, 3, 4, 5, 6, 7])).toBe('Every day');
    expect(formatPlanDays([1, 2, 3, 4, 5])).toBe('Mon to Fri');
    expect(formatPlanDays([6, 7])).toBe('Sat and Sun');
    expect(formatPlanDays([2, 5])).toBe('Tue, Fri');
  });

  it('reads the gap between sounds in whatever unit is plainest', () => {
    expect(intervalLabel(0)).toBe('Back to back');
    expect(intervalLabel(45)).toBe('45 sec between sounds');
    expect(intervalLabel(900)).toBe('15 min between sounds');
  });
});

describe('resultLabel', () => {
  it('uses the four buttons from the app', () => {
    expect(resultLabel('left')).toBe('They left');
    expect(resultLabel('some_left')).toBe('Some left');
    expect(resultLabel('not_yet')).toBe('Not yet');
    expect(resultLabel('unknown')).toBe('Could not tell');
  });

  it('keeps unreported apart from could not tell', () => {
    expect(resultLabel(null)).toBe('Not reported');
  });
});

describe('feedbackLine', () => {
  it('adds up only what people reported', () => {
    expect(
      feedbackLine([
        {
          sessions_total: 12,
          sessions_with_result: 5,
          left_count: 3,
          some_left_count: 1,
          not_yet_count: 1,
          best_plan_name: 'Gull Rotation',
        },
        {
          sessions_total: 8,
          sessions_with_result: 3,
          left_count: 2,
          some_left_count: 0,
          not_yet_count: 1,
          best_plan_name: null,
        },
      ]),
    ).toBe('8 of 20 runs reported. 5 they left, 1 some left, 2 not yet.');
  });

  it('says so when nobody has answered, and when nothing has run', () => {
    expect(
      feedbackLine([
        {
          sessions_total: 6,
          sessions_with_result: 0,
          left_count: 0,
          some_left_count: 0,
          not_yet_count: 0,
          best_plan_name: null,
        },
      ]),
    ).toBe('Nobody has reported a result on the 6 runs here yet.');
    expect(feedbackLine([])).toBe('Nothing has run here yet.');
  });
});

describe('attentionList', () => {
  const places = [place({ id: 'p1', name: 'Harbour House' })];
  const areas = [
    { id: 'a1', location_id: 'p1', name: 'Patio', active_profile_id: null },
    { id: 'a2', location_id: 'p1', name: 'Roof deck', active_profile_id: null },
    { id: 'a3', location_id: 'p1', name: 'Front walk', active_profile_id: null },
  ];
  const speakers: Speaker[] = [
    {
      id: 'd1',
      zone_id: 'a1',
      kind: 'pigeonx_emitter',
      name: 'Patio east',
      status: 'online',
      last_seen_at: null,
    },
    {
      id: 'd2',
      zone_id: 'a2',
      kind: 'pigeonx_emitter',
      name: 'Roof north',
      status: 'offline',
      last_seen_at: null,
    },
  ];
  const plans = [plan({ zone_id: 'a1' }), plan({ id: 'pl2', zone_id: 'a2' })];

  it('names the speaker that stopped answering', () => {
    const rows = attentionList(places, areas, speakers, plans);
    expect(rows.map((r) => r.zone_name)).toEqual(['Roof deck', 'Front walk']);
    expect(rows[0].reasons).toEqual(['Roof north is offline']);
  });

  it('flags an area with no speaker and no plan', () => {
    const rows = attentionList(places, areas, speakers, plans);
    expect(rows[1].reasons).toEqual(['No speaker yet', 'No protection plan yet']);
  });

  it('leaves a covered area off the list entirely', () => {
    const rows = attentionList(places, areas, speakers, plans);
    expect(rows.some((r) => r.zone_name === 'Patio')).toBe(false);
  });

  it('counts per location', () => {
    const rows = attentionList(places, areas, speakers, plans);
    expect(attentionCountFor(rows, 'p1')).toBe(2);
    expect(attentionCountFor(rows, 'p2')).toBe(0);
  });

  it('groups several offline speakers into one sentence', () => {
    const two: Speaker[] = [
      { ...speakers[1], id: 'x1', zone_id: 'a1' },
      { ...speakers[1], id: 'x2', zone_id: 'a1' },
    ];
    const rows = attentionList(places, [areas[0]], two, plans);
    expect(rows[0].reasons).toEqual(['2 speakers are offline']);
  });
});

describe('summaryTiles', () => {
  const base = {
    places: [place({ id: 'p1' }), place({ id: 'p2' }), place({ id: 'p3' })],
    speakers: [
      { ...speakerRow('d1', 'online') },
      { ...speakerRow('d2', 'online') },
      { ...speakerRow('d3', 'offline') },
    ],
    schedules: [schedule({ id: 's1' }), schedule({ id: 's2', enabled: false })],
    plays: [
      playRow('2026-08-23T09:00:00'),
      playRow('2026-08-18T09:00:00'),
      playRow('2026-08-16T09:00:00'),
    ],
    attention: [] as ReturnType<typeof attentionList>,
  };

  it('counts every number from real rows', () => {
    const tiles = summaryTiles(base, NOW);
    const by = Object.fromEntries(tiles.map((t) => [t.key, t]));
    expect(by.locations.value).toBe('3');
    expect(by.speakers.value).toBe('2');
    expect(by.speakers.note).toBe('1 offline');
    expect(by.schedules.value).toBe('1');
    expect(by.schedules.note).toBe('1 paused');
    // Monday the 17th onward: the 16th is last week.
    expect(by.sessions.value).toBe('2');
    expect(by.attention.value).toBe('0');
  });

  it('leaves out a tile it cannot count', () => {
    const tiles = summaryTiles(
      { places: null, speakers: null, schedules: null, plays: null, attention: null },
      NOW,
    );
    expect(tiles).toEqual([]);
  });

  it('stays away while there is no fleet to report on', () => {
    const tiles = summaryTiles({ ...base, speakers: [] }, NOW);
    expect(tiles.some((t) => t.key === 'speakers')).toBe(false);
  });

  it('says nothing is wrong rather than hiding the tile', () => {
    const tiles = summaryTiles(base, NOW);
    expect(tiles.find((t) => t.key === 'attention')?.note).toBe('everything is covered');
  });
});

describe('triggerLabel', () => {
  it('prints a clock time as a clock time', () => {
    expect(triggerLabel('time', 0, '11:00:00')).toBe('11:00 am');
  });

  it('shows the intent for sunrise and sunset', () => {
    expect(triggerLabel('sunrise', 30, '06:30:00')).toBe('Sunrise + 30 min');
    expect(triggerLabel('sunrise', -30, '06:30:00')).toBe('Sunrise - 30 min');
    expect(triggerLabel('sunset', 0, '19:00:00')).toBe('Sunset');
  });

  it('puts the trigger at the front of the window', () => {
    expect(
      scheduleWindow({
        trigger: 'sunrise',
        offset_minutes: 30,
        start_time: '06:30:00',
        end_time: '09:00:00',
      }),
    ).toBe('Sunrise + 30 min to 9:00 am');
  });
});

describe('nextRun', () => {
  // NOW is Sunday 2026-08-23 at 18:30.
  it('finds the soonest start still ahead today', () => {
    const soon = schedule({ id: 'later', days: [0], start_time: '20:00:00' });
    const gone = schedule({ id: 'gone', days: [0], start_time: '09:00:00' });
    expect(nextRun([gone, soon], NOW)?.row.id).toBe('later');
  });

  it('rolls on to the next day the schedule runs', () => {
    const monday = schedule({ id: 'mon', days: [1], start_time: '07:00:00' });
    const next = nextRun([monday], NOW);
    expect(next?.at.getDate()).toBe(24);
    expect(next?.at.getHours()).toBe(7);
  });

  it('skips paused schedules', () => {
    expect(nextRun([schedule({ days: [1], enabled: false })], NOW)).toBeNull();
  });

  it('marks a sunrise row as approximate', () => {
    const dawn = schedule({ days: [1], trigger: 'sunrise', offset_minutes: 30 });
    expect(nextRun([dawn], NOW)?.approximate).toBe(true);
  });

  it('says the whole thing in one line', () => {
    const dawn = schedule({
      days: [1],
      trigger: 'sunrise',
      offset_minutes: 30,
      area_name: 'Roof deck',
      place_name: 'Harbour House',
    });
    expect(nextRunLine([dawn], NOW)).toBe(
      'Roof deck at Harbour House starts tomorrow at Sunrise + 30 min.',
    );
  });

  it('says so when everything is paused, and when nothing is due', () => {
    expect(nextRunLine([schedule({ enabled: false })], NOW)).toBe(
      'Nothing is scheduled to run. Every schedule is paused.',
    );
    expect(nextRunLine([schedule({ days: [] })], NOW)).toBe('Nothing is due in the next week.');
  });
});

describe('runningNow', () => {
  it('is true inside the window on a day it runs', () => {
    expect(runningNow(schedule({ days: [0], start_time: '18:00:00', end_time: '20:00:00' }), NOW)).toBe(
      true,
    );
  });

  it('is false on a day it does not run, and while it is paused', () => {
    expect(runningNow(schedule({ days: [1], start_time: '18:00:00' }), NOW)).toBe(false);
    expect(runningNow(schedule({ days: [0], enabled: false }), NOW)).toBe(false);
  });

  it('handles a window that wraps past midnight', () => {
    expect(runningNow(schedule({ days: [0], start_time: '17:00:00', end_time: '02:00:00' }), NOW)).toBe(
      true,
    );
  });
});

describe('timeline', () => {
  it('starts today and skips days nothing runs on', () => {
    const sunday = schedule({ id: 'sun', days: [0] });
    const tuesday = schedule({ id: 'tue', days: [2] });
    const days = timeline([sunday, tuesday], 7, NOW);
    expect(days.map((d) => d.title)).toEqual(['Today', 'Tuesday, Aug 25']);
  });

  it('sorts each day by when it starts', () => {
    const late = schedule({ id: 'late', days: [0], start_time: '19:00:00' });
    const early = schedule({ id: 'early', days: [0], start_time: '07:00:00' });
    expect(timeline([late, early], 7, NOW)[0].rows.map((r) => r.id)).toEqual(['early', 'late']);
  });

  it('lists a schedule under every day it runs', () => {
    const daily = schedule({ id: 'daily', days: [0, 1, 2, 3, 4, 5, 6] });
    expect(timeline([daily], 3, NOW)).toHaveLength(3);
  });
});

describe('filterPlays', () => {
  const plays = [
    playRow('2026-08-23T09:00:00', { id: '1', location_id: 'p1', zone_id: 'a1', result: 'left' }),
    playRow('2026-08-22T09:00:00', { id: '2', location_id: 'p1', zone_id: 'a2', result: null }),
    playRow('2026-08-21T09:00:00', { id: '3', location_id: 'p2', zone_id: 'a3', result: 'not_yet' }),
  ];

  it('keeps everything when nothing is set', () => {
    expect(filterPlays(plays, NO_FILTERS)).toHaveLength(3);
  });

  it('narrows to one location, then to one area', () => {
    expect(filterPlays(plays, { ...NO_FILTERS, placeId: 'p1' }).map((p) => p.id)).toEqual(['1', '2']);
    expect(filterPlays(plays, { ...NO_FILTERS, areaId: 'a2' }).map((p) => p.id)).toEqual(['2']);
  });

  it('separates a reported result from an unreported run', () => {
    expect(filterPlays(plays, { ...NO_FILTERS, result: 'left' }).map((p) => p.id)).toEqual(['1']);
    expect(filterPlays(plays, { ...NO_FILTERS, result: 'none' }).map((p) => p.id)).toEqual(['2']);
  });

  it('reads the dates as the person own days, both ends inside', () => {
    expect(
      filterPlays(plays, { ...NO_FILTERS, from: '2026-08-22', to: '2026-08-23' }).map((p) => p.id),
    ).toEqual(['1', '2']);
    expect(filterPlays(plays, { ...NO_FILTERS, from: '2026-08-23' }).map((p) => p.id)).toEqual(['1']);
    expect(filterPlays(plays, { ...NO_FILTERS, to: '2026-08-21' }).map((p) => p.id)).toEqual(['3']);
  });

  it('stacks the filters together', () => {
    expect(
      filterPlays(plays, { ...NO_FILTERS, placeId: 'p1', result: 'left', from: '2026-08-23' }),
    ).toHaveLength(1);
  });

  it('counts what is on screen against what there is', () => {
    expect(playCountLine(3, 3)).toBe('3 runs');
    expect(playCountLine(1, 1)).toBe('1 run');
    expect(playCountLine(2, 9)).toBe('2 of 9 runs');
    expect(playCountLine(0, 0)).toBe('Nothing has played yet.');
  });
});
