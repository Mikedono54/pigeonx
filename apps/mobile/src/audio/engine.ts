import type { AudioProfile, OutputKind } from '../core/profiles';

export type EngineState = 'idle' | 'loading' | 'running' | 'error';

export type Unsubscribe = () => void;

/** Normalised magnitudes, 0–1, low frequency first. */
export type Spectrum = number[];

export interface EngineStateEvent {
  state: EngineState;
  /** present when state === 'error' */
  error?: string;
  /** true when the run ended because the duration cap was reached */
  autoStopped?: boolean;
}

export interface AudioEngine {
  load(profile: AudioProfile): Promise<void>;
  start(output: OutputKind): Promise<void>;
  stop(): Promise<void>;
  setVolume(volume: number): void;
  setParam(key: string, value: number): void;
  onSpectrum(cb: (bins: Spectrum) => void): Unsubscribe;
  onStateChange(cb: (e: EngineStateEvent) => void): Unsubscribe;
  getState(): EngineState;
}

export const SPECTRUM_BINS = 28;
const SPECTRUM_INTERVAL_MS = 60;

/**
 * The state machine every engine shares. Subclasses only implement the four
 * `backend*` hooks; everything the product depends on — legal transitions,
 * the Free-plan duration cap, spectrum fan-out, error surfacing — lives here
 * so it can be tested against a mock backend.
 */
export abstract class BaseAudioEngine implements AudioEngine {
  protected profile: AudioProfile | null = null;
  protected output: OutputKind = 'phone';
  protected volume = 0.85;

  private state: EngineState = 'idle';
  private lastError: string | null = null;
  private stateListeners = new Set<(e: EngineStateEvent) => void>();
  private spectrumListeners = new Set<(bins: Spectrum) => void>();
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  private spectrumTimer: ReturnType<typeof setInterval> | null = null;
  private startedAt: number | null = null;
  private durationLimitMs: number | null = null;

  // ---- backend hooks -----------------------------------------------------
  protected abstract backendLoad(profile: AudioProfile): Promise<void>;
  protected abstract backendStart(output: OutputKind): Promise<void>;
  protected abstract backendStop(): Promise<void>;
  protected abstract backendSetVolume(volume: number): void;
  protected abstract backendSetParam(key: string, value: number): void;
  /** Optional real spectrum. Return null to use the synthesised fallback. */
  protected backendSpectrum(): Spectrum | null {
    return null;
  }

  // ---- public API --------------------------------------------------------
  getState(): EngineState {
    return this.state;
  }

  getError(): string | null {
    return this.lastError;
  }

  getProfile(): AudioProfile | null {
    return this.profile;
  }

  getStartedAt(): number | null {
    return this.startedAt;
  }

  /** `null` removes the cap. Applied on the next `start()`. */
  setDurationLimitMs(ms: number | null): void {
    this.durationLimitMs = ms && ms > 0 ? ms : null;
  }

  getDurationLimitMs(): number | null {
    return this.durationLimitMs;
  }

  async load(profile: AudioProfile): Promise<void> {
    if (this.state === 'running') await this.stop();
    this.setState('loading');
    try {
      await this.backendLoad(profile);
      this.profile = profile;
      this.lastError = null;
      this.setState('idle');
    } catch (err) {
      this.fail(err);
      throw err;
    }
  }

  async start(output: OutputKind): Promise<void> {
    if (this.state === 'running') return;
    if (!this.profile) {
      this.fail(new Error('No profile loaded'));
      return;
    }
    this.output = output;
    this.setState('loading');
    try {
      await this.backendStart(output);
      this.backendSetVolume(this.volume);
      this.startedAt = Date.now();
      this.lastError = null;
      this.setState('running');
      this.startSpectrum();
      this.armAutoStop();
    } catch (err) {
      this.fail(err);
    }
  }

