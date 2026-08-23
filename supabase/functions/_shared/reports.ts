/**
 * Deno-runnable copy of `packages/core/src/reports.ts`. Kept identical in
 * behaviour, not shared, for the reason given in `billing.ts` here.
 * `packages/core/src/edge-parity.test.ts` fails if the two drift.
 */

const DAY_MS = 86_400_000;

function toDateString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * The Monday (UTC) of the ISO week containing `date`, as `YYYY-MM-DD`.
 * Weeks start on Monday because a hospitality week does: Sunday is the end of
 * the busy stretch, not the beginning of a new one.
 */
export function isoWeekStart(date: Date): string {
  const ms = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  // getUTCDay: 0 = Sunday. Shift so Monday is 0 and Sunday is 6.
  const offset = (new Date(ms).getUTCDay() + 6) % 7;
  return toDateString(ms - offset * DAY_MS);
}

/** The Monday of the last week that has actually finished. */
export function lastCompleteWeekStart(now: Date = new Date()): string {
  const thisWeek = new Date(`${isoWeekStart(now)}T00:00:00Z`).getTime();
  return toDateString(thisWeek - 7 * DAY_MS);
}

/** The Sunday that closes the week beginning `weekStart`. */
export function weekEnd(weekStart: string): string {
  return toDateString(new Date(`${weekStart}T00:00:00Z`).getTime() + 6 * DAY_MS);
}

export interface WeeklyReportData {
  week_start: string;
  week_end: string;
  location_name: string;
  sessions: number;
  total_minutes: number;
  zones_active: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-08-10` → `Aug 10, 2026`. */
export function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** `312.5` → `5 hours 13 minutes`; under an hour, just the minutes. */
export function formatRunTime(totalMinutes: number): string {
  const minutes = Math.round(totalMinutes);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return plural(rest, 'minute');
  if (rest === 0) return plural(hours, 'hour');
  return `${plural(hours, 'hour')} ${plural(rest, 'minute')}`;
}

/**
 * The email body. Plain sentences, no jargon, no em dashes: whoever opens this
 * is a general manager, not an operator of a deterrent system.
 */
export function weeklyReportEmail(data: WeeklyReportData): { subject: string; body: string } {
  const subject = `${data.location_name}: week of ${formatDay(data.week_start)}`;

  if (data.sessions === 0) {
    return {
      subject,
      body: [
        `Nothing ran at ${data.location_name} between ${formatDay(data.week_start)} and ${formatDay(data.week_end)}.`,
        '',
        'If that is a surprise, check that a device is online and that the schedule is switched on.',
        '',
        'PigeonX',
      ].join('\n'),
    };
  }

  return {
    subject,
    body: [
      `${data.location_name}, ${formatDay(data.week_start)} to ${formatDay(data.week_end)}:`,
      '',
      `${plural(data.sessions, 'run')} in total.`,
      `${formatRunTime(data.total_minutes)} of run time.`,
      `${plural(data.zones_active, 'area')} covered.`,
      '',
      'PigeonX',
    ].join('\n'),
  };
}
