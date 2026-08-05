# CODE REVIEW — godlike.host E2E Suite

> **Дата ревью:** Май 2026 · обновлено 19-Jun-2026
> **Охват:** vps/panel/, general/ — полное ревью; funnels/, modded/ — не ревьюировались

---

## Сессия 19-Jun-2026 (lint-энфорсмент + гигиена тестов; по ресёрчу статей Habr)

### Урок: устаревший селектор после миграции на Vuetify (REF-001)
**Что сломалось:** усиливал `referral.spec.ts` REF-001 (хотел проверить, что реф-ссылка несёт реальный
код, а не просто видима). `inputValue()` упал: «Node is not an <input>». Селектор
`GAME_PANEL_REFERRAL.refLink` (`.link-card__input-wrapper input, .link-card__input`) устарел — карточка
мигрировала на Vuetify, и `.link-card__input` теперь ОБЁРТКА-`div` (`v-input`), а не инпут. `.first()`
матчил пустую ноду — даже старый `toBeVisible()` молча ассертил НЕ тот элемент (зелёный, но бесполезный).
**Почему важно:** структурный «only-`toBeVisible`» тест не падает, когда селектор сполз на соседнюю ноду —
сигнал теряется тихо. **Фикс:** `.link-card__input input` (реальный `.v-field__input`, readonly), подтв.
live DOM 19-Jun; чтение значения — PO-метод `refLinkValue()`. **Мораль:** усиливая «слабый» тест, ВСЕГДА
прогоняй вживую — заодно ловишь сползшие селекторы; не доверяй «зелёному» `toBeVisible()` на структуре.

### Решение: НЕ линтить «expect в pages/components» (web-first ожидания ≠ ассерты)
**Контекст:** CLAUDE.md говорит «методы page/component не вызывают expect» → соблазн навесить lint-правило.
**Почему НЕ сделал:** 17 `expect()` в `pages/` — это web-first ОЖИДАНИЯ (`await expect(loc).toContainText()`
= «дождись, пока дропдаун отразит выбор»), а НЕ ассерты. Буквальное правило сломало бы рабочий паттерн.
**Мораль:** кодируй в линтер ПРАВИЛЬНОЕ правило, а не дословный текст контракта (статья «Clean Architecture
и AI»). Будущему агенту: не «чинить» CLAUDE.md этим правилом.

---

## Сессия 03-Jun-2026 (детали в `AGENT_HANDOFF.md` → «Изменения сессии»)

- **Обход A/B Amplitude** во всех storefront-тестах: `utils/amplitude.ts` +
  override `context` в `fixtures/base.ts`; ручные контексты (games.promo,
  funnel.modded, funnel.mobile, valid.links, vps.funnel) зовут `pinAmplitudeExperiments` сами.
- **Тихий репортер** (`dot` в CI / `list` локально) в `playwright.config.ts`.
- **`game-slider`**: read-only проверки объединены в `test.step` (631→442 теста).
- **Читабельность всего набора**: русские названия/`describe`/`test.step`/комментарии
  (тех-термины, ID `TC-GP-*`, теги сохранены). Менялись только строки.
- **`CookieBanner`**: добавлен дисмисс липкого `.flash-sale-banner`.

---

## 1. Файлы в хорошем состоянии ✅ — не трогать без причины

