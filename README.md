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
