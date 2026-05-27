# CODE REVIEW — godlike.host E2E Suite

> **Дата ревью:** Май 2026
> **Что ревьюировалось:** все файлы проекта (pages/, tests/, utils/, components/, fixtures/, конфиги)
> **Цель:** дать следующему агенту точную картину — что хорошо, что нужно исправить, что сломано

---

## Краткое резюме

Проект **хорошо структурирован** и содержит качественную документацию (TEST_GUIDELINES, AGENT_HANDOFF). Основная часть критических page objects переписана и рабочая. Главные проблемы — в spec-файлах из "первого поколения" (`vps.panel.server.spec.ts`, `vps.panel.storage.spec.ts`): они содержат антипаттерны из TEST_GUIDELINES §2, из-за которых тесты дают ложные зелёные результаты.

---

## 1. Файлы в хорошем состоянии ✅

### `pages/VpsPanelServerPage.ts` — эталон
- Все селекторы подтверждены из живого DevTools
- Полная документация VirtFusion-специфичных quirks прямо в JSDoc
- `getStatusText()` правильно нормализует RUNNING/Running/running
- Корректные локаторы кнопок питания (`:not([data-bs-dismiss="modal"])`)
- `waitForNewActivityRow()`, `waitForLatestTaskComplete()`, `ensureRunning()`, `ensureStopped()` — все паттерны правильные
- `activityRows` использует правильный фильтр `tr:not(:has(td[id^='debug']))`

### `pages/VpsPanelOptionsPage.ts` — хорошо
- Все vlang-строки задокументированы с номерами
- Все модальные локаторы правильно скоупятся на `.modal.show`
- Явное предупреждение "⚠️ Do NOT click" на `resetConfirmButton`

### `pages/VpsPanelNetworkPage.ts` — хорошо
- vlang-строки задокументированы
- `getVisibleIpAddresses()` — надёжный regex-метод

### `pages/VpsPanelStoragePage.ts` — хорошо
- Лёгкий page object, не перегружен
- vlang-строки задокументированы

### `utils/bannerHandlers.ts` — отличный паттерн
- `addLocatorHandler` — правильное решение для баннеров
- Подробная документация как добавлять новые баннеры
- `newPageWithHandlers()` — удобный хелпер

### `utils/selectors.ts` — хорошо
- Централизованный каталог CSS-селекторов
- Комментарии о приоритете (stable IDs → BEM → semantic → role)
- Покрывает все зоны: storefront, cart, billing, checkout, VPS panel

### `utils/auth.ts` — хорошо
- Константы централизованы
- `loginAndSaveSession()` правильно использует `storageState`
- Комментарий о различии между panel и VPS storefront сессиями

### `fixtures/test-data.ts` — хорошо
- Централизованные URL, Credentials, PaymentUrlPatterns
- Поддержка `process.env.GODLIKE_USER` для локального переопределения

### `tests/vps/panel/vps.panel.options.spec.ts` — хорошо (7 suite)
- 7 describe-групп с чёткой структурой
- Жёсткие `expect()` там, где элементы гарантированы
- Все модалы закрываются через Cancel — ни одно реальное действие не выполняется
- Правильный helper `openOptionsTab()` — переиспользуется во всех тестах

### `tests/vps/panel/vps.panel.network.spec.ts` — хорошо (4 suite)
- Правильная структура, хорошие проверки по vlang-строкам

---

## 2. Антипаттерны — ИСПРАВЛЕНО (май 2026) ✅

> Все пункты ниже уже исправлены. Оставлено для истории — чтобы понимать, чего **не надо** делать в новых тестах.

### `tests/vps/panel/vps.panel.server.spec.ts` — рефакторинг завершён

**Проблема 1: `if (!condition) return` вместо `test.skip()`**
```typescript
// ❌ ПЛОХО — тест зелёный, хотя реально ничего не проверил
if (!isRunning) {
  console.log("[INFO] Server not running — skipping");
  await context.close();
  return;
}
```
```typescript
// ✅ ПРАВИЛЬНО
test.skip(!isRunning, "Server is not running — prerequisite not met");
```

**Проблема 2: `console.log` вместо `expect`**
```typescript
// ❌ ПЛОХО — тест не упадёт даже если статус отсутствует
const hasAnyStatus = validStatuses.some(s => bodyText.includes(s));
console.log(`[INFO] Status in page body: ${hasAnyStatus}`);
// expect() отсутствует — тест всегда зелёный
```
```typescript
// ✅ ПРАВИЛЬНО
expect(hasAnyStatus, "Server status must be present on page").toBeTruthy();
```

**Проблема 3: Устаревший `data-action` в селекторах**
```typescript
// ❌ data-action атрибутов НЕТ на кнопках VirtFusion (подтверждено DevTools)
'button[data-action="restart_server"], button:has-text("Restart")'
// VirtFusion рендерит только text-кнопки без data-action
```
```typescript
// ✅ ПРАВИЛЬНО — только text-based селектор
'button:has-text("Restart"):not([data-bs-dismiss="modal"])'
```

**Проблема 4: Новый context на каждый тест**
```typescript
// ❌ МЕДЛЕННО — каждый из 17 тестов создаёт новый контекст
test("...", async ({ browser }) => {
  const context = await browser.newContext(...);
  // ...
  await context.close();
});
```
```typescript
// ✅ ПРАВИЛЬНО — shared context через beforeAll (как в power.actions.spec.ts)
test.describe.configure({ mode: "serial" });
let sharedContext: BrowserContext;
test.beforeAll(async ({ browser }) => {
  sharedContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
});
```

