---
id: UP/game-settings
title: Game settings - настройки не-Minecraft игр (Palworld, ARK)
type: feature
product: UP
status: draft
updated: 2026-11-04
verified_on: 2026-08-20        # Palworld на stage
tickets: [TASK-palworld-settings, DEV-597]
flags: []
tests: []                      # автотестов нет
sources:
  - kb/tickets/TASK-palworld-settings.md
  - kb/tickets/DEV-597.md
  - test-docs/ultra.panel/palworld-settings-REPORT.md
  - memory: palworld-settings-qa
---

# Game settings - настройки не-Minecraft игр (Palworld, ARK)

> **В двух словах.** Для Palworld в панели есть вкладка с настройками игры: вместо ручной правки файла
> `PalWorldSettings.ini` - 8 карточек с переключателями и полями. Проверено на stage в августе 2026. Для
> ARK есть аналогичная задача DEV-145, но описания нет.

## Где в интерфейсе

- Вкладка **Palworld Settings** - только на Palworld-серверах. 8 карточек с настройками.
- ARK - ❓ (упоминается DEV-145, не разведано).

## Как работает (под капотом)

- Читает и пишет файл `/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini`:
  `GET /api/v2/servers/{uuid}/files/contents?path=...` и `PUT .../files?path=...` (тело = весь `.ini`).
- То есть под капотом это тот же файловый API, что у [UP/files](files.md), а права - права на файлы.

## Импорт мира (вкладка World)

[DEV-597](../../tickets/DEV-597.md), prod с 30-Oct-2026. API: [palworld-world-import](api/palworld-world-import.md).

- Вкладка **World** только на Palworld-серверах и только с правом `files.write`. Список миров `SaveGames/0/<id>` с датой.
- Клиент выбирает папку мира (с `Level.sav`) или папку уровнем выше. `WorldOption.sav` из загрузки отбрасывается в браузере,
  серверный `WorldOption.sav` при замене сохраняется. Несколько миров на сервере - выбор обязателен.
- Подтверждение: имя мира, бэкапа нет, отменить нельзя; текст зависит от того, работает ли сервер.
- Workflow: работающий сервер - stopping → replacing → starting → проверка 30 с → done (~1 мин); выключенный - мир заменяется,
  сервер остаётся выключенным. Битый мир - `crashed`; сервер не поднялся за 3 мин - `not_running`; не остановился - «мир не заменён».
- Пока импорт идёт (`palworld_world_import.finished_at = null`), Start/Stop/Restart серые, Kill доступен; API и расписания
  получают 409 на start/restart. Импорт подхватывается после перезагрузки страницы.

## Не баг - так задумано

| Кажется багом | На самом деле |
|---|---|
| Тумблер PvP пишет `bEnablePlayerToPlayerDamage`, а не `bIsPvP` | так и нужно ([TASK-palworld-settings/O1](../../tickets/TASK-palworld-settings.md#находки)) |
| В ТЗ файл называется `GameUserSettings.ini` | ошибка ТЗ (наследие ARK), реализация верна ([O2](../../tickets/TASK-palworld-settings.md#находки)) |
| `ExpRate` записан как `2.5` без нулей | косметика ([O3](../../tickets/TASK-palworld-settings.md#находки)) |

## Гочи для тестирования

- Стенд на stage: Palworld [srv:9f455f13](../../registry/test-servers.md#9f455f13), не-Palworld (вкладки нет)
  [srv:9efab4bc](../../registry/test-servers.md#9efab4bc). Вход на stage - Google-OAuth, сессия ~30-40 мин ([env:stage](../../registry/environments.md#stage)).
- Правку проверять чтением самого `.ini` через Files.
- Импорт мира: маркер - свой файл в наборе (`QA-MARKER-*.txt`), не хэш `Level.sav` (автосейв каждые 30 с). Прод-стенд
  [srv:6b9ec05d](../../registry/test-servers.md#6b9ec05d), наборы миров в `test-docs/ultra.panel/DEV-597/worlds/`.
- Выбор папки - `input[webkitdirectory]`; в Claude Browser загрузки нет, папку выбирает человек в системном диалоге.

## Покрытие

- **Автотестов нет.** Ручной QA блоков A-F и H: [palworld-settings-REPORT.md](../../../test-docs/ultra.panel/palworld-settings-REPORT.md).
- Импорт мира: автотестов нет, `regression: blocked` (нет Palworld-стенда на тест-аккаунте), ручной QA [DEV-597](../../tickets/DEV-597.md).
- Не проверен блок G: сабюзер с `files.read` без `files.write` (нужен такой аккаунт).

## История

| Дата | Тикет | Что |
|---|---|---|
| 20-Aug-2026 | [TASK-palworld-settings](../../tickets/TASK-palworld-settings.md) | Palworld Settings на stage, PASS A-F, H |
| 04-Nov-2026 | [DEV-597](../../tickets/DEV-597.md) | Импорт мира (вкладка World), prod, 4 раунда, PASS-with-issues |
