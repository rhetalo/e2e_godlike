# AGENT HANDOFF 3 — godlike.host Playwright E2E Suite

> **Дата последнего обновления:** Май 2026
> **Стек:** TypeScript · Playwright · Chromium
> **Репо:** https://github.com/rhetalo/e2e_godlike
> **GitHub токен:** в Replit Secrets — переменная `GITHUB_SSH_KEY` (это PAT-токен, не SSH-ключ — имя переменной историческое)
> **Пуш в GitHub:** только через GitHub API (не через `git push` из shell — заблокировано в Replit)

---

## 1. Состояние на момент передачи

### Что сделано

- Реструктуризация: все 28 spec-файлов разложены по папкам
- `vps/panel/vps.panel.power.actions.spec.ts` — полный набор тестов управления питанием (**✅ 3/3 passed**)
- `vps/panel/vps.panel.media.spec.ts` — тесты Boot Order (**✅ 3/3 passed**)
- `VpsPanelServerPage.ts` и `VpsPanelMediaPage.ts` — переписаны с нуля, все VirtFusion-баги исправлены
- `vps/funnel/vps.funnel.spec.ts` — **✅ 23/23 passed** — полное покрытие воронки VPS (4 suite)
- `VpsConfigPage.ts` — переписан с нуля: добавлены OS-selection методы, точная фильтрация по заголовку

### Что NOT сделано / отложено

- `vps/panel/vps.panel.network.spec.ts` — пустая заглушка, нет сценариев
- `vps/panel/vps.panel.options.spec.ts` — пустая заглушка, нет сценариев
- Воронки (`funnels/`, `modded/`) — унаследованы из предыдущей работы, не ревьюились
- `vps.panel.rebuild.spec.ts`, `vps.panel.storage.spec.ts`, `vps.panel.server.spec.ts` — не ревьюились

---

## 2. Быстрый старт

```bash
# Установка (один раз)
npm install

# Запуск всех тестов
npx playwright test --project=chromium

# Конкретные группы
npx playwright test tests/vps/panel/ --project=chromium --headed
npx playwright test tests/vps/funnel/ --project=chromium --headed
npx playwright test tests/funnels/ --project=chromium
npx playwright test tests/modded/ --project=chromium
npx playwright test tests/general/ --project=chromium

# Конкретный файл
npx playwright test tests/vps/funnel/vps.funnel.spec.ts --project=chromium --headed

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
│   │   │   ├── vps.panel.power.actions.spec.ts   ✅ 3/3 passed
│   │   │   ├── vps.panel.power.spec.ts
│   │   │   ├── vps.panel.media.spec.ts            ✅ 3/3 passed
│   │   │   ├── vps.panel.network.spec.ts          ⚠️ заглушка
│   │   │   ├── vps.panel.options.spec.ts          ⚠️ заглушка
│   │   │   ├── vps.panel.rebuild.spec.ts
│   │   │   ├── vps.panel.server.spec.ts
│   │   │   ├── vps.panel.storage.spec.ts
│   │   │   └── vps.build.spec.ts
│   │   └── funnel/              ← VPS purchase funnel (godlike.host/vps-hosting/)
│   │       └── vps.funnel.spec.ts                 ✅ 23/23 passed
│   ├── funnels/                 ← Воронки покупки (Minecraft, seed, mobile, PayPal)
│   ├── modded/                  ← Modded/seed серверы, игровые промо, слайдеры
│   └── general/                 ← Smoke, валидация, регистрация, ссылки
│
├── pages/                       ← Page Object Model
│   ├── VpsPanelServerPage.ts    ← КЛЮЧЕВОЙ: Overview + power + activity table
│   ├── VpsPanelMediaPage.ts     ← Boot Order, CD/DVD switch
│   ├── VpsConfigPage.ts         ← Configure step воронки VPS (location + OS selection)
│   ├── VpsPage.ts               ← Landing /vps-hosting/
│   ├── CartBillingPage.ts       ← Billing cycle step /cart-vps/
│   ├── VpsPanelLoginPage.ts
│   ├── VpsPanelDashboardPage.ts
│   ├── VpsPanelNetworkPage.ts
│   ├── VpsPanelOptionsPage.ts
│   ├── VpsPanelRebuildPage.ts
│   ├── VpsPanelStoragePage.ts
│   ├── VpsPanelServersListPage.ts
│   ├── VpsPanelServerDetailPage.ts
│   ├── CartPage.ts
│   ├── CheckoutPage.ts
│   ├── ModdedHostingPage.ts
│   ├── SeedPage.ts
│   └── MobileCartPage.ts
│
├── utils/
│   ├── auth.ts                  ← PANEL_URL, TEST_SERVER_UUID, loginAndSaveSession()
│   ├── helpers.ts
│   ├── selectors.ts
│   ├── credentials.ts
│   ├── bannerHandlers.ts
│   ├── iframe-helper.ts
│   ├── slider-helpers.ts
│   └── url-builder.ts
│
├── components/                  ← Shared UI components (BillingCycleSelector, etc.)
├── fixtures/
│   ├── test-data.ts             ← BASE_URL, email/password для storefront-тестов
│   └── users.ts
└── playwright.config.ts
```

