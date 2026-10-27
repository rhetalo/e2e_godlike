---
id: UP/api/backups
title: API - backups (список, квота, ручные бэкапы и бэкапы баз, расписания)
type: api
product: UP
status: draft
updated: 2026-10-27
verified_on: 2026-10-20        # DEV-484 итоговая проверка на prod (panel!1691 + new-panel!564)
tickets: [DEV-452, DEV-484, DEV-418]
features: [UP/backups, UP/modpack-catalog]
sources:
  - memory: dev484-backup-throttle, dev452-modpack-backup-fail-reasons
  - jira: DEV-452 (комментарии 14-Sep-2026 и 03-Sep-2026), DEV-484 (QA-комментарий r2 20-Oct-2026)
  - test-docs/ultra.panel/DEV-484/r2/RESULTS.md, test-docs/ultra.panel/DEV-484/DEV-484-jira-comment-r2.md (не в git)
  - artifact: https://claude.ai/artifact/537r7XRR8NiYidKCqNWy5C
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §5h, §7b-ter
---

# API - backups

> **В двух словах.** После [DEV-484](../../../tickets/DEV-484.md) (20-Oct-2026) у сервера **один лимит слотов** на все виды бэкапов:
> пре-инсталл модпака, ручные, по расписанию, бэкапы баз и папок. Бэкенд сам считает квоту и отдаёт её в `meta.quota`
> списка бэкапов, фронт рисует «N/M slots used» по этому числу. Лимит частоты (на проде 1 бэкап в 3600 с) общий для
> серверных и папочных бэкапов; бэкапы баз и пре-инсталл бэкап в окно не попадают, но слот занимают.

