# AGENT HANDOFF — godlike.host Playwright E2E Suite

> **Последнее обновление:** Май 2026
> **Стек:** TypeScript · Playwright · Chromium
> **Репо:** https://github.com/rhetalo/e2e_godlike

---

## 0. Порядок чтения

1. `AGENT_HANDOFF.md` (этот файл) — контекст, структура, правила
2. `TEST_GUIDELINES.md` — как писать тесты (читать перед любым изменением теста)
3. `CODE_REVIEW.md` — текущее состояние всех файлов

---

## 1. Git — пуш изменений

Репо клонируется стандартно. Пуш через `git push` работает с токеном:

```bash
git remote set-url origin https://<USERNAME>:<TOKEN>@github.com/rhetalo/e2e_godlike.git
git add <файл>
git commit -m "тип(scope): описание"
git push origin main
```

---

## 2. Структура проекта

```
e2e_godlike/
├── tests/
│   ├── vps/
│   │   ├── panel/               ← VirtFusion VPS панель (vf-panel.godlike.host)
│   │   │   ├── vps.panel.login.spec.ts           ✅ ревью (май 2026)
│   │   │   ├── vps.panel.power.actions.spec.ts   ✅ 3/3 passed — не трогать
│   │   │   ├── vps.panel.media.spec.ts           ✅ 3/3 passed — не трогать
│   │   │   ├── vps.panel.rebuild.spec.ts         ✅ фикс селектора (май 2026)
│   │   │   ├── vps.panel.server.spec.ts          ✅ рефакторинг (май 2026)
│   │   │   ├── vps.panel.storage.spec.ts         ✅ рефакторинг (май 2026)
│   │   │   ├── vps.panel.network.spec.ts         ✅ переписан (май 2026)
│   │   │   ├── vps.panel.options.spec.ts         ✅ рефакторинг (май 2026)
│   │   │   └── vps.build.spec.ts                ⚠️  не ревьюировался, T2.6 опасен
│   │   └── funnel/
│   │       └── vps.funnel.spec.ts                ✅ 23/23 passed — не трогать
│   ├── funnels/                 ← Воронки покупки (не ревьюировались)
│   ├── modded/                  ← Modded/seed/слайдеры (не ревьюировались)
│   └── general/                 ← Smoke, ссылки, логин, регистрация
│
├── pages/
│   ├── VpsPanelServerPage.ts    ✅ КЛЮЧЕВОЙ — эталон, не менять без причины
│   ├── VpsPanelMediaPage.ts     ✅
│   ├── VpsPanelRebuildPage.ts   ✅
│   ├── VpsPanelNetworkPage.ts   ✅
│   ├── VpsPanelOptionsPage.ts   ✅
│   ├── VpsPanelStoragePage.ts   ✅
│   ├── VpsPanelLoginPage.ts     ✅
│   ├── VpsPanelDashboardPage.ts ✅
│   ├── VpsPanelServerDetailPage.ts  ⚠️  старый PO, используется только в vps.build.spec.ts
│   ├── VpsPanelServersListPage.ts   ⚠️  старый PO, используется только в vps.build.spec.ts
│   └── (CartPage, CheckoutPage, ModdedHostingPage, SeedPage и др.)
│
├── components/                  ← Shared UI-компоненты
│   └── CookieBanner.ts          ← управление баннерами (используй везде)
│
├── utils/
│   ├── auth.ts                  ← PANEL_URL, TEST_SERVER_UUID, loginAndSaveSession()
│   ├── bannerHandlers.ts        ← setupBannerHandlers() — автозакрытие баннеров
│   ├── helpers.ts               ← dismissPromoBannerIfAny, parsePrice и др.
│   ├── selectors.ts             ← централизованные CSS-селекторы
│   ├── credentials.ts           ← generateCredentials, saveCredentials (CSV) — нужен для registration-flow.spec.ts
│   └── iframe-helper.ts
│
├── fixtures/
│   ├── test-data.ts             ← BASE_URL, Credentials, Urls, QuickPickModpacks
│   └── games.json
│
├── agents.docs/
│   ├── AGENT_HANDOFF.md         ← этот файл
│   ├── TEST_GUIDELINES.md       ← правила написания тестов
│   └── CODE_REVIEW.md           ← состояние всех файлов
│
├── playwright.config.ts         ✅ почищен (май 2026)
├── package.json
└── tsconfig.json
```

---

## 3. Критические константы

```typescript
// utils/auth.ts
PANEL_URL          = "https://vf-panel.godlike.host"
TEST_SERVER_UUID   = "c13d2e04-2544-41fc-afff-9ae5c49aca93"  // srv-433986
TEST_SERVER_NAME   = "srv-433986"
STORAGE_STATE_PATH = "storageState.panel.json"  // для panel-тестов

// fixtures/test-data.ts
BASE_URL  = "https://godlike.host"
EMAIL     = "test@testmail.com"
PASSWORD  = "test@testmail.com"
```

