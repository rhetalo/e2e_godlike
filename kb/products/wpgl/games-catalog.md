---
id: WPGL/games-catalog
title: Каталог игр - сетка с фильтрами и список лендингов
type: feature
product: WPGL
status: draft
updated: 2026-10-18
verified_on: 2026-10-16        # сетка и «List of games» перепроверены в браузере 16-Oct
tickets: [DEV-402]
flags: []
tests: [tests/general/games.catalog.spec.ts]
sources:
  - kb/products/wpgl/README.md (Игры, исправлено 16-Oct)
  - шапка tests/general/games.catalog.spec.ts; agents.docs/PLAYWRIGHT_AGENTS_PILOT.md
  - kb/tickets/DEV-402.md
---

# Каталог игр - сетка с фильтрами и список лендингов

> **В двух словах.** Страница `/game-servers-en/` - каталог всех игр. На ней **два разных блока**: сетка карточек
> (~46 игр, фильтры PC / Mobile / Console и поиск, клик ведёт сразу в корзину) и SEO-список «List of games»
> (20 ссылок на лендинги игр). Их легко перепутать - в KB это уже случалось 15-Oct.

## Где в интерфейсе

| Блок | Что это | Куда ведёт клик |
|---|---|---|
| Сетка `.games__block .game` | карточки игр, фильтры `.games__filter-btn` (View All / PC / Mobile / Console), поиск `input.games__search-input` | сразу в корзину `/cart-game-servers/?productId=N&billingCycle=monthly` |
| «List of games» `.seotext__body a` | SEO-текст во вкладке, 20 ссылок | на лендинг игры; Minecraft - на главную |

## Как работает (под капотом)

- Карточки сетки рисует JS; у карточки нет `href`, переход - `onclick` в воронку ([DEV-402](../../tickets/DEV-402.md)).
  `<a>` есть только у 3 карточек: Modded Minecraft, Dedicated, Gaming VPS.
- Карточка, скрытая фильтром или поиском, остаётся в DOM с `display:none`.
- Лендингов игр в sitemap 46 (`*-server-hosting`), все отвечают 200 на 15-Oct.

## Правила и граничные случаи

1. Фильтр **Console** на 16-Oct пустой (0 карточек), **Mobile** - 5 (Minecraft Bedrock, Terraria и др.).
2. Поиск без учёта регистра и обрезает пробелы; у поиска без совпадений нет текста пустого состояния.
3. Какие лендинги не попали в сетку (GTA 5 Alt:V, RageMP, CS: Source, RimWorld Together, SCP: SL) - ❓ сверить поштучно.

## Гочи для тестирования

- **Считать только видимые карточки** - скрытые остаются в DOM.
- Количество проверять порогом «не меньше», не «ровно N»: каталог растёт.
- `<h2>List of games</h2>` имеет высоту 0 - якорь блока сами ссылки, не заголовок.
- На странице 3-5 ошибок консоли на загрузку - не разбирались ❓.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| «List of games»: не меньше минимума, имена уникальны, ядро игр на месте | `games.catalog.spec.ts` (GAMES-001) | ✅ |
| У каждой игры внутренняя уникальная ссылка | `games.catalog.spec.ts` (GAMES-002) | ✅ |
| Клик → лендинг игры, «Назад» → каталог | `games.catalog.spec.ts` (GAMES-003) | ✅ |
| Minecraft ведёт на главную | `games.catalog.spec.ts` (GAMES-004) | ✅ |
| Сетка: фильтры PC / Mobile / Console, View All возвращает | `games.catalog.spec.ts` (GAMES-005) | ✅ |
| Сетка: поиск без учёта регистра, с обрезкой пробелов | `games.catalog.spec.ts` (GAMES-006) | ✅ |
| Клик по карточке сетки → корзина с нужным productId | не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 20-Aug-2026 | [DEV-402](../../tickets/DEV-402.md) | Карточки игр ведут в новую Vue-воронку |
| 15-Oct-2026 | - | Пилот Playwright Test Agents: тесты «List of games» |
| 16-Oct-2026 | - | Исправлено: сетка ≠ «List of games»; тесты сетки GAMES-005/006 |
