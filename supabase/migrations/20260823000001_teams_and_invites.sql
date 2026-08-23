-- Teams: create an org, invite by email, accept, remove — plus account deletion.
--
-- Membership writes cannot go through plain RLS inserts: the invitee is not yet
-- a member (so no policy can let them in) and a brand-new org has no owner to
-- authorise its own creation. Both flows therefore run as security-definer RPCs
-- that check the caller themselves.

-- ─── org_invites ──────────────────────────────────────────────────────────────

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role member_role_t not null default 'staff',
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_invites_email_ck check (position('@' in email) > 1)
);

create index org_invites_org_idx on public.org_invites (org_id);
create index org_invites_email_idx on public.org_invites (lower(email));

-- One live invite per (org, email); re-inviting refreshes the existing row.
create unique index org_invites_pending_uniq
  on public.org_invites (org_id, lower(email))
  where accepted_at is null;

create trigger set_updated_at before update on public.org_invites
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.org_invites to authenticated;
grant all on public.org_invites to service_role;

alter table public.org_invites enable row level security;

-- The invitee's own address, as Auth knows it. `auth.email()` reads the JWT;
-- the fallback covers tokens minted without an email claim.
create or replace function public.current_email()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(coalesce(
    nullif(auth.email(), ''),
    (select u.email from auth.users u where u.id = auth.uid())
  ));
$$;

grant execute on function public.current_email() to authenticated;

create policy org_invites_select on public.org_invites
  for select to authenticated
  using (
    public.is_org_member(org_id, 'manager')
    or lower(email) = public.current_email()
  );

create policy org_invites_insert_manager on public.org_invites
  for insert to authenticated with check (public.is_org_member(org_id, 'manager'));

create policy org_invites_update_manager on public.org_invites
  for update to authenticated
  using (public.is_org_member(org_id, 'manager'))
  with check (public.is_org_member(org_id, 'manager'));

create policy org_invites_delete_manager on public.org_invites
  for delete to authenticated using (public.is_org_member(org_id, 'manager'));

-- ─── create_org ───────────────────────────────────────────────────────────────