| Файл | Почему хорошо |
|---|---|
| `VpsPanelServerPage.ts` | Эталон: селекторы из DevTools, нормализация статуса, waitFor-паттерны |
| `VpsPanelOptionsPage.ts` | Все vlang-строки задокументированы, scope на `.modal.show` |
| `VpsPanelNetworkPage.ts` | Чистый PO, vlang-строки, надёжный `getVisibleIpAddresses()` |
| `VpsPanelStoragePage.ts` | Лёгкий PO, vlang задокументированы |
| `VpsPanelMediaPage.ts` | Boot Order, `radio.check({ force: true })` |
| `VpsPanelRebuildPage.ts` | OS-selection, подтверждённые классы `.selected-card` |
| `utils/bannerHandlers.ts` | `addLocatorHandler` — правильный паттерн для баннеров |
| `utils/selectors.ts` | Централизованный каталог CSS-селекторов |
| `utils/auth.ts` | Константы, `loginAndSaveSession()`, различие panel/vps сессий |
| `fixtures/test-data.ts` | BASE_URL, Credentials, env-override |
| `vps.panel.power.actions.spec.ts` | Реальные state transitions, activity table, teardown |
| `vps.panel.media.spec.ts` | Реальное переключение Boot Order с teardown |
| `vps.funnel.spec.ts` | 23/23 passed |

---

## 2. Что сделано в рамках ревью (май 2026)

### `vps.panel.rebuild.spec.ts`
**Проблема:** `button:has-text("Rebuild")` матчил скрытые Bootstrap модалы (они раньше в DOM чем контент вкладки) → `isVisible() = false` → 23 теста скипались.

**Фикс:**
```typescript
// Было
page.locator('button:has-text("Rebuild"), button:has-text("Install")').first()

// Стало — уникальный data-bs-target, не затрагивает скрытые модалы
page.locator('button[data-bs-target="#reinstallServerModal"]').first()
```

---

### `vps.panel.server.spec.ts`
- Suite 3 (Power Controls): убраны 3 теста которые дублировали `power.actions.spec.ts`. Оставлен только smoke (наличие кнопок)
- Suite 4 (Tab Navigation): `bodyText.length > 100` → `activeTab.toContainText(label)` — реальная проверка активности таба
- Suite 5 (Servers List): убран дублирующий Manage-тест, добавлено закрытие Delete модала через expect

---

### `vps.panel.network.spec.ts`
Полная перезапись. До: Suites 3 и 4 не содержали ни одного `expect()` — тесты проходили всегда.

После:
- Жёсткие `expect` на `primaryIpv4Label`, `primaryNetworkLabel`, IP-адрес
- `test.skip()` для Reverse DNS и Network Traffic (зависят от плана)
- Shared serial context вместо нового context на каждый тест

---

### `vps.panel.options.spec.ts`
- Удалены 2 дублирующих VNC-теста (body.includes("VNC") после того как vncSectionTitle уже проверен через toBeVisible)
- `if (!protectVisible) { context.close(); return }` → `test.skip(!protectVisible, "...")`

---

### `vps.panel.storage.spec.ts`
- `hasStorageContent()` (body text regex) → `toBeVisible()` на `driveLabel` и `primaryDiskLabel`
- Объединены три отдельных теста в один с двумя чёткими ассертами

---

### `vps.panel.login.spec.ts`
Suite 1 — убраны тесты на browser behavior (не на приложение):
- "email поле принимает ввод" — тестирует HTML input, не приложение
- "password поле тип password" — то же
- "Powered by VirtFusion" — vanity text

---

### Удалённые файлы
| Файл | Причина |
|---|---|
| `fixtures/users.ts` | Нигде не импортировался. Дублировал `fixtures/test-data.ts → Credentials` |
| `utils/slider-helpers.ts` | Нигде не импортировался. Слайдер-тесты имеют inline-хелперы |

---

### `playwright.config.ts`
Удалены ~130 строк tutorial-комментариев. Конфиг не изменился по логике.

---

### `tests/general/valid.links.spec.ts`
- Убраны `=====` section dividers и избыточные комментарии
- Таймаут 1 час → 10 минут (реальный максимум при 100 страницах ~5 мин)
- Логика не изменилась: тест не падает на первой сломанной ссылке, собирает все и падает один раз в конце

---

## 3. Проблемные файлы — требуют решения

### `vps.build.spec.ts` ⚠️
Использует **старые page objects**: `VpsPanelServerDetailPage` и `VpsPanelServersListPage`.

