# AGENT HANDOFF — godlike.host Playwright E2E Test Suite

> **Последнее обновление:** Май 2026
> **Окружение:** Playwright · TypeScript · Chromium
> **Проект:** godlike.host + vf-panel.godlike.host (VirtFusion)

---

## 1. Обзор

Проект `godlike-test_ex` содержит набор Playwright E2E-тестов для двух основных областей:

- **Godlike storefront** – основная воронка покупки, промо-кампании, валидация страниц и UI
- **VirtFusion VPS панель** – логин, переход к списку серверов, управление сервером и вкладки

Тесты написаны на TypeScript с использованием `@playwright/test`.

---

## 2. Быстрый старт

```bash
npm install
npx playwright test
npx playwright show-report
npx playwright test tests/vps.funnel.spec.ts --project=chromium
npx playwright test tests/vps.panel.server.spec.ts --project=chromium --headed
```

---

## 3. Структура проекта

```
godlike-test_ex/
├── tests/                      # 25 spec-файлов
├── pages/                      # 18 Page Object классов
├── components/                 # переиспользуемые UI-компоненты
├── utils/                      # помощники и селекторы
├── fixtures/                   # тестовые данные
├── playwright.config.ts        # конфигурация Playwright
├── package.json                # зависимости проекта
├── playwright-report/          # HTML-отчеты после запуска
├── test-results/               # результаты тестов
├── storageState.*.json         # сохраненные сессии
└── README.md
```

### Основные папки

- `tests/` – все `.spec.ts` тесты
- `pages/` – Page Object Model
- `utils/` – `auth.ts`, `selectors.ts`, `helpers.ts`, `iframe-helper.ts`
- `fixtures/` – `test-data.ts`, `games.json`

---

## 4. Тесты в проекте

### Основные категории

- Воронки: `funnel.spec.ts`, `funnel.modded.spec.ts`, `funnel.seed.spec.ts`, `funnel.mobile.spec.ts`, `funnel.cart.chech.spec.ts`, `funnel.with.credit.chechout.spec.ts`
- VPS: `vps.build.spec.ts`, `vps.funnel.spec.ts`
- Панель VirtFusion: `vps.panel.login.spec.ts`, `vps.panel.server.spec.ts`, `vps.panel.media.spec.ts`, `vps.panel.network.spec.ts`, `vps.panel.options.spec.ts`, `vps.panel.storage.spec.ts`
- Промо: `games.valid.promo.spec.ts`, `games.invalid.promo.spec.ts`
- Интерфейс и навигация: `game-slider.spec.ts`, `slider.modded.spec.ts`, `slider.seed.spec.ts`, `valid.links.spec.ts`, `smoke.pages.spec.ts`
- Валидация: `login.validation.spec.ts`, `registration-flow.spec.ts`
- Платежи: `funnel.paypal.redirect.spec.ts`
- Конфигурации: `modpack.config.modded.spec.ts`

---

## 5. Page Object Model

### Ключевые PO

- `VpsPanelLoginPage.ts`
- `VpsPanelDashboardPage.ts`
- `VpsPanelServerPage.ts`
- `VpsPanelMediaPage.ts`
- `VpsPanelNetworkPage.ts`
- `VpsPanelStoragePage.ts`
- `VpsPanelOptionsPage.ts`
- `VpsPanelServerDetailPage.ts`
- `VpsPanelServersListPage.ts`
- `VpsPage.ts`
- `VpsConfigPage.ts`
- `CartPage.ts`
- `CartBillingPage.ts`
- `CheckoutPage.ts`
- `ModdedHostingPage.ts`
- `SeedPage.ts`
- `MobileCartPage.ts`
- `BasePage.ts`

---

## 6. Конфигурация Playwright

Файл `playwright.config.ts` содержит актуальную конфигурацию:

