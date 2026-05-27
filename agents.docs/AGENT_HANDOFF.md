# AGENT HANDOFF — godlike.host Playwright E2E Suite

> **Дата последнего обновления:** Май 2026 (ревью и рефакторинг)
> **Стек:** TypeScript · Playwright · Chromium
> **Репо:** https://github.com/rhetalo/e2e_godlike

---

## 0. Как читать этот документ

Этот файл — **живой онбординг-документ** для любого агента или разработчика, который продолжает работу над проектом. Читай его целиком перед любыми изменениями. После внесения изменений — обязательно обновляй этот файл.

**Порядок чтения:**
1. `AGENT_HANDOFF.md` (этот файл) — контекст, состояние, правила работы
2. `TEST_GUIDELINES.md` — как писать тесты (обязательно перед написанием любого теста)
3. `CODE_REVIEW.md` — итоги полного ревью кодовой базы (май 2026)

---

## 1. Секреты и доступы

| Переменная | Что это | Где используется |
|---|---|---|
| `GITHUB_TOKEN` | GitHub PAT (Personal Access Token) | Клонирование репо, GitHub API |
| `GITHUB_SSH_KEY` | Тот же PAT (исторический алиас) | Скрипты пуша через GitHub API |

> ⚠️ Оба секрета хранятся в Replit Secrets и указывают на один токен. `GITHUB_SSH_KEY` — исторически сложившееся имя из предыдущей работы, `GITHUB_TOKEN` — добавлен позже для стандартизации. Используй любой из них.

---

## 2. Пуш изменений в GitHub из Replit

`git push` напрямую **заблокирован** в Replit. Используй GitHub API через `curl`.

### Рабочий флоу:

```bash
# 1. Работать с файлами в /home/runner/workspace/e2e_godlike/
# (репо уже клонирован, НЕ клонируй повторно)

# 2. После редактирования файла — получить текущий SHA
FILE_PATH="agents.docs/AGENT_HANDOFF.md"  # путь относительно корня репо
SHA=$(curl -s \
  -H "Authorization: token $GITHUB_SSH_KEY" \
  "https://api.github.com/repos/rhetalo/e2e_godlike/contents/${FILE_PATH}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")

# 3. Закодировать файл и запушить
CONTENT=$(base64 -w 0 "/home/runner/workspace/e2e_godlike/${FILE_PATH}")
curl -s -X PUT \
  -H "Authorization: token $GITHUB_SSH_KEY" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/rhetalo/e2e_godlike/contents/${FILE_PATH}" \
  -d "{\"message\":\"docs: update AGENT_HANDOFF\",\"content\":\"${CONTENT}\",\"sha\":\"${SHA}\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK:', d.get('commit',{}).get('sha','ERROR'))"
```

> Если файл **новый** (не существует в репо) — пропусти шаг получения SHA, просто не передавай поле `sha` в JSON.

---

## 3. Структура проекта

