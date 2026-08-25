import { AppState } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SESSION_RESULTS,
  type AreaSize,
  type BirdTarget,
  type PlaceKind,
  type SessionResult,
} from '../core/personalization';
import { padSeconds, trimSeconds } from '../core/protectionPlans';
import type { ScheduleTrigger } from '../core/scheduleTimeline';
import { can } from '../core/team';
import {
  SYSTEM_PROFILES,
  type AudioProfile,
  type ProfileKind,
  type ProfileParams,
} from '../core/profiles';
import type { OutputKind } from '../core/profiles';
import { useAccount, type SimulatedDevice, type SpeakerKind } from '../state/useAccount';
import { useHistory, type SessionEntry, type SessionSource } from '../state/useHistory';
import { useOrgPlans } from '../state/useOrgPlans';
import { usePlaces } from '../state/usePlaces';
import { usePlacesHome, type HomePlace } from '../state/usePlacesHome';
import { useProfiles } from '../state/useProfiles';
import { useProtectionPlans, type ProtectionPlan } from '../state/useProtectionPlans';
import { useSchedules, type Executor, type Schedule } from '../state/useSchedules';
import { askForMoveUp, markMoveUpDone, moveUpDone, moveUpPending } from './guestMigration';
import { sessionRecorder } from './sessionRecorder';
import {
  loadBuiltInSoundIds,
  localPlaceId,
  localPlanId,
  localSoundId,
  remotePlaceId,
  remotePlanId,
  remoteSoundId,
} from './soundIds';
import { callFunction, getSupabase, isMissingOnServer } from './supabase';
import { setChangeHandler, somethingChanged, type ChangeReason } from './syncSignal';

/**
 * Keeping this phone and the account the same.
 *
 * Rules, in one place:
 *  - Newest change wins. Every row carries the moment it last changed.
 *  - Nothing here can break a run. If the account cannot be reached, the phone
 *    keeps its own copy and tries again later.
 *  - A part of the backend that has not shipped yet is skipped, not shouted
 *    about.
 */

/* ── the shapes both sides share ──────────────────────────────────────────── */

export interface LocalRow {
  id: string;
  remoteId: string | null;
  updatedAt: number;
}

