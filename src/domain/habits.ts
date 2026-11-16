/** Pure state transitions. Each returns new `AppData` and never mutates its input. */
import type { LocalDate, Weekday } from './dates';
import { currentWeekdays, isArchived } from './schedule';
import type { AppData, CheckInStatus, Habit, Settings } from './types';

export interface HabitDraft {
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  days: Weekday[];
  reminderTime: string | null;
}

export function validateDraft(draft: HabitDraft): string | null {
  if (draft.name.trim().length === 0) return 'Give the habit a name.';
  if (draft.name.trim().length > 60) return 'Keep the name under 60 characters.';
  if (draft.days.length === 0) return 'Choose at least one day of the week.';
  return null;
}

const sortDays = (days: Weekday[]) => [...new Set(days)].sort((a, b) => a - b);

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function addHabit(data: AppData, draft: HabitDraft, today: LocalDate, id = newId()): AppData {
  const habit: Habit = {
    id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    category: draft.category,
    icon: draft.icon,
    color: draft.color,
    createdOn: today,
    schedule: [{ from: today, days: sortDays(draft.days) }],
    pauses: [],
    reminderTime: draft.reminderTime,
  };
  return { ...data, habits: [...data.habits, habit] };
}

function mapHabit(data: AppData, id: string, fn: (habit: Habit) => Habit): AppData {
  return { ...data, habits: data.habits.map((h) => (h.id === id ? fn(h) : h)) };
}

export function updateHabit(data: AppData, id: string, draft: HabitDraft, today: LocalDate): AppData {
  return mapHabit(data, id, (habit) => {
    const days = sortDays(draft.days);
    let schedule = habit.schedule;
    if (days.join() !== currentWeekdays(habit).join()) {
      // A new schedule starts today; entries for earlier days stay as they were.
      schedule = [...schedule.filter((e) => e.from < today), { from: today, days }];
    }
    return {
      ...habit,
      name: draft.name.trim(),
      description: draft.description.trim(),
      category: draft.category,
      icon: draft.icon,
      color: draft.color,
      reminderTime: draft.reminderTime,
      schedule,
    };
  });
}

export function archiveHabit(data: AppData, id: string, today: LocalDate): AppData {
  return mapHabit(data, id, (habit) =>
    isArchived(habit) ? habit : { ...habit, pauses: [...habit.pauses, { from: today, to: null }] },
  );
}

export function restoreHabit(data: AppData, id: string, today: LocalDate): AppData {
  return mapHabit(data, id, (habit) => ({
    ...habit,
    pauses: habit.pauses
      .map((p) => (p.to === null ? { ...p, to: today } : p))
      // Archived and restored on the same day: nothing was paused.
      .filter((p) => p.from !== p.to),
  }));
}

/** Permanently removes the habit and its check-ins. */
export function deleteHabit(data: AppData, id: string): AppData {
  const { [id]: _removed, ...checkIns } = data.checkIns;
  return { ...data, habits: data.habits.filter((h) => h.id !== id), checkIns };
}

/**
 * Records, corrects, or (with `null`) clears the check-in for one habit on one
 * local date. Setting it twice replaces the value, so a day can never hold two.
 */
export function setCheckIn(
  data: AppData,
  habitId: string,
  date: LocalDate,
  status: CheckInStatus | null,
): AppData {
  if (!data.habits.some((h) => h.id === habitId)) return data;
  const { [date]: _previous, ...rest } = data.checkIns[habitId] ?? {};
  return {
    ...data,
    checkIns: { ...data.checkIns, [habitId]: status ? { ...rest, [date]: status } : rest },
  };
}

export function updateSettings(data: AppData, patch: Partial<Settings>): AppData {
  return { ...data, settings: { ...data.settings, ...patch } };
}

export function draftFromHabit(habit: Habit): HabitDraft {
  return {
    name: habit.name,
    description: habit.description,
    category: habit.category,
    icon: habit.icon,
    color: habit.color,
    days: currentWeekdays(habit),
    reminderTime: habit.reminderTime,
  };
}
