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

Запуск по тегу:

npx playwright test --grep @smoke      # только critical path
npx playwright test --grep @critical   # важные флоу
npx playwright test --grep @regression # всё

5.6 Serial mode для stateful тестов
// Если тесты меняют состояние сервера — они ДОЛЖНЫ быть serial
test.describe.configure({ mode: "serial" });

Параллельные тесты только для независимых read-only проверок.

6. Иерархия файлов
@smoke       — самый быстрый критический путь (3–5 тестов)
             — логин работает, дашборд загружается, список серверов открывается
@critical    — основные user stories (всё что ломает бизнес при падении)
             — shutdown/boot, rebuild, изменение hostname
@regression  — полное покрытие, включая edge cases и negative сценарии
             — невалидный промокод, отмена действий, сохранение без изменений

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

Воронки покупки (`/cart/`, `/cart-vps/`) — Vue SPA, загружаемые динамически.
Отличаются от panel-тестов: нет изменения состояния сервера, нет serial mode.

9.1 Архитектура: изолированные vs shared контекст

Для воронок используется **изолированный** подход по умолчанию:

```typescript
// Каждый тест создаёт свой контекст из сохранённого storageState
test('проверка', async ({ browser }) => {
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();
  // ...
  await context.close();
});
```

Логин выполняется **один раз** в `beforeAll` и сохраняется в `storageState.vps.json`.
Это позволяет каждому тесту стартовать с авторизованной сессией без повторного логина.

> Для оптимизации (когда все тесты проверяют один шаг воронки) можно использовать
> shared page через `serial` mode — но это не обязательно, если тестов немного.

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
