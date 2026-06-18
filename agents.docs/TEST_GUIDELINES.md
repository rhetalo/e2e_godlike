Руководство по написанию E2E тестов
Это живой документ. Если правило не работает на практике — обновляй его.

1. Главный принцип
Каждый тест = один пользовательский сценарий, проверяющий бизнес-результат.

Не «кнопка видна», а «пользователь может выключить сервер и он действительно выключится».
Не «модал открылся», а «отмена действия не меняет состояние сервера».

2. Что НЕЛЬЗЯ писать
Антипаттерн     Почему плохо    Как правильно
if (!isRunning) return  Тест молча пропускается — ложное ощущение покрытия      beforeEach → ensureRunning()
expect(button).toBeVisible() как единственная проверка  Проверяет вёрстку, не поведение Проверяй результат действия
Тест открывает страницу и ничего не делает      Это smoke, не E2E       Или делай полный флоу, или не пиши
console.log как замена expect   Тест не падает при реальной проблеме    Используй жёсткий expect
Отдельный тест на «заголовок модала»    Это деталь реализации   Включи в тест самого действия
Несколько context.newPage() в одном describe    Медленно, дорого        Shared context через beforeAll
3. Структура файла
tests/
  vps.panel.power.e2e.spec.ts    ← по USER STORY, не по компоненту
  vps.panel.rebuild.e2e.spec.ts
  funnel.game-server.e2e.spec.ts

Один файл = один user story или одна фича.
Не «все тесты для Options tab», а «пользователь меняет hostname» и «пользователь сбрасывает пароль».

4. Шаблон теста
test("Пользователь выключает работающий сервер через Shutdown", async () => {
  // Шаги — видны в HTML-отчёте Playwright
  
  await test.step("Открываем страницу сервера", async () => {
    await serverPage.goto();
    expect(serverPage.page.url()).toContain(TEST_SERVER_UUID);
  });
  await test.step("Проверяем начальное состояние: сервер Running", async () => {
    expect(await serverPage.getStatusText()).toContain("Running");
    await expect(serverPage.shutdownButton).toBeEnabled();
  });
  const rowsBefore = await serverPage.getActivityRowCount();
  await test.step("Кликаем Shutdown → подтверждаем в модале", async () => {
    await serverPage.shutdownButton.click();
    await expect(serverPage.activeModal).toBeVisible({ timeout: 8_000 });
    // Проверяем содержимое прямо здесь — не в отдельном тесте
    const modalText = await serverPage.activeModal.innerText();
    expect(modalText).toContain("Are you sure you want to shutdown this server?");
    await serverPage.shutdownConfirmButton.click();
  });
  await test.step("Ждём регистрации задачи в activity table", async () => {
    await serverPage.waitForNewActivityRow(rowsBefore, 15_000);
    expect(await serverPage.getLatestTaskName()).toBe("Shutdown");
  });
  await test.step("Ждём завершения Shutdown (до 90 сек)", async () => {
    await serverPage.waitForLatestTaskComplete(90_000);
    const progress = await serverPage.latestTaskProgressBar.getAttribute("aria-valuenow");
    expect(progress).toBe("100");
  });
  await test.step("Финальная проверка: статус = Stopped", async () => {
    await serverPage.waitForStatus("Stopped", 30_000);
    expect(await serverPage.getStatusText()).toContain("Stopped");
  });
  await test.step("Проверяем кнопки при Stopped: Boot активен, остальные — нет", async () => {
    await expect(serverPage.bootButton).toBeEnabled({ timeout: 5_000 });
    await expect(serverPage.shutdownButton).toBeDisabled();
  });
});

5. Правила
5.1 Каждое утверждение — в test.step()
// ❌ Плохо
await serverPage.goto();
expect(await serverPage.getStatusText()).toContain("Running");
// ✓ Хорошо
await test.step("Страница загружена, сервер Running", async () => {
  await serverPage.goto();
  expect(await serverPage.getStatusText()).toContain("Running");
});

Шаги видны в HTML-отчёте при падении — сразу понятно на каком именно шаге тест упал.

