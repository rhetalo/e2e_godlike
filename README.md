# Playwright E2E — godlike.host

Автоматические E2E-тесты для [godlike.host](https://godlike.host) (Minecraft/VPS хостинг) и VirtFusion VPS панели [vf-panel.godlike.host](https://vf-panel.godlike.host).

Документация для агентов: **[AGENT_HANDOFF3.md](./AGENT_HANDOFF3.md)**

---

## Быстрый старт

```bash
npm install

# Все тесты
npx playwright test --project=chromium

# По группам
npx playwright test tests/vps/panel/    --project=chromium
npx playwright test tests/funnels/      --project=chromium
npx playwright test tests/modded/       --project=chromium
npx playwright test tests/general/      --project=chromium

# Конкретный файл с визуальным режимом
npx playwright test tests/vps/panel/vps.panel.media.spec.ts --project=chromium --headed

# По тегам
npx playwright test --grep "@smoke"    --project=chromium
npx playwright test --grep "@critical" --project=chromium

# Отчёт
npx playwright show-report
```

---

## Структура тестов

```
tests/
├── vps/
│   ├── panel/     ← VirtFusion VPS панель (vps.panel.*.spec.ts, vps.build.spec.ts)
│   └── funnel/    ← VPS purchase funnel (vps.funnel.spec.ts)
├── funnels/       ← Воронки покупки Minecraft/seed/mobile/PayPal
├── modded/        ← Modded серверы, seed, игровые промо, слайдеры
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

Полный список gotchas: `TEST_GUIDELINES.md` §7, `AGENT_HANDOFF3.md` §5.
