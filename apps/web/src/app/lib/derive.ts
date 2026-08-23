/**
 * Pure helpers. Everything here takes plain values and returns plain values,
 * so the words on screen can be tested without a browser or a database.
 */

import type { DeviceKind, Executor, LiveArea, PlaceReport } from './types';

/* ── time ──────────────────────────────────────────────────────────────── */

/** Seconds as a running clock: `12:40`, or `1:02:30` past the hour. */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

/** How long a run has been going, as a clock. */
export function elapsed(startedAt: string | null, now: Date = new Date()): string | null {
  if (!startedAt) return null;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return null;
  return clock((now.getTime() - started) / 1000);
}

/** Minutes in words: `12 min`, `1 hour`, `2 hours 5 min`. */
export function duration(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return '0 min';
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  const hourWord = hours === 1 ? '1 hour' : `${hours} hours`;
  return rest === 0 ? hourWord : `${hourWord} ${rest} min`;
}

/** `2026-08-23T14:05:00Z` as `Aug 23, 2:05 pm`. */
export function whenLabel(iso: string | null, locale = 'en-US'): string {
  if (!iso) return 'Not yet';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not yet';
  const day = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const time = d
    .toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();
  return `${day}, ${time}`;
}

/** How long ago, in the roughest honest terms. */
export function agoLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'Never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Never';
  const mins = Math.floor((now.getTime() - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return whenLabel(iso);
}

/* ── area status ───────────────────────────────────────────────────────── */

export type AreaStatus = {
  playing: boolean;
  /** `Playing 12:40` or `Quiet`. */
  label: string;
  /** The sound that is playing, or the one set for the area. */
  sound: string;
};

/** Turn one `zone_live_status` row into the words the page shows. */
export function areaStatus(row: LiveArea, now: Date = new Date()): AreaStatus {
  const sound = row.profile_name ?? 'No sound set';
  if (!row.running) return { playing: false, label: 'Quiet', sound };
  const running = elapsed(row.started_at, now);
  return { playing: true, label: running ? `Playing ${running}` : 'Playing', sound };
}

/** One line for a whole place: `2 of 5 areas playing` or `All quiet`. */
export function placeStatus(rows: LiveArea[]): string {
  if (rows.length === 0) return 'No areas yet';
  const playing = rows.filter((r) => r.running).length;
  if (playing === 0) return rows.length === 1 ? 'Quiet' : 'All quiet';
  return `${playing} of ${rows.length} ${rows.length === 1 ? 'area' : 'areas'} playing`;
}

/* ── the 7 day chart ───────────────────────────────────────────────────── */

export type DayBucket = {
  /** `2026-08-23`, in the browser's own day. */
  key: string;
  /** `Sat`. */
  label: string;
  count: number;
};

/** A local `YYYY-MM-DD` key, so days line up with the person's calendar. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Count timestamps into the last `days` days, oldest first, with empty days
 * kept so the chart never lies about a gap.
 */
export function bucketByDay(
  timestamps: Array<string | null | undefined>,
  days = 7,
  now: Date = new Date(),
): DayBucket[] {
  const buckets: DayBucket[] = [];
  const index = new Map<string, DayBucket>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const bucket: DayBucket = { key: dayKey(d), label: DAY_NAMES[d.getDay()], count: 0 };
    buckets.push(bucket);
    index.set(bucket.key, bucket);
  }
  for (const ts of timestamps) {
    if (!ts) continue;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) continue;
    const bucket = index.get(dayKey(d));
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

/** How many of the timestamps landed on today. */
export function countToday(
  timestamps: Array<string | null | undefined>,
  now: Date = new Date(),
): number {
  const today = dayKey(now);
  let n = 0;
  for (const ts of timestamps) {
    if (!ts) continue;
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime()) && dayKey(d) === today) n += 1;
  }
  return n;
}

/* ── the weekly report ─────────────────────────────────────────────────── */

export type ReportLines = {
  plays: string;
  time: string;
  areas: string;
  sentence: string;
};

/** The Monday of the week a date falls in, as `YYYY-MM-DD`. */
export function weekStart(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shift = (d.getDay() + 6) % 7; // Monday is day 0 for us
  d.setDate(d.getDate() - shift);
  return dayKey(d);
}

/** The report numbers, in the words the tile prints. */
export function formatReport(report: PlaceReport | null): ReportLines {
  const plays = report?.sessions ?? 0;
  const minutes = report?.total_minutes ?? 0;
  const areas = report?.zones_active ?? 0;
  if (plays === 0) {
    return {
      plays: '0',
      time: '0 min',
      areas: '0',
      sentence: 'Nothing has played here this week.',
    };
  }
  const playWord = plays === 1 ? '1 play' : `${plays} plays`;
  const areaWord = areas === 1 ? '1 area' : `${areas} areas`;
  return {
    plays: String(plays),
    time: duration(minutes),
    areas: String(areas),
    sentence: `${playWord} across ${areaWord}, ${duration(minutes)} of sound.`,
  };
}

/* ── schedules ─────────────────────────────────────────────────────────── */

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Day numbers (0 is Sunday) in words: `Every day`, `Mon to Fri`, `Sat, Sun`. */
export function formatDays(days: number[]): string {
  const clean = [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
  if (clean.length === 0) return 'No days';
  if (clean.length === 7) return 'Every day';
  if (clean.length === 5 && clean.join() === '1,2,3,4,5') return 'Mon to Fri';
  if (clean.length === 2 && clean.join() === '0,6') return 'Sat and Sun';
  return clean.map((d) => SHORT_DAYS[d]).join(', ');
}

/** `18:30:00` as `6:30 pm`. */
export function formatTime(value: string): string {
  const [h = '0', m = '00'] = value.split(':');
  const hour = Number(h);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? 'pm' : 'am';
  const shown = hour % 12 === 0 ? 12 : hour % 12;
  return `${shown}:${m} ${suffix}`;
}

/** A schedule window: `6:30 am to 9:00 pm`. */
export function formatWindow(start: string, end: string): string {
  return `${formatTime(start)} to ${formatTime(end)}`;
}

/** Who runs it, in the app's words. */
export function executorLabel(executor: Executor): string {
  return executor === 'device' ? 'A PigeonX speaker' : 'This phone reminds you';
}

/* ── speakers ──────────────────────────────────────────────────────────── */

export function speakerKindLabel(kind: DeviceKind): string {
  switch (kind) {
    case 'phone':
      return 'This phone';
    case 'bt_speaker':
      return 'Bluetooth speaker';
    case 'pigeonx_emitter':
      return 'PigeonX speaker';
    case 'simulated':
      return 'Test speaker';
    default:
      return 'Speaker';
  }
}

/* ── money ─────────────────────────────────────────────────────────────── */

/** `$29 per place per month` maths, printed whole. */
export function monthlyTotal(places: number, perPlace = 29): string {
  const total = Math.max(0, places) * perPlace;
  return `$${total}`;
}