---

## 4. Критические константы

```typescript
// utils/auth.ts
PANEL_URL        = "https://vf-panel.godlike.host"
TEST_SERVER_UUID = "9c49ed96-56f4-41c8-bc5f-a8d44c21a486"
STORAGE_STATE_PATH = "storageState.json"   // для panel-тестов

// tests/vps/funnel/vps.funnel.spec.ts (локальные)
BASE_URL          = "https://godlike.host"
EMAIL             = "test@testmail.com"
PASSWORD          = "test@testmail.com"
storageStatePath  = "storageState.vps.json"  // отдельный файл от panel-тестов!
```

---

## 5. VPS Funnel — vps.funnel.spec.ts (23 теста, все passing)

### Структура (4 suite)

| Suite | Тестов | Описание |
|-------|--------|----------|
| SUITE 1 — VPS Landing | 3 | Кнопки Deploy Now, href-атрибуты, монтирование Vue SPA |
| SUITE 2 — Billing Cycle | 6 | 4 периода, цены, discount badges, смена цикла, Next Step |
| SUITE 3 — Configure Your Server | 13 | Локации + OS/Pre-installation selection |
| SUITE 4 — Full Happy Path | 1 | End-to-end: Landing → Billing → Configure → WHMCS |

### SUITE 3 — Configure — что проверяется

**Локации:**
- 2 локации (USA, Europe), одна активна по умолчанию
- Клик меняет активную, смена отражается в order summary (`Location:`)

**OS / Pre-installation (новое):**
- Блок `.configure-server__types` виден, 8 типов ОС
- По умолчанию активен `Games`, в summary `Server type: Minecraft`
- Выбор другого типа (`Ubuntu`, `Rocky Linux`) меняет активную карточку
- Типы с версиями показывают `.custom-dropdown` для выбора версии
- Выбор версии обновляет summary `Server type:`
- `WordPress on Ubuntu` — единственный тип без дропдауна (нет версий)

### Архитектура тестов в этом файле

Каждый тест создаёт **отдельный** `browser.newContext({ storageState })` + новую страницу.
Логин происходит один раз в `beforeAll`, сохраняется в `storageState.vps.json`.
Это **изолированный** подход — тесты независимы, но каждый проходит путь до нужного шага заново (~10–15 сек).

> Оптимизация через `serial` mode + shared page возможна, но не приоритетна — все 23 теста проходят стабильно.

---

## 6. VpsConfigPage.ts — ключевые методы

```typescript
// Локации
config.locationItems                   // Locator: все карточки .configure-server__location
config.activeLocation                  // Locator: активная карточка
config.getActiveLocationName()         // string: текст активной локации
config.selectLocation("Europe")        // click по локации + waitForTimeout(400)

// OS Types
config.osTypesContainer                // Locator: .configure-server__types
config.osTypeItems                     // Locator: все карточки .configure-server__type
config.activeOsType                    // Locator: .configure-server__type-active
config.getActiveOsTypeName()           // string: заголовок из .configure-server__type_title
config.selectOsType("Ubuntu")          // точный match по ^Ubuntu$ — НЕ hasText!

// OS Version Dropdown (у всех кроме WordPress on Ubuntu)
config.osDropdown                      // Locator: .custom-dropdown (visible = есть версии)
config.osDropdownItems                 // Locator: .custom-dropdown__item
config.getCurrentOsVersion()           // string: текущая выбранная версия
config.openOsDropdown()                // клик на .custom-dropdown__selected
config.selectOsVersion("Ubuntu 22.04 LTS")

// Order Summary
config.orderLocation                   // Locator: caption строки Location
config.orderServerType                 // Locator: caption строки Server type
config.orderTotal                      // Locator: .order__pricing-price

// Navigation
config.nextStepButton                  // Locator: .order__button
config.proceedToCheckout()             // click + waitForURL /clientarea/cart.php
config.waitForConfigureStep()          // ждёт locations + OS container
```

