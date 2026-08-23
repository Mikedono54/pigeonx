# rc-webhook

RevenueCat's webhook endpoint. Turns app-store purchase events into a
`subscriptions` row and a `profiles.plan` of `pro` or `free`.

    POST https://wnmrcngjsdlyddrdiqtj.supabase.co/functions/v1/rc-webhook

## Authentication

Deployed with `--no-verify-jwt`, because RevenueCat has no Supabase session. It
authenticates with the shared secret you set on the RevenueCat webhook, which
arrives as:

    Authorization: Bearer <RC_WEBHOOK_SECRET>

The compare is constant-time. A wrong or missing header is a 401 and nothing is
written.

## Secrets

| name | where it comes from |
| --- | --- |
| `RC_WEBHOOK_SECRET` | you invent it, then paste the same value into RevenueCat → Project → Integrations → Webhooks → Authorization header |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.

## Events handled

| event | plan | `subscriptions.status` |
| --- | --- | --- |
| `INITIAL_PURCHASE` | pro | active |
| `RENEWAL` | pro | active |
| `UNCANCELLATION` | pro | active |
| `PRODUCT_CHANGE` | pro | active |
| `CANCELLATION` | pro until the period ends | canceled |
| `EXPIRATION` | free | expired |

A cancellation is not a downgrade. RevenueCat sends it when auto-renew is
switched off, and the person keeps what they paid for; `EXPIRATION` is the event
that actually takes Pro away. Anything else (`TEST`, `TRANSFER`,
`SUBSCRIBER_ALIAS`, …) is acknowledged with a 200 and ignored — a 4xx would only
make RevenueCat retry something we will never act on.

## Matching the purchase to an account

The mobile app sets RevenueCat's app user id to the Supabase user id, so the
usual case is a straight uuid lookup on `profiles.id`. Failing that it tries
`profiles.rc_app_user_id` (an anonymous purchase later attached to an account)
and `original_app_user_id` (a transfer). An event that matches nothing is logged
and answered 200: retrying will not conjure an account that does not exist.

## Logic and tests

The plan decision lives in `../_shared/billing.ts`, mirrored from
`packages/core/src/billing.ts`. `packages/core/src/billing.test.ts` covers it and
`packages/core/src/edge-parity.test.ts` fails if the two copies drift:

    pnpm --filter @pigeonx/core test

## Deploy

    SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) \
      npx supabase@latest functions deploy rc-webhook \
      --project-ref wnmrcngjsdlyddrdiqtj --no-verify-jwt
