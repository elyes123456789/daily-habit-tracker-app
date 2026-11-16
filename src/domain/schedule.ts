import { type LocalDate, type Weekday, WEEKDAY_SHORT, orderedWeekdays, weekdayOf } from './dates';
import type { Habit } from './types';

/** The weekdays that were in force for `habit` on `date`. */
export function weekdaysOn(habit: Habit, date: LocalDate): Weekday[] {
  let days: Weekday[] = [];
  for (const entry of habit.schedule) {
    if (entry.from <= date) days = entry.days;
  }
  return days;
}

export function currentWeekdays(habit: Habit): Weekday[] {
  return habit.schedule[habit.schedule.length - 1]?.days ?? [];
}

export function isArchived(habit: Habit): boolean {
  return habit.pauses.some((p) => p.to === null);
}

function isPausedOn(habit: Habit, date: LocalDate): boolean {
  return habit.pauses.some((p) => p.from <= date && (p.to === null || date < p.to));
}

/**
 * Whether the habit is expected on `date`: on or after its first day, not
 * archived that day, and on a weekday scheduled at that time.
 */
export function isDue(habit: Habit, date: LocalDate): boolean {
  return (
    date >= habit.createdOn &&
    !isPausedOn(habit, date) &&
    weekdaysOn(habit, date).includes(weekdayOf(date))
  );
}

export function describeWeekdays(days: Weekday[], weekStart: Weekday = 1): string {
  const set = new Set(days);
  if (set.size === 7) return 'Every day';
  if (set.size === 0) return 'No days';
  if (set.size === 5 && !set.has(0) && !set.has(6)) return 'Weekdays';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekends';
  return orderedWeekdays(weekStart)
    .filter((d) => set.has(d))
    .map((d) => WEEKDAY_SHORT[d])
    .join(', ');
}
