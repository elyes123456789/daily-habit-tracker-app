/** Pure description of which reminders should exist. Platform code turns it into notifications. */
import type { Weekday } from '@/domain/dates';
import { currentWeekdays, isArchived } from '@/domain/schedule';
import type { AppData } from '@/domain/types';

export interface PlannedReminder {
  /** Habit id, or `'daily'` for the daily check-in reminder. */
  id: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  /** `null` = every day. */
  weekdays: Weekday[] | null;
}

function parseTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

export function planReminders(data: AppData): PlannedReminder[] {
  const plan: PlannedReminder[] = [];
  if (data.settings.dailyReminderTime) {
    plan.push({
      id: 'daily',
      title: 'Daily check-in',
      body: 'Take a moment to check in on today’s habits.',
      ...parseTime(data.settings.dailyReminderTime),
      weekdays: null,
    });
  }
  for (const habit of data.habits) {
    if (!habit.reminderTime || isArchived(habit)) continue;
    plan.push({
      id: habit.id,
      title: habit.name,
      body: 'Scheduled for today.',
      ...parseTime(habit.reminderTime),
      weekdays: currentWeekdays(habit),
    });
  }
  return plan;
}
