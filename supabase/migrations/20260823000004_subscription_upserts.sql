-- One live subscription row per subject per provider, so the webhooks can
-- upsert instead of insert-then-reconcile. Webhooks arrive out of order and are
-- retried; without a conflict target a retry would leave a duplicate behind.

create unique index subscriptions_user_provider_uniq
  on public.subscriptions (user_id, provider)
  where user_id is not null;

create unique index subscriptions_org_provider_uniq
  on public.subscriptions (org_id, provider)
  where org_id is not null;

-- An org whose Stripe subscription lapses has to land somewhere. Until now
-- `org_plan_t` only had the two paid tiers, so a cancelled Business account
-- would have kept its dashboard forever. `free` is where `stripe-webhook` puts
-- it: the org and its data stay, the Business features stop.
alter type org_plan_t add value if not exists 'free' before 'business';
