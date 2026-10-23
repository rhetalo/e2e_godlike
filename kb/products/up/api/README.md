---
id: UP/api
title: UP API v2 - как устроена API-документация
type: api-index
product: UP
status: draft
updated: 2026-10-16
verified_on: 2026-10-16
sources:
  - memory: dev452-modpack-backup-fail-reasons, dev484-backup-throttle
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §7b-ter, §7i
  - jira: DEV-452 (описание и комментарии)
---

# UP API v2 - как устроена API-документация

> **В двух словах.** Это swagger-подобное описание API игровой панели, которое мы собираем сами из
> того, что видно на тестах: запросы, ответы, коды, поведение, изменения. Официальной спецификации у
> нас нет, поэтому страницы растут по одной после каждого QA. Всё, что не подтверждено источником,
> помечено `❓`. Первая засека сделана по [DEV-452](../../../tickets/DEV-452.md) и
> [DEV-484](../../../tickets/DEV-484.md) (16-Oct-2026).

## Базовые правила

| Что | Значение |
|---|---|
| База | `https://panel.godlike.host/api/v2` |
| Не путать | origin `ultra.panel.godlike.host` отдаёт HTML SPA, а не API |
| Авторизация | `Authorization: Bearer <access_token>`, токен фронт хранит в `localStorage.access_token` |
| Токен в доках | никогда не пишем, только `<access_token>` |
| Идентификатор сервера | `{uuid}` в пути (в UI виден короткий `short`, 8 символов) |
| Формат ошибок | зависит от места: `error` / `error_code` (v2-эндпоинты панели) или `success:false` + `message` (сервисы ядра). Единой схемы нет ❓ |
| Тип клиента | фронт new-panel (Vue), старая React-панель ходит в `api/client`, не v2 ([UP/backups](../backups.md), [DEV-452](../../../tickets/DEV-452.md#хвосты)) |

> Токен в логах и доках не хранить. В KB аккаунт - это роль и имя env-переменной ([реестр](../../../registry/test-accounts.md)).

## Страницы ресурсов

| Страница | Ресурс | Эндпоинты | Тикеты |
|---|---|---|---|
| [modpacks](modpacks.md) | установка модпака и список установленных | `POST .../minecraft/modpacks`, `GET .../minecraft/modpacks/installed` | [DEV-452](../../../tickets/DEV-452.md), [DEV-484](../../../tickets/DEV-484.md) |
| [server](server.md) | состояние сервера и канал ошибок установки | `GET /servers/{uuid}`, `DELETE .../install-error` | [DEV-452](../../../tickets/DEV-452.md) |
| [backups](backups.md) | бэкапы, общая квота `meta.quota`, лимит частоты, бэкапы баз, расписания | `GET .../backups`, `POST .../backups/instances`, `POST`/`PUT .../backups/databases` | [DEV-452](../../../tickets/DEV-452.md), [DEV-484](../../../tickets/DEV-484.md) |
| [files](files.md) | потоковый поиск файлов, лимиты и 429 | `GET .../files/search`, `GET .../files?dir=` | [DEV-476](../../../tickets/DEV-476.md) |
| [minecraft-mods](minecraft-mods.md) | установка мода, manifest.json (validate/install, retry), окно отключённых модов, legacy-установка | `POST .../minecraft/mods`, `POST .../minecraft/manifest/validate`, `.../install`, `GET`/`POST .../client-only-notice(/ack)` | [DEV-556](../../../tickets/DEV-556.md) |
| [minecraft-version](minecraft-version.md) | ядро сервера и `extension_capabilities` | `GET .../minecraft/version` | [DEV-515](../../../tickets/DEV-515.md), [DEV-549](../../../tickets/DEV-549.md) |

Уже описанные в других местах куски API (пока не вынесены сюда):
`GET /features` - [флаги](../../../registry/flags.md);
файлы, базы - KNOWLEDGE_BASE §7i.

## Легенда

| Знак | Значит |
|---|---|
| ✅ | Проверено живым запросом или чтением ответа в браузере |
| 🧪 | Проверено подменой ответа в браузере: подтверждена реакция UI, но не бэкенд |
| 📖 | Взято из описания тикета, MR или комментария разработчика, живьём не видели |
| ❓ | Нет в источниках, не выдумываем |
| ⚠️ | Нюанс, который сбивает с толку при тесте |

Окружение указываем всегда (`prod` / `stage`), как и дату. Проверка на проде идёт по правилам
[CLAUDE.md](../../../../CLAUDE.md): только read-only или self-cleaning.

## Как пополнять после каждого QA

1. **Что засечь.** Любой эндпоинт, который QA трогал: метод, путь, параметры, тело, коды ответов,
   `error_code`, поля, флаги и env, от которых меняется ответ.
2. **Где брать.** Вкладка Network в Playwright MCP (запрос и ответ), `curl` с токеном владельца
   (read-only), описание MR и комментарии в Jira. Код бэкенда читаем, если есть доступ к GitLab.
3. **Куда писать.** Ресурс уже есть - добавить раздел эндпоинта или строку в таблицу ответов на
   его странице. Ресурса нет - новая страница по шаблону
   [templates.md](../../../_meta/templates.md#страница-api-ресурса---kbproductsprodapiresourcemd) и строка в таблицу выше.
4. **История изменений.** Любое изменение поведения - строка `дата | тикет | что` в разделе эндпоинта.
   Старые строки не стираем.
5. **Отличать проверенное.** Ставим знак легенды у каждого факта. Подмену ответа не выдаём за проверку бэкенда.
6. **Связать.** Страница фичи ([UP/modpack-catalog](../modpack-catalog.md), [UP/backups](../backups.md))
   ссылается на API-страницу, карточка тикета - на обе. Сверху в `tickets` страницы добавить ключ.
7. **Прогнать** `python -I kb/_tools/linkcheck.py .`, `frontmatter_check.py`, `tickets_index.py`
   (команды в [kb/README.md](../../../README.md)).

Это шаг [чекпоинта](../../../../.claude/skills/checkpoint/SKILL.md): после QA фичи обновляем страницу фичи,
карточку тикета, API-страницы и `agents.docs` KNOWLEDGE_BASE.

## Известные пробелы

- Нет полной схемы тел ответов (`GET /servers/{uuid}`, `GET .../backups`): описаны только поля, которые трогали тикеты (у `GET .../backups` - `meta.quota`).
- Пути эндпоинтов бэкапа папки и расписаний бэкапов не записаны ❓ ([backups](backups.md#эндпоинты)).
- Не описаны эндпоинты консоли, файлов, баз, задач, версий (кроме упоминаний выше).
- Коды успешных ответов (200 / 202) для части POST не зафиксированы ❓.
