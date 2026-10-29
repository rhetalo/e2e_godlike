---
id: UP/api/files
title: API - files (потоковый поиск файлов сервера)
type: api
product: UP
status: draft
updated: 2026-10-29
verified_on: 2026-10-29
tickets: [DEV-476, DEV-480]
features: [UP/files]
sources:
  - test-docs/ultra.panel/DEV-476/DEV-476-jira-comment.md
  - test-docs/ultra.panel/DEV-480/DEV-480-report.html
  - test-docs/ultra.panel/DEV-476/DEV-476_QA_report.pdf
  - memory: dev476-file-search-perf
---

# API - files

> **В двух словах.** Поиск по файлам сервера отдаёт результат потоком (`text/event-stream`): совпадения приходят по мере
> обхода, в конце кадр `end` со статусом. У поиска жёсткие лимиты по длине запроса, числу совпадений, времени и числу
> параллельных поисков. Остальные эндпоинты файлового менеджера здесь пока не описаны ❓.

Знаки: ✅ живьём, 🧪 подмена ответа в браузере, 📖 из тикета, ❓ нет в источниках. Легенда: [README](README.md#легенда).

## Эндпоинты

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/servers/{uuid}/files/search` | потоковый поиск по имени файла ✅ |
| GET | `/servers/{uuid}/files?dir=/` | листинг папки; Config берёт из него иконку сервера ✅ |

## GET /servers/{uuid}/files/search

| Параметр | Смысл |
|---|---|
| `file` | строка поиска (не `query`), от 2 символов ✅ |
| `dir` | откуда искать ✅. Несуществующая `dir` отдаёт `complete` без ошибки ✅ (владелец считает нормой) |

Ответ `text/event-stream`, кадры разделены `\n\n` ✅:

| Кадр | Что внутри |
|---|---|
| `match` | одно совпадение, есть `path` ✅ |
| `progress` | ход обхода ✅, состав полей ❓ |
| `end` | `status`, `reason`, `listings`, `matches`, `elapsed_ms`, `failed_directories` ✅; с DEV-480 ещё `engine` и `fallback_reason` ✅ |

`status` в `end`: `complete` (всё обошли) или `truncated` с `reason` `matches` (упёрлись в 500) ✅. Остальные значения `reason`
(дедлайн, лимит листингов, обрыв) по источникам ❓, в Graylog пишется `event=file_search` с `reason=aborted` 📖.

### Двигатель: native или bfs (DEV-480)

С [DEV-480](../../../tickets/DEV-480.md) поиск может идти на самой ноде (Wings `GET /api/servers/{uuid}/files/search`), а не обходом из панели.
Решает флаг [wings-native-file-search](../../../registry/flags.md#wings-native-file-search) **по владельцу сервера** и то, умеет ли нода.

| `engine` | `fallback_reason` | Когда |
|---|---|---|
| `native` | `null` | флаг у владельца + нода с новым Wings ✅ |
| `bfs` | `null` | флаг Off или у владельца нет флага ✅ |
| `bfs` | `unsupported` | флаг есть, нода без endpoint (первый поиск) ✅ |
| `bfs` | `known_unsupported` | повтор на той же ноде в течение 15 мин (кеш Redis) ✅ |
| `bfs` | `server_error` | нода ответила 5xx до начала стрима 📖 |

Кадры, лимиты, guard 429 и защита от `../` на обоих путях одинаковые ✅. На BMC4 `jar`: native 345 мс, bfs 5 419 мс,
выдача 1:1. Лаунчер (`{results, truncated}`) ходит через тот же диспетчер ✅.

### Лимиты

| Лимит | Значение | Как проявляется |
|---|---|---|
| Длина запроса | от 2 символов | 422 ✅; UI запрос не шлёт, тултип «Enter at least 2 characters to search» |
| Совпадения | 500 | `truncated/matches`, баннер «Too many matches to show them all - narrow your search term.» ✅ |
| Листинги папок | 1500 📖 | ❓ на проде не упирались |
| Дедлайн | 15 с 📖 | ❓ на проде не упирались (весь BMC4 за 5,8 с) |
| Параллель | 2 поиска на пользователя, 4 на ноду | третий - 429 до открытия стрима ✅ |
| Throttle | 20 запросов в минуту (`throttle:20,1`) | 21-й - 429 «Too Many Attempts.» ✅; 422 тоже считаются |

⚠️ Оба 429 (параллель и throttle) показывают в UI один и тот же тост. Владелец считает это нормой (20-Oct).

### Коды и безопасность

| Случай | Ответ |
|---|---|
| Без токена | 401 ✅ |
| Чужой uuid | 400 ✅ |
| `dir=/../../`, `/../../../etc` | за корень сервера не выводит ✅ |
| Wings 500 на отдельной папке | папка в `failed_directories` 📖 (на проде не вызвать, юнит-тесты MR) |
| Обрыв клиентом | воркер останавливается, слот свободен через ~0,3 с ✅ |

⚠️ В UI запрос уходит **только по Enter** (ввод текста поиск не запускает) и ищет от текущей папки (`?dir=` страницы).
В таблице результатов у строки под именем - папка совпадения (`.server__file-manager__file-list__file-path`).

## Как проверено
- 20-Oct-2026, prod, [srv:8c2a6bd7](../../../registry/test-servers.md#8c2a6bd7) (BMC4: 425 папок, 5003 файла) - QA [DEV-476](../../../tickets/DEV-476.md).
- Выдача сверена с полным деревом сервера: 11 из 11 выборок 1:1, корзина в выдачу не попадает.
- 23-Oct-2026: канонический Paper-сервер автотестов, `/plugins` + `config` - 1,6 с, `complete`; от корня 335 листингов за 11,9 с (DEV-476/OBS-1).
  Автотест: `tests/game/panel/files.search.spec.ts`.
- Токен не записан (`<access_token>` из `localStorage.access_token`).

## История изменений

| Дата | Тикет | Что |
|---|---|---|
| 14-Sep-2026 | [DEV-476](../../../tickets/DEV-476.md) | panel!1597 + new-panel!519: поиск стал потоковым, добавлены лимиты и защита от параллели |
| 28-Oct-2026 | [DEV-480](../../../tickets/DEV-480.md) | panel!1696 + wings!11: нативный поиск на ноде за флагом, `engine` / `fallback_reason` в `end` |
