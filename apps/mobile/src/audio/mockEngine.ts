import { BaseAudioEngine } from './engine';
import type { AudioProfile, OutputKind } from '../core/profiles';

export interface MockBackendLog {
  op: 'load' | 'start' | 'stop' | 'volume' | 'param';
  value?: unknown;
}

/**
 * In-memory engine used by tests, by Expo Go (where the native audio module is
 * absent), and by the "Simulated device" output. It walks exactly the same
 * state machine as the native engine — only the backend is fake.
 */
export class MockAudioEngine extends BaseAudioEngine {
  readonly log: MockBackendLog[] = [];
  /** set to make the next backendStart reject, to exercise error handling */
  failNextStart: string | null = null;
  failNextLoad: string | null = null;

  protected async backendLoad(profile: AudioProfile): Promise<void> {
    if (this.failNextLoad) {
      const msg = this.failNextLoad;
      this.failNextLoad = null;
      throw new Error(msg);
    }
    this.log.push({ op: 'load', value: profile.id });
  }

  protected async backendStart(output: OutputKind): Promise<void> {
    if (this.failNextStart) {
      const msg = this.failNextStart;
      this.failNextStart = null;
      throw new Error(msg);
    }
    this.log.push({ op: 'start', value: output });
  }

  protected async backendStop(): Promise<void> {
    this.log.push({ op: 'stop' });
  }

  protected backendSetVolume(volume: number): void {
    this.log.push({ op: 'volume', value: volume });
  }

  protected backendSetParam(key: string, value: number): void {
    this.log.push({ op: 'param', value: { key, value } });
  }
}

export function createMockEngine(): MockAudioEngine {
  return new MockAudioEngine();
}
