/**
 * Every call the dashboard makes to the backend.
 *
 * Each function names the piece it needs, so a page can say "this is coming
 * online" instead of showing a blank box. Where the same answer can be read
 * straight from a table, we fall back to that and keep working.
 */

import { requireSupabase } from './supabase';
import { ComingOnline, isMissingPiece, unwrap } from './errors';
import type {
  Area,
  DeviceKind,
  Executor,
  Invite,
  LiveArea,
  MemberRole,
  Membership,
  Place,
  PlaceReport,
  Play,
  Schedule,
  ScheduleRow,
  Sound,
  Speaker,
  TeamMember,
} from './types';

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
  return unwrap(
    await db
      .from('locations')
      .select('id, org_id, name, address, timezone')
      .eq('org_id', orgId)
      .order('name'),
  ) as Place[];
}

export async function getPlace(id: string): Promise<Place | null> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('locations')
    .select('id, org_id, name, address, timezone')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Place) ?? null;
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
    .select('id, org_id, name, address, timezone')
    .single();
  if (error) throw error;
  return data as Place;
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
        'id, started_at, ended_at, output_kind, source, user_id, profile_id, zone_id, audio_profiles(name), zones(name, location_id, locations(name))',
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
    user_id: string;
    profile_id: string;
    zone_id: string | null;
    audio_profiles: { name: string } | null;
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
    user_id: r.user_id,
    profile_id: r.profile_id,
    profile_name: r.audio_profiles?.name ?? null,
    zone_id: r.zone_id,
    zone_name: r.zones?.name ?? null,
    location_id: r.zones?.location_id ?? null,
    location_name: r.zones?.locations?.name ?? null,
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

/* ── sounds ────────────────────────────────────────────────────────────── */

export async function listSounds(orgId: string): Promise<Sound[]> {
  const db = requireSupabase();
  return unwrap(
    await db
      .from('audio_profiles')
      .select('id, name, kind, is_system')
      .or(`is_system.eq.true,owner_org_id.eq.${orgId}`)
      .order('name'),
  ) as Sound[];
}

/* ── schedules ─────────────────────────────────────────────────────────── */

export async function listSchedules(placeIds: string[]): Promise<ScheduleRow[]> {
  if (placeIds.length === 0) return [];
  const db = requireSupabase();
  const areas = await listAreasForPlaces(placeIds);
  if (areas.length === 0) return [];
  const rows = unwrap(
    await db
      .from('schedules')
      .select(
        'id, zone_id, profile_id, days, start_time, end_time, enabled, executor, zones(name, location_id, locations(name)), audio_profiles(name)',
      )
      .in(
        'zone_id',
        areas.map((a) => a.id),
      )
      .order('start_time'),
  ) as unknown as Array<
    Schedule & {
      zones: { name: string; location_id: string; locations: { name: string } | null } | null;
      audio_profiles: { name: string } | null;
    }
  >;
  return rows.map((r) => ({
    id: r.id,
    zone_id: r.zone_id,
    profile_id: r.profile_id,
    days: r.days,
    start_time: r.start_time,
    end_time: r.end_time,
    enabled: r.enabled,
    executor: r.executor,
    area_name: r.zones?.name ?? 'Area',
    place_id: r.zones?.location_id ?? '',
    place_name: r.zones?.locations?.name ?? 'Place',
    sound_name: r.audio_profiles?.name ?? 'Sound',
  }));
}

export type ScheduleInput = {
  zone_id: string;
  profile_id: string;
  days: number[];
  start_time: string;
  end_time: string;
  executor: Executor;
  enabled: boolean;
};

export async function createSchedule(input: ScheduleInput): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('schedules').insert(input);
  if (error) throw error;
}

export async function updateSchedule(id: string, patch: Partial<ScheduleInput>): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('schedules').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteSchedule(id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('schedules').delete().eq('id', id);
  if (error) throw error;
}

/* ── team ──────────────────────────────────────────────────────────────── */

export async function listMembers(orgId: string): Promise<TeamMember[]> {
  const db = requireSupabase();
  const rows = unwrap(
    await db
      .from('org_members')
      .select('id, user_id, role, created_at')
      .eq('org_id', orgId)
      .order('created_at'),
  ) as Array<{ id: string; user_id: string; role: MemberRole; created_at: string }>;
  return rows.map((r) => ({ ...r, display_name: null }));
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
