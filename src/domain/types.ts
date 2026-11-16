import type { LocalDate, Weekday } from './dates';

export type CheckInStatus = 'done' | 'skipped';

/** The weekdays a habit is scheduled on, effective from `from` onward. */
export interface ScheduleEntry {
  from: LocalDate;
  days: Weekday[];
}

/** An archived stretch: `from` inclusive, `to` exclusive (`null` = still archived). */
export interface Pause {
  from: LocalDate;
  to: LocalDate | null;
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  /** First day the habit can be due. */
  createdOn: LocalDate;
  /**
   * Schedule history, oldest first. Editing the weekdays appends an entry dated
   * today, so earlier days keep being judged by the schedule they had then.
   */
  schedule: ScheduleEntry[];
  pauses: Pause[];
  /** `HH:MM`, or `null` for no reminder. */
  reminderTime: string | null;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePreference;
  weekStart: Weekday;
  /** `'device'` follows the device; otherwise a fixed IANA zone such as `Europe/Paris`. */
  timeZone: string;
  dailyReminderTime: string | null;
  onboarded: boolean;
}

/** One status per habit per local date — duplicates cannot be represented. */
export type CheckIns = Record<string, Record<LocalDate, CheckInStatus>>;

export interface AppData {
  version: 1;
  habits: Habit[];
  checkIns: CheckIns;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  weekStart: 1,
  timeZone: 'device',
  dailyReminderTime: null,
  onboarded: false,
};

export const EMPTY_DATA: AppData = {
  version: 1,
  habits: [],
  checkIns: {},
  settings: DEFAULT_SETTINGS,
};

export const CATEGORIES = ['Health', 'Mind', 'Learning', 'Work', 'Home', 'Social', 'Other'] as const;

/** Feather icon names offered in the habit form. */
export const HABIT_ICONS = [
  'check-circle',
  'droplet',
  'book-open',
  'activity',
  'moon',
  'sun',
  'heart',
  'coffee',
  'edit-3',
  'music',
  'feather',
  'home',
  'users',
  'briefcase',
  'smile',
  'wind',
] as const;

/** Habit accent colours; each is legible on both the light and dark surfaces. */
export const HABIT_COLORS = [
  '#5B8A72',
  '#C2714F',
  '#4F7CAC',
  '#B58A2E',
  '#8E6BA8',
  '#B85C78',
  '#3F8F8C',
  '#7A7F52',
] as const;
