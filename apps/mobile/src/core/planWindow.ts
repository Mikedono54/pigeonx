/**
 * When a protection plan is allowed to run, and what to say when it is not.
 *
 * A plan carries quiet hours, active days and a date range. All three are
 * reasons a Start can honestly refuse, and a refusal with no reason on it is
 * just a button that does not work. Everything here is pure and takes the
 * moment it is asked about, so every line can be read off a test.
 */

import { clockMinutes } from './homeState';

/** 1 is Monday and 7 is Sunday, the way `protection_plans.days` counts. */
export const PLAN_DAY_NAMES: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

export const PLAN_WEEKDAYS = [1, 2, 3, 4, 5];
export const PLAN_WEEKEND = [6, 7];

export interface PlanWindow {
  /** "22:00", or null when the plan has no quiet hours */
  quietStart: string | null;
  quietEnd: string | null;
  /** 1 is Monday, 7 is Sunday */
  days: number[];
  /** "2026-09-01", or null for a plan with no date range */
  startsOn: string | null;
  endsOn: string | null;
}

/** Which of 1 to 7 a date falls on. */
export function planDayNumber(at: Date): number {
  const day = at.getDay();
  return day === 0 ? 7 : day;
}

/** "22:00" as minutes past midnight, or null when there is nothing to read. */
export function parseClock(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Minutes past midnight back into the "22:00" a plan stores. */
export function toClock(minutes: number): string {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Is this moment inside the plan's quiet hours?
 *
 * Quiet hours almost always run past midnight, so 10 PM to 7 AM is one window
 * and not two. A plan with only one end of it set has no quiet hours at all.
 */
export function inQuietHours(plan: PlanWindow, at: Date): boolean {
  const start = parseClock(plan.quietStart);
  const end = parseClock(plan.quietEnd);
  if (start === null || end === null || start === end) return false;

  const mins = at.getHours() * 60 + at.getMinutes();
  return start < end ? mins >= start && mins < end : mins >= start || mins < end;
}

/** "Quiet hours. This plan stays silent between 10:00 PM and 7:00 AM." */
export function quietHoursLine(plan: PlanWindow): string | null {
  const start = parseClock(plan.quietStart);
  const end = parseClock(plan.quietEnd);
  if (start === null || end === null || start === end) return null;
  return `Quiet hours. This plan stays silent between ${clockMinutes(start)} and ${clockMinutes(end)}.`;
}

/** "every day", "on weekdays", "on Monday and Thursday". */
export function describePlanDays(days: number[]): string {
  const set = [...new Set(days)].sort((a, b) => a - b);
  if (set.length === 0) return 'on no days';
  if (set.length === 7) return 'every day';
  if (set.length === 5 && PLAN_WEEKDAYS.every((d) => set.includes(d))) return 'on weekdays';
  if (set.length === 2 && PLAN_WEEKEND.every((d) => set.includes(d))) return 'on weekends';
  const names = set.map((d) => PLAN_DAY_NAMES[d]).filter(Boolean);
  if (names.length === 1) return `on ${names[0]}`;
  return `on ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "2026-09-01" as a local date at midnight, or null. */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function sameOrAfter(a: Date, b: Date): boolean {
  return a.getTime() >= b.getTime();
}

function midnight(at: Date): Date {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate());
}

/** "September 1", the way a date range reads in a sentence. */
export function dayInWords(at: Date): string {
  return at.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

export type PlanBlockReason = 'quiet' | 'days' | 'dates';

export interface PlanBlock {
  reason: PlanBlockReason;
  line: string;
}

/**
 * Why this plan cannot start right now, or null when it can.
 *
 * Quiet hours come first because they are the one a person set on purpose to
 * stop exactly this. The order after that is the order a person would check
 * it in themselves: is today one of my days, and are we inside the dates.
 */
export function planBlock(plan: PlanWindow, at: Date = new Date()): PlanBlock | null {
  if (inQuietHours(plan, at)) {
    const line = quietHoursLine(plan);
    if (line) return { reason: 'quiet', line };
  }

  const today = midnight(at);

  const startsOn = parseDay(plan.startsOn);
  if (startsOn && !sameOrAfter(today, startsOn)) {
    return { reason: 'dates', line: `This plan starts on ${dayInWords(startsOn)}.` };
  }

  const endsOn = parseDay(plan.endsOn);
  if (endsOn && !sameOrAfter(endsOn, today)) {
    return { reason: 'dates', line: `This plan finished on ${dayInWords(endsOn)}.` };
  }

  if (plan.days.length > 0 && !plan.days.includes(planDayNumber(at))) {
    return {
      reason: 'days',
      line: `This plan does not run today. It runs ${describePlanDays(plan.days)}.`,
    };
  }

  return null;
}

/** The title over a refusal, in the words of the thing that refused. */
export const PLAN_BLOCK_TITLE: Record<PlanBlockReason, string> = {
  quiet: 'Quiet hours',
  days: 'Not a day this plan runs',
  dates: 'Outside the dates for this plan',
};
