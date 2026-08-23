import { AppState } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SYSTEM_PROFILES,
  type AudioProfile,
  type ProfileKind,
  type ProfileParams,
} from '../core/profiles';
import type { OutputKind } from '../core/profiles';
import { useAccount, type SimulatedDevice, type SpeakerKind } from '../state/useAccount';
import { useHistory, type SessionEntry, type SessionSource } from '../state/useHistory';
import { useProfiles } from '../state/useProfiles';
import { useSchedules, type Executor, type Schedule } from '../state/useSchedules';
import {
  askForMoveUp,
  markMoveUpDone,
  moveUpDone,
  moveUpPending,
} from './guestMigration';
import { sessionRecorder } from './sessionRecorder';
import { getSupabase, isMissingOnServer } from './supabase';
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
  toLocal: (row: R, match: L | undefined) => L
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
}

const OUTPUT_KINDS: OutputKind[] = [
  'phone',
  'bt_speaker',
  'pigeonx_emitter',
  'simulated',
];

export function historyRowToEntry(
  row: HistoryRow,
  nameFor: (profileId: string | null) => string
): SessionEntry {
  const startedAt = Date.parse(row.started_at ?? '') || 0;
  const endedAt = row.ended_at ? Date.parse(row.ended_at) : null;
  const output = OUTPUT_KINDS.includes(row.output_kind as OutputKind)
    ? (row.output_kind as OutputKind)
    : 'phone';
  const source: SessionSource =
    row.source === 'schedule' || row.source === 'remote' ? row.source : 'manual';

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
    remoteId: row.id,
    synced: true,
  };
}

/**
 * What played on this phone plus what played anywhere else, in one list, with
 * nothing shown twice.
 */
