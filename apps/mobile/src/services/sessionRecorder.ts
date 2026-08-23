import type { AudioProfile, OutputKind } from '../core/profiles';
import { peakFreqHz } from '../core/profiles';
import {
  useHistory,
  type SessionEntry,
  type SessionSource,
} from '../state/useHistory';
import { useAccount } from '../state/useAccount';
import { remoteSoundId } from './soundIds';
import { getSupabase } from './supabase';
import { somethingChanged } from './syncSignal';

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
    return getSupabase() !== null && useAccount.getState().userId !== null;
  },

  async startSession(entry) {
    const sb = getSupabase();
    if (!sb) throw new Error('No account yet.');

    const profileId = remoteSoundId(entry.profileId);
    if (!profileId) throw new Error('That sound has not reached the account.');

    // A play in an area goes through the server so the rest of the team sees
    // it. A play that belongs to one person is written straight down.
    if (entry.zoneId) {
      const { data, error } = await sb.rpc('start_session', {
        p_zone_id: entry.zoneId,
        p_profile_id: profileId,
        p_device_id: entry.deviceId,
        p_output: entry.outputKind,
        p_source: entry.source,
      });
      if (error) throw new Error(error.message);
      return typeof data === 'string' ? data : null;
    }

    const userId = useAccount.getState().userId;
    const { data, error } = await sb
      .from('sessions')
      .insert({
        user_id: userId,
        zone_id: null,
        profile_id: profileId,
        started_at: new Date(entry.startedAt).toISOString(),
        output_kind: entry.outputKind,
        peak_freq_hz: entry.peakFreqHz,
        source: entry.source,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return (data as { id: string } | null)?.id ?? null;
  },

  async endSession(entry) {
    const sb = getSupabase();
    if (!sb) throw new Error('No account yet.');
    if (!entry.remoteId) return;

    if (entry.zoneId) {
      const { error } = await sb.rpc('end_session', {
        p_session_id: entry.remoteId,
      });
      if (error) throw new Error(error.message);
      return;
    }

    const { error } = await sb
      .from('sessions')
      .update({
        ended_at: new Date(entry.endedAt ?? Date.now()).toISOString(),
      })
      .eq('id', entry.remoteId);
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
      somethingChanged('play');
      return entry;
    }

    try {
      const remoteId = await this.sink.startSession(entry);
      useHistory.getState().markSynced(entry.id, remoteId);
    } catch {
      useHistory.getState().enqueue('start', entry.id);
    }
    somethingChanged('play');
    return entry;
  }

  async end(sessionId: string): Promise<SessionEntry | undefined> {
    const entry = useHistory.getState().closeEntry(sessionId, Date.now());
    if (!entry) return undefined;

    if (!this.sink.isAvailable()) {
      useHistory.getState().enqueue('end', entry.id);
      somethingChanged('play');
      return entry;
    }

    try {
      await this.sink.endSession(entry);
    } catch {
      useHistory.getState().enqueue('end', entry.id);
    }
    somethingChanged('play');
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