export interface RemoteRow {
  id: string;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface MergeResult<L> {
  /** what the phone should hold after the merge */
  keep: L[];
  /** the rows the account still has to be told about */
  push: L[];
}

// The two clock helpers moved next to the plan they belong to. Everything
// that already asks this file for them keeps working.
export { padSeconds, trimSeconds };

/** The moment a remote row last changed, as a number. */
export function remoteTime(row: RemoteRow): number {
  const raw = row.updated_at ?? row.created_at ?? null;
  if (!raw) return 0;
  const at = Date.parse(raw);
  return Number.isFinite(at) ? at : 0;
}

/**
 * Newest change wins, both ways.
 *
 * A row only on the phone goes up. A row only in the account comes down. A row
 * on both sides keeps whichever copy changed last.
 */
export function mergeCollections<L extends LocalRow, R extends RemoteRow>(
  local: L[],
  remote: R[],
  toLocal: (row: R, match: L | undefined) => L,
): MergeResult<L> {
  const byRemoteId = new Map<string, L>();
  for (const row of local) {
    if (row.remoteId) byRemoteId.set(row.remoteId, row);
  }

  const keep: L[] = [];
  const push: L[] = [];
  const seen = new Set<string>();

  for (const row of remote) {
    const match = byRemoteId.get(row.id);
    if (!match) {
      keep.push(toLocal(row, undefined));
      continue;
    }
    seen.add(match.id);
    if (match.updatedAt > remoteTime(row)) {
      keep.push(match);
      push.push(match);
    } else {
      keep.push(toLocal(row, match));
    }
  }

  for (const row of local) {
    if (row.remoteId && seen.has(row.id)) continue;
    if (row.remoteId && !remote.some((r) => r.id === row.remoteId)) {
      // the account has never heard of it, or lost it. Send it up again.
      keep.push({ ...row, remoteId: null });
      push.push({ ...row, remoteId: null });
      continue;
    }
    if (!row.remoteId) {
      keep.push(row);
      push.push(row);
    }
  }

  return { keep, push };
}

/* ── what played ──────────────────────────────────────────────────────────── */

export interface HistoryRow extends RemoteRow {
  started_at?: string | null;
  ended_at?: string | null;
  profile_id?: string | null;
  profile_name?: string | null;
  output_kind?: string | null;
  peak_freq_hz?: number | null;
  source?: string | null;
  zone_id?: string | null;
  /** what the person said happened, once `history()` started returning it */
  result?: string | null;
  plan_name?: string | null;
  place_name?: string | null;
  user_place_id?: string | null;
  plan_id?: string | null;
  /** the building and the part of it, for a run inside a business */
  location_id?: string | null;
  location_name?: string | null;
  zone_name?: string | null;
  /** who ran it. Only they may say how it went. */
  user_id?: string | null;
}

const OUTPUT_KINDS: OutputKind[] = ['phone', 'bt_speaker', 'pigeonx_emitter', 'simulated'];

export function historyRowToEntry(
  row: HistoryRow,
  nameFor: (profileId: string | null) => string,
): SessionEntry {
  const startedAt = Date.parse(row.started_at ?? '') || 0;
  const endedAt = row.ended_at ? Date.parse(row.ended_at) : null;
  const output = OUTPUT_KINDS.includes(row.output_kind as OutputKind)
    ? (row.output_kind as OutputKind)
    : 'phone';
  const source: SessionSource =
    row.source === 'schedule' || row.source === 'remote' ? row.source : 'manual';
  // An older server says nothing about a result, and an unreported run says
  // `unknown` for a different reason. Only the four words we know count.
  const result = SESSION_RESULTS.includes(row.result as SessionResult)
    ? (row.result as SessionResult)
    : null;

  return {
    id: `remote_${row.id}`,
    profileId: row.profile_id ?? '',
    profileName: row.profile_name ?? nameFor(row.profile_id ?? null),
    outputKind: output,
    peakFreqHz: row.peak_freq_hz ?? 0,
    startedAt,
    endedAt: endedAt && Number.isFinite(endedAt) ? endedAt : null,
    source,
    zoneId: row.zone_id ?? null,
    deviceId: null,
    placeId: null,
    placeName: row.place_name ?? null,
    locationId: row.location_id ?? null,
    locationName: row.location_name ?? null,
    areaName: row.zone_name ?? null,
    planId: null,
    planName: row.plan_name ?? null,
    result,
    // Nothing on this phone asked about a run that happened somewhere else.
    resultAsked: true,
    remoteId: row.id,
    synced: true,
  };
}

/**
 * What played on this phone plus what played anywhere else, in one list, with
 * nothing shown twice.
 */
export function mergeHistory(local: SessionEntry[], remote: SessionEntry[]): SessionEntry[] {
  const mine = new Set(local.map((e) => e.remoteId).filter(Boolean));
  const merged = [...local, ...remote.filter((e) => !mine.has(e.remoteId))];
  return merged.sort((a, b) => b.startedAt - a.startedAt);
}

/* ── turning one side's row into the other's ──────────────────────────────── */

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export function timeToMinutes(value: string | null | undefined): number {
  if (!value) return 0;
  const [h, m] = value.split(':');
  return (Number.parseInt(h ?? '0', 10) || 0) * 60 + (Number.parseInt(m ?? '0', 10) || 0);
}

/**
 * One schedule row, as both tables write it.
 *
 * `user_schedules` is one person's own times and `schedules` is a business's,
 * and every column below is on both of them. One shape, one mapper, so a time
 * anchored to sunrise means the same thing whichever list it came out of.
 */
export interface ScheduleRow extends RemoteRow {
  zone_id?: string | null;
  profile_id?: string | null;
  days?: number[] | null;
  start_time?: string | null;
  end_time?: string | null;
  enabled?: boolean | null;
  executor?: string | null;
  trigger?: string | null;
  offset_minutes?: number | null;
  plan_id?: string | null;
  quiet_start?: string | null;
  quiet_end?: string | null;
}

const TRIGGERS: ScheduleTrigger[] = ['time', 'sunrise', 'sunset'];

/** What a row cannot tell us on its own: the sound and the plan, by name. */
export interface ScheduleLookups {
  soundFor: (remoteProfileId: string | null) => { id: string; name: string };
  planFor: (remotePlanId: string | null) => { id: string; name: string } | null;
}

export function scheduleFromRow(
  row: ScheduleRow,
  match: Schedule | undefined,
  lookups: ScheduleLookups,
): Schedule {
  const sound = lookups.soundFor(row.profile_id ?? null);
  const plan = lookups.planFor(row.plan_id ?? null);
  // A column the account has an answer for wins. A column it has nothing in
  // keeps whatever this phone already knew, so a phone that set a schedule up
  // before the account could hold the whole of it does not lose the half it
  // cannot carry yet.
  const trigger = TRIGGERS.includes(row.trigger as ScheduleTrigger)
    ? (row.trigger as ScheduleTrigger)
    : (match?.trigger ?? 'time');

  return {
    trigger,
    offsetMinutes: row.offset_minutes ?? match?.offsetMinutes ?? 0,
    // The place a run looks after is still only on this phone: the account
    // knows the area, and the building it sits in comes with it.
    placeId: match?.placeId ?? null,
    placeName: match?.placeName ?? null,
    planId: plan?.id ?? match?.planId ?? null,
    planName: plan?.name ?? match?.planName ?? null,
    quietStart: trimSeconds(row.quiet_start) ?? match?.quietStart ?? null,
    quietEnd: trimSeconds(row.quiet_end) ?? match?.quietEnd ?? null,
    scope: match?.scope ?? 'user',
    id: match?.id ?? `sch_${row.id}`,
    name: match?.name ?? plan?.name ?? sound.name,
    profileId: sound.id,
    profileName: sound.name,
    days: row.days ?? [],
    startMinutes: timeToMinutes(row.start_time),
    endMinutes: timeToMinutes(row.end_time),
    enabled: row.enabled ?? true,
    executor: (row.executor === 'device' ? 'device' : 'reminder') as Executor,
    zoneId: row.zone_id ?? null,
    deviceId: match?.deviceId ?? null,
    notificationIds: match?.notificationIds ?? [],
    updatedAt: remoteTime(row),
    remoteId: row.id,
  };
}

/** The same row, going the other way. Both tables take exactly this. */
export function scheduleToRow(
  schedule: Schedule,
  remoteProfileId: string,
  remotePlan: string | null,
): ScheduleRow {
  return {
    id: schedule.remoteId ?? '',
    zone_id: schedule.zoneId,
    profile_id: remoteProfileId,
    days: schedule.days,
    start_time: minutesToTime(schedule.startMinutes),
    end_time: minutesToTime(schedule.endMinutes),
    enabled: schedule.enabled,
    executor: schedule.executor,
    trigger: schedule.trigger,
    offset_minutes: schedule.offsetMinutes,
    plan_id: remotePlan,
    quiet_start: padSeconds(schedule.quietStart),
    quiet_end: padSeconds(schedule.quietEnd),
  };
}

/** The columns both schedule tables answer with. */
const SCHEDULE_COLUMNS =
  'id, zone_id, profile_id, days, start_time, end_time, enabled, executor, trigger, offset_minutes, plan_id, quiet_start, quiet_end, updated_at, created_at';

/** What a write sends: everything but the id the account owns. */
function schedulePayload(row: ScheduleRow): Record<string, unknown> {
  const { id: _id, updated_at: _u, created_at: _c, ...rest } = row;
  return rest;
}

export interface DeviceRow extends RemoteRow {
  kind?: string | null;
  name?: string | null;
  last_seen_at?: string | null;
}

const SPEAKER_KINDS: SpeakerKind[] = ['simulated', 'pigeonx_emitter', 'bt_speaker'];

export function deviceFromRow(row: DeviceRow, match: SimulatedDevice | undefined): SimulatedDevice {
  const kind = SPEAKER_KINDS.includes(row.kind as SpeakerKind)
    ? (row.kind as SpeakerKind)
    : 'simulated';
  return {
    id: match?.id ?? `spk_${row.id}`,
    name: row.name ?? match?.name ?? 'Speaker',
    kind,
    pairedAt: match?.pairedAt ?? remoteTime(row),
    updatedAt: remoteTime(row),
    remoteId: row.id,
  };
}

export interface SoundRow extends RemoteRow {
  name?: string | null;
  description?: string | null;
  kind?: string | null;
  params?: ProfileParams | null;
  slug?: string | null;
}

const PROFILE_KINDS: ProfileKind[] = ['tone', 'sweep', 'pulse', 'sample'];

export function soundFromRow(row: SoundRow, match: AudioProfile | undefined): AudioProfile {
  const kind = PROFILE_KINDS.includes(row.kind as ProfileKind) ? (row.kind as ProfileKind) : 'tone';
  return {
    id: match?.id ?? `usr_${row.id}`,
    name: row.name ?? match?.name ?? 'My sound',
    description: row.description ?? match?.description ?? '',
    kind,
    params: (row.params ?? match?.params ?? { freqHz: 18000 }) as ProfileParams,
    minPlan: 'pro',
    isSystem: false,
    updatedAt: remoteTime(row),
    remoteId: row.id,
  };
}

/* ── the place a person is looking after ──────────────────────────────────── */

export interface UserPlaceRow extends RemoteRow {
  name?: string | null;
  kind?: string | null;
  target?: string | null;
  area_size?: string | null;
  people_nearby?: boolean | null;
  limit_audible?: boolean | null;
  birds_active?: string | null;
}

const PLACE_KINDS: PlaceKind[] = [
  'balcony',
  'roof',
  'dock',
  'storefront',
  'warehouse',
  'parking',
  'garden',
  'farm',
  'custom',
];
const BIRD_TARGETS: BirdTarget[] = [
  'pigeons',
  'gulls',
  'starlings',
  'corvids',
  'mixed_small',
  'unsure',
];
const AREA_SIZES: AreaSize[] = ['small', 'medium', 'large'];

/**
 * An answer the account gives back that this phone does not have a word for is
 * not shown as itself. A place with an unknown kind is a custom place, and a
 * place with an unknown bird is one nobody has answered for yet.
 */
export function placeFromRow(row: UserPlaceRow, match: HomePlace | undefined): HomePlace {
  const kind = PLACE_KINDS.includes(row.kind as PlaceKind) ? (row.kind as PlaceKind) : 'custom';
  const target = BIRD_TARGETS.includes(row.target as BirdTarget)
    ? (row.target as BirdTarget)
    : 'unsure';
  const areaSize = AREA_SIZES.includes(row.area_size as AreaSize)
    ? (row.area_size as AreaSize)
    : null;
  const peopleNearby = row.people_nearby ?? true;

  return {
    id: match?.id ?? `plh_${row.id}`,
    name: row.name ?? match?.name ?? 'My space',
    kind,
    target,
    areaSize,
    peopleNearby,
    limitAudible: peopleNearby ? (row.limit_audible ?? false) : false,
    birdsActive: row.birds_active ?? null,
    updatedAt: remoteTime(row),
    remoteId: row.id,
  };
}

/* ── the plan a place runs ────────────────────────────────────────────────── */

export interface ProtectionPlanRow extends RemoteRow {
  user_place_id?: string | null;
  name?: string | null;
  target?: string | null;
  sound_ids?: string[] | null;
  randomize_order?: boolean | null;
  interval_seconds?: number | null;
  session_minutes?: number | null;
  output?: string | null;
  volume?: number | null;
  quiet_start?: string | null;
  quiet_end?: string | null;
  days?: number[] | null;
  starts_on?: string | null;
  ends_on?: string | null;
}

export function planFromRow(
  row: ProtectionPlanRow,
  match: ProtectionPlan | undefined,
): ProtectionPlan {
  const output = OUTPUT_KINDS.includes(row.output as OutputKind)
    ? (row.output as OutputKind)
    : 'phone';
  const target = BIRD_TARGETS.includes(row.target as BirdTarget)
    ? (row.target as BirdTarget)
    : 'unsure';
  // A sound this phone has never heard of is dropped rather than shown as an
  // id. The plan keeps playing whatever is left of it.
  const soundIds = (row.sound_ids ?? [])
    .map((id) => localSoundId(id))
    .filter((id): id is string => id !== null);

  return {
    id: match?.id ?? `pln_${row.id}`,
    placeId: match?.placeId ?? localPlaceId(row.user_place_id) ?? '',
    name: row.name ?? match?.name ?? 'Protection plan',
    target,
    soundIds: soundIds.length > 0 ? soundIds : (match?.soundIds ?? []),
    randomizeOrder: row.randomize_order ?? true,
    intervalSeconds: row.interval_seconds ?? 0,
    sessionMinutes: row.session_minutes ?? 15,
    output,
    volume: row.volume ?? 0.85,
    quietStart: trimSeconds(row.quiet_start),
    quietEnd: trimSeconds(row.quiet_end),
    days: row.days ?? [1, 2, 3, 4, 5, 6, 7],
    startsOn: row.starts_on ?? null,
    endsOn: row.ends_on ?? null,
    updatedAt: remoteTime(row),
    remoteId: row.id,
  };
}

/* ── the part that talks to the account ───────────────────────────────────── */

export interface SyncReport {
  ran: boolean;
  pushed: number;
  pulled: number;
  /** the pieces the server does not have yet */
  skipped: string[];
}

const IDLE: SyncReport = { ran: false, pushed: 0, pulled: 0, skipped: [] };

const DEBOUNCE_MS = 1500;

let timer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<SyncReport> | null = null;
let again = false;

/** Sends everything up and pulls everything down, once. */
export async function syncNow(): Promise<SyncReport> {
  if (running) {
    again = true;
    return running;
  }
  running = runOnce().finally(() => {
    running = null;
    if (again) {
      again = false;
      syncSoon('manual');
    }
  });
  return running;
}

/** Sends everything up in a moment, once the taps stop. */
export function syncSoon(reason: ChangeReason = 'manual'): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(
    () => {
      timer = null;
      void syncNow();
    },
    reason === 'sign-in' ? 0 : DEBOUNCE_MS,
  );
}

