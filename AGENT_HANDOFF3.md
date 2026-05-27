# AGENT HANDOFF 3 — godlike.host Playwright E2E Suite

> **Дата:** Май 2026
> **Стек:** TypeScript · Playwright · Chromium
> **Репо:** https://github.com/rhetalo/e2e_godlike
> **GitHub токен:** в Replit Secrets — переменная `GITHUB_TOKEN`
> **Пуш в GitHub:** только через GitHub API (не через `git push` из shell)

---

## 1. Состояние на момент передачи

### Что сделано

- Реструктуризация: все 28 spec-файлов разложены по папкам (подробнее — §3)
- Все импорты обновлены под новые пути
- `vps/panel/vps.panel.power.actions.spec.ts` — полный набор тестов управления питанием (**работает, 3/3 passed**)
- `vps/panel/vps.panel.media.spec.ts` — тесты Boot Order (**работает, 3/3 passed**)
- `VpsPanelServerPage.ts` — переписан с нуля, исправлены все VirtFusion-баги
- `VpsPanelMediaPage.ts` — переписан с нуля, работает корректно
- Все VirtFusion-специфичные паттерны задокументированы в `TEST_GUIDELINES.md` §7

### Что NOT сделано / отложено

- `vps/panel/vps.panel.network.spec.ts` — пустой/заглушка, нет сценариев
- `vps/panel/vps.panel.options.spec.ts` — пустой/заглушка, нет сценариев
- Воронки (`funnels/`, `modded/`) — тесты унаследованы из предыдущей работы, не ревьюились в этой сессии
- Новые тесты для rebuild, storage, server detail — не написаны

---

## 2. Быстрый старт

```bash
# Установка (один раз)
npm install

# Запуск всех тестов
npx playwright test --project=chromium

# Группы
npx playwright test tests/vps/panel/ --project=chromium
npx playwright test tests/vps/panel/ --project=chromium --headed
npx playwright test tests/funnels/ --project=chromium
npx playwright test tests/modded/ --project=chromium
npx playwright test tests/general/ --project=chromium

# Конкретный файл
npx playwright test tests/vps/panel/vps.panel.media.spec.ts --project=chromium --headed
npx playwright test tests/vps/panel/vps.panel.power.actions.spec.ts --project=chromium --headed

# По тегу
npx playwright test --grep "@smoke" --project=chromium
npx playwright test --grep "@critical" --project=chromium

# Отчёт
npx playwright show-report
```

---

## 3. Структура проекта