```
e2e_godlike/
├── tests/
│   ├── vps/
│   │   ├── panel/               ← VirtFusion VPS панель (vf-panel.godlike.host)
│   │   │   ├── vps.panel.login.spec.ts           — логин в панель
│   │   │   ├── vps.panel.power.actions.spec.ts   ✅ 3/3 passed
│   │   │   ├── vps.panel.power.spec.ts           — power controls (старый, требует ревью)
│   │   │   ├── vps.panel.media.spec.ts            ✅ 3/3 passed
│   │   │   ├── vps.panel.network.spec.ts          ✅ написан (май 2026)
│   │   │   ├── vps.panel.options.spec.ts          ✅ написан (май 2026)
│   │   │   ├── vps.panel.rebuild.spec.ts          ✅ переработан (май 2026)
│   │   │   ├── vps.panel.server.spec.ts           ⚠️ есть антипаттерны — см. CODE_REVIEW.md
│   │   │   ├── vps.panel.storage.spec.ts          ⚠️ есть антипаттерны — см. CODE_REVIEW.md
│   │   │   └── vps.build.spec.ts                 — не ревьюился
│   │   └── funnel/
│   │       └── vps.funnel.spec.ts                ✅ 23/23 passed
│   ├── funnels/                 ← Воронки покупки (Minecraft, seed, mobile, PayPal)
│   │   ├── funnel.cart.check.spec.ts
│   │   ├── funnel.mobile.spec.ts
│   │   ├── funnel.paypal.redirect.spec.ts
│   │   ├── funnel.seed.spec.ts
│   │   ├── funnel.spec.ts
│   │   └── funnel.with.credit.check.spec.ts
│   ├── modded/                  ← Modded/seed серверы, игровые промо, слайдеры
│   └── general/                 ← Smoke, валидация, регистрация, ссылки
│
├── pages/                       ← Page Object Model
│   ├── VpsPanelServerPage.ts    ✅ КЛЮЧЕВОЙ — Overview + power + activity table
│   ├── VpsPanelMediaPage.ts     ✅ Boot Order, CD/DVD switch
│   ├── VpsPanelRebuildPage.ts   ✅ обновлён (май 2026)
│   ├── VpsPanelNetworkPage.ts   ✅ написан с нуля (май 2026)
│   ├── VpsPanelOptionsPage.ts   ✅ написан с нуля (май 2026)
│   ├── VpsPanelStoragePage.ts   ✅ написан (май 2026)
│   ├── VpsConfigPage.ts         ✅ OS-selection, точная фильтрация
│   ├── VpsPage.ts               — Landing /vps-hosting/
│   ├── CartBillingPage.ts       — Billing cycle step /cart-vps/
│   ├── VpsPanelLoginPage.ts
│   ├── VpsPanelDashboardPage.ts
│   ├── VpsPanelServersListPage.ts
│   ├── VpsPanelServerDetailPage.ts
│   ├── CartPage.ts
│   ├── CheckoutPage.ts
│   ├── ModdedHostingPage.ts
│   ├── SeedPage.ts
│   └── MobileCartPage.ts
│
├── components/                  ← Shared UI-компоненты (переиспользуемые блоки)
│   ├── CookieBanner.ts          ← управление баннерами/модалами
│   ├── AuthBlock.ts
│   ├── BillingCycleSelector.ts
│   ├── OrderSummary.ts
│   └── ...
│
├── utils/
│   ├── auth.ts                  ← PANEL_URL, TEST_SERVER_UUID, loginAndSaveSession()
│   ├── bannerHandlers.ts        ← setupBannerHandlers() — автозакрытие баннеров
│   ├── helpers.ts               ← dismissPromoBannerIfAny, parsePrice и др.
│   ├── selectors.ts             ← централизованные CSS-селекторы по зонам
│   ├── credentials.ts           ← generateCredentials, saveCredentials (CSV)
│   ├── iframe-helper.ts
│   ├── slider-helpers.ts
│   └── url-builder.ts           ⚠️ импортирует несуществующие модули — см. CODE_REVIEW.md
│
├── fixtures/
│   ├── test-data.ts             ← BASE_URL, Credentials, Urls, QuickPickModpacks
│   ├── users.ts
│   └── games.json
│
├── agents.docs/
│   ├── AGENT_HANDOFF.md         ← этот файл
│   ├── TEST_GUIDELINES.md       ← правила написания тестов
│   └── CODE_REVIEW.md           ← итоги ревью (май 2026)
│
├── storageState.json            ⚠️ закоммичен — может быть устаревшим
├── playwright.config.ts
├── package.json
└── tsconfig.json
```

---

## 4. Критические константы

```typescript
// utils/auth.ts
PANEL_URL          = "https://vf-panel.godlike.host"
TEST_SERVER_UUID   = "c13d2e04-2544-41fc-afff-9ae5c49aca93"  // srv-433986
TEST_SERVER_NAME   = "srv-433986"
STORAGE_STATE_PATH = "storageState.panel.json"  // для panel-тестов

// fixtures/test-data.ts
BASE_URL      = "https://godlike.host"
EMAIL         = "test@testmail.com"
PASSWORD      = "test@testmail.com"  // storefront

// vps.funnel.spec.ts (локально)
storageStatePath = "storageState.vps.json"  // отдельный от panel!
```

