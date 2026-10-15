---
id: UP/backups
title: Backups - бэкапы сервера, базы и папки
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-06-09        # последний recon бэкапов
tickets: [DEV-418]
flags: []
tests: [tests/game/panel/backups.spec.ts, tests/game/panel/role.enforcement.spec.ts, tests/game/panel/security.spec.ts]
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §5h, §5i, §5j, §8d (recon 05..09-Jun-2026)
  - kb/tickets/DEV-418.md
---

# Backups - бэкапы сервера, базы и папки

> **В двух словах.** Раздел Backups делает копии всего сервера, базы данных или отдельной папки, хранит их
> в слотах (на тест-сервере 3) и умеет восстанавливать. Бэкап можно залочить от удаления и поставить на
> расписание. Отдельно от этих слотов есть копия только мира перед опасными действиями -
> [UP/world-backup](world-backup.md).

## Где в интерфейсе

- Сайдбар сервера → **Backups** (`/server/{uuid}/backups`), работает и на выключенном сервере. KB §5h.
- **Форма создания** (inline, не окно): табы **Server / Database / Folder**, выбор сервера, имя (до 38 символов, счётчик `0/38`),
  свитч **Locked**, чекбокс **Schedule Backup** (раскрывает **Set interval**), **Ignored Files & Directories**, кнопка **Create Backup**.
- **Список:** колонки NAME / DATE / SIZE / STATUS / TYPE / ACTIONS, квота «N/3 slots used», футер «Showing N backups. M remaining.»
- **Действия строки:** Download и меню «...»: **Restore / Rename / Lock / Delete**. Delete спрашивает подтверждение
  («This action is permanent and cannot be undone»).
- **Scheduled** - список расписаний, по умолчанию «No scheduled backups found».

## Как работает (под капотом)

- Create запускает асинхронную задачу: строка появляется сразу, а статус доходит до **COMPLETED** за пару минут
  (на [srv:ebb03adc](../../registry/test-servers.md#ebb03adc) бэкап ~292 МБ).
- **Schedule Backup создаёт повторяющееся расписание (cron),** а не разовый бэкап: оно само плодит бэкапы и ест слоты. KB §8d.
- **Restore** перезаписывает сервер содержимым бэкапа - деструктив.
- Хранение - адаптер `wings` (общая шара ноды); на нём же World Backup ([DEV-418](../../tickets/DEV-418.md)).

## Статусы и переходы

| Из | Событие | В |
|---|---|---|
| - | Create Backup | промежуточный статус (строка уже в списке) |
| промежуточный | задача завершилась | `COMPLETED` (виден только после reload) |
| `COMPLETED` | Delete | строки нет, слот освобождён |

Locked-бэкап нельзя удалить, пока не разлочен.

## Лимиты

| Что | Граница |
|---|---|
| Слоты бэкапов | 3 на тест-сервере (зависит от тарифа ❓) |
| Имя бэкапа | 38 символов |
| World Backup | отдельно от слотов, 1 на сервер ([UP/world-backup](world-backup.md)) |

## Правила и граничные случаи

1. **Create Backup неактивна,** пока не выбраны сервер **и** имя.
2. **Имя принимает HTML как есть,** но рендерит как текст: stored XSS нет (SEC-002). KB §5j.
3. **Member не видит строки бэкапов и меню «...»**, форма создания у него есть ([UP/sharing-roles](sharing-roles.md#права-по-ролям-ui)).
4. **Удаление незавершённого бэкапа ненадёжно** - сначала дождаться COMPLETED.

## Не баг - так задумано

| Кажется багом | На самом деле |
|---|---|
| Бэкап завис в промежуточном статусе | статус не реактивен, после reload будет COMPLETED |
| У Member пустой список бэкапов | Member не видит бэкапы |

## Гочи для тестирования

- **Готовность ждать поллингом с reload** (`expect.poll` → `backups.refresh()` + `isCompleted()`), таймаут ~9 мин,
  `test.setTimeout` ~600 с. Якорь готовности - класс `.backups-list__status--completed`.
- **Delete фильтровать строго `/^Delete$/i`** - рядом Restore.
- **Тест self-cleaning:** создаём и удаляем только свой бэкап, чужой «111» на ebb03adc не трогаем.
- **Расписание не создавать без ок владельца:** способ удалить cron не разведан, на общем проде это риск.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Create → COMPLETED → Delete | `backups.spec.ts` (BKP-001) | ✅ |
| Структура формы, квота, Scheduled | `backups.spec.ts` (BKP-002) | ✅ |
| Schedule Backup раскрывает Set interval (без сабмита) | `backups.spec.ts` (BKP-003) | ✅ |
| Member без управления бэкапами | `role.enforcement.spec.ts` (ROLE-002) | ✅ |
| XSS в имени бэкапа | `security.spec.ts` (SEC-002) | ✅ |
| Restore, Rename, Lock, Database / Folder, Ignored Files, создание расписания | не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 05-Jun-2026 | - | Recon бэкапов, KB §5h |
| 09-Jun-2026 | - | Форма богаче (Ignored Files, расписание), BKP-003, SEC-002 |
| 10..14-Aug-2026 | [DEV-418](../../tickets/DEV-418.md) | Отдельный тип World Backup, хранение на `wings` |
