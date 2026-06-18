# AGENT HANDOFF — godlike.host Playwright E2E Suite

> **Последнее обновление:** 18-Jun-2026
> **Стек:** TypeScript · Playwright · Chromium
> **Репо:** https://github.com/rhetalo/e2e_godlike

---

## 0. Порядок чтения

1. `AGENT_HANDOFF.md` (этот файл) — контекст, структура, правила
2. `TEST_GUIDELINES.md` — как писать тесты (читать перед любым изменением теста)
3. `CODE_REVIEW.md` — текущее состояние всех файлов

---

## ▶ Продолжаем здесь (18-Jun-2026 · сессия «Serial-рефактор воронок»)

**Сделано (ветка `refactor/funnel-serial-shared-session` → main; tsc 0 / eslint 0; live green):**
- **Воронки переведены на serial + shared session.** `funnel.mobile` (4 теста),
  `vps.funnel.billing` (3), `vps.funnel.configure` (5): логин + контекст + первичная
  навигация (`cart.goto` / `deployFirstPlan` / `goToConfigureStep`) теперь **один раз** в
  `beforeAll`, сценарии идут серийно по одной залогиненной странице (раньше каждый тест
  поднимал свой контекст и заново навигировал/деплоил). Покрытие НЕ тронуто — только обвязка.
- **Удалён дублирующий `vps.funnel.landing.spec.ts`** — навигация Deploy→cart и так в
  setup каждого funnel-теста (`deployFirstPlan`); уникальная проверка `productId=\d+`
  свёрнута в `vps.funnel.happy-path` (Step 1). `landing`/`happy-path` (по 1 тесту) на
  serial НЕ переводились — нечего шарить.
- **Починен латентный баг mobile-viewport:** `test.use({viewport})` не наследуется
  `browser.newContext()` → 390×844 теперь задаётся явно в контексте `beforeAll`.
- **Доки актуализированы:** `TEST_GUIDELINES.md` §9.1 (serial-shared как осн. паттерн
  воронок + порядко-зависимость shared page), этот файл, `VPS_COVERAGE_ANALYSIS.md`.

**Seed-тесты редизайн (ветка `refactor/seed-tests-redesign`):** три пересекавшихся спека
разведены на 2 корзины + 1 happy-path по recon живого DOM:
- `seed-list.calculator.spec.ts` (/minecraft-seeds/): поля, версии (mc + ATM10-модпак),
  выбор сида чипом/поиском/кастомом, слайдер → проверка `data-href` CTA (productId/seedId/
  modpackId) + 1 реальный переход на /cart-seed.
- `slider.seed.spec.ts` (одиночный сид): слайдер + Host Now (слайдер меняет productId
  343→713) + BUY-A-SERVER (фикс. Quadra, data-url).
- `funnel.seed.spec.ts` слимнут до ОДНОГО @critical Host Now→/cart-seed→WHMCS payment.
- PO расширены (`NewSeedCalculator`, `SeedPage`); новые селекторы в `NEW_SEED_CALCULATOR`.
- ⚠️ modpackId: Host Now с двоеточиями, BUY/listing с дефисами → проверять структурно.

**Ещё в этой сессии (тоже в main):**
- **`cart.modded-new.spec.ts` → serial shared-session** (вход лендинг→Host Now→/cart-modded-new
  один раз в `beforeAll` вместо ×4). Состояние переносится чисто; тест смены плана идёт первым.
- **Флоки транзиентного auth-block починен в `funnel.modded` + `funnel.seed`:** `ensurePastAuthStep`
  ждёт ДЕТЕРМИНИРОВАННЫЙ сигнал (URL `step=2`), а не реагирует на мелькнувшую вкладку Login
  (та детачится в момент авто-перехода → таймаут, воспроизводилось ~1/4). Гард в
  `CartPage.switchToLoginTab` (return, если блок исчез) — защищает всех. (память `funnel-serial-and-doc-drift`)
- **Локальный headed-комфорт** (`playwright.config.ts`, gated `process.env.CI`): окно на основной
  монитор `--window-position=0,0` + `--force-device-scale-factor=1` (отключает OS-масштаб 150% →
  вьюпорт 1800 влезает в физ. экран ноута). ⚠️ ГОЧА: `deviceScaleFactor` НЕ меняет размер
  headed-окна (окно жёстко = вьюпорт+рамка) — для «зума» это не рычаг. Вьюпорт остаётся 1800×900
  как в CI, поведение тестов не меняется.

**Git:** все рабочие ветки сессии влиты в `main` и удалены (origin + локально); `gitlab/*` нетронут.

**Live-прогон:** `tests/vps/funnel` 9/9 (39s) · `funnel.mobile` 4/4 · seed-тесты 14/14 (1.9m) ·
`cart.modded-new` 4/4 (29s) · `funnel.modded` 8/8 (`--repeat-each`, флоки ушёл) · `funnel.seed`
3/3. Владелец прошёл headed-ревью — ОК.