/** Starts listening for changes and for the app coming back to the front. */
export function attachSync(): () => void {
  setChangeHandler((reason) => syncSoon(reason));

  const sub = AppState.addEventListener('change', (next) => {
    if (next === 'active') syncSoon('foreground');
  });

  syncSoon('foreground');

  return () => {
    setChangeHandler(null);
    sub.remove();
    if (timer) clearTimeout(timer);
    timer = null;
  };
}

async function runOnce(): Promise<SyncReport> {
  const sb = getSupabase();
  if (!sb) return IDLE;

  const { data } = await sb.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return IDLE;

  const report: SyncReport = { ran: true, pushed: 0, pulled: 0, skipped: [] };

  // Order matters. Sounds go first, because a schedule and a play both point
  // at one. Places go before plans, because a plan belongs to a place. Plays
  // go last, because a play can point at all three.
  await refreshSoundIds(sb);
  await syncSounds(sb, userId, report);
  await syncPlaces(sb, userId, report);
  await syncPlans(sb, userId, report);
  await syncSchedules(sb, userId, report);
  await syncOrgSchedules(sb, report);
  await syncSpeakers(sb, userId, report);
  await pushPlays(sb, userId, report);

  await sessionRecorder.flush();

  if ((await moveUpPending()) && report.skipped.length === 0) {
    await markMoveUpDone();
  }

  return report;
}

