import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { secureStorage } from './secureStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase is optional. The whole app works offline as a guest; the client is
 * only created once the project's URL + anon key are supplied through the
 * EXPO_PUBLIC_* env vars, so a missing backend can never break a run.
 */
let client: SupabaseClient | null = null;

if (url && anonKey) {
  client = createClient(url, anonKey, {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
}

export function getSupabase(): SupabaseClient | null {
  return client;
}

export function isSupabaseConfigured(): boolean {
  return client !== null;
}

/** Test seam. Lets tests inject a stub client or force the offline path. */
export function __setSupabase(next: SupabaseClient | null): void {
  client = next;
}

/**
 * Calls a server function, then tries the other spelling of its inputs.
 *
 * The server names its inputs with a `p_` in front. An older spelling without
 * it may still be out there, so a call that comes back "no such function"
 * gets one more try before it counts as a failure.
 */
export async function callFunction(
  sb: {
    rpc: (
      name: string,
      args?: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: BackendError | null }>;
  },
  name: string,
  args: Record<string, unknown>,
): Promise<{ data: unknown; error: BackendError | null }> {
  const first = await sb.rpc(name, prefixed(args));
  if (!first.error || !isMissingOnServer(first.error)) return first;
  return sb.rpc(name, args);
}

/** The same inputs, named the way the server names them. */
export function prefixed(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    out[key.startsWith('p_') ? key : `p_${key}`] = value;
  }
  return out;
}

export interface BackendError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

/**
 * True when the backend has not shipped this piece yet. The app has to keep
 * working while the server side lands, so callers fall back to what is on the
 * phone instead of showing a failure.
 */
export function isMissingOnServer(error: BackendError | null): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === 'PGRST202' || code === 'PGRST205' || code === '42883' || code === '42P01') {
    return true;
  }
  const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    text.includes('could not find the function') ||
    text.includes('could not find the table') ||
    text.includes('does not exist') ||
    text.includes('schema cache')
  );
}

/** True when the phone could not reach the server at all. */
export function isOffline(error: BackendError | null): boolean {
  if (!error) return false;
  const text = `${error.message ?? ''}`.toLowerCase();
  return (
    text.includes('network request failed') ||
    text.includes('failed to fetch') ||
    text.includes('timeout') ||
    text.includes('offline')
  );
}

/** Turns whatever the server said into one short line a person can read. */
export function plainMessage(
  error: BackendError | null,
  fallback = "That didn't work. Try again.",
): string {
  if (!error) return fallback;
  if (isOffline(error)) return 'Your phone is not online. Try again in a minute.';
  if (isMissingOnServer(error)) return 'This part is not ready yet. Try again later.';
  const text = (error.message ?? '').toLowerCase();
  if (text.includes('row-level security') || text.includes('permission denied')) {
    return 'You do not have permission to do that.';
  }
  if (text.includes('duplicate key') || text.includes('already exists')) {
    return 'That name is already taken. Pick another one.';
  }
  if (text.includes('rate limit') || text.includes('too many')) {
    return 'Too many tries. Wait a minute and try again.';
  }
  return fallback;
}