### ⚠️ Важно: selectOsType использует точный regex-match

```typescript
// ❌ hasText: 'Ubuntu' — матчит и "Ubuntu" и "WordPress on Ubuntu" → strict mode violation
.filter({ hasText: 'Ubuntu' })

// ✓ Точное совпадение по .configure-server__type_title через ^name$
.filter({
  has: page.locator(".configure-server__type_title", {
    hasText: new RegExp(`^${name}$`),
  }),
})
```

---

## 7. VirtFusion Gotchas — критически важно

Подробнее в `TEST_GUIDELINES.md` §7. Краткая выжимка:

### 7.1 Статус сервера — ВЕРХНИЙ РЕГИСТР
`"RUNNING"`, `"STOPPED"` — всегда через `getStatusText()` из `VpsPanelServerPage`

### 7.2 Кнопки питания — нет data-action атрибутов
```typescript
button:has-text("Boot"):not([data-bs-dismiss="modal"])
```

### 7.3 Bootstrap модалы — всегда в DOM
Scope на `.modal.show` для confirm-кнопок:
```typescript
.modal.show button.btn-primary:has-text("Shutdown")
```

### 7.4 Activity table debug-строки — id на `<td>`, не `<tr>`
```typescript
"table.table.table-normal tbody tr:not(:has(td[id^='debug']))"
```

### 7.5 Radio-tile кнопки — только dispatchEvent
```typescript
await this.hddRadio.dispatchEvent("click");
await expect(this.hddRadio).toBeChecked({ timeout: 5_000 });
```

---

## 8. Паттерн panel-тестов (VirtFusion)

```typescript
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../../../pages/VpsPanelServerPage";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_UUID } from "../../../utils/auth";

test.use({ viewport: { width: 1440, height: 900 } });
test.describe.configure({ mode: "serial" }); // обязателен для stateful VirtFusion тестов

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

---

## 9. Пуш изменений в GitHub (из Replit)

`git push` напрямую заблокирован. Использовать GitHub API через `curl`:

```bash
# 1. Получить текущий SHA файла
SHA=$(curl -s -H "Authorization: token $GITHUB_SSH_KEY" \
  "https://api.github.com/repos/rhetalo/e2e_godlike/contents/PATH/TO/FILE.ts" | jq -r '.sha')

# 2. Закодировать файл и запушить
CONTENT=$(base64 -w 0 /tmp/e2e_godlike/PATH/TO/FILE.ts)
curl -s -X PUT \
  -H "Authorization: token $GITHUB_SSH_KEY" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/rhetalo/e2e_godlike/contents/PATH/TO/FILE.ts" \
  -d "{\"message\":\"commit message\",\"content\":\"$CONTENT\",\"sha\":\"$SHA\"}" \
  | jq '{commit: .commit.sha}'
```

> Рабочая копия для редактирования — клонировать в `/tmp/e2e_godlike/` (не в workspace — там git подхватывает внешний .git Replit).

---

## 10. Что делать дальше

| Приоритет | Задача |
|-----------|--------|
| 🔴 High | `vps/panel/vps.panel.network.spec.ts` — написать тесты вкладки Network |
| 🔴 High | `vps/panel/vps.panel.options.spec.ts` — написать тесты вкладки Options |
| 🟡 Med | `vps/panel/vps.panel.storage.spec.ts` — ревью и починка |
| 🟡 Med | `vps/panel/vps.panel.rebuild.spec.ts` — ревью (осторожно: rebuild стирает данные!) |
| 🟢 Low | `funnels/` — ревью существующих воронок |
| 🟢 Low | Оптимизация `vps.funnel.spec.ts` — serial mode + shared page для SUITE 2 и 3 |

---

## 11. Правила для нового агента

1. **Пуш только через GitHub API** — секрет `GITHUB_SSH_KEY` в Replit, это PAT-токен
2. **Клонировать в `/tmp/`** — не в `/home/runner/workspace/` (конфликт с внешним git)
3. **Читать TEST_GUIDELINES.md** перед написанием любого теста
4. **Для VirtFusion** — смотри §7 этого документа и §7 TEST_GUIDELINES.md
5. **Не кликать** `Continue` / `Place Order` на платёжных страницах — реальный платёж
6. **Не делать Rebuild** без явного разрешения пользователя
7. **Serial mode** для всех VirtFusion panel тестов (один сервер, меняющееся состояние)
8. **Запускай с `--headed`** при отладке — помогает видеть что происходит в браузере
9. **После каждой правки** — обновляй AGENT_HANDOFF3.md (эта секция) и TEST_GUIDELINES.md
