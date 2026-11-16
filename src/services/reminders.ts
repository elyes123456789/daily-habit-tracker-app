/** Local notifications on Android and iOS, delivered by the OS even when the app is closed. */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AppData } from '@/domain/types';

import { planReminders } from './reminder-plan';

const CHANNEL = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function getReminderSupport(): { available: boolean; note: string } {
  return {
    available: true,
    note: 'Reminders are local notifications scheduled on this device. They arrive even when the app is closed, at the time shown on the device clock.',
  };
}

/** Asks for notification permission. Call only when the user turns a reminder on. */
export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Habit reminders',
      // eslint-disable-next-line import/namespace -- re-exported with `export *`, which this rule cannot follow
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

let lastPlan: string | null = null;

/** Replaces all scheduled notifications with the ones the data asks for. */
export async function syncReminders(data: AppData): Promise<void> {
  const plan = planReminders(data);
  const signature = JSON.stringify(plan);
  if (signature === lastPlan) return; // nothing about reminders changed
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (plan.length > 0 && (await Notifications.getPermissionsAsync()).granted) {
    for (const r of plan) {
      const content = { title: r.title, body: r.body };
      if (r.weekdays === null) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: r.hour,
            minute: r.minute,
            channelId: CHANNEL,
          },
        });
      } else {
        for (const weekday of r.weekdays) {
          await Notifications.scheduleNotificationAsync({
            content,
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: weekday + 1, // expo-notifications: 1 = Sunday
              hour: r.hour,
              minute: r.minute,
              channelId: CHANNEL,
            },
          });
        }
      }
    }
  }
  lastPlan = signature;
}
