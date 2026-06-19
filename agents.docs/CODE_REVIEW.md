# CODE REVIEW — godlike.host E2E Suite

> **Дата ревью:** Май 2026 · обновлено 03-Jun-2026
> **Охват:** vps/panel/, general/ — полное ревью; funnels/, modded/ — не ревьюировались

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