| Тест | Проблема |
|---|---|
| T2.1 | Дубль `vps.panel.server.spec.ts` Suite 1 |
| T2.2 | Дубль `vps.panel.server.spec.ts` Suite 4 |
| T2.3–T2.5 | Дубль `vps.panel.rebuild.spec.ts` |
| **T2.6** | **Реально нажимает "Continue" в rebuild модале → запускает пересборку сервера** |

T2.6 ждёт только 3 секунды после подтверждения — rebuild занимает минуты. Тест упадёт и оставит сервер в состоянии сборки. **Не запускать без согласования с владельцем.**

---

### `VpsPanelServerDetailPage.ts` и `VpsPanelServersListPage.ts`
Старые page objects, используются только в `vps.build.spec.ts`. Судьба зависит от решения по этому файлу: удалить вместе или мигрировать на `VpsPanelServerPage`.

---

## 4. Что не ревьюировалось

| Папка / файл | Рекомендация |
|---|---|
| `tests/funnels/` (6 файлов) | Ревью на антипаттерны: `if(!x) return`, console.log без expect |
| `tests/modded/` (7 файлов) | То же |
| `pages/CartPage.ts`, `CheckoutPage.ts` и др. | Ревью при работе с funnels |
| `components/` | Ревью |


---

## 5. Правки май 2026 — сессия 2 (Security + waitForTimeout фаза 2)

### Credentials — убраны хардкод-строки из funnel-файлов

| Файл | До | После |
|---|---|---|
| `funnel.spec.ts` | `.fill('test@testmail.com')` inline | `Credentials.email/password` из `fixtures/test-data` |
| `funnel.mobile.spec.ts` | `const EMAIL = "test@testmail.com"` | Импорт `Credentials` из `fixtures/test-data` |
| `funnel.cart.check.spec.ts` | 2× `.fill("test@testmail.com")` | `Credentials.email/password` |
| `funnel.with.credit.check.spec.ts` | То же | То же |
| `funnel.paypal.redirect.spec.ts` | То же | То же |
| `vps.funnel.spec.ts` | `const EMAIL/PASSWORD = "test@testmail.com"` | Импорт `Credentials` из `fixtures/test-data` |

Единственный источник правды для storefront-учётки теперь — `fixtures/test-data.ts` → `Credentials` (с `process.env.CLIENTAREA_EMAIL` / `CLIENTAREA_PASSWORD` override).

### waitForTimeout — убраны нетривиальные ожидания

| Файл | Было | Стало |
|---|---|---|
| `login.validation.spec.ts` | `waitForTimeout(2_000)` | `expect.poll(() => page.url(), { timeout: 2_000 })` |
| `funnel.seed.spec.ts` | `waitForTimeout(1_000)` | `waitForLoadState('networkidle')` |
| `funnel.modded.spec.ts` | `waitForTimeout(1_000)` | `waitForLoadState('networkidle')` |
| `VpsPanelRebuildPage.ts:expandAccordion` | `waitForTimeout(500)` | `expect(btn).not.toHaveClass(/collapsed/)` |
| `game-slider.spec.ts` | 2× `waitForTimeout(300)` | 1-й удалён; 2-й → `expect.poll(innerText)` |
| `valid.links.spec.ts` | 3× `waitForTimeout` | Оставлены + добавлены "Why" комментарии |


---

## 6. Правки май 2026 — сессия 3 (Options rewrite + CI fix)

### `vps.panel.options.spec.ts` — полная перезапись ✅

**Корневые проблемы:**
- Структурный баг: Suite 3 (VNC) не закрывался `});`, Suites 4–7 были вложены внутрь него
- Тесты не навигировали по под-табам — искали кнопки в скрытых пейнах
- Каждый тест перелогинивался (нет serial + shared context)
- Hostname/Save тестировали `#editNameModal` (gear-иконка в сайдбаре), а не Options tab

