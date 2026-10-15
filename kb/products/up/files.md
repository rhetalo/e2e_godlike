---
id: UP/files
title: Files - файловый менеджер, Recycle Bin, SFTP
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-06-09        # последний recon файлового менеджера
tickets: [DEV-418, DEV-459, DEV-492]
flags: [world-backup]
tests:
  - tests/game/panel/files.spec.ts
  - tests/game/panel/files.recycle.spec.ts
  - tests/game/panel/files.structure.spec.ts
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
- **Upload custom modpack** (окно `curseforge-dialog__*`, загрузка zip / `manifest.json`) и блок заказа Custom Modpack Setup в `/mods`
  ([DEV-459](../../tickets/DEV-459.md), [UP/modpack-catalog](modpack-catalog.md)).
- **World Backups** - кнопка рядом с Recycle Bin ([UP/world-backup](world-backup.md)).

## Как работает (под капотом)

- Удаление → файл уходит в корзину `.trash-<shortid>` на 24 часа, потом очищается сам.
- Удаление папки `world` или файла в ней вторым шагом открывает «Save Your World First?» (под [flag:world-backup](../../registry/flags.md#world-backup)).
  Папки вида `world_old` окно не вызывают ([DEV-418](../../tickets/DEV-418.md)).
- Загруженный через Upload custom modpack пак запускает скан модов ([DEV-492/F1](../../tickets/DEV-492.md#находки), исправлено),
  вручную залитый jar сканер подхватывает примерно за 18 минут ([UP/client-only-mods](client-only-mods.md)).
- Отключённые сканером моды лежат в `mods/` как `*.jar.disabled`.

## Правила и граничные случаи

1. **Имена принимают `<` и HTML как есть,** но рендерят как текст: stored XSS в имени папки нет (SEC-003). KB §5j.
2. **Restore и Clear Recycle Bin неактивны,** пока не выбрана строка.
3. **Generate / Save в SFTP меняют пароль SFTP** - реальная мутация.
4. Ошибки манифеста при Upload custom modpack в UI не показываются ([DEV-492/F7](../../tickets/DEV-492.md#находки)).

## Гочи для тестирования

- **Удалять через чекбокс + нижний Delete**, не через «...»: у каждой строки своё меню, `.first()` ловит скрытое. KB §5b.
- **Редактор монтируется асинхронно** - ждать `.cm-content`.
- **Restore - отдельная кнопка `v-btn--slim`**, не внутри `action-btn-group` (там Delete = удалить навсегда). KB §9c.
- Тест-папки копятся дублями в корзине между прогонами - очищаются сами через 24 часа.
- SFTP и Upload custom modpack - только структурно, без Generate / Save / Proceed.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Создание, удаление, переименование папки | `files.spec.ts` (FILE-001, 002, 004) | ✅ |
| Корзина и восстановление | `files.recycle.spec.ts` (FILE-006) | ✅ |
| Меню «...», SFTP, Upload custom modpack, редактор | `files.structure.spec.ts` (FILE-003, SFTP-001, CF-001, FILE-005) | ✅ структурно |
| XSS в имени папки | `security.spec.ts` (SEC-003) | ✅ |
| Правка файла → Save → откат, Move, Zip / Unzip | не покрыто | ❌ |
| Окно World Backup при удалении `world` | только ручной QA [DEV-418](../../tickets/DEV-418.md) | ❌ авто нет |

## История

| Дата | Тикет | Что |
|---|---|---|
| 03..09-Jun-2026 | - | Recon файлового менеджера, корзины, SFTP, редактора |
| 14-Aug-2026 | [DEV-418](../../tickets/DEV-418.md) | Кнопка World Backups и окно при удалении мира |
| 28-Sep-2026 | [DEV-459](../../tickets/DEV-459.md) | Блок Custom Modpack Setup в `/mods` |
| 09-Oct-2026 | [DEV-492](../../tickets/DEV-492.md) | Upload custom modpack запускает скан модов |
