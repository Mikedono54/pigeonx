/**
 * Start a Business subscription. POST from a signed-in owner:
 *
 *   { org_id, locations, success_url, cancel_url } → { url }
 *
 * Keeps JWT verification: only the org's owner may open a checkout for it.
 */

import Stripe from 'npm:stripe@17.7.0';
import { isUuid, json, preflight, requireEnv } from '../_shared/http.ts';
import { currentUser, hasOrgRole, serviceClient } from '../_shared/supabase.ts';

interface CheckoutBody {
  org_id?: unknown;
  locations?: unknown;
  success_url?: unknown;
  cancel_url?: unknown;
}

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let stripe: Stripe;
  let priceId: string;
  try {
    stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
      httpClient: Stripe.createFetchHttpClient(),
    });
    priceId = requireEnv('STRIPE_PRICE_BUSINESS_LOCATION');
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return json({ error: 'billing is not configured yet' }, 500);
  }

  const user = await currentUser(req);
  if (!user) return json({ error: 'sign in required' }, 401);

  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'body is not JSON' }, 400);
  }

  const orgId = body.org_id;
  const locations = body.locations;
  const successUrl = body.success_url;
  const cancelUrl = body.cancel_url;

  if (!isUuid(orgId)) return json({ error: 'org_id must be a uuid' }, 400);
  if (
    typeof locations !== 'number' ||
    !Number.isInteger(locations) ||
    locations < 1 ||
    locations > 1000
  ) {
    return json({ error: 'locations must be a whole number from 1 to 1000' }, 400);
  }
  if (!isHttpUrl(successUrl) || !isHttpUrl(cancelUrl)) {
    return json({ error: 'success_url and cancel_url must be absolute URLs' }, 400);
  }

  const db = serviceClient();
  if (!(await hasOrgRole(db, orgId, user.id, 'owner'))) {
    return json({ error: 'only an owner can start a subscription' }, 403);
  }

  const { data: org, error } = await db
    .from('organizations')
    .select('id, name, contact_email, stripe_customer_id')
    .eq('id', orgId)
    .maybeSingle();
  if (error || !org) return json({ error: 'organization not found' }, 404);

  try {
    const customerId = await ensureCustomer(stripe, db, org, user.email);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: locations }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: org.id,
      // The webhook needs this: later subscription events carry only a customer,
      // but the first one has to be able to name the org.
      metadata: { org_id: org.id },
      subscription_data: { metadata: { org_id: org.id } },
      allow_promotion_codes: true,
    });

    if (!session.url) return json({ error: 'Stripe returned no checkout url' }, 502);
    return json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('stripe-checkout: failed', err instanceof Error ? err.message : err);
    return json({ error: 'could not start checkout' }, 502);
  }
});

/** Reuse the org's customer if it has one; otherwise create and remember it. */
async function ensureCustomer(
  stripe: Stripe,
  db: ReturnType<typeof serviceClient>,
  org: {
    id: string;
    name: string;
    contact_email: string | null;
    stripe_customer_id: string | null;
  },
  fallbackEmail: string | undefined,
): Promise<string> {
  if (org.stripe_customer_id) {
    // A customer deleted on Stripe's side would fail the checkout create with a
    // confusing error, so confirm it still exists before reusing it.
    try {
      const existing = await stripe.customers.retrieve(org.stripe_customer_id);
      if (!('deleted' in existing) || !existing.deleted) return org.stripe_customer_id;
    } catch {
      console.warn(`stripe-checkout: customer ${org.stripe_customer_id} is gone, making a new one`);
    }
  }

  const customer = await stripe.customers.create({
    name: org.name,
    email: org.contact_email ?? fallbackEmail,
    metadata: { org_id: org.id },
  });

  const update = await db
    .from('organizations')
    .update({ stripe_customer_id: customer.id })
    .eq('id', org.id);
  if (update.error) throw new Error(`could not store the customer id: ${update.error.message}`);

  return customer.id;
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