**Структура Options tab (подтверждена из live HTML):**
Options → 4 под-таба (Bootstrap pills):
- `#pills-options-vnc-tab` — VNC (активен по умолчанию)
- `#pills-options-rescue-tab` — Rescue
- `#pills-options-password-tab` — Password (Reset Password button)
- `#pills-options-settings-tab` — Settings (Boot Type, BIOS/UEFI, Protect Server)

**Что изменилось в spec:**
- `describe.configure({ mode: 'serial' })` + shared context → один логин на весь файл
- Хелпер `gotoSubTab(name)` навигирует в нужный под-таб перед тестом
- Reset Password: `test.skip(!isEnabled)` — корректно скипается когда сервер Stopped
- Hostname/Save тесты убраны — это другой flow
- 21 тест → 13 сфокусированных

### `VpsPanelOptionsPage.ts` — фикс локаторов ✅

| Локатор | Было | Стало |
|---|---|---|
| `resetPasswordButton` | `button:has-text("Reset Password")` — матчил скрытые пейны | `#pills-options-password button:has-text("Reset Password")` |
| `protectServerButton` | `button:has-text("Protect Server")` — кнопки нет, это `div.bubble` | `[data-bs-target="#protectServerModal"]` |
| `unprotectButton` | `button:has-text("Unprotect")` — неверный текст | `[data-bs-target="#unProtectModal"]` |
| `bootTypeLabel` | широкий `div:has-text("Boot Type")` | `#pills-options-settings h4:has-text("Boot Type")` |

**Новый метод:**
```typescript
async clickSubTab(name: "VNC" | "Rescue" | "Password" | "Settings"): Promise<void> {
  await this.page.locator(`#pills-options-${name.toLowerCase()}-tab`).click();
  await this.page.waitForLoadState("networkidle").catch(() => null);
}
```

### `.github/workflows/playwright.yml` — CI trigger ✅

Убран автозапуск тестов при пуше:
```yaml
# Было: запускалось при каждом push/PR → реальные покупки на тестовом аккаунте
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

# Стало: только вручную через GitHub UI → Actions → Run workflow
on:
  workflow_dispatch:
```

---

## 7. Правки май 2026 — сессия 4 (VNC toggle + Protect fix)

### `vps.panel.options.spec.ts` — VNC и Protect доработка ✅

**VNC Suite (Suite 2):**
- Убран слабый тест "Enable VNC или активная сессия" — заменён на два:
  1. `vncToggleButton` visible (Enable/Disable — единый локатор)
  2. VNC toggle тест: клик → activity table показывает задачу → откат обратно
- Поведение VNC: клик записывает таску в `table.table-normal` (Enable VNC / Disable VNC)
- Тест всегда откатывает состояние обратно (не меняет среду)

**Protect Suite (Suite 5):**
- Причина падения: `protectServerButton` и `unprotectButton` рендерятся через **Vue v-if** (не v-show) → элемент отсутствует в DOM когда не нужен → `isVisible()` = false
- Фикс: `count() > 0` вместо `isVisible()`
- Добавлен `protectionState()` в page object

### `VpsPanelOptionsPage.ts` — новые локаторы ✅

| Добавлено | Описание |
|---|---|
| `vncToggleButton` | `#pills-options-vnc button:has-text("Enable/Disable VNC Access")` |
| `browserVncButton` | появляется только при активной VNC сессии |
| `activityTable` | `table.table-normal` — общая для всех секций |
| `latestActivityRow` | первая `tbody tr` activity table |
| `protectionState()` | `"protect" \| "unprotect" \| "unknown"` через `count()` |

---

## 8. Правки май 2026 — сессия 5 (options финализация)

### `vps.panel.options.spec.ts` ✅ ГОТОВ

**VNC toggle timing fix:**
После клика Vue перерендеривает всю секцию. `innerText()` сразу после `expect.poll(activityTable)` возвращал старый текст. Фикс: `expect(btn).not.toHaveText(labelBefore, { timeout: 15_000 })`.

