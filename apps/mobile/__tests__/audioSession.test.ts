import { PLAYBACK_SESSION_OPTIONS, PLAYBACK_VALID_OPTIONS } from '../src/audio/session';

describe('iOS audio session options', () => {
  it('only asks for options Apple allows with the playback category', () => {
    for (const o of PLAYBACK_SESSION_OPTIONS) {
      expect(PLAYBACK_VALID_OPTIONS.has(o)).toBe(true);
    }
  });
  it('never requests PlayAndRecord-only options', () => {
    expect(PLAYBACK_SESSION_OPTIONS).not.toContain('allowAirPlay');
    expect(PLAYBACK_SESSION_OPTIONS).not.toContain('allowBluetoothA2DP');
    expect(PLAYBACK_SESSION_OPTIONS).not.toContain('defaultToSpeaker');
  });
});
