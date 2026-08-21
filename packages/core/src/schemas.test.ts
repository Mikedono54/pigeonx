import { describe, expect, it } from 'vitest';
import {
  AudioProfileRow,
  DeviceInput,
  ScheduleInput,
  StartSessionInput,
  TimeOfDay,
  Uuid,
  ZoneInput,
} from './schemas.js';
import { SYSTEM_PROFILE_UUIDS } from './profiles.js';

const ORG = '00000000-0000-0000-0000-0000000000aa';

describe('Uuid', () => {
  it('accepts the seeded system-profile uuids', () => {
    for (const u of Object.values(SYSTEM_PROFILE_UUIDS)) {
      expect(Uuid.safeParse(u).success, u).toBe(true);
    }
  });

  it('rejects a non-uuid', () => {
    expect(Uuid.safeParse('sys_pigeon_18k').success).toBe(false);
  });
});

describe('TimeOfDay', () => {
  it.each(['06:00', '23:59', '06:00:00'])('accepts %s', (t) => {
    expect(TimeOfDay.safeParse(t).success).toBe(true);
  });

  it.each(['24:00', '6:00', 'evening'])('rejects %s', (t) => {
    expect(TimeOfDay.safeParse(t).success).toBe(false);
  });
});

describe('ZoneInput', () => {
  it('defaults trigger_mode to manual', () => {
    const parsed = ZoneInput.parse({ location_id: ORG, name: 'Patio' });
    expect(parsed.trigger_mode).toBe('manual');
  });

  it('rejects an empty name', () => {
    expect(ZoneInput.safeParse({ location_id: ORG, name: '' }).success).toBe(false);
  });
});

describe('DeviceInput', () => {
  it('accepts every output kind as a device kind', () => {
    for (const kind of ['phone', 'bt_speaker', 'pigeonx_emitter', 'simulated'] as const) {
      expect(DeviceInput.safeParse({ kind, name: 'Rooftop 1' }).success, kind).toBe(true);
    }
  });

  it('rejects an unknown kind', () => {
    expect(DeviceInput.safeParse({ kind: 'drone', name: 'x' }).success).toBe(false);
  });
});

describe('ScheduleInput', () => {
  const base = {
    zone_id: ORG,
    profile_id: SYSTEM_PROFILE_UUIDS['sys_pigeon_18k'],
    days: [1, 2, 3, 4, 5],
    start_time: '06:00',
    end_time: '20:00',
    executor: 'reminder' as const,
  };

  it('accepts a weekday window and defaults to enabled', () => {
    expect(ScheduleInput.parse(base).enabled).toBe(true);
  });

  it('rejects a zero-length window', () => {
    expect(ScheduleInput.safeParse({ ...base, end_time: '06:00' }).success).toBe(false);
  });

  it('rejects an out-of-range weekday', () => {
    expect(ScheduleInput.safeParse({ ...base, days: [7] }).success).toBe(false);
  });

  it('rejects an empty day list', () => {
    expect(ScheduleInput.safeParse({ ...base, days: [] }).success).toBe(false);
  });
});

describe('StartSessionInput', () => {
  it('defaults source to manual and allows a zone-less solo run', () => {
    const parsed = StartSessionInput.parse({
      profile_id: SYSTEM_PROFILE_UUIDS['sys_pulse_16k'],
      output_kind: 'phone',
    });
    expect(parsed.source).toBe('manual');
    expect(parsed.zone_id ?? null).toBeNull();
  });

  it('rejects an unknown output kind', () => {
    expect(
      StartSessionInput.safeParse({
        profile_id: SYSTEM_PROFILE_UUIDS['sys_pulse_16k'],
        output_kind: 'megaphone',
      }).success,
    ).toBe(false);
  });
});

describe('AudioProfileRow', () => {
  it('maps a snake_case DB row into an AudioProfile', () => {
    const parsed = AudioProfileRow.parse({
      id: SYSTEM_PROFILE_UUIDS['sys_pigeon_18k'],
      name: 'Pigeon 18 kHz',
      description: null,
      kind: 'tone',
      params: { freqHz: 18000, gain: 0.8 },
      min_plan: 'free',
      is_system: true,
      owner_user_id: null,
      owner_org_id: null,
    });
    expect(parsed.kind).toBe('tone');
    expect(parsed.minPlan).toBe('free');
    expect(parsed.isSystem).toBe(true);
    expect(parsed.description).toBe('');
  });

  it('rejects a row whose params do not match its kind', () => {
    const bad = AudioProfileRow.safeParse({
      id: SYSTEM_PROFILE_UUIDS['sys_pigeon_18k'],
      name: 'Broken',
      description: null,
      kind: 'sweep',
      params: { freqHz: 18000, gain: 0.8 },
      min_plan: 'free',
      is_system: true,
    });
    expect(bad.success).toBe(false);
  });
});
