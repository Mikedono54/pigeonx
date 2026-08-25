/**
 * Every call the dashboard makes to the backend.
 *
 * Each function names the piece it needs, so a page can say "this is coming
 * online" instead of showing a blank box. Where the same answer can be read
 * straight from a table, we fall back to that and keep working.
 */

import { requireSupabase } from './supabase';
import { ComingOnline, isMissingPiece, unwrap } from './errors';
import type { OutputKind, ScheduleTrigger } from './labels';
import type {
  Area,
  AreaFeedback,
  DeviceKind,
  Executor,
  Invite,
  LiveArea,
  MemberRole,
  Membership,
  Place,
  PlaceAnswers,
  PlaceReport,
  Play,
  ProtectionPlan,
  Schedule,
  ScheduleRow,
  Sound,
  Speaker,
  TeamMember,
} from './types';

/**
 * Locations carry the personalization answers from the 2026-08-24 spec. If a
 * copy of the database has not caught up yet, the second list is the one that
 * has always been there, and the page keeps working without them.
 */
const PLACE_COLUMNS =
  'id, org_id, name, address, timezone, kind, target, area_size, people_nearby, limit_audible, birds_active';
const PLACE_COLUMNS_BASE = 'id, org_id, name, address, timezone';

/** Fill in what an older row cannot answer, rather than leaving holes. */
function withAnswers(row: Record<string, unknown>): Place {
  return {
    kind: null,
    target: null,
    area_size: null,
    people_nearby: true,
    limit_audible: false,
    birds_active: null,
    ...row,
  } as Place;
}

/* ── businesses ────────────────────────────────────────────────────────── */

export async function listBusinesses(): Promise<Membership[]> {
  const db = requireSupabase();
  const first = await db.rpc('my_memberships');
  if (!first.error) return (first.data ?? []) as Membership[];
  if (!isMissingPiece(first.error)) throw first.error;

  // Older name for the same list.
  const second = await db.rpc('my_orgs');
  if (!second.error) {
    return ((second.data ?? []) as Array<{ id: string; name: string; plan: string; role: MemberRole }>).map(
      (row) => ({ org_id: row.id, name: row.name, plan: row.plan, role: row.role }),
    );
  }
  if (!isMissingPiece(second.error)) throw second.error;

  const rows = unwrap(
    await db.from('org_members').select('org_id, role, organizations(name, plan)'),
  ) as Array<{
    org_id: string;
    role: MemberRole;
    organizations: { name: string; plan: string } | null;
  }>;
  return rows.map((r) => ({
    org_id: r.org_id,
    name: r.organizations?.name ?? 'Your business',
    plan: r.organizations?.plan ?? 'business',
    role: r.role,
  }));
}

export async function createBusiness(name: string): Promise<string> {
  const db = requireSupabase();
  const { data, error } = await db.rpc('create_org', { p_name: name });
  if (error) {
    if (isMissingPiece(error)) throw new ComingOnline('Setting up a business');
    throw error;
  }
  return data as string;
}

export async function renameBusiness(orgId: string, name: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('organizations').update({ name }).eq('id', orgId);
  if (error) throw error;
}

/* ── places ────────────────────────────────────────────────────────────── */

export async function listPlaces(orgId: string): Promise<Place[]> {
  const db = requireSupabase();
  const rich = await db
    .from('locations')
    .select(PLACE_COLUMNS)
    .eq('org_id', orgId)
    .order('name');
  if (!rich.error) return (rich.data ?? []).map((r) => withAnswers(r as never));
  if (!isMissingPiece(rich.error)) throw rich.error;

  const rows = unwrap(
    await db.from('locations').select(PLACE_COLUMNS_BASE).eq('org_id', orgId).order('name'),
  ) as Array<Record<string, unknown>>;
  return rows.map(withAnswers);
}

export async function getPlace(id: string): Promise<Place | null> {
  const db = requireSupabase();
  const rich = await db.from('locations').select(PLACE_COLUMNS).eq('id', id).maybeSingle();
  if (!rich.error) return rich.data ? withAnswers(rich.data as never) : null;
  if (!isMissingPiece(rich.error)) throw rich.error;

  const { data, error } = await db
    .from('locations')
    .select(PLACE_COLUMNS_BASE)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? withAnswers(data as Record<string, unknown>) : null;
}

