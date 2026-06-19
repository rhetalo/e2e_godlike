import { defineConfig, devices, type ReporterDescription } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Хелперы воронок/ребилда лежат рядом со спеками (tests/**/*.helpers.ts), но это
  // НЕ тест-файлы. testMatch проектов ниже — директорные глобы (**/vps/funnel/** и т.п.),
  // поэтому без этого исключения Playwright собирал бы хелперы как тест-файлы и падал с
  // "test file should not import test file" при импорте их из спеков. testIgnore задан на
  // верхнем уровне → наследуется всеми проектами (они переопределяют только testMatch).
  testIgnore: '**/*.helpers.ts',

  timeout: 120_000,

  expect: {
    timeout: 30_000,
  },

  fullyParallel: false,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  // workers:1 keeps panel tests serial so the shared auth session is not
  // invalidated by concurrent logins. Remove or increase for pure UI tests.
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

  // Настройки браузера, общие для всех проектов.
  use: {
    ...devices['Desktop Chrome'],

    headless: true,

    baseURL: 'https://godlike.host',

    actionTimeout: 15_000,
    navigationTimeout: 60_000,

    trace: 'on-first-retry',

    viewport: { width: 1800, height: 900 },
    deviceScaleFactor: 1,

    // Локально (не CI): окно на основной монитор (0,0) + отключаем OS-масштаб 150% — тогда
    // окно вьюпорта 1800px влезает целиком в физический экран ноута (контент мельче = видно
    // больше). Вьюпорт остаётся 1800×900 как в CI, поведение тестов не меняется.
    launchOptions: {
      args: process.env.CI ? [] : ['--window-position=0,0', '--force-device-scale-factor=1'],
    },
  },

  // Четыре проекта соответствуют четырём surface area.
  // Запуск одного: npx playwright test --project=game-panel
  // Поведение не изменилось — те же workers:1 / fullyParallel:false что и раньше.
  projects: [
    {
      // Storefront: game-funnels, modded, general smoke.
      // Запуск: npx playwright test --project=storefront
      name: 'storefront',
      testMatch: ['**/funnels/**', '**/general/**', '**/modded/**'],
    },
    {
      // VPS покупка: billing, configure, happy-path.
      // Запуск: npx playwright test --project=vps-funnel
      name: 'vps-funnel',
      testMatch: '**/vps/funnel/**',
    },
    {
      // VPS VirtFusion-панель: login, power, rebuild, storage, …
      // Запуск: npx playwright test --project=vps-panel
      name: 'vps-panel',
      testMatch: '**/vps/panel/**',
    },
    {
      // Game ultra.panel: login, power, security, backups, files, …
      // Запуск: npx playwright test --project=game-panel
      name: 'game-panel',
      testMatch: '**/game/**',
    },
  ],
});
