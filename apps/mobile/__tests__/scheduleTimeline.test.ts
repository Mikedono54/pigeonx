import {
  TRIGGER_LABEL,
  nextOccurrence,
  nextRunLine,
  occurrenceHours,
  runLength,
  scheduleTimeline,
  startOn,
  upcomingHeading,
  type TimelineSchedule,
} from '../src/core/scheduleTimeline';
import { FALLBACK_SUNRISE_MINUTES } from '../src/core/sun';

/** 25 August 2026 is a Tuesday. */
const TUESDAY_MORNING = new Date(2026, 7, 25, 6, 30);

function schedule(over: Partial<TimelineSchedule> = {}): TimelineSchedule {
  return {
    id: 'sch_1',
    days: [0, 1, 2, 3, 4, 5, 6],
    startMinutes: 7 * 60,
    endMinutes: 8 * 60,
    enabled: true,
    trigger: 'time',
    offsetMinutes: 0,
    ...over,
  };
}

describe('how long one run lasts', () => {
  it('measures a run inside one day', () => {
    expect(runLength(schedule())).toBe(60);
  });

  it('measures a run that crosses midnight', () => {
    expect(runLength(schedule({ startMinutes: 23 * 60, endMinutes: 60 }))).toBe(120);
  });
});

describe('when a run starts on a given day', () => {
  it('starts at the time it was given', () => {
    expect(startOn(schedule(), TUESDAY_MORNING).minutes).toBe(7 * 60);
  });

  it('moves with the sun once it is anchored to sunrise', () => {
    const s = schedule({ trigger: 'sunrise' });
    const sf = { latitude: 37.7749, longitude: -122.4194 };
    const june = startOn(s, new Date(2026, 5, 21), sf).minutes;
    const december = startOn(s, new Date(2026, 11, 21), sf).minutes;
    expect(june).not.toBe(december);
  });

  it('takes the offset with it, before or after', () => {
    const before = startOn(schedule({ trigger: 'sunrise', offsetMinutes: -30 }), TUESDAY_MORNING);
    expect(before.minutes).toBe(FALLBACK_SUNRISE_MINUTES - 30);
    expect(before.estimated).toBe(true);

    const after = startOn(schedule({ trigger: 'sunrise', offsetMinutes: 45 }), TUESDAY_MORNING);
    expect(after.minutes).toBe(FALLBACK_SUNRISE_MINUTES + 45);
  });
});

describe('the timeline', () => {
  it('opens on today, then names the days after it', () => {
    const days = scheduleTimeline([schedule()], TUESDAY_MORNING, { days: 3 });
    expect(days.map((d) => d.heading)).toEqual(['Today', 'Tomorrow', 'Thursday']);
  });

  it('leaves out a day with nothing on it', () => {
    // Tuesdays only, so only the first day of a three day window has a run.
    const days = scheduleTimeline([schedule({ days: [2] })], TUESDAY_MORNING, { days: 3 });
    expect(days).toHaveLength(1);
    expect(days[0].heading).toBe('Today');
  });

  it('says nothing at all when nothing is set', () => {
    expect(scheduleTimeline([], TUESDAY_MORNING)).toEqual([]);
  });

  it('puts the runs of one day in the order they happen', () => {
    const days = scheduleTimeline(
      [
        schedule({ id: 'late', startMinutes: 18 * 60, endMinutes: 20 * 60 }),
        schedule({ id: 'early', startMinutes: 7 * 60, endMinutes: 8 * 60 }),
      ],
      TUESDAY_MORNING,
      { days: 1 },
    );
    expect(days[0].items.map((i) => i.schedule.id)).toEqual(['early', 'late']);
  });

  it('marks the run that is happening right now', () => {
    const now = new Date(2026, 7, 25, 7, 30);
    const [today] = scheduleTimeline([schedule()], now, { days: 1 });
    expect(today.items[0].running).toBe(true);
    expect(occurrenceHours(today.items[0])).toBe('7:00 AM to 8:00 AM');
  });

  it('never says a paused run is happening', () => {
    const now = new Date(2026, 7, 25, 7, 30);
    const [today] = scheduleTimeline([schedule({ enabled: false })], now, { days: 1 });
    expect(today.items[0].running).toBe(false);
  });

  it('still shows a run that already finished today', () => {
    const now = new Date(2026, 7, 25, 12, 0);
    const [today] = scheduleTimeline([schedule()], now, { days: 1 });
    expect(today.items).toHaveLength(1);
    expect(today.items[0].running).toBe(false);
  });
});

describe('the next run', () => {
  it('finds the first one that has not started yet', () => {
    const timeline = scheduleTimeline([schedule()], TUESDAY_MORNING, { days: 3 });
    const next = nextOccurrence(timeline, TUESDAY_MORNING);
    expect(next?.start.getHours()).toBe(7);
    expect(next?.start.getDate()).toBe(25);
  });

  it('skips today once today is over and lands on tomorrow', () => {
    const evening = new Date(2026, 7, 25, 20, 0);
    const timeline = scheduleTimeline([schedule()], evening, { days: 3 });
    const next = nextOccurrence(timeline, evening);
    expect(next?.start.getDate()).toBe(26);
  });

  it('skips a paused schedule', () => {
    const timeline = scheduleTimeline([schedule({ enabled: false })], TUESDAY_MORNING, {
      days: 3,
    });
    expect(nextOccurrence(timeline, TUESDAY_MORNING)).toBeNull();
  });

  it('says when and where, in one line', () => {
    const evening = new Date(2026, 7, 25, 20, 0);
    const timeline = scheduleTimeline([schedule()], evening, { days: 3 });
    const next = nextOccurrence(timeline, evening);
    expect(nextRunLine(next, evening, 'Back balcony')).toBe(
      'Next: tomorrow at 7:00 AM, Back balcony',
    );
  });

  it('leaves the place out when there is not one', () => {
    const timeline = scheduleTimeline([schedule()], TUESDAY_MORNING, { days: 1 });
    const next = nextOccurrence(timeline, TUESDAY_MORNING);
    expect(nextRunLine(next, TUESDAY_MORNING)).toBe('Next: today at 7:00 AM');
  });

  it('says nothing when there is no next run', () => {
    expect(nextRunLine(null, TUESDAY_MORNING, 'Balcony')).toBeNull();
  });
});

describe('the words on the timeline', () => {
  it('names today, tomorrow, then the weekday, then the date', () => {
    const now = new Date(2026, 7, 25);
    expect(upcomingHeading(new Date(2026, 7, 25), now)).toBe('Today');
    expect(upcomingHeading(new Date(2026, 7, 26), now)).toBe('Tomorrow');
    expect(upcomingHeading(new Date(2026, 7, 28), now)).toBe('Friday');
    expect(upcomingHeading(new Date(2026, 8, 10), now)).not.toBe('Thursday');
  });

  it('names each trigger the way a person would say it', () => {
    expect(TRIGGER_LABEL.time).toBe('At a time');
    expect(TRIGGER_LABEL.sunrise).toBe('At sunrise');
    expect(TRIGGER_LABEL.sunset).toBe('At sunset');
  });
});
