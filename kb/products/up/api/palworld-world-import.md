---
id: UP/api/palworld-world-import
title: API - palworld world import (импорт мира Palworld)
type: api
product: UP
status: draft
updated: 2026-11-04
verified_on: 2026-11-04
tickets: [DEV-597]
features: [UP/game-settings]
sources:
  - kb/tickets/DEV-597.md
  - test-docs/ultra.panel/DEV-597/ (findings r1-r3, не в git)
  - MR panel!1724, !1742, !1751, !1769
---

# API - palworld world import

> **В двух словах.** Импорт идёт в три запроса: состояние миров, ссылка на загрузку в Wings, запуск импорта (202).
> Дальше работает workflow, его итог читается из `GET /servers/{uuid}` (поле `palworld_world_import`). Пока держится
> лок импорта, start и restart отклоняются 409.

Знаки: ✅ живьём, 🧪 подмена ответа, 📖 из MR, ❓ нет в источниках. Легенда: [README](README.md#легенда). Все факты - prod, 30-Oct..04-Nov-2026.

## Эндпоинты

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/servers/{uuid}/palworld/world-import` | миры сервера и можно ли импортировать |
| POST | `/servers/{uuid}/palworld/world-import/upload` | подписанная ссылка Wings для загрузки zip в `/.palworld-world-import` |
| POST | `{wings}/upload/file?token=...&directory=/.palworld-world-import` | сама загрузка (браузер → Wings напрямую) |
| POST | `/servers/{uuid}/palworld/world-import` | запустить импорт, тело `{archive, world}` |
| GET | `/servers/{uuid}` | поле `palworld_world_import` - итог ([server](server.md)) |
| POST | `/servers/{uuid}/power` | под локом импорта start/restart = 409 (!1769) |

## GET /servers/{uuid}/palworld/world-import

✅ 200 `{status:"ready", can_import:true, target_world:"<id>", worlds:[{name, modified_at}]}`.

| Ситуация | Ответ |
|---|---|
| Сервер ещё не создавал мир (нет `SaveGames/0` или она пустая) | ✅ 200 `status: server_not_started` (до !1742 при отсутствии папки было 400 code:500 - F1) |
| Несколько миров | ✅ выбор обязателен (`world_required` при импорте без `world`) |
| Не-Palworld сервер | ✅ 400 «The requested server is not a Palworld server.» (не 404, OBS-8) |
| Сбой связи панели с нодой | ✅ 400 «Could not establish a connection to the machine running this server.», UI «Could not read the server worlds» |

## POST /servers/{uuid}/palworld/world-import

Тело `{"archive":"palworld-world.zip","world":"<world id>"}`. ✅ 202 `{success:true,data:{world}}`.

| Ответ | Когда |
|---|---|
| 202 | принят, workflow запущен, пишется `palworld_world_import.status = in_progress` ✅ |
| 409 `import_in_progress` | второй импорт, пока держится лок ✅ |
| 422 `archive_missing` | нет загруженного архива ✅ (до !1742 - 400) |
| 422 `world_not_found` | выбранный мир исчез; staging чистится ✅ (с !1742) |
| 422 валидация | `archive` с путём / не `.zip`, `world` с путём или `..` ✅ |
| 400 «Could not establish a connection…» | сбой связи с нодой; UI тост «Could not import the world. Please try again.» ✅ |

Событие журнала `server:palworld.world-import.started` с `{world}`, инициатор - пользователь ✅.

## Итог импорта - `palworld_world_import` (!1751)

Поле в `GET /servers/{uuid}`: `{status, world, started_at, finished_at}` или `null` (нет импорта или не Palworld) ✅. Хранится сутки 📖.

| `status` | Значит | Журнал (без инициатора) |
|---|---|---|
| `in_progress` | идёт, `finished_at: null` - фронт держит кнопки питания | - |
| `imported` | мир заменён ✅ | `world-import.imported` ✅ |
| `server_did_not_stop` | сервер не ушёл в offline за 120 с, мир не тронут 📖 | `world-import.server-did-not-stop` 📖 |
| `failed` | workflow оборвался на очистке/переносе 📖 | `world-import.failed` 📖 |

`imported` пишется сразу после команды старта, до загрузки мира игрой; поэтому фронт ещё 30 с проверяет, что сервер держится running ✅.

## Гейт питания под локом (!1769)

✅ `POST /power` `restart` и `start` → 409 `{"error":"palworld_world_import_in_progress","message":"The world is being imported. The server can be started once the import is finished."}` (ru/uk переводы есть 📖). `stop` → 204, `kill` проходит.
✅ `GET /api/client/servers/{uuid}/websocket` (старая панель) под локом: права без `control.start`/`control.restart`; после релиза снова как были. Токен, выданный до импорта, живёт до 10 мин 📖.
✅ Расписание с задачей power restart, execute под локом - `schedule.execute` есть, рестарта нет.
⚠️ Новая панель шлёт питание по websocket `set state` напрямую в Wings - гейт её не покрывает, защита только disabled-кнопками (OBS-9).

## История

| Дата | Тикет | Что |
|---|---|---|
| 30-Oct-2026 | [DEV-597](../../../tickets/DEV-597.md) | эндпоинты появились (!1724) |
| 02-Nov-2026 | [DEV-597](../../../tickets/DEV-597.md) | `server_not_started` при отсутствии папки, `archive_missing` 422, очистка staging на `world_not_found` (!1742) |
| 04-Nov-2026 | [DEV-597](../../../tickets/DEV-597.md) | `palworld_world_import` в сервере, исходы в журнал (!1751); 409 на start/restart под локом (!1769) |
