import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests run against the production web export (`npm run build:web`),
 * served by `expo serve`, so they exercise what is actually deployed.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
    // Each test starts with empty storage; the service worker has its own test.
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1366, height: 800 } } },
    { name: 'phone', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: {
    command: 'npx expo serve --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
