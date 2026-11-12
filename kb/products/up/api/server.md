---
id: UP/api/server
title: API - server (состояние и канал ошибок установки модпака)
type: api
product: UP
status: draft
updated: 2026-11-12
verified_on: 2026-10-16
tickets: [DEV-452, DEV-597, DEV-587]
features: [UP/modpack-catalog, UP/server-overview]
sources:
  - memory: dev452-modpack-backup-fail-reasons
  - jira: DEV-452 (описание, комментарий 03-Sep-2026)
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §7b-ter
---

# API - server

> **В двух словах.** Сервер отдаёт своё состояние одним GET. Для установки модпака важны два поля:
> `modpack_event` (идёт установка) и `modpack_install_error` (почему она остановилась). Фронт читает
> ошибку, показывает тост и сразу подтверждает её удалением. Значений ошибки теперь 8 (было 2).

Знаки: ✅ живьём, 🧪 подмена ответа в браузере, 📖 из тикета, ❓ нет в источниках. Легенда: [README](README.md#легенда).

## Эндпоинты

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/servers/{uuid}` | состояние сервера, в том числе поля установки модпака |
| DELETE | `/servers/{uuid}/install-error` | подтвердить (очистить) `modpack_install_error` ❓ точный путь |
| POST | `/servers/{uuid}/reinstall` | переустановка; тело `{reallocate: bool}` (Delete files) - см. [ниже](#post-serversuuidreinstall) |
| POST | `/servers/{uuid}/tasks/run` | разовый запуск задачи - см. [ниже](#post-serversuuidtasksrun) |
| ~~POST~~ | ~~`/servers/{uuid}/version`~~ | **удалён** 12-Nov-2026 (panel!1811) - см. [ниже](#post-serversuuidversion-удалён) |

Путь DELETE в источниках записан как `.../install-error`. Полный путь (с префиксом `minecraft/modpacks/` или без) ❓.

## GET /servers/{uuid}

Нас интересуют только поля установки модпака. Остальное тело ответа здесь не описано ❓.

| Поле | Тип | Смысл |
|---|---|---|
| `modpack_event` | объект или `null` | идёт установка модпака. `null`, если установки нет. Структура объекта ❓ |
| `modpack_install_error` | string или `null` | код причины остановки установки. `null`, если ошибки нет |
| `palworld_world_import` | объект или `null` | последний импорт мира Palworld `{status, world, started_at, finished_at}`, хранится сутки; `null` у не-Palworld ✅ (04-Nov-2026, [DEV-597](../../../tickets/DEV-597.md), подробно - [palworld-world-import](palworld-world-import.md)) |

После отказа 409 `no_free_backup_slots` оба поля остаются `null` ✅ (prod, 16-Oct-2026).

**Значения `modpack_install_error`** (enum `ModpackInstallError`, [DEV-452](../../../tickets/DEV-452.md))

| Код | Смысл | Путь установки | Было до DEV-452 |
|---|---|---|---|
| `backup_failed` | теперь только отказ, о котором отчиталась нода | оба | да (сюда сливалось всё) |
| `backup_throttled` | лимит частоты бэкапов; в async-канале **без** `retry_after` | оба | нет |
| `backup_daemon_error` | ошибка демона при старте бэкапа | оба | нет |
| `backup_timed_out` | таймаут ожидания бэкапа | оба | нет |
| `no_free_backup_slots` | нет свободных слотов (асинхронный вариант того же 409) | оба | нет |
| `reinstall_not_started` | переустановка не началась | только workflow | нет, не писалось |
| `install_failed` | сама установка упала | только workflow | нет, не писалось |
| `install_timed_out` | таймаут установки | только workflow | нет, не писалось |

«Оба» значит: и workflow-путь (`WORKFLOW_MODPACK_INSTALL_ENABLED=true`), и легаси-джоба. Три причины стадии установки
легаси-джоба не пишет и таймаута установки у неё нет 📖. Что именно значило «было 2 значения» (кроме `backup_failed`) ❓.

Пример (🧪, мок ответа GET; остальные поля тела опущены):

```json
{
  "modpack_event": null,
  "modpack_install_error": "backup_timed_out"
}
```

**Поведение**

1. Ошибка читается фронтом при загрузке страницы сервера. Тост появляется примерно через 3 с после загрузки (✅ наблюдение).
2. Сразу после тоста фронт отправляет один DELETE `.../install-error` (подтверждение). Повторный GET после этого даёт `null` ❓ (в тесте не проверялось отдельно).
3. Неизвестный код: тоста нет и DELETE не отправляется (🧪).
4. Хранение причины - кеш `ModpackInstallErrorStore`; формат кеша в DEV-452 не менялся, миграции нет 📖.
5. В логе панели остаётся строка с точной причиной `Modpack install: could not initiate backup for {uuid}: ...` 📖 (логов у QA нет, не проверено).
6. Старая React-панель канала не имеет.

**История изменений**

| Дата | Тикет | Что изменилось |
|---|---|---|
| 2026-09-09 | [DEV-452](../../../tickets/DEV-452.md) | enum 2 → 8 значений, `backup_failed` теперь только отказ ноды, DELETE-подтверждение остаётся |

**Где видно в UI.** Тосты `useModpackInstallError.ts`, библиотека `@kyvg/vue3-notification`, селектор `.vue-notification-wrapper`
(не `v-snackbar` и не `role=alert`). Для каждого из 8 кодов свой текст (точные тексты в MR `new-panel!515`, у нас дословно не сохранены ❓).

**Как проверено.** Prod, 16-Oct-2026, 🧪: мок `GET /servers/{uuid}` через `page.route` с каждым из 8 кодов. На каждый код - ровно один тост с
текстом из MR и один DELETE; на неизвестный - ни того, ни другого. Живьём не воспроизводилось: нода, демон и таймауты безопасно не вызвать.
Бэкенд-ветки покрыты юнит-тестами MR `panel!1581` 📖.

## POST /servers/{uuid}/reinstall

Тело `{"reallocate": true|false}` (галочка Delete files). Ответ 200 `SuccessResponse`. После переустановки: сброс `server_modpacks`
всегда, `server_client_only_mod_overrides` только при `reallocate`; с [DEV-587](../../../tickets/DEV-587.md) сбросы идут до письма, письмо
выключено флагом `NOTIFICATION_SENDING_ENABLED` (по умолчанию `false`). До фикса зависший `notifications-center` давал 400 через 30 с
(`cURL error 28 ... fetch-ids-by-emails`). ✅ prod 11-Nov-2026: 200 за 356 мс, сбросы 1 → 0 и 2 → 0.

## POST /servers/{uuid}/tasks/run

Тело `{action: command|power|backup, payload: string, options?: array, time_offset?: int>=0}`. Ответ 200 `{"success":true,"data":null}`,
ошибка 400 `{error}` (например сервер с непустым `status`: suspended / reinstalling). С `time_offset` задача ставится в очередь с задержкой
(до DEV-587 только эта ветка слала письмо). ✅ prod 11-Nov-2026: `command`, `time_offset: 5` на offline-сервере, 200 за 241 мс.

## POST /servers/{uuid}/version (удалён)

**Удалён 12-Nov-2026** ([panel!1811](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1811) + фронт
[new-panel!639](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/639), по [DEV-587/OBS-2](../../../tickets/DEV-587.md#находки)):
маршрут, метод `ServerController::updateServerGameVersion`, request, action, DTO, ключ перевода `api_v2.errors.server.game_version.update_failed`;
во фронте `updateServerGameVersion` и `UPDATE_SERVER_GAME_VERSION`. Право `change_version` осталось (установка Java/Bedrock, отказ от World Backup).
✅ prod 12-Nov-2026: 400 «The route ... could not be found» (панель на любой неизвестный маршрут отдаёт 400, не 404).

История: был сломан с мая-июня 2025 - rules ждали `server_id` uuid-строкой, DTO `int` → 400 TypeError; письмо в нём (август 2025) не уходило ни разу.
