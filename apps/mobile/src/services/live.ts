import type { LiveByArea } from '../core/places';
import { getSupabase } from './supabase';

/**
 * What is playing right now, in every area of a place.
 *
 * Two ways to know: ask once, and then listen. The listening part uses the
 * account's live updates, so one person starting a sound on a roof shows up on
 * everyone else's phone.
 */

type Row = Record<string, unknown>;

function str(row: Row, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

/** Turns whatever the server sends into "this area is playing, since then". */
export function liveFromRows(rows: unknown): LiveByArea {
  if (!Array.isArray(rows)) return {};
  const live: LiveByArea = {};

  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Row;
    const areaId = str(row, 'zone_id', 'area_id', 'id');
    if (!areaId) continue;

    const startedRaw = str(row, 'started_at', 'since', 'playing_since');
    const startedAt = startedRaw ? Date.parse(startedRaw) || null : null;
    const ended = str(row, 'ended_at');
    const playing =
      row.playing === true ||
      row.is_playing === true ||
      row.live === true ||
      (startedAt !== null && !ended);

    live[areaId] = { playing, startedAt: playing ? startedAt : null };
  }

  return live;
}

/** Asks once. Returns nothing at all when the server has no answer yet. */
export async function fetchLive(placeId: string): Promise<LiveByArea> {
  const sb = getSupabase();
  if (!sb) return {};
  const { data, error } = await sb.rpc('zone_live_status', {
    location_id: placeId,
  });
  if (error) return {};
  return liveFromRows(data);
}

/** Asks about every place at once. */
export async function fetchLiveForPlaces(placeIds: string[]): Promise<LiveByArea> {
  const all: LiveByArea = {};
  for (const placeId of placeIds) {
    Object.assign(all, await fetchLive(placeId));
  }
  return all;
}

/**
 * Listens for a sound starting or stopping anywhere in the business, then
 * asks again. Returns the function that stops listening.
 */
export function watchLive(placeIds: string[], onChange: (live: LiveByArea) => void): () => void {
  const sb = getSupabase();
  if (!sb || placeIds.length === 0) return () => {};

  let alive = true;
  const refresh = () => {
    void fetchLiveForPlaces(placeIds).then((live) => {
      if (alive) onChange(live);
    });
  };

  const channel = sb
    .channel('pigeonx-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, refresh)
    .subscribe();

  refresh();

  return () => {
    alive = false;
    void sb.removeChannel(channel);
  };
}