> ⚠️ `storageState.panel.json` и `storageState.vps.json` — разные домены, разные сессии. Не перепутывай.

---

## 5. Команды запуска

```bash
# Установка (один раз)
npm install

# Запуск по группам
npx playwright test tests/vps/panel/ --project=chromium --headed
npx playwright test tests/vps/funnel/ --project=chromium
npx playwright test tests/funnels/ --project=chromium
npx playwright test tests/modded/ --project=chromium
npx playwright test tests/general/ --project=chromium

# Конкретный файл
npx playwright test tests/vps/panel/vps.panel.options.spec.ts --project=chromium --headed

# По тегу
npx playwright test --grep "@smoke" --project=chromium
npx playwright test --grep "@critical" --project=chromium
npx playwright test --grep "@regression" --project=chromium

# Отчёт
npx playwright show-report
```

> ⚠️ Скрипты в `package.json` содержат **устаревшие пути** (`tests/vps.panel.*.spec.ts` вместо `tests/vps/panel/`). При запуске через `npm run test:panel` — тесты не найдутся. Используй `npx playwright test` напрямую с правильными путями.

---

## 6. Что сделано / что осталось

### ✅ Сделано

| Файл | Статус |
|---|---|
| `vps.panel.power.actions.spec.ts` | ✅ 3/3 passed |
| `vps.panel.media.spec.ts` | ✅ 3/3 passed |
| `vps.funnel.spec.ts` | ✅ 23/23 passed |
| `vps.panel.rebuild.spec.ts` | ✅ переработан, все баги исправлены |
| `VpsPanelServerPage.ts` | ✅ полностью переписан |
| `VpsPanelMediaPage.ts` | ✅ переписан |
| `VpsPanelRebuildPage.ts` | ✅ обновлён (исправлены локаторы) |
| `VpsPanelNetworkPage.ts` | ✅ написан с нуля |
| `VpsPanelOptionsPage.ts` | ✅ написан с нуля |
| `VpsPanelStoragePage.ts` | ✅ написан |
| `VpsConfigPage.ts` | ✅ переписан (OS-selection, точная фильтрация) |
| `vps.panel.network.spec.ts` | ✅ написан (4 suite) |
| `vps.panel.options.spec.ts` | ✅ написан (7 suite) |

### ⚠️ Требует работы (приоритет)

| Задача | Приоритет | Детали |
|---|---|---|
| Исправить `package.json` скрипты | 🔴 High | Устаревшие пути, `npm run test:panel` не работает |
| Рефакторинг `vps.panel.server.spec.ts` | 🔴 High | Антипаттерны: `if(!x) return`, `console.log` вместо `expect` |
| Рефакторинг `vps.panel.storage.spec.ts` | 🔴 High | Те же антипаттерны, проверки "логируют" но не падают |
| Удалить сломанный `url-builder.ts` | 🟡 Med | Импортирует несуществующие `../config/env` и `../data/promo-codes` |
| Ревью `funnels/` | 🟡 Med | Не ревьюились после реструктуризации |
| Ревью `modded/` | 🟡 Med | Не ревьюились |
| Добавить теги `@smoke/@critical/@regression` | 🟡 Med | Большинство тестов без тегов |
| `storageState.json` в `.gitignore` | 🟢 Low | Устаревший файл в репо |

---

## 7. VirtFusion Gotchas — обязательно читать

Подробнее в `TEST_GUIDELINES.md` §7. Краткая выжимка:

