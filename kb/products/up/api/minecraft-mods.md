---
id: UP/api/minecraft-mods
title: API - minecraft mods (установка мода, manifest.json, окно отключённых модов)
type: api
product: UP
status: draft
updated: 2026-10-23
verified_on: 2026-10-23
tickets: [DEV-556, DEV-492, DEV-515]
features: [UP/client-only-mods, UP/files, UP/mods-loader-gating]
sources:
  - test-docs/ultra.panel/DEV-556/DEV-556-REPORT.md
  - test-docs/ultra.panel/DEV-556/mrs-diff.md (диффы panel!1688-1690, !1701, new-panel!563, !571)
  - memory: dev556-mod-install-errors-ui
---

# API - minecraft mods

> **В двух словах.** Установка одного мода (новая панель и старый дизайн), установка списка модов из CurseForge
> `manifest.json` и окно «Some mods were disabled». После [DEV-556](../../../tickets/DEV-556.md) отказы отдают
> понятный текст: несуществующий файл отличается от сбоя провайдера, манифест принимает часть записей и называет
> пропущенные. Отказы по ядру и лоадеру действуют только для серверов в раскатке
> [flag:extension-compatibility](../../../registry/flags.md#extension-compatibility) (по владельцу).

Знаки: ✅ живьём, 🧪 подмена ответа в браузере, 📖 из тикета/MR, ❓ нет в источниках. Легенда: [README](README.md#легенда).

## Эндпоинты

| Метод | Путь | Что делает |
|---|---|---|
| POST | `/servers/{uuid}/minecraft/mods` | поставить один мод (новая панель) ✅ |
| POST | `/servers/{uuid}/minecraft/manifest/validate` | проверить manifest.json, ничего не ставит ✅ |
| POST | `/servers/{uuid}/minecraft/manifest/install` | поставить моды из manifest.json ✅ |
| GET | `/servers/{uuid}/minecraft/client-only-notice` | состояние окна «Some mods were disabled» ✅ |
| POST | `/servers/{uuid}/minecraft/client-only-notice/ack` | «Don't Show Again»: погасить окно насовсем ✅ |
| POST | `https://panel.godlike.host/api/client/servers/{uuid}/minecraft/mods/install` | старый дизайн (не v2), cookie + XSRF ✅ |

## Тексты отказов

| Ситуация | Текст | Где |
|---|---|---|
| Ядро не поддерживает моды (Paper и т.п., в раскатке) | «Mods cannot be installed: the current server core does not support them. Change the core on the Versions tab first.» | v2 409 `mods_not_supported`, legacy 400 ✅ |
| Файл под другой лоадер (в раскатке) | «This mod version is not compatible with the server loader (NeoForge).» | v2 409 `incompatible_mod_loader`, legacy 400 ✅ |
| Файла нет у провайдера (404) или пустой `downloadUrl` | «This file cannot be downloaded from the content provider: it no longer exists or is not available for download.» | v2 400, legacy 400, манифест - в `failures` ✅ (404); пустой `downloadUrl` 📖 |
| Сеть, таймаут, 400/401/403/429/5xx провайдера | «The content provider is temporarily unavailable. Please try again later.» | 📖 (на проде не вызвать) |

## POST /servers/{uuid}/minecraft/mods

Тело JSON `{ provider: "curseforge" | "modrinth", mod_id, version_id }` ✅. Успех `200 {"success":true,"data":null}` ✅,
после установки запускается дочитка вердиктов ([DEV-492](../../../tickets/DEV-492.md)). Отказ провайдера - `400 {"success":false,"error":"..."}` ✅.

## POST /servers/{uuid}/minecraft/manifest/validate

`multipart/form-data`, поле `manifest` (файл) ✅. Всегда 200 ✅:

| Случай | Ответ |
|---|---|
| Валиден, все записи годные | `{"success":true,"data":{"isValid":true,"invalidEntries":[]}}` ✅ |
| Валиден, часть записей битые | `isValid: true`, `invalidEntries: [{index, error}]`, например «File entry at index 2 is missing or has invalid 'fileID' field (must be numeric)» ✅ |
| Все записи битые | `{"success":false,"data":{"isValid":false,"error":"No file entry in the manifest can be installed. <причина записи 0>"}}` ✅ |
| Не JSON / пустой / корень-массив / нет `files` / `files: []` | `isValid: false`, `error`: «Invalid JSON: Syntax error» / «File is empty» / «Root element must be an object, not an array» / «Missing or invalid "files" field. It must be an array» / «The "files" array is empty» ✅ |

ID проверяются строго: положительное целое или строка из цифр (`"1e3"`, `"1.5"`, `"-4"` - битые) 📖. Запись-не-объект - битая запись, не весь манифест ✅.
Ядро и лоадер валидация не проверяет: на Paper вне раскатки ответ тот же ✅.

## POST /servers/{uuid}/minecraft/manifest/install

`multipart/form-data`: `manifest` + необязательный `retry[i][projectID]`, `retry[i][fileID]` (1..1000 пар, целые ≥ 1) ✅.

| Случай | Ответ |
|---|---|
| Всё встало | `200 {"success":true}` ✅ |
| Часть не встала | `200 {"success":false,"error":"Some mods failed to install","data":["<текст>", ...],"failures":[{projectID, fileID, error, retryable}]}` ✅. Битая запись - `projectID/fileID: null`, `retryable: false`; файла нет у провайдера - `retryable: false`; сбой провайдера - `true` 📖 |
| Ядро / лоадер (в раскатке) | `409 {"success":false,"error":"...","error_code":"mods_not_supported" \| "incompatible_mod_loader"}` ✅ |
| `retry` с кривыми типами | `422 {"message":"The retry.0.projectID must be an integer."}` ✅ |
| `retry` | ставит только перечисленные записи ✅; битые записи при `retry` не перечисляются 📖 |

⚠️ `retry` с парой, которой нет в манифесте, отвечает `{"success":true}` и ничего не ставит ([DEV-556/F2](../../../tickets/DEV-556.md#находки)).
⚠️ Установка не убирает старую версию того же мода ([DEV-556/F3](../../../tickets/DEV-556.md#находки)).

## GET /servers/{uuid}/minecraft/client-only-notice

`{"success":true,"data":{"pending", "revision", "mods", "unattributed_mods"}}` ✅

| Поле | Смысл |
|---|---|
| `pending` | есть неподтверждённое отключение - показать окно ✅ |
| `revision` | наибольший id неподтверждённых строк, `null` при `pending: false`; растёт только при новом отключении ✅ |
| `mods` | имена наших отключённых модов, которые сейчас лежат как `.jar.disabled`; мод, включённый владельцем, пропадает ✅ |
| `unattributed_mods` | прочие `.jar.disabled`, если строки записаны до колонки `filename` (часть отключена вручную) 📖, живьём не видели |

Время ответа 0,2-0,7 с, в том числе на сервере с 477 модами ✅. Сабюзер ❓.

## POST /servers/{uuid}/minecraft/client-only-notice/ack

Без тела, `200` ✅. После - `pending: false`, окно не показывается и в новом браузере ✅. «Got It» этот запрос НЕ шлёт (by design, DEV-556).

## POST /api/client/servers/{uuid}/minecraft/mods/install (старый дизайн)

Тело `{ provider, modId, versionId }`, авторизация cookie + `X-XSRF-TOKEN` ✅. Успех `204` ✅. Отказ -
`400 {"errors":[{"code":"DisplayException","status":"400","detail":"<текст>"}]}` ✅, фронт показывает `detail` тостом (panel!1689).
⚠️ Вне раскатки DEV-515 проверки ядра нет: Fabric API ставится на Paper ([DEV-556/F1](../../../tickets/DEV-556.md#находки)).
