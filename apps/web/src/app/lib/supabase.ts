import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { HAS_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

let client: SupabaseClient | null = null;

/**
 * The one Supabase client for the dashboard. Returns null when the app was
 * built without config, so every caller has to decide what to show instead of
 * crashing the page.
 */
export function supabase(): SupabaseClient | null {
  if (!HAS_BACKEND) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'pigeonx-auth',
      },
    });
  }
  return client;
}

/** The client, or a thrown message a caller can show to a person. */
export function requireSupabase(): SupabaseClient {
  const c = supabase();
  if (!c) throw new Error('This dashboard is not connected yet. Try again in a moment.');
  return c;
}
