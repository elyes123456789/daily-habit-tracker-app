import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { STORAGE_KEY, day, populatedData, seed } from './helpers';

test.describe('new user', () => {
  test('onboarding, creating a habit, checking in, and persistence across a reload', async ({ page }) => {
    await page.goto('/');

    // First run goes to onboarding.
    await expect(page.getByRole('heading', { name: 'A calm place for your daily habits' })).toBeVisible();
    await page.getByRole('button', { name: 'Start with an empty list' }).click();

    // Empty state, then create a habit.
    await expect(page.getByText('Start with one small habit')).toBeVisible();
    await page.getByRole('button', { name: 'Create a habit' }).click();
    await expect(page.getByRole('heading', { name: 'New habit' })).toBeVisible();

    // Validation: a name is required.
    await page.getByRole('button', { name: 'Create habit' }).click();
    await expect(page.getByText('Give the habit a name.')).toBeVisible();

    await page.getByLabel('Name', { exact: true }).fill('Stretch');
    await page.getByRole('radio', { name: 'Mind' }).click();
    await page.getByRole('button', { name: 'Create habit' }).click();

    // It is scheduled every day, so it shows on Today, unchecked.
    await expect(page.getByText('0 of 1 done')).toBeVisible();
    await expect(page.getByText('To do · Mind')).toBeVisible();

    // Check in.
    await page.getByRole('button', { name: 'Done: Stretch' }).click();
    await expect(page.getByText('1 of 1 done')).toBeVisible();
    await expect(page.getByText('All done for today. Nicely kept.')).toBeVisible();

    // Still there after a full reload.
    await page.reload();
    await expect(page.getByText('1 of 1 done')).toBeVisible();

    // Exactly one record for this habit and date, even after correcting it twice.
    await page.getByRole('button', { name: 'Skip: Stretch' }).click();
    await expect(page.getByText('Skipped · Mind')).toBeVisible();
    await page.getByRole('button', { name: 'Done: Stretch' }).click();
    await expect(page.getByText('1 of 1 done')).toBeVisible();
    const stored = JSON.parse((await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))!);
    expect(Object.values(stored.checkIns)).toEqual([{ [day()]: 'done' }]);

    // Clearing returns it to unchecked.
    await page.getByRole('button', { name: 'Done: Stretch' }).click();
    await expect(page.getByText('0 of 1 done')).toBeVisible();
  });

  test('deep links survive a refresh', async ({ page }) => {
    await seed(page, populatedData());
    for (const [path, heading] of [
      ['/habits', 'Habits'],
      ['/insights', 'Insights'],
      ['/settings', 'Settings'],
      ['/habit?id=read', 'Read 10 pages'],
      ['/habit-form?id=read', 'Edit habit'],
    ]) {
      await page.goto(path);
      await page.reload();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
  });
});