5.2 Предусловия — в beforeEach, не в теле теста
// ❌ Плохо
test("выключаем сервер", async () => {
  if (!await serverPage.isRunning()) {
    console.log("not running, skip");
    return;
  }
  // ...
});
// ✓ Хорошо
test.beforeEach(async () => {
  await serverPage.ensureRunning(60_000); // всегда, без условий
});
test("выключаем сервер", async () => {
  // состояние гарантировано
});

5.3 Один тест = полный сценарий, включая очистку
test("Пользователь меняет Hostname и сохраняет", async () => {
  const originalHostname = await optionsPage.getHostnameValue();
  
  await test.step("Меняем hostname", async () => {
    await optionsPage.hostnameInput.fill("test-hostname-123");
    await optionsPage.saveButton.click();
  });
  
  await test.step("Проверяем что сохранилось", async () => {
    await page.reload();
    expect(await optionsPage.getHostnameValue()).toBe("test-hostname-123");
  });
  
  await test.step("Восстанавливаем оригинальный hostname", async () => {
    await optionsPage.hostnameInput.fill(originalHostname);
    await optionsPage.saveButton.click();
  });
});

5.4 Не проверяй CSS-классы — проверяй поведение
// ❌ Плохо — деталь реализации
expect(confirmClass).toContain("btn-danger");
// ✓ Хорошо — поведение
// (кнопка кликабельна, и после клика происходит реальное действие)
await expect(rebuildConfirmButton).toBeEnabled();

Исключение: если CSS-класс == бизнес-смысл (например badge-active = задача завершена).

5.5 Теги
test("@smoke Пользователь логинится", async () => { ... });
test("@critical Сервер выключается через Shutdown", async () => { ... });
test("@regression Отмена Shutdown не меняет статус", async () => { ... });

Допустимая альтернатива (узаконено 16-Jun-2026): если ВЕСЬ файл/`describe` одного класса,
тег ставится на `describe`, а не дублируется в каждый `test()` — `--grep` ловит его через
title-path Playwright. Смешивать в одном `describe` тесты разных тегов нельзя — тогда тег
обязателен на каждом `test()`.

```typescript
test.describe("@regression [game-panel] Tasks", () => {   // тег на describe — ок
  test("TC-GP-TASK-001 | дефолтные задачи присутствуют", async () => { ... });
});
```

Запуск по тегу:

npx playwright test --grep @smoke      # только critical path
npx playwright test --grep @critical   # важные флоу
npx playwright test --grep @regression # всё

5.6 Serial mode для stateful тестов
// Если тесты меняют состояние сервера — они ДОЛЖНЫ быть serial
test.describe.configure({ mode: "serial" });

Параллельные тесты только для независимых read-only проверок.

5.7 Карантин флоки (@flaky) — узаконено 17-Jun-2026
Источник практики: статьи «Почему E2E флакают» (testops_tms) + «5 ошибок в E2E» (OTUS).
Принцип: «сначала трекинг, потом устранение». Нестабильный тест НЕ удаляем и НЕ глушим
`.skip()` — помечаем `@flaky` и выводим из гейтящего прогона в отдельную очередь, где он
виден как долг, а не маскируется.

Когда ставить `@flaky`:
- тест падает «через раз» без изменений в коде/проде (transient), а не из-за реального бага;
- Playwright в CI отметил его flaky (прошёл только на retry — `retries: 2` в CI);
- причина пока не локализована (известные кандидаты: Vue-гидрация, headless-валюта,
  panel teardown timeout — см. соответствующие записи памяти/доков).

Что обязательно рядом с тегом:
- однострочный комментарий ПОЧЕМУ флоки + ссылка на причину/тикет;
- запись в backlog (test-docs/README.md → «Флоки-карантин»), чтобы долг не потерялся.

Запуск:
npm run test:quarantine   # только @flaky — гоняем отдельно, не блокирует мерж
npm run test:stable       # всё, КРОМЕ @flaky — кандидат на гейтящий прогон CI

Цель — пустой карантин: либо чиним и снимаем тег, либо подтверждаем реальный баг и
заводим bug-report. `@flaky` — это TODO с дедлайном, а не постоянное место жительства теста.

