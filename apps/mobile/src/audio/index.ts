import { Platform } from 'react-native';
import type { AudioEngine } from './engine';
import { BaseAudioEngine } from './engine';
import { MockAudioEngine } from './mockEngine';
import { createNativeEngine, isNativeAudioAvailable } from './nativeEngine';

export * from './engine';
export { MockAudioEngine, createMockEngine } from './mockEngine';
export {
  NativeAudioEngine,
  createNativeEngine,
  configureAudioSession,
  isNativeAudioAvailable,
} from './nativeEngine';

let singleton: BaseAudioEngine | null = null;

/**
 * One engine per app. Falls back to the mock where the native audio module is
 * not linked (Expo Go, web, tests) so every screen stays usable.
 */
export function getEngine(): BaseAudioEngine {
  if (!singleton) {
    singleton =
      Platform.OS !== 'web' && isNativeAudioAvailable()
        ? createNativeEngine()
        : new MockAudioEngine();
  }
  return singleton;
}

/** Test seam. */
export function __setEngine(engine: BaseAudioEngine | null): void {
  singleton = engine;
}

export type { AudioEngine };
