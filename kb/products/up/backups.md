---
id: UP/backups
title: Backups - бэкапы сервера, базы и папки
type: feature
product: UP
status: draft
updated: 2026-10-30
verified_on: 2026-10-20        # DEV-484 r2: общая квота, расписания, бэкапы баз; остальное recon 2026-06-09
tickets: [DEV-418, DEV-452, DEV-484, DEV-580, DEV-582, DEV-586]
flags: []
tests: [tests/game/panel/backups.spec.ts, tests/game/panel/backups.server-scope.api.spec.ts, tests/game/panel/backups.throttle.spec.ts, tests/game/panel/backups.slots-full.spec.ts, tests/game/panel/role.enforcement.spec.ts, tests/game/panel/security.spec.ts]
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §5h, §5i, §5j, §8d (recon 05..09-Jun-2026)
  - kb/tickets/DEV-418.md, DEV-452.md, DEV-484.md, kb/products/up/api/backups.md
  - artifact: https://claude.ai/artifact/537r7XRR8NiYidKCqNWy5C (DEV-484 итоговая проверка, 20-Oct-2026)
---

# Backups - бэкапы сервера, базы и папки

> **В двух словах.** Раздел Backups делает копии всего сервера, базы данных или отдельной папки, хранит их
> в слотах (на тест-сервере 3) и умеет восстанавливать. Бэкап можно залочить от удаления и поставить на
> расписание. С 20-Oct-2026 ([DEV-484](../../tickets/DEV-484.md)) слоты общие для всех видов бэкапов и обеих панелей,
> а счётчик «N/3 slots used» берётся с бэкенда. Отдельно от этих слотов есть копия только мира перед опасными действиями -
> [UP/world-backup](world-backup.md).

## Где в интерфейсе

- Сайдбар сервера → **Backups** (`/server/{uuid}/backups`), работает и на выключенном сервере. KB §5h.
- **Форма создания** (inline, не окно): табы **Server / Database / Folder**, выбор сервера, имя (до 38 символов, счётчик `0/38`),
  свитч **Locked**, чекбокс **Schedule Backup** (раскрывает **Set interval**), **Ignored Files & Directories**, кнопка **Create Backup**.
- **Список:** колонки NAME / DATE / SIZE / STATUS / TYPE / ACTIONS, квота «N/3 slots used», футер «Showing N backups. M backup remaining.»
- **Слоты кончились:** форма создания закрыта заглушкой **«Slots Limit Reached»** с кнопкой Upgrade; список и удаление работают.
- **Действия строки:** Download и меню «...»: **Restore / Rename / Lock / Delete**. Delete спрашивает подтверждение
  («This action is permanent and cannot be undone»).
- **Scheduled** - список расписаний, по умолчанию «No scheduled backups found».

## Как работает (под капотом)

