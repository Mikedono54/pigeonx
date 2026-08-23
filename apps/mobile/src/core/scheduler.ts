/**
 * Deciding what should be playing right now, and what is next.
 *
 * Nothing here touches the sound, the phone or the clock on its own. Every
 * answer comes from the times a person picked plus the moment you hand it, so
 * the rules can be read straight off a test.
 *
 * A window that ends before it starts runs past midnight. 10 PM to 6 AM on a
 * Friday means Friday night, into Saturday morning.
 */

export interface TimeWindow {
  id: string;
  /** 0 is Sunday, 6 is Saturday */
  days: number[];
  /** minutes past midnight */
  startMinutes: number;
  endMinutes: number;
  enabled: boolean;
}

export const DAY_MINUTES = 24 * 60;

export function minutesOfDay(at: Date): number {
  return at.getHours() * 60 + at.getMinutes();
}

/** How long a window lasts, in minutes. Past midnight counts as one window. */
export function windowLength(w: TimeWindow): number {
  if (w.endMinutes === w.startMinutes) return 0;
  return w.endMinutes > w.startMinutes
    ? w.endMinutes - w.startMinutes
    : DAY_MINUTES - w.startMinutes + w.endMinutes;
}

export function runsPastMidnight(w: TimeWindow): boolean {
  return w.endMinutes < w.startMinutes;
}

function usable(w: TimeWindow): boolean {
  return w.enabled && w.days.length > 0 && windowLength(w) > 0;
}

/** Is this window playing at that moment? */
export function isPlayingAt(w: TimeWindow, at: Date): boolean {
  if (!usable(w)) return false;

  const day = at.getDay();
  const mins = minutesOfDay(at);

  if (!runsPastMidnight(w)) {
    return w.days.includes(day) && mins >= w.startMinutes && mins < w.endMinutes;
  }

  // started today and has not run out yet
  if (w.days.includes(day) && mins >= w.startMinutes) return true;
  // started yesterday and is still going
  const yesterday = (day + 6) % 7;
  return w.days.includes(yesterday) && mins < w.endMinutes;
}

/**
 * The one window that wins right now.
 *
 * Two times can cover the same minute. The one that started most recently
 * wins, because that is the one a person just set going. A tie goes to the
 * shorter window, then to the id, so the answer never wobbles.
 */
export function playingAt<T extends TimeWindow>(windows: T[], at: Date): T | null {
  const live = windows.filter((w) => isPlayingAt(w, at));
  if (live.length === 0) return null;

  const startedAgo = (w: TimeWindow): number => {
    const mins = minutesOfDay(at);
    const since = mins - w.startMinutes;
    return since >= 0 ? since : since + DAY_MINUTES;
  };

  return live.sort((a, b) => {
    const byStart = startedAgo(a) - startedAgo(b);
    if (byStart !== 0) return byStart;
    const byLength = windowLength(a) - windowLength(b);
    if (byLength !== 0) return byLength;
    return a.id < b.id ? -1 : 1;
  })[0];
}

export interface NextRun<T> {
  window: T;
  at: Date;
}

/** The next time a window starts, after the moment you hand it. */
export function nextRun<T extends TimeWindow>(windows: T[], from: Date): NextRun<T> | null {
  let best: NextRun<T> | null = null;

  for (const w of windows) {
    if (!usable(w)) continue;
    for (let ahead = 0; ahead < 8; ahead++) {
      const day = new Date(from);
      day.setDate(from.getDate() + ahead);
      if (!w.days.includes(day.getDay())) continue;
      day.setHours(Math.floor(w.startMinutes / 60), w.startMinutes % 60, 0, 0);
      if (day.getTime() <= from.getTime()) continue;
      if (!best || day.getTime() < best.at.getTime()) {
        best = { window: w, at: day };
      }
      break;
    }
  }

  return best;
}

/** Do two windows ever cover the same minute? */
export function overlap(a: TimeWindow, b: TimeWindow): boolean {
  if (windowLength(a) === 0 || windowLength(b) === 0) return false;

  for (const day of a.days) {
    const spans = spansOf(a, day);
    for (const otherDay of b.days) {
      const otherSpans = spansOf(b, otherDay);
      for (const one of spans) {
        for (const two of otherSpans) {
          if (one.from < two.to && two.from < one.to) return true;
        }
      }
    }
  }
  return false;
}

interface Span {
  from: number;
  to: number;
}

/**
 * Where a window sits on a week-long ruler, in minutes from Sunday midnight.
 * One that runs past midnight also wraps around to the front of the week.
 */
function spansOf(w: TimeWindow, day: number): Span[] {
  const from = day * DAY_MINUTES + w.startMinutes;
  const to = from + windowLength(w);
  const week = 7 * DAY_MINUTES;
  if (to <= week) return [{ from, to }];
  return [
    { from, to: week },
    { from: 0, to: to - week },
  ];
}

/** Every pair of times that would fight over the same minute. */
export function overlappingPairs<T extends TimeWindow>(windows: T[]): [T, T][] {
  const usableOnes = windows.filter(usable);
  const pairs: [T, T][] = [];
  for (let i = 0; i < usableOnes.length; i++) {
    for (let j = i + 1; j < usableOnes.length; j++) {
      if (overlap(usableOnes[i], usableOnes[j])) {
        pairs.push([usableOnes[i], usableOnes[j]]);
      }
    }
  }
  return pairs;
}

/** How long until a window stops, in milliseconds. */
export function msUntilEnd(w: TimeWindow, at: Date): number {
  if (!isPlayingAt(w, at)) return 0;
  const mins = minutesOfDay(at);
  const left = w.endMinutes > mins ? w.endMinutes - mins : DAY_MINUTES - mins + w.endMinutes;
  return left * 60_000 - at.getSeconds() * 1000 - at.getMilliseconds();
}
