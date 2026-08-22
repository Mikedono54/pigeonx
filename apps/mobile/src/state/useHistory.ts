import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OutputKind } from '../core/profiles';
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
  /** the id the server gives back once the row is written */
  remoteId: string | null;
  /** false while the row still has to reach the server */
  synced: boolean;
}

export interface QueuedOp {
  id: string;
  kind: 'start' | 'end';
  sessionId: string;
  attempts: number;
  queuedAt: number;
}

interface HistoryState {
  entries: SessionEntry[];
  queue: QueuedOp[];

  addEntry: (
    e: Omit<SessionEntry, 'id' | 'endedAt' | 'remoteId' | 'synced'>
  ) => SessionEntry;
  closeEntry: (id: string, endedAt: number) => SessionEntry | undefined;
  markSynced: (id: string, remoteId: string | null) => void;
  enqueue: (kind: QueuedOp['kind'], sessionId: string) => void;
  dequeue: (opId: string) => void;
  bumpAttempts: (opId: string) => void;
  clear: () => void;
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
          id: uid('ses'),
          endedAt: null,
          remoteId: null,
          synced: false,
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