/** The personalization sheet: what this location is, and which birds. */
export async function updatePlaceAnswers(id: string, answers: PlaceAnswers): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('locations').update(answers).eq('id', id);
  if (error) {
    if (isMissingPiece(error)) throw new ComingOnline('These questions');
    throw error;
  }
}

export async function createPlace(
  orgId: string,
  name: string,
  address: string | null,
): Promise<Place> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('locations')
    .insert({ org_id: orgId, name, address })
    .select(PLACE_COLUMNS_BASE)
    .single();
  if (error) throw error;
  return withAnswers(data as Record<string, unknown>);
}

export async function updatePlace(
  id: string,
  patch: { name?: string; address?: string | null },
): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('locations').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deletePlace(id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('locations').delete().eq('id', id);
  if (error) throw error;
}

/* ── areas ─────────────────────────────────────────────────────────────── */

export async function listAreas(locationId: string): Promise<Area[]> {
  const db = requireSupabase();
  return unwrap(
    await db
      .from('zones')
      .select('id, location_id, name, active_profile_id')
      .eq('location_id', locationId)
      .order('name'),
  ) as Area[];
}

export async function listAreasForPlaces(placeIds: string[]): Promise<Area[]> {
  if (placeIds.length === 0) return [];
  const db = requireSupabase();
  return unwrap(
    await db
      .from('zones')
      .select('id, location_id, name, active_profile_id')
      .in('location_id', placeIds)
      .order('name'),
  ) as Area[];
}

export async function createArea(locationId: string, name: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('zones').insert({ location_id: locationId, name });
  if (error) throw error;
}

export async function renameArea(id: string, name: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('zones').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function setAreaSound(id: string, profileId: string | null): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('zones').update({ active_profile_id: profileId }).eq('id', id);
  if (error) throw error;
}

export async function deleteArea(id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('zones').delete().eq('id', id);
  if (error) throw error;
}

/* ── speakers ──────────────────────────────────────────────────────────── */

export async function listSpeakers(areaIds: string[]): Promise<Speaker[]> {
  if (areaIds.length === 0) return [];
  const db = requireSupabase();
  return unwrap(
    await db
      .from('devices')
      .select('id, zone_id, kind, name, status, last_seen_at')
      .in('zone_id', areaIds)
      .order('name'),
  ) as Speaker[];
}

export async function createSpeaker(
  areaId: string,
  name: string,
  kind: DeviceKind,
): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('devices').insert({ zone_id: areaId, name, kind });
  if (error) throw error;
}

export async function updateSpeaker(
  id: string,
  patch: { name?: string; zone_id?: string },
): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('devices').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteSpeaker(id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('devices').delete().eq('id', id);
  if (error) throw error;
}

/* ── live status ───────────────────────────────────────────────────────── */

export async function liveStatus(locationId: string): Promise<LiveArea[]> {
  const db = requireSupabase();
  const { data, error } = await db.rpc('zone_live_status', { p_location_id: locationId });
  if (!error) return (data ?? []) as LiveArea[];
  if (!isMissingPiece(error)) throw error;

  // Read the same answer straight from the tables.
  const areas = await listAreas(locationId);
  if (areas.length === 0) return [];
  const open = unwrap(
    await db
      .from('sessions')
      .select('id, zone_id, started_at, audio_profiles(name)')
      .in(
        'zone_id',
        areas.map((a) => a.id),
      )
      .is('ended_at', null),
  ) as unknown as Array<{
    id: string;
    zone_id: string;
    started_at: string;
    audio_profiles: { name: string } | null;
  }>;
  return areas.map((area) => {
    const run = open.find((s) => s.zone_id === area.id) ?? null;
    return {
      zone_id: area.id,
      zone_name: area.name,
      running: run != null,
      current_session_id: run?.id ?? null,
      started_at: run?.started_at ?? null,
      profile_name: run?.audio_profiles?.name ?? null,
    };
  });
}

/* ── what played ───────────────────────────────────────────────────────── */