6. Иерархия файлов
@smoke       — самый быстрый критический путь (3–5 тестов)
             — логин работает, дашборд загружается, список серверов открывается
@critical    — основные user stories (всё что ломает бизнес при падении)
             — shutdown/boot, rebuild, изменение hostname
@regression  — полное покрытие, включая edge cases и negative сценарии
             — невалидный промокод, отмена действий, сохранение без изменений
@flaky       — нестабильный тест на карантине (проходит «через раз»), исключается из
             — гейтящего прогона и гоняется отдельно (npm run test:quarantine). Видимый
             — долг, а не маскировка — правила и процесс см. 5.7.

7. VirtFusion-специфичные gotchas

7.1 Статус сервера — ВЕРХНИЙ РЕГИСТР
VirtFusion может возвращать статус в капслоке: "RUNNING", "STOPPED".
Никогда не сравнивай innerText() напрямую с "Running" — это сломается.

// ❌ Плохо — ломается когда VirtFusion возвращает "RUNNING"
const text = await page.locator("div.p-3").innerText();
expect(text).toContain("Running"); // false!

// ✓ Хорошо — всегда через getStatusText() который нормализует регистр
const status = await serverPage.getStatusText(); // всегда "Running" или "Stopped"
expect(status).toContain("Running");

getStatusText() в VpsPanelServerPage нормализует любой вариант через /running/i regex.
Правило: статус читаем только через getStatusText(), не через innerText() напрямую.

7.2 Кнопка Boot — ВСЕГДА в DOM, просто disabled
Boot button присутствует в DOM при любом состоянии сервера.
При Running: disabled. При Stopped: enabled.
Проверяй через isEnabled(), не через isVisible().

7.3 Bootstrap модалы — HTML всегда в DOM (display:none, не удалён)
VirtFusion использует Bootstrap. Все модалы рендерятся в DOM при загрузке страницы.
button:has-text("Shutdown") может найти кнопку ВНУТРИ скрытого модала, а не на странице.

// ❌ Плохо — найдёт скрытую кнопку в модале:
page.locator('button:has-text("Shutdown")').first()

// ✓ Хорошо — исключаем кнопки внутри модалов:
page.locator('button:has-text("Shutdown"):not([data-bs-dismiss="modal"])').first()

// ✓ Для confirm-кнопки внутри открытого модала:
page.locator('.modal.show button.btn-primary:has-text("Shutdown")').first()

Правило: power-кнопки всегда с :not([data-bs-dismiss="modal"]), confirm-кнопки всегда с .modal.show.

7.4 Activity table: debug-строки — id на <td>, не на <tr>
VirtFusion рендерит скрытые строки-лоадеры между задачами.
id="debugNNNN" сидит на <td> внутри <tr>, а не на самом <tr>.

// ❌ Плохо — tr:not([id^='debug']) не работает, id на td а не tr:
"table.table.table-normal tbody tr:not([id^='debug'])"

// ✓ Хорошо — исключаем tr содержащие td с таким id:
"table.table.table-normal tbody tr:not(:has(td[id^='debug']))"

Правило: перед написанием селектора — смотреть в DevTools на каком элементе атрибут.

7.5 Кастомные radio-tile: input скрыт — ни .check() ни force:true не помогут
VirtFusion использует кастомный UI для radio-кнопок (плитки с иконками).
Реальный <input> CSS-скрыт (display:none / opacity:0 / position absolute за пределами).

.check()               — падает: "element is not visible" (таймаут)
.check({force:true})   — тоже падает: force обходит visibility check, но Playwright
                         всё равно пытается прокрутить элемент в область видимости
                         ("scrolling into view if needed") — и падает на этом шаге.

Единственное рабочее решение: dispatchEvent('click')
  Синтетический click — никаких actionability проверок, никакого скролла.

// ❌ Плохо — таймаут "element is not visible":
await page.locator('input.radio-button[value="2"]').check();

// ❌ Тоже плохо — падает на "scrolling into view":
await page.locator('input.radio-button[value="2"]').check({ force: true });

