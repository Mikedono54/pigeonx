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
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
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

/**
 * Location exists for one thing: working out when the sun comes up where the
 * place is. Under Jest nobody grants it, so every test runs on the plain
 * fallback times, which is what a person who says no gets too.
 */
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(async () => null),
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4 },
}));

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

/**
 * Reanimated drives the state block and the waveform. Its own jest mock loads
 * the real package first, which reaches for a native module that does not
 * exist here, so this stands in for the handful of pieces the app uses: shared
 * values become plain boxes and every animated view paints once, at rest.
 */
jest.mock('react-native-reanimated', () => {
  const { Text, View } = require('react-native');
  const rest = (v) => v;

  return {
    __esModule: true,
    default: {
      View,
      Text,
      createAnimatedComponent: (component) => component,
    },
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: (build) => {
      try {
        return build();
      } catch {
        return {};
      }
    },
    useReducedMotion: () => true,
    withTiming: rest,
    withSpring: rest,
    withRepeat: rest,
    withDelay: (_ms, value) => value,
    withSequence: (...values) => values[0],
    cancelAnimation: () => {},
    interpolate: (value, _input, output) => (Array.isArray(output) ? output[0] : value),
    interpolateColor: (value, _input, output) => (Array.isArray(output) ? output[0] : value),
    Easing: {
      linear: rest,
      ease: rest,
      quad: rest,
      cubic: rest,
      in: (f) => f,
      out: (f) => f,
      inOut: (f) => f,
      bezier: () => rest,
    },
  };
});
