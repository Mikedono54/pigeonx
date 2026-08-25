import type { SupabaseClient } from '@supabase/supabase-js';
import { SYSTEM_PROFILES, SYSTEM_PROFILE_UUIDS } from '../core/profiles';
import { usePlacesHome } from '../state/usePlacesHome';
import { useProfiles } from '../state/useProfiles';
import { useProtectionPlans } from '../state/useProtectionPlans';

/**
 * The account's id for something on this phone.
 *
 * Built-in sounds live on the server too, under the same short name. Sounds a
 * person made, the places they described and the plans they saved get an id
 * the first time they go up. Everything that writes a row needs this lookup,
 * so it lives on its own.
 */

let builtInIds = new Map<string, string>();

export function setBuiltInSoundIds(pairs: [string, string][]): void {
  builtInIds = new Map(pairs);
}

export function builtInSoundIds(): Map<string, string> {
  return builtInIds;
}

/**
 * The account's id for one sound, or null while it has none.
 *
 * What the account itself reports wins. The seeded ids are the fallback for a
 * phone that has never reached the account, so a plan made offline still points
 * at the right sounds the first time it goes up.
 */
export function remoteSoundId(localId: string): string | null {
  if (SYSTEM_PROFILES.some((p) => p.id === localId)) {
    return builtInIds.get(localId) ?? SYSTEM_PROFILE_UUIDS[localId] ?? null;
  }
  const mine = useProfiles.getState().saved.find((p) => p.id === localId);
  return mine?.remoteId ?? null;
}

/** The sound on this phone that an account id belongs to. */
export function localSoundId(remoteId: string | null): string | null {
  if (!remoteId) return null;
  for (const [slug, id] of builtInIds) {
    if (id === remoteId) return slug;
  }
  const mine = useProfiles.getState().saved.find((p) => p.remoteId === remoteId);
  if (mine) return mine.id;
  // Same fallback as `remoteSoundId`, for a phone that has not read the
  // account's list of built-in sounds yet.
  const seeded = Object.keys(SYSTEM_PROFILE_UUIDS).find(
    (slug) => SYSTEM_PROFILE_UUIDS[slug] === remoteId,
  );
  return seeded ?? null;
}

/** Reads the built-in sounds the account knows about. Safe to call often. */
export async function loadBuiltInSoundIds(sb: SupabaseClient): Promise<void> {
  const { data, error } = await sb.from('audio_profiles').select('id, slug').eq('is_system', true);
  if (error || !Array.isArray(data)) return;

  const pairs: [string, string][] = [];
  for (const row of data as { id: string; slug: string | null }[]) {
    if (row.slug) pairs.push([row.slug, row.id]);
  }
  setBuiltInSoundIds(pairs);
}

/** The account's id for one place on this phone, or null while it has none. */
export function remotePlaceId(localId: string | null | undefined): string | null {
  if (!localId) return null;
  return usePlacesHome.getState().byId(localId)?.remoteId ?? null;
}

/** The place on this phone an account id belongs to. */
export function localPlaceId(remoteId: string | null | undefined): string | null {
  if (!remoteId) return null;
  return usePlacesHome.getState().places.find((p) => p.remoteId === remoteId)?.id ?? null;
}

/**
 * An id the account made itself.
 *
 * Everything one phone writes is `pln_` and a random tail until it goes up.
 * Everything a business keeps is read from the account and never written
 * locally, so its id is the account's own from the first time it is seen.
 */
const ACCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The account's id for one protection plan, or null while it has none. */
export function remotePlanId(localId: string | null | undefined): string | null {
  if (!localId) return null;
  const mine = useProtectionPlans.getState().byId(localId);
  if (mine) return mine.remoteId;
  return ACCOUNT_ID.test(localId) ? localId : null;
}

/** The protection plan on this phone an account id belongs to. */
export function localPlanId(remoteId: string | null | undefined): string | null {
  if (!remoteId) return null;
  const mine = useProtectionPlans.getState().plans.find((p) => p.remoteId === remoteId);
  return mine ? mine.id : remoteId;
}
