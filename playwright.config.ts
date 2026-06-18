import { defineConfig, devices, type ReporterDescription } from '@playwright/test';

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

  // Тихий вывод: в CI — dot (точка на пройденный тест, подробно только падения),
  // локально — list (видны имена тестов). HTML-отчёт пишется всегда в
  // playwright-report/ (открыть: npm run report). Это убирает построчный флуд
  // от больших матриц вроде game-slider (сотни тестов = сотни строк).
  reporter: [
    (process.env.CI ? ['dot'] : ['list']) as ReporterDescription,
    // Markdown-лог прогона (test-logs/*.md) — только в CI, чтобы не шуметь локально.
    ...(process.env.CI
      ? [['./utils/MarkdownLoggerReporter.ts'] as ReporterDescription]
      : []),
    ['html', { open: 'never' }] as ReporterDescription,
    // Slack-отчёт по файлам (порт с gitlab/upd). Подключён всегда, но МОЛЧИТ без
    // SLACK_WEBHOOK_URL — env-only, без хардкода вебхука (секрет = GitLab CI/CD Variable).
    [
      './utils/PerFileSlackReporter.ts',
      {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        meta: [
          { key: 'Branch', value: process.env.CI_COMMIT_REF_NAME || 'local' },
          { key: 'Job URL', value: process.env.CI_JOB_URL || '' },
        ],
      },
    ] as ReporterDescription,
  ],

  // use: {
  //   baseURL: 'https://godlike.host',

  //   actionTimeout: 15_000,
  //   navigationTimeout: 60_000,

  //   // Трассировка при первом retry — для отладки упавших тестов
  //   trace: 'on-first-retry',

  //   viewport: { width: 1800, height: 900 },
  //   deviceScaleFactor: 1,
  // },

  projects: [
    {
    name: 'chromium',

    use: {
      ...devices['Desktop Chrome'],

      // Тесты бегут в фоне (без окон браузера). Переопределить разово:
      // npm run test:headed  /  npx playwright test --headed
      // В расширении Playwright для VS Code режим headed включает галочка
      // "Show browser" в панели Testing — этот флаг её НЕ перебивает, сними её там.
      headless: true,

      baseURL: 'https://godlike.host',

      actionTimeout: 15_000,
      navigationTimeout: 60_000,

      trace: 'on-first-retry',

      viewport: { width: 1800, height: 900 },
      // Локально (не CI): 80% рендер → headed-окно ~1440px влезает на ноут и видно больше страницы.
      deviceScaleFactor: process.env.CI ? 1 : 0.8,
      // Локально держим headed-окно на основном мониторе, чтобы не вылезало на соседний.
      launchOptions: { args: process.env.CI ? [] : ['--window-position=0,0'] },
    },
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