export async function history(from: Date, to: Date): Promise<Play[]> {
  const db = requireSupabase();
  const { data, error } = await db.rpc('history', {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (!error) return (data ?? []) as Play[];
  if (!isMissingPiece(error)) throw error;

  const rows = unwrap(
    await db
      .from('sessions')
      .select(
        'id, started_at, ended_at, output_kind, source, result, user_id, profile_id, plan_id, zone_id, audio_profiles(name), protection_plans(name), zones(name, location_id, locations(name))',
      )
      .gte('started_at', from.toISOString())
      .lt('started_at', to.toISOString())
      .order('started_at', { ascending: false }),
  ) as unknown as Array<{
    id: string;
    started_at: string;
    ended_at: string | null;
    output_kind: string;
    source: string;
    result: Play['result'];
    user_id: string;
    profile_id: string;
    plan_id: string | null;
    zone_id: string | null;
    audio_profiles: { name: string } | null;
    protection_plans: { name: string } | null;
    zones: { name: string; location_id: string; locations: { name: string } | null } | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    started_at: r.started_at,
    ended_at: r.ended_at,
    minutes:
      (new Date(r.ended_at ?? Date.now()).getTime() - new Date(r.started_at).getTime()) / 60000,
    output_kind: r.output_kind,
    source: r.source,
    result: r.result ?? null,
    user_id: r.user_id,
    profile_id: r.profile_id,
    profile_name: r.audio_profiles?.name ?? null,
    plan_id: r.plan_id ?? null,
    plan_name: r.protection_plans?.name ?? null,
    zone_id: r.zone_id,
    zone_name: r.zones?.name ?? null,
    location_id: r.zones?.location_id ?? null,
    location_name: r.zones?.locations?.name ?? null,
    place_name: r.zones?.locations?.name ?? null,
  }));
}

export async function placeReport(
  locationId: string,
  weekStartDate: string,
): Promise<PlaceReport | null> {
  const db = requireSupabase();
  const { data, error } = await db.rpc('location_report', {
    p_location_id: locationId,
    p_week_start: weekStartDate,
  });
  if (error) {
    if (isMissingPiece(error)) throw new ComingOnline('The weekly report');
    throw error;
  }
  const rows = (data ?? []) as PlaceReport[];
  return rows[0] ?? null;
}

/** What a person reported about the runs in one area. */
export async function areaFeedback(zoneId: string): Promise<AreaFeedback | null> {
  const db = requireSupabase();
  const { data, error } = await db.rpc('zone_feedback', { p_zone_id: zoneId });
  if (error) {
    if (isMissingPiece(error)) return null;
    throw error;
  }
  const rows = (data ?? []) as AreaFeedback[];
  return rows[0] ?? null;
}

/* ── sounds ────────────────────────────────────────────────────────────── */

export async function listSounds(orgId: string): Promise<Sound[]> {
  const db = requireSupabase();
  return unwrap(
    await db
      .from('audio_profiles')
      .select('id, name, kind, is_system, description, params')
      .or(`is_system.eq.true,owner_org_id.eq.${orgId}`)
      .order('name'),
  ) as Sound[];
}

/* ── protection plans ──────────────────────────────────────────────────── */

const PLAN_COLUMNS =
  'id, owner_org_id, zone_id, name, target, sound_ids, randomize_order, interval_seconds, session_minutes, output, volume, quiet_start, quiet_end, days, starts_on, ends_on';

/**
 * Every plan this business owns, attached to an area or waiting in the
 * library. A copy of the database without the table yet hands back nothing,
 * so the rest of the location page still draws.
 */
export async function listPlans(orgId: string): Promise<ProtectionPlan[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('protection_plans')
    .select(PLAN_COLUMNS)
    .eq('owner_org_id', orgId)
    .order('name');
  if (error) {
    if (isMissingPiece(error)) return [];
    throw error;
  }
  return (data ?? []) as ProtectionPlan[];
}

export type PlanInput = {
  name: string;
  target: string;
  sound_ids: string[];
  randomize_order: boolean;
  interval_seconds: number;
  session_minutes: number;
  output: OutputKind;
  quiet_start: string | null;
  quiet_end: string | null;
  days: number[];
  starts_on: string | null;
  ends_on: string | null;
  zone_id: string | null;
};

