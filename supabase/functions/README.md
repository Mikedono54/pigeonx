# PigeonX edge functions

Deno functions on the `wnmrcngjsdlyddrdiqtj` project. Each has its own README
with its request shape, its errors and its deploy line.

| function | JWT | what it does |
| --- | --- | --- |
| [`rc-webhook`](./rc-webhook) | **off** | RevenueCat → `subscriptions` + `profiles.plan` (free/pro) |
| [`stripe-webhook`](./stripe-webhook) | **off** | Stripe → `subscriptions` + `organizations.plan` (free/business) |
| [`stripe-checkout`](./stripe-checkout) | on | owner starts a Business subscription, returns a Checkout url |
| [`stripe-portal`](./stripe-portal) | on | owner opens Stripe's billing portal |
| [`weekly-report`](./weekly-report) | on | per-location weekly summary into `location_reports`, sender stubbed |

The two webhooks are deployed `--no-verify-jwt` because RevenueCat and Stripe
have no Supabase session. They are not unauthenticated: each verifies its own
credential (a bearer secret, a request signature) before touching the database,
and answers 401 otherwise. Every other function keeps JWT verification and then
checks the caller's role on top of it, because being signed in is not the same
as being the owner who may spend money.

## Secrets the owner must supply

Set them with, for each pair:

    SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) \
      npx supabase@latest secrets set NAME=value --project-ref wnmrcngjsdlyddrdiqtj

| secret | used by | where it comes from |
| --- | --- | --- |
| `RC_WEBHOOK_SECRET` | `rc-webhook` | you invent it; paste the same value into RevenueCat → Project settings → Integrations → Webhooks → Authorization header, as `Bearer <value>` |
| `STRIPE_SECRET_KEY` | `stripe-webhook`, `stripe-checkout`, `stripe-portal` | Stripe → Developers → API keys → secret key (`sk_live_…` / `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Stripe → Developers → Webhooks → the PigeonX endpoint → signing secret (`whsec_…`) |
| `STRIPE_PRICE_BUSINESS_LOCATION` | `stripe-checkout` | Stripe → Products → the per-location Business price → price id (`price_…`); must be recurring and per-unit |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
by the platform and must not be set by hand.

No RevenueCat or Stripe account has been created. Until these four exist the
webhooks answer 500 and write nothing, and checkout answers 500 with "billing is
not configured yet" — which is the correct behaviour, not a bug to work around.

### Endpoints to register once the accounts exist

- RevenueCat webhook → `https://wnmrcngjsdlyddrdiqtj.supabase.co/functions/v1/rc-webhook`
- Stripe webhook → `https://wnmrcngjsdlyddrdiqtj.supabase.co/functions/v1/stripe-webhook`,
  subscribed to `checkout.session.completed`, `customer.subscription.updated`
  and `customer.subscription.deleted`.

## `_shared/`

`_shared/billing.ts` and `_shared/reports.ts` are copies of
`packages/core/src/billing.ts` and `reports.ts`. They are copies rather than
imports because Deno will not resolve the `./x.js` specifiers the workspace
package uses and an edge function must not pull in zod.

A copy that drifts is worse than no copy, so `packages/core/src/edge-parity.test.ts`
runs both implementations over the same cases and fails the moment they
disagree. Change one, change the other; the test will tell you.

    pnpm --filter @pigeonx/core test

`_shared/http.ts` holds JSON/CORS replies, `requireEnv`, a constant-time secret
compare and a uuid check. `_shared/supabase.ts` holds the service-role client,
the caller-scoped client and the org-role check.

## Deploying

    SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) \
      npx supabase@latest functions deploy <name> --project-ref wnmrcngjsdlyddrdiqtj

Add `--no-verify-jwt` for `rc-webhook` and `stripe-webhook` only.

The Supabase CLI hangs reading the macOS Keychain in a non-interactive shell, so
always pass `SUPABASE_ACCESS_TOKEN` on the command line rather than relying on a
stored login.

## Scheduling `weekly-report`

Monday 07:00 UTC. Both a pg_cron recipe and the dashboard route are written up
in [`weekly-report/README.md`](./weekly-report/README.md), and the cron line is
recorded as a comment in `supabase/config.toml`.