**⚠️ Долг доков:** во многих доках (`CODE_REVIEW`, `TEST_AUDIT`, `vps-panel/*`) воронка всё
ещё зовётся монолитом `vps.funnel.spec.ts` — дрейф с момента сплита на focused-спеки,
не трогал (часть — исторические логи). Привести в порядок отдельным проходом.

**Следующее:** (1) долг доков выше; (2) если в headed-ревью владельца мигали НЕ-рефакторнутые
тесты — собрать список и пройтись flaky-triage; (3) test-quality #3 — переписать слабые
`toBeVisible`-тесты от реального поведения (память `test-quality-plan`); (4) при рефакторинге
тестов держать читаемость/трассируемость в теле спека (память `test-refactor-readability`).

---

### Прошлая сессия (15-Jun-2026 · «Качество + lint-долг»)

**Сделано (на ветке `chore/quality-lint`; tsc 0 / lint 0 errors; lint 165 → 97 warn):**
- **Дедуп clientarea-логина.** Новый `utils/clientareaAuth.ts` →
  `loginClientareaAndSaveSession(browser, {email, password, statePath})` — третий аналог к
  `utils/auth.ts` (vf-panel) и `utils/gameAuth.ts` (game). Идентичный login-флоу воронок
  (`page.fill("#inputEmail")` + `page.click("#login")`) был скопирован инлайном в 7 спеков —
  вынесен в хелпер на локаторах. Переключены: `funnel.mobile/seed/modded`, `vps.funnel`,
  `cart.modded-new`, `games.valid/invalid.promo`. Убрало 21 `prefer-locator` + дублирование.
  `login.validation` НЕ трогал (тестит саму форму логина). ✅ live: `funnel.seed` 3/3 passed,
  `[INFO] Clientarea login OK`.
- **Типизация репортеров** (наш порт с gitlab): `PerFileSlackReporter.ts` (типы
  `TestEntry`/`FileResult`/`SlackBlock` вместо 11×`any`) + `MarkdownLoggerReporter.ts`
  (убран неиспользуемый `options: any`).
- **Track A мелочь:** `base.ts` `(page as any)` → точный cast; promo-спеки `div/btn: any` →
  `Locator`; unused-импорт `VpsPanelLoginPage`; мёртвая `isValidNonZeroPrice` в `funnel.mobile`;
  19× unused `page` в `game-slider`; 2× `waitForSelector` → `locator.waitFor`; force-клики
  (`login.validation`, `funnel.modded`) — точечный `eslint-disable` с Why; `prefer-hooks-on-top`
  в `game-slider` подавлен (хук нельзя поднять над smoke-веткой). (память `eslint-setup`)

**Остаток lint (97 warn) — осознанно отложен, это НЕ баги:** 53 `no-conditional-in-test` +
10 `no-conditional-expect` (намеренное ветвление по живому состоянию VPS в panel-спеках);
17 `no-wait-for-timeout` + 16 `no-networkidle` (legacy-fence timing-долг — безопасная замена
требует stateful live-прогонов панели, отдельный заход); 1 `no-unused-locators`
(`funnel.with.credit.check`, owner-sanctioned — не трогаем).

**Следующее:** (1) Funnel-остаток — apply промокода на форме классической корзины (recon
`.promocode__input`); (2) Качество #3 — переписать слабые `toBeVisible`-тесты от реального
поведения (slider.seed, нужен live-recon); (3) ⚠️ Headed-lane currency-switch — правка
`playwright.config.ts` + xvfb в CI, решение владельца; (4) timing-долг
(`no-wait-for-timeout`/`no-networkidle`) отдельным заходом со stateful-прогонами;
(5) ⚠️ деструктив (game-panel/vps build) — risk-decision владельца.

---

### Прошлая сессия (15-Jun-2026 — funnel-глубина + storefront breadth)

**Сделано (всё в `main`; tsc 0 / lint 0 errors):**
- **Флоки online-панелей** (console/players/security.console/sharing.audit): корень — таймаут
  хука `afterAll` был равен `ensureOffline(120s)` → гонка. Фикс: `test.setTimeout(180s)` +
  `ensureOffline(90s)`. (память `panel-teardown-hook-timeout`)
- **ESLint 9** (flat config `eslint.config.mjs`): hard-rules CLAUDE.md = error
  (`no-wait-for-timeout`/`expect-expect`/`no-focused-test`), legacy-fence для 8 старых
  vps/funnel-спеков, `.history` в ignore, `valid-title` off. `npm run lint` зелёный
  (0 err / ~147 warn = техдолг). (память `eslint-setup`)
