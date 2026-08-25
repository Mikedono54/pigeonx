import { homeState } from '../src/core/homeState';
import {
  SPEAKER_STATUS_LABEL,
  reconnectLine,
  speakerMissing,
  speakerStatus,
} from '../src/core/speakerStatus';

/**
 * The app has no speaker health to read. What it has is a list of speakers
 * and the one this place was told to use, so these are the only three answers
 * it is allowed to give, and one case where it gives none.
 */

describe('what the app can say about a speaker', () => {
  it('says This phone when the phone is the speaker', () => {
    expect(speakerStatus({ output: 'phone', deviceId: null, knownIds: [] })).toBe('this_phone');
  });

  it('says nothing about a Bluetooth speaker, because it is not told which one is paired', () => {
    expect(speakerStatus({ output: 'bt_speaker', deviceId: null, knownIds: [] })).toBeNull();
    expect(speakerStatus({ output: 'bt_speaker', deviceId: 'dev_1', knownIds: ['dev_1'] })).toBeNull();
  });

  it('says Connected while the phone still has the speaker this place uses', () => {
    expect(speakerStatus({ output: 'simulated', deviceId: 'dev_1', knownIds: ['dev_1'] })).toBe(
      'connected',
    );
  });

  it('says Offline once that speaker is gone', () => {
    expect(speakerStatus({ output: 'simulated', deviceId: 'dev_1', knownIds: ['dev_2'] })).toBe(
      'offline',
    );
  });

  it('says Offline when a place points at hardware and no speaker is paired', () => {
    expect(
      speakerStatus({ output: 'pigeonx_emitter', deviceId: null, knownIds: [] }),
    ).toBe('offline');
  });

  it('names the three states in words a person reads', () => {
    expect(SPEAKER_STATUS_LABEL.this_phone).toBe('This phone');
    expect(SPEAKER_STATUS_LABEL.connected).toBe('Connected');
    expect(SPEAKER_STATUS_LABEL.offline).toBe('Offline');
  });
});

describe('needs attention', () => {
  it('is only ever a speaker that is gone', () => {
    expect(speakerMissing({ output: 'simulated', deviceId: 'dev_1', knownIds: [] })).toBe(true);
    expect(speakerMissing({ output: 'phone', deviceId: null, knownIds: [] })).toBe(false);
    expect(speakerMissing({ output: 'bt_speaker', deviceId: null, knownIds: [] })).toBe(false);
  });

  it('turns into the state Home shows', () => {
    const missing = speakerMissing({ output: 'simulated', deviceId: 'dev_1', knownIds: [] });
    expect(homeState({ playing: false, speakerMissing: missing, nextAt: null })).toBe('attention');
  });

  it('gives one move to make, and names the speaker when it can', () => {
    expect(reconnectLine('Living Room Speaker')).toBe(
      'Reconnect Living Room Speaker in your phone settings.',
    );
    expect(reconnectLine(null)).toBe('Reconnect your speaker in your phone settings.');
  });
});
