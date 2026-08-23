import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.58.0';
import { requireEnv } from './http.ts';

/**
 * Service-role client: bypasses RLS. Only webhooks and the report job use it,
 * and only after they have authenticated the caller themselves.
 */
export function serviceClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * A client that acts as the person who called the function, so every read and
 * write still goes through RLS.
 */
export function callerClient(req: Request): SupabaseClient {
  const authorization = req.headers.get('Authorization') ?? '';
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
}

/** The signed-in user, or null when the bearer token is missing or stale. */
export async function currentUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await serviceClient().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

/** True when `userId` holds `role` (or better) in `orgId`. */
export async function hasOrgRole(
  db: SupabaseClient,
  orgId: string,
  userId: string,
  role: 'owner' | 'manager' | 'staff',
): Promise<boolean> {
  const rank = { staff: 1, manager: 2, owner: 3 } as const;
  const { data } = await db
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return false;
  return rank[data.role as keyof typeof rank] >= rank[role];
}