```
e2e_godlike/
├── tests/
│   ├── vps/
│   │   ├── panel/               ← VirtFusion VPS панель (vf-panel.godlike.host)
│   │   │   ├── vps.panel.login.spec.ts
│   │   │   ├── vps.panel.power.actions.spec.ts   ✅ РАБОТАЕТ
│   │   │   ├── vps.panel.power.spec.ts
│   │   │   ├── vps.panel.media.spec.ts            ✅ РАБОТАЕТ
│   │   │   ├── vps.panel.network.spec.ts          ⚠️ заглушка
│   │   │   ├── vps.panel.options.spec.ts          ⚠️ заглушка
│   │   │   ├── vps.panel.rebuild.spec.ts
│   │   │   ├── vps.panel.server.spec.ts
│   │   │   ├── vps.panel.storage.spec.ts
│   │   │   └── vps.build.spec.ts
│   │   └── funnel/              ← VPS purchase funnel (godlike.host/vps-hosting/)
│   │       └── vps.funnel.spec.ts
│   ├── funnels/                 ← Воронки покупки (Minecraft, seed, mobile, PayPal)
│   │   ├── funnel.spec.ts
│   │   ├── funnel.cart.chech.spec.ts
│   │   ├── funnel.mobile.spec.ts
│   │   ├── funnel.paypal.redirect.spec.ts
│   │   ├── funnel.seed.spec.ts
│   │   └── funnel.with.credit.chechout.spec.ts
│   ├── modded/                  ← Modded/seed серверы, игровые промо, слайдеры
│   │   ├── funnel.modded.spec.ts
│   │   ├── modpack.config.modded.spec.ts
│   │   ├── slider.modded.spec.ts
│   │   ├── slider.seed.spec.ts
│   │   ├── games.valid.promo.spec.ts
│   │   ├── games.invalid.promo.spec.ts
│   │   └── game-slider.spec.ts
│   └── general/                 ← Smoke, валидация, регистрация, ссылки
│       ├── smoke.pages.spec.ts
│       ├── login.validation.spec.ts
│       ├── registration-flow.spec.ts
│       └── valid.links.spec.ts
│
├── pages/                       ← Page Object Model
│   ├── VpsPanelServerPage.ts    ← КЛЮЧЕВОЙ: Overview + power + activity table
│   ├── VpsPanelMediaPage.ts     ← Boot Order, CD/DVD switch
│   ├── VpsPanelLoginPage.ts
│   ├── VpsPanelDashboardPage.ts
│   ├── VpsPanelNetworkPage.ts
│   ├── VpsPanelOptionsPage.ts
│   ├── VpsPanelRebuildPage.ts
│   ├── VpsPanelStoragePage.ts
│   ├── VpsPanelServersListPage.ts
│   ├── VpsPanelServerDetailPage.ts
│   ├── VpsPage.ts
│   ├── VpsConfigPage.ts
│   ├── CartPage.ts
│   ├── CartBillingPage.ts
│   ├── CheckoutPage.ts
│   ├── ModdedHostingPage.ts
│   ├── SeedPage.ts
│   ├── MobileCartPage.ts
│   └── BasePage.ts
│
├── components/                  ← Переиспользуемые UI-компоненты
├── utils/
│   ├── auth.ts                  ← КЛЮЧЕВОЙ: константы, loginAndSaveSession()
│   ├── helpers.ts
│   ├── selectors.ts
│   ├── credentials.ts
│   ├── bannerHandlers.ts
│   ├── iframe-helper.ts
│   ├── slider-helpers.ts
│   └── url-builder.ts
├── fixtures/
│   ├── test-data.ts             ← URLs, Credentials, PaymentUrlPatterns
│   ├── games.json
│   └── users.ts
│
├── storageState.panel.json      ← Сессия VirtFusion (vf-panel.godlike.host)
├── storageState.modded.json     ← Сессия godlike modded funnel
├── storageState.free.json       ← Сессия free-аккаунта (games promo)
├── storageState.vps.json        ← Сессия VPS funnel
├── storageState.seed.json       ← Сессия seed funnel
├── storageState.mobile.json     ← Сессия mobile funnel
├── storageState.json            ← Общая сессия
│
├── playwright.config.ts         ← testDir: './tests' (рекурсивный поиск)
├── TEST_GUIDELINES.md           ← Правила написания тестов + VirtFusion gotchas
├── AGENT_HANDOFF2.md            ← Предыдущий handoff (исторический)
└── AGENT_HANDOFF3.md            ← ЭТОТ ДОКУМЕНТ
```

**Важно по импортам:**
- Тесты в `tests/vps/panel/` и `tests/vps/funnel/` → глубина 3 → импорты `"../../../pages/"`, `"../../../utils/"`, `"../../../fixtures/"`
- Тесты в `tests/funnels/`, `tests/modded/`, `tests/general/` → глубина 2 → `"../../pages/"`, `"../../utils/"`, `"../../fixtures/"`

---

## 4. Ключевые константы (utils/auth.ts)

```typescript
PANEL_URL           = "https://vf-panel.godlike.host"
EMAIL               = "test@testmail.com"
PASSWORD            = "Password_123"
STORAGE_STATE_PATH  = path.join(__dirname, "..", "storageState.panel.json")
TEST_SERVER_UUID    = "9c49ed96-56f4-41c8-bc5f-a8d44c21a486"
TEST_SERVER_NAME    = "srv-430464"
TEST_SERVER_URL     = `${PANEL_URL}/server/${TEST_SERVER_UUID}`
```

Функция `loginAndSaveSession(browser)` — логин в VirtFusion, сохраняет `storageState.panel.json`.

Для storefront-тестов (воронки, modded, seed) используется `fixtures/test-data.ts`:
```typescript
BASE_URL     = "https://godlike.host"
Credentials  = { email: "test@testmail.com", password: "test@testmail.com" }
```

---

## 5. VirtFusion Gotchas — критически важно

Все задокументированы в `TEST_GUIDELINES.md` §7. Краткая выжимка:

