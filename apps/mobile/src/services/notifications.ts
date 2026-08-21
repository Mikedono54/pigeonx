import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const RUNNING_CATEGORY = 'pigeonx.running';
export const SCHEDULE_CATEGORY = 'pigeonx.schedule';
export const ACTION_STOP = 'pigeonx.stop';
export const ACTION_START_NOW = 'pigeonx.start-now';

let configured = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Idempotent: permissions + the two action categories the app relies on. */
export async function configureNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('pigeonx-runs', {
        name: 'Deterrent runs',
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        vibrationPattern: [0],
        enableVibrate: false,
      });
      await Notifications.setNotificationChannelAsync('pigeonx-reminders', {
        name: 'Schedule reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    if (!configured) {
      await Notifications.setNotificationCategoryAsync(RUNNING_CATEGORY, [
        {
          identifier: ACTION_STOP,
          buttonTitle: 'Stop',
          options: { opensAppToForeground: true, isDestructive: true },
        },
      ]);
      await Notifications.setNotificationCategoryAsync(SCHEDULE_CATEGORY, [
        {
          identifier: ACTION_START_NOW,
          buttonTitle: 'Start now',
          options: { opensAppToForeground: true },
        },
      ]);
      configured = true;
    }

    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** The persistent "running" notification with a Stop action. */
export async function presentRunningNotification(args: {
  profileName: string;
  outputLabel: string;
}): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PigeonX is running',
        body: `${args.profileName} · ${args.outputLabel}`,
        categoryIdentifier: RUNNING_CATEGORY,
        sticky: true,
        autoDismiss: false,
        data: { kind: 'running' },
      },
      trigger: null,
    });
  } catch {
    return null;
  }
}

export async function dismissRunningNotification(
  id: string | null
): Promise<void> {
  try {
    if (id) await Notifications.dismissNotificationAsync(id);
    else await Notifications.dismissAllNotificationsAsync();
  } catch {
    // nothing actionable — the banner just lingers until the user swipes it
  }
}

export interface ReminderSpec {
  scheduleId: string;
  profileId: string;
  profileName: string;
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  hour: number;
  minute: number;
  label: string;
}

/** One weekly repeating local notification per selected day. */
export async function scheduleReminders(
  spec: ReminderSpec
): Promise<string[]> {
  const ids: string[] = [];
  for (const day of spec.days) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time to run ${spec.profileName}`,
          body: `${spec.label} · tap Start now to begin on this phone`,
          categoryIdentifier: SCHEDULE_CATEGORY,
          data: {
            kind: 'schedule',
            scheduleId: spec.scheduleId,
            profileId: spec.profileId,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day + 1, // expo: 1 = Sunday
          hour: spec.hour,
          minute: spec.minute,
        },
      });
      ids.push(id);
    } catch {
      // a device that refuses notifications still keeps the schedule row
    }
  }
  return ids;
}

export async function cancelReminders(ids: string[]): Promise<void> {
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // already gone
    }
  }
}
