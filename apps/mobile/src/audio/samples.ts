import type { SampleAsset } from '../core/profiles';

/**
 * Bundled bird call recordings.
 *
 * All four are real recordings, cleared for use. Where each one came from,
 * who recorded it and what it is licensed under lives in
 * `assets/audio/SOURCES.md`, and Settings shows those credits under About.
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
  alarm_generic: 'Jay alarm call',
};

/** One word each, for a row of choices that has to fit on one line. */
export const SAMPLE_SHORT: Record<SampleAsset, string> = {
  distress_pigeon: 'Pigeon',
  predator_hawk: 'Hawk',
  predator_falcon: 'Falcon',
  alarm_generic: 'Jay',
};

export interface SoundCredit {
  /** the sound as a person knows it */
  title: string;
  /** what was recorded, who recorded it, and what it is licensed under */
  lines: string[];
}

/**
 * The credits, as Settings shows them. Kept in step with
 * `assets/audio/SOURCES.md`, which carries the full detail and the links.
 */
export const SOUND_CREDITS: SoundCredit[] = [
  {
    title: 'Pigeon distress call',
    lines: [
      'Pigeons fighting, recorded by Joseph Sardin.',
      'bigsoundbank.com. Public domain, CC0.',
    ],
  },
  {
    title: 'Hawk call',
    lines: [
      'Red-tailed Hawk, recorded by Jonathon Jongsma.',
      'Wikimedia Commons, CC BY-SA 3.0. This clip is shared under the same licence.',
    ],
  },
  {
    title: 'Falcon call',
    lines: [
      'Peregrine falcon at Bryce Canyon National Park.',
      'National Park Service sound gallery. Public domain.',
    ],
  },
  {
    title: 'Jay alarm call',
    lines: [
      'Eurasian jay, recorded by Joseph Sardin and Axeline T.',
      'bigsoundbank.com. Public domain, CC0.',
    ],
  },
];

/** One line under the credits, saying what we did to every clip. */
export const SOUND_CREDITS_NOTE =
  'Each clip was trimmed, mixed to mono and levelled for the app.';
