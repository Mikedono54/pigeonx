import type { SupabaseClient } from '@supabase/supabase-js';
import { SYSTEM_PROFILES } from '../core/profiles';
import { useProfiles } from '../state/useProfiles';

/**
 * The account's id for a sound on this phone.
 *
 * Built-in sounds live on the server too, under the same short name. Sounds a
 * person made get an id the first time they go up. Everything that writes a
 * row about a sound needs this, so the lookup lives on its own.
 */

let builtInIds = new Map<string, string>();

export function setBuiltInSoundIds(pairs: [string, string][]): void {
  builtInIds = new Map(pairs);
}

export function builtInSoundIds(): Map<string, string> {
  return builtInIds;
}

/** The account's id for one sound, or null while it has none. */
export function remoteSoundId(localId: string): string | null {
  if (SYSTEM_PROFILES.some((p) => p.id === localId)) {
    return builtInIds.get(localId) ?? null;
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
  return mine?.id ?? null;
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