**Protect Server — убран:**
`div.bubble[data-bs-target="#protectServerModal"]` в DOM но скрыт. На тестовом аккаунте не отображается. Оставлен NOTE-комментарий.

**Итог файла: 12 тестов, все проходят. Файл считается завершённым.**

### Паттерн debug-теста (добавить в TEST_GUIDELINES)
```typescript
// tests/debug/debug.temp.spec.ts — ВРЕМЕННЫЙ, удалить после использования
test('DEBUG: структура DOM', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await ctx.newPage();
  // навигация...
  const pane = page.locator('#pills-options-vnc');
  const buttons = await pane.locator('button').all();
  for (const btn of buttons) {
    console.log('BTN:', await btn.innerText(), '| visible:', await btn.isVisible(), '| class:', await btn.getAttribute('class'));
  }
  console.log('HTML:', await pane.innerHTML());
  await ctx.close();
});
```

---

## 9. Правки май 2026 — сессии 7-8 (rebuild.spec.ts)

### `vps.panel.rebuild.spec.ts` ✅ ГОТОВ

**Проблема accordion (сессия 7):**
Все OS-карточки находятся внутри Bootstrap accordion групп (collapse-0..5), которые свёрнуты по умолчанию. Карточки есть в DOM но `isVisible() = false`. Во всех тестах где нужно кликнуть или проверить карточку — обязательно сначала `expandAccordion(family)`.

Группы (порядок из HTML): `0=AlmaLinux, 1=CentOS, 2=Debian, 3=Fedora, 4=Games, 5=Ubuntu`

**goBackToServer (сессия 7):** добавлен `networkidle` wait.

**Test 23 (сессия 8):** `goBackToServer(page)` → `serverPage.goto()` — только `goto()` обрабатывает Cancel Rebuild и корректно рендерит server overview.

**Test 6 (сессия 8):** пропущен `expandAccordion("AlmaLinux")` — добавлен.

## Сессия 26-Jun — стабилизация флоки CI (game-panel + funnel)

**Оверлеи панели перехватывают клики (вскрылось при изоляции по новым серверам).** На страницах
сервера висит `server__header-help` (контекстная Help-панель, ОТКРЫТА) + shepherd-онбординг
(всплывает на ПЕРВОМ заходе на сервер, иногда лениво уже ПОСЛЕ `dismissIfPresent`). Лечить «найти
крестик и закрыть» НЕЛЬЗЯ (упадёт, если оверлея нет — а он разовый). Решение: `pointer-events:none`
через `<style>` в `GamePanelBasePage.open()` — пассивное правило, применяется к оверлею даже если он
появится позже, и ничего не делает, если оверлея нет. Плюс Vuetify-кнопки иногда не ловят `.click()`
(оверлей перехватывает hit-test) → `dispatchEvent('click')` (тот же приём, что Boot Order radio в vf-panel).

**Serial-shared состояние = cross-test контаминация.** `funnel.mobile` читал цену Rust (оставленную
тестом 1) как Minecraft (тест периода) → «3 мес дешевле месяца». `selectGameByChip` не ждал пересчёта;
детекция смены игры ненадёжна. Надёжно — `cart.goto()` в начале каждого @critical (чистое состояние).
Урок: в serial-shared не полагайся на «что оставил сосед» — изолируй reload'ом. ⚠️ И не доверяй
первому диагнозу прайс-флока: «per-month скидка» оказалась неверной, причина — контаминация (сначала
recon реальных значений, потом вывод).

**CI-краснота ≠ всегда баг кода.** (1) VPS-cron гоняет БЕЗ `CI=true` → `retries=0` (транзиенты падают
насмерть, не маскируются). (2) **STALE-код на VPS:** деплой мог не доехать → CI показывает «старые»
падения, которых в коде уже НЕТ (напр. `@critical paypal` с `toHaveURL(/paypal.com/)` — мой @critical
давно структурный). ВСЕГДА сверяй `git log -1` на VPS с `gitlab/main`, прежде чем чинить «снова».