Знаки: ✅ живьём, 🧪 подмена ответа в браузере, 📖 из тикета или MR, ❓ нет в источниках. Легенда: [README](README.md#легенда).
База API: `https://panel.godlike.host/api/v2`, Bearer = `localStorage.access_token` на ultra.panel.

## Эндпоинты

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/servers/{uuid}/backups` | объединённый список бэкапов сервера + `meta.quota` |
| POST | `/servers/{uuid}/backups/instances` | ручной бэкап сервера (вкладка Server); с полями расписания создаёт ещё и расписание |
| POST | `/servers/{uuid}/backups/databases` | бэкап базы данных сервера (`databaseId`) |
| PUT | `/servers/{uuid}/backups/databases/{backupUUID}` | изменить бэкап базы (имя); `database_id` игнорируется |
| POST | бэкап папки (вкладка Folder) | путь ❓, пишет в `backup_folders` |
| - | эндпоинты расписаний (создание, удаление) | путь ❓, создавали тем же запросом, что отправляет форма |

Создание бэкапа ядром (пре-инсталл) отдельного клиентского эндпоинта не имеет: его запускает `POST .../minecraft/modpacks`
в режиме `backup` ([API - modpacks](modpacks.md)).

## Модель квоты (после DEV-484)

| | Слот (`backup_limit`) | Окно частоты |
|---|---|---|
| `backups` (ядро): пре-инсталл модпака | ✅ занимает | ❌ вне окна (`is_system_initiated=true`) |
| `backups` (ядро): старая панель `api/client` | ✅ занимает 📖 | ✅ в окне 📖 |
| `backup_instances`: ручной серверный бэкап новой панели | ✅ | ✅ |
| `backup_instances`: бэкап, созданный расписанием | ✅ | ✅ после завершения расписания (см. ниже) |
| `backup_folders`: бэкап папки | ✅ 📖 | ✅ 📖 |
| `backup_databases`: бэкап базы | ✅ | ❌ вне окна (3 подряд проходят) |
| шаблон расписания без архива | ❌ не считается | ❌ не считается |
| `FAILED`-бэкап | ❌ не занимает 📖 (в MR покрыто тестами, живьём не получили) | - |

- **Один лимит на четыре таблицы:** `backups`, `backup_instances`, `backup_folders`, `backup_databases`. «Двойной квоты» (3 в старой
  панели + 3 в новой) больше нет. Проверено ✅: 3 пре-инсталл, затем ручной → 400; 2 пре-инсталл + 1 ручной, затем установка → 409
  `no_free_backup_slots`; 3 бэкапа базы → 4-й 400.
- **Окно частоты** читает `BACKUP_THROTTLE_LIMIT` / `BACKUP_THROTTLE_PERIOD`. **Прод: 1 и 3600** ✅. Дефолт `config/backups.php`: 2 и 600 📖.
  Окно своё у каждого сервера: параллельные проверки удобно разносить по разным серверам.
- **Пре-инсталл бэкап** вне окна всегда (флаг `backups.is_system_initiated`, по флагу, а не по имени `Pre-modpack-install backup`;
  на проде 452 из 452 помечены ✅). Env `GODLIKE_PREINSTALL_BACKUP_EXEMPT_FROM_THROTTLE` (по умолчанию `true`) включает саму
  проверку исключения; `false` не проверялся ([DEV-484/Q1](../../../tickets/DEV-484.md#хвосты)).
- **Установка с бэкапом сразу после ручного** проходит (200 ✅): ручной бэкап занимает окно, но пре-инсталл в окно не смотрит.
  Поэтому живой 409 `backup_throttled` у установки модпака на проде по-прежнему не получить.
- **Сервер сверх лимита** (бэкапов больше, чем слотов, остались с до-DEV-484): квота показывает, например, `used=4` при `limit=3`,
  создать нельзя, удалить можно ✅. Список таких серверов разработчики передали саппорту 📖.
- World Backup имеет **собственный** лимит `godlike.world_backup.throttle.{limit,period}` и в общую квоту не входит
  ([UP/world-backup](../world-backup.md)).

## GET /servers/{uuid}/backups

⚠️ Только **полный** UUID: короткий (`00915cdc`) даёт 400 «No query results for model [Pterodactyl\Models\Server]» (live 23-Oct-2026), хотя `GET /servers/{short}` короткий принимает. Контракт квоты - `utils/schemas/backups.ts`, автотест TC-GP-BKP-004.

Возвращает `{ success, data, meta }`. `data` - единый список из таблиц бэкапов (у записей `type = "instance"`, независимо от таблицы 📖).
`meta.quota` добавлен в [panel!1691](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1691) ✅:

| Поле | Тип | Смысл |
|---|---|---|
| `limit` | int | `backup_limit` сервера (слоты по тарифу) |
| `used` | int | занято слотов по всем четырём таблицам; может быть больше `limit` |
| `free` | int | свободно слотов (`limit - used`, не ниже 0: при `used=4`, `limit=3` отдаёт `0`) |
| `can_create` | bool | можно ли сейчас создать бэкап, который проверяет окно (серверный, папку) |
| `refusal` | string \| null | причина отказа: `no_free_slots`, `throttled`, `null` если можно |
| `retry_after` | int \| null | секунд до конца окна при `refusal = throttled`, иначе `null` |

Примеры с прода (20-Oct-2026, [srv:f8e7df56](../../../registry/test-servers.md#f8e7df56)) ✅:

```json
"meta": { "quota": { "limit": 3, "used": 4, "free": 0, "can_create": false, "refusal": "no_free_slots", "retry_after": null } }
```

```json
"meta": { "quota": { "limit": 3, "used": 2, "free": 1, "can_create": false, "refusal": "throttled", "retry_after": 3516 } }
```

⚠️ `can_create=false` при `free > 0` - это окно частоты, а не слоты. Бэкап базы в таком состоянии создать можно (окно на него не действует).

**Где видно в UI.** Счётчик «N/M slots used» и футер «Showing N backups. M backup remaining.» строятся по `meta.quota`
([new-panel!564](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/564)). При `free = 0` форма создания закрыта
заглушкой **«Slots Limit Reached»** с кнопкой Upgrade, удаление доступно ([UP/backups](../backups.md)).

## POST /servers/{uuid}/backups/instances

Ручной бэкап сервера, запись в `backup_instances`.

| Код | Когда | Как проверено |
|---|---|---|
| 202 | бэкап принят в работу | ✅ prod |
| 400 | нет свободных слотов | ✅ prod, 20-Oct-2026 |
| 429 | окно частоты занято | ✅ prod, 20-Oct-2026 |

```json
{ "success": false, "message": "Cannot create a new backup, this server has reached its limit of 3 backups." }
```

```json
{ "success": false, "message": "Only 1 backups may be generated within a 3600 second span of time.",
  "error_code": "backup_throttled", "retry_after": 3575 }
```

- Текст 429 после DEV-484 **один для всех источников** («Only N backups…», без слова `instances`; до 20-Oct ручной бэкап отвечал
  «Only N backup instances…»). Шаблон: `Only {limit} backups may be generated within a {period} second span of time.`
- С [DEV-586](../../../tickets/DEV-586.md) (`panel!1708`, prod 26-Oct-2026) 429 несёт `error_code: backup_throttled`, `retry_after` (секунды)
  и заголовок `Retry-After` с тем же значением ✅ prod 27-Oct-2026 (instances и folders). До этого заголовка не было.
- UI (`new-panel!574`): один тост «Backup limit reached for this server. Please try again in N minutes» (N = ceil(retry_after/60),
  ≤ 60 с - «in a minute», `null` - текст про саппорт); 400 и 422 - текст сервера одним тостом. Было два тоста ([DEV-484/OBS-1](../../../tickets/DEV-484.md#находки)).

## POST /servers/{uuid}/backups/databases

Бэкап базы данных сервера, тело с `databaseId`. Запись в `backup_databases`.

| Код | Когда | Как проверено |
|---|---|---|
| 202 | принят; окно частоты не проверяется (3 подряд проходят) | ✅ prod, 20-Oct-2026 |
| 400 | нет свободных слотов: тот же текст «Cannot create a new backup, this server has reached its limit of N backups.» | ✅ |
| 400 | база пустая: «Seems like this database is empty.» (поведение до DEV-484) | ✅ |
| 404 | `databaseId` базы другого сервера или несуществующей базы; строка бэкапа не создаётся | ✅ (хотфикс из panel!1691) |

## PUT /servers/{uuid}/backups/databases/{backupUUID}

Меняет имя бэкапа базы. Поле `database_id` из запроса убрано (`UpdateBackupDatabaseRequest`) 📖: если прислать `database_id`
другой базы, ответ 200, имя меняется, база остаётся прежней ✅. Раньше через этот PUT можно было перепривязать бэкап к чужой базе.

## Расписания (scheduled backups)

Планировщик - команда `gl:handle-scheduled-backups`, запускается раз в минуту 📖.

| Ситуация | Поведение | Как проверено |
|---|---|---|
| Шаблон расписания (строка без архива) | не занимает ни слот, ни окно: после создания 3 расписаний ручной бэкап сразу 202 | ✅ |
| `auto_replace` | держит одного «ребёнка»: при полных слотах новый бэкап создаётся, старый удаляется, `used` не растёт | ✅ |
| Интервальное без `auto_replace`, слоты полные | запуск пропускается, следующий переносится ровно на интервал | ✅ |
| Одноразовое, слоты полные | запуск пропускается, строка расписания не меняется и остаётся в списке ([OBS-2](../../../tickets/DEV-484.md#находки)) | ✅ |
| `retain_count = N` | после N-го запуска расписание удаляется, его бэкапы отвязываются и становятся обычными (сразу попадают в окно: `refusal = throttled`) | ✅ N=3 |
| Пользователь удалил расписание | его бэкапы остаются обычными | ✅ |
| Только «Set interval» без «Schedule Backup» | сразу создаётся обычный бэкап (занимает слот и окно) + отдельное расписание с первым запуском через интервал | ✅ |
| Отказ запуска | пишется в лог «Scheduled backup skipped...» 📖; логов prod нет, пропуски подтверждены по данным | ⏸️ |

- **Время в UTC, срабатывание только в точную минуту** `schedule_date + schedule_time`. UI показывает и отправляет локальное время,
  переводя в UTC. Пропущенная минута не догоняется.
- **Единицы интервала:** форма в UI предлагает дни, недели, месяцы (этого достаточно, решение владельца); API принимает ещё минуты и часы -
  для коротких интервалов в тестах создавать расписание через API тем же телом, что отправляет форма.
- Подпись расписания «Last N backups» - обратный отсчёт запусков до `retain_count`. Если создать интервальное расписание через API с `retainCount: null` (UI так не умеет), подпись показывает «Last 0», затем «Last -1» ([снято](../../../tickets/DEV-484.md#находки)).

## Установка модпака и квота

`POST .../minecraft/modpacks` в режиме `backup` проверяет общую квоту: при `free = 0` 409 `no_free_backup_slots`, диалог «No Free Backup Slots»
✅ ([API - modpacks](modpacks.md)). Двойной клик «Install anyway» отправил 2 POST (оба 200), пре-инсталл бэкап создан один: бэкенд дедуплицирует ✅.

## История изменений

| Дата | Тикет | Что изменилось |
|---|---|---|
| 2026-09-09 | [DEV-452](../../../tickets/DEV-452.md) | префлайт троттлинга для установки модпака (счётчик `backups`) |
| 2026-09-16 | [DEV-484](../../../tickets/DEV-484.md) | `panel!1611` (+ `!1614` тест): пре-инсталл бэкап вне лимита частоты, флаг `is_system_initiated` |
| 2026-10-20 | [DEV-484](../../../tickets/DEV-484.md) | [panel!1691](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1691): общая квота по 4 таблицам, `meta.quota`, единый текст 429, расписания не «умирают» при отказе, хотфикс бэкапа чужой базы (404) и PUT `database_id`. [new-panel!564](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/564): счётчик из `meta.quota`, заглушка «Slots Limit Reached» |
| 2026-10-26 | [DEV-586](../../../tickets/DEV-586.md) | `panel!1708`: 429 создания бэкапа с `error_code: backup_throttled`, `retry_after`, `Retry-After`; `new-panel!574` (27-Oct): один тост с минутами |
| 2026-10-27 | [DEV-582](../../../tickets/DEV-582.md) | `panel!1713`: зависшие PENDING (старше `backups.prune_age` 360 мин) → FAILED командой `gl:backups:fail-stale-pending` раз в 30 мин; бэкфил `status` |

**Как проверено.** Prod, 20-Oct-2026, серверы [srv:f8e7df56](../../../registry/test-servers.md#f8e7df56) (квота ядра, сверх лимита, окно),
[srv:546bc52e](../../../registry/test-servers.md#546bc52e) (расписания), [srv:ca326e28](../../../registry/test-servers.md#ca326e28) (`retain_count`),
[srv:9c891502](../../../registry/test-servers.md#9c891502) (бэкапы баз, тестовый пользователь). Отчёт со скринами:
[артефакт DEV-484 r2](https://claude.ai/artifact/537r7XRR8NiYidKCqNWy5C). Пути эндпоинтов папок и расписаний и полный текст MR в этой
сессии не перечитывались (GitLab недоступен из браузера сессии) ❓. Не проверено: `FAILED` не занимает слот, логи планировщика.
