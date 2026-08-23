# stripe-portal

Opens Stripe's billing portal so an owner can change the card, download
invoices, change the number of locations or cancel. PigeonX never sees card
details.

    POST https://wnmrcngjsdlyddrdiqtj.supabase.co/functions/v1/stripe-portal
    Authorization: Bearer <the signed-in user's access token>

    { "org_id": "…", "return_url": "https://pigeonx.org/app/billing" }

    → 200 { "url": "https://billing.stripe.com/…" }

## Authentication

Keeps JWT verification, and the caller must be the **owner** of `org_id`.

## Secrets

| name | where it comes from |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |

The portal must also be turned on once in Stripe → Settings → Billing → Customer
portal, or the session create fails.

## Errors

| status | meaning |
| --- | --- |
| 400 | bad body |
| 401 | no or stale session |
| 403 | caller is not the org's owner |
| 409 | the org has never checked out, so there is no Stripe customer to open |
| 502 | Stripe refused |

## Deploy

    SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) \
      npx supabase@latest functions deploy stripe-portal \
      --project-ref wnmrcngjsdlyddrdiqtj