- **Seed-воронка** переехала `/cart` → **`/cart-seed`** — обновлены URL-паттерны (`funnel.seed`).
- **Воронки через Host Now/калькуляторы:** `funnel.seed` (+2: одиночный сид + новый калькулятор),
  `funnel.modded` (+1: сверка productId калькулятор↔воронка). Новые `components/NewSeedCalculator.ts`
  + `pages/SeedListPage.ts` для `/minecraft-seeds/` (⚠️ гидрируется ТОЛЬКО на mouse-нудж — см.
  `waitReady`). Новый `pages/CartModdedNewPage.ts` + `tests/modded/cart.modded-new.spec.ts`
  (дропдауны план/биллинг/локация + пересчёт цены). (память `seed-modded-calculators`)
- **CI/Slack-репортеры** портированы с `gitlab/upd` (Gemini): `utils/PerFileSlackReporter.ts`,
  `utils/MarkdownLoggerReporter.ts`, `.gitlab-ci.yml`, подключение в `playwright.config.ts`.
  Slack webhook ТОЛЬКО из env (хардкод не переносили). (память `ci-and-reporting`)
- **Funnel-глубина** (`funnel.cart.paypal`): Crypto/CoinPayments + переключение методов
  (radio по `value`; slug-классы `.panel__gateway--*` в доке `CheckoutPage` устарели) +
  credit balance apply↔skip. Стоп до оплаты. ⚠️ Реальную оплату за кредиты намеренно тестит
  `funnel.with.credit.check.spec.ts` (owner-sanctioned — НЕ трогать/не «обезопашивать»).
- **Storefront breadth** (`tests/general/storefront.breadth.spec.ts`): SEO/meta ×5 страниц
  (`StorefrontPages`), footer (legal/соц), mobile 390px. ⚠️ app-side: по 2 `og:title`/`og:image`
  (тема+SEO-плагин) — дубли OG-тегов, передать лиду. (память `storefront-locale-coverage`)

**Repo-топология:** `origin` (GitHub) = личный/локальный — ДОМ для разработки. `gitlab`
(git.godlike.ovh) = рабочий, CI лида (daily + Slack); истории разошлись (нет общего предка) —
**в GitLab НЕ пушим** без явного решения владельца.

**Следующее — макс. e2e-покрытие** (item 1 funnel-глубина ✅ + item 2 storefront breadth ✅ сделаны):
1. **▶ Headed-lane для currency-switch** (СЛЕДУЮЩИЙ, на паузе): отдельный headed-проект в
   `playwright.config.ts` (греп `@headed`), тест поведенческой смены валюты через
   `Header.switchCurrency` → `Header.samplePrice` меняется. ⚠️ правка конфига — спросить владельца;
   осмыслен локально/вручную, в Linux-CI нужен xvfb (сторона лида). Память `storefront-locale-coverage`.
2. **Funnel-остаток**: apply промокода на форме классической корзины (нужен recon, где `.promocode__input`).
3. **Panel read-only добивки** (см. `game-panel/TEST_PLAN.md`, `vps-panel/HANDOFF.md`).
4. **Деструктив** (game-panel version/rebuild/restore/install; vps build) — ⚠️ нужен risk-decision.
5. **Чистка** lint-варнингов (~147) / raw-локаторов в старых vps-спеках (legacy-fence).

---

## Изменения сессии (03-Jun-2026)

- **Обход A/B Amplitude.** `utils/amplitude.ts` → `pinAmplitudeExperiments(context)`
  детерминированно фиксирует акционный flash-sale-вариант: `context.route` на
  `…/sdk/v2/vardata` отдаёт фиксированный ответ (+ cookie `amplitudeExpFetched`/
  `amdDeviceId` и пред-засев LS как страховка). Вписан в `fixtures/base.ts` (override
  фикстуры `context`) — все storefront-тесты на `fixtures/base` получают обход
  автоматически. Тесты, создающие свой `browser.newContext()`, обязаны звать
  `pinAmplitudeExperiments(context)` сами (см. games.promo, funnel.modded, valid.links,
  vps.funnel). **Зачем:** промо-A/B менял форму URL корзины (`/cart-vps?…` vs
  `/cart-vps/?…`) и показ flash-sale-баннера → плавающие падения воронок.
- **Тихий репортер.** `playwright.config.ts`: в CI — `dot` (точка на тест, подробно
  только падения), локально — `list`; HTML-отчёт пишется всегда (`npm run report`,
  авто-открытие выключено). Убирает построчный флуд от больших матриц.
- **`tests/modded/game-slider.spec.ts` оптимизирован.** Read-only проверки (структура +
  стартовые значения) объединены в `test.step` (631 → 442 теста, покрытие то же).
  Мутационные оставлены отдельными — им нужно свежее состояние кастомайзера.
- **Читабельность (весь набор).** modded/general/funnels/vps/game-panel приведены к
  единому стилю: русские названия тестов, `describe`, `test.step`, комментарии
  (тех-термины, селекторы, ID кейсов `TC-GP-*`, теги `@smoke/@critical/[game-panel]`
  сохранены). Менялись только строки — логика, флоу и stateful-восстановление panel
  не тронуты.
