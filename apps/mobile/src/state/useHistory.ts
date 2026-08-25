import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SessionResult } from '../core/personalization';
import type { OutputKind } from '../core/profiles';
import { somethingChanged } from '../services/syncSignal';
import { persistStorage, STORAGE_KEYS, uid } from './storage';

export type SessionSource = 'manual' | 'schedule' | 'remote';

export interface SessionEntry {
  id: string;
  profileId: string;
  profileName: string;
  outputKind: OutputKind;
  peakFreqHz: number;
  startedAt: number;
  endedAt: number | null;
  source: SessionSource;
  zoneId: string | null;
  deviceId: string | null;
  /** the place on this phone this run looked after */
  placeId: string | null;
  placeName: string | null;
  /** the protection plan that ran it, when a plan did */
  planId: string | null;
  planName: string | null;
  /** what the person said happened. null until they say. */
  result: SessionResult | null;
  /**
   * True once the question has been put, however it was answered, including
   * not at all. The app asks once per session and never again.
   */
  resultAsked: boolean;
  /** the id the server gives back once the row is written */
  remoteId: string | null;
  /** false while the row still has to reach the server */
  synced: boolean;
}

export interface QueuedOp {
  id: string;
  kind: 'start' | 'end' | 'result';
  sessionId: string;
  attempts: number;
  queuedAt: number;
}

interface HistoryState {
  entries: SessionEntry[];
  queue: QueuedOp[];

  addEntry: (
    e: Omit<
      SessionEntry,
      | 'id'
      | 'endedAt'
      | 'remoteId'
      | 'synced'
      | 'result'
      | 'resultAsked'
      | 'placeId'
      | 'placeName'
      | 'planId'
      | 'planName'
    > &
      Partial<Pick<SessionEntry, 'placeId' | 'placeName' | 'planId' | 'planName'>>
  ) => SessionEntry;
  closeEntry: (id: string, endedAt: number) => SessionEntry | undefined;
  /** Records what a person said happened, once. */
  setResult: (id: string, result: SessionResult) => SessionEntry | undefined;
  /** Marks the question as put, so it is never put again. */
  markAsked: (id: string) => void;
  markSynced: (id: string, remoteId: string | null) => void;
  enqueue: (kind: QueuedOp['kind'], sessionId: string) => void;
  dequeue: (opId: string) => void;
  bumpAttempts: (opId: string) => void;
  clear: () => void;
  /**
   * The last finished run nobody has been asked about yet.
   *
   * One sheet, one session. A run that was already asked about, or that is
   * still going, is never offered again however many times a screen looks.
   */
  pendingResult: () => SessionEntry | undefined;
  todayCount: () => number;
  withinDays: (days: number | null) => SessionEntry[];
}

const MAX_ENTRIES = 500;

export const useHistory = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      queue: [],

      addEntry: (e) => {
        const entry: SessionEntry = {
          ...e,
          placeId: e.placeId ?? null,
          placeName: e.placeName ?? null,
          planId: e.planId ?? null,
          planName: e.planName ?? null,
          id: uid('ses'),
          endedAt: null,
          remoteId: null,
          synced: false,
          result: null,
          resultAsked: false,
        };
        set({ entries: [entry, ...get().entries].slice(0, MAX_ENTRIES) });
        return entry;
      },

      closeEntry: (id, endedAt) => {
        let updated: SessionEntry | undefined;
        set({
          entries: get().entries.map((s) => {
            if (s.id !== id) return s;
            updated = { ...s, endedAt };
            return updated;
          }),
        });
        return updated;
      },

      setResult: (id, result) => {
        let updated: SessionEntry | undefined;
        set({
          entries: get().entries.map((s) => {
            if (s.id !== id) return s;
            updated = { ...s, result, resultAsked: true };
            return updated;
          }),
        });
        if (updated) somethingChanged('result');
        return updated;
      },

      markAsked: (id) =>
        set({
          entries: get().entries.map((s) =>
            s.id === id ? { ...s, resultAsked: true } : s
          ),
        }),

      markSynced: (id, remoteId) =>
        set({
          entries: get().entries.map((s) =>
            s.id === id ? { ...s, synced: true, remoteId } : s
          ),
        }),

      enqueue: (kind, sessionId) =>
        set({
          queue: [
            ...get().queue.filter(
              (q) => !(q.kind === kind && q.sessionId === sessionId)
            ),
            {
              id: uid('op'),
              kind,
              sessionId,
              attempts: 0,
              queuedAt: Date.now(),
            },
          ],
        }),

      dequeue: (opId) =>
        set({ queue: get().queue.filter((q) => q.id !== opId) }),

      bumpAttempts: (opId) =>
        set({
          queue: get().queue.map((q) =>
            q.id === opId ? { ...q, attempts: q.attempts + 1 } : q
          ),
        }),

      clear: () => set({ entries: [], queue: [] }),

      // Entries are kept newest first, so the first match is the run that just
      // finished.
      pendingResult: () => get().entries.find((s) => s.endedAt !== null && !s.resultAsked),

      todayCount: () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return get().entries.filter((s) => s.startedAt >= start.getTime())
          .length;
      },

      withinDays: (days) => {
        if (days == null) return get().entries;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return get().entries.filter((s) => s.startedAt >= cutoff);
      },
    }),
    {
      name: STORAGE_KEYS.history,
      storage: persistStorage,
      partialize: (s) => ({ entries: s.entries, queue: s.queue }),
      version: 2,
      // Every run somebody already has on their phone predates places, plans
      // and the question. It keeps its place in the timeline and reads as a
      // session nobody was asked about, which is exactly what it is.
      migrate: (state) => {
        const s = state as { entries?: SessionEntry[]; queue?: QueuedOp[] } | undefined;
        if (!s?.entries) return state as never;
        return {
          ...s,
          entries: s.entries.map((e) => ({
            ...e,
            placeId: e.placeId ?? null,
            placeName: e.placeName ?? null,
            planId: e.planId ?? null,
            planName: e.planName ?? null,
            result: e.result ?? null,
            resultAsked: e.resultAsked ?? true,
          })),
        } as never;
      },
    }
  )
);

/** Groups plays into per day totals for the History screen. */
export function groupByDay(entries: SessionEntry[]): {
  day: string;
  label: string;
  count: number;
  totalMs: number;
  entries: SessionEntry[];
}[] {
  const buckets = new Map<string, SessionEntry[]>();
  for (const e of entries) {
    const d = new Date(e.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
    const list = buckets.get(key) ?? [];
    list.push(e);
    buckets.set(key, list);
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, list]) => ({
      day,
      label: new Date(list[0].startedAt).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      count: list.length,
      totalMs: list.reduce(
        (sum, e) => sum + Math.max(0, (e.endedAt ?? e.startedAt) - e.startedAt),
        0
      ),
      entries: list,
    }));
}
