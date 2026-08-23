/**
 * Stripe → `subscriptions` + `organizations.plan`.
 *
 * Deployed with `--no-verify-jwt`: Stripe has no Supabase session. It signs
 * every request instead, and the signature is verified against
 * `STRIPE_WEBHOOK_SECRET` before the body is trusted.
 */

import Stripe from 'npm:stripe@17.7.0';
import { json, requireEnv } from '../_shared/http.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { stripeSubscriptionRow } from '../_shared/billing.ts';

const HANDLED = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let stripe: Stripe;
  let webhookSecret: string;
  try {
    stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
      // Deno has no Node crypto; the fetch client is the supported transport.
      httpClient: Stripe.createFetchHttpClient(),
    });
    webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return json({ error: 'webhook is not configured' }, 500);
  }

  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return json({ error: 'missing Stripe-Signature' }, 400);

  // The raw body, byte for byte — parsing first would break the signature.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    console.error('stripe-webhook: bad signature', err instanceof Error ? err.message : err);
    return json({ error: 'signature verification failed' }, 401);
  }

  if (!(HANDLED as readonly string[]).includes(event.type)) {
    console.log(`stripe-webhook: ignoring ${event.type}`);
    return json({ ok: true, ignored: event.type });
  }

  const db = serviceClient();

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id ?? null;
      const customerId = typeof session.customer === 'string' ? session.customer : null;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

      if (!orgId || !subscriptionId) {
        console.error('stripe-webhook: checkout session without org_id or subscription');
        return json({ ok: true, skipped: 'incomplete checkout session' });
      }

      // Remember the customer so the portal and later events can find the org.
      if (customerId) {
        await db.from('organizations').update({ stripe_customer_id: customerId }).eq('id', orgId);
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await applySubscription(db, orgId, subscription);
      return json({ ok: true, org_id: orgId });
    }

    // customer.subscription.updated / .deleted
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    if (!customerId) return json({ ok: true, skipped: 'no customer on subscription' });

    const { data: org } = await db
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (!org) {
      console.error(`stripe-webhook: no organization for customer ${customerId}`);
      return json({ ok: true, unmatched: customerId });
    }

    // A deleted subscription is over regardless of the status on the object.
    const effective =
      event.type === 'customer.subscription.deleted'
        ? { ...subscription, status: 'canceled' }
        : subscription;

    await applySubscription(db, org.id, effective as Stripe.Subscription);
    return json({ ok: true, org_id: org.id });
  } catch (err) {
    console.error('stripe-webhook: handler failed', err instanceof Error ? err.message : err);
    return json({ error: 'handler failed' }, 500);
  }
});

/** Mirror the subscription into `subscriptions` and set `organizations.plan`. */
async function applySubscription(
  db: ReturnType<typeof serviceClient>,
  orgId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const row = stripeSubscriptionRow(subscription as never);

  const upsert = await db.from('subscriptions').upsert(
    {
      user_id: null,
      org_id: orgId,
      provider: row.provider,
      product_id: row.product_id,
      status: row.status,
      current_period_end: row.current_period_end,
      // `quantity` is the number of locations billed; it has no column of its
      // own, so it rides along in `raw` where the dashboard can read it back.
      raw: { ...subscription, pigeonx_locations: row.quantity } as unknown as Record<
        string,
        unknown
      >,
    },
    { onConflict: 'org_id,provider' },
  );
  if (upsert.error) throw new Error(`subscription upsert: ${upsert.error.message}`);

  // Enterprise is sold by hand, so a Stripe event must never demote one — the
  // `neq` is what keeps a per-location webhook out of an enterprise contract.
  const update = await db
    .from('organizations')
    .update({ plan: row.plan })
    .eq('id', orgId)
    .neq('plan', 'enterprise');
  if (update.error) throw new Error(`plan update: ${update.error.message}`);

  console.log(
    `stripe-webhook: org ${orgId} → ${row.status} (${row.quantity} location(s)), plan ${row.plan}`,
  );
}
