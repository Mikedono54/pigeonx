import type { SampleAsset } from '../core/profiles';

/**
 * Bundled bird call files.
 *
 * Every one of these is made by a computer. They are stand-ins so the bird
 * call sounds work end to end. Real recordings replace them before launch
 * (spec section 8). The app must keep showing PLACEHOLDER_NOTICE next to them.
 */
export const SAMPLE_ASSETS: Record<SampleAsset, number> = {
  distress_pigeon: require('../../assets/audio/distress_pigeon.wav'),
  predator_hawk: require('../../assets/audio/predator_hawk.wav'),
  predator_falcon: require('../../assets/audio/predator_falcon.wav'),
  alarm_generic: require('../../assets/audio/alarm_generic.wav'),
};

export const SAMPLE_LABEL: Record<SampleAsset, string> = {
  distress_pigeon: 'Pigeon alarm call',
  predator_hawk: 'Hawk call',
  predator_falcon: 'Falcon call',
  alarm_generic: 'Plain alarm call',
};

export const PLACEHOLDER_NOTICE = 'Stand-in';