- **`CookieBanner`**: в дисмисс добавлен липкий `.flash-sale-banner` (перехватывал клики).
- **`vps.panel.rebuild.spec.ts`**: в `openRebuildPage` добавлен reload+retry поиска кнопки
  Rebuild. Диагноз скипов: НЕ регрессия — навигация Rebuild→Continue→OS работает (23/23
  `loaded:true`); редкий транзиент после «Cancel Rebuild» (кнопка на миг пропадает) давал
  флоки-skip. Retry это восстанавливает. Проверено: **23 passed / 0 skipped** (real rebuild
  SUITE 7 зелёный). «Много скипов» = неудачный/медленный прогон, не поломка.

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
│   │   │   ├── vps.panel.power.actions.spec.ts   ✅ фикс goto() (май 2026) — должен проходить
│   │   │   ├── vps.panel.media.spec.ts           ✅ 3/3 passed — не трогать
│   │   │   ├── vps.panel.rebuild.spec.ts         ✅ фикс селектора (май 2026)
│   │   │   ├── vps.panel.server.spec.ts          ✅ рефакторинг (май 2026)
│   │   │   ├── vps.panel.storage.spec.ts         ✅ рефакторинг (май 2026)
│   │   │   ├── vps.panel.network.spec.ts         ✅ переписан (май 2026)
│   │   │   ├── vps.panel.options.spec.ts         ✅ полная перезапись (май 2026)
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
| **⚠️ CRITICAL: Rebuild view — URL не меняется** | VirtFusion рендерит OS-selection прямо на `/server/{uuid}` — URL остаётся прежним. Определяется ТОЛЬКО по кнопке `button.btn-primary:has-text("Cancel Rebuild")`. `goto()` в `VpsPanelServerPage` автоматически кликает её. Если после rebuild-теста power-тест не видит `bootButton` или статус `""` — причина в этом. |

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

---

## Сессия: Фиксы компиляции + security + waitForTimeout (май 2026)

### Статус при входе
`npx tsc --noEmit` давал 2 ошибки; `storageState.json` был закоммичен в git; credentials захардкожены; 58 вхождений `waitForTimeout`.

### Что сделано

| # | Файл | Изменение |
|---|---|---|
| 1 | `tests/vps/panel/vps.panel.login.spec.ts` | +`});` в конец — закрывает внешний `test.describe` |
| 2 | `tests/vps/panel/vps.panel.options.spec.ts` | +`});` в конец — закрывает `describe(VNC)` |
| 3 | `utils/auth.ts` | `EMAIL`/`PASSWORD` → `process.env.PANEL_EMAIL ?? ...` |
| 4 | `utils/credentials.ts` | `Password_123` → `process.env.TEST_USER_PASSWORD ?? ...` |
| 5 | `.env.example` | Новый файл — документирует все env-переменные |
| 6 | `storageState.json` | **Удалён из git** (содержал реальные session cookies) |
| 7 | `tests/modded/game-slider.spec.ts` | `waitForTimeout(3000)` → `waitForSelector('[class*="storefront__tariff"]', ...)` |
| 8 | `playwright.config.ts` | `fullyParallel: true` → `fullyParallel: false` + комментарий |
| 9 | `pages/VpsPanelServersListPage.ts` | `waitForTimeout(1500)` → `waitForURL(/\/server\//)` |
| 10 | `pages/VpsPanelServerPage.ts` | 3 фикса: modal-cancel → `waitForSelector(hidden)`, clickTab → убран redundant wait, `waitForNewActivityRow` → `expect.poll()` |
| 11 | `pages/VpsPanelNetworkPage.ts` | `waitForTimeout(800)` убран (networkidle достаточно) |
| 12 | `pages/VpsPanelOptionsPage.ts` | `waitForTimeout(600)` убран |
| 13 | `pages/VpsPanelStoragePage.ts` | `waitForTimeout(800)` убран |
| 14 | `tests/vps/panel/vps.panel.login.spec.ts` | `waitForTimeout(3000/3000/1000)` → `networkidle` / удалён |
| 15 | `agents.docs/TEST_GUIDELINES.md` | +§9.10 waitForTimeout правила, §9.11 credentials, §9.12 storageState |

**`npx tsc --noEmit` — 0 ошибок** после всех изменений.

### Оставшиеся waitForTimeout (~45 вхождений)

