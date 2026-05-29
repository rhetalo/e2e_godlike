# CODE REVIEW — godlike.host E2E Suite

> **Дата ревью:** Май 2026
> **Охват:** vps/panel/, general/ — полное ревью; funnels/, modded/ — не ревьюировались

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

Единственный источник правды для storefront-учётки теперь — `fixtures/test-data.ts` → `Credentials` (с `process.env.GODLIKE_USER` override).

### waitForTimeout — убраны нетривиальные ожидания

| Файл | Было | Стало |
|---|---|---|
| `login.validation.spec.ts` | `waitForTimeout(2_000)` | `expect.poll(() => page.url(), { timeout: 2_000 })` |
| `funnel.seed.spec.ts` | `waitForTimeout(1_000)` | `waitForLoadState('networkidle')` |
| `funnel.modded.spec.ts` | `waitForTimeout(1_000)` | `waitForLoadState('networkidle')` |
| `VpsPanelRebuildPage.ts:expandAccordion` | `waitForTimeout(500)` | `expect(btn).not.toHaveClass(/collapsed/)` |
| `game-slider.spec.ts` | 2× `waitForTimeout(300)` | 1-й удалён; 2-й → `expect.poll(innerText)` |
| `valid.links.spec.ts` | 3× `waitForTimeout` | Оставлены + добавлены "Why" комментарии |

