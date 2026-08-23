import type { SupabaseClient } from '@supabase/supabase-js';
import type { Area, Place, Speaker } from '../core/places';
import { getSupabase, isMissingOnServer, plainMessage } from './supabase';

/**
 * Places a business keeps in its account.
 *
 * places are locations, areas are zones, speakers are the things in a zone.
 * The server decides who is allowed to change what; this file just asks and
 * reports back in plain words.
 */

export interface RemoteOutcome<T = undefined> {
  ok: boolean;
  message: string;
  value?: T;
}

const NOT_READY = 'This part is not ready yet. Try again later.';
const NO_ACCOUNT = 'Sign in to see the places your business keeps.';

type Row = Record<string, unknown>;

function str(row: Row, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

export function speakerFromRow(row: Row): Speaker {
  return { id: str(row, 'id') ?? '', name: str(row, 'name') ?? 'Speaker' };
}

export function areaFromRow(row: Row, speakers: Speaker[]): Area {
  return {
    id: str(row, 'id') ?? '',
    name: str(row, 'name') ?? 'Area',
    speakerIds: [],
    speakers,
  };
}

/** Builds the whole tree out of three flat lists. */
export function buildPlaces(
  locations: Row[],
  zones: Row[],
  devices: Row[]
): Place[] {
  const speakersByZone = new Map<string, Speaker[]>();
  for (const device of devices) {
    const zoneId = str(device, 'zone_id');
    if (!zoneId) continue;
    const list = speakersByZone.get(zoneId) ?? [];
    list.push(speakerFromRow(device));
    speakersByZone.set(zoneId, list);
  }

  const areasByLocation = new Map<string, Area[]>();
  for (const zone of zones) {
    const locationId = str(zone, 'location_id');
    if (!locationId) continue;
    const list = areasByLocation.get(locationId) ?? [];
    list.push(areaFromRow(zone, speakersByZone.get(str(zone, 'id') ?? '') ?? []));
    areasByLocation.set(locationId, list);
  }

  return locations.map((location) => ({
    id: str(location, 'id') ?? '',
    name: str(location, 'name') ?? 'Place',
    areas: areasByLocation.get(str(location, 'id') ?? '') ?? [],
  }));
}

/* ── reading ──────────────────────────────────────────────────────────────── */

export async function fetchPlaces(
  orgId: string
): Promise<RemoteOutcome<Place[]>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: NO_ACCOUNT };

  const locations = await sb
    .from('locations')
    .select('id, name')
    .eq('org_id', orgId)
    .order('name');
  if (locations.error) {
    return {
      ok: false,
      message: isMissingOnServer(locations.error)
        ? NOT_READY
        : plainMessage(locations.error),
    };
  }

  const ids = (locations.data ?? []).map((l) => (l as Row).id as string);
  if (ids.length === 0) return { ok: true, message: '', value: [] };

  const zones = await sb
    .from('zones')
    .select('id, name, location_id')
    .in('location_id', ids)
    .order('name');
  if (zones.error) {
    return { ok: false, message: plainMessage(zones.error) };
  }

  const zoneIds = (zones.data ?? []).map((z) => (z as Row).id as string);
  const devices =
    zoneIds.length === 0
      ? { data: [], error: null }
      : await sb.from('devices').select('id, name, zone_id').in('zone_id', zoneIds);

  return {
    ok: true,
    message: '',
    value: buildPlaces(
      (locations.data ?? []) as Row[],
      (zones.data ?? []) as Row[],
      ((devices.data ?? []) as Row[]) ?? []
    ),
  };
}

/* ── changing ─────────────────────────────────────────────────────────────── */

async function run<T>(
  work: (sb: SupabaseClient) => PromiseLike<{ data: unknown; error: unknown }>,
  read: (data: unknown) => T,
  done: string
): Promise<RemoteOutcome<T>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: NO_ACCOUNT };
  const { data, error } = await work(sb);
  if (error) {
    const e = error as { code?: string; message?: string };
    return {
      ok: false,
      message: isMissingOnServer(e) ? NOT_READY : plainMessage(e),
    };
  }
  return { ok: true, message: done, value: read(data) };
}

export function addPlace(orgId: string, name: string) {
  return run(
    (sb) =>
      sb.from('locations').insert({ org_id: orgId, name }).select('id').single(),
    (data) => ((data ?? {}) as Row).id as string,
    `${name} added.`
  );
}

export function renamePlace(placeId: string, name: string) {
  return run(
    (sb) =>
      sb.from('locations').update({ name }).eq('id', placeId).select('id').single(),
    () => undefined,
    'Saved.'
  );
}

export function removePlace(placeId: string) {
  return run(
    async (sb) => await sb.from('locations').delete().eq('id', placeId),
    () => undefined,
    'Deleted.'
  );
}

export function addArea(placeId: string, name: string) {
  return run(
    (sb) =>
      sb
        .from('zones')
        .insert({ location_id: placeId, name })
        .select('id')
        .single(),
    (data) => ((data ?? {}) as Row).id as string,
    `${name} added.`
  );
}

export function renameArea(areaId: string, name: string) {
  return run(
    (sb) =>
      sb.from('zones').update({ name }).eq('id', areaId).select('id').single(),
    () => undefined,
    'Saved.'
  );
}

export function removeArea(areaId: string) {
  return run(
    async (sb) => await sb.from('zones').delete().eq('id', areaId),
    () => undefined,
    'Deleted.'
  );
}

export function addSpeaker(areaId: string, name: string, kind = 'simulated') {
  return run(
    (sb) =>
      sb
        .from('devices')
        .insert({ zone_id: areaId, name, kind })
        .select('id')
        .single(),
    (data) => ((data ?? {}) as Row).id as string,
    `${name} added.`
  );
}

export function removeSpeaker(speakerId: string) {
  return run(
    async (sb) => await sb.from('devices').delete().eq('id', speakerId),
    () => undefined,
    'Deleted.'
  );
}