/* ── sounds ───────────────────────────────────────────────────────────────── */

async function refreshSoundIds(sb: SupabaseClient): Promise<void> {
  await loadBuiltInSoundIds(sb);
}

async function syncSounds(sb: SupabaseClient, userId: string, report: SyncReport): Promise<void> {
  const local = useProfiles
    .getState()
    .saved.map((p) => ({ ...p, remoteId: p.remoteId ?? null, updatedAt: p.updatedAt ?? 0 }));

  const { data, error } = await sb
    .from('audio_profiles')
    .select('id, name, description, kind, params, updated_at, created_at')
    .eq('owner_user_id', userId)
    .eq('is_system', false);

  if (error) {
    if (isMissingOnServer(error)) report.skipped.push('sounds');
    return;
  }

  const merged = mergeCollections(
    local as (AudioProfile & LocalRow)[],
    (data ?? []) as SoundRow[],
    (row, match) => soundFromRow(row, match) as AudioProfile & LocalRow,
  );

  useProfiles.getState().setSaved(merged.keep);
  report.pulled += Math.max(0, merged.keep.length - local.length);

  for (const sound of merged.push) {
    const payload = {
      owner_user_id: userId,
      is_system: false,
      name: sound.name,
      description: sound.description,
      kind: sound.kind,
      params: sound.params,
      min_plan: 'pro',
    };
    if (sound.remoteId) {
      const { error: e } = await sb.from('audio_profiles').update(payload).eq('id', sound.remoteId);
      if (!e) report.pushed += 1;
    } else {
      const { data: created, error: e } = await sb
        .from('audio_profiles')
        .insert(payload)
        .select('id')
        .single();
      if (!e && created) {
        useProfiles.getState().markSaved(sound.id, (created as { id: string }).id);
        report.pushed += 1;
      }
    }
  }
}

