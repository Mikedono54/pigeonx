import type { AudioProfile, OutputKind } from '../core/profiles';
import { peakFreqHz } from '../core/profiles';
import {
  useHistory,
  type SessionEntry,
  type SessionSource,
} from '../state/useHistory';
import { getSupabase } from './supabase';

/**
 * Everything the recorder needs from the backend. Swapping this out is how the
 * tests exercise the offline queue without a network.
 */
export interface RemoteSink {
  /** returns the remote session id, or throws */
  startSession(entry: SessionEntry): Promise<string | null>;
  endSession(entry: SessionEntry): Promise<void>;
  /** false when there is no configured/authenticated backend to talk to */
  isAvailable(): boolean;
}

export const supabaseSink: RemoteSink = {
  isAvailable() {
    return getSupabase() !== null;
  },
  async startSession(entry) {
    const sb = getSupabase();
    if (!sb) throw new Error('No account yet.');
    const { data, error } = await sb.rpc('start_session', {
      zone_id: entry.zoneId,
      profile_id: entry.profileId,
      device_id: entry.deviceId,
    });
    if (error) throw new Error(error.message);
    return typeof data === 'string' ? data : null;
  },
  async endSession(entry) {
    const sb = getSupabase();
    if (!sb) throw new Error('No account yet.');
    const { error } = await sb.rpc('end_session', {
      session_id: entry.remoteId,
    });
    if (error) throw new Error(error.message);
  },
};

export const MAX_ATTEMPTS = 8;

/**
 * Writes every run to local history first, then tries to mirror it to
 * Supabase. A failure is never fatal: the op lands on a durable queue and is
 * retried by `flush()` on the next app foreground / successful call.
 */
export class SessionRecorder {
  constructor(private sink: RemoteSink = supabaseSink) {}

  setSink(sink: RemoteSink): void {
    this.sink = sink;
  }

  async start(args: {
    profile: AudioProfile;
    output: OutputKind;
    source?: SessionSource;
    zoneId?: string | null;
    deviceId?: string | null;
  }): Promise<SessionEntry> {
    const h = useHistory.getState();
    const entry = h.addEntry({
      profileId: args.profile.id,
      profileName: args.profile.name,
      outputKind: args.output,
      peakFreqHz: peakFreqHz(args.profile),
      startedAt: Date.now(),
      source: args.source ?? 'manual',
      zoneId: args.zoneId ?? null,
      deviceId: args.deviceId ?? null,
    });

    if (!this.sink.isAvailable()) {
      useHistory.getState().enqueue('start', entry.id);
      return entry;
    }

    try {
      const remoteId = await this.sink.startSession(entry);
      useHistory.getState().markSynced(entry.id, remoteId);
    } catch {
      useHistory.getState().enqueue('start', entry.id);
    }
    return entry;
  }

  async end(sessionId: string): Promise<SessionEntry | undefined> {
    const entry = useHistory.getState().closeEntry(sessionId, Date.now());
    if (!entry) return undefined;

    if (!this.sink.isAvailable()) {
      useHistory.getState().enqueue('end', entry.id);
      return entry;
    }

    try {
      await this.sink.endSession(entry);
    } catch {
      useHistory.getState().enqueue('end', entry.id);
    }
    return entry;
  }

  /** Retries every queued op. Safe to call often; stops at MAX_ATTEMPTS. */
  async flush(): Promise<{ sent: number; remaining: number }> {
    if (!this.sink.isAvailable()) {
      return { sent: 0, remaining: useHistory.getState().queue.length };
    }

    let sent = 0;
    for (const op of [...useHistory.getState().queue]) {
      const entry = useHistory
        .getState()
        .entries.find((e) => e.id === op.sessionId);
      if (!entry) {
        useHistory.getState().dequeue(op.id);
        continue;
      }
      if (op.attempts >= MAX_ATTEMPTS) continue;

      try {
        if (op.kind === 'start') {
          const remoteId = await this.sink.startSession(entry);
          useHistory.getState().markSynced(entry.id, remoteId);
        } else {
          await this.sink.endSession(entry);
        }
        useHistory.getState().dequeue(op.id);
        sent += 1;
      } catch {
        useHistory.getState().bumpAttempts(op.id);
      }
    }
    return { sent, remaining: useHistory.getState().queue.length };
  }
}

export const sessionRecorder = new SessionRecorder();
