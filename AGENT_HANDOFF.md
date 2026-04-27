# Playwright E2E — godlike.host | Agent Handoff

## Что это за проект

Автотесты Playwright для сайта [godlike.host](https://godlike.host) — хостинг игровых серверов (Minecraft, Rust, CS2 и др.).

Тестируются:

- Воронка покупки (landing → тариф → корзина → billing → location → checkout)
- Мобильная воронка (`/mobile-cart/`)
- Промокоды для всех игр
- Оплата (Stripe card, PayPal)
- Регистрация/логин

---

## Структура проекта

```
godlike-test_ex/
  tests/
    funnel.cart.chech.spec.ts     — воронка + Stripe card проверка
    funnel.paypal.chech.spec.ts   — воронка + PayPal redirect
    funnel.steps.spec.ts          — шаги воронки: billing cycle + location
    funnel.mobile.spec.ts         — мобильная воронка /mobile-cart/
    funnel.login.spec.ts          — логин тесты
    funnel.w.chechout.spec.ts     — checkout тест
    registration-flow.spec.ts     — регистрация
    valid.promo.spec.ts           — промокоды для всех игр из fixtures/games.json
  pages/
    MobileCartPage.ts             — Page Object для /mobile-cart/
    CartBillingPage.ts            — Page Object для шага billing в корзине
    CartAuthPage.ts               — Page Object для auth шага
    CheckoutPage.ts               — Page Object для WHMCS checkout
  components/
    CreditBalanceSelector.ts      — iCheck-радио "Do not apply credit"
    PaymentMethodSelector.ts      — iCheck-радио выбора метода оплаты
    BillingCycleSelector.ts       — выбор периода 1/3/6/12 месяцев
    OrderSummary.ts               — блок "YOUR ORDER" на шаге billing
  utils/
    selectors.ts                  — все CSS-селекторы проекта
    iframe-helper.ts              — хелперы для Stripe iframes
    credentials.ts                — генерация и сохранение тестовых аккаунтов в CSV
  fixtures/
    games.json                    — список игр для promo-тестов
  playwright.config.ts
```

---

## Ключевые архитектурные решения

### 1. Паттерн авторизации (ОБЯЗАТЕЛЬНО сохранять)

Пользователь предпочитает **explicit beforeAll**, НЕ auth-fixture подход:

```typescript
const storageStatePath = "storageState.json";

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/clientarea/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.fill("#inputEmail", EMAIL);
  await page.fill("#inputPassword", PASSWORD);
  await Promise.all([
    page.waitForURL("**/clientarea/clientarea.php", { timeout: 60000 }),
    page.click("#login"),
  ]);
  await page.context().storageState({ path: storageStatePath });
  await page.close();
});

// В каждом тесте — свой context из storageState
test("тест", async ({ browser }) => {
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();
  // ... тест ...
  await context.close();
});
```

Каждый `storageState`-файл именуется по назначению:

- `storageState.json` — для promo-тестов
- `storageState.funnel.json` — для funnel step тестов
- `storageState.mobile.json` — для мобильной воронки

### 2. Паттерн масштабирования тестов (valid.promo.spec.ts)

Для тестирования ВСЕХ игр используется loop из JSON-фикстуры:

```typescript
import gamesData from "../fixtures/games.json";
const gamesToTest: string[] = gamesData.games;

for (const gameName of gamesToTest) {
  test(`Validate promocode for: ${gameName}`, async ({ browser }) => {
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    // ... логика теста для одной игры
  });
}
```

Этот же паттерн применять для любых тестов "для всех игр".

### 3. Page Objects — использование без фикстур

```typescript
import { CartBillingPage } from "../pages/CartBillingPage";
import { CreditBalanceSelector } from "../components/CreditBalanceSelector";
import { PaymentMethodSelector } from "../components/PaymentMethodSelector";

// Просто инстанцируем напрямую
const cartBilling = new CartBillingPage(page);
const credit = new CreditBalanceSelector(page);
const payment = new PaymentMethodSelector(page);
```

---

## Критические знания о сайте

### Технический стек

- **WordPress SSR** — публичные страницы (landing, game pages)
- **Vue.js 3 SPA** — корзина (`/cart/`), мобильная корзина (`/mobile-cart/`)
- **WHMCS** — billing (`/clientarea/cart.php?a=checkout`)
- **Stripe Elements** — iframes для ввода карты
- **PayPal JS SDK** — iframe кнопки
- **iCheck library** — стилизует radio buttons через `<ins>` элементы

### iCheck radio buttons (checkout)

WHMCS использует iCheck, который заменяет `<input type="radio">` стилизованными `<ins>`. Кликать нужно через `.locator('ins')`:

```typescript
// Credit balance (skip/apply)
page.locator("label:has(#skipCreditOnCheckout)").locator("ins").click();
page.locator("label:has(#useCreditOnCheckout)").locator("ins").click();

// Payment methods — value атрибуты:
// stripe (не godlikestripe!), paypal_ppcpv, coinpayments
page
  .locator('label:has(input[name="paymentmethod"][value="stripe"])')
  .locator("ins")
  .click();
page
  .locator('label:has(input[name="paymentmethod"][value="paypal_ppcpv"])')
  .locator("ins")
  .click();
```

### Stripe iframes — правильные title (английский)

```typescript
page.frameLocator('iframe[title="Secure card number input frame"]');
page.frameLocator('iframe[title="Secure expiration date input frame"]');
page.frameLocator('iframe[title="Secure CVC input frame"]');
```

Русские title НЕ работают. English only.

### PayPal iframe

```typescript
page.frameLocator('iframe[title*="PayPal"]');
```

### WHMCS checkout задержка

Страница `cart.php?a=checkout` загружает PayPal SDK и Stripe асинхронно. `load` event может задержаться на 30+ секунд. Использовать:

```typescript
await page.waitForURL(/clientarea\/cart\.php/, {
  timeout: 30_000,
  waitUntil: "domcontentloaded", // НЕ 'load'
});
```

### Обязательный порядок на checkout

ВСЕГДА перед выбором метода оплаты вызывать skipCredit():

```typescript
await credit.skipCredit(); // сначала
await payment.selectStripe(); // потом
```

Иначе блок с платёжными методами скрыт.

---

## Паттерны работы с ценами (мультивалютность)

Сайт показывает цены в разных валютах ($, €, £, ₴, zł) в зависимости от локали пользователя. Никогда не хардкодить `$`:

```typescript
// Извлечь число из строки цены
function parsePrice(priceStr: string): number {
  const match = priceStr.match(/[\d]+\.[\d]+/);
  return match ? parseFloat(match[0]) : NaN;
}

// Проверить что цена нулевая
function isZeroPrice(priceStr: string): boolean {
  return /0\.00/.test(priceStr);
}

// Проверить что цена ненулевая и валидная
function isValidNonZeroPrice(priceStr: string): boolean {
  return /[^\d]*\d+\.\d{2}/.test(priceStr) && !isZeroPrice(priceStr);
}
```

---

## Debugging workflow (эталонный подход)

Когда селектор не работает — сначала диагностика, потом правка:

```typescript
test("DEBUG page", async ({ page }) => {
  // ... навигация до нужного шага ...

  // Дамп всех элементов с нужным классом
  const els = await page.locator("[class*='нужный-класс']").all();
  for (const el of els) {
    const cls = await el.getAttribute("class");
    const tag = await el.evaluate((e) => e.tagName.toLowerCase());
    const txt = (await el.innerText().catch(() => "")).trim().substring(0, 80);
    const visible = await el.isVisible();
    console.log(`<${tag}> class="${cls}" visible=${visible} text="${txt}"`);
  }

  // Дамп всех input определённого типа
  const inputs = await page.locator("input[type='radio']").all();
  for (const inp of inputs) {
    const id = await inp.getAttribute("id");
    const name = await inp.getAttribute("name");
    const val = await inp.getAttribute("value");
    console.log(`id="${id}" name="${name}" value="${val}"`);
  }

  // Скриншот для визуального анализа
  await page.screenshot({ path: "debug.png", fullPage: true });
});
```

Запуск: `npx playwright test tests/debug.spec.ts --project=chromium`

---

## Известные особенности Vue SPA в корзине

### /cart/ — шаги

1. **Auth step** — форма входа/регистрации (пропускается при авторизованной сессии)
2. **Billing step** — выбор периода 1/3/6/12 месяцев + промокод
3. **Location step** — выбор континента и страны
4. После "Next step" → WHMCS checkout

### /mobile-cart/?is_cart_opened=true — структура

- Game chips: `.game-chip` (быстрый выбор, загружаются асинхронно — ждать first().toBeVisible())
- RAM dropdown: `.custom-select` в секции `.cart-page__section` с текстом "RAM (Plan)"
- Billing dropdown: `.custom-select` в секции с текстом "Billing Period"
- Location dropdown: `.custom-select` в секции с текстом "Location"
- Price: `.cart__pricing-price` (0 пока не выбрана игра + план)
- Promo toggle: `.cart__promocode-button`

### Location step — continent dropdown

```typescript
// Открытие dropdown (учитывает текущее состояние)
async function openContinentDropdown(page: Page): Promise<void> {
  const toggle = page.locator(".location-group__select").first();
  await toggle.scrollIntoViewIfNeeded();

  const isOpen = await toggle.evaluate((el) =>
    el.classList.contains("location-group__select-selected"),
  );

  if (!isOpen) {
    await toggle.click(); // обычный click, НЕ force и НЕ page.evaluate
    await page.waitForTimeout(400);
  }

  await page
    .locator(".location-group__options")
    .waitFor({ state: "visible", timeout: 10000 });
}
// Континенты: "Europe", "North America", "Asia"
// Клик по опции: page.locator(".location-group__option").filter({ hasText: "North America" }).click()
```

---

## Анализ: что есть лишнее / чего не хватает

### Есть в `godlike-e2e/` (эталон), но НЕТ в `godlike-test_ex/` → перенести:

| Файл                                 | Назначение                              |
| ------------------------------------ | --------------------------------------- |
| `pages/LandingPage.ts`               | Главная страница + StorefrontTariffCard |
| `pages/MinecraftJavaPage.ts`         | Minecraft-specific storefront           |
| `pages/GameServersPage.ts`           | Страница /game-servers-en/              |
| `components/Header.ts`               | Навигационная шапка                     |
| `components/Footer.ts`               | Футер                                   |
| `components/StorefrontTariffCard.ts` | Карточка тарифа (Add to Cart)           |
| `components/PromoCodeInput.ts`       | Поле промокода                          |
| `components/StripeCardFields.ts`     | Stripe card input helpers               |
| `utils/url-builder.ts`               | Построение URL корзины                  |

### Есть в `godlike-test_ex/`, НЕТ в `godlike-e2e/` → твои уникальные, не трогать:

- `utils/credentials.ts` — генерация тестовых аккаунтов в CSV
- `fixtures/games.json` — список игр для promo loop

### Критический баг в эталоне (исправлен):

- `selectors.ts` → `stripeRadio`: было `value="godlikestripe"`, должно быть `value="stripe"`

---

## VPS Funnel — новые файлы

### Файлы созданы:

- `pages/VpsPage.ts` — VPS landing page (`/vps-hosting/`), кнопка "Deploy Now"
- `pages/VpsConfigPage.ts` — "Configure your server" для VPS (OS, Location, Addons)
- `tests/vps.debug.spec.ts` — диагностика DOM (запускать ПЕРВЫМ)
- `tests/vps.funnel.spec.ts` — happy path VPS воронки

### Порядок запуска VPS тестов:

```powershell
# 1. Сначала диагностика — соберёт реальные классы и скриншоты
npx playwright test tests/vps.debug.spec.ts --project=chromium --headed

# 2. Проверь скриншоты debug-vps-landing.png, debug-vps-configure.png
#    Если OS-блок имеет другой класс — обнови VpsConfigPage.ts и selectors.ts VPS.osItem

# 3. Запусти happy path
npx playwright test tests/vps.funnel.spec.ts --project=chromium
```

### Подтверждённые VPS-селекторы (debug 17-Apr-2026):

| Элемент           | Селектор                             | Примечание                   |
| ----------------- | ------------------------------------ | ---------------------------- |
| Deploy Now кнопка | `a.deploy-btn`                       | `<a>` ссылка, не `<button>`  |
| Plan карточка     | `.vps-vds-dedi__plans-item`          | Не `.storefront__tariff`     |
| Cart URL          | `/cart-vps/`                         | Не `/cart/`                  |
| Цена со скидкой   | `.period__price-primary_amount`      |                              |
| Полная цена       | `.period__price-secondary`           |                              |
| Скидка badge      | `.period__discount`                  | VPS20 прomo авто-применяется |
| Итого в order     | `.order__pricing-price`              |                              |
| Локации контейнер | `.configure-server__locations`       |                              |
| Локация item      | `.configure-server__location`        |                              |
| Активная локация  | `.configure-server__location-active` |                              |

### Особенности VPS воронки:

- **Нет continental dropdown** — только 2 датацентра: USA / Europe
- **Promo VPS20** — автоматически применяется из URL-параметра (скидка 20%+)
- **step=3** — configure step идёт сразу после billing (пропускает шаги)
- **OS selection** — в debug не найден на step=3; возможно зависит от плана

---

## Что ещё нужно сделать (бэклог)

- [ ] Тесты на checkout для всех игр (по паттерну valid.promo.spec.ts)
- [ ] Тест на регистрацию нового аккаунта через воронку
- [ ] Тест на PayPal — проверка redirect (нужна реальная PayPal sandbox)
- [ ] Тест на Stripe — заполнение номера карты (работает через frameLocator)
- [ ] Тест на выбор тарифа для Rust через мобильную воронку
- [ ] Тест на скидку первого заказа (first purchase discount badge)
- [ ] Тест на поле "Choose server type" (Paper / Purpur / Spigot) на location step

---

## Как начать работу с проектом

```powershell
# Установка
npm install
npx playwright install chromium

# Запуск всех тестов
npx playwright test --project=chromium

# Запуск конкретного файла
npx playwright test tests/funnel.steps.spec.ts --project=chromium

# Запуск с визуальным браузером (для отладки)
npx playwright test tests/funnel.steps.spec.ts --project=chromium --headed

# Просмотр HTML-отчёта
npx playwright show-report
```

---

## Учётные данные (тестовый аккаунт)

```
Email:    test@testmail.com
Password: test@testmail.com
Login URL: https://godlike.host/clientarea/login
```
Playwright E2E — VPS Management Panel | Agent Handoff
Цель
Автотесты Playwright (TypeScript) для панели управления VPS: https://vf-panel.godlike.host — VirtFusion control panel.

3 сценария:

Install — установка VPS (Media tab → Rebuild/Install → Continue/Install Now)
Build — сборка окружения (Rebuild с выбором OS)
Delete — удаление сервера (из списка /servers)
Тестовый аккаунт
Параметр	Значение
Email	test@testmail.com
Password	Password_123
Server name	srv-430464
Server UUID	9c49ed96-56f4-41c8-bc5f-a8d44c21a486
Server URL	https://vf-panel.godlike.host/server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486
Структура
tests/VPS/
  tests/
    vps.panel.debug.spec.ts   — DOM-диагностика (запускать первым)
    vps.install.spec.ts       — Сценарий 1: Install
    vps.build.spec.ts         — Сценарий 2: Build
    vps.delete.spec.ts        — Сценарий 3: Delete
  pages/
    ServersListPage.ts        — /servers (список серверов)
    ServerDetailPage.ts       — /server/{UUID} (управление сервером)
  utils/
    auth.ts                   — логин, константы, TEST_SERVER_UUID
    selectors.ts              — все CSS-селекторы
  playwright.config.ts
  package.json
  storageState.panel.json     — (генерируется автоматически)

Подтверждённые данные (извлечены из живого сайта)
Навигация
Факт	Источник
После логина → /dashboard	Живой AJAX-ответ {"url":"/dashboard"}
URL деталей сервера	/server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486 — работает в браузере
После "Manage" клика	URL меняется на /server/{UUID}
Список серверов	/servers (Vue component <client-servers>)
Вкладки (vlang 71–77 из :vlang пропа на live странице)
"Overview"  "Media"  "Options"  "Network"  "Storage"  "Backups"  "Sharing"

Media tab — кнопки и тексты
vlang #	Текст	Использование
196	"Rebuild"	Кнопка на Media tab (при установленной OS)
173	"Install"	Кнопка (fresh install)
118	"Are you sure you want to rebuild this server?"	Заголовок модала
119	"Continue"	Кнопка подтверждения rebuild
128–129	"Are you sure you want to install X on this server?"	Install confirm
130	"Install Now"	Кнопка подтверждения install
140	"Cancel Rebuild"	Кнопка отмены
136	"Server Setup..."	Статус во время сборки
149	"Operating System"	Заголовок секции шаблонов
Состояния сервера (vlang 78–80)
"Stopped"  "Running"  "Paused"

Delete modal (из /servers list)
Текст	Источник
"Delete Server"	vlang в /servers JS chunk
"Are you sure you want to delete this server?"	vlang в /servers JS chunk
"Cancel"	vlang в /servers JS chunk
"Server deleted successfully."	vlang в /servers JS chunk
"Server could not be deleted."	vlang в /servers JS chunk
Delete location — ВАЖНО
НЕВЕРНО: кнопка в Options вкладке сервера
ВЕРНО:   кнопка "Delete" на строке в СПИСКЕ серверов (/servers)

Запуск
cd tests/VPS
npm install
npx playwright install chromium
# 1. Диагностика DOM (скриншоты + реальные классы)
npx playwright test tests/vps.panel.debug.spec.ts --project=chromium --headed
# 2. Install тесты
npx playwright test tests/vps.install.spec.ts --project=chromium --headed
# 3. Build тесты
npx playwright test tests/vps.build.spec.ts --project=chromium --headed
# 4. Delete тесты (без реального удаления)
npx playwright test tests/vps.delete.spec.ts --project=chromium --headed
# 5. Реальное удаление (ДЕСТРУКТИВНО!)
ENABLE_DELETE_TEST=true npx playwright test tests/vps.delete.spec.ts --project=chromium
# Все тесты сразу
npx playwright test --project=chromium

Архитектура
Авторизация — storageState pattern
test.beforeAll(async ({ browser }) => {
  await loginAndSaveSession(browser); // логин один раз
});
test("тест", async ({ browser }) => {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  // ...
  await context.close();
});

Text-based selectors (стабильны к хешированным CSS классам)
// Всегда так — тексты из vlang не меняются между деплоями
'button:has-text("Rebuild")'
'button:has-text("Continue")'
':has-text("Are you sure you want to rebuild this server?")'

Прямая URL навигация на сервер
// Работает в Playwright с сессионными куки
await page.goto('https://vf-panel.godlike.host/server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486');
// (Моя ранняя ошибка: проверял через Node.js HTTPS без куки — получал редирект)

Guard для деструктивного теста
ENABLE_DELETE_TEST=true npx playwright test tests/vps.delete.spec.ts

Покрытие (Acceptance Criteria)
ID	Тест	Сценарий
T1.1	Список серверов содержит srv-430464	Install
T1.2	Страница /server/{UUID} открывается напрямую	Install
T1.3	"Manage" ведёт на /server/{UUID}	Install
T1.4	Media tab содержит OS шаблоны	Install
T1.5	"Rebuild"/"Install" кнопка видна	Install
T1.6	OS → Rebuild → Continue → сборка	Install
T2.1	Список серверов после логина	Build
T2.2	Все 6 вкладок: Overview, Media, Options…	Build
T2.3	OS шаблоны непустые	Build
T2.4	Шаблоны кликабельны	Build
T2.5	Rebuild → модал с "Continue"	Build
T2.6	OS → Rebuild → Continue → Building	Build
T3.1	"Delete" на строке в /servers	Delete
T3.2	Модал с заголовком "Delete Server"	Delete
T3.3	"Are you sure you want to delete this server?"	Delete
T3.4	"Cancel" закрывает модал без удаления	Delete
T3.5	Кнопка подтверждения в модале	Delete
T3.6	Confirm → "Server deleted successfully."	Delet