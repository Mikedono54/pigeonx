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
