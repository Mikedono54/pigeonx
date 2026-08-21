import {
  SessionRecorder,
  MAX_ATTEMPTS,
  type RemoteSink,
} from '../src/services/sessionRecorder';
import { useHistory, type SessionEntry } from '../src/state/useHistory';
import { findSystemProfile } from '../src/core/profiles';

const PROFILE = findSystemProfile('sys_pigeon_18k')!;

function makeSink(overrides: Partial<RemoteSink> = {}): RemoteSink {
  return {
    isAvailable: () => true,
    startSession: jest.fn(async () => 'remote-1'),
    endSession: jest.fn(async () => {}),
    ...overrides,
  };
}

beforeEach(() => {
  useHistory.setState({ entries: [], queue: [] });
});

describe('happy path', () => {
  it('writes local history and marks the run synced', async () => {
    const sink = makeSink();
    const rec = new SessionRecorder(sink);

    const entry = await rec.start({ profile: PROFILE, output: 'phone' });

    expect(useHistory.getState().entries).toHaveLength(1);
    expect(useHistory.getState().queue).toHaveLength(0);
    expect(sink.startSession).toHaveBeenCalledTimes(1);

    const stored = useHistory.getState().entries[0];
    expect(stored.synced).toBe(true);
    expect(stored.remoteId).toBe('remote-1');
    expect(stored.peakFreqHz).toBe(18000);
    expect(stored.outputKind).toBe('phone');
    expect(stored.endedAt).toBeNull();

    await rec.end(entry.id);
    expect(sink.endSession).toHaveBeenCalledTimes(1);
    expect(useHistory.getState().entries[0].endedAt).not.toBeNull();
    expect(useHistory.getState().queue).toHaveLength(0);
  });
});

describe('queue on failure', () => {
  it('still records locally and queues when start fails', async () => {
    const sink = makeSink({
      startSession: jest.fn(async () => {
        throw new Error('network down');
      }),
    });
    const rec = new SessionRecorder(sink);

    await rec.start({ profile: PROFILE, output: 'phone' });

    expect(useHistory.getState().entries).toHaveLength(1);
    expect(useHistory.getState().entries[0].synced).toBe(false);
    expect(useHistory.getState().queue).toHaveLength(1);
    expect(useHistory.getState().queue[0]).toMatchObject({
      kind: 'start',
      attempts: 0,
    });
  });

  it('queues when end fails, without losing the local end time', async () => {
    const sink = makeSink({
      endSession: jest.fn(async () => {
        throw new Error('timeout');
      }),
    });
    const rec = new SessionRecorder(sink);

    const entry = await rec.start({ profile: PROFILE, output: 'bt_speaker' });
    await rec.end(entry.id);

    expect(useHistory.getState().entries[0].endedAt).toBeGreaterThan(0);
    expect(useHistory.getState().queue.map((q) => q.kind)).toEqual(['end']);
  });

  it('queues both ops when there is no backend at all', async () => {
    const sink = makeSink({ isAvailable: () => false });
    const rec = new SessionRecorder(sink);

    const entry = await rec.start({ profile: PROFILE, output: 'phone' });
    await rec.end(entry.id);

    expect(sink.startSession).not.toHaveBeenCalled();
    expect(sink.endSession).not.toHaveBeenCalled();
    expect(useHistory.getState().queue.map((q) => q.kind)).toEqual([
      'start',
      'end',
    ]);
  });

  it('does not double-queue the same op for the same session', async () => {
    const sink = makeSink({ isAvailable: () => false });
    const rec = new SessionRecorder(sink);

    const entry = await rec.start({ profile: PROFILE, output: 'phone' });
    useHistory.getState().enqueue('start', entry.id);

    expect(useHistory.getState().queue).toHaveLength(1);
  });
});

describe('flush()', () => {
  it('drains the queue once the backend comes back', async () => {
    const offline = makeSink({ isAvailable: () => false });
    const rec = new SessionRecorder(offline);

    const entry = await rec.start({ profile: PROFILE, output: 'phone' });
    await rec.end(entry.id);
    expect(useHistory.getState().queue).toHaveLength(2);

    const online = makeSink();
    rec.setSink(online);
    const result = await rec.flush();

    expect(result).toEqual({ sent: 2, remaining: 0 });
    expect(online.startSession).toHaveBeenCalledTimes(1);
    expect(online.endSession).toHaveBeenCalledTimes(1);
    expect(useHistory.getState().entries[0].synced).toBe(true);
  });

  it('is a no-op while the backend is still unreachable', async () => {
    const offline = makeSink({ isAvailable: () => false });
    const rec = new SessionRecorder(offline);
    await rec.start({ profile: PROFILE, output: 'phone' });

    const result = await rec.flush();
    expect(result).toEqual({ sent: 0, remaining: 1 });
  });

  it('counts attempts and keeps the op queued when the retry fails', async () => {
    const flaky = makeSink({
      startSession: jest.fn(async () => {
        throw new Error('still down');
      }),
    });
    const rec = new SessionRecorder(flaky);

    await rec.start({ profile: PROFILE, output: 'phone' });
    expect(useHistory.getState().queue[0].attempts).toBe(0);

    await rec.flush();
    expect(useHistory.getState().queue).toHaveLength(1);
    expect(useHistory.getState().queue[0].attempts).toBe(1);

    await rec.flush();
    expect(useHistory.getState().queue[0].attempts).toBe(2);
  });

  it('gives up on an op after MAX_ATTEMPTS instead of retrying forever', async () => {
    const dead = makeSink({
      startSession: jest.fn(async () => {
        throw new Error('permanently down');
      }),
    });
    const rec = new SessionRecorder(dead);
    await rec.start({ profile: PROFILE, output: 'phone' });

    for (let i = 0; i < MAX_ATTEMPTS + 3; i++) await rec.flush();

    expect(useHistory.getState().queue[0].attempts).toBe(MAX_ATTEMPTS);
    expect(dead.startSession).toHaveBeenCalledTimes(1 + MAX_ATTEMPTS);
  });

  it('drops queued ops whose session no longer exists', async () => {
    const offline = makeSink({ isAvailable: () => false });
    const rec = new SessionRecorder(offline);
    await rec.start({ profile: PROFILE, output: 'phone' });

    useHistory.setState({ entries: [] as SessionEntry[] });
    rec.setSink(makeSink());
    const result = await rec.flush();

    expect(result.remaining).toBe(0);
  });
});
