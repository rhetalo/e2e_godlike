# Что улучшить в работе QA - ресерч 15-Oct-2026

> **В двух словах.** Поискал на GitHub и в доках, что нового появилось для e2e на Playwright, ручного
> тестирования, документации и работы с ИИ-агентом, и сверил с нашим репо. Самое ценное: свежий Playwright
> закрывает несколько наших болей (WebSocket-консоль в трейсах, `:visible`, тесты на одном сервере),
> встроенные Playwright Test Agents дают «планировщик → генератор → лекарь» прямо в Claude Code, а для
> ручных тасок есть готовая схема exploratory-сессий. Ниже - по приоритету, с тем, где это ляжет в наш код.

Легенда: 🟢 быстро и безопасно · 🟡 нужен пилот · ⚪ на потом. Ничего из списка ещё не внедрено.

## 1. Playwright: обновиться 1.60 → 1.64 🟢

Мы на 1.60. Что даст обновление именно нам (по официальным release notes):

| Версия | Что | Где у нас болит |
|---|---|---|
| 1.61 | HAR и трейсы пишут **WebSocket-трафик** | консоль UP целиком на WebSocket - флаки power/console станут разбираемыми по трейсу |
| 1.61 | `page.localStorage` / `page.sessionStorage` | пред-засев LS для пиннинга Amplitude и промо-таймера без `addInitScript` |
| 1.61 | видео `retain-on-failure-and-retries` | сейчас видео нет вообще - для флаков полезно видео только упавших |
| 1.62 | `retryStrategy: 'isolated'` - ретраи в конце, в отдельном воркере | наши serial-группы на общем сервере ломают друг друга на ретраях |
| 1.63 | `locator.visible()` вместо `:visible` | 7 мест: `VpsPage`, `VpsConfigPage`, `selectors.ts`, `funnel.with.credit.check` |
| 1.63 | опция `lock` - тесты с одной блокировкой не идут параллельно даже из разных файлов | 35 serial-describe; power/backups/role на одном сервере - можно защитить сервер, а не файл |
| 1.63 | `test.step()` с `subtitle` и `params`; трейс с aria-снимками («Display Aria») | читаемость отчётов и разбор «почему не нашёл элемент» |
| 1.64 | `testProject.default: false` - проект не запускается без явного `--project` | вынести деструктив (rebuild, мутации панели) в проект, который не гоняется случайно |
| 1.64 | `--shuffle` | ловить скрытые зависимости между тестами |
| 1.57 | вкладка **Speedboard** в HTML-отчёте | найти самые медленные тесты в cron-прогоне |

Ломающие изменения: `--update-snapshots=missing` теперь проходит прогон; `screen` берётся из device-дескрипторов; элементы в скрытых iframe считаются скрытыми (проверить Stripe-iframe). План: обновить в ветке → `tsc` + полный прогон → смотреть падения.

## 2. Playwright Test Agents (Planner / Generator / Healer) 🟡

Встроены в Playwright с 1.56. `npx playwright init-agents --loop=claude` кладёт в репо определения трёх агентов для Claude Code:
- **Planner** ходит по живому приложению от seed-теста и пишет **markdown-план** в `specs/` - это то, что мы делаем руками в тест-планах;
- **Generator** превращает план в спеки, проверяя каждый локатор в браузере;
- **Healer** берёт упавший тест, переигрывает и предлагает патч (локатор, ожидание), либо помечает тест skip, если фича сломана.

Риски для нас: агенты не знают наших правил (PO вместо сырых локаторов, `selectors.ts`, live-prod, «не жать оплату»). Определения - сгенерированные файлы, их надо пересоздавать после обновления Playwright.
**Пилот:** один безопасный read-only экран (например Referral или Port & Domains): Planner → сверить план с нашим `spec-to-testplan` → Generator → ревью на соответствие ARCHITECTURE.md. Healer - только как подсказка в `flaky-triage`, без автокоммита.

## 3. Контракты API через zod 🟡

Сейчас контракт `api/v2` проверяем руками (`mods`, `plugins`, `extension.sources` - поля по одному). Практика: схема ответа на zod в отдельной папке + свой матчер `toMatchSchema` через `safeParse` (понятные ошибки: какое поле, что ожидали). Плюсы: ловит переименованное или пропавшее поле при 200, схема = документация контракта, типы из той же схемы.
Где: `utils/schemas/` (новое, нужен ок по правилу «новая абстракция»), первые - `minecraft/mods`, `/minecraft/version` (`extension_capabilities`), `server-jar/status` (`java_preflight`).

## 4. Флаки и отчёты 🟢 / ⚪

- 🟢 **Burn-in новых тестов:** `--repeat-each=10 --workers=1 --retries=0` перед коммитом нового stateful-теста. Ретраи прячут флак - для проверки их выключаем. Добавить шагом в скилл `flaky-triage`.
- 🟢 **`npx playwright trace`** (1.59) - разбор трейса из командной строки: агент читает трейс упавшего CI-теста без UI. Добавить в `flaky-triage`.
- ⚪ История стабильности между прогонами: встроенные репортёры перезаписывают прошлый прогон. Если понадобится тренд - ReportPortal (open source) или складывать JSON-отчёты cron в архив и считать самим.

## 5. Ручное тестирование тасок 🟢

