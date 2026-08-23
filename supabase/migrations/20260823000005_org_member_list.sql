-- Teammate names for the dashboard Team table. Members of an org may see the
-- email and display name of other members of that org, nothing else.
create or replace function public.org_member_list(p_org_id uuid)
returns table (user_id uuid, email text, display_name text, role public.member_role_t, joined_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select m.user_id, u.email::text, p.display_name, m.role, m.created_at
  from public.org_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.org_id = p_org_id
    and exists (select 1 from public.org_members me where me.org_id = p_org_id and me.user_id = auth.uid())
  order by m.created_at;
$$;
revoke all on function public.org_member_list(uuid) from public;
grant execute on function public.org_member_list(uuid) to authenticated;
