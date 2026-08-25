/**
 * Pure helpers. Everything here takes plain values and returns plain values,
 * so the words on screen can be tested without a browser or a database.
 */

import {
  AREA_SIZE_LABELS,
  AUDIBLE_BAND_LOW_HZ,
  AUDIBLE_BAND_TOP_HZ,
  AUDIBLE_LABELS,
  BIRD_TARGET_LABELS,
  OUTPUT_CEILING_HZ,
  OUTPUT_LABELS,
  PLACE_KIND_LABELS,
  PRICE_PER_LOCATION,
  SESSION_RESULT_LABELS,
  type AudibleState,
  type OutputKind,
  type ScheduleTrigger,
  type SessionResult,
} from './labels';
import type {
  Area,
  AreaFeedback,
  DeviceKind,
  Executor,
  LiveArea,
  Place,
  PlaceReport,
  Play,
  ProtectionPlan,
  ScheduleRow,
  Sound,
  Speaker,
} from './types';

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

/** `2026-05-02T10:00:00Z` as `May 2, 2026`, when the time of day does not matter. */
export function dateLabel(iso: string | null, locale = 'en-US'): string {
  if (!iso) return 'Not yet';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not yet';
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
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

/** `$29/month per location` maths, printed whole. */
export function monthlyTotal(places: number, perPlace = PRICE_PER_LOCATION): string {
  const total = Math.max(0, places) * perPlace;
  return `$${total}`;
}

/* ── the personalization line ──────────────────────────────────────────── */

/**
 * A location's own answers, in one line under its name:
 * `Storefront · Pigeons · Medium · People nearby · Keep it quiet`.
 *
 * Unanswered questions are left out rather than printed as blanks. A location
 * nobody has personalized yet gets one sentence pointing at the sheet.
 */
export function placeLine(place: Place | null): string {
  if (!place) return '';
  const parts: string[] = [];
  if (place.kind) parts.push(PLACE_KIND_LABELS[place.kind]);
  if (place.target) parts.push(BIRD_TARGET_LABELS[place.target]);
  if (place.area_size) parts.push(AREA_SIZE_LABELS[place.area_size]);
  if (place.people_nearby) parts.push('People nearby');
  if (place.limit_audible) parts.push('Keep it quiet');
  if (place.birds_active) parts.push(`Birds show up ${place.birds_active}`);
  if (parts.length === 0) return 'Nothing set yet. Answer a few questions about this location.';
  return parts.join(' · ');
}

/* ── sounds ────────────────────────────────────────────────────────────── */

/** Recordings are a spread of pitches; we treat their peak as 8 kHz. */
const SAMPLE_PEAK_HZ = 8000;

function num(params: Record<string, unknown>, key: string): number {
  const value = params[key];
  return typeof value === 'number' ? value : 0;
}

/** The highest pitch a sound puts out, read from the `params` column. */
export function peakFreqHz(sound: Sound): number {
  switch (sound.kind) {
    case 'tone':
    case 'pulse':
      return num(sound.params, 'freqHz');
    case 'sweep':
      return Math.max(num(sound.params, 'fromHz'), num(sound.params, 'toHz'));
    case 'sample':
      return SAMPLE_PEAK_HZ;
    default:
      return 0;
  }
}

/**
 * Whether a person nearby will hear this sound, out of this speaker.
 *
 * The output matters for one sound only, and it matters absolutely: 22 kHz is
 * typically inaudible when a PigeonX speaker plays it, and simply silent when
 * a phone tries to.
 */
export function audibleState(sound: Sound, output: OutputKind): AudibleState {
  if (sound.kind === 'sample') return 'audible';
  const peak = peakFreqHz(sound);
  if (peak > AUDIBLE_BAND_TOP_HZ) {
    return OUTPUT_CEILING_HZ[output] >= peak ? 'inaudible' : 'speaker_only';
  }
  if (peak >= AUDIBLE_BAND_LOW_HZ) return 'maybe';
  return 'audible';
}

/** The tag printed beside a sound in the picker. */
export function audibleTag(sound: Sound, output: OutputKind): string {
  return AUDIBLE_LABELS[audibleState(sound, output)];
}

export function outputLabel(output: OutputKind | null): string {
  return output ? OUTPUT_LABELS[output] : 'Not set';
}

/* ── protection plans ──────────────────────────────────────────────────── */

const PLAN_DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** A plan's days, where 1 is Monday and 7 is Sunday. */
export function formatPlanDays(days: number[]): string {
  const clean = [...new Set(days.filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b);
  if (clean.length === 0) return 'No days';
  if (clean.length === 7) return 'Every day';
  if (clean.length === 5 && clean.join() === '1,2,3,4,5') return 'Mon to Fri';
  if (clean.length === 2 && clean.join() === '6,7') return 'Sat and Sun';
  return clean.map((d) => PLAN_DAY_NAMES[d]).join(', ');
}

/** `10:00 pm to 6:00 am`, or nothing when quiet hours are not set. */
export function quietHoursLabel(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  return `Quiet ${formatWindow(start, end)}`;
}

/** The gap between sounds, in whatever unit reads plainest. */
export function intervalLabel(seconds: number): string {
  if (seconds <= 0) return 'Back to back';
  if (seconds < 60) return `${seconds} sec between sounds`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min between sounds`;
}

/**
 * How a plan is protecting an area, in one line under the area's name:
 * `Pigeon Rotation · 2 sounds, mixed up · 15 min sessions · PigeonX speaker`.
 */
export function planLine(plan: ProtectionPlan | null): string {
  if (!plan) return 'No protection plan yet';
  const soundWord =
    plan.sound_ids.length === 1 ? '1 sound' : `${plan.sound_ids.length} sounds`;
  const parts = [
    plan.name,
    plan.randomize_order ? `${soundWord}, mixed up` : `${soundWord}, in order`,
    `${plan.session_minutes} min sessions`,
    OUTPUT_LABELS[plan.output],
  ];
  const quiet = quietHoursLabel(plan.quiet_start, plan.quiet_end);
  if (quiet) parts.push(quiet);
  return parts.join(' · ');
}

/** A plan's date range, when it has one. */
export function planDatesLabel(plan: ProtectionPlan): string | null {
  if (!plan.starts_on && !plan.ends_on) return null;
  if (plan.starts_on && plan.ends_on) {
    return `${dateLabel(plan.starts_on)} to ${dateLabel(plan.ends_on)}`;
  }
  if (plan.starts_on) return `From ${dateLabel(plan.starts_on)}`;
  return `Until ${dateLabel(plan.ends_on)}`;
}

/* ── what a person reported ────────────────────────────────────────────── */

/**
 * A run's result in words. An unreported run says so: nobody answered is not
 * the same as somebody answering that they could not tell.
 */
export function resultLabel(result: SessionResult | null): string {
  return result ? SESSION_RESULT_LABELS[result] : 'Not reported';
}

/**
 * What `zone_feedback` is allowed to say, added up across a location's areas.
 *
 * Every number here traces back to a person tapping one of four buttons. There
 * is no detection and no inference, so there is nothing else to print.
 */
export function feedbackLine(rows: AreaFeedback[]): string {
  const total = rows.reduce((n, r) => n + r.sessions_total, 0);
  const reported = rows.reduce((n, r) => n + r.sessions_with_result, 0);
  if (total === 0) return 'Nothing has run here yet.';
  if (reported === 0) return `Nobody has reported a result on the ${total} runs here yet.`;
  const left = rows.reduce((n, r) => n + r.left_count, 0);
  const some = rows.reduce((n, r) => n + r.some_left_count, 0);
  const notYet = rows.reduce((n, r) => n + r.not_yet_count, 0);
  const counts = [
    `${left} they left`,
    `${some} some left`,
    `${notYet} not yet`,
  ].join(', ');
  return `${reported} of ${total} runs reported. ${counts}.`;
}

/* ── areas that need attention ─────────────────────────────────────────── */

export type Attention = {
  zone_id: string;
  zone_name: string;
  place_id: string;
  place_name: string;
  /** Plain sentences, most urgent first. */
  reasons: string[];
};

/**
 * The problems the dashboard can see from real rows: a speaker that stopped
 * answering, an area with no speaker at all, and an area nothing is set to
 * play in. Nothing here is guessed, and an area with none of them is not
 * listed at all.
 */
export function attentionList(
  places: Place[],
  areas: Area[],
  speakers: Speaker[],
  plans: ProtectionPlan[],
): Attention[] {
  const placeById = new Map(places.map((p) => [p.id, p]));
  const out: Attention[] = [];

  for (const area of areas) {
    const place = placeById.get(area.location_id);
    if (!place) continue;
    const mine = speakers.filter((s) => s.zone_id === area.id);
    const plan = plans.find((p) => p.zone_id === area.id) ?? null;
    const reasons: string[] = [];

    const offline = mine.filter((s) => s.status === 'offline');
    if (offline.length === 1) reasons.push(`${offline[0].name} is offline`);
    else if (offline.length > 1) reasons.push(`${offline.length} speakers are offline`);

    if (mine.length === 0) reasons.push('No speaker yet');
    if (!plan) reasons.push('No protection plan yet');

    if (reasons.length > 0) {
      out.push({
        zone_id: area.id,
        zone_name: area.name,
        place_id: place.id,
        place_name: place.name,
        reasons,
      });
    }
  }

  return out;
}

/** How many of a location's areas need attention. */
export function attentionCountFor(rows: Attention[], placeId: string): number {
  return rows.filter((r) => r.place_id === placeId).length;
}

/* ── the summary tiles ─────────────────────────────────────────────────── */

export type Tile = {
  key: string;
  label: string;
  value: string;
  note?: string;
};

/**
 * What the dashboard knows, counted from rows it actually has.
 *
 * A `null` means the answer has not arrived, and a tile that cannot be counted
 * is left off entirely rather than printed as a zero. The speaker tile is the
 * one judgement call: with no speakers registered anywhere, "0 online" counts
 * nothing, so the tile stays away until there is a fleet to report on.
 */
export function summaryTiles(
  input: {
    places: Place[] | null;
    speakers: Speaker[] | null;
    schedules: ScheduleRow[] | null;
    plays: Play[] | null;
    attention: Attention[] | null;
  },
  now: Date = new Date(),
): Tile[] {
  const tiles: Tile[] = [];

  if (input.places) {
    const n = input.places.length;
    tiles.push({
      key: 'locations',
      label: 'Locations protected',
      value: String(n),
      note: n === 1 ? 'property' : 'properties',
    });
  }

  if (input.speakers && input.speakers.length > 0) {
    const online = input.speakers.filter((s) => s.status === 'online').length;
    const offline = input.speakers.filter((s) => s.status === 'offline').length;
    tiles.push({
      key: 'speakers',
      label: 'Speakers online',
      value: String(online),
      note: offline === 0 ? 'none offline' : `${offline} offline`,
    });
  }

  if (input.schedules) {
    const n = input.schedules.filter((s) => s.enabled).length;
    tiles.push({
      key: 'schedules',
      label: 'Schedules active',
      value: String(n),
      note: input.schedules.length === n ? undefined : `${input.schedules.length - n} paused`,
    });
  }

  if (input.plays) {
    const start = startOfWeek(now);
    const n = input.plays.filter((p) => new Date(p.started_at) >= start).length;
    tiles.push({
      key: 'sessions',
      label: 'Sessions this week',
      value: String(n),
      note: 'since Monday',
    });
  }

  if (input.attention) {
    const n = input.attention.length;
    tiles.push({
      key: 'attention',
      label: 'Areas need attention',
      value: String(n),
      note: n === 0 ? 'everything is covered' : undefined,
    });
  }

  return tiles;
}

/** Midnight on the Monday of the week a date falls in. */
export function startOfWeek(now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/* ── the schedule timeline ─────────────────────────────────────────────── */

/**
 * When a schedule starts, said the only way the web honestly can.
 *
 * Sunrise and sunset are worked out on the device, from its own location and
 * its own clock. The dashboard holds the intent, so it prints the intent:
 * `Sunrise + 30 min`, never a time it would have to invent.
 */
export function triggerLabel(
  trigger: ScheduleTrigger,
  offsetMinutes: number,
  startTime: string,
): string {
  if (trigger === 'time') return formatTime(startTime);
  const base = trigger === 'sunrise' ? 'Sunrise' : 'Sunset';
  if (offsetMinutes === 0) return base;
  const sign = offsetMinutes > 0 ? '+' : '-';
  return `${base} ${sign} ${Math.abs(offsetMinutes)} min`;
}

/** The window a schedule covers, with the trigger at the front of it. */
export function scheduleWindow(row: {
  trigger: ScheduleTrigger;
  offset_minutes: number;
  start_time: string;
  end_time: string;
}): string {
  const start = triggerLabel(row.trigger, row.offset_minutes, row.start_time);
  return `${start} to ${formatTime(row.end_time)}`;
}

/** Minutes past midnight, from `18:30` or `18:30:00`. */
function minutesOfDay(time: string): number {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 60 + Number(m);
}

export type NextRun = {
  row: ScheduleRow;
  at: Date;
  /** True when a device works out the real time from sunrise or sunset. */
  approximate: boolean;
};

/**
 * The next schedule due to start, across every location.
 *
 * Paused schedules are not due. Sunrise and sunset rows are ordered by the
 * fallback clock time the row already stores, and marked approximate so the
 * line above the timeline never pretends to know the sun.
 */
export function nextRun(rows: ScheduleRow[], now: Date = new Date()): NextRun | null {
  let best: NextRun | null = null;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const row of rows) {
    if (!row.enabled) continue;
    if (row.days.length === 0) continue;
    const start = minutesOfDay(row.start_time);

    for (let ahead = 0; ahead < 8; ahead += 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead);
      if (!row.days.includes(day.getDay())) continue;
      if (ahead === 0 && start <= nowMinutes) continue;
      day.setMinutes(start);
      const candidate: NextRun = {
        row,
        at: day,
        approximate: row.trigger !== 'time',
      };
      if (!best || candidate.at < best.at) best = candidate;
      break;
    }
  }

  return best;
}

/** `today`, `tomorrow`, or the day's name. */
export function dayWord(at: Date, now: Date = new Date()): string {
  const days = Math.round(
    (new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86400000,
  );
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return DAY_NAMES[at.getDay()];
}

/** The one line above the timeline. */
export function nextRunLine(rows: ScheduleRow[], now: Date = new Date()): string {
  const next = nextRun(rows, now);
  if (next === null) {
    return rows.some((r) => r.enabled)
      ? 'Nothing is due in the next week.'
      : 'Nothing is scheduled to run. Every schedule is paused.';
  }
  const when = triggerLabel(next.row.trigger, next.row.offset_minutes, next.row.start_time);
  return `${next.row.area_name} at ${next.row.place_name} starts ${dayWord(next.at, now)} at ${when}.`;
}

/** True when a schedule's window covers this moment on one of its days. */
export function runningNow(row: ScheduleRow, now: Date = new Date()): boolean {
  if (!row.enabled) return false;
  if (!row.days.includes(now.getDay())) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = minutesOfDay(row.start_time);
  const end = minutesOfDay(row.end_time);
  if (end > start) return nowMinutes >= start && nowMinutes < end;
  // A window that wraps past midnight.
  return nowMinutes >= start || nowMinutes < end;
}

export type TimelineDay = {
  /** A local `YYYY-MM-DD` key. */
  key: string;
  /** `Today`, `Tomorrow`, or `Thursday`. */
  title: string;
  rows: ScheduleRow[];
};

/**
 * Today first, then the days after it, with every schedule listed under each
 * day it runs on. Days nothing runs on are left out.
 */
export function timeline(
  rows: ScheduleRow[],
  days = 7,
  now: Date = new Date(),
): TimelineDay[] {
  const out: TimelineDay[] = [];
  for (let ahead = 0; ahead < days; ahead += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead);
    const onThisDay = rows
      .filter((r) => r.days.includes(day.getDay()))
      .sort((a, b) => minutesOfDay(a.start_time) - minutesOfDay(b.start_time));
    if (onThisDay.length === 0) continue;
    out.push({
      key: dayKey(day),
      title:
        ahead === 0
          ? 'Today'
          : ahead === 1
            ? 'Tomorrow'
            : day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      rows: onThisDay,
    });
  }
  return out;
}

/* ── history filters ───────────────────────────────────────────────────── */

export type HistoryFilters = {
  /** An id, or `''` for every one of them. */
  placeId: string;
  areaId: string;
  /** A `SessionResult`, `'none'` for unreported runs, or `''` for all. */
  result: string;
  /** Local `YYYY-MM-DD` bounds, both inclusive. `''` means no bound. */
  from: string;
  to: string;
};

export const NO_FILTERS: HistoryFilters = {
  placeId: '',
  areaId: '',
  result: '',
  from: '',
  to: '',
};

/**
 * Narrow what played, in the order the filters sit on screen.
 *
 * The date bounds are read as the person's own days, not as UTC: somebody
 * asking for the 23rd means the 23rd where they are standing.
 */
export function filterPlays(plays: Play[], f: HistoryFilters): Play[] {
  return plays.filter((p) => {
    if (f.placeId && p.location_id !== f.placeId) return false;
    if (f.areaId && p.zone_id !== f.areaId) return false;
    if (f.result === 'none' && p.result !== null) return false;
    if (f.result && f.result !== 'none' && p.result !== f.result) return false;
    if (f.from || f.to) {
      const started = new Date(p.started_at);
      if (Number.isNaN(started.getTime())) return false;
      const key = dayKey(started);
      if (f.from && key < f.from) return false;
      if (f.to && key > f.to) return false;
    }
    return true;
  });
}

/** How many runs a filtered list holds, in words. */
export function playCountLine(shown: number, total: number): string {
  if (total === 0) return 'Nothing has played yet.';
  if (shown === total) return shown === 1 ? '1 run' : `${shown} runs`;
  return `${shown} of ${total} runs`;
}