// ✓ Правильно — dispatchEvent('click') + verify:
await page.locator('input.radio-button[value="2"]').dispatchEvent("click");
await expect(page.locator('input.radio-button[value="2"]')).toBeChecked({ timeout: 5_000 });

// ✓ Лучше — инкапсулировать в Page Object:
async selectCDDVD(): Promise<void> {
  await this.cdDvdRadio.dispatchEvent("click");
  await expect(this.cdDvdRadio).toBeChecked({ timeout: 5_000 });
}

Правило: для любого CSS-скрытого input (radio, checkbox) использовать dispatchEvent('click'),
не .check() и не .check({force:true}).

8. Что НЕ является E2E тестом
Следующее не нужно тестировать отдельными тестами — это детали реализации:

❌ «Кнопка X видна на странице» → включи как проверку внутри настоящего теста
❌ «Модал содержит текст Y» → проверяй в тесте самого действия через этот модал
❌ «URL содержит UUID после перехода» → проверяй как часть навигационного теста
❌ «Таблица имеет заголовки Task, Requested...» → структура, не поведение
Правило: если тест не выполняет реальное пользовательское действие — это не E2E тест.

8. Шаблон нового spec-файла
/**
 * vps.panel.FEATURE.e2e.spec.ts
 *
 * User story: [описание что делает пользователь]
 *
 * Покрытые сценарии:
 *   - Happy path: [основной флоу]
 *   - Negative: [что происходит при ошибке/отмене]
 *   - Edge case: [крайние случаи]
 */
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { VpsPanelServerPage } from "../pages/VpsPanelServerPage";
import { loginAndSaveSession, STORAGE_STATE_PATH, TEST_SERVER_UUID } from "../utils/auth";
test.use({ viewport: { width: 1440, height: 900 } });
test.describe.configure({ mode: "serial" }); // если тесты stateful
let sharedContext: BrowserContext;
let serverPage: VpsPanelServerPage;
test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await loginAndSaveSession(browser);
  sharedContext = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await sharedContext.newPage();
  serverPage = new VpsPanelServerPage(page, TEST_SERVER_UUID);
});
test.afterAll(async () => {
  await sharedContext.close();
});
test.beforeEach(async () => {
  await serverPage.goto();
  await serverPage.ensureRunning(60_000); // или ensureStopped — зависит от сценария
});
// ── Тесты ────────────────────────────────────────────────────────────────────
test("@critical Пользователь делает X и получает результат Y", async () => {
  await test.step("Шаг 1: ...", async () => { ... });
  await test.step("Шаг 2: ...", async () => { ... });
  await test.step("Проверка результата: ...", async () => { ... });
});
---

9. Funnel/Storefront — специфичные паттерны

Воронки покупки (`/cart/`, `/cart-vps/`, `/mobile-cart/`) — Vue SPA, загружаемые
динамически. Мутации сервера здесь нет, но при нескольких проверках **одного шага**
воронки применяется **serial mode + shared page** (см. 9.1).

9.1 Архитектура: shared session (serial) vs изолированный контекст

Логин выполняется **один раз** в `beforeAll` и сохраняется в `storageState.vps.json` /
`storageState.mobile.json` — каждый тест стартует авторизованным без повторного логина.

**Когда несколько тестов проверяют один и тот же шаг воронки** (billing / configure /
мобильная корзина) — используем **serial mode + одну общую страницу**: контекст и
первичная навигация выполняются один раз в `beforeAll`, сценарии переиспользуют одну
живую страницу (раньше каждый тест поднимал свой контекст и навигировал заново). Так
сделано в `vps.funnel.billing`, `vps.funnel.configure`, `funnel.mobile`.

```typescript
test.describe.configure({ mode: "serial" });

test.describe("...", () => {
  let context: BrowserContext;
  let cart: CartBillingPage;

  test.beforeAll(async ({ browser }) => {
    await loginVpsSession(browser);              // логин 1 раз
    context = await newPinnedContext(browser);   // контекст 1 раз
    const page = await context.newPage();
    cart = new CartBillingPage(page);
    await deployFirstPlan(page);                  // навигация 1 раз
    await cart.billing.container.waitFor({ state: "visible" });
  });
  test.afterAll(async () => { await context.close(); });

  test("сценарий 1", async () => { /* test.step(...) по общей странице cart */ });
  test("сценарий 2", async () => { /* ... */ });
});
```

