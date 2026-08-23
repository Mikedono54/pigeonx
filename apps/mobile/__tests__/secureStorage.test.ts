import * as SecureStore from 'expo-secure-store';
import {
  __setKeychainAvailable,
  markerFor,
  partKey,
  readMarker,
  secureStorage,
  splitIntoParts,
} from '../src/services/secureStorage';

beforeEach(() => {
  __setKeychainAvailable(true);
});

describe('splitting a long value', () => {
  it('cuts it into pieces the keychain accepts', () => {
    const parts = splitIntoParts('a'.repeat(4000));
    expect(parts).toHaveLength(3);
    expect(parts.join('')).toBe('a'.repeat(4000));
  });

  it('keeps a short value in one piece', () => {
    expect(splitIntoParts('hello')).toEqual(['hello']);
  });

  it('never returns an empty list', () => {
    expect(splitIntoParts('')).toEqual(['']);
  });

  it('reads back how many pieces there are', () => {
    expect(readMarker(markerFor(['a', 'b']))).toBe(2);
    expect(readMarker('a plain value')).toBeNull();
    expect(readMarker(null)).toBeNull();
  });
});

describe('the store the sign-in token lives in', () => {
  it('writes a long value and reads the same one back', async () => {
    const token = JSON.stringify({ blob: 'x'.repeat(5000) });
    await secureStorage.setItem('sb-test-auth-token', token);
    expect(await secureStorage.getItem('sb-test-auth-token')).toBe(token);
  });

  it('cleans up pieces a shorter value no longer needs', async () => {
    await secureStorage.setItem('k', 'y'.repeat(5000));
    await secureStorage.setItem('k', 'short');
    expect(await secureStorage.getItem('k')).toBe('short');
    expect(await SecureStore.getItemAsync(partKey('k', 1))).toBeNull();
  });

  it('forgets everything when it is asked to', async () => {
    await secureStorage.setItem('gone', 'z'.repeat(4000));
    await secureStorage.removeItem('gone');
    expect(await secureStorage.getItem('gone')).toBeNull();
    expect(await SecureStore.getItemAsync(partKey('gone', 0))).toBeNull();
  });

  it('falls back to normal storage on a phone with no keychain', async () => {
    __setKeychainAvailable(false);
    await secureStorage.setItem('fallback', 'value');
    expect(await secureStorage.getItem('fallback')).toBe('value');
    await secureStorage.removeItem('fallback');
    expect(await secureStorage.getItem('fallback')).toBeNull();
  });
});