## Сессия 17-Jul — массовые падения = изменения прода (не код); recon ПЕРЕД правкой

Главный урок сессии: **при массовом одинаковом симптоме across specs — это почти всегда изменение
прода, а НЕ баг тестов/кода. Сначала живой recon, потом вывод.** Несколько раз поставил неверный
диагноз «от головы» и был поправлен владельцем — везде истину дал recon. Конкретика:

- **Язык/валюта биллинга — гео/аккаунт-driven, не тест.** Все воронки легли на англ. литерал
  «Review & Checkout» — оказалось, WHMCS рендерил checkout по-украински (язык аккаунта в биллинге).
  Валюта (USD/EUR) — тоже per-account/IP. Мой диагноз «EUR → Vue step3» был НЕВЕРЕН: маршрут от валюты
  не зависит. Урок: язык/валюта — прод-настройки, не трогай тесты, пока не сверил recon'ом.
- **Акция MONTHLY75 «всем» + оптимистичный success-транзиент.** promo-лейбл при смене периода
  показывает success ДО ответа бэка, затем error «already used» → poll ловил транзиент → ложный
  `activated=true`. Диагноз «данные games.json неверны» был НЕВЕРЕН (владелец: «данные ок») — баг был
  в ЧТЕНИИ. Фикс: читать лейбл со СТАБИЛИЗАЦИЕЙ (N равных замеров), не по first-visible. См. [[promo-action-monthly75]].
- **VPS-лендинг перестроили: тогглы прячут планы.** `.first()` брал скрытую карточку (`display:none`)
  → «element hidden». Берём только `:visible`. У первых тарифов убрали 1-месячный период (3/6/12);
  per-period discount-бейджи удалены. flash-sale модалка вылезает даже с пином Amplitude — гасит
  CookieBanner. См. [[vps-funnel-restructure]].
- **Шаг Configure в воронке + трекинг-суффиксы URL.** Между billing и WHMCS появился шаг
  «Configure your server» → идти до payment циклом (`advanceToPayment`), не хардкодить N кликов;
  кнопка Next детачится при ре-рендере Vue-шага → ретрай + стоп по уходу на `/clientarea/`. Прод
  добавляет `?rtkcid=` в URL → ассерты только regex-толерантные, не точная строка.
- **Идентичность game-сервера: имя дрейфует, UUID стабилен.** Реинстолл сбросил имя `test_e2e` на
  авто-имя → name-based панельные тесты легли (UUID тот же). Аудит UUID↔имя через дашборд-recon;
  фолбэк `GAME_SERVER_NAME` синхронизирован с `.env`.
- **Power-кнопка disabled в переходе.** Start/ShutDown temporarily disabled, пока сервер
  Stopping/Installing → дефолтный actionTimeout 15с не дожидался → клики с щедрым таймаутом (auto-ждут
  enabled) + гард на текущее состояние.
- **Modded auth-step флак = spurious fallback по транзиентному auth-блоку.** Валидная сессия
  авто-проскакивает на step2, но блок мелькает → зря запускали fallback-логин (гонка с детачем формы).
  Фикс: щедрое ожидание step2 (30с) — транзиент исчезает; fallback только на стойком блоке; финальная
  перепроверка step2.

## Сессия 20-Jul — CI-only флак modded-воронки: отскок шага Configure (step3→step2)

Симптом: `funnel.modded.spec.ts › @critical … страница оплаты` падал ТОЛЬКО на CI (VPS-cron),
локально зелёный; «то 1 тест, то несколько» = один и тот же @critical, размноженный ретраями.
Ошибка — чистый `expect(isOnPaymentStep()).toBeTruthy()` == false, URL застревал на
`/cart?...&step=3&location=…` (не таймаут).