export async function createPlan(orgId: string, input: PlanInput): Promise<void> {
  const db = requireSupabase();
  const { error } = await db
    .from('protection_plans')
    .insert({ ...input, owner_org_id: orgId });
  if (error) {
    if (isMissingPiece(error)) throw new ComingOnline('Protection plans');
    throw error;
  }
}

export async function updatePlan(id: string, input: Partial<PlanInput>): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('protection_plans').update(input).eq('id', id);
  if (error) throw error;
}

export async function deletePlan(id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('protection_plans').delete().eq('id', id);
  if (error) throw error;
}

/** Point a plan at an area, or take it off the one it is on. */
export async function attachPlan(planId: string, zoneId: string | null): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('protection_plans').update({ zone_id: zoneId }).eq('id', planId);
  if (error) throw error;
}

/* ── schedules ─────────────────────────────────────────────────────────── */

const SCHEDULE_JOINS = 'zones(name, location_id, locations(name)), audio_profiles(name)';
const SCHEDULE_COLUMNS = `id, zone_id, profile_id, days, start_time, end_time, enabled, executor, trigger, offset_minutes, plan_id, quiet_start, quiet_end, ${SCHEDULE_JOINS}, protection_plans(name, output)`;
const SCHEDULE_COLUMNS_BASE = `id, zone_id, profile_id, days, start_time, end_time, enabled, executor, ${SCHEDULE_JOINS}`;

type ScheduleJoined = Schedule & {
  zones: { name: string; location_id: string; locations: { name: string } | null } | null;
  audio_profiles: { name: string } | null;
  protection_plans?: { name: string; output: OutputKind } | null;
};

function toScheduleRow(r: ScheduleJoined): ScheduleRow {
  return {
    id: r.id,
    zone_id: r.zone_id,
    profile_id: r.profile_id,
    days: r.days,
    start_time: r.start_time,
    end_time: r.end_time,
    enabled: r.enabled,
    executor: r.executor,
    trigger: r.trigger ?? 'time',
    offset_minutes: r.offset_minutes ?? 0,
    plan_id: r.plan_id ?? null,
    quiet_start: r.quiet_start ?? null,
    quiet_end: r.quiet_end ?? null,
    area_name: r.zones?.name ?? 'Area',
    place_id: r.zones?.location_id ?? '',
    place_name: r.zones?.locations?.name ?? 'Place',
    sound_name: r.audio_profiles?.name ?? 'Sound',
    plan_name: r.protection_plans?.name ?? null,
    output: r.protection_plans?.output ?? null,
  };
}

export async function listSchedules(placeIds: string[]): Promise<ScheduleRow[]> {
  if (placeIds.length === 0) return [];
  const db = requireSupabase();
  const areas = await listAreasForPlaces(placeIds);
  if (areas.length === 0) return [];
  const areaIds = areas.map((a) => a.id);

  const rich = await db
    .from('schedules')
    .select(SCHEDULE_COLUMNS)
    .in('zone_id', areaIds)
    .order('start_time');
  if (!rich.error) return (rich.data as unknown as ScheduleJoined[]).map(toScheduleRow);
  if (!isMissingPiece(rich.error)) throw rich.error;

  // Triggers and plans have not landed in this copy of the database yet.
  const rows = unwrap(
    await db
      .from('schedules')
      .select(SCHEDULE_COLUMNS_BASE)
      .in('zone_id', areaIds)
      .order('start_time'),
  ) as unknown as ScheduleJoined[];
  return rows.map(toScheduleRow);
}

export type ScheduleInput = {
  zone_id: string;
  profile_id: string;
  days: number[];
  start_time: string;
  end_time: string;
  executor: Executor;
  enabled: boolean;
  trigger: ScheduleTrigger;
  offset_minutes: number;
  plan_id: string | null;
  quiet_start: string | null;
  quiet_end: string | null;
};

/** The columns a schedule had before triggers, plans and quiet hours. */
function withoutTriggers(input: Partial<ScheduleInput>): Partial<ScheduleInput> {
  const { trigger, offset_minutes, plan_id, quiet_start, quiet_end, ...rest } = input;
  void trigger;
  void offset_minutes;
  void plan_id;
  void quiet_start;
  void quiet_end;
  return rest;
}

