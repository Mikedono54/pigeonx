import type { SampleAsset } from '../core/profiles';

/**
 * Bundled call assets.
 *
 * Every one of these is SYNTHESISED — they are placeholders so the `sample`
 * profile kind works end to end. Licensed/CC0 recordings replace them before
 * launch (spec §8). The UI must keep showing PLACEHOLDER_NOTICE next to them.
 */
export const SAMPLE_ASSETS: Record<SampleAsset, number> = {
  distress_pigeon: require('../../assets/audio/distress_pigeon.wav'),
  predator_hawk: require('../../assets/audio/predator_hawk.wav'),
  predator_falcon: require('../../assets/audio/predator_falcon.wav'),
  alarm_generic: require('../../assets/audio/alarm_generic.wav'),
};

export const SAMPLE_LABEL: Record<SampleAsset, string> = {
  distress_pigeon: 'Pigeon distress call',
  predator_hawk: 'Hawk call',
  predator_falcon: 'Falcon call',
  alarm_generic: 'Generic alarm',
};

export const PLACEHOLDER_NOTICE = 'Synthesized placeholder';
