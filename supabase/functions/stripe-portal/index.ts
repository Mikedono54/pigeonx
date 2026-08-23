/**
 * Open Stripe's billing portal for an org. POST from a signed-in owner:
 *
 *   { org_id, return_url } → { url }
 *
 * Keeps JWT verification. Card details, invoices and cancellation all live in
 * Stripe's portal — PigeonX never handles them.
 */

import Stripe from 'npm:stripe@17.7.0';
import { isUuid, json, preflight, requireEnv } from '../_shared/http.ts';
import { currentUser, hasOrgRole, serviceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let stripe: Stripe;
  try {
    stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
      httpClient: Stripe.createFetchHttpClient(),
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return json({ error: 'billing is not configured yet' }, 500);
  }

  const user = await currentUser(req);
  if (!user) return json({ error: 'sign in required' }, 401);

  let body: { org_id?: unknown; return_url?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'body is not JSON' }, 400);
  }

  if (!isUuid(body.org_id)) return json({ error: 'org_id must be a uuid' }, 400);
  const returnUrl = typeof body.return_url === 'string' ? body.return_url : null;
  if (!returnUrl || !returnUrl.startsWith('http')) {
    return json({ error: 'return_url must be an absolute URL' }, 400);
  }

  const db = serviceClient();
  if (!(await hasOrgRole(db, body.org_id, user.id, 'owner'))) {
    return json({ error: 'only an owner can manage billing' }, 403);
  }

  const { data: org } = await db
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', body.org_id)
    .maybeSingle();

  if (!org?.stripe_customer_id) {
    return json({ error: 'this organization has no subscription yet' }, 409);
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error('stripe-portal: failed', err instanceof Error ? err.message : err);
    return json({ error: 'could not open the billing portal' }, 502);
  }
});
