# TEST_AUDIT.md — аудит набора E2E + план унификации

> **Дата:** 16-Jun-2026 · **Метод:** read-only аудит всех 55 спеков (6 параллельных
> субагентов) против канона `TEST_GUIDELINES.md` + `CLAUDE.md`.
> **Объём:** 55 спеков, 278 тест-кейсов, ~8 600 строк.
> Это Phase 0 утверждённой программы (аудит → правки по доменам с чекпоинтами).

---

## 0. Прогресс унификации (ветка `chore/test-unification`)

| Домен | Статус | Коммиты |
|---|---|---|
| **general** | ✅ done | registration creds-leak+manual-gate, credentials.ts→JSON+ротация, StorefrontHomePage PO, DROP слабого TC, RU+test.step |
| **modded** | ✅ done | promo dedup (GameStorefrontPage PO, −220 стр), funnel.modded test.step+PO, game-slider→GameSliderPage PO + DROP 3 style.left, modpack/seed свёртки |
| **funnels** | ✅ done | funnel.spec→PO ✅; credit.check висячий локатор→expect ✅; funnel.seed test.step+дедуп хвоста ✅; funnel.cart.paypal reachCheckout→PO + стабильный Stripe ✅; **funnel.mobile** ✅ — `MobileCartPage` 4× waitForTimeout → web-first (`not.toHaveClass(/disabled/)` + `waitForPriceNonZero` через `expect.poll` + selected `toContainText`); 8→4 теста (DROP страница/Location/промо-поле; MERGE chips→precondition; REWRITE невалидный промо = ошибка + цена не меняется); raw-локаторы→PO (`promocodeDisplayPrice` в selectors); console-шум вычищен; `try/finally`+хелпер `openMobileCart`. 4/4 + 6/6 @critical ×2 зелёные. |
| **vps/funnel** | ✅ done | `vps.funnel.spec` 692 стр → 4 focused-файла (landing/billing/configure/happy-path) + `vps.funnel.helpers.ts` (PO-навигация, без raw/console/sleep); ~20→10 тестов (MERGE структурных в `test.step`, DROP visibility-only); raw-локаторы→PO/selectors (`periodPriceAmount`/`periodDiscount`/order-детали, `BillingCycleSelector.periodPrice/discountBadges`, `OrderSummary.detailCaption/pricingPrice`); `waitForTimeout` убран из спеков **и** `VpsConfigPage` (→ web-first: active-class/`toContainText`/dropdown-items); happy-path checkout success = `reviewHeading`+`gatewayPanels` (reuse `CheckoutPage`); старый файл убран из ESLint legacy-fence. 10/10 зелёные на live (оплату не жмём). |
| **vps/panel** | ⏳ TODO | ⚠️ stateful — слить SUITE power.actions в test.step; дробить rebuild (700, кроме SUITE7-деструктив); storage/network/options REWRITE/MERGE структурных; console/waitForTimeout |
| **game/panel** | ⏳ TODO | лёгкое: tag-convention уже узаконен; вынести 2-3 raw-локатора (login `My Servers`, server.overview getByText, sharing SHR-004) в PO-геттеры; мелкие MERGE структурных |

Узаконено: describe-уровневый тег (TEST_GUIDELINES §5.5). Инвариант: интент платёжных/stateful/деструктивных тестов НЕ менять — только стиль/структура.

---

## 1. Итог одной строкой

Набор **архитектурно здоров**: теги и анти-silent-skip уже закрыты, `game/panel/` (25 спеков)
почти эталонный. Дрейф сосредоточен в **`funnels/` и `vps/`**: raw-локаторы в телах спеков,
`console.log`-шум, `waitForTimeout`/`networkidle`, переразмер (4 файла 500–700 строк) и слой
«слабых» структурных тестов (§8 — «таб/кнопка видна» как отдельный кейс).

---

## 2. Сквозные находки (по приоритету)

