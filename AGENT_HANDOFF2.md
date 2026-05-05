# AGENT HANDOFF — godlike.host Playwright E2E Test Suite

> **Последнее обновление:** Май 2026
> **Окружение:** Playwright · TypeScript · Chromium
> **Проект:** godlike.host + vf-panel.godlike.host (VirtFusion)

---

## 1. Что это

Автоматические E2E-тесты для двух продуктов:

| Продукт | URL | Что тестируется |
|---|---|---|
| **Godlike storefront** | `https://godlike.host` | Воронки покупки (Modded, Seed, VPS, Mobile) |
| **VPS панель** | `https://vf-panel.godlike.host` | Авторизация, управление сервером, все вкладки |

---

## 2. Быстрый старт

```bash
# Все тесты (headless)
npx playwright test

# Конкретный файл
npx playwright test tests/vps.funnel.spec.ts --project=chromium

# С браузером (режим дебага)
npx playwright test tests/vps.panel.server.spec.ts --project=chromium --headed

# HTML-отчёт после прогона
npx playwright show-report
```

---

## 3. Структура проекта

```
godlike-test_ex/
├── tests/                          # Spec-файлы (26 шт.)
│   ├── vps.funnel.spec.ts          # VPS purchase funnel (+ OS выбор)
│   ├── vps.panel.login.spec.ts     # Логин в VirtFusion панель
│   ├── vps.panel.server.spec.ts    # Dashboard + Server + Power + Tabs
│   ├── vps.panel.media.spec.ts     # OS/Rebuild вкладка
│   ├── vps.panel.network.spec.ts   # Network вкладка
│   ├── vps.panel.storage.spec.ts   # Storage вкладка
│   ├── vps.panel.backups.spec.ts   # Backups вкладка
│   ├── vps.panel.options.spec.ts   # Options/VNC/Delete вкладка
│   ├── vps.panel.debug.spec.ts     # Дебаг-инструмент (DOM dumper)
│   ├── funnel.modded.spec.ts       # Modded hosting funnel
│   ├── funnel.seed.spec.ts         # Seed hosting funnel
│   ├── funnel.mobile.spec.ts       # Mobile cart funnel
│   └── ...                         # остальные spec-файлы
├── pages/                          # Page Object Model (17 файлов)
│   ├── VpsPanelLoginPage.ts        # Логин страница панели
│   ├── VpsPanelDashboardPage.ts    # Dashboard + навигация
│   ├── VpsPanelServerPage.ts       # Server detail + tabs + power
│   ├── VpsPanelMediaPage.ts        # Media / OS / Rebuild
│   ├── VpsPanelNetworkPage.ts      # Network tab
│   ├── VpsPanelStoragePage.ts      # Storage tab
│   ├── VpsPanelBackupsPage.ts      # Backups tab
│   ├── VpsPanelOptionsPage.ts      # Options / Console / Delete
│   ├── VpsPage.ts                  # VPS landing (/vps-hosting/)
│   ├── VpsConfigPage.ts            # VPS cart configure step (+ OS выбор)
│   ├── CartBillingPage.ts          # Cart billing step
│   ├── CartPage.ts                 # Cart auth/main page
│   ├── Checkout2Page.ts            # WHMCS checkout
│   ├── ModdedHostingPage.ts        # Modded hosting landing
│   ├── SeedPage.ts                 # Seed hosting landing
│   ├── MobileCartPage.ts           # Mobile cart SPA
│   └── BasePage.ts                 # Общий базовый класс
├── components/                     # 14 переиспользуемых компонентов
├── utils/
│   ├── auth.ts                     # Panel login helper + константы
│   ├── selectors.ts                # Все CSS-селекторы (с VPS панелью)
│   ├── helpers.ts                  # parsePrice, dismissBanner
│   ├── credentials.ts              # Godlike storefront credentials
│   ├── slider-helpers.ts           # Vuetify slider helpers
│   └── iframe-helper.ts            # Stripe iframe helpers
├── fixtures/
│   ├── test-data.ts                # Основные тест-данные
│   └── games.json                  # Данные игр для промо-тестов
└── playwright.config.ts            # Конфигурация (baseURL, timeout, 1 worker)
```

---

## 4. Тест-аккаунты и константы

### Godlike Storefront (WHMCS)
```
URL:      https://godlike.host/clientarea/login
Email:    test@testmail.com
Password: test@testmail.com
```

### VirtFusion Panel
```
URL:      https://vf-panel.godlike.host/login
Email:    test@testmail.com
Password: Password_123
```