- `testDir: './tests'`
- `timeout: 120000`
- `expect.timeout: 30000`
- `fullyParallel: true`
- `forbidOnly: !!process.env.CI`
- `retries: process.env.CI ? 2 : 0`
- `workers: 1`
- `reporter: 'html'`
- `use.baseURL: 'https://godlike.host'`
- `use.actionTimeout: 15000`
- `use.navigationTimeout: 60000`
- `use.trace: 'on-first-retry'`
- `use.viewport: { width: 1800, height: 900 }`
- активный проект: `chromium`

---

## 7. Константы и авторизация

В `utils/auth.ts` заданы ключевые параметры для VirtFusion:

```typescript
export const PANEL_URL = "https://vf-panel.godlike.host";
export const EMAIL = "test@testmail.com";
export const PASSWORD = "Password_123";
export const STORAGE_STATE_PATH = path.join(__dirname, "..", "storageState.panel.json");
export const TEST_SERVER_UUID = "9c49ed96-56f4-41c8-bc5f-a8d44c21a486";
export const TEST_SERVER_NAME = "srv-430464";
export const TEST_SERVER_URL = `${PANEL_URL}/server/${TEST_SERVER_UUID}`;
```

Функция `loginAndSaveSession(browser)` выполняет логин в панель и сохраняет `storageState.panel.json`.

---

## 8. Что важно знать

- В проекте **25 тестовых файлов**.
- В `package.json` есть только devDependencies и нет пользовательских `scripts`.
- Хардкод `TEST_SERVER_UUID` используется в тестах панели.
- Stripe/PayPal не проходят реальные платежи полностью.
- `workers: 1` означает запуск в одном процессе.
- `storageState` файлы используются для сохранения сессий.

---

## 9. Как запускать определённые группы

```bash
# Все тесты
npx playwright test

# Только панель
npx playwright test tests/vps.panel.*.spec.ts --project=chromium

# Только воронки
npx playwright test tests/funnel*.spec.ts --project=chromium

# Дебаг-кейс
npx playwright test tests/vps.panel.server.spec.ts --project=chromium --headed

# Конкретное имя теста
npx playwright test -g "Rebuild" --project=chromium --headed
```

---

## 10. Известные ограничения и баги VirtFusion

- `workers` выставлен в `1`.
- `storageState.panel.json` привязан к учётной записи.
- Если тестовый сервер `UUID` удалят — нужно обновить `utils/auth.ts`.
- Изменения UI требуют правки селекторов в `utils/selectors.ts` и страницах `pages/*.ts`.

### ⚠️ VirtFusion: статус сервера в ВЕРХНЕМ РЕГИСТРЕ

**Проблема (обнаружена: май 2026):**
VirtFusion возвращает статус сервера в капслоке — `"RUNNING"`, `"STOPPED"` — вместо `"Running"`, `"Stopped"`.
Прямое сравнение `status.includes("Running")` возвращает `false`, из-за чего `ensureRunning()`
думает что сервер не запущен и пытается нажать Boot-кнопку, которой нет при Running-состоянии.

**Симптом:**
```
[SETUP] Initial server status: "RUNNING"
[SETUP] Server is "RUNNING" — booting before test...
Error: element(s) not found — button[data-action="boot_server"]
```

**Фикс (применён в `VpsPanelServerPage.ts`):**
`getStatusText()` нормализует возвращаемое значение через regex с флагом `i`:
```typescript
if (/running/i.test(trimmed)) return "Running";
if (/stopped/i.test(trimmed)) return "Stopped";
```
Весь остальной код продолжает работать с `"Running"` / `"Stopped"` без изменений.

**Правило на будущее:**
Никогда не сравнивать статус VirtFusion напрямую без нормализации регистра.
Всегда использовать `getStatusText()` из `VpsPanelServerPage` — не `innerText()` напрямую.

### ⚠️ VirtFusion: кнопки питания НЕ имеют data-action атрибутов

