---
id: KB-REG-SERVERS
title: Тест-серверы (UP, VPS)
type: registry
status: draft
updated: 2026-10-15
verified_on: -        # с живой панелью ещё не сверяли
sources:
  - utils/gameAuth.ts (env + фолбэки)
  - memory: game-panel-next-focus, ci-and-reporting, отчёты задач (см. карточки тикетов)
---

# Тест-серверы (UP, VPS)

> **В двух словах.** Список серверов, на которых мы тестируем: под что взят каждый, можно ли
> его ломать и в каком он состоянии. Сервер всегда определяем по **UUID**, а не по имени:
> имя сбрасывается при реинстолле. В ссылках пишем `srv:<первые 8 символов UUID>`.
>
> ⚠️ Список собран из памяти и отчётов, с живой панелью **не сверен**. Перед мутацией нужно
> проверить состояние в панели.

**Легенда «Трогать»:**
- 🟢 - свободно, с откатом;
- 🟡 - только под свою задачу, бережно;
- 🔴 - только смотреть или не трогать.

## Автотесты (env в `utils/gameAuth.ts`)

### ebb03adc
Канонический e2e-сервер, `GAME_PANEL_SERVER_UUID`.
- Имя сейчас `Fcz3VN5n_439772`, раньше было `test_e2e`.
- Используется также для v2-subuser.
- Трогать: 🟢. В `.env` не менять.

### f9793ddc
Power, `GAME_PANEL_SERVER_POWER_UUID`. Имя `test_e2e_power`. 🟢

### 00915cdc
Backups, `GAME_PANEL_SERVER_BACKUP_UUID`. Имя `test_e2e_backup`.
- Квота 3 слота.
- Чужой бэкап «111» не трогать.
- Трогать: 🟢.

### ec78834c
Files, `GAME_PANEL_SERVER_FILE_UUID`. Имя `test_e2e_file`. 🟢

### 55ab39de
Console, `GAME_PANEL_SERVER_CONSOLE_UUID`. Имя `test_e2e_console`. 🟢

### e9440b5d
Rename, `GAME_PANEL_SERVER_RENAME_UUID`. Имя `test_e2e_rename`. 🟢

### cc25cea1
Steam-игра, `GAME_PANEL_STEAM_SERVER_UUID`. 🟢

### 0c743c25
Спек источников CF/Modrinth, `GAME_PANEL_SOURCE_SERVER_UUID`. Имя `test_e2e`. 🟢

### d2f7fff5
`extension.sources`. 🟢

### ac8aa1e0
Suspended-сервер, для проверок баннера suspended. 🔴

### 93521c70
Удалён. Нигде не использовать.

❓ `GAME_PANEL_PLUGIN_SERVER_UUID` и `GAME_PANEL_THROTTLE_SERVER_UUID` - какие серверы за ними стоят, нужно уточнить.

## Java, версии, моды

