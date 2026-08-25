/**
 * The schedule, as a timeline of what will actually happen.
 *
 * A list of rules is not a schedule a person can read. This turns the rules
 * into the runs they produce: today first, then the days after it, each run
 * with the time it starts, the time it ends and whether it is the one going
 * on right now.
 *
 * Everything is pure and takes the moment it is asked about. Sunrise and
 * sunset come in through `solarStart`, so a run anchored to the sun moves
 * from one day to the next the way the sun does.
 */

import { clockMinutes } from './homeState';
import { solarStart, wrapMinutes, type Coords } from './sun';

export type ScheduleTrigger = 'time' | 'sunrise' | 'sunset';

export const TRIGGER_LABEL: Record<ScheduleTrigger, string> = {
  time: 'At a time',
  sunrise: 'At sunrise',
  sunset: 'At sunset',
};

export interface TimelineSchedule {
  id: string;
  /** 0 is Sunday, 6 is Saturday */
  days: number[];
  /** minutes past midnight. The anchor for a run set to a time. */
  startMinutes: number;
  endMinutes: number;
  enabled: boolean;
  trigger: ScheduleTrigger;
  /** minutes before or after sunrise or sunset */
  offsetMinutes: number;
}

export interface Occurrence<T extends TimelineSchedule> {
  key: string;
  schedule: T;
  start: Date;
  end: Date;
  /** true when the sun time behind it is the fallback rather than a real one */
  estimated: boolean;
  /** true while this run is the one happening right now */
  running: boolean;
}

export interface ScheduleDay<T extends TimelineSchedule> {
  key: string;
  heading: string;
  items: Occurrence<T>[];
}

export interface TimelineOptions {
  /** how many days to lay out, today included */
  days?: number;
  /** where the place is, for a run anchored to the sun */
  coords?: Coords | null;
}

/** How long a run lasts, in minutes. One that ends before it starts crosses midnight. */
export function runLength(s: TimelineSchedule): number {
  const raw = s.endMinutes - s.startMinutes;
  return raw > 0 ? raw : raw + 1440;
}

/** When this run starts on this day, and whether the sun time is a real one. */
export function startOn(
  s: TimelineSchedule,
  day: Date,
  coords: Coords | null = null,
): { minutes: number; estimated: boolean } {
  if (s.trigger === 'time') return { minutes: s.startMinutes, estimated: false };
  const sun = solarStart(s.trigger, day, coords);
  return { minutes: wrapMinutes(sun.minutes + s.offsetMinutes), estimated: sun.estimated };
}

/** "2026-08-25", in this phone's own timezone. */
function keyOf(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
    day.getDate(),
  ).padStart(2, '0')}`;
}

/** "Today", "Tomorrow", then the weekday, then the date. */
export function upcomingHeading(day: Date, now: Date): string {
  const a = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ahead = Math.round((a - b) / 86_400_000);

  if (ahead === 0) return 'Today';
  if (ahead === 1) return 'Tomorrow';
  if (ahead > 1 && ahead < 7) return day.toLocaleDateString(undefined, { weekday: 'long' });
  return day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** The same words, lowercase, for the middle of a sentence. */
export function upcomingWord(day: Date, now: Date): string {
  const heading = upcomingHeading(day, now);
  return heading === 'Today' || heading === 'Tomorrow' ? heading.toLowerCase() : heading;
}

/**
 * Every run in the next few days, one bucket a day.
 *
 * A day with nothing on it is left out rather than shown empty, because a
 * timeline of empty days is a longer way of saying nothing is set.
 */
export function scheduleTimeline<T extends TimelineSchedule>(
  schedules: T[],
  now: Date,
  { days = 7, coords = null }: TimelineOptions = {},
): ScheduleDay<T>[] {
  const out: ScheduleDay<T>[] = [];

  for (let ahead = 0; ahead < days; ahead++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead);
    const items: Occurrence<T>[] = [];

    for (const s of schedules) {
      if (s.days.length === 0) continue;
      if (!s.days.includes(day.getDay())) continue;

      const { minutes, estimated } = startOn(s, day, coords);
      const start = new Date(day);
      start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      const end = new Date(start.getTime() + runLength(s) * 60_000);

      items.push({
        key: `${s.id}:${keyOf(day)}`,
        schedule: s,
        start,
        end,
        estimated,
        running:
          s.enabled && now.getTime() >= start.getTime() && now.getTime() < end.getTime(),
      });
    }

    if (items.length === 0) continue;
    items.sort((a, b) => a.start.getTime() - b.start.getTime());
    out.push({ key: keyOf(day), heading: upcomingHeading(day, now), items });
  }

  return out;
}

/** The first run that has not started yet. */
export function nextOccurrence<T extends TimelineSchedule>(
  timeline: ScheduleDay<T>[],
  now: Date,
): Occurrence<T> | null {
  for (const day of timeline) {
    for (const item of day.items) {
      if (!item.schedule.enabled) continue;
      if (item.start.getTime() > now.getTime()) return item;
    }
  }
  return null;
}

/**
 * "Next: tomorrow at 7:00 AM, Back balcony."
 *
 * The place is named when there is one, because a person with two places
 * needs to know which of them is about to make a noise.
 */
export function nextRunLine(
  next: { start: Date; estimated?: boolean } | null,
  now: Date,
  placeName?: string | null,
): string | null {
  if (!next) return null;
  const when = upcomingWord(next.start, now);
  const time = clockMinutes(next.start.getHours() * 60 + next.start.getMinutes());
  const where = placeName ? `, ${placeName}` : '';
  return `Next: ${when} at ${time}${where}`;
}

/** "6:00 AM to 8:00 AM", the way one card says its own hours. */
export function occurrenceHours(item: { start: Date; end: Date }): string {
  const from = clockMinutes(item.start.getHours() * 60 + item.start.getMinutes());
  const to = clockMinutes(item.end.getHours() * 60 + item.end.getMinutes());
  return `${from} to ${to}`;
}
