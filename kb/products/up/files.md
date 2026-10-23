---
id: UP/files
title: Files - файловый менеджер, Recycle Bin, SFTP
type: feature
product: UP
status: draft
updated: 2026-10-23
verified_on: 2026-10-18        # recon Upload custom modpack (апселл); остальное - 09-Jun
tickets: [DEV-418, DEV-459, DEV-492, DEV-549, DEV-476]
flags: [world-backup]
tests:
  - tests/game/panel/files.spec.ts
  - tests/game/panel/files.recycle.spec.ts
  - tests/game/panel/files.structure.spec.ts
  - tests/game/panel/files.search.spec.ts
  - tests/game/panel/security.spec.ts
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §5b, §5j, §8b, §9c (recon 03..09-Jun-2026)
  - kb/tickets/DEV-418.md, DEV-459.md, DEV-492.md
---

# Files - файловый менеджер, Recycle Bin, SFTP

> **В двух словах.** Файловый менеджер сервера в браузере: папки и файлы, создание, переименование,
> перемещение, архивы, редактор текстовых файлов. Удалённое лежит 24 часа в Recycle Bin. Отсюда же
> подключаются по SFTP, загружают свой модпак и открывают World Backups. Удаление папки мира
> перехватывает окно «Save Your World First?».

## Где в интерфейсе

- `/server/{uuid}/files`, путь в URL: `?dir=/mods`, открытый файл - `?dir=/&file=<name>`. KB §5b, §9c.
- **Список** (v-data-table), хлебные крошки «root / ...», поиск, кнопки **New folder** / **New file**.
- **Bulk-бар** по чекбоксам: Download, Move, Duplicate, Delete, Zip / Unzip.
- **Меню «...» строки:** Open, Download, Pin, Copy name, Copy path, Copy link, Duplicate, Rename, Move, Archive, Delete. KB §8b.
- **Редактор** CodeMirror (`.cm-editor`) по Open текстового файла, кнопки Cancel / Save.
- **Recycle Bin** - строка-кнопка вверху списка → `?dir=/.trash-<shortid>`; отдельные кнопки **Restore** и **Clear Recycle Bin**.
- **SFTP Connect:** окно «Connect with SFTP» (Host, Port, Username, Password), кнопки Open SFTP, Generate, Save; рядом Download SFTP Client.
- **Upload custom modpack** (окно `curseforge-dialog`, загрузка zip / `manifest.json`) и блок заказа Custom Modpack Setup в `/mods`
  ([DEV-459](../../tickets/DEV-459.md), [UP/modpack-catalog](modpack-catalog.md)).
- **С 16-Oct-2026 кнопка сначала открывает апселл «Modpack setup»** (`.modpack-setup-dialog`): «Let our team build your
  custom modpack», карточки Lite (до 30 модов, €9.99) / Pro (до 60, €17.99) one-time, Total, кнопки «Order now» и
  «I’ll upload it myself» (`data-testid="modpack-setup-dismiss"`). Отказ закрывает апселл и открывает прежнее окно
  CurseForge manifest.json (Browse file / Cancel / Proceed). По коду фронта тот же компонент стоит во вкладке Modpacks (подпись «No thanks, I’ll do it myself»), в UI там не проверялось.
- **World Backups** - кнопка рядом с Recycle Bin ([UP/world-backup](world-backup.md)).

## Как работает (под капотом)

