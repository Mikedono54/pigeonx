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

/** Safe to call again: permissions plus the two reminder buttons. */
export async function configureNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('pigeonx-runs', {
        name: 'Bird sounds playing',
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        vibrationPattern: [0],
        enableVibrate: false,
      });
      await Notifications.setNotificationChannelAsync('pigeonx-reminders', {
        name: 'Reminders',
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
          buttonTitle: 'Play now',
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

/** The reminder that sits there while a sound plays, with a Stop button. */
export async function presentRunningNotification(args: {
  profileName: string;
  outputLabel: string;
}): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PigeonX is playing',
        body: `${args.profileName} on ${args.outputLabel}`,
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
    // nothing to do here. The banner sits until you swipe it away.
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

/** One weekly repeating reminder per day you picked. */
export async function scheduleReminders(
  spec: ReminderSpec
): Promise<string[]> {
  const ids: string[] = [];
  for (const day of spec.days) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time to play ${spec.profileName}`,
          body: `${spec.label}. Tap Play now to start on this phone.`,
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
      // a phone that refuses reminders still keeps the schedule
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