> ⚠️ `storageState.panel.json` (панель) и `storageState.vps.json` (воронка) — разные домены, разные сессии. Не путай.

---

## 4. Команды запуска

```bash
npm install  # один раз

npx playwright test tests/vps/panel/     --project=chromium --headed
npx playwright test tests/vps/funnel/    --project=chromium
npx playwright test tests/funnels/       --project=chromium
npx playwright test tests/modded/        --project=chromium
npx playwright test tests/general/       --project=chromium

npx playwright test --grep "@smoke"      --project=chromium
npx playwright test --grep "@critical"   --project=chromium

npx playwright show-report
```

---

## 5. Состояние работ

### ✅ Сделано (май 2026)

| Файл / задача | Что сделано |
|---|---|
| `vps.panel.rebuild.spec.ts` | Фикс: `button[data-bs-target="#reinstallServerModal"]` вместо `has-text("Rebuild")` — 23 теста скипались из-за скрытых Bootstrap модалов |
| `vps.panel.server.spec.ts` | Удалён Suite 3 (дубль power.actions), Tab Navigation → `activeTab.toContainText()`, очищен Suite 5 |
| `vps.panel.network.spec.ts` | Полностью переписан: убраны все тесты без `expect()`, добавлены жёсткие ассерты |
| `vps.panel.options.spec.ts` | Убраны дубли VNC-тестов, `return` → `test.skip()` в Protect Server |
| `vps.panel.storage.spec.ts` | `hasStorageContent()` (body regex) → `toBeVisible()` на конкретные локаторы |
| `vps.panel.login.spec.ts` | Убраны 3 тривиальных теста из Suite 1 (browser behavior) |
| `fixtures/users.ts` | Удалён — нигде не импортировался |
| `utils/slider-helpers.ts` | Удалён — нигде не импортировался (все слайдер-тесты имеют inline-хелперы) |
| `playwright.config.ts` | Почищены ~130 строк tutorial-комментариев |
| `tests/general/valid.links.spec.ts` | Почищены избыточные комментарии и section dividers, таймаут 1ч → 10мин |

### ⚠️ Отложено / требует решения

| Задача | Приоритет | Детали |
|---|---|---|
| `vps.build.spec.ts` — T2.6 | 🔴 High | Реально запускает rebuild сервера. Обсудить с владельцем |
| `VpsPanelServerDetailPage.ts` + `VpsPanelServersListPage.ts` | 🟡 Med | Старые PO, висят на vps.build.spec.ts. Удалить вместе с ним или мигрировать |
| Ревью `funnels/`, `modded/`, `general/` | 🟡 Med | Не ревьюировались на антипаттерны |
| Теги `@smoke/@critical/@regression` | 🟡 Med | Большинство тестов без тегов |

---

## 6. VirtFusion Gotchas

| Проблема | Правильное решение |
|---|---|
| Статус "RUNNING"/"running" вместо "Running" | Только через `getStatusText()` из `VpsPanelServerPage` |
| Bootstrap модалы всегда в DOM | Scope на `.modal.show`; для кнопок используй `data-bs-target` |
| Boot button всегда в DOM | Проверять `isEnabled()`, не `isVisible()` |
| CSS-скрытые radio/checkbox | `radio.check({ force: true })` |
| OS card selection (Rebuild) | Класс `.selected-card`, не `card-inverted-big-border-os` |
| Activity table debug-строки | `tr:not(:has(td[id^='debug']))` |
| `button:has-text("Shutdown")` попадает в модал | Scope через `activeModal` или `:not([data-bs-dismiss="modal"])` |

---

## 7. Шаблон panel-теста

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
});

test.afterAll(async () => { await sharedContext.close(); });

test("@critical описание теста", async () => {
  await serverPage.goto();
  await test.step("шаг", async () => { /* ... */ });
});
```

> ❌ `if (!condition) return` — тест зелёный, хотя пропущен
> ✅ `test.skip(!condition, "причина")` — тест оранжевый (skipped)

---

## 8. Правила для агента

1. Читай `TEST_GUIDELINES.md` перед написанием или изменением теста
2. Не нажимать "Continue" / "Place Order" на платёжных страницах — реальный платёж
3. Не делать Rebuild без явного разрешения владельца — стирает ОС сервера
4. Serial mode для всех VirtFusion panel тестов
5. После каждой правки обновлять `AGENT_HANDOFF.md` и `CODE_REVIEW.md`
6. `storageState.panel.json` ≠ `storageState.vps.json` — разные домены
