-- PigeonX seed: the nine system audio profiles.
-- Generated from packages/core/src/profiles.ts — keep the two in sync
-- (packages/core/src/seed.test.ts fails if they drift).

insert into public.audio_profiles (id, slug, name, description, kind, params, min_plan, is_system)
select v.id::uuid, v.slug, v.name, v.description, v.kind::profile_kind_t, v.params, v.min_plan::plan_t, true
from (values
  ('00000000-0000-0000-0000-000000000001', 'sys_pigeon_18k', 'Pigeon 18 kHz', 'Steady 18 kHz tone. The default starting point for pigeons on a phone speaker.', 'tone', '{"freqHz":18000,"gain":0.8}'::jsonb, 'free'),
  ('00000000-0000-0000-0000-000000000002', 'sys_pulse_16k', 'Pulse 16 kHz', 'Gated 16 kHz tone, 200 ms on / 800 ms off. Quieter to guests than the 18 kHz tone.', 'pulse', '{"freqHz":16000,"onMs":200,"offMs":800,"randomizePct":0,"gain":0.8}'::jsonb, 'free'),
  ('00000000-0000-0000-0000-000000000003', 'sys_sweep_15_19k', 'Sweep 15–19 kHz', 'Slow sweep across 15–19 kHz so birds cannot settle into one frequency.', 'sweep', '{"fromHz":15000,"toHz":19000,"rateHz":0.25,"gain":0.8}'::jsonb, 'free'),
  ('00000000-0000-0000-0000-000000000004', 'sys_gull_17k', 'Gull 17 kHz', 'Steady 17 kHz tone tuned for gulls and larger shorebirds.', 'tone', '{"freqHz":17000,"gain":0.85}'::jsonb, 'pro'),
  ('00000000-0000-0000-0000-000000000005', 'sys_random_pulse', 'Randomized pulse', 'Pulsed 16.5 kHz with 60% timing randomization to prevent habituation.', 'pulse', '{"freqHz":16500,"onMs":150,"offMs":600,"randomizePct":60,"gain":0.85}'::jsonb, 'pro'),
  ('00000000-0000-0000-0000-000000000006', 'sys_distress_pigeon', 'Pigeon distress call', 'Recorded pigeon distress call on a 20 s cycle. Audible to people — best away from seating.', 'sample', '{"asset":"distress_pigeon","gapMs":20000,"randomizePct":30,"gain":0.9}'::jsonb, 'pro'),
  ('00000000-0000-0000-0000-000000000007', 'sys_predator_hawk', 'Hawk call', 'Red-tailed hawk call on a 30 s cycle. Audible to people.', 'sample', '{"asset":"predator_hawk","gapMs":30000,"randomizePct":40,"gain":0.9}'::jsonb, 'pro'),
  ('00000000-0000-0000-0000-000000000008', 'sys_predator_falcon', 'Falcon call', 'Peregrine falcon call on a 30 s cycle. Audible to people.', 'sample', '{"asset":"predator_falcon","gapMs":30000,"randomizePct":40,"gain":0.9}'::jsonb, 'pro'),
  ('00000000-0000-0000-0000-000000000009', 'sys_max_22k', 'Max 22 kHz', 'Steady 22 kHz tone. Requires PigeonX hardware — phone and Bluetooth speakers cannot reproduce it.', 'tone', '{"freqHz":22000,"gain":0.9}'::jsonb, 'pro')
) as v (id, slug, name, description, kind, params, min_plan)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  kind = excluded.kind,
  params = excluded.params,
  min_plan = excluded.min_plan,
  is_system = true;