⚠️ Цена shared page — **порядко-зависимость**: страница живёт между тестами, поэтому
проверки «свежего» состояния (цена $0, дропдаун заблокирован до выбора, дефолтный тип ОС)
валидны только в первом сценарии — выноси их туда и не повторяй ниже.

**Изолированный контекст на тест** оправдан, только если тест единственный в файле или
его предмет = сама навигация со свежего лендинга (как было в удалённом
`vps.funnel.landing`, чьи проверки свёрнуты в `vps.funnel.happy-path`).

9.2 Ожидание Vue SPA

После клика Deploy Now / перехода в корзину — SPA монтируется асинхронно.
**Всегда** дожидайся монтирования перед любыми действиями:

```typescript
// ✓ Ждать Vue root element
await page.locator("[data-v-app]").waitFor({ state: "visible", timeout: 15_000 });

// ✓ Ждать конкретный контейнер шага
await page.locator(".billing-cycle").waitFor({ state: "visible", timeout: 15_000 });
await page.locator(".configure-server__locations").waitFor({ state: "visible", timeout: 15_000 });
```

9.3 Custom Dropdown (выбор версии ОС)

В VPS Configure используется кастомный Vue-дропдаун (`.custom-dropdown`).
Клик на хедер открывает список, клик на item выбирает значение.
Обычный `<select>` здесь не используется.

```typescript
// Открыть дропдаун
await page.locator(".custom-dropdown__selected").click();
await page.waitForTimeout(300);

// Выбрать item по тексту
await page.locator(".custom-dropdown__item").filter({ hasText: "Ubuntu 22.04 LTS" }).click();

// Прочитать текущее выбранное значение
const current = await page.locator(".custom-dropdown__selected-content span").innerText();
```

Дропдаун появляется **только** когда выбранный тип ОС имеет несколько версий.
`WordPress on Ubuntu` — единственный тип без дропдауна (одна версия, нет выбора).

Проверка наличия дропдауна:
```typescript
// Если тип имеет версии — дропдаун виден
await expect(config.osDropdown).toBeVisible();

// Если тип без версий (WordPress on Ubuntu) — дропдаун не виден
await expect(config.osDropdown).not.toBeVisible();
```

9.4 Точное совпадение при фильтрации OS-карточек

Фильтрация через `hasText` может дать несколько результатов, если текст подстрока другого.

```typescript
// ❌ Плохо — 'Ubuntu' матчит и "Ubuntu" и "WordPress on Ubuntu" → strict mode violation
page.locator(".configure-server__type").filter({ hasText: "Ubuntu" })

// ✓ Правильно — фильтровать по точному тексту заголовка .configure-server__type_title
page.locator(".configure-server__type").filter({
  has: page.locator(".configure-server__type_title", {
    hasText: new RegExp(`^Ubuntu$`), // ^ и $ — точное совпадение
  }),
})
```

Правило: при фильтрации карточек, тегов, опций — всегда используй `^text$`
если текст может быть подстрокой другого элемента.

9.5 Отдельные storageState-файлы

Panel-тесты и funnel-тесты используют **разные** storageState:
- `storageState.json` — VirtFusion панель (`vf-panel.godlike.host`)
- `storageState.vps.json` — VPS воронка (`godlike.host`)

Не перепутывай — домены и сессии разные.

9.6 expect.poll() — правильный способ ждать динамические значения

Используй `expect.poll()` вместо `waitForTimeout()` везде, где значение обновляется асинхронно.
Подходит для: цен, статусов, счётчиков, любых реактивных данных в Vue/React.