- Удаление → файл уходит в корзину `.trash-<shortid>` на 24 часа, потом очищается сам.
- Удаление папки `world` или файла в ней вторым шагом открывает «Save Your World First?» (под [flag:world-backup](../../registry/flags.md#world-backup)).
  Папки вида `world_old` окно не вызывают ([DEV-418](../../tickets/DEV-418.md)).
- Загруженный через Upload custom modpack пак запускает скан модов ([DEV-492/F1](../../tickets/DEV-492.md#находки), исправлено),
  вручную залитый jar сканер подхватывает примерно за 18 минут ([UP/client-only-mods](client-only-mods.md)).
- Отключённые сканером моды лежат в `mods/` как `*.jar.disabled`.
- **Когда показывается апселл** (фронт `ModpackSetupDialogContainer`, recon бандла 18-Oct): `canOffer` = сервер PC Minecraft
  (`is_pc_minecraft`) + текущий пользователь владелец + есть `external_id` + `GET /api/v2/servers/{uuid}/minecraft/modpack-setup/quote`
  вернул хотя бы один тариф с `available: true` и `amount > 0`. Иначе (сабюзер, не MC, quote ещё не пришёл) - сразу окно CurseForge.
- Апселл шлёт аналитику `POST .../modpack-setup/events` (202): `modpack_setup_entry_click`, `_popup_shown`, `_tier_selected`,
  `_popup_closed` (reason `dismiss`), `_self_upload`; поле `entry` = `files` или `modpacks`. «Order now» = `POST .../modpack-setup/orders`
  (реальный заказ; ошибки `price_changed` / `unavailable` / 404 «not available» / 422).

## Правила и граничные случаи

1. **Имена принимают `<` и HTML как есть,** но рендерят как текст: stored XSS в имени папки нет (SEC-003). KB §5j.
2. **Restore и Clear Recycle Bin неактивны,** пока не выбрана строка.
3. **Generate / Save в SFTP меняют пароль SFTP** - реальная мутация.
4. Ошибки манифеста при Upload custom modpack в UI не показываются ([DEV-492/F7](../../tickets/DEV-492.md#находки)).
5. **На ядрах без модпаков** (Paper-подобные, Vanilla; только у владельца с флагом `extension-compatibility`) кнопка
   Upload custom modpack контурная, disabled, с тултипом «Custom modpacks cannot be uploaded on this core…»; клик ничего
   не открывает, апселла тоже нет ([DEV-549](../../tickets/DEV-549.md)).
6. **Тур первого захода в Files** не стартует, пока идёт туториал модов, и тогда не помечается показанным
   (`localStorage godlike-file-tour-shown`). Если уйти из Files с открытым туром FM, он остаётся на другой странице
   ([DEV-549/O1](../../tickets/DEV-549.md#находки)).

## Гочи для тестирования

- **Удалять через чекбокс + нижний Delete**, не через «...»: у каждой строки своё меню, `.first()` ловит скрытое. KB §5b.
- **Редактор монтируется асинхронно** - ждать `.cm-content`.
- **Restore - отдельная кнопка `v-btn--slim`**, не внутри `action-btn-group` (там Delete = удалить навсегда). KB §9c.
- Тест-папки копятся дублями в корзине между прогонами - очищаются сами через 24 часа.
- SFTP и Upload custom modpack - только структурно, без Generate / Save / Proceed / Order now.
- **Гонка апселла:** quote приходит через 5-8 с после открытия Files; клик раньше - апселла нет, сразу CurseForge.
  В тесте слушатель `waitForResponse(/modpack-setup\/quote/)` ставится ДО навигации (`openUploadCustomModpack()`).
- **Окно CurseForge не закрывается по Escape** - только Cancel (`closeCurseForgeDialog()`).
- **CF-001 завязан на флаг владельца:** сервер `ec78834c` - Paper, владелец 388101 без флага, поэтому кнопка активна.
  Если флаг этому владельцу включат, кнопка станет disabled - переводить CF-001 на модовый сервер ([DEV-549](../../tickets/DEV-549.md)).

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Создание, удаление, переименование папки | `files.spec.ts` (FILE-001, 002, 004) | ✅ |
| Корзина и восстановление | `files.recycle.spec.ts` (FILE-006) | ✅ |
| Меню «...», SFTP, Upload custom modpack (апселл → свой путь → CurseForge), редактор | `files.structure.spec.ts` (FILE-003, SFTP-001, CF-001, FILE-005) | ✅ структурно |
| XSS в имени папки | `security.spec.ts` (SEC-003) | ✅ |
| Правка файла → Save → откат, Move, Zip / Unzip | не покрыто | ❌ |
| Окно World Backup при удалении `world` | только ручной QA [DEV-418](../../tickets/DEV-418.md) | ❌ авто нет |
| Поиск файлов: стрим до complete, путь в таблице, 422 | `files.search.spec.ts` (TC-GP-FSRCH-001, 002), [DEV-476](../../tickets/DEV-476.md) | ✅ |
| Поиск: обрезка на 500, 429 параллели и throttle | только ручной QA [DEV-476](../../tickets/DEV-476.md) (нужен большой модпак на сервере тест-аккаунта) | ❌ авто нет |

## История

| Дата | Тикет | Что |
|---|---|---|
| 03..09-Jun-2026 | - | Recon файлового менеджера, корзины, SFTP, редактора |
| 14-Aug-2026 | [DEV-418](../../tickets/DEV-418.md) | Кнопка World Backups и окно при удалении мира |
| 28-Sep-2026 | [DEV-459](../../tickets/DEV-459.md) | Блок Custom Modpack Setup в `/mods` |
| 09-Oct-2026 | [DEV-492](../../tickets/DEV-492.md) | Upload custom modpack запускает скан модов |
| 16-Oct-2026 | - (follow-up [DEV-459](../../tickets/DEV-459.md), тикет не найден) | Апселл Modpack setup перед окном CurseForge; CF-001 обновлён 18-Oct |
| 19-Oct-2026 | [DEV-549](../../tickets/DEV-549.md) | Upload custom modpack disabled на ядрах без модпаков; тур FM не стартует поверх туториала модов |
| 20-Oct-2026 | [DEV-476](../../tickets/DEV-476.md) | Поиск файлов потоковый (panel!1597 + new-panel!519): BMC4 за 5,8 с вместо 125 с, лимиты 2 символа / 500 совпадений / 2 поиска, [API files](api/files.md). PASS |