Константы в `utils/auth.ts`:
```typescript
export const PANEL_URL        = "https://vf-panel.godlike.host";
export const EMAIL            = "test@testmail.com";
export const PASSWORD         = "Password_123";
export const TEST_SERVER_UUID = "9c49ed96-56f4-41c8-bc5f-a8d44c21a486";
export const TEST_SERVER_NAME = "srv-430464";
export const TEST_SERVER_URL  = `${PANEL_URL}/server/${TEST_SERVER_UUID}`;
```

---

## 5. Архитектура

### Паттерн авторизации

**Storefront (WHMCS):**
```typescript
test.beforeAll(async ({ browser }) => {
  // Один логин → storageState.*.json → все тесты используют сохранённую сессию
  await page.goto('/clientarea/login');
  await page.fill('#inputEmail', EMAIL);
  await page.fill('#inputPassword', PASSWORD);
  await page.waitForURL('**/clientarea/clientarea.php');
  await page.context().storageState({ path: storageStatePath });
});
```

**VirtFusion Panel:**
```typescript
test.beforeAll(async ({ browser }) => {
  await loginAndSaveSession(browser); // utils/auth.ts
});
// В тестах:
const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
```

### Page Object Model

Каждый PO инкапсулирует:
- Локаторы (`get fieldName(): Locator`)
- Методы навигации (`goto()`, `clickTab()`)
- Бизнес-действия (`selectOs()`, `clickRebuildAndCancel()`)

Базовый класс `BasePage` используется только для Storefront POs.
Panel POs (`VpsPanel*`) — самостоятельные классы без наследования от BasePage.

### Иерархия VPS Panel POs

```
VpsPanelLoginPage    → /login
VpsPanelDashboardPage → /dashboard, /servers
VpsPanelServerPage   → /server/{UUID}  ← tabs + power buttons
  VpsPanelMediaPage   (Media tab content)
  VpsPanelNetworkPage (Network tab)
  VpsPanelStoragePage (Storage tab)
  VpsPanelBackupsPage (Backups tab)
  VpsPanelOptionsPage (Options tab)
```

---

## 6. Карта зависимостей: тест → Page Object

| Spec-файл | Page Objects |
|---|---|
| `vps.funnel.spec.ts` | `VpsPage`, `VpsConfigPage`, `CartBillingPage` |
| `vps.panel.login.spec.ts` | `VpsPanelLoginPage` |
| `vps.panel.server.spec.ts` | `VpsPanelServerPage`, `VpsPanelDashboardPage` |
| `vps.panel.media.spec.ts` | `VpsPanelServerPage`, `VpsPanelMediaPage` |
| `vps.panel.network.spec.ts` | `VpsPanelServerPage`, `VpsPanelNetworkPage` |
| `vps.panel.storage.spec.ts` | `VpsPanelServerPage`, `VpsPanelStoragePage` |
| `vps.panel.backups.spec.ts` | `VpsPanelServerPage`, `VpsPanelBackupsPage` |
| `vps.panel.options.spec.ts` | `VpsPanelServerPage`, `VpsPanelOptionsPage` |
| `funnel.modded.spec.ts` | `ModdedHostingPage`, `CartPage`, `Checkout2Page` |
| `funnel.seed.spec.ts` | `SeedPage`, `CartPage`, `Checkout2Page` |
| `funnel.mobile.spec.ts` | `MobileCartPage` |
| `vps.panel.debug.spec.ts` | (только `utils/auth`) |

---

## 7. VPS Panel — Подтверждённые селекторы

Все из `utils/selectors.ts`, секция VPS Panel:

```typescript
LOGIN.emailInput    = 'input[type="email"]'
LOGIN.passwordInput = 'input[type="password"]'
LOGIN.loginButton   = 'button:has-text("Login")'

TABS.overview = 'button:has-text("Overview"), a:has-text("Overview")'
TABS.media    = 'button:has-text("Media"), a:has-text("Media")'
TABS.options  = 'button:has-text("Options"), a:has-text("Options")'
TABS.network  = 'button:has-text("Network"), a:has-text("Network")'
TABS.storage  = 'button:has-text("Storage"), a:has-text("Storage")'
TABS.backups  = 'button:has-text("Backups"), a:has-text("Backups")'
TABS.sharing  = 'button:has-text("Sharing"), a:has-text("Sharing")'

POWER.boot     = 'button[data-action="boot_server"]'
POWER.shutdown = 'button[data-action="shutdown_server"]'
POWER.powerOff = 'button[data-action="poweroff_server"]'
POWER.restart  = 'button[data-action="restart_server"]'

MEDIA.rebuildConfirmText   = 'Are you sure you want to rebuild this server?'
MEDIA.rebuildConfirmButton = 'button:has-text("Continue")'
MEDIA.cancelButton         = 'button:has-text("Cancel")'
```

Источник: vlang props на живой странице `/server/9c49ed96-...` + dash-app.js (17-Apr-2026).

---

