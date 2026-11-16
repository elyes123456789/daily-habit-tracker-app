/** Backup format: validation, JSON export/import, CSV export. */
import { type Weekday, isValidLocalDate, isValidTime, isValidTimeZone } from './dates';
import {
  type AppData,
  type CheckIns,
  DEFAULT_SETTINGS,
  type Habit,
  type Pause,
  type ScheduleEntry,
  type Settings,
} from './types';

export const BACKUP_APP = 'daily-habit-tracker-app';
export const BACKUP_FORMAT_VERSION = 1;

export type ParseResult = { ok: true; data: AppData } | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Throws an `Error` with a user-readable message when `value` is not valid. */
function fail(message: string): never {
  throw new Error(message);
}

function str(value: unknown, where: string, max = 500): string {
  if (typeof value !== 'string') fail(`${where} must be text.`);
  return (value as string).slice(0, max);
}

function date(value: unknown, where: string) {
  if (!isValidLocalDate(value)) fail(`${where} must be a date like 2026-01-31.`);
  return value as string;
}

function parseHabit(raw: unknown, index: number): Habit {
  const where = `Habit ${index + 1}`;
  if (!isRecord(raw)) fail(`${where} is not an object.`);
  const h = raw as Record<string, unknown>;
  const id = str(h.id, `${where}: id`, 64);
  const name = str(h.name, `${where}: name`, 60).trim();
  if (!id) fail(`${where} has no id.`);
  if (!name) fail(`${where} has no name.`);

  if (!Array.isArray(h.schedule) || h.schedule.length === 0) fail(`${where} (“${name}”) has no schedule.`);
  const schedule: ScheduleEntry[] = (h.schedule as unknown[]).map((entry) => {
    if (!isRecord(entry) || !Array.isArray(entry.days)) fail(`${where} (“${name}”) has an invalid schedule.`);
    const e = entry as Record<string, unknown>;
    const days = e.days as unknown[];
    if (!days.every((d) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)) {
      fail(`${where} (“${name}”) has a weekday outside 0–6.`);
    }
    return { from: date(e.from, `${where} (“${name}”): schedule start`), days: [...new Set(days as Weekday[])].sort() };
  });
  schedule.sort((a, b) => a.from.localeCompare(b.from));

  const pauses: Pause[] = (Array.isArray(h.pauses) ? h.pauses : []).map((p: unknown) => {
    if (!isRecord(p)) fail(`${where} (“${name}”) has an invalid archive record.`);
    const r = p as Record<string, unknown>;
    return {
      from: date(r.from, `${where} (“${name}”): archive start`),
      to: r.to === null || r.to === undefined ? null : date(r.to, `${where} (“${name}”): archive end`),
    };
  });

  return {
    id,
    name,
    description: typeof h.description === 'string' ? h.description.slice(0, 500) : '',
    category: typeof h.category === 'string' ? h.category.slice(0, 40) : 'Other',
    icon: typeof h.icon === 'string' ? h.icon.slice(0, 40) : 'check-circle',
    color: typeof h.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(h.color) ? h.color : '#5B8A72',
    createdOn: date(h.createdOn, `${where} (“${name}”): created date`),
    schedule,
    pauses,
    reminderTime: isValidTime(h.reminderTime) ? h.reminderTime : null,
  };
}

function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return DEFAULT_SETTINGS;
  const theme = raw.theme;
  const weekStart = raw.weekStart;
  const timeZone = raw.timeZone;
  return {
    theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : DEFAULT_SETTINGS.theme,
    weekStart:
      Number.isInteger(weekStart) && (weekStart as number) >= 0 && (weekStart as number) <= 6
        ? (weekStart as Weekday)
        : DEFAULT_SETTINGS.weekStart,
    timeZone: typeof timeZone === 'string' && (timeZone === 'device' || isValidTimeZone(timeZone)) ? timeZone : 'device',
    dailyReminderTime: isValidTime(raw.dailyReminderTime) ? raw.dailyReminderTime : null,
    onboarded: raw.onboarded === true,
  };
}

/** Validates untrusted data (a backup file or what was read from storage). Throws on invalid input. */
export function validateData(raw: unknown): AppData {
  if (!isRecord(raw)) fail('The data is not an object.');
  const d = raw as Record<string, unknown>;
  if (d.version !== 1) fail(`Unsupported data version “${String(d.version)}”. This app reads version 1.`);
  if (!Array.isArray(d.habits)) fail('The habit list is missing.');

  const habits = (d.habits as unknown[]).map(parseHabit);
  const ids = new Set(habits.map((h) => h.id));
  if (ids.size !== habits.length) fail('Two habits share the same id.');

  const checkIns: CheckIns = {};
  if (d.checkIns !== undefined && !isRecord(d.checkIns)) fail('The check-in history is not an object.');
  for (const [habitId, days] of Object.entries((d.checkIns as Record<string, unknown>) ?? {})) {
    if (!ids.has(habitId)) continue; // history for a habit that no longer exists
    if (!isRecord(days)) fail(`Check-ins for habit “${habitId}” are not an object.`);
    const clean: Record<string, 'done' | 'skipped'> = {};
    for (const [day, status] of Object.entries(days as Record<string, unknown>)) {
      if (!isValidLocalDate(day)) fail(`“${day}” is not a valid check-in date.`);
      if (status !== 'done' && status !== 'skipped') fail(`Check-in on ${day} has unknown status “${String(status)}”.`);
      clean[day] = status as 'done' | 'skipped';
    }
    checkIns[habitId] = clean;
  }

  return { version: 1, habits, checkIns, settings: parseSettings(d.settings) };
}

export function exportJson(data: AppData, exportedAt: Date = new Date()): string {
  return JSON.stringify(
    { app: BACKUP_APP, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: exportedAt.toISOString(), data },
    null,
    2,
  );
}

export function parseBackup(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON. Choose a backup exported from this app.' };
  }
  if (!isRecord(parsed) || parsed.app !== BACKUP_APP) {
    return { ok: false, error: 'This file is not a Daily Habit Tracker backup.' };
  }
  if (parsed.formatVersion !== BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      error: `This backup uses format version ${String(parsed.formatVersion)}, but this app reads version ${BACKUP_FORMAT_VERSION}. Update the app and try again.`,
    };
  }
  try {
    return { ok: true, data: validateData(parsed.data) };
  } catch (e) {
    return { ok: false, error: `The backup could not be read: ${(e as Error).message}` };
  }
}

function csvCell(value: string): string {
  // Leading = + - @ would be run as a formula by spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** One row per recorded check-in, oldest first. */
export function exportCsv(data: AppData): string {
  const rows: string[][] = [];
  for (const habit of data.habits) {
    for (const [day, status] of Object.entries(data.checkIns[habit.id] ?? {})) {
      rows.push([day, habit.name, habit.category, status]);
    }
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  return [['date', 'habit', 'category', 'status'], ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
