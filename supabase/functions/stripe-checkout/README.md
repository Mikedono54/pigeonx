# stripe-checkout

Starts a Business subscription. The dashboard's Billing page posts here and
redirects the browser to the url that comes back.

    POST https://wnmrcngjsdlyddrdiqtj.supabase.co/functions/v1/stripe-checkout
    Authorization: Bearer <the signed-in user's access token>

    { "org_id": "…", "locations": 3,
      "success_url": "https://pigeonx.org/app/billing?ok=1",
      "cancel_url":  "https://pigeonx.org/app/billing" }

    → 200 { "url": "https://checkout.stripe.com/…", "session_id": "cs_…" }

## Authentication

Keeps JWT verification, so a request without a valid Supabase session never
reaches the handler. On top of that the function checks the caller is the
**owner** of `org_id`; a manager or staff member gets a 403. Billing is the one
thing role rank exists for.

Validate the body with `StripeCheckoutInput` from `@pigeonx/core` before posting;
the function re-checks everything anyway.

## Secrets

| name | where it comes from |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_PRICE_BUSINESS_LOCATION` | Stripe → Products → the per-location Business price → price id (`price_…`) |

The price must be a recurring, per-unit price. `locations` becomes the line
item's `quantity`, which is how $29/month/location is billed.

## Customer reuse

`organizations.stripe_customer_id` is reused when it is set and still exists on
Stripe's side; otherwise a customer is created and the id stored. Checking first
avoids a confusing failure when a customer was deleted in the Stripe dashboard.

The session carries `metadata.org_id` (and the same on `subscription_data`), which
is how `stripe-webhook` knows which org just paid before any
`stripe_customer_id` has been recorded.

## Errors

| status | meaning |
| --- | --- |
| 400 | bad body — not a uuid, locations outside 1–1000, relative redirect url |
| 401 | no or stale session |
| 403 | caller is not the org's owner |
| 404 | no such organization |
| 500 | `STRIPE_SECRET_KEY` or `STRIPE_PRICE_BUSINESS_LOCATION` is unset |
| 502 | Stripe refused or returned no url |

## Deploy

    SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) \
      npx supabase@latest functions deploy stripe-checkout \
      --project-ref wnmrcngjsdlyddrdiqtj
