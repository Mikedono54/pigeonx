/* eslint-env jest */

// The native audio module never exists under Jest — every engine test runs
// against MockAudioEngine, and nativeEngine.ts is expected to degrade to null.
jest.mock('react-native-audio-api', () => {
  throw new Error('react-native-audio-api is not available in tests');
});

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(async () => {}),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => false),
  signInAsync: jest.fn(async () => ({ identityToken: 'test-token' })),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonType: { CONTINUE: 1, SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { BLACK: 2, WHITE: 0 },
}));

jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(() => new Uint8Array(16).fill(7)),
  digestStringAsync: jest.fn(async (_alg, value) => `hashed:${value}`),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-secure-store', () => {
  const vault = new Map();
  return {
    isAvailableAsync: jest.fn(async () => true),
    getItemAsync: jest.fn(async (k) => vault.get(k) ?? null),
    setItemAsync: jest.fn(async (k, v) => {
      vault.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k) => {
      vault.delete(k);
    }),
    __vault: vault,
  };
});

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(async () => null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  createURL: jest.fn((path) => `pigeonx://${path}`),
  openURL: jest.fn(async () => true),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k) => store.get(k) ?? null),
      setItem: jest.fn(async (k, v) => {
        store.set(k, v);
      }),
      removeItem: jest.fn(async (k) => {
        store.delete(k);
      }),
    },
  };
});