/* ── places ───────────────────────────────────────────────────────────────── */

async function syncPlaces(sb: SupabaseClient, userId: string, report: SyncReport): Promise<void> {
  const local = usePlacesHome.getState().places;

  const { data, error } = await sb
    .from('user_places')
    .select(
      'id, name, kind, target, area_size, people_nearby, limit_audible, birds_active, updated_at, created_at',
    )
    .eq('user_id', userId);

  if (error) {
    if (isMissingOnServer(error)) report.skipped.push('places');
    return;
  }

  const merged = mergeCollections(local, (data ?? []) as UserPlaceRow[], (row, match) =>
    placeFromRow(row, match),
  );

  usePlacesHome.getState().setAll(merged.keep);
  report.pulled += Math.max(0, merged.keep.length - local.length);

  for (const place of merged.push) {
    const payload = {
      user_id: userId,
      name: place.name,
      kind: place.kind,
      target: place.target,
      area_size: place.areaSize,
      people_nearby: place.peopleNearby,
      limit_audible: place.limitAudible,
      birds_active: place.birdsActive,
    };
    if (place.remoteId) {
      const { error: e } = await sb.from('user_places').update(payload).eq('id', place.remoteId);
      if (!e) report.pushed += 1;
    } else {
      const { data: created, error: e } = await sb
        .from('user_places')
        .insert(payload)
        .select('id')
        .single();
      if (!e && created) {
        usePlacesHome.getState().markSynced(place.id, (created as { id: string }).id);
        report.pushed += 1;
      }
    }
  }
}