| # | Находка | Где | Действие |
|---|---|---|---|
| **P0** | **Утечка кредов в `console.log`** (логинит login/password/email в stdout → CI-лог) | `general/registration-flow` | срочно убрать лог; не печатать секреты |
| **P0** | **`registration-flow` создаёт реального юзера на проде** + идёт по шагам заказа | `general/registration-flow` | ⚠️ risk-decision владельца (см. §3) |
| **P1** | **Raw-локаторы в телах спеков** (99 шт.) при наличии готовых PO/`selectors.ts` | `funnels/*`, `vps.funnel`, `vps.panel.server/options/power.actions`, точечно `game: login/server.overview/sharing` | вынести в PO/`selectors.ts` |
| **P1** | **`console.log`-шум** (псевдо-логирование, мешает `dot`-репортеру) | `vps.panel.power.actions`(50), `rebuild`(45), `vps.funnel`(39), `funnel.seed`(17), `funnel.mobile`/`modded promo`(12) | вычистить до значимых |
| **P1** | **`waitForTimeout` в `tests/`** (запрещён) + в `pages/MobileCartPage` | `vps.funnel`(6+), `rebuild`(8+), `power.actions`(helper+SUITE6), `MobileCartPage` | заменить на `expect.poll`/`waitFor`/`not.toBeVisible` |
| **P1** | **`networkidle`** (хрупко, запрещено) | `funnel.seed`, `funnel.modded`, `vps.panel.login`, `vps.panel.server` | ждать конкретный элемент |
| **P1** | **Переразмер >300 строк** | `rebuild`(700), `vps.funnel`(692), `game-slider`(630), `power.actions`(523) | дробить по describe/файлам |
| **P1** | **Слабые/структурные тесты (§8)** — `toBeVisible`-only, «таб присутствует» | `vps.storage`(весь), `vps.network`(5/8), `vps.panel.server`(бол-во), `game/server.overview`(3/3), `game/network`(3/4), `mobile`(3), и др. | REWRITE-в-поведение где безопасно, иначе MERGE в `test.step` / принять как smoke |
| **P1** | **`throw new Error` вместо `expect`** (тест формально зелёный) | `games.valid.promo`, `games.invalid.promo` | заменить на `expect(...).toEqual([])` |
| **P2** | **Дубли критического пути** воронки (3 копии «главная→cart→login→2×Next→Checkout») | `funnel.spec` ≡ `reachCheckout()` ≡ `credit.check` хвост | свести к одному источнику (`reachCheckout`) |
| **P2** | **MERGE дублей-файлов** (~95% общего кода) | `games.valid.promo` + `games.invalid.promo` | общий параметризованный модуль |
| **P2** | **`SliderPageHelper` внутри спека** (дублирование архитектуры) | `game-slider` | вынести в `pages/` + селекторы в `selectors.ts` |
| **P2** | **Висячий локатор без assert** (мёртвая строка) | `credit.check:189` | удалить/обернуть в `expect` |
| **P2** | **Хрупкий `getByText` конкатенацией** (Stripe-поля) | `funnel.cart.paypal` | через `PaymentMethodSelector`/iframe-helper |

---

## 3. Открытые решения (нужен твой выбор до правок)

1. **Конвенция тегов.** Часть файлов держит тег на `describe`, а не на каждом `test()`
   (`general/smoke.pages`, `vps.funnel`, `vps.panel.power.actions/rebuild`, и 8/12 game-panel-B:
   `sharing.audit`, `security.console`, `tasks`, `versions`, `extensions`, `edit.server`,
   `promo`, `referral`). Через `--grep` они подхватываются (Playwright склеивает title-path),
   но буква правила §5.5 «ровно один тег у каждого теста» не соблюдена.
   **Выбор:** (а) продублировать тег в имя каждого `test()` [строго по гайду];
   (б) узаконить describe-уровневый тег как конвенцию и записать это в `TEST_GUIDELINES`.
   → *Рекомендую (б)* — меньше шума, тег на `describe` логичен, когда весь файл одного класса.

2. **`registration-flow.spec.ts`.** Создаёт **реального пользователя на LIVE PROD** и идёт по
   шагам оформления (2× Next step). Это против CLAUDE «no irreversible state / spam orders».
   **Выбор:** оставить как есть (только починить стиль+утечку кредов) / перевести на заранее
   созданный аккаунт без шага заказа / пометить `@manual` + env-gate / удалить.
   → Утечку кредов в `console.log` чиню в любом случае немедленно.

3. **Stripe-проверка в `funnel.cart.paypal`.** Сейчас матчит длинную конкатенацию текста полей —
   сломается от смены копии. Переписать на стабильные iframe-контейнеры (`iframe-helper`)?
   → *Рекомендую да* (PayPal/Crypto/credit части не трогаю — они сильные).

