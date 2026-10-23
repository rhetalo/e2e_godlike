---
id: KB-REG-SERVERS
title: Тест-серверы (UP, VPS)
type: registry
status: draft
updated: 2026-10-23
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

## Мутирующие регресс-тесты (D-026, env в `utils/gameAuth.ts`)

Выданы владельцем 23-Oct-2026, тест-аккаунт [acc:shared-owner](test-accounts.md#shared-owner), тариф Double (2 ГБ, 10 ГБ диска).
Мутировать можно всё, только serial и с teardown. Ядро - часть контракта: тест, сменивший его, возвращает обратно.

### fd965a60
`test_e2e_mut_java` (было `3kvfVx6l_481368`), Paper 26.2. Общие мутации: бэкапы и слоты ([DEV-484](../tickets/DEV-484.md)).
- 23-Oct-2026: EULA принята, первый старт создал `world` - он нужен `world-backup.spec.ts` ([DEV-571](../tickets/DEV-571.md)), не удалять
  (иначе тесты WB уйдут в skip; вернуть - один Start). Вне раскатки `extension-compatibility`: legacy ставит моды на Paper ([DEV-556](../tickets/DEV-556.md)).
- Env: `GAME_PANEL_SERVER_MUT_JAVA_UUID`. Трогать: 🟢.

### 75d1175e
`test_e2e_mut_fabric` (было `GxVxq7bw_480890`), 23-Oct переведён Paper → Fabric 1.21.1 (loader 0.20.1, Wipe Server Files).
Клиентские моды ([DEV-558](../tickets/DEV-558.md)). Раньше - платный регресс [DEV-563](../tickets/DEV-563.md) (задача закрыта).
- Env: `GAME_PANEL_SERVER_MUT_FABRIC_UUID`. Трогать: 🟢.
- ⚠️ Владелец 388101 вне раскатки `extension-compatibility`: отказов по ядру/лоадеру тут нет. 23-Oct ([DEV-556](../tickets/DEV-556.md)): окно
  «Some mods were disabled» подтверждено ack, /mods вернул к 2 файлам (godlikemetrics + fabric-api 0.116.13), offline.

### b62bffd0
`test_e2e_mut_bedrock` (было `PPmTky5j_481131`, id 778464), 23-Oct сменена игра Paper → BEDROCK-Vanilla (egg 125, Delete files),
BDS 1.26.52.3. ⚠️ UDP-блока нет и не будет: блок выдаётся только при покупке Bedrock, не при смене игры (by design, [DEV-564/F5](../tickets/DEV-564.md#находки)). Под спек UDP-блока DEV-564 нужен **купленный** Bedrock на тест-аккаунте.
- Env: `GAME_PANEL_SERVER_MUT_BEDROCK_UUID`. Трогать: 🟢. Остановлен.

## Java, версии, моды

### ca326e28
Java-сервер (id 771938).
- Задачи: [DEV-472](../tickets/DEV-472.md), [DEV-485](../tickets/DEV-485.md), [DEV-486](../tickets/DEV-486.md), [DEV-513](../tickets/DEV-513.md), missing deps, SMP.
- На нём включён [flag:java-start-gate](flags.md#java-start-gate).
- 20-Oct-2026 переименован в `DEV-484-retain` (было `Ft2FVM1G_474664`): расписание с `retain_count=3` для [DEV-484](../tickets/DEV-484.md), 3 бэкапа оставлены.
- 21-Oct-2026 переименован в `DEV-558-Fabric` под [DEV-558](../tickets/DEV-558.md): Fabric 1.21 + пак Sodium Plus, статус `reinstall_failed` после теста Reinstall. Бэкапы DEV-484 не тронуты.
- 22-Oct-2026 переименован в `DEV-557-scan` (было `DEV-558-Fabric`) под [DEV-557](../tickets/DEV-557.md): сейчас egg PC-Paper, offline; создана `/mods` с `Cobblemon-fabric-1.8.1+1.21.1.jar` (131 МиБ, через files/pull с Modrinth CDN) и `dev557-control-95mib.jar` (синтетика) - ждут суточного обхода mod-scan-service. В тот же день переведён на Fabric 1.21.1 (без вайпа) и через Plugins/Mods поставлен Cobblemon 1.8.2 (133 МиБ). Обход 22-Oct: контроль разобран, оба Cobblemon без вердикта (FAIL). 23-Oct задача закрыта (сервис переписан Сергеем, проверяет сам); 3 тестовых jar в `/mods` оставлены по решению владельца - стенд для проверки Сергея (хеши в артефакте DEV-557).
- Трогать: 🟡.

### 8c2a6bd7
Моды: [DEV-405](../tickets/DEV-405.md), [DEV-500](../tickets/DEV-500.md), [DEV-532](../tickets/DEV-532.md).
- Сейчас на нём BMC4 (425 папок, 5003 файла).
- 20-Oct-2026 переименован в `DEV-476-search` (было `FYkKLp1D_474959`): эталон поиска файлов [DEV-476](../tickets/DEV-476.md), база для DEV-480.
- Трогать: 🔴, не менять. Read-only поиск разрешён.

### 546bc52e
SMP.
- Владелец с [flag:extension-compatibility](flags.md#extension-compatibility).
- Задачи: [DEV-515](../tickets/DEV-515.md), [DEV-529](../tickets/DEV-529.md).
- 20-Oct-2026 переименован в `DEV-484-schedules` (было `aDFt94f8_474690`): расписания [DEV-484](../tickets/DEV-484.md), бэкапы оставлены.
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
SkyBlock, на нём воспроизводился баг tariff-list 400. 20-Oct-2026 переименован в `DEV-484-backup-throttle` (было `JBl1Dqfw_474692`):
квота ядра, сервер сверх лимита, окно частоты [DEV-484](../tickets/DEV-484.md); тестовые бэкапы оставлены. 🟡
- 23-Oct-2026: ядро **NeoForge 1.21.1** (не Paper), владелец 307989 в раскатке `extension-compatibility` - стенд отказа по лоадеру
  ([DEV-556](../tickets/DEV-556.md)); 477 модов, Essential от теста убран в корзину.

### 7c5aa3cf
`test`, сплит от [srv:1d7d34aa](#1d7d34aa), Paper 26.2, владелец 307989 в раскатке `extension-compatibility`. Стенд «ядро без модов»:
legacy 400 и v2 409 `mods_not_supported`, кнопка Upload custom modpack disabled ([DEV-556](../tickets/DEV-556.md), [DEV-549](../tickets/DEV-549.md)). Только отказы, ничего не ставилось. 🟡

### 9c891502
`DEV-484-db` (было `Gs5I5zqx_482442`), владелец - тестовый пользователь 388101, не основной аккаунт. Бэкапы баз [DEV-484](../tickets/DEV-484.md):
базы `s779874_cjyV9C2A` (id 26530, таблица `dev484_probe`) и `s779874_Ebhns6Vr` (26531), бэкапы баз оставлены до ок владельца. 🟡

### 7166c707
**Одноразовый, деструктив разрешён** (restore, version change и т.п.). 🟢

## World Backup - [DEV-418](../tickets/DEV-418.md)

### 85fc5bd9
DEV-418. 🟡

### e0ef886f
DEV-418. 🟡

### 43ae756d
DEV-418. В WHMCS услуга 461901 **Terminated 14-Aug-2026** (после теста ловушки DEV-401), запросов отмены нет; в панели строка
осталась, `free=0`, `external_id = NULL` - сервер отвязан от биллинга (billing-sql + panel-sql, 19-Oct-2026). 🔴

### 799c975d
DEV-418. 🟡

### 93bbc747
DEV-418, Bedrock. 🟡

### 7d7041c8
DEV-418. 21-Oct-2026 под [DEV-564](../tickets/DEV-564.md): Paper → Bedrock → обратно на Paper, имя `18k6mMw5_462880`. 🟡

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
Project Zomboid, [DEV-562](../tickets/DEV-562.md), [DEV-579](../tickets/DEV-579.md).
- 21-Oct-2026 переименован в `DEV-579-PZ` (было `DEV-562-PZ`). Panel memory 4096, в биллинге тариф 6 ГБ (бейдж «6 Ram»), остановлен.
- Трогать: 🟡.

### 976c89c3
Bedrock, `DEV-564-BR-C` (было `tJf6lPCi_482724`, WHMCS 482724), куплен владельцем 21-Oct-2026 под [DEV-564](../tickets/DEV-564.md).
- Оставлен под ретест DEV-564; удаление (LIFE-09) - после ретеста.
- Трогать: 🟡.

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