**Корень (подтверждён live-recon 20-Jul, 5+ headless-прогонов).** Шаг «Configure your server»
(step=3) у modded НЕ «созревает» мгновенно: пока Vue догружает список типов сервера
(`.configure-server__types` рендерится, но `.configure-server__type` карточки ещё пусты), шаг
считается невалидным и приложение **отбрасывает URL обратно на step=2** (наблюдался отскок
step3→step2 через ~400 мс). Прежний `advanceToPayment` ждал `waitForURL(u !== before)` и
**засчитывал этот отскок как прогресс** + ограничивал бюджет счётчиком `maxSteps=4`. На медленном
CI (гидрация дольше) осцилляция step2↔step3 проедала все 4 клика, до оплаты дело не доходило.
Это **баг теста (рейс), не прода** — CI лишь расширял окно.

Фикс ([`CartPage.advanceToPayment`](../pages/CartPage.ts)): ждать ИМЕННО ухода на `/clientarea/`
(все payment-URL под ним), а не «URL сменился» → отскок step3→step2 больше не прогресс; ретрай
клика Next по реальному **time-budget (90с)**, а не по счётчику шагов. Как только конфиг
догрузился — клик «прилипает» и уводит на оплату. Полезно всем 3 воронкам на `advanceToPayment`
(modded / funnel / cart.paypal) — проверено, регрессий нет. ⚠️ Сигнал готовности
`.configure-server__type-active` у modded НЕ появляется (в отличие от VPS-конфигуратора) — не
завязываться на него; ориентир — уход на `/clientarea/`.

## Сессия 21-Jul — CI-only флак seed-калькулятора: async data-href читался «сразу»

`seed-list.calculator.spec.ts › @regression выбор сида из поиска-дропдауна → seedId в URL`:
`expect(seedId).toBeTruthy()` получал `""` (только CI, локально 5/5 зелёный).

**Корень (live-recon 21-Jul):** CTA `data-href` калькулятора обновляется **асинхронно** после клика
по результату поиска — `seedId` появляется через **+35..318 мс** (на нагруженном CI дольше). Тест
поиска-дропдауна читал `ctaHref()` СРАЗУ после клика (между click и чтением — только
`picked.length`), тогда как тесты выбора **чипом** и **кастомным** сидом перед чтением href уже
`expect.poll`-или применение выбора. Асимметрия = баг синхронизации теста, не прода.

Фикс: в тесте поиска перед чтением href добавлен `expect.poll(seedId).toBeTruthy()` (5с) — как в
соседних тестах. tsc 0; файл 7/7.

## Сессия 22-Jul — два прод-регресса (не флак): вторая seed-кнопка + новый cookie-баннер

Оба стабильные (3/3), «вчера ок, сегодня нет» → изменения прода, не флоки. Recon перед правкой.

**(1) `slider.seed.spec.ts › @critical BUY-A-SERVER` — `data-url`=null.** Прод добавил на сид-страницу
вторую кнопку с тем же классом `.single-seed-card__button` — «Open in Seed Map»
(`.single-seed-card__map-button`, несёт `data-seed-map-url`, БЕЗ `data-url`), и она идёт в DOM
ПЕРВОЙ. `buyServerButton()` брал `.single-seed-card__button`.first() → цеплял кнопку карты →
`getAttribute("data-url")`=null. Фикс ([`SeedPage`](../pages/SeedPage.ts)): таргет по стабильному
id **`#cartDefaultBtn`** (у BUY он есть). Урок: `.first()` по классу хрупок — как только прод
добавляет соседний элемент с тем же классом, ломается; предпочитать стабильный id. slider.seed 6/6.

**(2) `files.recycle.spec.ts` (game panel) — клик Restore перехватывал cookie-баннер.** На
ultra.panel добавили CookieYes: `.cky-consent-container` (бокс `cky-box-bottom-left` с «Accept
All» = `.cky-btn-accept`) — его pointer-events съедали клик Restore (bottom-left зона). Фикс
([`GamePanelBasePage.neutralizeOverlays`](../pages/game/GamePanelBasePage.ts)): добавил
`.cky-consent-container, .cky-overlay` в click-through CSS (тем же способом, что shepherd/giveaway;
«Accept All» НЕ жмём — не принимаем необязательные cookie). Покрывает ВСЕ game-panel страницы
(общая база). files.recycle 1/1. ⚠️ Storefront cky (если появится) уже ловится
`CookieBanner.dismissAll` (`button:has-text("Accept All")`).

