import type { Page } from '@playwright/test';

export const STORAGE_KEY = 'daily-habit-tracker:data:v1';

/** `YYYY-MM-DD` for today plus `offset` days, in the browser's (and Node's) local zone. */
export function day(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/**
 * Six weeks of history for three habits:
 * - Read: done every day up to yesterday (a 42-day streak, today still open)
 * - Walk: done except three days ago, which has no check-in (streak of 2)
 * - Journal: archived a week ago, done before that
 */
export function populatedData(theme: 'light' | 'dark' | 'system' = 'light') {
  const start = day(-42);
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => day(from + i));
  const done = (days: string[]) => Object.fromEntries(days.map((d) => [d, 'done']));
  const habit = (id: string, name: string, category: string, icon: string, color: string, extra = {}) => ({
    id,
    name,
    description: '',
    category,
    icon,
    color,
    createdOn: start,
    schedule: [{ from: start, days: EVERY_DAY }],
    pauses: [],
    reminderTime: null,
    ...extra,
  });
  return {
    version: 1,
    habits: [
      habit('read', 'Read 10 pages', 'Mind', 'book-open', '#8E6BA8', { description: 'Before bed, phone in the other room.' }),
      habit('walk', 'Morning walk', 'Health', 'activity', '#C2714F'),
      habit('journal', 'Journal', 'Mind', 'edit-3', '#4F7CAC', { pauses: [{ from: day(-7), to: null }] }),
    ],
    checkIns: {
      read: done(range(-42, -1)),
      walk: { ...done([...range(-42, -4), ...range(-2, -1)]), [day(-10)]: 'skipped' },
      journal: done(range(-42, -8)),
    },
    settings: { theme, weekStart: 1, timeZone: 'device', dailyReminderTime: null, onboarded: true },
  };
}

/** Puts data in storage before the app's first script runs. */
export async function seed(page: Page, data: unknown) {
  await page.addInitScript(
    ([key, value]) => {
      // Only on the first load, so a reload inside a test keeps what the test changed.
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(key, value);
        sessionStorage.setItem('seeded', '1');
      }
    },
    [STORAGE_KEY, JSON.stringify(data)] as const,
  );
}