test.describe('with history', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, populatedData());
  });

  test('today shows scheduled, unarchived habits and lets a past day be corrected', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('0 of 2 done')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Done: Journal' })).toHaveCount(0); // archived

    // Three days ago Walk had no check-in. Go back and fix it.
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Previous day' }).click();
    await expect(page.getByText('Earlier day')).toBeVisible();
    await expect(page.getByText('1 of 2 done')).toBeVisible();
    await page.getByRole('button', { name: 'Done: Morning walk' }).click();
    await expect(page.getByText('2 of 2 done')).toBeVisible();

    await page.getByRole('button', { name: 'Back to today' }).click();
    await expect(page.getByText('0 of 2 done')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next day' })).toBeDisabled();
  });

  test('habit detail shows streaks and completion that follow the documented rules', async ({ page }) => {
    await page.goto('/habit?id=read');
    // Done 42 days running; today is open, which must not break the streak.
    await expect(page.getByLabel('Current streak: 42 days')).toBeVisible();
    await expect(page.getByLabel('Best streak: 42 days')).toBeVisible();
    await page.getByRole('radio', { name: '7 days' }).click();
    await expect(page.getByLabel(/Completion rate: 100%/)).toBeVisible();

    await page.goto('/habit?id=walk');
    // A day without a check-in three days ago reset it; the two days since count.
    await expect(page.getByLabel('Current streak: 2 days')).toBeVisible();
    await page.getByRole('radio', { name: '7 days' }).click();
    await expect(page.getByLabel(/Completion rate: 83%, 5 done · 0 skipped · 1 without a check-in/)).toBeVisible();
    await expect(page.getByText('Today is never missed.', { exact: false })).toBeVisible();
  });

  test('editing, archiving, restoring and deleting a habit', async ({ page }) => {
    await page.goto('/habit?id=walk');
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Name', { exact: true }).fill('Evening walk');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name: 'Evening walk' })).toBeVisible();

    // Archive asks first, then the habit leaves Today but keeps its history.
    await page.getByRole('button', { name: 'Archive' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Archived habit')).toHaveCount(0);
    await page.getByRole('button', { name: 'Archive' }).click();
    await page.getByRole('button', { name: 'Archive' }).last().click();
    await expect(page.getByText('Archived habit')).toBeVisible();
    await expect(page.getByLabel('Best streak: 38 days')).toBeVisible();

    await page.goto('/');
    await expect(page.getByText('0 of 1 done')).toBeVisible();

    await page.goto('/habits');
    await page.getByRole('button', { name: 'Restore Evening walk' }).click();
    await expect(page.getByRole('button', { name: 'Restore Evening walk' })).toHaveCount(0);

    // Delete is confirmed and says it cannot be undone.
    await page.getByRole('button', { name: 'Delete Journal' }).click();
    await expect(page.getByText('It cannot be undone.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Delete habit and history' }).click();
    await expect(page.getByText('Journal')).toHaveCount(0);
  });

  test('insights, settings, and a backup round trip', async ({ page }) => {
    await page.goto('/insights');
    await expect(page.getByLabel(/Longest current streak: 42/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Read 10 pages: completion 100%/ })).toBeVisible();

    await page.goto('/settings');
    // Theme and week start are saved.
    await page.getByRole('radio', { name: 'Dark' }).click();
    await page.getByRole('radio', { name: 'Sunday' }).click();
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Sunday' })).toBeChecked();

    // An unknown time zone is rejected with an explanation.
    await page.getByLabel('Fixed time zone (optional)').fill('Mars/Olympus');
    await page.getByRole('button', { name: 'Use this time zone' }).click();
    await expect(page.getByText('That is not a time zone this device recognises.', { exact: false })).toBeVisible();

    // Export, erase, import: the data comes back.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export backup (JSON)' }).click(),
    ]);
    const backupPath = await download.path();
    const backup = JSON.parse(await readFile(backupPath, 'utf8'));
    expect(backup).toMatchObject({ app: 'daily-habit-tracker-app', formatVersion: 1 });
    expect(backup.data.habits).toHaveLength(3);

    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export check-ins (CSV)' }).click(),
    ]);
    expect((await readFile(await csv.path(), 'utf8')).split('\r\n')[0]).toBe('date,habit,category,status');

    await page.getByRole('button', { name: 'Erase all data' }).click();
    await page.getByRole('button', { name: 'Erase all data' }).last().click();
    await page.goto('/habits');
    await expect(page.getByText('No habits yet')).toBeVisible();

    await page.goto('/settings');
    // A file that is not a backup is refused and nothing changes.
    const [badChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Import backup' }).click(),
    ]);
    await badChooser.setFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
    await expect(page.getByText('This file is not a Daily Habit Tracker backup.', { exact: false })).toBeVisible();

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Import backup' }).click(),
    ]);
    await chooser.setFiles(backupPath);
    await expect(page.getByText('The backup contains 3 habits', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Replace with backup' }).click();
    await page.goto('/habits');
    await expect(page.getByText('Read 10 pages')).toBeVisible();
    await expect(page.getByText('Archived · 1')).toBeVisible();
  });
});

test('unreadable saved data is reported, not overwritten', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{"version":1,"habits":"oops"}'), STORAGE_KEY);
  await page.goto('/');
  await expect(page.getByText('Your saved data could not be read')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('{"version":1,"habits":"oops"}');
});

test.describe('installable web app', () => {
  test.use({ serviceWorkers: 'allow' });

  test('serves a manifest and registers a service worker that works offline', async ({ page, context }) => {
    await seed(page, populatedData());
    await page.goto('/');
    const manifest = await (await page.request.get('/manifest.json')).json();
    expect(manifest).toMatchObject({ name: 'Daily Habit Tracker App', display: 'standalone' });
    for (const icon of manifest.icons) expect((await page.request.get(`/${icon.src}`)).ok()).toBe(true);

    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect(page.getByText('0 of 2 done')).toBeVisible();
    // Give the worker a moment to store the assets the page reported.
    await page.waitForTimeout(1500);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText('0 of 2 done')).toBeVisible();
    await page.getByRole('button', { name: 'Done: Read 10 pages' }).click();
    await expect(page.getByText('1 of 2 done')).toBeVisible();
  });
});
