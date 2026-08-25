import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  nextOccurrence,
  scheduleTimeline,
  startOn,
  type ScheduleTrigger,
} from '../core/scheduleTimeline';
import {
  cancelReminders,
  configureNotifications,
  scheduleReminders,
} from '../services/notifications';
import { useLocation } from './useLocation';
import { somethingChanged } from '../services/syncSignal';
import { persistStorage, STORAGE_KEYS, uid } from './storage';

/** Who actually starts the sound: this phone, or a PigeonX speaker. */
export type Executor = 'reminder' | 'device';

/** Whose time it is: one person's own, or one a business keeps. */
export type ScheduleScope = 'user' | 'org';

export interface Schedule {
  id: string;
  name: string;
  profileId: string;
  profileName: string;
  /** 0 is Sunday, 6 is Saturday */
  days: number[];
  /** minutes past midnight. The anchor a run set to a time starts at. */
  startMinutes: number;
  endMinutes: number;
  enabled: boolean;
  executor: Executor;
  /** what starts it: a time on the clock, or the sun */
  trigger: ScheduleTrigger;
  /** minutes before or after sunrise or sunset */
  offsetMinutes: number;
  /** the place this run looks after */
  placeId: string | null;
  placeName: string | null;
  /** the protection plan it runs, when it runs one rather than one sound */
  planId: string | null;
  planName: string | null;
  /** "22:00", the hours this run holds off through. null when it has none. */
  quietStart: string | null;
  quietEnd: string | null;
  /**
   * Whose time this is.
   *
   * A person's own runs and the runs a business keeps for its areas sit in one
   * list on this phone and in two different tables in the account. The word
   * says which, so a pass over one never rewrites the other.
   */
  scope: ScheduleScope;
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
  | 'id'
  | 'notificationIds'
  | 'enabled'
  | 'updatedAt'
  | 'remoteId'
  | 'trigger'
  | 'offsetMinutes'
  | 'placeId'
  | 'placeName'
  | 'planId'
  | 'planName'
  | 'quietStart'
  | 'quietEnd'
  | 'scope'
> & {
  id?: string;
  enabled?: boolean;
  remoteId?: string | null;
  trigger?: ScheduleTrigger;
  offsetMinutes?: number;
  placeId?: string | null;
  placeName?: string | null;
  planId?: string | null;
  planName?: string | null;
  quietStart?: string | null;
  quietEnd?: string | null;
  scope?: ScheduleScope;
};

/** What a schedule nobody has described yet looks like. */
export const SCHEDULE_DEFAULTS = {
  trigger: 'time' as ScheduleTrigger,
  offsetMinutes: 0,
  placeId: null,
  placeName: null,
  planId: null,
  planName: null,
  quietStart: null,
  quietEnd: null,
  scope: 'user' as ScheduleScope,
};

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

  // A weekly reminder repeats at one hour and minute, and sunrise moves a
  // little every week. This takes today's sunrise as the standing time, which
  // is right to a few minutes across a season and wrong by more than that
  // across a year. The schedule itself always resolves the real time.
  const start = startOn(s, new Date(), useLocation.getState().coords).minutes;

  return scheduleReminders({
    scheduleId: s.id,
    profileId: s.profileId,
    profileName: s.planName ?? s.profileName,
    days: s.days,
    hour: Math.floor(start / 60),
    minute: start % 60,
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
          ...SCHEDULE_DEFAULTS,
          ...existing,
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
        // A run anchored to the sun moves from one day to the next, so the
        // answer comes off the same timeline the Schedule screen draws.
        const timeline = scheduleTimeline(get().schedules, now, {
          days: 8,
          coords: useLocation.getState().coords,
        });
        const next = nextOccurrence(timeline, now);
        return next ? { schedule: next.schedule, at: next.start } : null;
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
      version: 4,
      migrate: (state) => {
        const s = state as { schedules?: Schedule[] } | undefined;
        if (!s?.schedules) return state as never;
        return {
          ...s,
          schedules: s.schedules.map((x) => ({
            ...SCHEDULE_DEFAULTS,
            ...x,
            updatedAt: x.updatedAt ?? Date.now(),
            remoteId: x.remoteId ?? null,
          })),
        } as never;
      },
    },
  ),
);
