/**
 * RevenueCat → `subscriptions` + `profiles.plan`.
 *
 * Deployed with `--no-verify-jwt`: RevenueCat has no Supabase session, it
 * authenticates with the shared secret configured on its webhook, which arrives
 * as `Authorization: Bearer <RC_WEBHOOK_SECRET>`.
 */

import { json, preflight, requireEnv, secretsMatch, isUuid } from '../_shared/http.ts';
import { serviceClient } from '../_shared/supabase.ts';
import {
  REVENUECAT_EVENT_TYPES,
  revenueCatSubscription,
  type RevenueCatEvent,
} from '../_shared/billing.ts';

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let expected: string;
  try {
    expected = `Bearer ${requireEnv('RC_WEBHOOK_SECRET')}`;
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return json({ error: 'webhook is not configured' }, 500);
  }

  if (!secretsMatch(req.headers.get('Authorization') ?? '', expected)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let payload: { event?: RevenueCatEvent } & Partial<RevenueCatEvent>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'body is not JSON' }, 400);
  }

  const event = (payload.event ?? payload) as RevenueCatEvent;
  if (!event?.type) return json({ error: 'no event type' }, 400);

  // TEST / TRANSFER / SUBSCRIBER_ALIAS and the rest are acknowledged and
  // ignored: a 4xx would make RevenueCat retry something we will never act on.
  if (!REVENUECAT_EVENT_TYPES.includes(event.type)) {
    console.log(`rc-webhook: ignoring ${event.type}`);
    return json({ ok: true, ignored: event.type });
  }

  const db = serviceClient();
  const userId = await resolveUser(db, event);
  if (!userId) {
    console.error(`rc-webhook: no profile for app_user_id ${event.app_user_id}`);
    // 200 on purpose — retrying will not conjure an account that does not exist.
    return json({ ok: true, unmatched: event.app_user_id ?? null });
  }

  const row = revenueCatSubscription(event);

  const upsert = await db.from('subscriptions').upsert(
    {
      user_id: userId,
      org_id: null,
      provider: row.provider,
      product_id: row.product_id,
      status: row.status,
      current_period_end: row.current_period_end,
      raw: event as unknown as Record<string, unknown>,
    },
    { onConflict: 'user_id,provider' },
  );
  if (upsert.error) {
    console.error('rc-webhook: subscription upsert failed', upsert.error.message);
    return json({ error: 'could not record the subscription' }, 500);
  }

  const planUpdate = await db.from('profiles').update({ plan: row.plan }).eq('id', userId);
  if (planUpdate.error) {
    console.error('rc-webhook: plan update failed', planUpdate.error.message);
    return json({ error: 'could not update the plan' }, 500);
  }

  console.log(`rc-webhook: ${event.type} → ${userId} is now ${row.plan}`);
  return json({ ok: true, user_id: userId, plan: row.plan, status: row.status });
});

/**
 * The app sets RevenueCat's app user id to the Supabase user id, so the common
 * case is a straight uuid. `rc_app_user_id` covers anonymous purchases that were
 * later attached to an account, and `original_app_user_id` covers a transfer.
 */
async function resolveUser(
  db: ReturnType<typeof serviceClient>,
  event: RevenueCatEvent,
): Promise<string | null> {
  const candidates = [event.app_user_id, event.original_app_user_id].filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );

  for (const candidate of candidates) {
    if (isUuid(candidate)) {
      const { data } = await db.from('profiles').select('id').eq('id', candidate).maybeSingle();
      if (data) return data.id;
    }
    const { data } = await db
      .from('profiles')
      .select('id')
      .eq('rc_app_user_id', candidate)
      .maybeSingle();
    if (data) return data.id;
  }

  return null;
}
