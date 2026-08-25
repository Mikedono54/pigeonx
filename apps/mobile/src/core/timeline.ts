import { NO_RESULT_LINE, SESSION_RESULT_LINE, type SessionResult } from './personalization';
import { clockTime } from './homeState';

/**
 * What played, as a timeline.
 *
 * Everything here is pure and takes the moment it is asked about, so the day
 * headings can be read straight off a test instead of depending on when the
 * suite happens to run.
 */

export interface TimelineItem {
  id: string;
  startedAt: number;
  endedAt: number | null;
  /** the protection plan that ran it, when a plan did */
  planName: string | null;
  /** the sound, which is what a run with no plan is named by */
  profileName: string;
  placeId: string | null;
  placeName: string | null;
  outputKind: string;
  result: SessionResult | null;
}

export interface TimelineDay<T extends TimelineItem> {
  /** the calendar day, for a stable key */
  key: string;
  heading: string;
  items: T[];
}

/** "2026-08-25", in this phone's own timezone. */
export function dayKey(at: number | Date): string {
  const d = at instanceof Date ? at : new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * "Today", "Yesterday", then the day itself.
 *
 * Inside the week a weekday is enough. Past that it takes a date, because
 * "Thursday" two weeks back is not a day anybody can place.
 */
export function dayHeading(at: number | Date, now: number | Date = Date.now()): string {
  const then = at instanceof Date ? at : new Date(at);
  const today = now instanceof Date ? now : new Date(now);

  const a = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = Math.round((b - a) / 86_400_000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return then.toLocaleDateString(undefined, { weekday: 'long' });
  return then.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** "9:05 AM", the same clock every other screen uses. */
export function itemTime(item: TimelineItem): string {
  return clockTime(new Date(item.startedAt));
}

/** What ran: the plan if a plan ran it, otherwise the sound. */
export function itemName(item: TimelineItem): string {
  return item.planName ?? item.profileName;
}

/** "15 min", or the honest answer for a run that never finished. */
export function durationLabel(item: TimelineItem): string {
  if (item.endedAt === null) return 'Still going';
  const minutes = Math.round((item.endedAt - item.startedAt) / 60_000);
  if (minutes < 1) return 'Under a minute';
  return `${minutes} min`;
}

/** "Most birds left", or the plain fact that nobody said. */
export function resultLabel(item: TimelineItem): string {
  return item.result ? SESSION_RESULT_LINE[item.result] : NO_RESULT_LINE;
}

/** What the result chips filter on. `none` is a session nobody answered. */
export type ResultFilter = SessionResult | 'none';

export interface TimelineFilters {
  /** null means every place, including runs that belonged to none */
  placeId?: string | null;
  result?: ResultFilter | null;
}

export function filterTimeline<T extends TimelineItem>(
  items: T[],
  { placeId = null, result = null }: TimelineFilters = {},
): T[] {
  return items.filter((item) => {
    if (placeId && item.placeId !== placeId) return false;
    if (result === 'none') return item.result === null;
    if (result && item.result !== result) return false;
    return true;
  });
}

/**
 * One bucket a day, newest day first, newest run first inside it.
 *
 * A run that came down from the account sits in the same day as one that
 * happened here, because a person does not care which phone it was.
 */
export function groupTimeline<T extends TimelineItem>(
  items: T[],
  now: number | Date = Date.now(),
): TimelineDay<T>[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKey(item.startedAt);
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }

  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => ({
      key,
      heading: dayHeading(list[0].startedAt, now),
      items: [...list].sort((a, b) => b.startedAt - a.startedAt),
    }));
}