export function mergeHistory(
  local: SessionEntry[],
  remote: SessionEntry[]
): SessionEntry[] {
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

export interface ScheduleRow extends RemoteRow {
  zone_id?: string | null;
  profile_id?: string | null;
  days?: number[] | null;
  start_time?: string | null;
  end_time?: string | null;
  enabled?: boolean | null;
  executor?: string | null;
}

export function scheduleFromRow(
  row: ScheduleRow,
  match: Schedule | undefined,
  nameFor: (remoteProfileId: string | null) => { id: string; name: string }
): Schedule {
  const sound = nameFor(row.profile_id ?? null);
  return {
    id: match?.id ?? `sch_${row.id}`,
    name: match?.name ?? sound.name,
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

export interface DeviceRow extends RemoteRow {
  kind?: string | null;
  name?: string | null;
  last_seen_at?: string | null;
}

const SPEAKER_KINDS: SpeakerKind[] = ['simulated', 'pigeonx_emitter', 'bt_speaker'];

export function deviceFromRow(
  row: DeviceRow,
  match: SimulatedDevice | undefined
): SimulatedDevice {
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

export function soundFromRow(
  row: SoundRow,
  match: AudioProfile | undefined
): AudioProfile {
  const kind = PROFILE_KINDS.includes(row.kind as ProfileKind)
    ? (row.kind as ProfileKind)
    : 'tone';
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
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, reason === 'sign-in' ? 0 : DEBOUNCE_MS);
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

  // Sounds go first: a schedule and a play both point at one.
  await syncSounds(sb, userId, report);
  const catalogue = await loadSoundCatalogue(sb, userId);
  await syncSchedules(sb, userId, catalogue, report);
  await syncSpeakers(sb, userId, report);
  await pushPlays(sb, userId, catalogue, report);

  await sessionRecorder.flush();

  if ((await moveUpPending()) && report.skipped.length === 0) {
    await markMoveUpDone();
  }

  return report;
}

/* ── sounds ───────────────────────────────────────────────────────────────── */

export interface SoundCatalogue {
  /** the id the account uses for one of our built-in sounds */
  remoteBySlug: Map<string, string>;
  /** the sound on this phone that a remote id belongs to */
  localByRemote: Map<string, string>;
}

async function loadSoundCatalogue(
  sb: SupabaseClient,
  userId: string
): Promise<SoundCatalogue> {
  const catalogue: SoundCatalogue = {
    remoteBySlug: new Map(),
    localByRemote: new Map(),
  };

  const { data, error } = await sb
    .from('audio_profiles')
    .select('id, slug, is_system, owner_user_id')
    .or(`is_system.eq.true,owner_user_id.eq.${userId}`);

  if (error || !data) return catalogue;

  for (const row of data as { id: string; slug: string | null }[]) {
    if (row.slug) catalogue.remoteBySlug.set(row.slug, row.id);
  }
  for (const sound of useProfiles.getState().saved) {
    if (sound.remoteId) catalogue.localByRemote.set(sound.remoteId, sound.id);
  }
  return catalogue;
}

/** The account's id for a sound on this phone, when there is one. */
export function remoteSoundId(
  localId: string,
  catalogue: SoundCatalogue
): string | null {
  const built = SYSTEM_PROFILES.find((p) => p.id === localId);
  if (built) return catalogue.remoteBySlug.get(localId) ?? null;
  const mine = useProfiles.getState().saved.find((p) => p.id === localId);
  return mine?.remoteId ?? null;
}

async function syncSounds(
  sb: SupabaseClient,
  userId: string,
  report: SyncReport
): Promise<void> {
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
    (row, match) => soundFromRow(row, match) as AudioProfile & LocalRow
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
      const { error: e } = await sb
        .from('audio_profiles')
        .update(payload)
        .eq('id', sound.remoteId);
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

/* ── schedules ────────────────────────────────────────────────────────────── */

async function syncSchedules(
  sb: SupabaseClient,
  userId: string,
  catalogue: SoundCatalogue,
  report: SyncReport
): Promise<void> {
  const local = useSchedules.getState().schedules;

  const { data, error } = await sb
    .from('user_schedules')
    .select(
      'id, zone_id, profile_id, days, start_time, end_time, enabled, executor, updated_at, created_at'
    )
    .eq('user_id', userId);

  if (error) {
    if (isMissingOnServer(error)) report.skipped.push('schedules');
    return;
  }

  const nameFor = (remoteId: string | null) => {
    const localId = remoteId ? catalogue.localByRemote.get(remoteId) : undefined;
    const slug = remoteId
      ? [...catalogue.remoteBySlug.entries()].find(([, id]) => id === remoteId)?.[0]
      : undefined;
    const sound = useProfiles.getState().byId(localId ?? slug ?? '');
    return sound
      ? { id: sound.id, name: sound.name }
      : { id: SYSTEM_PROFILES[0].id, name: SYSTEM_PROFILES[0].name };
  };

  const merged = mergeCollections(
    local,
    (data ?? []) as ScheduleRow[],
    (row, match) => scheduleFromRow(row, match, nameFor)
  );

  useSchedules.getState().setAll(merged.keep);
  report.pulled += Math.max(0, merged.keep.length - local.length);

  for (const schedule of merged.push) {
    const profileId = remoteSoundId(schedule.profileId, catalogue);
    if (!profileId) continue; // the sound has not reached the account yet
    const payload = {
      user_id: userId,
      zone_id: schedule.zoneId,
      profile_id: profileId,
      days: schedule.days,
      start_time: minutesToTime(schedule.startMinutes),
      end_time: minutesToTime(schedule.endMinutes),
      enabled: schedule.enabled,
      executor: schedule.executor,
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

/* ── speakers ─────────────────────────────────────────────────────────────── */

async function syncSpeakers(
  sb: SupabaseClient,
  userId: string,
  report: SyncReport
): Promise<void> {
  const local = useAccount.getState().devices;

  const { data, error } = await sb
    .from('user_devices')
    .select('id, kind, name, last_seen_at, updated_at, created_at')
    .eq('user_id', userId);

  if (error) {
    if (isMissingOnServer(error)) report.skipped.push('speakers');
    return;
  }

  const merged = mergeCollections(
    local,
    (data ?? []) as DeviceRow[],
    (row, match) => deviceFromRow(row, match)
  );

  useAccount.getState().setDevices(merged.keep);
  report.pulled += Math.max(0, merged.keep.length - local.length);

  for (const speaker of merged.push) {
    const payload = { user_id: userId, kind: speaker.kind, name: speaker.name };
    if (speaker.remoteId) {
      const { error: e } = await sb
        .from('user_devices')
        .update(payload)
        .eq('id', speaker.remoteId);
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

async function pushPlays(
  sb: SupabaseClient,
  userId: string,
  catalogue: SoundCatalogue,
  report: SyncReport
): Promise<void> {
  const waiting = useHistory
    .getState()
    .entries.filter((e) => !e.synced && !e.remoteId && e.zoneId === null);

  for (const entry of waiting.slice(0, 50)) {
    const profileId = remoteSoundId(entry.profileId, catalogue);
    if (!profileId) continue;

    const { data: created, error } = await sb
      .from('sessions')
      .insert({
        user_id: userId,
        zone_id: null,
        profile_id: profileId,
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
export async function fetchRemoteHistory(
  window: HistoryWindow
): Promise<SessionEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb.auth.getUser();
  if (!data.user) return [];

  const { data: rows, error } = await sb.rpc('history', {
    from: window.from.toISOString(),
    to: window.to.toISOString(),
  });
  if (error || !Array.isArray(rows)) return [];

  const nameFor = (profileId: string | null) => {
    if (!profileId) return 'A sound';
    const mine = useProfiles
      .getState()
      .saved.find((p) => p.remoteId === profileId);
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