Для задач вроде DEV-492 / DEV-563 (большая часть нашей работы) - **сессионное exploratory-тестирование** (SBTM, Bach):
- **Чартер:** «Исследовать *<что>* с помощью *<чего>*, чтобы найти *<какие риски>*», сессия 60-90 мин.
- **SFDIPOT** как чек-лист покрытия: Structure, Function, Data, Interfaces, Platform, Operations, Time. Пример: для DEV-563 «Interfaces» = UI ultra.panel + UI PFH + прямой API - ровно то, где нашёлся BUG-1.
- **Debrief PROOF:** Past, Results, Outlook, Obstacles, Feelings - готовая структура для итогового отчёта.

Где: шаблон чартера в `spec-to-testplan` (раздел «ручные риски») и в чек-лист xlsx как колонку «область SFDIPOT».

## 6. Документация и майндкарта 🟢 / ⚪

- 🟢 **markmap** - интерактивная майндкарта (зум, сворачивание) из обычного markdown-списка. Наш `kb/map.md` уже список ссылок → `npx markmap-cli kb/map.md -o map.html` даёт кликабельную карту, где ссылки работают (в Mermaid не работают). Локально, без публикации.
- 🟢 **Проверка шапки страниц KB** - дописать `kb/_tools/frontmatter_check.py` (id, title, status, updated, verified_on, sources). Готовый `remark-lint-frontmatter-schema` давно не обновлялся - проще свой скрипт.
- ⚪ **ADR** (короткие записи «решение - почему - альтернативы») для решений вроде «Delete VPS вне скоупа», «публикация KB отложена». Сейчас такие решения размазаны по CODE_REVIEW.md и памяти.

## 7. Как «натаскать» агента на наш код 🟡

Что реально повышает качество моих тестов (а не просто «ещё один скилл»):
1. **Скилл `playwright-best-practices` (currents-dev)** - справочник по Playwright, организован по задачам (написать, отладить флак, OAuth-попап, WebSocket). Сторонний: сначала прочитать SKILL.md целиком, взять полезное в наш `ARCHITECTURE.md`/скиллы, а не ставить вслепую.
2. **Свой скилл `godlike-e2e-conventions`** - выжимка ARCHITECTURE.md + TEST_GUIDELINES.md + гочи KB (оверлеи, networkidle, short/full UUID, DOM VirtFusion) в одну страницу, которую агент грузит перед каждым новым спеком. Сейчас эти знания в 5 файлах.
3. **KB как контекст:** перед тестом фичи агент читает `kb/products/<prod>/<feature>.md` - там API, гочи и что не жать. Прописать это шагом в `spec-to-testplan`.
4. **Глоссарий** `kb/glossary.md` - уже есть, меньше выдуманных названий.

## 8. Техдолг, найденный попутно 🟢

- `waitForTimeout` вне разрешённых мест (CLAUDE.md): `pages/SeedPage.ts:101` (800 мс), `components/CookieBanner.ts:177` и `:208` (по 150 мс).
- 7 мест с `:visible` → `locator.visible()` после обновления до 1.63+.

## Предлагаемый порядок

1. Обновить Playwright до 1.64 + `:visible` → `visible()` + убрать 3 `waitForTimeout` (одна ветка, полный прогон).
2. Burn-in и `playwright trace` в `flaky-triage`; чартер + SFDIPOT в `spec-to-testplan`.
3. markmap-карта KB + `frontmatter_check.py`.
4. Пилот Test Agents на одном read-only экране.
5. zod-схемы для 3 эндпоинтов api/v2 (после ока на новую папку `utils/schemas/`).

## Источники

- Playwright: [release notes](https://playwright.dev/docs/release-notes), [CLI](https://playwright.dev/docs/test-cli), [test.step](https://playwright.dev/docs/api/class-test)
- Test Agents: [Shipyard - агенты в Claude Code](https://shipyard.build/blog/playwright-agents-claude-code/), [TestDino - Planner, Generator, Healer](https://testdino.com/blog/playwright-test-agents), [QASkills - init-agents](https://qaskills.sh/blog/playwright-init-agents-guide)
- zod: [Tim Deschryver - Playwright API testing with zod](https://timdeschryver.dev/blog/playwright-api-testing-with-zod), [DZone - API response testing](https://dzone.com/articles/playwright-api-response-testing)
- Флаки: [TestDino - flaky tests](https://www.testdino.com/blog/playwright-flaky-tests), [dyad deflake-e2e skill](https://skills.sh/dyad-sh/dyad/dyad:deflake-e2e), [обзор инструментов](https://testdino.com/blog/flaky-test-detection)
- Скиллы: [currents-dev/playwright-best-practices-skill](https://claudemarketplaces.com/skills/currents-dev/playwright-best-practices-skill/playwright-best-practices), [jeffallan/claude-skills playwright-expert](https://claudeskills.info/skills/jeffallan/claude-skills/playwright-expert/)
- Exploratory: [Tessl SBTM reference](https://tessl.io/registry/testland/session-based-test-management-reference), [SFDPOT](https://tessl.io/registry/testland/exploratory-testing/files/references/sfdpot.md), [heuristic test design](https://tessl.io/registry/testland/heuristic-test-design-reference)
- Майндкарта: [markmap](https://markmap.js.org/docs/markmap), [mkdocs-markmap](https://pypi.org/project/mkdocs-markmap/2.4.1)
