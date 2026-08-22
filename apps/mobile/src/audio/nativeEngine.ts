import { BaseAudioEngine, SPECTRUM_BINS, type Spectrum } from './engine';
import { SAMPLE_ASSETS } from './samples';
import type {
  AudioProfile,
  OutputKind,
  PulseParams,
  SampleParams,
  SweepParams,
  ToneParams,
} from '../core/profiles';

type RNAudio = typeof import('react-native-audio-api');

let mod: RNAudio | null | undefined;

/** Lazily resolved so the app still boots where the native module is absent. */
function audioApi(): RNAudio | null {
  if (mod !== undefined) return mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('react-native-audio-api') as RNAudio;
  } catch {
    mod = null;
  }
  return mod;
}

export function isNativeAudioAvailable(): boolean {
  return audioApi() !== null;
}

/**
 * Configures the iOS audio session for playback that survives the lock screen.
 * Safe to call more than once; a no-op where the native module is missing.
 */
export async function configureAudioSession(): Promise<void> {
  const api = audioApi();
  if (!api) return;
  try {
    api.AudioManager.setAudioSessionOptions({
      iosCategory: 'playback',
      iosMode: 'default',
      iosOptions: ['mixWithOthers', 'allowBluetoothA2DP', 'allowAirPlay'],
    });
    api.AudioManager.observeAudioInterruptions(true);
    await api.AudioManager.setAudioSessionActivity(true);
  } catch {
    // A failure here only costs background playback; the run still works.
  }
}

type Ctx = InstanceType<RNAudio['AudioContext']>;
type Gain = ReturnType<Ctx['createGain']>;
type Osc = ReturnType<Ctx['createOscillator']>;
type Analyser = ReturnType<Ctx['createAnalyser']>;
type Buffer = Awaited<ReturnType<RNAudio['decodeAudioData']>>;

const FFT_SIZE = 1024;

/**
 * The real engine: Web-Audio graph on native via react-native-audio-api.
 *
 *   tone   osc -> gate -> master -> analyser -> destination
 *   sweep  osc + LFO osc -> lfoDepth -> osc.frequency
 *   pulse  osc -> gate, gated from JS on a randomised on/off interval
 *   sample bufferSource -> gate, re-scheduled after each gap
 */
export class NativeAudioEngine extends BaseAudioEngine {
  private ctx: Ctx | null = null;
  private master: Gain | null = null;
  private gate: Gain | null = null;
  private analyser: Analyser | null = null;

  private osc: Osc | null = null;
  private lfo: Osc | null = null;
  private lfoDepth: Gain | null = null;

  private buffer: Buffer | null = null;
  private pulseTimer: ReturnType<typeof setTimeout> | null = null;
  private sampleTimer: ReturnType<typeof setTimeout> | null = null;
  private freqBytes: Uint8Array | null = null;

  // ---- backend hooks -----------------------------------------------------

  protected async backendLoad(profile: AudioProfile): Promise<void> {
    const api = audioApi();
    if (!api) throw new Error('This phone cannot play the sound.');

    if (profile.kind === 'sample') {
      const asset = SAMPLE_ASSETS[(profile.params as SampleParams).asset];
      if (!asset) throw new Error('That bird call is missing.');
      const ctx = this.ensureContext(api);
      const decoded = await api.decodeAudioData(asset, ctx.sampleRate);
      if (!decoded) throw new Error('That bird call did not open.');
      this.buffer = decoded;
    } else {
      this.buffer = null;
    }
  }

  protected async backendStart(output: OutputKind): Promise<void> {
    const api = audioApi();
    if (!api) throw new Error('This phone cannot play the sound.');
    const profile = this.getProfile();
    if (!profile) throw new Error('Pick a sound first.');

    await configureAudioSession();
    const ctx = this.ensureContext(api);
    await ctx.resume();

    // gate sits between the sources and master so pulses cannot click
    const gate = ctx.createGain();
    gate.gain.value = 0;
    gate.connect(this.master!);
    this.gate = gate;

    switch (profile.kind) {
      case 'tone':
        this.startTone(ctx, (profile.params as ToneParams).freqHz);
        break;
      case 'sweep':
        this.startSweep(ctx, profile.params as SweepParams);
        break;
      case 'pulse':
        this.startPulse(ctx, profile.params as PulseParams);
        break;
      case 'sample':
        this.startSample(ctx, profile.params as SampleParams);
        break;
    }

    if (profile.kind !== 'pulse' && profile.kind !== 'sample') {
      this.rampGate(1, 0.04);
    }
    void output; // routing is the OS's job; see OutputPicker copy
  }

  protected async backendStop(): Promise<void> {
    this.clearNativeTimers();
    const ctx = this.ctx;
    const now = ctx ? ctx.currentTime : 0;

    try {
      this.rampGate(0, 0.03);
      this.osc?.stop(now + 0.06);
      this.lfo?.stop(now + 0.06);
    } catch {
      // node may already be stopped
    }
    this.osc = null;
    this.lfo = null;
    this.lfoDepth = null;
    const gate = this.gate;
    this.gate = null;
    if (gate) {
      setTimeout(() => {
        try {
          gate.disconnect();
        } catch {
          /* already torn down */
        }
      }, 120);
    }
  }

