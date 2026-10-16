---
id: UP/api/backups
title: API - backups (список, ручные бэкапы, лимиты)
type: api
product: UP
status: draft
updated: 2026-10-16
verified_on: 2026-10-16
tickets: [DEV-452, DEV-484, DEV-418]
features: [UP/backups, UP/modpack-catalog]
sources:
  - memory: dev484-backup-throttle, dev452-modpack-backup-fail-reasons
  - jira: DEV-452 (комментарии 14-Sep-2026 и 03-Sep-2026)
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §7b-ter
---

# API - backups

> **В двух словах.** Бэкапы лежат в **двух независимых таблицах** с отдельными счётчиками лимита. Пре-инсталл
> бэкап модпака создаёт ядро Pterodactyl и пишет в `backups`; ручной бэкап из вкладки Backups создаёт другой
> сервис и пишет в `backup_instances`. Страница Backups склеивает оба списка и отдаёт всё с `type = "instance"`,
> поэтому снаружи записи неразличимы. Из-за этого счётчик «N/3 slots used» не совпадает ни с одним реальным лимитом.

Знаки: ✅ живьём, 🧪 подмена ответа в браузере, 📖 из тикета, ❓ нет в источниках. Легенда: [README](README.md#легенда).

## Эндпоинты

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/servers/{uuid}/backups` | объединённый список бэкапов сервера |
| POST | `/servers/{uuid}/backups/instances` | создать ручной бэкап (из вкладки Server) |

Создание бэкапа ядром (пре-инсталл) отдельного клиентского эндпоинта не имеет: его запускает `POST .../minecraft/modpacks`
в режиме `backup` ([API - modpacks](modpacks.md)).

## GET /servers/{uuid}/backups

Возвращает единый список из обеих таблиц. Структуру тела ❓, известно только:

| Поле | Смысл |
|---|---|
| `type` | у всех записей `"instance"`, независимо от таблицы (📖 комментарий разработчика) |
| статус записи | включая `FAILED`; нода-фейл пре-инсталл бэкапа остаётся в списке как `FAILED` (по AC [DEV-452](../../../tickets/DEV-452.md)) |

⚠️ Счётчик «N/3 slots used» считает **фронт** по этому общему списку, включая неудачные бэкапы. На проде он показал «4/3 slots used»
для сервера с `backup_limit=3` (3 пре-инсталл + 1 ручной) ✅ ([DEV-484/F1](../../../tickets/DEV-484.md#находки)).

## POST /servers/{uuid}/backups/instances

Создаёт ручной бэкап сервисом `CreateBackupInstanceService`, запись идёт в `backup_instances`.

**Ответы**

| Код | Когда | Как проверено |
|---|---|---|
| 202 | бэкап принят в работу (в том числе сразу после пре-инсталл бэкапа) | ✅ prod, 16-Oct-2026 |
| 429 | исчерпан лимит частоты по `backup_instances` | ✅ prod, 16-Oct-2026 |
| прочие (слоты, 4xx) | ❓ | - |

Пример 429 (из комментария QA в Jira, 14-Sep-2026):

```json
{
  "success": false,
  "message": "Only 1 backup instances may be generated within a 3600 second span of time."
}
```

⚠️ **Как отличить счётчик по тексту.** Слово `instances` в «Only N backup **instances** may be generated…» - сработал счётчик
ручных бэкапов (`backup_instances`). У ядра формулировка «Only N backups may be generated…» - счётчик `backups` 📖.

## Как работает лимит частоты

| | `backups` (ядро) | `backup_instances` (ручные) |
|---|---|---|
| Кто создаёт | `InitiateBackupService` (ядро Pterodactyl): пре-инсталл, старая панель, возможно расписания ❓ | `CreateBackupInstanceService`: вкладка Server новой панели |
| Эндпоинт | `POST .../minecraft/modpacks` (режим `backup`) | `POST .../backups/instances` |
| Что считает окно | `getBackupsGeneratedDuringTimespan`: `withTrashed()` плюс любой незавершённый и успешный бэкап; удалённый бэкап держит окно до конца | свой счётчик по своей таблице |
| Слоты (`backup_limit`) | `countSlotOccupyingBackups`: живые незавершённые и успешные только из `backups` | не учитывается в префлайте ❓ |
| Пре-инсталл бэкап | да, `is_system_initiated=true`, вне окна | нет, запись не создаётся |

- Читают одни и те же настройки: `BACKUP_THROTTLE_LIMIT` и `BACKUP_THROTTLE_PERIOD`. **Прод: 1 и 3600.** Дефолт `config/backups.php`: 2 и 600 📖.
  Перед тестом троттлинга смотреть значения на стенде: при `limit=2` нужно две попытки, а не одна.
- **Счётчики не общие** (проверено после DEV-484, часть 2 не сделана): ручной бэкап не виден префлайту пре-инсталл бэкапа
  и наоборот. Расписания, по комментарию разработчика, пишут в `backup_instances` и попадают в окно, но сами окно не проверяют
  (расхождение с кодом, где расписания идут через `RunTaskJob`, не снято, [DEV-452/F2](../../../tickets/DEV-452.md#находки)) ❓.
- Флаг `backups.is_system_initiated` (колонка в `backups`): ставится пре-инсталл бэкапу всегда, независимо от env.
  Различение по флагу, а не по имени `Pre-modpack-install backup`. На проде 452 из 452 пре-инсталл бэкапов помечены ✅.
- Env `GODLIKE_PREINSTALL_BACKUP_EXEMPT_FROM_THROTTLE` (по умолчанию `true`): выключает или включает проверку исключения. Значение `false`
  на проде или stage не проверялось: нужен DevOps ([DEV-484/Q1](../../../tickets/DEV-484.md#хвосты)).
- World Backup имеет **собственный** лимит `godlike.world_backup.throttle.{limit,period}` и общего `backups.throttles` не касается
  ([UP/world-backup](../world-backup.md), `WorldBackupAdmissionResolver::isThrottled()` 📖).
- Автоочистка пре-инсталл бэкапа: разработчик писал о ней 15-Sep-2026 («мы добавляем автоочистку»), на проде 16-Oct-2026 четыре тестовых
  бэкапа остались на месте (по решению владельца) ❓ работает ли очистка, не проверено.

**Сценарии, снятые на проде 16-Oct-2026** ([DEV-484](../../../tickets/DEV-484.md), ✅)

| Шаг | Результат |
|---|---|
| Второй «Create Backup and Install» в пределах часа | проходит (исключение работает) |
| Ручной бэкап сразу после пре-инсталл | 202 |
| Два ручных подряд | второй - 429 по счётчику `backup_instances` |
| Установка, когда слоты заняты | 409 `no_free_backup_slots` |

**История изменений**

| Дата | Тикет | Что изменилось |
|---|---|---|
| 2026-09-09 | [DEV-452](../../../tickets/DEV-452.md) | префлайт троттлинга для установки модпака (счётчик `backups`) |
| 2026-09-16 | [DEV-484](../../../tickets/DEV-484.md) | `panel!1611` (+ `!1614` тест): пре-инсталл бэкап вне лимита частоты, флаг `is_system_initiated`. Часть 2 (общий счётчик `backups` + `backup_instances` + расписания) не сделана, ждёт продукт |

**Где видно в UI.** Вкладка Backups: список (колонки NAME / DATE / SIZE / STATUS / TYPE), квота «N/3 slots used»
([UP/backups](../backups.md)). Ошибка 429 отображается тостом ❓ (текст в UI дословно не снимали).

**Как проверено.** Prod и stage, 16-Oct-2026: сервер [srv:f8e7df56](../../../registry/test-servers.md#f8e7df56) (prod) и [srv:9efab4bc](../../../registry/test-servers.md#9efab4bc) (stage,
результаты идентичны, F1 воспроизводится). Данные о таблицах и счётчиках - со слов разработчика в Jira и из DB read-only (`workflow_runs`),
код бэкенда напрямую не читали.