### 5.1 Статус сервера — ВЕРХНИЙ РЕГИСТР
VirtFusion возвращает `"RUNNING"`, `"STOPPED"` — не `"Running"`.
**Всегда** используй `getStatusText()` из `VpsPanelServerPage` — она нормализует через regex.
```typescript
// ❌ Нельзя:
const text = await page.locator('div.p-3').innerText();
expect(text).toContain("Running"); // УПАДЁТ

// ✓ Правильно:
const status = await serverPage.getStatusText(); // нормализует к "Running"/"Stopped"
```

### 5.2 Кнопки питания — НЕТ data-action атрибутов
VirtFusion рендерит plain `<button>` без `data-action`. Все кнопки ищутся по тексту:
```typescript
button:has-text("Boot"):not([data-bs-dismiss="modal"])
button:has-text("Shutdown"):not([data-bs-dismiss="modal"])
```

### 5.3 Bootstrap модалы — все в DOM сразу
Bootstrap держит HTML всех модалов в DOM при загрузке (display:none).
Modal-кнопки **всегда** скоупировать на `.modal.show`:
```typescript
// ✓ Confirm:  .modal.show button.btn-primary:has-text("Shutdown")
// ✓ Cancel:   .modal.show button[data-bs-dismiss="modal"]
```

### 5.4 Activity table debug-строки — id на `<td>`, не `<tr>`
```typescript
// ✓ Правильный селектор:
"table.table.table-normal tbody tr:not(:has(td[id^='debug']))"
```

### 5.5 Radio-tile кнопки — input скрыт CSS
`.check()` и `.check({force:true})` оба падают (scroll in view).
Единственное решение — `dispatchEvent('click')`:
```typescript
// ✓ VpsPanelMediaPage.selectHDD() / selectCDDVD() уже используют это:
await this.hddRadio.dispatchEvent("click");
await expect(this.hddRadio).toBeChecked({ timeout: 5_000 });
```

### 5.6 Boot Order task в activity table
Задача называется `"Boot Order"` (именно так, с пробелом).
Проверка: `expect(taskName).toMatch(/boot order/i)`

---

## 6. Паттерны тестов VirtFusion

### Шаблон для panel-теста с общим контекстом:
```typescript
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../../../pages/VpsPanelServerPage";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_UUID } from "../../../utils/auth";

test.use({ viewport: { width: 1440, height: 900 } });
test.describe.configure({ mode: "serial" });

let sharedContext: BrowserContext;
let serverPage: VpsPanelServerPage;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
  sharedContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await sharedContext.newPage();
  serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
  await serverPage.goto();
});

test.afterAll(async () => { await sharedContext.close(); });
```

### Как дождаться Complete в activity table:
```typescript
const rowsBefore = await serverPage.getActivityRowCount();
await serverPage.someButton.click();
await serverPage.waitForNewActivityRow(rowsBefore, 15_000);
await serverPage.waitForLatestTaskComplete(90_000);
const taskName = await serverPage.getLatestTaskName();
expect(taskName).toBe("Shutdown"); // или другое имя задачи
```

---

## 7. Что делать дальше

Приоритеты (по убыванию):

1. **vps/panel/vps.panel.network.spec.ts** — написать реальные тесты для вкладки Network
2. **vps/panel/vps.panel.options.spec.ts** — написать реальные тесты для вкладки Options
3. **vps/panel/vps.panel.storage.spec.ts** — ревью и починка (если сломан)
4. **vps/panel/vps.panel.rebuild.spec.ts** — ревью (опасный тест — rebuild стирает данные)
5. **funnels/** — ревью существующих воронок, починка упавших
6. **Новые флоу** — по запросу пользователя

---

## 8. Правила для нового агента

1. **Пуш только через GitHub API** — не `git push`, используй `GITHUB_TOKEN` из Replit Secrets
2. **Всегда читай TEST_GUIDELINES.md** перед написанием любого теста
3. **Для VirtFusion** — смотри §5 этого документа и §7 TEST_GUIDELINES.md
4. **Импорты** — глубина 3 для `tests/vps/*` (три `../`), глубина 2 для остальных групп
5. **Не кликать** `Continue`/`Place Order` на страницах оплаты — это реальный платёж
6. **Не делать Rebuild** без явного разрешения пользователя
7. **Запускай тесты с `--headed`** при отладке — VirtFusion требует визуального контроля
8. **Serial mode** для всех VirtFusion panel тестов (один сервер, меняющееся состояние)
