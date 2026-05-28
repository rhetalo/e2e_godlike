import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Глобальный таймаут на один тест
  timeout: 120_000,

  expect: {
    timeout: 30_000,
  },

  // workers:1 keeps panel tests serial so the shared auth session is not
  // invalidated by concurrent logins. Remove or increase for pure UI tests.
  fullyParallel: false,

  // Запрещает test.only в CI
  forbidOnly: !!process.env.CI,

  // 2 retry в CI, 0 локально
  retries: process.env.CI ? 2 : 0,

  workers: 1,

  reporter: 'html',

  use: {
    baseURL: 'https://godlike.host',

    actionTimeout: 15_000,
    navigationTimeout: 60_000,

    // Трассировка при первом retry — для отладки упавших тестов
    trace: 'on-first-retry',

    viewport: { width: 1800, height: 900 },
    deviceScaleFactor: 1,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],
});