| Файл | Сложность замены | Приоритет |
|---|---|---|
| `tests/vps/panel/vps.build.spec.ts` | ⚠️ High — нужно понять каждый контекст | 🔴 |
| `pages/VpsPanelServerDetailPage.ts` | Стаый PO, нужна миграция на ServerPage | 🟡 |
| `pages/VpsConfigPage.ts` (4×300–400ms) | Vue-click micro-delays, сложно без live DOM | 🟡 |
| `pages/MobileCartPage.ts` (4×500–1000ms) | Анимации? Нужна проверка | 🟡 |
| `tests/vps/panel/vps.panel.power.actions.spec.ts` | После power-кнопок (400ms) | 🟡 |
| `tests/vps/panel/vps.panel.rebuild.spec.ts` | После OS-выбора (400–500ms) | 🟡 |

### Следующие приоритеты (открытые задачи)

1. **VpsPanelServerDetailPage.ts** → дубль / устарел. Используется в `vps.build.spec.ts`. Мигрировать `vps.build.spec.ts` на `VpsPanelServerPage.ts`, потом удалить старый PO.
2. **`vps.build.spec.ts`** — монолит (310 строк), запускает реальный rebuild. Обсудить с владельцем.
3. **Hardcoded credentials** в `tests/funnels/*.spec.ts` — использование `EMAIL = "test@testmail.com"` вместо импорта из `utils/auth.ts`. Объединить.
4. **Auth в globalSetup** — логин в `loginAndSaveSession` вызывается в `beforeAll` каждого suite. Лучше переместить в Playwright `globalSetup` + dependency projects.
5. **`storageState.vps.json`** — проверить, не закоммичен ли в git (аналогичная проблема как с `storageState.json`).

---

## Дорожная карта: привести весь проект к единому стандарту

> Статус на май 2026. В этой и предыдущей сессиях работали **только с VPS-тестами и page objects**.
> Остальные модули (`funnels/`, `modded/`, `general/`, `scripts/`) ещё **не ревьюировались**.

### Что сделано (покрыто)

| Модуль | Статус |
|---|---|
| `tests/vps/panel/` | ✅ Ревью + большинство фиксов |
| `pages/VpsPanelServer*.ts`, `Network`, `Options`, `Storage`, `Rebuild` | ✅ waitForTimeout, селекторы |
| `utils/auth.ts`, `utils/credentials.ts` | ✅ process.env |
| `playwright.config.ts` | ✅ fullyParallel противоречие |
| `tests/modded/game-slider.spec.ts` | ✅ waitForTimeout(3000) |
| `tests/modded/games.valid.promo.spec.ts` | ✅ process.env (CLIENTAREA_FREE_*) |
| `tests/modded/games.invalid.promo.spec.ts` | ✅ process.env (CLIENTAREA_*) |
| `.env.example`, `storageState.json` (удалён из git) | ✅ Security |

### Что ещё НЕ тронуто (очередь на следующие сессии)

#### 🔴 Приоритет 1 — Security / credentials

Файлы с хардкодом `test@testmail.com` или `Password_123`, которые ещё не переведены на `process.env`:

| Файл | Что хардкодит |
|---|---|
| `tests/funnels/funnel.spec.ts` | `EMAIL`, `PASSWORD` inline |
| `tests/funnels/funnel.mobile.spec.ts` | `EMAIL = PASSWORD = "test@testmail.com"` |
| `tests/funnels/funnel.cart.check.spec.ts` | `.fill("test@testmail.com")` x2 |
| `tests/funnels/funnel.with.credit.check.spec.ts` | `.fill("test@testmail.com")` x2 |
| `tests/funnels/funnel.paypal.redirect.spec.ts` | email + password inline |
| `tests/vps/funnel/vps.funnel.spec.ts` | `EMAIL`, `PASSWORD` inline |
| `tests/general/login.validation.spec.ts` | credentials inline |

**Цель:** все эти файлы импортируют `CLIENTAREA_EMAIL` / `CLIENTAREA_PASSWORD` из одного места (либо `utils/auth.ts`, либо новый `utils/clientarea-auth.ts`).

#### 🟡 Приоритет 2 — waitForTimeout (оставшиеся ~45 вхождений)

| Файл | Кол-во | Сложность |
|---|---|---|
| `tests/vps/panel/vps.build.spec.ts` | ~12 | ⚠️ Высокая — реальный rebuild |
| `pages/VpsConfigPage.ts` | 4 | Средняя — Vue JS-click micro-delays |
| `pages/MobileCartPage.ts` | 4 | Средняя — анимации? |
| `pages/VpsPanelServerDetailPage.ts` | 2 | Низкая — файл всё равно устарел |
| `tests/vps/panel/vps.panel.power.actions.spec.ts` | 5 | Средняя |
| `tests/vps/panel/vps.panel.rebuild.spec.ts` | 5 | Средняя |
| `tests/funnels/vps.funnel.spec.ts` | 6 | Средняя |
| `tests/general/valid.links.spec.ts` | 3 | Низкая |
| `tests/funnels/funnel.seed.spec.ts` | 1 | Низкая |

#### 🟡 Приоритет 3 — Устаревшие / дублирующие Page Objects

