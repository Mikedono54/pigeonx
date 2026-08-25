import { MASCOT_LABEL, mascotPose } from '../src/core/mascot';

/**
 * The bird is a state indicator. Every pose has to come out of something the
 * app knows, and two poses must never be able to describe the same moment.
 */

const base = { state: 'off' as const, ready: false };

describe('which pose the bird is in', () => {
  it('stands calm when nothing is set and nothing is running', () => {
    expect(mascotPose(base)).toBe('calm');
  });

  it('watches the button once a sound and a speaker are both picked', () => {
    expect(mascotPose({ ...base, ready: true })).toBe('ready');
  });

  it('calls while a sound is coming out', () => {
    expect(mascotPose({ ...base, state: 'active', ready: true })).toBe('calling');
  });

  it('stands by the clock when a session is set for later', () => {
    expect(mascotPose({ ...base, state: 'scheduled', ready: true })).toBe('waiting');
  });

  it('looks at the speaker that is gone', () => {
    expect(mascotPose({ ...base, state: 'attention', ready: true })).toBe('offline');
  });

  it('walks off when a session has just ended', () => {
    expect(mascotPose({ ...base, finishing: true })).toBe('leaving');
  });

  it('keeps walking off rather than going back to the clock straight away', () => {
    expect(mascotPose({ ...base, state: 'scheduled', finishing: true })).toBe('leaving');
  });

  it('lets what a person can hear beat the walk off', () => {
    expect(mascotPose({ ...base, state: 'active', finishing: true })).toBe('calling');
  });

  it('lets a speaker that is gone beat the walk off', () => {
    expect(mascotPose({ ...base, state: 'attention', finishing: true })).toBe('offline');
  });

  it('says something plain about every pose it can be in', () => {
    for (const label of Object.values(MASCOT_LABEL)) {
      expect(label.length).toBeGreaterThan(4);
      expect(label).not.toMatch(/[–—]/);
    }
  });
});
