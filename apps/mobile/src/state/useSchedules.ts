import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  cancelReminders,
  configureNotifications,
  scheduleReminders,
} from '../services/notifications';
import { persistStorage, STORAGE_KEYS, uid } from './storage';

export type Executor = 'reminder' | 'device';

export interface Schedule {
  id: string;
  name: string;
  profileId: string;
  profileName: string;
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  /** minutes from midnight */
  startMinutes: number;
  endMinutes: number;
  enabled: boolean;
  executor: Executor;
  zoneId: string | null;
  deviceId: string | null;
  notificationIds: string[];
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
  if (days.length === 0) return 'No days';
  const weekdays = [1, 2, 3, 4, 5];
  if (
    days.length === 5 &&
    weekdays.every((d) => days.includes(d))
  )
    return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6))
    return 'Weekends';
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES[d].slice(0, 3))
    .join(' · ');
}

export type ScheduleInput = Omit<
  Schedule,
  'id' | 'notificationIds' | 'enabled'
> & { id?: string; enabled?: boolean };

interface SchedulesState {
  schedules: Schedule[];
  upsert: (input: ScheduleInput) => Promise<Schedule>;
  toggle: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Next upcoming reminder across all enabled schedules, for the Home card. */
  nextUp: () => { schedule: Schedule; at: Date } | null;
}

async function syncReminders(s: Schedule): Promise<string[]> {
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
        const existing = input.id
          ? get().schedules.find((s) => s.id === input.id)
          : undefined;
        const draft: Schedule = {
          ...input,
          id: existing?.id ?? uid('sch'),
          enabled: input.enabled ?? existing?.enabled ?? true,
          notificationIds: existing?.notificationIds ?? [],
        };
        const notificationIds = await syncReminders(draft);
        const saved: Schedule = { ...draft, notificationIds };
        set({
          schedules: existing
            ? get().schedules.map((s) => (s.id === saved.id ? saved : s))
            : [...get().schedules, saved],
        });
        return saved;
      },

      toggle: async (id) => {
        const s = get().schedules.find((x) => x.id === id);
        if (!s) return;
        const next = { ...s, enabled: !s.enabled };
        const notificationIds = await syncReminders(next);
        set({
          schedules: get().schedules.map((x) =>
            x.id === id ? { ...next, notificationIds } : x
          ),
        });
      },

      remove: async (id) => {
        const s = get().schedules.find((x) => x.id === id);
        if (s) await cancelReminders(s.notificationIds);
        set({ schedules: get().schedules.filter((x) => x.id !== id) });
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
    }),
    {
      name: STORAGE_KEYS.schedules,
      storage: persistStorage,
      partialize: (s) => ({ schedules: s.schedules }),
    }
  )
);
