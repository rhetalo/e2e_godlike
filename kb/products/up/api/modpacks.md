---
id: UP/api/modpacks
title: API - modpacks (установка и список установленных)
type: api
product: UP
status: draft
updated: 2026-10-16
verified_on: 2026-10-16
tickets: [DEV-452, DEV-484, DEV-515]
features: [UP/modpack-catalog, UP/backups]
sources:
  - memory: dev452-modpack-backup-fail-reasons, dev484-backup-throttle
  - jira: DEV-452 (описание, комментарии 03-Sep и 14..15-Sep-2026)
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §7b-ter
  - kb/tickets/DEV-515.md (обязательные поля, 409 modpacks_not_supported)
---

# API - modpacks

> **В двух словах.** Установка модпака на сервер - один POST. Перед установкой в режиме «Create Backup and
> Install» бэкенд делает префлайт: сначала лимит частоты бэкапов, потом свободные слоты. Отказ приходит
> сразу кодом 409 и экран прогресса не открывается. После [DEV-484](../../../tickets/DEV-484.md) пре-инсталл
> бэкап из лимита частоты исключён, поэтому `backup_throttled` из новой панели получить нельзя.
> Асинхронные причины отказа приходят другим каналом: [API - server](server.md).

Знаки: ✅ живьём, 🧪 подмена ответа в браузере, 📖 из тикета, ❓ нет в источниках. Легенда: [README](README.md#легенда).

## Эндпоинты

| Метод | Путь | Что делает |
|---|---|---|
| POST | `/servers/{uuid}/minecraft/modpacks` | запустить установку модпака (по сути переустановка сервера) |
| GET | `/servers/{uuid}/minecraft/modpacks/installed` | список установленных на сервере модпаков |
| GET | `/servers/{uuid}/minecraft/modpacks?provider=...` | каталог, описан в [UP/modpack-catalog](../modpack-catalog.md#как-работает-под-капотом) |

## POST /servers/{uuid}/minecraft/modpacks

Запускает установку. Режим `delete` и `overwrite` затирают файлы сервера, `backup` сначала делает бэкап.
На проде это изменение живого сервера: тестируем только на своих серверах и с ок владельца.

**Параметры пути**

| Имя | Тип | Смысл |
|---|---|---|
| `uuid` | string | UUID сервера |

**Тело запроса** (поля названы по QA DEV-452/DEV-484 и [DEV-515](../../../tickets/DEV-515.md))

| Поле | Тип | Обязательно | Значения / смысл |
|---|---|---|---|
| `provider` | string | ❓ | источник: CurseForge, Modrinth, FTB и др. (точные строки ❓) |
| `modpack_id` | string | ❓ | id сборки у провайдера |
| `version_id` | string | ❓ | id версии сборки |
| `variant_slug` | string | ❓ | вариант сборки (например оптимизированный), точный формат ❓ |
| `install_mode` | string | да (по DEV-515) | `delete` (удалить файлы), `backup` («Create Backup and Install»), `overwrite` («Install Over») |
| `world_folder` | string | да (по DEV-515) | папка мира, которую панель подставляет в диалоге; поле World Folder в UI |

Пример без секретов (значения `provider`, `modpack_id`, `version_id` условные ❓):

```json
{
  "provider": "<provider>",
  "modpack_id": "<modpack_id>",
  "version_id": "<version_id>",
  "install_mode": "backup",
  "world_folder": "world"
}
```

**Ответы**

| Код | error_code | Когда | Как проверено |
|---|---|---|---|
| 2xx (200 или 202 ❓) | - | префлайт пройден, установка стартует, выставляется `modpack_event` | 📖 код ответа ❓ |
| 409 | `backup_throttled` | `install_mode=backup`, лимит частоты бэкапов исчерпан | 🧪 мок на проде 16-Oct-2026. Живьём недостижим, см. ниже |
| 409 | `no_free_backup_slots` | `install_mode=backup`, нет свободных слотов бэкапов | ✅ живой запрос на проде 16-Oct-2026 |
| 409 | `modpacks_not_supported` | ядро сервера без модов, под [flag:extension-compatibility](../../../registry/flags.md#extension-compatibility) | 📖 [DEV-515](../../../tickets/DEV-515.md) |

Остальные коды (400/422 на невалидное тело, 403, 404) не снимали ❓.

Пример 409 `backup_throttled` (поля по описанию MR и моку; точные имена верхнего уровня, например `error`, ❓):

```json
{
  "error_code": "backup_throttled",
  "retry_after": 2220,
  "retry_at": "<ISO 8601>",
  "throttle_limit": 1,
  "throttle_period": 3600
}
```

| Поле | Смысл |
|---|---|
| `retry_after` | секунды до повтора; `null` - показывается «not allowed, contact support» |
| `retry_at` | момент, когда окно освободится, ISO |
| `throttle_limit` | сколько бэкапов разрешено в окне |
| `throttle_period` | длина окна в секундах (если нет - UI показывает общий текст) |

Для `no_free_backup_slots` тело и текст не менялись относительно [DEV-319](https://antihost.atlassian.net/browse/DEV-319); структура ответа ❓.

**Поведение, флаги, env**

1. Префлайт идёт **только** при `install_mode=backup`. Порядок: сначала троттлинг, потом слоты. Так сделано
   намеренно: при `backup_limit=1` после пре-инсталл бэкапа активны оба условия, и совет старого текста
   «удалите бэкап» стирал бы единственную копию, не снимая троттлинг (комментарий разработчика, 03-Sep-2026 📖).
2. `retry_after` и `retry_at` бэкенд считает сам от **самого старого** бэкапа в окне, а не парсит из исключения ядра
   (в ядре `retry_after` при `limit > 1` считался от последнего: баг, core-файл не правили 📖).
3. Исключение для пре-инсталл бэкапа ([DEV-484](../../../tickets/DEV-484.md), `panel!1611`): строка в `backups` получает
   `is_system_initiated=true` **всегда**, независимо от env, и не попадает в окно троттлинга. Env
   `GODLIKE_PREINSTALL_BACKUP_EXEMPT_FROM_THROTTLE` (по умолчанию `true`) включает или выключает саму проверку.
   Подробно: [API - backups](backups.md#как-работает-лимит-частоты).
4. Следствие: **живой `backup_throttled` из новой панели недостижим.** Окно набивают только не-системные строки `backups`,
   а ручные бэкапы новой панели пишутся в `backup_instances`, которые префлайт не считает
   ([DEV-452/F2](../../../tickets/DEV-452.md#находки)). Проверялось моком. Выключенный env на stage один не помогает.
5. После отказа сервер не меняется: `modpack_event` и `modpack_install_error` остаются `null`, файлы и установленный
   модпак те же (✅ на проде, сервер [srv:f8e7df56](../../../registry/test-servers.md#f8e7df56)).
6. Путь установки зависит от env `WORKFLOW_MODPACK_INSTALL_ENABLED` (по умолчанию `false`). Причины стадии бэкапа
   работают на обоих путях, три причины стадии установки (`reinstall_not_started`, `install_failed`, `install_timed_out`)
   только на workflow-пути. На проде workflow-путь включён: `workflow_runs.workflow_type='godlike-modpack-install'`,
   768 запусков на 16-Oct-2026 ✅.
7. Старая React-панель (`api/client`, `MinecraftModpackController::install`) не имеет ни префлайта, ни канала причин
   ([DEV-452/Q1](../../../tickets/DEV-452.md#хвосты)).

**История изменений**

| Дата | Тикет | Что изменилось |
|---|---|---|
| 2026-08 | [DEV-319](https://antihost.atlassian.net/browse/DEV-319) | режимы установки, префлайт слотов (409 `no_free_backup_slots`). Точная дата ❓ |
| 2026-09-09 | [DEV-452](../../../tickets/DEV-452.md) | `panel!1581`: префлайт троттлинга, 409 `backup_throttled` с `retry_after`, `retry_at`, `throttle_limit`, `throttle_period` |
| 2026-09-16 | [DEV-484](../../../tickets/DEV-484.md) | `panel!1611`: пре-инсталл бэкап помечается `is_system_initiated`, вне окна троттлинга |

**Где видно в UI**

- 409 `backup_throttled` - диалог «Backup Limit Reached» (только крестик, без кнопки перехода). Тексты по полям
  (🧪): один бэкап - «Only one backup per 60 minutes… try again in 37 minutes» (2220 с); limit 3 - «in 25 minutes» (1500 с);
  `retry_after` около 30 с - «in a minute»; нет `throttle_period` - общий текст «…try again in N minutes»;
  `retry_after: null` - «…not allowed… contact support» (ключ `Server_Extensions.Modpack.BackupThrottled_MessageDisabled`).
- 409 `no_free_backup_slots` - диалог «No Free Backup Slots» с кнопкой Go To Backups (✅).
- Цепочка окон до POST: «Install modpacks» → «This modpack needs more RAM» → World Backup ([UP/modpack-catalog](../modpack-catalog.md)).
  RAM-окно остаётся открытым под диалогом отказа ([DEV-452/F3](../../../tickets/DEV-452.md#находки)).

**Как проверено.** Prod, 16-Oct-2026. 409 `no_free_backup_slots`: живой запрос Fabulously Optimized в режиме `backup` на
[srv:f8e7df56](../../../registry/test-servers.md#f8e7df56), UI и состояние сервера после - без изменений. 409 `backup_throttled`:
подмена ответа `page.route` (запрос в сеть не уходил), проверен только UI. Не проверялись: успешный POST (код и тело ❓),
режимы `delete` и `overwrite` под троттлингом (деструктив), отказы ноды и демона.

## GET /servers/{uuid}/minecraft/modpacks/installed

Список установленных на сервере модпаков. В источниках DEV-452/DEV-484 только факт: после отказа 409 установленный модпак
остаётся прежним (`r10t` на [srv:f8e7df56](../../../registry/test-servers.md#f8e7df56)) ✅. Структура ответа, поля и коды ❓.
Запись установленного модпака лежит в `server_modpacks`, от неё считается `required_java` ([UP/modpack-catalog](../modpack-catalog.md#как-работает-под-капотом)).
