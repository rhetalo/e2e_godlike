# Playwright E2E — godlike.host

Автоматические E2E-тесты для [godlike.host](https://godlike.host) (Minecraft/VPS хостинг) и VirtFusion VPS панели [vf-panel.godlike.host](https://vf-panel.godlike.host).

Документация для агентов: **[agents.docs/AGENT_HANDOFF.md](./agents.docs/AGENT_HANDOFF.md)** (+ `CLAUDE.md` в корне)

---

## Быстрый старт

```bash
npm install

# Все тесты (4 проекта: storefront / vps-funnel / vps-panel / game-panel)
npx playwright test

# По проекту (surface area)
npx playwright test --project=storefront     # funnels + modded + general
npx playwright test --project=vps-funnel
npx playwright test --project=vps-panel
npx playwright test --project=game-panel

# По папке (npm-скрипты — см. package.json)
npm run test:panel      # tests/vps/panel/
npm run test:funnel     # tests/vps/funnel/ + tests/funnels/
npm run test:modded
npm run test:general
npm run test:game

# Конкретный файл с визуальным режимом
npx playwright test tests/vps/panel/vps.panel.media.spec.ts --headed

# По тегам
npm run test:smoke      # = npx playwright test --grep @smoke
npm run test:critical

# Отчёт
npx playwright show-report
```

---

## Структура тестов

```
tests/
├── vps/
│   ├── panel/     ← VirtFusion VPS панель (vps.panel.*.spec.ts)
│   └── funnel/    ← VPS purchase funnel (billing / configure / happy-path)
├── funnels/       ← Воронки покупки Minecraft/seed/mobile/PayPal
├── modded/        ← Modded серверы, seed, игровые промо, слайдеры
├── game/panel/    ← Game ultra.panel (login / power / files / security / …)
└── general/       ← Smoke, валидация, регистрация, ссылки
```

---

## Стек

- [Playwright](https://playwright.dev/) + TypeScript
- Паттерн: Page Object Model (`pages/`)
- Браузер: Chromium (основной)
- Конфиг: `playwright.config.ts` — `testDir: './tests'`, timeout 120 сек

---

## Аккаунты и константы

| Назначение | Файл | Переменная |
|---|---|---|
| VirtFusion панель | `utils/auth.ts` | `EMAIL`, `PASSWORD`, `PANEL_URL`, `TEST_SERVER_UUID` |
| Storefront воронки | `fixtures/test-data.ts` | `Credentials`, `BASE_URL` |

Сохранённые сессии: `storageState.*.json` в корне проекта.

---

## Важные ограничения

- **Не нажимать** "Continue" / "Place Order" на страницах оплаты — реальный платёж
- **Не делать Rebuild** без явного разрешения
- VirtFusion: статус сервера возвращается в `UPPERCASE` — всегда использовать `getStatusText()`
- VirtFusion: radio-кнопки Boot Order — только `dispatchEvent('click')`, не `.check()`

Полный список gotchas: `agents.docs/TEST_GUIDELINES.md` §7, `agents.docs/AGENT_HANDOFF.md` §5.

---

## CI/CD: авто-деплой на VPS

Тесты исполняются **на VPS** (`5.9.198.103`, Debian 12), папка `/home/admin/godlike-tests`.
GitLab CI занимается **только доставкой кода** на VPS — сами прогоны идут по cron (см. ниже).

### Как работает pipeline

При **push в `main`** срабатывает `.gitlab-ci.yml`:

- **`deploy_to_vps`** (stage `deploy`, тег раннера `godlike-vps`) — основной job. Раннер
  стоит на самом VPS (shell executor), поэтому «деплой» = обновление рабочей папки на месте:
  ```
  cd /home/admin/godlike-tests
  git fetch origin main && git reset --hard origin/main
  # npm ci + npx playwright install — ТОЛЬКО если изменился package-lock.json
  ```
  Новые тесты оказываются на VPS за считанные секунды (требование задачи: ≤2 мин).

- **`run_e2e_tests`** (stage `test`, опционально) — прогон в Docker-образе
  `mcr.microsoft.com/playwright` внутри GitLab, с HTML-report в **Artifacts** (30 дней).
  Запускается **вручную из UI** или **по расписанию (Schedule)** — НЕ на push,
  чтобы не дублировать прогон, который и так идёт на VPS по cron.

### Запуск тестов на VPS вручную

```bash
ssh root@5.9.198.103
cd /home/admin/godlike-tests

# Загрузить переменные окружения (.env НЕ читается конфигом автоматически):
set -a; source .env; set +a

# Прогон (примеры):
npx playwright test                              # все 4 проекта
npx playwright test --project=storefront         # один проект
npx playwright test --grep @smoke                # по тегу
npx playwright show-report                       # HTML-отчёт
```

Либо одной командой через готовый скрипт (он же запускается по расписанию):
```bash
/home/admin/godlike-tests/runner.sh              # грузит .env + npm run test, лог в test-run.log
```

### Расписание (cron)

```
0 9 * * *  /home/admin/godlike-tests/runner.sh   # ежедневный регресс в 09:00, отчёт в Slack
```

### Секреты и .env

- Креды и вебхуки **не хранятся в git** (см. `.gitignore`): `.env`, `credentials.json`,
  `storageState.*.json` — только на VPS.
- Шаблон переменных — `.env.example` (заполнить реальными значениями в `.env`).
- `SLACK_WEBHOOK_URL` — для Docker-прогона в GitLab задаётся как **CI/CD Variable**
  (Settings → CI/CD → Variables, masked); на VPS берётся из `.env`.
- Отчёт в Slack формирует `utils/PerFileSlackReporter.ts` (подключён в `playwright.config.ts`):
  по каждому spec-файлу — сводка `✅ / ❌ / ⏭`, детали отдельных тестов — только для упавших.

### Раннер на VPS (обслуживание)

```bash
systemctl status gitlab-runner      # состояние
gitlab-runner verify                # связь с GitLab
journalctl -u gitlab-runner -f      # логи job'ов
cat /etc/gitlab-runner/config.toml  # конфиг (project runner, tag godlike-vps, executor shell)
```