---

### `tests/vps/panel/vps.panel.storage.spec.ts`

**Проблема 1: "Проверки" без expect**
```typescript
// ❌ ПЛОХО — тест логирует но не падает
const labelVisible = await storagePage.driveLabel.isVisible().catch(() => false);
if (labelVisible) {
  console.log('[INFO] "Drive:" label confirmed ✓');
} else {
  const hasLabel = bodyText.includes("Drive:");
  console.log(`[INFO] "Drive:" in body text: ${hasLabel}`);
  // Ничего не проверяется! Тест проходит в любом случае.
}
```
```typescript
// ✅ ПРАВИЛЬНО
await expect(storagePage.driveLabel).toBeVisible({ timeout: 10_000 });
```

**Проблема 2: Те же `if(!visible) return` без `test.skip()`**

**Проблема 3: Новый context на каждый тест** (то же что в server.spec.ts)

---

### `utils/url-builder.ts` — СЛОМАН

```typescript
// ❌ Импортирует несуществующие модули
import { ENV } from '../config/env';          // файл config/env.ts НЕ СУЩЕСТВУЕТ
import type { CartQueryParams } from '../data/promo-codes'; // файл data/promo-codes.ts НЕ СУЩЕСТВУЕТ
```

**Действие:** либо создать недостающие файлы, либо удалить `url-builder.ts` если он не используется. Проверить использование:
```bash
grep -r "url-builder" tests/ pages/ utils/ --include="*.ts"
```

---

### `package.json` — устаревшие скрипты

```json
// ❌ НЕПРАВИЛЬНЫЕ пути (структура изменилась, но скрипты не обновились)
"test:panel": "npx playwright test tests/vps.panel.*.spec.ts --project=chromium",
"test:funnel": "npx playwright test tests/funnel*.spec.ts --project=chromium",
```

```json
// ✅ ПРАВИЛЬНЫЕ пути
"test:panel": "npx playwright test tests/vps/panel/ --project=chromium",
"test:funnel": "npx playwright test tests/vps/funnel/ tests/funnels/ --project=chromium",
"test:vps": "npx playwright test tests/vps/ --project=chromium",
"test:modded": "npx playwright test tests/modded/ --project=chromium",
"test:general": "npx playwright test tests/general/ --project=chromium",
```

---

### `storageState.json` в репо

Файл `storageState.json` закоммичен в репозиторий. Это проблема:
1. Файл содержит session cookies — устаревают через время
2. Нарушает security best practices

**Действие:** добавить в `.gitignore`:
```
storageState.json
storageState.*.json
```

---

## 3. Что не ревьюировалось (в порядке приоритета)

| Файл/папка | Статус | Рекомендация |
|---|---|---|
| `tests/vps/panel/vps.build.spec.ts` | ❓ не ревьюировался | Ревью |
| `tests/vps/panel/vps.panel.power.spec.ts` | ❓ не ревьюировался | Возможно дублирует `power.actions.spec.ts` |
| `tests/vps/panel/vps.panel.login.spec.ts` | ❓ не ревьюировался | Ревью |
| `tests/funnels/` (6 файлов) | ❓ не ревьюировались | Ревью на антипаттерны |
| `tests/modded/` (7 файлов) | ❓ не ревьюировались | Ревью на антипаттерны |
| `tests/general/` (4 файла) | ❓ не ревьюировались | Ревью на антипаттерны |
| `pages/CartPage.ts`, `CheckoutPage.ts` и др. | ❓ не ревьюировались | Ревью при работе с фанелями |
| `components/` (все файлы) | ❓ не ревьюировались | Ревью |

---

## 4. Рекомендуемый порядок исправлений

### Шаг 1 — Быстрые правки (низкий риск, высокий эффект)
1. Исправить скрипты в `package.json`
2. Добавить `storageState*.json` в `.gitignore`
3. Проверить использование `url-builder.ts` → удалить или починить

### Шаг 2 — Рефакторинг `vps.panel.server.spec.ts`
- Заменить все `if(!x) return` → `test.skip()`
- Добавить `expect()` туда, где только `console.log`
- Убрать `data-action` из селекторов кнопок питания
- Перевести на `shared context` + `beforeAll`

### Шаг 3 — Рефакторинг `vps.panel.storage.spec.ts`
- Те же исправления что в шаге 2

### Шаг 4 — Добавить теги `@smoke/@critical/@regression`
Большинство тестов без тегов — CI не может запускать выборочно.

### Шаг 5 — Ревью funnels/ и modded/
Проверить на те же антипаттерны: `if(!x) return`, `console.log` без `expect`.

---

## 5. Что работает хорошо и трогать не нужно

- `VpsPanelServerPage.ts` — эталонная реализация, ничего не менять
- `vps.panel.options.spec.ts` — хорошая структура, можно брать за образец
- `vps.funnel.spec.ts` — 23/23, не трогать без причины
- `vps.panel.power.actions.spec.ts` — рабочий, не трогать
- `vps.panel.media.spec.ts` — рабочий, не трогать
- `bannerHandlers.ts` — хороший паттерн, использовать везде
- `selectors.ts` — хорошая основа, дополнять при необходимости