**Проблема (обнаружена: май 2026):**
VirtFusion рендерит кнопки как обычные `<button>` с текстом — без атрибутов `data-action`.
Селекторы вида `button[data-action="shutdown_server"]` не находят ничего.

**Симптом:**
```
Error: element(s) not found
Locator: locator('button[data-action="shutdown_server"]').first()
Timeout: 10000ms
```

**Реальная структура DOM (из accessibility tree):**
```
button "Boot"      [disabled когда Running, enabled когда Stopped]
button "Shutdown"
button "Restart"
button "Power Off"
button "Rebuild"
```
Boot кнопка **всегда присутствует в DOM** — только disabled/enabled меняется.

**Фикс (применён в `VpsPanelServerPage.ts`):**
```typescript
get bootButton()      { return this.page.locator('button:has-text("Boot")').first(); }
get shutdownButton()  { return this.page.locator('button:has-text("Shutdown")').first(); }
get powerOffButton()  { return this.page.locator('button:has-text("Power Off")').first(); }
get restartButton()   { return this.page.locator('button:has-text("Restart")').first(); }

// Modal confirm buttons — scoped to open modal:
get shutdownConfirmButton()  { return this.page.locator('.modal.show button.btn-primary:has-text("Shutdown")').first(); }
get powerOffConfirmButton()  { return this.page.locator('.modal.show button.btn-primary:has-text("Power Off")').first(); }
get restartConfirmButton()   { return this.page.locator('.modal.show button.btn-primary:has-text("Restart")').first(); }
```

**Правило на будущее:**
Никогда не использовать `data-action` в селекторах VirtFusion.
Если нужен точный селектор — проверяй accessibility tree (`page.accessibility.snapshot()`)
или DevTools, не полагайся на предположения об атрибутах.

### ⚠️ Bootstrap: HTML модалов всегда в DOM (скрыт, не удалён)

**Проблема (обнаружена: май 2026):**
Bootstrap рендерит HTML всех модалов в DOM сразу при загрузке страницы — они просто скрыты (`display:none`), а не удалены.
Это значит, что `button:has-text("Shutdown")` находит **кнопку подтверждения внутри модала**,
а не power-кнопку на странице — потому что скрытый modal-button идёт первым в DOM.

**Симптом:**
```
locator resolved to <button data-bs-dismiss="modal" class="btn btn-primary w-100">Shutdown</button>
- unexpected value "hidden"
```
Страница выглядит корректно (сервер Running, кнопки видны), но локатор резолвится на невидимый элемент.

**Фикс (применён в `VpsPanelServerPage.ts`):**
Добавить `:not([data-bs-dismiss="modal"])` ко всем power-кнопкам:
```typescript
// Power button (на странице) — исключаем modal confirm buttons:
get shutdownButton() {
  return this.page.locator('button:has-text("Shutdown"):not([data-bs-dismiss="modal"])').first();
}

// Modal confirm button (внутри .modal.show) — отдельный геттер:
get shutdownConfirmButton() {
  return this.page.locator('.modal.show button.btn-primary:has-text("Shutdown")').first();
}
```

**Правило на будущее:**
При использовании Bootstrap — любой `button:has-text()` на VirtFusion страницах может
неожиданно резолвиться на скрытую кнопку внутри модала.
Всегда добавлять `:not([data-bs-dismiss="modal"])` к power-кнопкам,
и `:not([data-bs-dismiss])` если кнопка не должна быть внутри модала вообще.

---

## 11. Рекомендации по поддержке

- Для новых сценариев добавляйте Page Object и новый spec.
- Не подтверждайте destructive actions (`Delete`, `Rebuild`, `Power Off`).
- При падении панели сначала локально запускать `--headed`.
- Обновляйте селекторы при изменении DOM.

---

## 12. Актуальный контекст

Этот документ отражает текущее содержимое директории `f:\Playwrite\godlike-test_ex`.