---

## 4. Аудит по доменам (вердикты)

Легенда: **KEEP** (ок) · **REWRITE** (слабый → проверять реальный результат) ·
**MERGE** (свернуть/слить дубль) · **DROP** (удалить).

### general (5 спеков)
| Файл | Вердикт | Ключевое |
|---|---|---|
| `smoke.pages` | KEEP ×3 | легитимный smoke; убрать console.log, тег в каждый test |
| `login.validation` | KEEP ×2, **DROP** TC-3 «поля имеют type/placeholder» (вёрстка) | убрать console.log; `CART_URL` → test-data |
| `registration-flow` | **REWRITE** (единственный assert `not /login/` → проверять реальную авторизацию) | 🔴 P0: утечка кредов + raw-локаторы + hardcoded URL + создаёт юзера на проде |
| `locale` | KEEP ×3 — **эталон** (TC-LOC-002: поведение+персист) | чисто |
| `valid.links` | KEEP — краулер, монолит оправдан | `waitForTimeout` санкционированы |

### modded (9 спеков)
| Файл | Вердикт | Ключевое |
|---|---|---|
| `games.invalid.promo` | **REWRITE** (`throw`→`expect`) | raw-локаторы→`STOREFRONT`/`PROMO`; console-шум |
| `games.valid.promo` | **REWRITE + MERGE** с invalid (~95% дубль) | общий параметризованный модуль |
| `modpack.config.modded` | KEEP сильные; MERGE «5 quick-pick видны»; REWRITE «поле версии рядом» | PO используется ✓ |
| `slider.modded` | KEEP (особ. `@critical` productId) | console-шум; `void page` |
| `slider.seed` | KEEP сильные; **DROP** «Host Now видима» (§8) | console-шум |
| `game-slider` | KEEP поведенческие; **REWRITE** «позиции ползунка через `style.left`» (§5.4) | **вынести `SliderPageHelper` в PO**; 630 строк |
| `funnel.modded` | KEEP ×2 (платёжный флоу) | raw-локаторы→`CartPage`/`CartModdedNewPage`; дубль-клик Next step; `networkidle` |
| `seed-list.calculator` | KEEP сильные; MERGE «CTA виден» | чисто |
| `cart.modded-new` | KEEP — **образец** (всё через PO, `expect.poll`) | — |

### funnels (5 спеков)
| Файл | Вердикт | Ключевое |
|---|---|---|
| `funnel.spec` | **MERGE** @critical в `reachCheckout()`; KEEP редирект-тест | raw-getBy; hardcoded URL; комментарии-«учебник» |
| `funnel.mobile` | KEEP 2×@critical; REWRITE «невалидный промо» (+«цена не изменилась»); MERGE chips→plan; **DROP** «страница грузится»/«Location»/«промо-поле открывается» | raw-локаторы; **`waitForTimeout` в `MobileCartPage`**; console-шум |
| `funnel.with.credit.check` | KEEP — 🔴 **единственный жмёт реальную оплату** (owner-sanctioned) | НЕ менять интент; явно выбирать «apply credit»; **висячий локатор:189**; ~75% файла комментарии |
| `funnel.seed` | KEEP ×3 — **эталон структуры** | console-шум `[STEP]`; `networkidle`×3; 1-й тест дублирует хвост |
| `funnel.cart.paypal` | **REWRITE** Stripe-часть; KEEP Crypto + credit apply/skip | хрупкий `getByText`; raw `#paypal_*` (есть в selectors) |