/* ── protection plans ─────────────────────────────────────────────────────── */

async function syncPlans(sb: SupabaseClient, userId: string, report: SyncReport): Promise<void> {
  const local = useProtectionPlans.getState().plans;

  const { data, error } = await sb
    .from('protection_plans')
    .select(
      'id, user_place_id, name, target, sound_ids, randomize_order, interval_seconds, session_minutes, output, volume, quiet_start, quiet_end, days, starts_on, ends_on, updated_at, created_at',
    )
    .eq('owner_user_id', userId);

  if (error) {
    if (isMissingOnServer(error)) report.skipped.push('plans');
    return;
  }

  const merged = mergeCollections(local, (data ?? []) as ProtectionPlanRow[], (row, match) =>
    planFromRow(row, match),
  );

  useProtectionPlans.getState().setAll(merged.keep);
  report.pulled += Math.max(0, merged.keep.length - local.length);

  for (const plan of merged.push) {
    const userPlaceId = remotePlaceId(plan.placeId);
    // The place it belongs to has not gone up yet. It goes on the next pass.
    if (!userPlaceId) continue;

    const soundIds = plan.soundIds
      .map((id) => remoteSoundId(id))
      .filter((id): id is string => id !== null);

    const payload = {
      owner_user_id: userId,
      user_place_id: userPlaceId,
      name: plan.name,
      target: plan.target,
      sound_ids: soundIds,
      randomize_order: plan.randomizeOrder,
      interval_seconds: plan.intervalSeconds,
      session_minutes: plan.sessionMinutes,
      output: plan.output,
      volume: plan.volume,
      quiet_start: plan.quietStart,
      quiet_end: plan.quietEnd,
      days: plan.days,
      starts_on: plan.startsOn,
      ends_on: plan.endsOn,
    };

    if (plan.remoteId) {
      const { error: e } = await sb
        .from('protection_plans')
        .update(payload)
        .eq('id', plan.remoteId);
      if (!e) report.pushed += 1;
    } else {
      const { data: created, error: e } = await sb
        .from('protection_plans')
        .insert(payload)
        .select('id')
        .single();
      if (!e && created) {
        useProtectionPlans.getState().markSaved(plan.id, (created as { id: string }).id);
        report.pushed += 1;
      }
    }
  }
}

/* ── schedules ────────────────────────────────────────────────────────────── */

