import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  cancelReminders,
  configureNotifications,
  scheduleReminders,
} from '../services/notifications';
import { somethingChanged } from '../services/syncSignal';
import { persistStorage, STORAGE_KEYS, uid } from './storage';

/** Who actually starts the sound: this phone, or a PigeonX speaker. */
export type Executor = 'reminder' | 'device';

export interface Schedule {
  id: string;
  name: string;
  profileId: string;
  profileName: string;
  /** 0 is Sunday, 6 is Saturday */
  days: number[];
  /** minutes past midnight */
  startMinutes: number;
  endMinutes: number;
  enabled: boolean;
  executor: Executor;
  zoneId: string | null;
  deviceId: string | null;
  notificationIds: string[];
  /** when this schedule last changed on this phone */
  updatedAt: number;
  /** the id the account gave this schedule, once it has one */
  remoteId: string | null;
}

export const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function formatMinutes(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function describeDays(days: number[]): string {
  if (days.length === 7) return 'Every day';
  if (days.length === 0) return 'No days picked';
  const weekdays = [1, 2, 3, 4, 5];
  if (days.length === 5 && weekdays.every((d) => days.includes(d))) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES[d].slice(0, 3))
    .join(', ');
}

/** How a schedule reads in the list: "Weekdays, 6:00 PM to 10:00 PM, Pigeon sound". */
export function describeSchedule(s: {
  days: number[];
  startMinutes: number;
  endMinutes: number;
  profileName: string;
}): string {
  return `${describeDays(s.days)}, ${formatMinutes(s.startMinutes)} to ${formatMinutes(s.endMinutes)}, ${s.profileName}`;
}

/** Who runs it, in words. */
export const EXECUTOR_LABEL: Record<Executor, string> = {
  reminder: 'This phone reminds me',
  device: 'This phone in Speaker mode, or a PigeonX speaker',
};

export type ScheduleInput = Omit<
  Schedule,
  'id' | 'notificationIds' | 'enabled' | 'updatedAt' | 'remoteId'
> & { id?: string; enabled?: boolean; remoteId?: string | null };

interface SchedulesState {
  schedules: Schedule[];
  upsert: (input: ScheduleInput) => Promise<Schedule>;
  toggle: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** The next reminder coming up, for the Home screen. */
  nextUp: () => { schedule: Schedule; at: Date } | null;
  /** replaces the list after a look at the account */
  setAll: (schedules: Schedule[]) => void;
  markSaved: (id: string, remoteId: string | null) => void;
}

async function refreshReminders(s: Schedule): Promise<string[]> {
  await cancelReminders(s.notificationIds);
  if (!s.enabled || s.executor !== 'reminder' || s.days.length === 0) return [];
  const ok = await configureNotifications();
  if (!ok) return [];
  return scheduleReminders({
    scheduleId: s.id,
    profileId: s.profileId,
    profileName: s.profileName,
    days: s.days,
    hour: Math.floor(s.startMinutes / 60),
    minute: s.startMinutes % 60,
    label: s.name,
  });
}

export const useSchedules = create<SchedulesState>()(
  persist(
    (set, get) => ({
      schedules: [],

      upsert: async (input) => {
        const existing = input.id ? get().schedules.find((s) => s.id === input.id) : undefined;
        const draft: Schedule = {
          ...input,
          id: existing?.id ?? uid('sch'),
          enabled: input.enabled ?? existing?.enabled ?? true,
          notificationIds: existing?.notificationIds ?? [],
          updatedAt: Date.now(),
          remoteId: input.remoteId ?? existing?.remoteId ?? null,
        };
        const notificationIds = await refreshReminders(draft);
        const saved: Schedule = { ...draft, notificationIds };
        set({
          schedules: existing
            ? get().schedules.map((s) => (s.id === saved.id ? saved : s))
            : [...get().schedules, saved],
        });
        somethingChanged('schedule');
        return saved;
      },

      toggle: async (id) => {
        const s = get().schedules.find((x) => x.id === id);
        if (!s) return;
        const next = { ...s, enabled: !s.enabled, updatedAt: Date.now() };
        const notificationIds = await refreshReminders(next);
        set({
          schedules: get().schedules.map((x) => (x.id === id ? { ...next, notificationIds } : x)),
        });
        somethingChanged('schedule');
      },

      remove: async (id) => {
        const s = get().schedules.find((x) => x.id === id);
        if (s) await cancelReminders(s.notificationIds);
        set({ schedules: get().schedules.filter((x) => x.id !== id) });
        somethingChanged('schedule');
      },

      nextUp: () => {
        const now = new Date();
        let best: { schedule: Schedule; at: Date } | null = null;
        for (const s of get().schedules) {
          if (!s.enabled || s.days.length === 0) continue;
          for (let offset = 0; offset < 8; offset++) {
            const d = new Date(now);
            d.setDate(now.getDate() + offset);
            if (!s.days.includes(d.getDay())) continue;
            d.setHours(Math.floor(s.startMinutes / 60), s.startMinutes % 60, 0, 0);
            if (d.getTime() <= now.getTime()) continue;
            if (!best || d < best.at) best = { schedule: s, at: d };
            break;
          }
        }
        return best;
      },

      setAll: (schedules) => set({ schedules }),
      markSaved: (id, remoteId) =>
        set({
          schedules: get().schedules.map((s) => (s.id === id ? { ...s, remoteId } : s)),
        }),
    }),
    {
      name: STORAGE_KEYS.schedules,
      storage: persistStorage,
      partialize: (s) => ({ schedules: s.schedules }),
      version: 2,
      migrate: (state) => {
        const s = state as { schedules?: Schedule[] } | undefined;
        if (!s?.schedules) return state as never;
        return {
          ...s,
          schedules: s.schedules.map((x) => ({
            ...x,
            updatedAt: x.updatedAt ?? Date.now(),
            remoteId: x.remoteId ?? null,
          })),
        } as never;
      },
    },
  ),
);