-- New orgs start on `business`; Enterprise is a sales-assisted upgrade.
create or replace function public.create_org(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'an organization needs a name' using errcode = '22023';
  end if;

  insert into public.organizations (name, plan, contact_email)
  values (btrim(p_name), 'business', public.current_email())
  returning id into new_id;

  insert into public.org_members (org_id, user_id, role)
  values (new_id, uid, 'owner');

  return new_id;
end;
$$;

-- ─── invite_member ────────────────────────────────────────────────────────────

-- Managers may add staff and managers; only an owner may mint another owner.
create or replace function public.invite_member(
  p_org_id uuid,
  p_email text,
  p_role member_role_t default 'staff'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_token uuid;
  normalized text := lower(btrim(p_email));
begin
  if auth.uid() is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  if not public.is_org_member(p_org_id, 'manager') then
    raise exception 'only an owner or manager may invite members' using errcode = '42501';
  end if;
  if p_role = 'owner' and not public.is_org_member(p_org_id, 'owner') then
    raise exception 'only an owner may invite another owner' using errcode = '42501';
  end if;
  if normalized is null or position('@' in normalized) < 2 then
    raise exception 'a valid email address is required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.org_members m
    join auth.users u on u.id = m.user_id
    where m.org_id = p_org_id and lower(u.email) = normalized
  ) then
    raise exception 'that person is already a member' using errcode = '23505';
  end if;

  insert into public.org_invites (org_id, email, role, invited_by)
  values (p_org_id, normalized, p_role, auth.uid())
  on conflict (org_id, (lower(email))) where accepted_at is null
  do update set
    role = excluded.role,
    invited_by = excluded.invited_by,
    token = gen_random_uuid(),
    expires_at = now() + interval '7 days',
    updated_at = now()
  returning token into invite_token;

  return invite_token;
end;
$$;

-- ─── accept_invite ────────────────────────────────────────────────────────────

-- The token alone is not enough: the signed-in address must match the invited
-- one, so a leaked link cannot be redeemed by whoever finds it.
create or replace function public.accept_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  me text := public.current_email();
  inv public.org_invites;
begin
  if uid is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;

  select * into inv from public.org_invites where token = p_token;
  if not found then
    raise exception 'this invite link is not valid' using errcode = 'P0002';
  end if;
  if inv.accepted_at is not null then
    raise exception 'this invite has already been used' using errcode = '22023';
  end if;
  if inv.expires_at <= now() then
    raise exception 'this invite has expired' using errcode = '22023';
  end if;
  if me is null or lower(inv.email) <> me then
    raise exception 'this invite was sent to a different email address'
      using errcode = '42501';
  end if;

  insert into public.org_members (org_id, user_id, role)
  values (inv.org_id, uid, inv.role)
  on conflict (org_id, user_id) do update set role = excluded.role;

  update public.org_invites set accepted_at = now() where id = inv.id;

  return inv.org_id;
end;
$$;

-- ─── remove_member ────────────────────────────────────────────────────────────

create or replace function public.remove_member(p_org_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role member_role_t;
  owner_count int;
begin
  if auth.uid() is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  if not public.is_org_member(p_org_id, 'owner') then
    raise exception 'only an owner may remove members' using errcode = '42501';
  end if;

  select role into target_role
  from public.org_members
  where org_id = p_org_id and user_id = p_user_id;

  if not found then
    return false;
  end if;

  if target_role = 'owner' then
    select count(*) into owner_count
    from public.org_members
    where org_id = p_org_id and role = 'owner';
    if owner_count <= 1 then
      raise exception 'an organization must keep at least one owner'
        using errcode = '23514';
    end if;
  end if;

  delete from public.org_members where org_id = p_org_id and user_id = p_user_id;

  -- Drop any unused invite so the person can be re-invited cleanly.
  delete from public.org_invites i
  using auth.users u
  where i.org_id = p_org_id
    and u.id = p_user_id
    and lower(i.email) = lower(u.email)
    and i.accepted_at is null;

  return true;
end;
$$;

-- ─── my_memberships ───────────────────────────────────────────────────────────

create or replace function public.my_memberships()
returns table (org_id uuid, name text, plan org_plan_t, role member_role_t)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, o.plan, m.role
  from public.organizations o
  join public.org_members m on m.org_id = o.id and m.user_id = auth.uid()
  order by o.name;
$$;

-- ─── delete_my_account ────────────────────────────────────────────────────────

-- Apple requires account deletion from inside the app (App Store Review 5.1.1v).
-- Everything the account owns goes; an org the caller solely owns goes with it,
-- but an org with other people in it must be handed over first.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  org record;
  solo_orgs uuid[] := '{}';
begin
  if uid is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;

  for org in
    select m.org_id,
           (select count(*) from public.org_members x
             where x.org_id = m.org_id and x.role = 'owner') as owners,
           (select count(*) from public.org_members x
             where x.org_id = m.org_id) as members
    from public.org_members m
    where m.user_id = uid and m.role = 'owner'
  loop
    if org.owners <= 1 then
      if org.members > 1 then
        raise exception
          'you are the only owner of an organization with other members — make someone else an owner first'
          using errcode = '23514';
      end if;
      solo_orgs := solo_orgs || org.org_id;
    end if;
  end loop;

  delete from public.sessions where user_id = uid;
  delete from public.audio_profiles where owner_user_id = uid;
  delete from public.org_members where user_id = uid;
  delete from public.org_invites where lower(email) = public.current_email();

  -- Orgs the caller alone owned and alone belonged to: nothing left to hand over.
  if array_length(solo_orgs, 1) is not null then
    delete from public.organizations where id = any (solo_orgs);
  end if;

  delete from public.subscriptions where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

-- ─── grants ───────────────────────────────────────────────────────────────────

grant execute on function public.create_org(text) to authenticated;
grant execute on function public.invite_member(uuid, text, member_role_t) to authenticated;
grant execute on function public.accept_invite(uuid) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.my_memberships() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
