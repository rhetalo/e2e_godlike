---
id: UP/power
title: Power - Start, Shut Down, Restart, Kill
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-10-09        # Restart под гейтом Java (DEV-485); сам power-флоу - recon 19-Jun и 27-Jul
tickets: [DEV-485, DEV-472]
flags: [java-start-gate, restart-confirmation]
tests: [tests/game/panel/power.spec.ts, tests/game/panel/role.enforcement.spec.ts]
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §4, §5, §5a, §5i, §9b (recon 03-Jun..27-Jul-2026)
  - kb/tickets/DEV-485.md, DEV-472.md
  - kb/products/up/README.md (гочи 3, 4, 6, 8)
  - memory: game-panel-giveaway-and-audit, panel-teardown-hook-timeout, panel-modals-handle-myself
---

# Power - Start, Shut Down, Restart, Kill

> **В двух словах.** Кнопки управления питанием сервера на странице Overview: запустить, выключить,
> перезапустить и убить процесс. При первом старте Minecraft просит принять EULA. С октября 2026 старт
> на слишком старой Java блокирует бэкенд ([UP/java-detection](java-detection.md)). Кому какие кнопки
> доступны, зависит от роли участника ([UP/sharing-roles](sharing-roles.md)).

## Где в интерфейсе

- Overview → блок power-контролов: тоггл **Start / Shut Down** и отдельные **Restart**, **Kill**, рядом **Boost My Server**. KB §4.
- Тоггл меняет текст по состоянию: **Start** → **Starting...** → **Shut Down**. Статус в Server Information:
  **Running** (не «Online») / **Offline**. KB §5a.
- **EULA** на первом старте: диалог «Accept Minecraft® EULA», кнопка «I Accept» (пишет `eula=true` в `eula.txt`).
- **Подтверждение Restart:** по KB §5a (19-Jun) модалки нет; в памяти 24-Sep - «Restart The Server?» есть. Вероятно,
  зависит от настройки аккаунта [restart-confirmation](../../registry/flags.md#restart-confirmation) ❓
  ([обзор UP, «Что устарело» п.4](README.md#что-устарело-в-источниках)).

## Как работает (под капотом)

- Start в новой панели идёт не через `/power`, а через `POST minecraft/server-jar/ensure` (202 `checking`, старт в фоне,
  статус через полинг `server-jar/status`). Прямой `POST /api/v2/servers/{uuid}/power` start / restart тоже существует.
  Источник: [DEV-485](../../tickets/DEV-485.md).
- Restart на выключенном сервере = start. Принятие EULA идёт через `POST /power restart`.
- Консоль стримит boot-лог и строки `[Pterodactyl Daemon]: ...` - это источник правды о том, что реально произошло.

## Статусы и переходы

| Из | Действие | В | Время (KB §5a) |
|---|---|---|---|
| Offline | Start | Starting... → Running | обычный старт ~1 мин, первый (ставит файлы) - до нескольких минут |
| Running | Shut Down | Stopping... → Offline | ~30 с |
| Running | Restart | Stopping... → Offline (кратко) → Starting... → Running | ~65-70 с, кнопка «прыгает» |
| Running | Kill | Offline | сразу |
| Offline | Start на слишком старой Java (под гейтом) | Offline + окно «needs Java N» / 409 `java_too_old` | - |

## Правила и граничные случаи

1. **Гейт Java** не блокирует `kill` и не блокирует слишком новую Java. Restart кнопкой работающего сервера со
   сменённым образом → 409, сервер продолжает работать. Подробно - [UP/java-detection](java-detection.md#как-работает-под-капотом).
2. **Права по ролям** (enforcement = контрол есть или нет в DOM, не `disabled`): Start - все роли; Restart / Kill - Owner
   и Co-owner; консоль - Owner, Co-owner, Moderator. KB §5i.
3. **Audit Log не пишет `server:power.start`** (stop пишется) и индексируется с лагом. Источник: KB §9b.
4. После Restart без EULA на свежем сервере возможна «Something Went Wrong / another power action» - ушло с
   [new-panel!548](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/548) ([DEV-472](../../tickets/DEV-472.md#хвосты)).
5. Плавающее зависание кнопки в «Starting...» после краша (2 из ~5) - [DEV-472/O1](../../tickets/DEV-472.md#находки), Low.

## Не баг - так задумано

| Кажется багом | На самом деле | Источник |
|---|---|---|
| Старт не появился в Audit Log | `power.start` не логируется вообще | KB §9b |
| Нет записи в Центре уведомлений при блоке старта по Java | by design только email и только для фоновых путей | [DEV-485/F2](../../tickets/DEV-485.md#находки) |
| Кнопка Restart мелькает «Start» посреди цикла | нормальный цикл Restart | KB §5a |

## Гочи для тестирования

- **Тоггл иногда не флипается в «Shut Down»** при Running. Ждать кнопку ИЛИ маркер запуска в консоли, при залипании -
  reload (`waitForOnline`, `isOnlineByConsole()`). KB §5a.
- **Оверлеи ловят клик Start:** shepherd-тур и giveaway `.giveaway-modal` со скримом `.v-overlay__scrim`. Гасятся в
  `GamePanelBasePage.open()`. [Обзор UP, гоча 6](README.md#сквозные-гочи).
- **Транзиентные тексты с многоточием** («Starting...», «Stopping...») - искать regex.
- **Таймауты:** `waitForOnline` 300 с, `waitForOffline` 90 с, `test.setTimeout` до 360 с; в `afterAll` - `test.setTimeout(180s)`
  + `ensureOffline(90s)`, иначе teardown падает по таймауту хука.
- Краш на Java 8 быстрее опроса `/resources` - доказывать по строкам консоли.
- Power-тесты мутируют реальный сервер: только `serial`, с возвратом в Offline.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Start → Online + EULA | `power.spec.ts` (TC-GP-PWR-001) | ✅ |
| Restart полный цикл | `power.spec.ts` (TC-GP-PWR-002) | ✅ |
| Kill → Offline | `power.spec.ts` (TC-GP-PWR-003) | ✅ |
| Restart / Kill скрыты у Member и Moderator | `role.enforcement.spec.ts` (ROLE-001, ROLE-003) | ✅ |
| Гейт Java на всех путях старта | только ручной QA [DEV-485](../../tickets/DEV-485.md) | ❌ авто нет |
| Модалка подтверждения Restart | не разведано, зависит от настройки аккаунта ❓ | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 03-Jun-2026 | - | Recon power-флоу, KB §5a |
| 19-Jun-2026 | - | Restart / Kill срабатывают без модалки |
| 27-Jul-2026 | - | Найдено: тоггл не флипается, giveaway-модалка ловит клик, `power.start` нет в Audit Log |
| 25-Sep..09-Oct-2026 | [DEV-485](../../tickets/DEV-485.md) | Гейт старта по Java на Start, Restart, API, расписании |