/** The sound and the plan a schedule row points at, by name, on this phone. */
export function scheduleLookups(): ScheduleLookups {
  return {
    soundFor: (remoteId) => {
      const sound = useProfiles.getState().byId(localSoundId(remoteId) ?? '');
      return sound
        ? { id: sound.id, name: sound.name }
        : { id: SYSTEM_PROFILES[0].id, name: SYSTEM_PROFILES[0].name };
    },
    planFor: (remoteId) => {
      const id = localPlanId(remoteId);
      if (!id) return null;
      const mine = useProtectionPlans.getState().byId(id);
      if (mine) return { id: mine.id, name: mine.name };
      const theirs = useOrgPlans.getState().byId(id);
      return theirs ? { id: theirs.id, name: theirs.name } : null;
    },
  };
}

/**
 * Puts the merged half of one list back without touching the other half.
 *
 * A person's own times and a business's times live in the same list on this
 * phone and in two different tables in the account, so each pass replaces only
 * the rows it is responsible for.
 */
function keepSchedules(scope: Schedule['scope'], merged: Schedule[]): void {
  const others = useSchedules.getState().schedules.filter((s) => s.scope !== scope);
  useSchedules.getState().setAll([...merged, ...others]);
}

async function syncSchedules(
  sb: SupabaseClient,
  userId: string,
  report: SyncReport,
): Promise<void> {
  const local = useSchedules.getState().schedules.filter((s) => s.scope === 'user');

  const { data, error } = await sb
    .from('user_schedules')
    .select(SCHEDULE_COLUMNS)
    .eq('user_id', userId);

  if (error) {
    if (isMissingOnServer(error)) report.skipped.push('schedules');
    return;
  }

  const lookups = scheduleLookups();
  const merged = mergeCollections(local, (data ?? []) as ScheduleRow[], (row, match) =>
    scheduleFromRow(row, match, lookups),
  );

  keepSchedules('user', merged.keep);
  report.pulled += Math.max(0, merged.keep.length - local.length);

  for (const schedule of merged.push) {
    const profileId = remoteSoundId(schedule.profileId);
    if (!profileId) continue; // the sound has not reached the account yet
    const payload = {
      user_id: userId,
      ...schedulePayload(scheduleToRow(schedule, profileId, remotePlanId(schedule.planId))),
    };
    if (schedule.remoteId) {
      const { error: e } = await sb
        .from('user_schedules')
        .update(payload)
        .eq('id', schedule.remoteId);
      if (!e) report.pushed += 1;
    } else {
      const { data: created, error: e } = await sb
        .from('user_schedules')
        .insert(payload)
        .select('id')
        .single();
      if (!e && created) {
        useSchedules.getState().markSaved(schedule.id, (created as { id: string }).id);
        report.pushed += 1;
      }
    }
  }
}

/**
 * The times a business runs on, which belong to the areas rather than to one
 * person's phone.
 *
 * Everyone on the team reads them. Only a manager may change one, which is
 * what the account already says, so a teammate's phone takes what it is given
 * and sends nothing back.
 */
async function syncOrgSchedules(sb: SupabaseClient, report: SyncReport): Promise<void> {
  const { mode, orgId, places } = usePlaces.getState();
  if (mode !== 'business' || !orgId) return;

  const areaIds = places.flatMap((p) => p.areas.map((a) => a.id));
  if (areaIds.length === 0) return;

  const local = useSchedules.getState().schedules.filter((s) => s.scope === 'org');

  const { data, error } = await sb.from('schedules').select(SCHEDULE_COLUMNS).in('zone_id', areaIds);

  if (error) {
    if (isMissingOnServer(error)) report.skipped.push('business schedules');
    return;
  }

  const lookups = scheduleLookups();
  const merged = mergeCollections(local, (data ?? []) as ScheduleRow[], (row, match) =>
    scheduleFromRow(row, match, lookups),
  );

  keepSchedules(
    'org',
    merged.keep.map((s) => ({ ...s, scope: 'org' as const })),
  );
  report.pulled += Math.max(0, merged.keep.length - local.length);

  if (!can(useAccount.getState().activeOrgRole, 'schedules')) return;

  for (const schedule of merged.push) {
    const profileId = remoteSoundId(schedule.profileId);
    // A business time belongs to an area. One with no area has nowhere to go.
    if (!profileId || !schedule.zoneId) continue;
    const payload = schedulePayload(
      scheduleToRow(schedule, profileId, remotePlanId(schedule.planId)),
    );
    if (schedule.remoteId) {
      const { error: e } = await sb.from('schedules').update(payload).eq('id', schedule.remoteId);
      if (!e) report.pushed += 1;
    } else {
      const { data: created, error: e } = await sb
        .from('schedules')
        .insert(payload)
        .select('id')
        .single();
      if (!e && created) {
        useSchedules.getState().markSaved(schedule.id, (created as { id: string }).id);
        report.pushed += 1;
      }
    }
  }
}