  protected backendSetVolume(volume: number): void {
    if (this.master) this.master.gain.value = volume;
  }

  protected backendSetParam(key: string, value: number): void {
    if (this.getState() !== 'running') return;
    const profile = this.getProfile();
    if (!profile) return;

    if (key === 'freqHz' && this.osc) {
      this.osc.frequency.value = value;
      return;
    }
    if (profile.kind === 'sweep' && this.osc && this.lfoDepth) {
      const s = profile.params as SweepParams;
      if (key === 'startHz' || key === 'endHz') {
        this.osc.frequency.value = (s.startHz + s.endHz) / 2;
        this.lfoDepth.gain.value = Math.abs(s.endHz - s.startHz) / 2;
      }
      if (key === 'rateHz' && this.lfo) this.lfo.frequency.value = value;
    }
  }

  protected backendSpectrum(): Spectrum | null {
    const analyser = this.analyser;
    if (!analyser) return null;
    try {
      if (!this.freqBytes) {
        this.freqBytes = new Uint8Array(analyser.frequencyBinCount);
      }
      analyser.getByteFrequencyData(this.freqBytes);
      const raw = this.freqBytes;
      const step = Math.max(1, Math.floor(raw.length / SPECTRUM_BINS));
      const out: number[] = [];
      for (let b = 0; b < SPECTRUM_BINS; b++) {
        let peak = 0;
        for (let i = b * step; i < (b + 1) * step && i < raw.length; i++) {
          peak = Math.max(peak, raw[i]);
        }
        out.push(peak / 255);
      }
      // Ultrasonic content often reads as a flat floor; fall back rather than
      // draw a dead visualiser.
      return out.some((v) => v > 0.02) ? out : null;
    } catch {
      return null;
    }
  }

  // ---- graph builders ----------------------------------------------------

  private ensureContext(api: RNAudio): Ctx {
    if (this.ctx && this.master) return this.ctx;
    const ctx = new api.AudioContext();
    const master = ctx.createGain();
    master.gain.value = this.volume;

    let analyser: Analyser | null = null;
    try {
      analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.7;
      master.connect(analyser);
      analyser.connect(ctx.destination);
    } catch {
      master.connect(ctx.destination);
    }

    this.ctx = ctx;
    this.master = master;
    this.analyser = analyser;
    this.freqBytes = null;
    return ctx;
  }

  private startTone(ctx: Ctx, freqHz: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freqHz;
    osc.connect(this.gate!);
    osc.start(ctx.currentTime);
    this.osc = osc;
  }

  private startSweep(ctx: Ctx, p: SweepParams): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = (p.startHz + p.endHz) / 2;
    osc.connect(this.gate!);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = Math.max(0.01, p.rateHz);

    const depth = ctx.createGain();
    depth.gain.value = Math.abs(p.endHz - p.startHz) / 2;
    lfo.connect(depth);
    depth.connect(osc.frequency);

    osc.start(ctx.currentTime);
    lfo.start(ctx.currentTime);

    this.osc = osc;
    this.lfo = lfo;
    this.lfoDepth = depth;
  }

  private startPulse(ctx: Ctx, p: PulseParams): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = p.freqHz;
    osc.connect(this.gate!);
    osc.start(ctx.currentTime);
    this.osc = osc;

    const jitter = (ms: number) => {
      const r = (p.randomizePct ?? 0) / 100;
      return Math.max(40, ms * (1 + (Math.random() * 2 - 1) * r));
    };

    const cycle = (on: boolean) => {
      this.rampGate(on ? 1 : 0, 0.012);
      const next = jitter(on ? p.onMs : p.offMs);
      this.pulseTimer = setTimeout(() => cycle(!on), next);
    };
    cycle(true);
  }

  private startSample(ctx: Ctx, p: SampleParams): void {
    this.rampGate(1, 0.02);
    const playOnce = () => {
      const buf = this.buffer;
      if (!buf || !this.gate) return;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.gate);
        src.start(ctx.currentTime);
      } catch {
        // a dropped repeat is not worth ending the run over
      }
      const r = (p.randomizePct ?? 0) / 100;
      const gap = Math.max(
        500,
        p.gapMs * (1 + (Math.random() * 2 - 1) * r) + (buf?.duration ?? 1) * 1000
      );
      this.sampleTimer = setTimeout(playOnce, gap);
    };
    playOnce();
  }

  private rampGate(to: number, seconds: number): void {
    const gate = this.gate;
    const ctx = this.ctx;
    if (!gate || !ctx) return;
    try {
      gate.gain.linearRampToValueAtTime(to, ctx.currentTime + seconds);
    } catch {
      gate.gain.value = to;
    }
  }

  private clearNativeTimers(): void {
    if (this.pulseTimer) clearTimeout(this.pulseTimer);
    if (this.sampleTimer) clearTimeout(this.sampleTimer);
    this.pulseTimer = null;
    this.sampleTimer = null;
  }
}

export function createNativeEngine(): NativeAudioEngine {
  return new NativeAudioEngine();
}