export async function createSchedule(input: ScheduleInput): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('schedules').insert(input);
  if (!error) return;
  if (!isMissingPiece(error)) throw error;
  const retry = await db.from('schedules').insert(withoutTriggers(input));
  if (retry.error) throw retry.error;
}

export async function updateSchedule(id: string, patch: Partial<ScheduleInput>): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('schedules').update(patch).eq('id', id);
  if (!error) return;
  if (!isMissingPiece(error)) throw error;
  const retry = await db.from('schedules').update(withoutTriggers(patch)).eq('id', id);
  if (retry.error) throw retry.error;
}

export async function deleteSchedule(id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('schedules').delete().eq('id', id);
  if (error) throw error;
}

/* ── team ──────────────────────────────────────────────────────────────── */

export async function listMembers(orgId: string): Promise<TeamMember[]> {
  const db = requireSupabase();
  const { data, error } = await db.rpc('org_member_list', { p_org_id: orgId });
  if (!error) {
    const rows = (data ?? []) as Array<{
      user_id: string;
      email: string | null;
      display_name: string | null;
      role: MemberRole;
      joined_at: string;
    }>;
    return rows.map((r) => ({
      id: r.user_id,
      user_id: r.user_id,
      role: r.role,
      created_at: r.joined_at,
      display_name: r.display_name,
      email: r.email,
    }));
  }

  // The RPC is not available yet, or the caller cannot use it. Read the
  // same list straight from the table instead.
  const rows = unwrap(
    await db
      .from('org_members')
      .select('id, user_id, role, created_at')
      .eq('org_id', orgId)
      .order('created_at'),
  ) as Array<{ id: string; user_id: string; role: MemberRole; created_at: string }>;
  return rows.map((r) => ({ ...r, display_name: null, email: null }));
}

export async function listInvites(orgId: string): Promise<Invite[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('org_invites')
    .select('id, email, role, token, expires_at, accepted_at')
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });
  if (error) {
    if (isMissingPiece(error)) throw new ComingOnline('Invites');
    throw error;
  }
  return (data ?? []) as Invite[];
}

export async function inviteMember(
  orgId: string,
  email: string,
  role: MemberRole,
): Promise<string> {
  const db = requireSupabase();
  const { data, error } = await db.rpc('invite_member', {
    p_org_id: orgId,
    p_email: email,
    p_role: role,
  });
  if (error) {
    if (isMissingPiece(error)) throw new ComingOnline('Inviting teammates');
    throw error;
  }
  return data as string;
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.rpc('remove_member', { p_org_id: orgId, p_user_id: userId });
  if (error) {
    if (isMissingPiece(error)) throw new ComingOnline('Removing teammates');
    throw error;
  }
}

export async function cancelInvite(id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('org_invites').delete().eq('id', id);
  if (error) throw error;
}

export async function acceptInvite(token: string): Promise<string> {
  const db = requireSupabase();
  const { data, error } = await db.rpc('accept_invite', { p_token: token });
  if (error) {
    if (isMissingPiece(error)) throw new ComingOnline('Joining a business');
    throw error;
  }
  return data as string;
}

/* ── account ───────────────────────────────────────────────────────────── */

export async function deleteMyAccount(): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.rpc('delete_my_account');
  if (error) {
    if (isMissingPiece(error)) throw new ComingOnline('Deleting your account');
    throw error;
  }
}

/* ── billing ───────────────────────────────────────────────────────────── */

export async function startCheckout(orgId: string, places: number): Promise<string> {
  const db = requireSupabase();
  const origin = window.location.origin;
  const { data, error } = await db.functions.invoke('stripe-checkout', {
    body: {
      org_id: orgId,
      locations: places,
      success_url: `${origin}/app/billing?paid=1`,
      cancel_url: `${origin}/app/billing`,
    },
  });
  if (error) throw error;
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error('Billing is not open yet.');
  return url;
}

export async function openBillingPortal(orgId: string): Promise<string> {
  const db = requireSupabase();
  const { data, error } = await db.functions.invoke('stripe-portal', {
    body: { org_id: orgId, return_url: `${window.location.origin}/app/billing` },
  });
  if (error) throw error;
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error('Billing is not open yet.');
  return url;
}
