# stripe-webhook

Stripe's webhook endpoint for the Business plan. Turns subscription events into
a `subscriptions` row and an `organizations.plan` of `business` or `free`.

    POST https://wnmrcngjsdlyddrdiqtj.supabase.co/functions/v1/stripe-webhook

## Authentication

Deployed with `--no-verify-jwt`. Stripe has no Supabase session; it signs each
request, and the signature is checked against `STRIPE_WEBHOOK_SECRET` with
`constructEventAsync` and Deno's Web Crypto provider before the body is parsed
as anything but text. An unsigned or mis-signed request is a 401.

## Secrets

| name | where it comes from |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → secret key (`sk_live_…` / `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → this endpoint → signing secret (`whsec_…`) |

## Events handled

| event | effect |
| --- | --- |
| `checkout.session.completed` | stores `organizations.stripe_customer_id`, retrieves the subscription, sets the plan |
| `customer.subscription.updated` | re-reads status and quantity, sets the plan |
| `customer.subscription.deleted` | treated as `canceled`, drops the org to `free` |

Everything else gets a 200 and is ignored.

`active`, `trialing` and `past_due` all count as Business. Stripe retries a
declined card for days; locking a hotel out of its own zones over one failed
charge is the wrong trade while that is still in flight.

An org already on `enterprise` is never demoted by this function. Enterprise is
sold by hand and does not come from a per-location subscription.

## Quantity is locations

The Business price is per location. `items.data[0].quantity` is that count. There
is no column for it, so it is written into `subscriptions.raw.pigeonx_locations`
where the dashboard can read it back.

## Which org

`checkout.session.completed` carries `metadata.org_id`, set by `stripe-checkout`.
Later events carry only a customer, matched against
`organizations.stripe_customer_id`, which is why the checkout handler stores it
first. An event that matches no org is logged and answered 200.

## Logic and tests

`stripeSubscriptionRow` and `planFromStripeSubscription` live in
`../_shared/billing.ts`, mirrored from `packages/core/src/billing.ts` and covered
by `packages/core/src/billing.test.ts` and `edge-parity.test.ts`.

## Deploy

    SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) \
      npx supabase@latest functions deploy stripe-webhook \
      --project-ref wnmrcngjsdlyddrdiqtj --no-verify-jwt