### ca326e28
Java-сервер (id 771938).
- Задачи: [DEV-472](../tickets/DEV-472.md), [DEV-485](../tickets/DEV-485.md), [DEV-486](../tickets/DEV-486.md), [DEV-513](../tickets/DEV-513.md), missing deps, SMP.
- На нём включён [flag:java-start-gate](flags.md#java-start-gate).
- Трогать: 🟡.

### 8c2a6bd7
Моды: [DEV-405](../tickets/DEV-405.md), [DEV-500](../tickets/DEV-500.md), [DEV-532](../tickets/DEV-532.md).
- Сейчас на нём BMC4.
- Трогать: 🔴, не менять.

### 546bc52e
SMP.
- Владелец с [flag:extension-compatibility](flags.md#extension-compatibility).
- Задачи: [DEV-515](../tickets/DEV-515.md), [DEV-529](../tickets/DEV-529.md).
- Трогать: 🟡.

### 0cf8346f
[DEV-506](../tickets/DEV-506.md), [DEV-529](../tickets/DEV-529.md).
- Чужой владелец, флага нет.
- Трогать: 🔴.

### 42ea3555
Фильтр по загрузчику, [DEV-498](../tickets/DEV-498.md). 🟡

### 45b14521
SMP Private, переименован в `DEV-562-MC` под [DEV-562](../tickets/DEV-562.md). 🟡

### f8e7df56
SkyBlock, на нём воспроизводился баг tariff-list 400. 🟡

### 7166c707
**Одноразовый, деструктив разрешён** (restore, version change и т.п.). 🟢

## World Backup - [DEV-418](../tickets/DEV-418.md)

### 85fc5bd9
DEV-418. 🟡

### e0ef886f
DEV-418. 🟡

### 43ae756d
DEV-418. После DEV-401 мог остаться в PENDING-отмене в WHMCS ❓. В панели 15-Oct: платный, активный. 🔴

### 799c975d
DEV-418. 🟡

### 93bbc747
DEV-418, Bedrock. 🟡

### 7d7041c8
DEV-418. 🟡

### b4089560
DEV-418. 🟡

### 09f8d87d
DEV-418 и [DEV-401](../tickets/DEV-401.md). **Free, suspended** (15-Oct). 🔴

### feede8c1
DEV-418 и [DEV-401](../tickets/DEV-401.md). **Free, suspended** (15-Oct). 🔴

## Cancel module - [DEV-401](../tickets/DEV-401.md)

### 7c7745c8
Rust. 🟡

### 2c8c5f83
Terraria. 🟡

### c2b09498
Cancel Amplitude (события отмены). 🟡

## Split Server

### 1d7d34aa
Основной сервер Split. 🟡

### 0c7b82c3
Саб-сервер Split. 🟡

### 60fdf307
Саб-сервер Split. 🟡

## Не-MC и free

### d70813d3
Project Zomboid, имя `DEV-562-PZ`, [DEV-562](../tickets/DEV-562.md). 🟡

### 1db4a8bb
Arma, [DEV-562](../tickets/DEV-562.md). 🟡

### 8235fb62
ARK, **клиентский сервер**, только смотреть. 🔴

### acb329a3
ARK, **клиентский сервер**, только смотреть. 🔴

### 0010cf61
Free-сервер, [DEV-563](../tickets/DEV-563.md). 🟡

### d716acea
Free-сервер, [DEV-563](../tickets/DEV-563.md). 🟡

### 75d1175e
Платный, регресс [DEV-563](../tickets/DEV-563.md). 🟡

### 3f1e7d13
Terraria free, [DEV-563](../tickets/DEV-563.md). 🟡

### 33b383ef
Trial конструктора модпаков. 🟡

### 16031020
Фришка, созданная в QA [DEV-455](../tickets/DEV-455.md) 24-Sep. 🟡

### ddb9a905
Фришка [DEV-455](../tickets/DEV-455.md), аккаунт A. 🟡

### d4bf314b
Фришка [DEV-455](../tickets/DEV-455.md), аккаунт C. 🟡

### 83d391c4
Paper, плагины в [DEV-500](../tickets/DEV-500.md). 🟡

## stage

### 9f455f13
Palworld (stage). 🟡

### 9efab4bc
Palworld (stage). 🟡

### 62c8289b
NeoForge `neoforge_test` (stage), проверка unix_args. 🟡

## VPS (VirtFusion)

Серверы VPS-панели ([VPS](../products/vps/README.md)), аккаунт [acc:vps-panel](test-accounts.md#vps-panel).

### 9c49ed96
Актуальный тестовый VPS, `TEST_SERVER_UUID` в `utils/auth.ts` (с 10-Jun-2026).
- На нём гоняются power, media, options и реальный rebuild (`vps.panel.rebuild.real`).
- Трогать: 🟢 (serial, возврат в Running). Rebuild разрешён: владелец 15-Oct-2026 - переустановка ОС разрешена на всех его VPS.

### c13d2e04
Бывший тестовый VPS (srv-433986), так записан в `agents.docs/vps-panel/*`. В коде заменён 04-Jun-2026.
- Состояние ❓ (есть ли ещё на аккаунте - не сверено). Если есть - rebuild разрешён, как на всех VPS владельца.

## Правила

- Взял сервер под задачу - переименуй в `<TASK>-<что>` (пример: `DEV-562-PZ`), старое имя запиши в отчёт.
- В этом реестре обнови строку: задача, состояние, можно ли трогать.
- Массовые падения по имени сервера - это почти всегда дрейф имени после реинстолла. Сначала смотри дашборд.
