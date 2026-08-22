import type { IOSOption } from 'react-native-audio-api';

/**
 * Options Apple accepts together with the `playback` category.
 * `allowAirPlay` and `allowBluetoothA2DP` are PlayAndRecord-only (AVAudioSessionTypes.h);
 * passing them with `playback` makes setCategory fail, the session never activates,
 * and the audio context refuses to resume.
 */
export const PLAYBACK_VALID_OPTIONS: ReadonlySet<IOSOption> = new Set<IOSOption>([
  'mixWithOthers',
  'duckOthers',
  'interruptSpokenAudioAndMixWithOthers',
]);

export const PLAYBACK_SESSION_OPTIONS: IOSOption[] = ['mixWithOthers'];
