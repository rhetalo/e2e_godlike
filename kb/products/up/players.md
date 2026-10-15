---
id: UP/players
title: Players - администраторы, игроки, whitelist, баны
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-06-06        # online-recon после реинсталла
tickets: []
flags: []
tests: [tests/game/panel/players.spec.ts]
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §5d, §10 (recon 05..06-Jun-2026)
---

# Players - администраторы, игроки, whitelist, баны

> **В двух словах.** Вкладка Players управляет игроками Minecraft-сервера: кто админ (op), кто сейчас
> онлайн, кто в whitelist, кто забанен. Всё это работает только на запущенном сервере - под капотом
> панель отправляет те же команды, что можно ввести в консоли.

## Где в интерфейсе

- Таб **Players** (`/server/{uuid}/players`), блок `.server__players`. Виден и на выключенном сервере, но без кнопок действий
  (подсказка «нужен запуск»). KB §5d.
- На запущенном сервере четыре карточки: **Server Administrators**, **Players List** (счётчик «Players: 0 / 20»),
  **Whitelist** («Only players from the list will be able to join...»), **Ban List**. У карточек поиск и кнопки действий. KB §10.

## Как работает (под капотом)

- Таб получает онлайн-статус через свой WebSocket с лагом - сразу после старта может мелькать «currently offline».
- Действия соответствуют консольным командам (`op`, `whitelist add`, `ban` ...) ❓ какие именно запросы шлёт UI - не разведано.

## Правила и граничные случаи

1. **Нужен Online** для любого действия с игроками.
2. **Имя игрока должно существовать** при `online-mode=true` (иначе Minecraft не найдёт профиль).

## Гочи для тестирования

- **Действия проверять через консоль** - она источник правды ([UP/console](console.md#гочи-для-тестирования)): `whitelist add`
  → `Added <Name> to the whitelist`, откат `whitelist remove`.
- Модовый [srv:ebb03adc](../../registry/test-servers.md#ebb03adc) стартует долго: `ensureOnline` 300 с + `waitForConsoleReady` 360 с.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Блок игроков и карточка администраторов | `players.spec.ts` (PLR-001) | ✅ |
| Whitelist add → list → remove через консоль | `players.spec.ts` (PLR-002) | ✅ |
| Кнопки UI: op, ban, whitelist из интерфейса | не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 05-Jun-2026 | - | Recon таба, KB §5d |
| 06-Jun-2026 | - | Online-recon: 4 карточки, лаг статуса, KB §10 |
