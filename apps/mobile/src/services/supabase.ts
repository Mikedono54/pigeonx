import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
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