## 8. OS / Pre-installation на Configure шаге (VPS Funnel)

На шаге Configure (`/cart-vps?...&step=3`) появилась секция выбора ОС.
Реальный CSS-класс **не подтверждён через debug-spec** — используются fallback-селекторы:

```typescript
// В VpsConfigPage.ts:
get osItems(): Locator {
  return this.page.locator([
    ".configure-server__os-item",
    ".configure-server__preinstall-item",
    "[class*='configure-server'][class*='os']",
    "[class*='configure-server'][class*='preinstall']",
    "[class*='os-item']",
    "[class*='preinstall-item']",
  ].join(", "));
}
```

**Если тесты OS падают** → запусти debug-spec, найди реальный класс, обнови `VpsConfigPage.ts`:
```bash
npx playwright test tests/vps.panel.debug.spec.ts --project=chromium --headed
# Изучи лог → найди блок [DUMP: ...] с OS элементами
# Обнови osItems selector в pages/VpsConfigPage.ts
```

---

## 9. Правила для деструктивных операций

| Операция | Что делает тест |
|---|---|
| **Power Off** | Нажимает кнопку → проверяет модал → нажимает Cancel |
| **Restart** | Проверяет видимость кнопки (без клика если сервер Running) |
| **Rebuild** | Нажимает → проверяет текст модала → нажимает Cancel |
| **Delete Server** | Нажимает → проверяет модал → нажимает Cancel |
| **Boot** | Проверяет видимость кнопки (доступна только если сервер Stopped) |

**Никогда не подтверждать** `Continue` / `Delete` / `Install Now` в автоматизированных тестах.

---

## 10. Best Practices

### Ждать стабильного состояния
```typescript
// Правильно
await element.waitFor({ state: "visible", timeout: 15_000 });
await page.waitForLoadState("networkidle").catch(() => null);

// Неправильно
await page.waitForTimeout(5000); // слепое ожидание
```

### Логировать для дебага
```typescript
console.log(`[INFO] Step 3a: location "${confirmedLoc}" selected ✓`);
console.log(`[WARN] Tab "Sharing" not visible — skipping`);
console.log(`[DEBUG] Page snippet: "${bodyText.slice(0, 500)}"`);
```

### Мягкие проверки для опциональных фич
```typescript
// Фича может отсутствовать на плане — не падать, а логировать:
const available = await backupsPage.isCreateBackupAvailable();
if (!available) {
  console.log("[INFO] Backups not on current plan — skipping");
  return;
}
```

### Один browser.newContext per тест
```typescript
const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
const page = await context.newPage();
// ... тест ...
await context.close(); // всегда закрывать
```

---

## 11. Запуск по группам

```bash
# Только панель
npx playwright test --grep "VPS Panel" --project=chromium

# Только воронки
npx playwright test tests/vps.funnel.spec.ts tests/funnel.modded.spec.ts --project=chromium

# Дебаг (что-то упало — сначала этот)
npx playwright test tests/vps.panel.debug.spec.ts --project=chromium --headed

# Конкретный тест
npx playwright test -g "Rebuild" --project=chromium --headed
```

---

## 12. Файлы "под вопросом" (не используются активно)

| Файл | Статус |
|---|---|
| `fixtures/pages.ts` | Не импортируется ни одним тестом |
| `fixtures/test-fixtures.ts` | Не подключён к тестам |
| `fixtures/vps.fixtures.ts` | `authedPage` fixture не используется |
| `fixtures/testData.ts` | Дубликат `test-data.ts` |
| `utils/url-builder.ts` | Импортирует несуществующие файлы (`config/env`, `data/promo-codes`) |

---

## 13. Ограничения

- **Параллелизм**: `workers: 1` в `playwright.config.ts` — один аккаунт, один сервер.
- **storageState файлы** (`storageState.*.json`) не в git — генерируются при первом `beforeAll`.
- **Stripe/PayPal** — не тестируются до конца (iframes, реальные транзакции).
- **VPS Server UUID** захардкожен (`9c49ed96-...`) — если сервер удалят, обновить в `utils/auth.ts`.
- **OS-селектор** на Configure шаге не подтверждён через debug — см. раздел 8.

---

## 14. Добавление нового теста

1. **Новый Page Object** → `pages/VpsPanel*.ts` (панель) или `pages/Vps*.ts` (воронка)
2. **Новый spec** → `tests/vps.panel.*.spec.ts` или `tests/vps.*.spec.ts`
3. **Новые селекторы** → добавить в `utils/selectors.ts` в нужную секцию
4. Соблюдать паттерн: `beforeAll` логин → изолированный `context` per тест → `context.close()`
5. Логировать `[INFO]`, `[WARN]`, `[DEBUG]`, `[STEP N]`

---

*Конец handoff-документа.*