## Сессия 23-Jul — прод-регресс (не флак): переделали шапку, пропал ценник валюты

`locale.spec.ts › @regression TC-LOC-003` шаг «базовая цена видна с символом валюты»:
`.main-header__games-tariff__price-discount` → element not found (стабильно 3/3, «вчера ок»).

**Корень (live-recon 23-Jul):** прод переделал шапку — блок `.main-header__games-tariff` **удалён
целиком**. Цены игр теперь рендерятся в хедер-меню как `.header-menu__subitem-game__captions-price`
(«Starting at €5.11») — Playwright-visible сразу, без ховера; это единственные видимые цены с
символом валюты на главной. Фикс ([`LOCALE_SWITCHER.samplePrice`](../utils/selectors.ts)): селектор
→ `.header-menu__subitem-game__captions-price` (мобильный вариант — отдельный класс `__mobile__`,
не матчит). Интент теста сохранён (цена с символом валюты видна). locale 3/3.

⚠️ Третий подряд прод-регресс за неделю от редизайнов storefront (seed-кнопка 22-Jul, cky-баннер
22-Jul, шапка 23-Jul) — все ловились live-recon'ом «вчера ок → сегодня стабильный fail = прод».

## Сессия 05-Aug — Inc 6-виджет докатился до модед-калькулятора (12 тестов легли)

Прод заменил Vuetify `#plan-calculator` новым веб-компонентом `<plan-calculator-widget>` (Inc 6,
открытый Shadow DOM, без Vuetify) — старый `[role="slider"]` исчез → `PlanCalculator.waitMounted`
таймаутил 30с → легли ВСЕ 12 тестов через PlanCalculator (slider.modded, modpack.config.modded,
funnel.modded, cart.modded-new, smoke.pages). **Не A/B и не USA-IP** (воспроизводится 100% локально);
409/429 в консоли — посторонние (ipapi/redtrack). Live-recon подтвердил полную раскатку.

Миграция page objects (Playwright пробивает открытый Shadow DOM обычными CSS):
- `PlanCalculator.sliderThumb` = `[role="slider"], input[type=range].ui-slider__input` (seed остался
  Vuetify 0..100, modded — НАТИВНЫЙ range 0..N дискретно); `readSlider` ветвится (input.value vs aria-*).
- `ModdedHostingPage`: модпак `.ui-autocomplete__trigger` (опции `.ui-autocomplete__option`), версия
  `.ui-select__trigger`, quick-pick `.ui-button--chip`. CTA `a.plan-calculator__checkout__button`,
  цена `.plan-calculator__pricing__price__value(--old)`, grid `.modpacks-body__install`,
  скрытый `#planCalculatorFieldPlayersCount` — КЛАССЫ/ID СОХРАНИЛИСЬ (в shadow), не менял.
- `slider.modded`: ассерты 0..100 → динамический `max` (слайдер стал 0..8 дискретный); quick-pick тест
  — modpackId теперь ЧИСЛОВОЙ (`curseforge:925200:…`), выбор target по имени не работает → кликаем
  quick-pick'и, пока modpackId не сменится.

Проверено: slider.modded 5/5, modpack.config 3/3, funnel.modded 2/2, cart.modded-new 4/4, smoke 4/4; tsc 0.
⚠️ Сид-калькулятор (`#seed-calculator`) НЕ мигрирован (всё ещё Vuetify). Отдельно: `slider.seed:84` —
слайдер двигается (aria 0→100), но productId фиксирован (715) min↔max для sky-haven → либо сид стал
одно-тарифным (ассерт устарел), либо прод-баг; нужен risk-decision владельца (не чинил).