| Файл | Проблема | Действие |
|---|---|---|
| `pages/VpsPanelServerDetailPage.ts` | Стаый PO с угаданными селекторами, используется только в `vps.build.spec.ts` | Мигрировать `vps.build.spec.ts` на `VpsPanelServerPage`, удалить файл |
| `pages/VpsPage.ts` | Возможно перекрывается с `VpsConfigPage.ts` | Проверить и объединить |

#### 🟡 Приоритет 4 — Структура тестов (не ревьюировались вообще)

| Модуль | Что нужно проверить |
|---|---|
| `tests/funnels/` | antipatterns (return вместо skip, отсутствие expect, hardcoded selectors) |
| `tests/modded/` (кроме game-slider и promo) | то же самое |
| `tests/general/` | antipatterns, waitForTimeout |
| `tests/funnels/funnel.seed.spec.ts` | выглядит как setup-скрипт, не тест — разобраться |

#### 🟢 Приоритет 5 — Архитектурные улучшения (после всего выше)

| Задача | Детали |
|---|---|
| Auth в `globalSetup` | Сейчас `loginAndSaveSession()` вызывается в `beforeAll` каждого suite. Один раз в глобальном setup экономит время |
| Dependency projects | Разделить в `playwright.config.ts` на проекты: `setup` → `vps-panel`, `funnels`, etc. |
| Теги `@smoke/@critical/@regression` | Большинство тестов без тегов — невозможно запустить только критические |
| `workers: 1` | Рассмотреть увеличение для non-panel тестов |

---

### Соглашение об именовании env-переменных

| Переменная | Для чего | Файл-источник |
|---|---|---|
| `PANEL_EMAIL` | VirtFusion vf-panel.godlike.host | `utils/auth.ts` |
| `PANEL_PASSWORD` | VirtFusion vf-panel.godlike.host | `utils/auth.ts` |
| `CLIENTAREA_EMAIL` | godlike.host/clientarea (основной аккаунт с сервисами) | будущий `utils/clientarea-auth.ts` |
| `CLIENTAREA_PASSWORD` | то же | |
| `CLIENTAREA_FREE_EMAIL` | godlike.host/clientarea (свежий аккаунт, нет сервисов) | |
| `CLIENTAREA_FREE_PASSWORD` | то же | |
| `TEST_USER_PASSWORD` | Авто-генерируемые тестовые аккаунты | `utils/credentials.ts` |

---

## Сессия: Security cleanup + waitForTimeout фаза 2 (май 2026)

### Статус при входе
Credentials захардкожены в 6 funnel-файлах; оставшиеся ~45 waitForTimeout без Why-комментариев.

### Что сделано

| # | Файл | Изменение |
|---|---|---|
| 1 | `tests/funnels/funnel.spec.ts` | Импорт `Credentials`, `.fill('test@testmail.com')` → `Credentials.email/password` |
| 2 | `tests/funnels/funnel.mobile.spec.ts` | Убраны `const EMAIL/PASSWORD/BASE_URL`, импорт из `fixtures/test-data` |
| 3 | `tests/funnels/funnel.cart.check.spec.ts` | Импорт `Credentials`, 2× `.fill("test@testmail.com")` → `Credentials.email/password` |
| 4 | `tests/funnels/funnel.with.credit.check.spec.ts` | То же |
| 5 | `tests/funnels/funnel.paypal.redirect.spec.ts` | То же |
| 6 | `tests/vps/funnel/vps.funnel.spec.ts` | Убраны `const EMAIL/PASSWORD/BASE_URL`, импорт из `fixtures/test-data` |
| 7 | `tests/general/login.validation.spec.ts` | `waitForTimeout(2_000)` → `expect.poll(() => page.url())` |
| 8 | `tests/funnels/funnel.seed.spec.ts` | `waitForTimeout(1_000)` → `waitForLoadState('networkidle')` |
| 9 | `tests/modded/funnel.modded.spec.ts` | `waitForTimeout(1_000)` → `waitForLoadState('networkidle')` |
| 10 | `pages/VpsPanelRebuildPage.ts` | `waitForTimeout(500)` в `expandAccordion` → `expect(btn).not.toHaveClass(/collapsed/)`; добавлен импорт `expect` |
| 11 | `tests/modded/game-slider.spec.ts` | 2× `waitForTimeout(300)` — первый удалён (selector уже дождался), второй → `expect.poll()` |
| 12 | `tests/general/valid.links.spec.ts` | 3× `waitForTimeout` оставлены — добавлены комментарии "Why" (краулер, рейт-лимит) |

**`npx tsc --noEmit` — 0 ошибок** после всех изменений.

### Оставшиеся waitForTimeout (~35 вхождений)

