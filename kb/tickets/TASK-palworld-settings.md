---
id: TASK-palworld-settings
title: Palworld Settings: UI-редактор PalWorldSettings.ini
type: ticket
product: [UP]
features: [UP/game-settings]
status: partial
qa_verdict: PASS-with-issues
updated: 2026-10-15
verified_on: 2026-08-20
jira: -
sources:
  - test-docs/ultra.panel/palworld-settings-REPORT.md
  - memory: palworld-settings-qa
---

# TASK-palworld-settings - Palworld Settings: UI-редактор PalWorldSettings.ini

> **В двух словах.** Для Palworld-серверов в панели есть вкладка с настройками игры: вместо
> ручной правки `.ini` - 8 карточек с переключателями. Проверено на stage, всё работает.
> Не проверены права сабюзера только на чтение.

## Как это работает
- Читает и пишет файл `/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini` через `GET /api/v2/servers/{uuid}/files/contents?path=...` и `PUT .../files?path=...` (тело = весь .ini).
- Вкладка видна только на Palworld-серверах.
- Аналог для ARK - DEV-145.

## Итог QA
PASS по блокам A-F и H, 20-Aug-2026, stage. Отчёт: [palworld-settings-REPORT.md](../../test-docs/ultra.panel/palworld-settings-REPORT.md).

## Находки
| ID | Суть | Статус |
|---|---|---|
| TASK-palworld-settings/O1 | Тумблер PvP пишет `bEnablePlayerToPlayerDamage` (не `bIsPvP`), это верно | наблюдение |
| TASK-palworld-settings/O2 | ТЗ ошибочно называет файл `GameUserSettings.ini` (наследие ARK), реализация верна | наблюдение |
| TASK-palworld-settings/O3 | `ExpRate` пишется `2.5` без padding | косметика |

## Связи
- Фичи: [UP/game-settings](../products/up/game-settings.md)
- Серверы: [srv:9f455f13](../registry/test-servers.md#9f455f13) (Palworld), [srv:9efab4bc](../registry/test-servers.md#9efab4bc) (не-Palworld).
- Окружение: [env:stage](../registry/environments.md#stage).

## Хвосты
- Блок G: сабюзер с `files.read` без `files.write`. Нужен такой аккаунт.
