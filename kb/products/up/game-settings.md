---
id: UP/game-settings
title: Game settings - настройки не-Minecraft игр (Palworld, ARK)
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-08-20        # Palworld на stage
tickets: [TASK-palworld-settings]
flags: []
tests: []                      # автотестов нет
sources:
  - kb/tickets/TASK-palworld-settings.md
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

## Покрытие

- **Автотестов нет.** Ручной QA блоков A-F и H: [palworld-settings-REPORT.md](../../../test-docs/ultra.panel/palworld-settings-REPORT.md).
- Не проверен блок G: сабюзер с `files.read` без `files.write` (нужен такой аккаунт).

## История

| Дата | Тикет | Что |
|---|---|---|
| 20-Aug-2026 | [TASK-palworld-settings](../../tickets/TASK-palworld-settings.md) | Palworld Settings на stage, PASS A-F, H |