| Проблема | Правильное решение |
|---|---|
| Статус "RUNNING"/"running" вместо "Running" | Только через `getStatusText()` из `VpsPanelServerPage` |
| Bootstrap модалы всегда в DOM | Scope на `.modal.show` для confirm-кнопок |
| Boot button всегда в DOM | Проверять `isEnabled()`, не `isVisible()` |
| CSS-скрытые radio/checkbox | `dispatchEvent('click')`, не `.check()` |
| OS card selection (Rebuild) | Класс `.selected-card`, не `card-inverted-big-border-os` |
| Activity table debug-строки | `tr:not(:has(td[id^='debug']))`, id на `<td>` а не `<tr>` |
| `button:has-text("Shutdown")` — попадает в модал | Добавлять `:not([data-bs-dismiss="modal"])` |

---

## 8. Паттерн panel-тестов (шаблон)

```typescript
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../../../pages/VpsPanelServerPage";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_UUID } from "../../../utils/auth";

test.use({ viewport: { width: 1440, height: 900 } });
test.describe.configure({ mode: "serial" }); // обязателен для stateful тестов

let sharedContext: BrowserContext;
let serverPage: VpsPanelServerPage;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
  sharedContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await sharedContext.newPage();
  serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
});

test.afterAll(async () => { await sharedContext.close(); });

test.beforeEach(async () => {
  await serverPage.goto();
  await serverPage.ensureRunning(60_000); // или ensureStopped
});

test("@critical Пользователь делает X", async () => {
  await test.step("Шаг 1", async () => { ... });
  await test.step("Проверка результата", async () => { ... });
});
```

> ❌ **Антипаттерн** — `if (!condition) return` → тест зелёный, хотя пропущен
> ✅ **Правильно** — `test.skip(!condition, "причина")` → тест оранжевый (skipped)

---

## 9. Правила для нового агента

1. **Читай `TEST_GUIDELINES.md` и `CODE_REVIEW.md`** перед написанием или изменением любого теста
2. **Пуш только через GitHub API** (см. §2) — `git push` заблокирован
3. **Не нажимать** "Continue" / "Place Order" на платёжных страницах — реальный платёж
4. **Не делать Rebuild** без явного разрешения — стирает ОС сервера
5. **Serial mode** для всех VirtFusion panel тестов
6. **`--headed`** при отладке — помогает видеть что происходит
7. **После каждой правки** — обновляй этот файл и `CODE_REVIEW.md`
8. **Никогда не доверяй старым селекторам без проверки** — VirtFusion меняет классы
9. **`storageState.panel.json` ≠ `storageState.vps.json`** — разные домены
10. **Файл `url-builder.ts` сломан** — не используй его, пока не исправлен

---

## 10. Rebuild Page — критические находки

### Правильные классы выбора OS-карточки

```typescript
// ❌ НЕПРАВИЛЬНО — этот класс никогда не добавляется
div.card.os-select.card-inverted-big-border-os

// ✅ ПРАВИЛЬНО — при выборе добавляются:
div.card.os-select.selected-card   // + border-success shadow-sm
```

### Полный список групп ОС (6 групп, 18 карточек)

| Группа | heading | Шаблоны |
|---|---|---|
| AlmaLinux | heading-0 | AlmaLinux 8 Minimal, AlmaLinux 9 Latest |
| CentOS | heading-1 | CentOS 7 Minimal, CentOS Stream 9 Minimal |
| Debian | heading-2 | Debian 11 Minimal, Debian 12 Minimal |
| Fedora | heading-3 | Fedora 41 Minimal, Fedora 42 Minimal |
| Games | heading-4 | Valheim, ARK, Palworld, Satisfactory, Minecraft (Ubuntu 24/22) |
| Ubuntu | heading-5 | Ubuntu 20.04, 22.04, 24.04, Docker, WordPress |

---

## 11. VPS Funnel — структура (все 23 теста passing)

| Suite | Тестов | Описание |
|---|---|---|
| SUITE 1 — VPS Landing | 3 | Кнопки Deploy Now, href-атрибуты, Vue SPA |
| SUITE 2 — Billing Cycle | 6 | 4 периода, цены, discount badges |
| SUITE 3 — Configure Your Server | 13 | Локации + OS/Pre-installation selection |
| SUITE 4 — Full Happy Path | 1 | Landing → Billing → Configure → WHMCS |
