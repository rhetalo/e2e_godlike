---
name: godlike-e2e-conventions
description: >-
  Конвенции e2e-тестов репо godlike на одной странице: импорт, Page Objects, селекторы,
  test.step, теги, данные, ожидания, live-prod ограничения и гочи по продуктам (витрина,
  игровая панель, VPS). Загружай ПЕРЕД тем, как писать, генерировать или чинить спек,
  а также при ревью черновиков от Playwright Test Agents (Generator / Healer). Триггеры:
  «напиши тест», «новый спек», «сгенерируй тест», «почини тест», «ревью теста»,
  «приведи к конвенциям», «черновик от агента».
---

# godlike e2e - конвенции на одной странице

Выжимка из `CLAUDE.md` (контракт), `agents.docs/ARCHITECTURE.md` (переиспользование) и
`agents.docs/TEST_GUIDELINES.md` (как писать). При расхождении прав `CLAUDE.md`. Подробности - там.

## 0. Перед кодом

1. **Искать, не дублировать:** `tests/**`, `pages/*.ts`, `components/*.ts`, `fixtures/*`, `utils/selectors.ts`.
   Есть похожее - **расширяем** (новый метод в существующий PO), второй PO/хелпер/селектор на то же - нельзя.
2. **Прочитать страницу фичи в KB:** `kb/products/<prod>/<feature>.md` - API, гочи, «что не жать». Термины - `kb/glossary.md`.
3. Новая абстракция (папка, класс, утилита) - только с обоснованием в плане и оком владельца.

## 1. Каркас спека

| Что | Правило |
|---|---|
| Папка и имя | `tests/<domain>/<feature>.spec.ts`, ≤ ~300 строк |
| Импорт | витрина (`godlike.host`): `import { test, expect } from "../../fixtures/base";` - гасит CookieYes / flash-sale и пиннит A/B Amplitude. Панели: можно `@playwright/test`, но навигация через PO |
| UI | только через Page Object / Component. **Сырых локаторов в спеке нет** (ESLint предупреждает). Нужен локатор - в PO, селектор - в `utils/selectors.ts` с датированным комментарием |
| Селекторы | приоритет: стабильный id → BEM → семантические атрибуты → роли. Не `:nth-child`, не `data-v-*`, по возможности не `:has-text()` |
| Ассерты | только в спеке, внутри `test.step("...")`. PO и компоненты возвращают состояние, `expect` не вызывают |
| Теги | `@smoke` / `@critical` / `@regression` (на тесте или на `describe`, если весь файл одного класса); `@flaky` - карантин с комментарием «почему» |
| Язык | названия тестов и шагов - по-русски; UI-лейблы, ID кейсов (`TC-GP-*`), теги - как есть |
| Данные | URL, UUID, учётки, списки - из `fixtures/test-data.ts` / `utils/*` (`process.env.X ?? fallback`). В теле спека не хардкодим |
| Каждый тест | минимум один `expect`; проверяет результат действия, а не «кнопка видна» |
| Контракт API | схемой из `utils/schemas/` по всем элементам: `expect(schemaIssues(Schema, json)).toEqual([])`; новые схемы - по живому ответу (проба), контракт строго, оформление `nullable` |

## 2. Ожидания и стабильность

- Только web-first: `expect(locator).toBeVisible/...`, `locator.waitFor({ state })`, `expect.poll(...)`.
  **`waitForTimeout` нельзя** (исключения: краулер `valid.links`, второй проход баннеров в `fixtures/base.ts`).
- **`networkidle` не ждать** на страницах панели (живой WebSocket) - ждать конкретный ответ:
  `page.waitForResponse(...)`, слушатель ставить **до** действия.
- Условный пропуск - только `test.skip(cond, "причина")`. Никаких `if (...) return` и `.catch(() => false)`-гейтов.
- URL **не сравнивать строго**: прод дописывает `?rtkcid=…` и параметры Amplitude - regex.
- Количество - структурно: «не меньше N», а не «ровно N» (каталоги растут).
- Валюта и цена зависят от IP (из UA - UAH): не завязываться на €/$ - список в `StorefrontCurrencies`.
- Новый тест перед коммитом - burn-in: `--repeat-each=5..10 --retries=0`, параллельно с другим прогоном - со своим `--output`.

## 3. Live production - что нельзя

Тесты идут на **живом проде**, общий аккаунт.
- Не жать: оплату (кроме санкционированного `funnel.with.credit.check`), Order Now, Request Withdrawal, Send Invite (реальное письмо),
  Reinstall / Restore / установку модпака без ока, Generate SFTP-пароля, Upgrade в окнах апгрейда.
- Мутации - только **self-cleaning** (создал → проверил → вернул), stateful-панель - `test.describe.configure({ mode: "serial" })`
  + `afterAll` с восстановлением (`test.setTimeout(180s)` + `ensureOffline(90s)`).
- Серверы - только из `kb/registry/test-servers.md`; идентичность по UUID, не по имени.

## 4. Гочи по продуктам (короткий список, детали - KB)

**Витрина (WPGL):** Shadow DOM виджетов (калькуляторы) - локаторы Playwright пробивают, `querySelector` в evaluate - нет;
ленивые калькуляторы оживают после движения мыши; смена валюты в headless не видна; `.first()` по классу хрупок
(на сиде BUY = `#cartDefaultBtn`). → `kb/products/wpgl/README.md#гочи-для-тестирования`

**Игровая панель (UP):** оверлеи ловят клики (shepherd-тур, giveaway) - гасятся в `GamePanelBasePage.open()`;
статусы не реактивны (бэкап, роль) - reload + poll; консоль = xterm, адрес читать из `.roadmap-ip`;
short vs full UUID для части API; Pennant-флаги считаются по владельцу сервера; `power.start` не пишется в Audit Log.
→ `kb/products/up/README.md#сквозные-гочи`, `kb/products/up/modals.md`

**VPS (VirtFusion):** DOM «врёт» - закрытые модалки в разметке: модалки только `.modal.show`, кнопки `:not([data-bs-dismiss="modal"])`,
всегда гейт `toBeVisible`; статус только через `getStatusText()` (регистр плавает); скрытые radio - `dispatchEvent('click')`.
→ `kb/products/vps/README.md#гочи-для-тестирования`, `TEST_GUIDELINES.md` §7

## 5. Ревью черновика (свой или от Playwright Test Agents)

Прогнать по чек-листу, прежде чем черновик уйдёт из `tests/agents-pilot/` в рабочую папку:
- [ ] импорт `fixtures/base` (витрина) / навигация через PO (панели)
- [ ] ни одного сырого локатора в спеке, новые селекторы в `selectors.ts`
- [ ] нет захардкоженных URL и данных
- [ ] ассерты в `test.step`, есть тег, у каждого теста есть `expect`
- [ ] нет `waitForTimeout`, `networkidle`, строгого сравнения URL, «ровно N»
- [ ] ничего из раздела 3 не нажимается
- [ ] проверяется **видимое пользователю** (не `toBeAttached` на спрятанном элементе)
- [ ] ожидаемые значения не подогнаны под текущее поведение прода (если тест «починили» правкой ожидания - это кандидат в баг, а не фикс)
- [ ] `npx tsc --noEmit` = 0, `npm run lint` = 0 (храповик D-021: любое новое warning/error валит гейт; почистил легаси → `npm run lint:prune`), burn-in зелёный

Пример полного цикла: `agents.docs/PLAYWRIGHT_AGENTS_PILOT.md` (черновики → `tests/general/games.catalog.spec.ts`).
