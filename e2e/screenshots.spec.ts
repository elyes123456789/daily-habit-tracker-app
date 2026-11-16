import { test } from '@playwright/test';

import { populatedData, seed } from './helpers';

// Regenerates the README screenshots from sample data:
//   SCREENSHOTS=1 npx playwright test screenshots
test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to regenerate README screenshots');

const shots: [name: string, path: string, theme: 'light' | 'dark'][] = [
  ['today', '/', 'light'],
  ['habit', '/habit?id=walk', 'light'],
  ['insights', '/insights', 'dark'],
  ['habit-form', '/habit-form', 'light'],
  ['settings', '/settings', 'dark'],
];

for (const [name, path, theme] of shots) {
  test(`${name} (${theme})`, async ({ page }, testInfo) => {
    const data = populatedData(theme);
    // A little progress on Today reads better than an untouched list.
    (data.checkIns.read as Record<string, string>)[Object.keys(data.checkIns.walk).sort().pop()!] = 'done';
    await seed(page, data);
    await page.goto(path);
    await page.getByRole('heading').first().waitFor();
    if (name === 'today') await page.getByRole('button', { name: 'Done: Read 10 pages' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `docs/screenshots/${name}-${testInfo.project.name}.png` });
  });
}

test('onboarding (light)', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('heading', { name: 'A calm place for your daily habits' }).waitFor();
  await page.screenshot({ path: `docs/screenshots/onboarding-${testInfo.project.name}.png` });
});