  async stop(): Promise<void> {
    await this.finish(false);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.state === 'running') this.backendSetVolume(this.volume);
  }

  getVolume(): number {
    return this.volume;
  }

  setParam(key: string, value: number): void {
    if (this.profile) {
      this.profile = {
        ...this.profile,
        params: { ...(this.profile.params as object), [key]: value } as never,
      };
    }
    this.backendSetParam(key, value);
  }

  onSpectrum(cb: (bins: Spectrum) => void): Unsubscribe {
    this.spectrumListeners.add(cb);
    return () => {
      this.spectrumListeners.delete(cb);
    };
  }

  onStateChange(cb: (e: EngineStateEvent) => void): Unsubscribe {
    this.stateListeners.add(cb);
    return () => {
      this.stateListeners.delete(cb);
    };
  }

  /** Tear everything down — call when the owning screen unmounts for good. */
  async dispose(): Promise<void> {
    await this.stop();
    this.stateListeners.clear();
    this.spectrumListeners.clear();
  }

  // ---- internals ---------------------------------------------------------
  private async finish(autoStopped: boolean): Promise<void> {
    this.clearTimers();
    if (this.state !== 'running' && this.state !== 'error') {
      this.startedAt = null;
      return;
    }
    try {
      await this.backendStop();
    } catch {
      // stopping must never throw at the caller — the run is over either way
    }
    this.startedAt = null;
    this.setState('idle', undefined, autoStopped);
  }

  private armAutoStop(): void {
    if (this.durationLimitMs == null) return;
    this.autoStopTimer = setTimeout(() => {
      void this.finish(true);
    }, this.durationLimitMs);
  }

  private startSpectrum(): void {
    this.spectrumTimer = setInterval(() => {
      if (this.spectrumListeners.size === 0) return;
      const bins = this.backendSpectrum() ?? this.synthesiseSpectrum();
      this.spectrumListeners.forEach((cb) => cb(bins));
    }, SPECTRUM_INTERVAL_MS);
  }

  private clearTimers(): void {
    if (this.autoStopTimer) clearTimeout(this.autoStopTimer);
    if (this.spectrumTimer) clearInterval(this.spectrumTimer);
    this.autoStopTimer = null;
    this.spectrumTimer = null;
  }

  /**
   * When the backend cannot hand us real FFT data we draw something honest:
   * energy centred on the profile's actual frequency, scaled by volume, with
   * a little jitter so the bars breathe.
   */
  protected synthesiseSpectrum(): Spectrum {
    const p = this.profile;
    const bins = new Array<number>(SPECTRUM_BINS).fill(0);
    if (!p) return bins;

    const t = Date.now() / 1000;
    const params = p.params as unknown as Record<string, number | string>;

    const toBin = (hz: number) =>
      Math.round((Math.min(hz, 24000) / 24000) * (SPECTRUM_BINS - 1));

    let centre = 0;
    let width = 2;
    let level = this.volume;

    switch (p.kind) {
      case 'tone':
        centre = toBin(params.freqHz as number);
        width = 1.6;
        break;
      case 'pulse': {
        centre = toBin(params.freqHz as number);
        width = 1.6;
        const on = (params.onMs as number) || 400;
        const off = (params.offMs as number) || 600;
        const phase = (Date.now() % (on + off)) / (on + off);
        level *= phase < on / (on + off) ? 1 : 0.06;
        break;
      }
      case 'sweep': {
        const start = params.startHz as number;
        const end = params.endHz as number;
        const rate = (params.rateHz as number) || 0.5;
        const s = (Math.sin(2 * Math.PI * rate * t) + 1) / 2;
        centre = toBin(start + (end - start) * s);
        width = 2.4;
        break;
      }
      case 'sample':
        centre = toBin(1200);
        width = 6;
        level *= 0.6 + 0.4 * Math.abs(Math.sin(t * 3));
        break;
    }

    for (let i = 0; i < SPECTRUM_BINS; i++) {
      const d = (i - centre) / width;
      const gauss = Math.exp(-d * d);
      const floorNoise = 0.02 + 0.03 * Math.abs(Math.sin(t * 7 + i));
      bins[i] = Math.min(1, gauss * level + floorNoise);
    }
    return bins;
  }

  private setState(
    state: EngineState,
    error?: string,
    autoStopped?: boolean
  ): void {
    this.state = state;
    const event: EngineStateEvent = { state, error, autoStopped };
    this.stateListeners.forEach((cb) => cb(event));
  }

  protected fail(err: unknown): void {
    this.clearTimers();
    this.startedAt = null;
    this.lastError = err instanceof Error ? err.message : String(err);
    this.setState('error', this.lastError);
  }
}