| Файл | Кол-во | Сложность | Приоритет |
|---|---|---|---|
| `tests/vps/panel/vps.build.spec.ts` | ~12 | ⚠️ Высокая — реальный rebuild | 🔴 |
| `tests/vps/panel/vps.panel.power.actions.spec.ts` | 4 | Средняя — после power-кнопок | 🟡 |
| `tests/vps/panel/vps.panel.rebuild.spec.ts` | 5 | Средняя — после OS-выбора | 🟡 |
| `tests/vps/funnel/vps.funnel.spec.ts` | 6 | Средняя — Vue dropdown | 🟡 |
| `pages/MobileCartPage.ts` | 4 | Средняя — анимации? | 🟡 |
| `pages/VpsConfigPage.ts` | 4 | Средняя — Vue JS-click delays | 🟡 |
| `pages/VpsPanelServerDetailPage.ts` | 2 | Низкая — файл устарел | 🟢 |

### Следующие приоритеты (открытые задачи)

1. **waitForTimeout в vps.funnel.spec.ts** (6 штук, Vue dropdown) — средняя сложность, безопасно
2. **waitForTimeout в power.actions + rebuild** — нужен живой контекст (что ждём после клика)
3. **MobileCartPage.ts + VpsConfigPage.ts** — разобраться с природой задержек
4. **vps.build.spec.ts** — обсудить с владельцем (реальный rebuild)


---

## Сессия 4 — май 2026 (VNC toggle + Protect fix + docs)

### Что сделано
1. **vps.panel.options.spec.ts** — VNC и Protect доработка
   - VNC тест теперь кликает кнопку и проверяет activity table (Enable VNC / Disable VNC задача)
   - Тест всегда откатывает состояние обратно
   - Protect: `isVisible()` → `count() > 0` (Vue v-if, не v-show)

2. **VpsPanelOptionsPage.ts** — новые локаторы
   - `vncToggleButton`, `browserVncButton`, `activityTable`, `latestActivityRow`
   - `protectionState()` метод

3. **CODE_REVIEW.md** — обновлён (сессии 3 и 4)

4. **.github/workflows/playwright.yml** — `on: workflow_dispatch` (убран автозапуск при push)

### Паттерны для следующего агента

**Vue v-if vs v-show:**
Элементы сайдбара (Protect, Unprotect) рендерятся через `v-if` — они отсутствуют в DOM когда не нужны.
Используй `locator.count() > 0` вместо `isVisible()` для проверки их наличия.

**Activity table:**
`table.table-normal tbody tr:first-child` — последняя задача сервера.
После любого действия (VNC toggle, Power, Rebuild) новая строка появляется вверху таблицы.
Используй `expect.poll()` с timeout 15_000ms для ожидания.

**VNC toggle:**
Кнопка `btn btn-primary` в `#pills-options-vnc`, текст меняется: "Enable VNC Access" ↔ "Disable VNC Access".
Единый локатор: `#pills-options-vnc button:has-text("Enable VNC Access"), #pills-options-vnc button:has-text("Disable VNC Access")`

### Открытые задачи (следующий приоритет)
- `vps.panel.network.spec.ts` — не ревьюировался
- `vps.panel.storage.spec.ts` — не ревьюировался
- `vps.panel.server.spec.ts` — антипаттерны `if (!isRunning) return`, нужен рефакторинг

---

## Сессия 5 — май 2026 (финализация options.spec.ts)

### Что сделано

1. **VNC toggle тест** — фикс timing: `expect(toggleBtn).not.toHaveText(labelBefore)` вместо немедленного `innerText()` после клика. Vue перерендеривает всю VNC секцию после клика — нужно ждать DOM update через built-in retry Playwright.

2. **Protect Server** — убран из тестов. Элемент `div.bubble[data-bs-target="#protectServerModal"]` присутствует в DOM (Vue-шаблон всегда рендерит его), но `isVisible() = false` и клик падает с timeout. На тестовом аккаунте кнопка не отображается — возможно feature-флаг или ограничение плана. Оставлен NOTE-комментарий в spec.

3. **Скрины под-табов Options** (получены от владельца):
   - **VNC**: "Enable VNC Access" / после клика → "A VNC session is currently Active" + IP/Port/Password + "Disable VNC Access" + "Browser VNC"
   - **Password**: "Reset Password" (disabled когда сервер Stopped), описание про QEMU guest agent
   - **Settings**: Boot Type (BIOS/UEFI toggle) + Auto Configuration toggle
   - **Rescue**: dropdown выбора rescue системы + "Create Rescue Session"

4. **Debug-тест паттерн** — договорились: когда нужна структура DOM без HTML, пишу `tests/debug/debug.temp.spec.ts`, владелец запускает и возвращает вывод консоли.

### Итоговое состояние vps.panel.options.spec.ts ✅

