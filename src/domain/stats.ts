/**
 * Streak and completion rules. These are the single source of truth; the same
 * wording is shown to users in `STREAK_RULES`.
 */
import { type LocalDate, type Weekday, addDays, eachDay, startOfWeek } from './dates';
import { isArchived, isDue } from './schedule';
import type { AppData, CheckInStatus, Habit } from './types';

export const STREAK_RULES = [
  'A streak counts scheduled days you completed in a row.',
  'Days a habit is not scheduled never break a streak and are never counted as missed.',
  'A skipped day pauses the streak: it neither adds to it nor resets it.',
  'A scheduled day with no check-in becomes missed only once that day has ended. Today is never missed.',
  'Completion rate is completed days divided by completed, skipped and missed days. Today is left out until you check in.',
  'Changing a habit’s weekdays applies from today on. Earlier days keep the schedule they had, and past check-ins are never rewritten.',
  'While a habit is archived its days are not counted. Its history is kept.',
] as const;

export type DayStatus =
  | 'done'
  | 'skipped'
  /** Scheduled, in the past, no check-in. */
  | 'missed'
  /** Scheduled today, not checked in yet. */
  | 'pending'
  /** Scheduled on a future day. */
  | 'upcoming'
  /** Not scheduled, archived, or before the habit existed. */
  | 'off';

type HabitCheckIns = Record<LocalDate, CheckInStatus> | undefined;

export function dayStatus(
  habit: Habit,
  checkIns: HabitCheckIns,
  date: LocalDate,
  today: LocalDate,
): DayStatus {
  const recorded = checkIns?.[date];
  if (recorded) return recorded;
  if (!isDue(habit, date)) return 'off';
  if (date > today) return 'upcoming';
  return date === today ? 'pending' : 'missed';
}

/** First day worth looking at: creation, or an earlier imported check-in. */
function firstDay(habit: Habit, checkIns: HabitCheckIns): LocalDate {
  let first = habit.createdOn;
  for (const date in checkIns) if (date < first) first = date;
  return first;
}

export interface Streaks {
  current: number;
  best: number;
}

export function streaks(habit: Habit, checkIns: HabitCheckIns, today: LocalDate): Streaks {
  let run = 0;
  let best = 0;
  for (const date of eachDay(firstDay(habit, checkIns), today)) {
    const status = dayStatus(habit, checkIns, date, today);
    if (status === 'done') best = Math.max(best, ++run);
    else if (status === 'missed') run = 0;
  }
  return { current: run, best };
}

export interface Completion {
  done: number;
  skipped: number;
  missed: number;
  /** done / (done + skipped + missed), or `null` when nothing was due. */
  rate: number | null;
}

const emptyCompletion = (): Completion => ({ done: 0, skipped: 0, missed: 0, rate: null });

function withRate(c: Completion): Completion {
  const total = c.done + c.skipped + c.missed;
  return { ...c, rate: total === 0 ? null : c.done / total };
}

/** `days` = how many days back including today; `null` = all time. */
export function periodStart(days: number | null, today: LocalDate): LocalDate | null {
  return days === null ? null : addDays(today, -(days - 1));
}

export function completion(
  habit: Habit,
  checkIns: HabitCheckIns,
  from: LocalDate | null,
  today: LocalDate,
): Completion {
  const result = emptyCompletion();
  const first = firstDay(habit, checkIns);
  for (const date of eachDay(from && from > first ? from : first, today)) {
    const status = dayStatus(habit, checkIns, date, today);
    if (status === 'done' || status === 'skipped' || status === 'missed') result[status]++;
  }
  return withRate(result);
}

export interface DayTotals {
  date: LocalDate;
  done: number;
  skipped: number;
  missed: number;
  pending: number;
  /** Habits expected that day (everything except `off`). */
  due: number;
}

/** Totals across all habits for one day. Archived habits still count for the days they were active. */
export function dayTotals(data: AppData, date: LocalDate, today: LocalDate): DayTotals {
  const totals: DayTotals = { date, done: 0, skipped: 0, missed: 0, pending: 0, due: 0 };
  for (const habit of data.habits) {
    const status = dayStatus(habit, data.checkIns[habit.id], date, today);
    if (status === 'off') continue;
    totals.due++;
    if (status !== 'upcoming') totals[status]++;
  }
  return totals;
}

export function weekTotals(
  data: AppData,
  anyDayInWeek: LocalDate,
  weekStart: Weekday,
  today: LocalDate,
): DayTotals[] {
  const start = startOfWeek(anyDayInWeek, weekStart);
  return eachDay(start, addDays(start, 6)).map((date) => dayTotals(data, date, today));
}

export function overallCompletion(
  data: AppData,
  from: LocalDate | null,
  today: LocalDate,
): Completion {
  const result = emptyCompletion();
  for (const habit of data.habits) {
    const c = completion(habit, data.checkIns[habit.id], from, today);
    result.done += c.done;
    result.skipped += c.skipped;
    result.missed += c.missed;
  }
  return withRate(result);
}

/** Habits to show on the Today screen for `date`. */
export function habitsDueOn(data: AppData, date: LocalDate): Habit[] {
  return data.habits.filter((h) => isDue(h, date) || data.checkIns[h.id]?.[date] !== undefined);
}

export function activeHabits(data: AppData): Habit[] {
  return data.habits.filter((h) => !isArchived(h));
}

export function formatRate(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}
