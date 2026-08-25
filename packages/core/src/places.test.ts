import { describe, expect, it } from 'vitest';
import {
  AREA_SIZES,
  AREA_SIZE_LABELS,
  AreaSizeSchema,
  BIRD_TARGETS,
  BIRD_TARGET_LABELS,
  BirdTargetSchema,
  PLACE_KINDS,
  PLACE_KIND_LABELS,
  PlaceKindSchema,
  SCHEDULE_TRIGGERS,
  SCHEDULE_TRIGGER_LABELS,
  ScheduleTriggerSchema,
  SESSION_RESULTS,
  SESSION_RESULT_LABELS,
  SessionResultSchema,
  UserPlaceInput,
} from './places.js';

describe('bird targets', () => {
  it('lists the six species groups the onboarding asks about', () => {
    expect(BIRD_TARGETS).toEqual([
      'pigeons',
      'gulls',
      'starlings',
      'corvids',
      'mixed_small',
      'unsure',
    ]);
  });

  it('labels every target in plain language', () => {
    for (const t of BIRD_TARGETS) {
      expect(BIRD_TARGET_LABELS[t], t).toMatch(/^[A-Z]/);
    }
  });

  it('says "Crows or jays", never "corvids", to the person holding the phone', () => {
    expect(BIRD_TARGET_LABELS.corvids).toBe('Crows or jays');
    expect(BIRD_TARGET_LABELS.mixed_small).toBe('Small mixed birds');
    expect(BIRD_TARGET_LABELS.unsure).toBe('Not sure');
    expect(BIRD_TARGET_LABELS.pigeons).toBe('Pigeons');
    expect(BIRD_TARGET_LABELS.gulls).toBe('Gulls');
    expect(BIRD_TARGET_LABELS.starlings).toBe('Starlings');
  });

  it('parses what the DB stores and rejects anything else', () => {
    expect(BirdTargetSchema.safeParse('mixed_small').success).toBe(true);
    expect(BirdTargetSchema.safeParse('sparrows').success).toBe(false);
  });
});

describe('place kinds', () => {
  it('lists the nine things people protect', () => {
    expect(PLACE_KINDS).toEqual([
      'balcony',
      'roof',
      'dock',
      'storefront',
      'warehouse',
      'parking',
      'garden',
      'farm',
      'custom',
    ]);
  });

  it('spells out the abbreviated kinds', () => {
    expect(PLACE_KIND_LABELS.dock).toBe('Dock or marina');
    expect(PLACE_KIND_LABELS.parking).toBe('Parking structure');
    expect(PLACE_KIND_LABELS.farm).toBe('Farm or field');
  });

  it('labels every kind', () => {
    for (const k of PLACE_KINDS) expect(PLACE_KIND_LABELS[k], k).toBeTruthy();
    expect(PlaceKindSchema.safeParse('rooftop').success).toBe(false);
  });
});

describe('area size', () => {
  it('matches the three sizes the column allows', () => {
    expect(AREA_SIZES).toEqual(['small', 'medium', 'large']);
    for (const s of AREA_SIZES) expect(AREA_SIZE_LABELS[s], s).toBeTruthy();
    expect(AreaSizeSchema.safeParse('huge').success).toBe(false);
  });
});

describe('session results', () => {
  it('matches the four buttons on the post-session prompt', () => {
    expect(SESSION_RESULTS).toEqual(['left', 'some_left', 'not_yet', 'unknown']);
    expect(SESSION_RESULT_LABELS.left).toBe('They left');
    expect(SESSION_RESULT_LABELS.some_left).toBe('Some left');
    expect(SESSION_RESULT_LABELS.not_yet).toBe('Not yet');
    expect(SESSION_RESULT_LABELS.unknown).toBe('I could not tell');
  });

  it('parses a reported result', () => {
    expect(SessionResultSchema.safeParse('some_left').success).toBe(true);
    expect(SessionResultSchema.safeParse('worked').success).toBe(false);
  });
});

describe('schedule triggers', () => {
  it('offers a clock time, sunrise and sunset', () => {
    expect(SCHEDULE_TRIGGERS).toEqual(['time', 'sunrise', 'sunset']);
    expect(SCHEDULE_TRIGGER_LABELS.sunrise).toBe('At sunrise');
    expect(SCHEDULE_TRIGGER_LABELS.sunset).toBe('At sunset');
    expect(ScheduleTriggerSchema.safeParse('noon').success).toBe(false);
  });
});

describe('UserPlaceInput', () => {
  it('needs only a name — the rest of onboarding can be skipped', () => {
    const parsed = UserPlaceInput.safeParse({ name: 'Back balcony' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.people_nearby).toBe(true);
      expect(parsed.data.limit_audible).toBe(false);
    }
  });

  it('trims the name and rejects an empty one', () => {
    const parsed = UserPlaceInput.safeParse({ name: '  Roof  ' });
    expect(parsed.success && parsed.data.name).toBe('Roof');
    expect(UserPlaceInput.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('accepts the full set of answers', () => {
    const parsed = UserPlaceInput.safeParse({
      name: 'Marina slip 12',
      kind: 'dock',
      target: 'gulls',
      area_size: 'large',
      people_nearby: false,
      limit_audible: true,
      birds_active: 'early morning',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an area size the check constraint would reject', () => {
    expect(UserPlaceInput.safeParse({ name: 'Roof', area_size: 'enormous' }).success).toBe(false);
  });
});