12 тестов, 0 failed:
- Suite 1: навигация (4 теста)
- Suite 2: VNC — заголовок + кнопка + toggle с activity table (3 теста)
- Suite 3: Password — Reset Password кнопка + модал + cancel (3 теста, skip когда Stopped)
- Suite 4: Settings — Boot Type + BIOS/UEFI (2 теста)
- Protect Server — убран (NOTE в коде)

### Rescue под-таб — не покрыт тестами

Видно из скринов: dropdown "Linux (Debian Live) Rescue v1" + кнопка "Create Rescue Session".
**Create Rescue Session нажимать нельзя** — рестартует сервер.
Можно добавить: проверка наличия dropdown + кнопки без клика.

---

## Сессия 6 — май 2026 (server.spec.ts + server list fixes)

### Что сделано

1. **vps.panel.server.spec.ts** — два фикса:
   - Power Controls: использовал инлайн-локатор вместо `serverPage.allPowerButtons` — матчил скрытую кнопку Restart в модале. Фикс: перейти на page object метод.
   - Tab Navigation: "Backups" → "Sharing" (Backups скрыт, Sharing — реальная 6-я вкладка из скрина).

2. **Suite 5 (Servers List)**: Delete тест убран — кнопка Delete существует только в `#deleteBackupModal` (скрытый модал), не на странице списка.
   Заменён на реальные тесты по HTML `/servers`:
   - All Servers / Bookmarked Servers tabs (`label[for="serverListType1/2"]`) — radio-группа, не кнопки
   - Клик Bookmarked → `input#serverListType2` checked → откат обратно
   - Bookmark icon: `[tt="Bookmark"]` или `[tt="Remove bookmark"]`

### Структура /servers страницы (подтверждена из HTML)
- Заголовок "Servers" + radio-tabs: All Servers / Bookmarked Servers
- Таблица серверов: имя (`h4#server-label`), статус (.badge), дата, IP (.badge-grey), Manage (`button.btn-action.btn-primary`), bookmark icon (`div[tt="Bookmark/Remove bookmark"]`)
- НЕТ Delete кнопки на этой странице

### Итоговое состояние vps.panel.server.spec.ts ✅
20 тестов, 17 passed, 1 skipped (Media tab — скрыта), 0 failed

---

## Сессия 7 — май 2026 (rebuild.spec.ts fixes)

### Что сделано

**vps.panel.rebuild.spec.ts** — 6 падений, 2 причины:

1. **Все тесты с AlmaLinux карточкой** — accordion `collapse-0` (AlmaLinux группа) свёрнут по умолчанию. Карточки в DOM но скрыты. Тесты шли напрямую к `osCardByName("AlmaLinux 9 Latest")` без раскрытия группы. Фикс: добавить `await rebuildPage.expandAccordion("AlmaLinux")` перед каждым `osCardByName("AlmaLinux ...")`.

2. **goBackToServer** — не ждал `networkidle`, Vue-рендеренный `statusBadge` не успевал появиться. Фикс: добавить `await page.waitForLoadState("networkidle")`.

### Паттерн для OS-карточек в rebuild

**Всегда** раскрывай аккордеон перед взаимодействием с карточкой:
```typescript
await rebuildPage.expandAccordion("AlmaLinux"); // группа 0
await rebuildPage.expandAccordion("Debian");    // группа 2
await rebuildPage.expandAccordion("Games");     // группа 4
// и т.д.
```

Группы (порядок подтверждён из HTML): 0=AlmaLinux, 1=CentOS, 2=Debian, 3=Fedora, 4=Games, 5=Ubuntu

---

## Сессия 8 — май 2026 (rebuild.spec.ts финализация)

### Что сделано

**vps.panel.rebuild.spec.ts** — 2 оставшихся падения:

1. **Test 6 (AlmaLinux 9 Latest присутствует в списке)** — пропущен `expandAccordion` при первом рефакторинге. Фикс: добавить `await rebuildPage.expandAccordion("AlmaLinux")` перед `osCardByName`.

2. **Test 23 (статус сервера после возврата)** — `goBackToServer(page)` использует `page.goto()` напрямую без логики Cancel Rebuild. Vue-роутер оставался в rebuild-состоянии, `statusBadge` не рендерился. Фикс: заменить на `serverPage.goto()` который обрабатывает Cancel Rebuild + networkidle.

### Итоговое состояние vps.panel.rebuild.spec.ts ✅
23 теста. При Stopped сервере: ~12 passed, 11 skipped (требуют Running + Rebuild кнопка).
При Running сервере: все 23 должны проходить.

### Открытые задачи (следующий приоритет)
- `vps.panel.network.spec.ts` — не ревьюировался
- `vps.panel.storage.spec.ts` — не ревьюировался
- `vps.panel.server.spec.ts` — ✅ завершён (сессия 6)
- `vps.panel.options.spec.ts` — ✅ завершён (сессии 3-5)
- `vps.panel.rebuild.spec.ts` — ✅ завершён (сессии 7-8)
