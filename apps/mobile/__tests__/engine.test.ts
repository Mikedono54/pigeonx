import { MockAudioEngine } from '../src/audio/mockEngine';
import type { EngineStateEvent } from '../src/audio/engine';
import { limit } from '../src/core/entitlements';
import { SYSTEM_PROFILES, findSystemProfile } from '../src/core/profiles';

const TONE = findSystemProfile('sys_pigeon_18k')!;
const SWEEP = findSystemProfile('sys_sweep_15_19k')!;

function record(engine: MockAudioEngine) {
  const events: EngineStateEvent[] = [];
  engine.onStateChange((e) => events.push(e));
  return events;
}

describe('engine state machine', () => {
  let engine: MockAudioEngine;

  beforeEach(() => {
    jest.useFakeTimers();
    engine = new MockAudioEngine();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts idle', () => {
    expect(engine.getState()).toBe('idle');
  });

  it('walks idle → loading → idle on load, then running on start', async () => {
    const events = record(engine);
    await engine.load(TONE);
    expect(events.map((e) => e.state)).toEqual(['loading', 'idle']);
    expect(engine.getState()).toBe('idle');

    await engine.start('phone');
    expect(engine.getState()).toBe('running');
    expect(events.map((e) => e.state)).toEqual([
      'loading',
      'idle',
      'loading',
      'running',
    ]);
  });

  it('returns to idle on stop and records the backend calls', async () => {
    await engine.load(TONE);
    await engine.start('phone');
    await engine.stop();

    expect(engine.getState()).toBe('idle');
    expect(engine.log.map((l) => l.op)).toEqual([
      'load',
      'start',
      'volume',
      'stop',
    ]);
  });

  it('refuses to start without a sound, in plain words', async () => {
    await engine.start('phone');
    expect(engine.getState()).toBe('error');
    expect(engine.getError()).toBe('Pick a sound first.');
  });

  it('surfaces a backend start failure as the error state', async () => {
    await engine.load(TONE);
    engine.failNextStart = 'Audio session interrupted';
    const events = record(engine);
    await engine.start('phone');

    expect(engine.getState()).toBe('error');
    expect(engine.getError()).toBe('Audio session interrupted');
    expect(events.at(-1)).toMatchObject({
      state: 'error',
      error: 'Audio session interrupted',
    });
  });

  it('recovers after an error when the caller retries', async () => {
    await engine.load(TONE);
    engine.failNextStart = 'No output';
    await engine.start('phone');
    expect(engine.getState()).toBe('error');

    await engine.start('phone');
    expect(engine.getState()).toBe('running');
  });

  it('ignores a second start while already running', async () => {
    await engine.load(TONE);
    await engine.start('phone');
    await engine.start('bt_speaker');
    expect(engine.log.filter((l) => l.op === 'start')).toHaveLength(1);
  });

  it('stops what is playing before loading a different sound', async () => {
    await engine.load(TONE);
    await engine.start('phone');
    await engine.load(SWEEP);

    expect(engine.getState()).toBe('idle');
    expect(engine.log.map((l) => l.op)).toContain('stop');
    expect(engine.getProfile()?.id).toBe(SWEEP.id);
  });

  it('clamps loudness into 0 to 1 and forwards it while playing', async () => {
    await engine.load(TONE);
    await engine.start('phone');

    engine.setVolume(2);
    expect(engine.getVolume()).toBe(1);
    engine.setVolume(-1);
    expect(engine.getVolume()).toBe(0);

    const volumes = engine.log.filter((l) => l.op === 'volume');
    expect(volumes.at(-1)?.value).toBe(0);
  });

  it('emits spectrum frames while running and stops when idle', async () => {
    await engine.load(TONE);
    const frames: number[][] = [];
    const off = engine.onSpectrum((bins) => frames.push(bins));

    await engine.start('phone');
    jest.advanceTimersByTime(300);
    expect(frames.length).toBeGreaterThan(0);

    const seen = frames.length;
    await engine.stop();
    jest.advanceTimersByTime(300);
    expect(frames.length).toBe(seen);

    off();
  });

  it('unsubscribes state listeners', async () => {
    const events: EngineStateEvent[] = [];
    const off = engine.onStateChange((e) => events.push(e));
    off();
    await engine.load(TONE);
    expect(events).toHaveLength(0);
  });
});

describe('duration cap', () => {
  let engine: MockAudioEngine;

  beforeEach(() => {
    jest.useFakeTimers();
    engine = new MockAudioEngine();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stops a Free play at exactly 15 minutes', async () => {
    const freeCapMinutes = limit('free', 'sessionMinutes');
    expect(freeCapMinutes).toBe(15);

    engine.setDurationLimitMs(freeCapMinutes! * 60_000);
    await engine.load(TONE);
    const events = record(engine);
    await engine.start('phone');

    jest.advanceTimersByTime(14 * 60_000 + 59_000);
    expect(engine.getState()).toBe('running');

    jest.advanceTimersByTime(1_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(engine.getState()).toBe('idle');
    expect(events.at(-1)).toMatchObject({ state: 'idle', autoStopped: true });
    expect(engine.log.map((l) => l.op)).toContain('stop');
  });

  it('plays past 15 minutes when the limit is lifted', async () => {
    expect(limit('pro', 'sessionMinutes')).toBeNull();

    engine.setDurationLimitMs(null);
    await engine.load(TONE);
    await engine.start('phone');

    jest.advanceTimersByTime(60 * 60_000);
    expect(engine.getState()).toBe('running');
  });

  it('marks a stop you pressed as not auto-stopped', async () => {
    engine.setDurationLimitMs(15 * 60_000);
    await engine.load(TONE);
    const events = record(engine);
    await engine.start('phone');

    jest.advanceTimersByTime(60_000);
    await engine.stop();

    expect(events.at(-1)).toMatchObject({ state: 'idle', autoStopped: false });
  });

  it('cancels the timer when you stop early', async () => {
    engine.setDurationLimitMs(15 * 60_000);
    await engine.load(TONE);
    await engine.start('phone');
    await engine.stop();

    const stops = engine.log.filter((l) => l.op === 'stop').length;
    jest.advanceTimersByTime(30 * 60_000);
    expect(engine.log.filter((l) => l.op === 'stop')).toHaveLength(stops);
  });
});

describe('setParam', () => {
  it('mutates the loaded profile and forwards to the backend', async () => {
    const engine = new MockAudioEngine();
    await engine.load(SYSTEM_PROFILES[0]);
    engine.setParam('freqHz', 21000);

    expect((engine.getProfile()?.params as { freqHz: number }).freqHz).toBe(
      21000
    );
    expect(engine.log.at(-1)).toEqual({
      op: 'param',
      value: { key: 'freqHz', value: 21000 },
    });
  });
});