```typescript
// ❌ Плохо — waitForTimeout: слепое ожидание, может быть слишком коротким или долгим
await page.waitForTimeout(1000);
const price = await cart.getTotalPrice();
expect(parsePrice(price)).toBeGreaterThan(0); // упадёт если ещё не загрузилось

// ❌ Плохо — прямая проверка без ожидания: упадёт сразу если значение ещё 0
const price = await cart.getTotalPrice();
expect(parsePrice(price)).toBeGreaterThan(0);

// ✓ Правильно — poll крутит функцию пока условие не выполнится или timeout не истечёт
await expect.poll(async () => {
  const price = await cart.getTotalPrice();
  return parsePrice(price);
}, { timeout: 5000 }).toBeGreaterThan(0);
```

**Двухшаговый паттерн** — poll не возвращает значение, читай отдельно после:

```typescript
// Шаг 1: ждём пока значение станет валидным
await expect.poll(async () => {
  const price = await cart.getTotalPrice();
  console.log(`[DEBUG] price: ${price}`); // видно каждую попытку в логах
  return parsePrice(price);
}, { timeout: 5000 }).toBeGreaterThan(0);

// Шаг 2: читаем значение (уже точно готово)
const actualPrice = parsePrice(await cart.getTotalPrice());
```

**Настройка интервалов** для быстрых реакций UI:

```typescript
await expect.poll(async () => {
  return parsePrice(await cart.getTotalPrice());
}, {
  timeout: 5000,
  intervals: [300, 500, 1000], // сначала быстро, потом реже
}).toBeGreaterThan(basePrice);
```

**Когда использовать:**

| Ситуация | Паттерн |
|----------|---------|
| Цена обновляется после выбора игры/тарифа/периода | `poll(() => parsePrice(el))` |
| Статус сервера меняется (RUNNING → STOPPED) | `poll(() => getStatusText())` |
| Счётчик строк в activity table растёт | `poll(() => rows.count())` |
| Дропдаун заполняется после выбора игры | `poll(() => options.count())` |

**Когда НЕ нужен:**

- Элемент просто появляется/исчезает → `waitFor({ state: 'visible' })`
- Статичный текст на странице → обычный `expect(el).toBeVisible()`
- Встроенные Playwright-ретраи уже покрывают случай → `toBeVisible`, `toContainText`

9.7 parsePrice — надёжная версия

Используй эту версию — работает с любой валютой (€, $) и с целыми ценами:

```typescript
function parsePrice(priceStr: string): number {
  const normalized = priceStr.replace(",", "."); // для европейских форматов
  const m = normalized.match(/[\d]+(\.\d+)?/);  // матчит "6" и "6.29"
  return m ? parseFloat(m[0]) : NaN;
}
```

Избегай: `/[\d]+\.[\d]+/` — не матчит целые числа, сломается если цена без копеек.

9.8 test.skip() — правильный способ условного пропуска теста

Если тест зависит от внешнего условия (сервер запущен, страница доступна, фича включена),
используй `test.skip()`, а не `if (!condition) return` — иначе тест молча зеленеет.

```typescript
// ❌ АНТИПАТТЕРН — тест проходит даже если navigation полностью сломана
const { navigated } = await openRebuildPage(browser);
if (!navigated) {
  console.log("[INFO] skip");
  await context.close();
  return; // ← тест GREEN, но ничего не проверялось
}

// ✓ ПРАВИЛЬНО — тест помечается orange/skipped, видно в отчёте
const { navigated } = await openRebuildPage(browser);
test.skip(!navigated, "Rebuild page not reachable — server may be stopped");
// После test.skip() выполнение останавливается если условие true
// В отчёте: "skipped" с причиной — явно и честно
```

**Разница в отчёте:**

| Подход | Статус в Playwright | Видно ли проблему? |
|--------|--------------------|--------------------|
| `return` | ✅ PASSED (зелёный) | ❌ Нет — ложная уверенность |
| `test.skip()` | ⏩ SKIPPED (оранжевый) | ✅ Да — видно что не выполнялось |
| `expect(cond).toBe(true)` | ❌ FAILED (красный) | ✅ Да — явный сигнал о проблеме |

**Когда что использовать:**

