import { SYSTEM_PROFILES, SYSTEM_PROFILE_UUIDS } from '../packages/core/src/profiles.ts';

const esc = (s: string) => s.replace(/'/g, "''");
const rows = SYSTEM_PROFILES.map((p) => {
  const uuid = SYSTEM_PROFILE_UUIDS[p.id];
  return `  ('${uuid}', '${p.id}', '${esc(p.name)}', '${esc(p.description)}', '${p.kind}', '${JSON.stringify(p.params)}'::jsonb, '${p.minPlan}')`;
}).join(',\n');

const sql = `-- PigeonX seed: the nine system audio profiles.
-- Generated from packages/core/src/profiles.ts — keep the two in sync
-- (packages/core/src/seed.test.ts fails if they drift).

insert into public.audio_profiles (id, slug, name, description, kind, params, min_plan, is_system)
select v.id::uuid, v.slug, v.name, v.description, v.kind::profile_kind_t, v.params, v.min_plan::plan_t, true
from (values
${rows}
) as v (id, slug, name, description, kind, params, min_plan)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  kind = excluded.kind,
  params = excluded.params,
  min_plan = excluded.min_plan,
  is_system = true;
`;
process.stdout.write(sql);