### vps (9 спеков)
| Файл | Вердикт | Ключевое |
|---|---|---|
| `vps.funnel` | KEEP ядро; MERGE/DROP ~5 структурных; REWRITE «4 периода видны»/«badge» | 692 строки (дробить); `waitForTimeout`×6; raw-локаторы; console-шум |
| `vps.panel.login` | KEEP поведенческие; REWRITE «`/(login\|dashboard)/`» (зелёный всегда); MERGE 2 «кнопка disabled» | `networkidle`×6; console-шум |
| `vps.panel.power.actions` | ⚠️ stateful — KEEP по сути; **REWRITE структуру: слить SUITE 1–4 в 1 тест/`test.step`** | 523 строки; console-шум(50); `waitForTimeout`; confirm-строки→геттеры PO |
| `vps.panel.media` | KEEP ×3 — **образец stateful** | мелочь |
| `vps.panel.rebuild` | KEEP selection/install + SUITE 7 (деструктив, НЕ дробить); MERGE/REWRITE структурные SUITE 1–3 | 700 строк (дробить 1–6); `waitForTimeout`×8; console-шум |
| `vps.panel.server` | KEEP ~5; REWRITE/MERGE структурные; DROP «прямой переход на UUID» | raw-локаторы (servers-list, bookmark, `body.innerText`); `networkidle` |
| `vps.panel.storage` | **REWRITE весь** (toBeVisible-only → проверять реальные данные диска `Drive: A`/`\d+GB`) | чисто по стилю |
| `vps.panel.network` | KEEP ×3; MERGE 5 «кнопка/заголовок виден» в `test.step` | чисто |
| `vps.panel.options` | KEEP `@critical` VNC + Reset Password; MERGE ~6 структурных | raw под-таб-id/BIOS/UEFI → PO |

### game-panel A (13 спеков) — самый чистый домен
- **KEEP (поведение, эталон):** `power`(PWR-001..003), `console`(CON-001/002), `console.palette`,
  `config` CFG-001, `files`(CRUD), `files.recycle`, `players` PLR-002, `dashboard` DASH-001/003, `login`.
- **Слабые → MERGE в `test.step` / принять как smoke** (поведение деструктивно/вне рамок):
  `server.overview`(SRV-001/002/003 — все видимость), `network`(NET-001/002/004),
  `files.structure`(SFTP/CF/FILE-003 — «модал содержит текст»), `dashboard` DASH-002/004,
  `config` CFG-002, `players` PLR-001.
- **Style:** raw `page.getByText`/`locator` в спеке — `login`(LOGIN-003/005 «My Servers»),
  `server.overview`(SRV-001/003 name/address/uuid) → вынести геттеры в PO. Иначе чисто
  (нет `waitForTimeout`/`networkidle`/console-шума/silent-skip, все <300 строк).

### game-panel B (12 спеков)
- **KEEP (сильные):** `role.enforcement`(ROLE-001..003), `security`(SEC-001..004),
  `security.console`, `sharing`(SHR-002..005), `sharing.audit`, `backups` BKP-001,
  `tasks` TASK-003, `edit.server`, `versions` VER-002.
- **Слабые → KEEP-as-smoke / MERGE:** `tasks` TASK-002→TASK-001, `extensions`(структурные;
  опц. усилить поиском), `referral`(low-prio смоук), `promo`(структурные, монетизация вне рамок).
- **Style:** главный gap — **тег на `describe`, не на `test()`** (8/12 файлов; см. §3.1);
  один raw-локатор `sharing` SHR-004 `dash.page.getByText`.
- `throttling.notification` — **WIP-костяк, оставить** (env-gate `RUN_THROTTLING_TEST`).

---

## 5. Эталоны (образцы — выравнивать остальное по ним)
`locale` (TC-LOC-002) · `funnel.seed` · `cart.modded-new` · `vps.panel.media` ·
`power.spec` · `config` CFG-001 · `role.enforcement` · `security` · `vps.panel.options` VNC-toggle.

---

## 6. План правок по доменам (порядок и чекпоинты)

После твоего ревью вердиктов — иду по доменам, `tsc`+`lint`+прогон затронутого, отчёт+коммит, пауза на ревью:

1. **general** (мал; P0 — registration-flow утечка/безопасность) — первым.
2. **modded** (MERGE promo-дублей; вынос `SliderPageHelper`; DROP/REWRITE структурных).
3. **funnels** (raw-локаторы→PO; дубль критпути; console/networkidle; Stripe).
4. **vps/funnel** (дробление 692→focused; `waitForTimeout`; raw-локаторы).
5. **vps/panel** (дробление rebuild/power.actions; слияние SUITE→`test.step`; storage/network/options REWRITE/MERGE; **интент stateful/деструктив не трогаю**).
6. **game/panel** (лёгкое: конвенция тегов §3.1, 2–3 raw-локатора, мелкие MERGE).

**Инварианты на весь рефактор:** интент платёжных (`credit.check`) и stateful/деструктивных
(vps power/media/rebuild-SUITE7, game power/console/backups/roles/security) тестов — **не меняю**,
только стиль/структуру; self-cleaning и recovery сохраняю; на проде ничего необратимого не добавляю.