- Create запускает асинхронную задачу: строка появляется сразу, а статус доходит до **COMPLETED** за пару минут
  (на [srv:ebb03adc](../../registry/test-servers.md#ebb03adc) бэкап ~292 МБ).
- **Schedule Backup создаёт повторяющееся расписание (cron),** а не разовый бэкап: оно само плодит бэкапы и ест слоты. KB §8d.
- **Restore** перезаписывает сервер содержимым бэкапа - деструктив.
- Хранение - адаптер `wings` (общая шара ноды); на нём же World Backup ([DEV-418](../../tickets/DEV-418.md)).

## Общая квота и лимит частоты (DEV-484)

Итоговое поведение после [panel!1691](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1691) и
[new-panel!564](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/564), prod 20-Oct-2026, всё PASS
([артефакт](https://claude.ai/artifact/537r7XRR8NiYidKCqNWy5C)).

- **Один лимит слотов на все бэкапы сервера:** таблицы `backups` (ядро: пре-инсталл модпака, старая панель), `backup_instances`
  (ручные и по расписанию), `backup_folders`, `backup_databases`. Раньше старая и новая панель считали каждая своё, и сервер мог держать 3 + 3.
- **Счётчик «N/M slots used» и футер** строит фронт по `meta.quota` из `GET .../backups`, то есть ровно то, что ограничивает бэкенд.
  Находка «4/3 slots used» ([DEV-484/F1](../../tickets/DEV-484.md#находки)) закрыта.
- **Сервер сверх лимита** (бэкапы остались с до-DEV-484): видно, например, «4/3» и заглушку, создать нельзя, удалить можно.
- **Лимит частоты** (прод: 1 бэкап в 3600 с) общий для серверных и папочных бэкапов. **Вне окна:** пре-инсталл бэкап модпака
  (`is_system_initiated`) и бэкапы баз. Слоты они занимают.
- **Тост отказа** (с [DEV-586](../../tickets/DEV-586.md), 27-Oct-2026): один; окно занято - «Backup limit reached for this server. Please try again in N minutes» (минуты вверх, последняя минута - «in a minute»), остальное - текст сервера.
- **Зависший бэкап** (Wings не ответил) через 6 ч становится FAILED и освобождает слот ([DEV-582](../../tickets/DEV-582.md)).
- **Отказы:** нет слотов - 400 «Cannot create a new backup, this server has reached its limit of N backups.», у установки модпака 409
  `no_free_backup_slots` и окно «No Free Backup Slots»; окно занято - 429 «Only N backups may be generated within T second span of time.».
- **Расписания:** шаблон без архива слоты не тратит; при полных слотах запуск пропускается (интервальное переносится на интервал,
  одноразовое остаётся в списке); `auto_replace` держит одного ребёнка; `retain_count` завершает расписание и отвязывает бэкапы.
  Планировщик работает в UTC и срабатывает только в точную минуту.
- Детали, поля `meta.quota`, коды и тексты, таблица расписаний: [UP API - backups](api/backups.md). Отказы установки модпака:
  [UP/modpack-catalog](modpack-catalog.md#отказы-при-установке-с-бэкапом-dev-452).

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
| Слоты бэкапов | 3 на тест-сервере (зависит от тарифа ❓), общие для 4 таблиц и обеих панелей |
| Частота | прод: 1 бэкап в 3600 с на сервер (серверные и папки); базы и пре-инсталл вне окна |
| Интервал расписания | UI: дни / недели / месяцы; API: ещё минуты и часы |
| Имя бэкапа | 38 символов |
| World Backup | отдельно от слотов, 1 на сервер ([UP/world-backup](world-backup.md)) |

## Правила и граничные случаи

1. **Create Backup неактивна,** пока не выбраны сервер **и** имя.
2. **Имя принимает HTML как есть,** но рендерит как текст: stored XSS нет (SEC-002). KB §5j.
3. **Member не видит строки бэкапов и меню «...»**, форма создания у него есть ([UP/sharing-roles](sharing-roles.md#права-по-ролям-ui)).
4. **Удаление незавершённого бэкапа ненадёжно** - сначала дождаться COMPLETED.
5. **Только «Set interval» без «Schedule Backup»** создаёт сразу обычный бэкап (слот + окно) и отдельное расписание с первым запуском через интервал.
6. **Бэкап чужой или несуществующей базы** - 404; PUT бэкапа базы не меняет `database_id` (только имя).

## Не баг - так задумано

| Кажется багом | На самом деле |
|---|---|
| Бэкап завис в промежуточном статусе | статус не реактивен, после reload будет COMPLETED |
| У Member пустой список бэкапов | Member не видит бэкапы |
| «4/3 slots used» и форма закрыта | сервер сверх лимита с до-DEV-484, нужно удалить лишнее |
| Слот свободен, а ручной бэкап 429 | занято окно частоты, `meta.quota.refusal = throttled` |
| Расписание не сработало | слоты полные (пропуск) или время не в ту минуту (UTC, точная минута) |

**Известные Low-замечания DEV-484** (видят клиенты, отдельными тикетами, [DEV-484/находки](../../tickets/DEV-484.md#находки)):
OBS-1 два тоста на 429 и нет времени ожидания; («Last -1» снят - только через API с `retain_count = NULL`);
OBS-2 пропущенное одноразовое расписание висит в списке.

## Гочи для тестирования

- **Готовность ждать поллингом с reload** (`expect.poll` → `backups.refresh()` + `isCompleted()`), таймаут ~9 мин,
  `test.setTimeout` ~600 с. Якорь готовности - класс `.backups-list__status--completed`.
- **Delete фильтровать строго `/^Delete$/i`** - рядом Restore.
- **Тест self-cleaning:** создаём и удаляем только свой бэкап, чужой «111» на ebb03adc не трогаем.
- **Расписание создавать только с ок владельца** и сразу удалять: удаление работает (DEV-484, 20-Oct-2026), бэкапы удалённого расписания
  остаются обычными и занимают слоты. Для коротких интервалов только API (минуты), время в UTC, точная минута.
- **Окно частоты своё у сервера:** проверки окна и расписаний разносить по разным серверам, иначе час ожидания.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Create → COMPLETED → Delete | `backups.spec.ts` (BKP-001) | ✅ |
| Структура формы, квота, Scheduled | `backups.spec.ts` (BKP-002) | ✅ |
| Schedule Backup раскрывает Set interval (без сабмита) | `backups.spec.ts` (BKP-003) | ✅ |
| Member без управления бэкапами | `role.enforcement.spec.ts` (ROLE-002) | ✅ |
| XSS в имени бэкапа | `security.spec.ts` (SEC-002) | ✅ |
| Общая квота, `meta.quota`, расписания, бэкапы баз (DEV-484) | руками, prod 20-Oct-2026 ([артефакт](https://claude.ai/artifact/537r7XRR8NiYidKCqNWy5C)), автотеста нет | руками |
| Restore, Rename, Lock, Database / Folder, Ignored Files, создание расписания | не покрыто | ❌ |
| Общая квота `meta.quota`: контракт и счётчик used/limit | `backups.spec.ts` (TC-GP-BKP-004), [DEV-484](../../tickets/DEV-484.md) | ✅ read-only |
| Окно частоты: `throttled` + `retry_after`, 429 с единым текстом, `error_code` + `Retry-After`, ровно один тост с минутами ([DEV-586](../../tickets/DEV-586.md)), строки нет | `backups.throttle.spec.ts` (TC-GP-BKP-005), mut-сервер fd965a60 | ✅ мутация |
| Бэкап чужого сервера по uuid = «не найдено» (IDOR, [DEV-580](../../tickets/DEV-580.md)): v2 download свой роут 200 / чужой 400 как выдуманный | `backups.server-scope.api.spec.ts` (TC-GP-BKP-SCOPE-001/002), read-only | ✅ read-only |
| Заглушка «Slots Limit Reached» (free = 0): Create неактивна, Upgrade, счётчик/футер, удаление доступно | `backups.slots-full.spec.ts` (TC-GP-BKP-006), read-only на 9c891502 (3/3) | ✅ read-only |

## История

| Дата | Тикет | Что |
|---|---|---|
| 05-Jun-2026 | - | Recon бэкапов, KB §5h |
| 09-Jun-2026 | - | Форма богаче (Ignored Files, расписание), BKP-003, SEC-002 |
| 10..14-Aug-2026 | [DEV-418](../../tickets/DEV-418.md) | Отдельный тип World Backup, хранение на `wings` |
| 16-Sep-2026 | [DEV-484](../../tickets/DEV-484.md) | Пре-инсталл бэкап вне лимита частоты (QA 16-Oct-2026) |
| 16-Oct-2026 | [DEV-452](../../tickets/DEV-452.md) | Описаны два хранилища и раздельные счётчики (по QA DEV-452/DEV-484) |
| 20-Oct-2026 | [DEV-484](../../tickets/DEV-484.md) | Общая квота на 4 таблицы, `meta.quota`, «Slots Limit Reached», расписания (QA prod PASS) |
| 27-Oct-2026 | [DEV-582](../../tickets/DEV-582.md) | Зависшие PENDING старше 6 ч → FAILED раз в 30 мин, слот освобождается; проба фальшивых COMPLETED удалена (QA prod PASS, SQL) |
| 27-Oct-2026 | [DEV-586](../../tickets/DEV-586.md) | Отказ в бэкапе - один тост; по окну «Backup limit reached… try again in N minutes» (QA prod PASS) |
| 29-Oct-2026 | [DEV-580](../../tickets/DEV-580.md) | Бэкап ищется только среди бэкапов сервера из роута (v2 и старая панель), чужой uuid = несуществующий; lock/rename бэкапа старой панели без 500 (QA prod PASS 30-Oct) |
