---
id: UP/tasks
title: Tasks - задачи и расписание (команда, power-действие)
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-10-09        # гейт Java на расписании (DEV-485); UI - recon 05..06-Jun
tickets: [DEV-485]
flags: [java-start-gate]
tests: [tests/game/panel/tasks.spec.ts]
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §5g, §7e (recon 05..06-Jun-2026)
  - kb/tickets/DEV-485.md
---

# Tasks - задачи и расписание (команда, power-действие)

> **В двух словах.** Раздел Tasks позволяет настроить задачу «отправить команду в консоль» или «выполнить
> power-действие» (старт, рестарт ...) и запускать её вручную или по расписанию. Например, ежедневный
> рестарт сервера. Старт по расписанию тоже проходит проверку Java.

## Где в интерфейсе

- Сайдбар сервера → **Tasks** (`/server/{uuid}/tasks`), работает и на выключенном сервере. KB §5g.
- **All Tasks:** табы «Your Tasks» / «Default Tasks»; шаблоны **Send command** и **Send power action**, у каждого **Configure** и **Run**.
- **Configure** → окно «Configure your task»: Task name + Payload (команда) или Power action (select); Cancel / Save. Save создаёт
  запись в «Your Tasks». KB §7e.
- **Scheduled Tasks:** список расписаний, по умолчанию «You have no scheduled tasks yet».

## Как работает (под капотом)

- Run выполняет задачу сразу (для power - реальное действие с сервером).
- Запуск power start по расписанию (`POST tasks/run`) проходит гейт Java: на слишком старой Java сервер не стартует,
  владельцу уходит email (не чаще 1 в час) ([DEV-485](../../tickets/DEV-485.md), [UP/java-detection](java-detection.md)).
- Как задаётся расписание (cron, интервал) - ❓ не разведано ([обзор UP, пробел 8](README.md#пробелы)).

## Гочи для тестирования

- **Run не жать** - это мутация (power-действие или команда в живой сервер).
- Создание задачи через Configure → Save - self-cleaning кейс: создать, проверить в «Your Tasks», удалить.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Дефолтные задачи Send command / Send power action | `tasks.spec.ts` (TASK-001) | ✅ |
| Секция Scheduled Tasks с пустым состоянием | `tasks.spec.ts` (TASK-002) | ✅ |
| Создание и удаление задачи Send command | `tasks.spec.ts` (TASK-003) | ✅ |
| Run, создание расписания, срабатывание по расписанию | не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 05..06-Jun-2026 | - | Recon Tasks и окна Configure, KB §5g, §7e |
| 07-Oct-2026 | [DEV-485](../../tickets/DEV-485.md) | Старт по расписанию под гейтом Java |