/* ── speakers ─────────────────────────────────────────────────────────────── */

async function syncSpeakers(sb: SupabaseClient, userId: string, report: SyncReport): Promise<void> {
  const local = useAccount.getState().devices;

  const { data, error } = await sb
    .from('user_devices')
    .select('id, kind, name, last_seen_at, updated_at, created_at')
    .eq('user_id', userId);

  if (error) {
    if (isMissingOnServer(error)) report.skipped.push('speakers');
    return;
  }

  const merged = mergeCollections(local, (data ?? []) as DeviceRow[], (row, match) =>
    deviceFromRow(row, match),
  );

  useAccount.getState().setDevices(merged.keep);
  report.pulled += Math.max(0, merged.keep.length - local.length);

  for (const speaker of merged.push) {
    const payload = { user_id: userId, kind: speaker.kind, name: speaker.name };
    if (speaker.remoteId) {
      const { error: e } = await sb.from('user_devices').update(payload).eq('id', speaker.remoteId);
      if (!e) report.pushed += 1;
    } else {
      const { data: created, error: e } = await sb
        .from('user_devices')
        .insert(payload)
        .select('id')
        .single();
      if (!e && created) {
        useAccount.getState().markDeviceSynced(speaker.id, (created as { id: string }).id);
        report.pushed += 1;
      }
    }
  }
}

/* ── what played ──────────────────────────────────────────────────────────── */

async function pushPlays(sb: SupabaseClient, userId: string, report: SyncReport): Promise<void> {
  const waiting = useHistory
    .getState()
    .entries.filter((e) => !e.synced && !e.remoteId && e.zoneId === null && e.endedAt !== null);

  for (const entry of waiting.slice(0, 50)) {
    const profileId = remoteSoundId(entry.profileId);
    if (!profileId) continue;

    const { data: created, error } = await sb
      .from('sessions')
      .insert({
        user_id: userId,
        zone_id: null,
        profile_id: profileId,
        user_place_id: remotePlaceId(entry.placeId),
        started_at: new Date(entry.startedAt).toISOString(),
        ended_at: entry.endedAt ? new Date(entry.endedAt).toISOString() : null,
        output_kind: entry.outputKind,
        peak_freq_hz: entry.peakFreqHz,
        source: entry.source,
      })
      .select('id')
      .single();

    if (error) {
      // Kept on the phone. This is fine: the list on this phone is the truth
      // until the account is ready to take it.
      if (isMissingOnServer(error)) report.skipped.push('plays');
      return;
    }
    if (created) {
      useHistory.getState().markSynced(entry.id, (created as { id: string }).id);
      report.pushed += 1;
    }
  }
}

/* ── reading what played, from everywhere ─────────────────────────────────── */

export interface HistoryWindow {
  from: Date;
  to: Date;
}

/** What played anywhere else, for the History screen. Empty when offline. */
export async function fetchRemoteHistory(window: HistoryWindow): Promise<SessionEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb.auth.getUser();
  if (!data.user) return [];

  const { data: rows, error } = await callFunction(sb, 'history', {
    from: window.from.toISOString(),
    to: window.to.toISOString(),
  });
  if (error || !Array.isArray(rows)) return [];

  const nameFor = (profileId: string | null) => {
    if (!profileId) return 'A sound';
    const mine = useProfiles.getState().saved.find((p) => p.remoteId === profileId);
    return mine?.name ?? 'A sound';
  };

  return (rows as HistoryRow[]).map((row) => historyRowToEntry(row, nameFor));
}

/** Kicks off the first move up, then the sync that carries it. */
export async function moveGuestDataUp(): Promise<void> {
  if (await moveUpDone()) return;
  await askForMoveUp();
  somethingChanged('sign-in');
}
