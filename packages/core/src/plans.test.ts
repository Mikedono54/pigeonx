import { describe, expect, it } from 'vitest';
import { OUTPUT_KINDS, SYSTEM_PROFILE_UUIDS, systemProfile, type OutputKind } from './profiles.js';
import { BIRD_TARGETS, type BirdTarget } from './places.js';
import { ProtectionPlanInput, recommendPlan } from './plans.js';

const OTHER_OUTPUTS = OUTPUT_KINDS.filter((o) => o !== 'pigeonx_emitter');

describe('recommendPlan — audible plans', () => {
  it.each([
    ['pigeons', 'Pigeon Rotation', ['sys_distress_pigeon', 'sys_predator_hawk']],
    ['gulls', 'Gull Rotation', ['sys_gull_17k', 'sys_predator_falcon']],
    ['starlings', 'Mixed Flock Rotation', ['sys_distress_pigeon', 'sys_sweep_15_19k']],
    ['mixed_small', 'Mixed Flock Rotation', ['sys_distress_pigeon', 'sys_sweep_15_19k']],
    ['corvids', 'Corvid Rotation', ['sys_predator_hawk', 'sys_predator_falcon']],
    ['unsure', 'Starter Rotation', ['sys_distress_pigeon', 'sys_random_pulse']],
  ] as const)('%s → %s', (target, name, soundSlugs) => {
    for (const output of OUTPUT_KINDS) {
      const plan = recommendPlan(target, false, output);
      expect(plan.name, output).toBe(name);
      expect(plan.soundSlugs, output).toEqual(soundSlugs);
    }
  });
});

describe('recommendPlan — quiet plans', () => {
  it.each([
    ['pigeons', 'Quiet Pigeon Plan', ['sys_pigeon_18k', 'sys_random_pulse']],
    ['gulls', 'Quiet Gull Plan', ['sys_gull_17k', 'sys_sweep_15_19k']],
    ['starlings', 'Quiet Mixed Flock Plan', ['sys_sweep_15_19k', 'sys_random_pulse']],
    ['mixed_small', 'Quiet Mixed Flock Plan', ['sys_sweep_15_19k', 'sys_random_pulse']],
    ['unsure', 'Quiet Starter Plan', ['sys_sweep_15_19k', 'sys_random_pulse']],
  ] as const)('%s → %s', (target, name, soundSlugs) => {
    for (const output of OUTPUT_KINDS) {
      const plan = recommendPlan(target, true, output);
      expect(plan.name, output).toBe(name);
      expect(plan.soundSlugs, output).toEqual(soundSlugs);
    }
  });

  it('reaches for 22 kHz on crows only when PigeonX hardware can actually emit it', () => {
    const emitter = recommendPlan('corvids', true, 'pigeonx_emitter');
    expect(emitter.name).toBe('Quiet Corvid Plan');
    expect(emitter.soundSlugs).toEqual(['sys_random_pulse', 'sys_max_22k']);

    for (const output of OTHER_OUTPUTS) {
      const plan = recommendPlan('corvids', true, output);
      expect(plan.name, output).toBe('Quiet Corvid Plan');
      expect(plan.soundSlugs, output).toEqual(['sys_random_pulse', 'sys_pulse_16k']);
    }
  });
});

describe('recommendPlan — every plan it can return', () => {
  const every = BIRD_TARGETS.flatMap((target: BirdTarget) =>
    [false, true].flatMap((limitAudible) =>
      OUTPUT_KINDS.map((output: OutputKind) => ({
        target,
        limitAudible,
        output,
        plan: recommendPlan(target, limitAudible, output),
      })),
    ),
  );

  it('covers the whole matrix — 6 targets × 2 audible settings × 4 outputs', () => {
    expect(every).toHaveLength(48);
  });

  it('always rotates two real system sounds', () => {
    for (const { target, limitAudible, output, plan } of every) {
      const where = `${target}/${limitAudible}/${output}`;
      expect(plan.soundSlugs.length, where).toBe(2);
      expect(new Set(plan.soundSlugs).size, where).toBe(2);
      for (const slug of plan.soundSlugs) {
        expect(systemProfile(slug), `${where} → ${slug}`).toBeDefined();
        expect(SYSTEM_PROFILE_UUIDS[slug], `${where} → ${slug}`).toBeDefined();
      }
    }
  });

  it('always randomizes the order and runs 15 minutes', () => {
    for (const { target, plan } of every) {
      expect(plan.randomizeOrder, target).toBe(true);
      expect(plan.sessionMinutes, target).toBe(15);
    }
  });

  it('never puts a recorded call in a plan for a place with audible limits', () => {
    for (const { limitAudible, output, target, plan } of every) {
      if (!limitAudible) continue;
      for (const slug of plan.soundSlugs) {
        const sound = systemProfile(slug);
        expect(sound?.kind, `${target}/${output} → ${slug}`).not.toBe('sample');
      }
    }
  });

  it('names every quiet plan so it reads as the quiet one', () => {
    for (const { limitAudible, plan } of every) {
      expect(plan.name.startsWith('Quiet ')).toBe(limitAudible);
    }
  });
});

describe('ProtectionPlanInput', () => {
  const base = { name: 'Pigeon Rotation', owner_user_id: '00000000-0000-0000-0000-0000000000aa' };

  it('fills in the spec defaults', () => {
    const parsed = ProtectionPlanInput.safeParse(base);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.target).toBe('unsure');
    expect(parsed.data.randomize_order).toBe(true);
    expect(parsed.data.interval_seconds).toBe(0);
    expect(parsed.data.session_minutes).toBe(15);
    expect(parsed.data.output).toBe('phone');
    expect(parsed.data.volume).toBe(0.85);
    expect(parsed.data.days).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('needs exactly one owner', () => {
    expect(ProtectionPlanInput.safeParse({ name: 'orphan' }).success).toBe(false);
    expect(
      ProtectionPlanInput.safeParse({
        ...base,
        owner_org_id: '00000000-0000-0000-0000-0000000000bb',
      }).success,
    ).toBe(false);
  });

  it('rejects what the check constraints reject', () => {
    expect(ProtectionPlanInput.safeParse({ ...base, volume: 1.4 }).success).toBe(false);
    expect(ProtectionPlanInput.safeParse({ ...base, session_minutes: 0 }).success).toBe(false);
    expect(ProtectionPlanInput.safeParse({ ...base, interval_seconds: -1 }).success).toBe(false);
    expect(ProtectionPlanInput.safeParse({ ...base, name: '   ' }).success).toBe(false);
    expect(
      ProtectionPlanInput.safeParse({ ...base, starts_on: '2026-09-01', ends_on: '2026-08-01' })
        .success,
    ).toBe(false);
  });

  it('takes the sound ids as uuids, in rotation order', () => {
    const parsed = ProtectionPlanInput.safeParse({
      ...base,
      sound_ids: [SYSTEM_PROFILE_UUIDS.sys_distress_pigeon, SYSTEM_PROFILE_UUIDS.sys_predator_hawk],
    });
    expect(parsed.success && parsed.data.sound_ids).toEqual([
      SYSTEM_PROFILE_UUIDS.sys_distress_pigeon,
      SYSTEM_PROFILE_UUIDS.sys_predator_hawk,
    ]);
    expect(ProtectionPlanInput.safeParse({ ...base, sound_ids: ['sys_pigeon_18k'] }).success).toBe(
      false,
    );
  });
});
