/**
 * Local calendar dates.
 *
 * A check-in belongs to a calendar day, not to an instant. Days are stored as
 * `YYYY-MM-DD` strings and all arithmetic is done on the calendar (via UTC
 * midnight, which has no daylight-saving transitions), so nothing here can
 * drift by a day near midnight or across a DST change.
 */
export type LocalDate = string;

/** 0 = Sunday … 6 = Saturday (same as `Date#getDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

function toUtcMs(date: LocalDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): LocalDate {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function isValidLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Round-tripping rejects impossible dates such as 2025-02-30.
  return fromUtcMs(toUtcMs(value)) === value;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function deviceTimeZone(): string {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'device';
  } catch {
    return 'device';
  }
}

/**
 * The calendar date of `instant` as seen in `timeZone`.
 * `'device'` uses the device's current zone and needs no Intl support.
 */
export function toLocalDate(instant: Date, timeZone: string = 'device'): LocalDate {
  if (timeZone !== 'device') {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(instant);
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
      const result = `${get('year').padStart(4, '0')}-${get('month')}-${get('day')}`;
      if (isValidLocalDate(result)) return result;
    } catch {
      // Unknown zone or no Intl: fall through to the device's own calendar.
    }
  }
  return `${pad(instant.getFullYear(), 4)}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * 86_400_000);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000);
}

export function weekdayOf(date: LocalDate): Weekday {
  return new Date(toUtcMs(date)).getUTCDay() as Weekday;
}

export function startOfWeek(date: LocalDate, weekStart: Weekday): LocalDate {
  return addDays(date, -((weekdayOf(date) - weekStart + 7) % 7));
}

/** Every date from `from` to `to`, inclusive. Empty when `from` is after `to`. */
export function eachDay(from: LocalDate, to: LocalDate): LocalDate[] {
  const days: LocalDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Weekdays in display order for a week starting on `weekStart`. */
export function orderedWeekdays(weekStart: Weekday): Weekday[] {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => ((i + weekStart) % 7) as Weekday);
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
export const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** "Monday, 16 November" — built by hand so it is identical on every engine. */
export function formatLong(date: LocalDate, withYear = false): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${WEEKDAY_LONG[weekdayOf(date)]}, ${d} ${MONTH_LONG[m - 1]}${withYear ? ` ${y}` : ''}`;
}

/** "16 Nov 2026" */
export function formatShort(date: LocalDate): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${MONTH_LONG[m - 1].slice(0, 3)} ${y}`;
}

/** `HH:MM` in 24-hour time. */
export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