- `test.skip(cond, reason)` — условие зависит от внешней среды (сервер выключен, фича за флагом)
- `expect(cond).toBeTruthy()` — условие должно всегда выполняться (навигация сломана = баг)
- `return` — **никогда** в теле теста. Если нужно выйти — это либо skip, либо fail.

9.9 Rebuild page — подтверждённые селекторы (май 2026)

Данные получены из живого HTML DevTools. Предыдущие предположения были ошибочными.

**OS card selection:**
```typescript
// ❌ НЕВЕРНО — этот класс НИКОГДА не появляется при выборе
div.card.os-select.card-inverted-big-border-os

// ✓ ВЕРНО — при клике по карточке ДОБАВЛЯЮТСЯ эти классы
// (card-not-inverted-big-border-os ОСТАЁТСЯ на карточке)
div.card.os-select.selected-card        // ← правильный селектор "выбранная карточка"
// + border-success + shadow-sm
// + появляется div.position-absolute.card-selected > svg (чекмарк)
```

**Install button:**
```typescript
// Отсутствует в DOM до выбора ОС (не disabled, а просто не рендерится)
// После выбора ОС — появляется с текстом "Install with {OS Name}"
get finalInstallButton(): Locator {
  return this.page.locator("button.btn-primary.btn-lg").filter({ hasText: /Install with/ });
}
// Тест: до выбора → isVisible() === false; после → toBeVisible() + text contains OS name
```

**Accordion groups (6 штук, heading-0..heading-5):**
```
AlmaLinux (heading-0) | CentOS (heading-1) | Debian (heading-2)
Fedora (heading-3)    | Games (heading-4)  | Ubuntu (heading-5)  ← часто забывают!
```

**Swap Space** (появляется после выбора ОС):
```typescript
get swapSpaceCards(): Locator {
  return this.page.locator("div.card.card-not-inverted-big-border.c-pointer");
}
```

9.10 Обход A/B-экспериментов Amplitude (storefront) — обязательно для воронок

godlike.host гоняет Amplitude Experiment SDK. Вариант назначается по случайному
device id на каждый свежий контекст → форма URL корзины (`/cart-vps?…` vs
`/cart-vps/?…`) и показ flash-sale-баннера НЕДЕТЕРМИНИРОВАНЫ → плавающие падения.

Решение: `utils/amplitude.ts` → `pinAmplitudeExperiments(context)` фиксирует
вариант (route на `…/sdk/v2/vardata` + cookie + пред-засев LS).

- Тесты на `fixtures/base` получают обход АВТОМАТИЧЕСКИ (override фикстуры `context`).
- Тесты с собственным `browser.newContext()` ОБЯЗАНЫ звать его сами, сразу после
  создания контекста (до `newPage()`):

```typescript
const context = await browser.newContext({ storageState });
await pinAmplitudeExperiments(context);   // ← до context.newPage()
const page = await context.newPage();
```

Правило: любой storefront-тест (`godlike.host`) идёт через `fixtures/base`
ЛИБО явно зовёт `pinAmplitudeExperiments(context)`. (panel-тесты `vf-panel` —
не нужно, промо туда не бьёт.)

---

10. Отчётность и стиль (CI)

10.1 Репортер. `playwright.config.ts`: в CI — `dot` (точка на тест, подробно
только падения), локально — `list`; HTML-отчёт пишется всегда (`npm run report`).
НЕ возвращай `reporter: 'html'` как единственный — он печатает строку на каждый
тест и засоряет вывод CI на больших матрицах.

10.2 Язык. Названия тестов, `describe`, `test.step` и комментарии — на русском;
технические термины, селекторы, UI-лейблы (Deploy Now, Add to Cart, Slots/RAM/Days,
Running/Stopped), ID кейсов (`TC-GP-*`) и теги (`@smoke/@critical`) — оставляем как есть.

10.3 Большие параметризованные матрицы. Если матрица даёт сотни тестов
(`game-slider`: 21 игра × N проверок), объединяй независимые READ-ONLY проверки
в один тест через `test.step` — меньше строк в CI при том же покрытии. Мутационные
проверки, которым нужно свежее состояние, оставляй отдельными тестами.
