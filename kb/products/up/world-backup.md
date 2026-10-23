---
id: UP/world-backup
title: World Backup - копия мира перед опасными действиями
type: feature
product: UP
status: draft
updated: 2026-10-23
verified_on: 2026-08-14        # клиентская часть, итоговый прогон DEV-418
tickets: [DEV-418, DEV-401, DEV-506, DEV-571]
flags: [world-backup]
tests: []                      # world-backup.spec.ts не написан
sources:
  - kb/tickets/DEV-418.md, DEV-401.md, DEV-506.md
  - agents.docs/game-panel/PROD-134-world-backup-REPORT.md
  - agents.docs/game-panel/PROD-134-world-backup-testplan.md
  - memory: prod-134-world-backup
---

# World Backup - копия мира перед опасными действиями

> **В двух словах.** Перед действием, которое может стереть мир (переустановка, смена версии с очисткой,
> установка модпака с удалением файлов, удаление папки мира), панель предлагает сначала сохранить копию
> только мира. Копия не занимает обычные слоты бэкапов, живёт 7 дней, её можно восстановить. Работает для
> Minecraft Java и Bedrock, с 23-Oct-2026 (сверка) раскатан на всех клиентов. Клиентская часть приняла QA 14-Aug-2026, открыты
> проверки DevOps ([DEV-418](../../tickets/DEV-418.md), бывш. PROD-134).

## Где в интерфейсе

- **Files → кнопка World Backups** рядом с Recycle Bin: список копий, Restore, Delete, таймер «6d 23h left».
- **Окно-перехватчик «Save Your World First?»** - кнопки «Create World Backup» / «Continue Without Backup», предупреждение
  «world may be permanently lost». Опасный запрос не уходит, пока не выбран вариант; Cancel / X отменяет действие.

| Срабатывает | Не срабатывает |
|---|---|
| Reinstall + Delete files | Reinstall / смена версии без delete / wipe |
| Versions: Install + Wipe Server Files ([UP/versions](versions.md)) | модпак Install Over |
| Модпак: Delete Existing Files, Create Backup and Install ([UP/modpack-catalog](modpack-catalog.md)) | файлы вне мира |
| Удаление папки `world` или файла в ней (вторым шагом после «Delete File») | папки вида `world_old` |
| Смена игры в cancel-модуле на MC-сервере ([UP/cancel-module](cancel-module.md)) | - |

Источник: [DEV-418](../../tickets/DEV-418.md), [DEV-506](../../tickets/DEV-506.md).

## Как работает (под капотом)

- **API:** `panel.godlike.host/api/v2/servers/{FULL_UUID}/world-backups`. Короткий uuid → 400. `POST` = 202,
  `DELETE /world-backups/{uuid}`, restore = `POST /world-backups/{uuid}/restore` (stage 20-Oct), отмена незавершённых = `POST /world-backups/abandon` ([DEV-571](../../tickets/DEV-571.md)). Без флага - 404 «World Backups are not
  available for this account».
- **Что входит в копию:**

| Сервер | Состав |
|---|---|
| Java Paper / Vanilla | `world` + `world_nether` + `world_the_end` |
| Forge / NeoForge | одна папка уровня |
| Bedrock | `worlds/<имя>`, `world.variant:"bedrock"` |

- **Лимиты:** по умолчанию 1 копия на сервер, отдельно от обычной квоты бэкапов (3). Ротация upload-then-delete-oldest:
  старая удаляется только после COMPLETED новой. Срок `expires_at` = +7 дней. Не чаще 1 копии в 60 с на сервер.
- **Restore** возвращает мир к состоянию архива; mods / plugins / config / `server.jar` (Java), аддоны / allowlist
  (Bedrock) не трогает.
- **PENDING («Creating…»):** Restore и Delete недоступны, `DELETE` → 409.
- **Хранение:** адаптер `wings` (общая шара ноды), как у остальных бэкапов.
- **Флаг** [flag:world-backup](../../registry/flags.md#world-backup) - Pennant. С 23-Oct-2026 (сверка) раскатан на всех, класс оставлен
  как рычаг отката (сузить тело или `deactivate` для аккаунта). Раньше включался тумблером + `php artisan pennant:purge world-backup`.
  ⚠️ `POST /world-backups/abandon` ([DEV-571](../../tickets/DEV-571.md)) на 23-Oct только на stage, на проде маршрута нет. Лимит 0/N живёт в бэкенд-админке Pterodactyl (Build).

## Правила и граничные случаи

0. **Continue without backup** ([DEV-571](../../tickets/DEV-571.md)): сначала abandon (PENDING/FAILED → DELETING), действие только после 200; отменённая копия держит слот ~30 мин; abandon разрешён при `files.write` / `server.reinstall` / `server.change_version` / `addons.modpacks` / `backups.manage`; каждая фактическая отмена в Audit log.

1. **Legacy-строки `disk=s3` в PENDING** через API не удалить, они держат слот ([DEV-418/F6](../../tickets/DEV-418.md#находки),
   ждёт зачистки в БД от DevOps).
2. **Terminate:** клиентской кнопки нет, только Billing / WHMCS admin ([DEV-418/O2](../../tickets/DEV-418.md#находки)).
   Что происходит с копиями при Cancel и Terminate - в открытых проверках DevOps.
3. **Cancel-модуль:** большой мир на free-шаге показывается только когорте World Backup ([DEV-401](../../tickets/DEV-401.md)).
4. **Двойной Restore** (concurrency-guard) не воспроизведён ([DEV-418/O1](../../tickets/DEV-418.md#находки)).

## Гочи для тестирования

- **Только полный UUID** в `/world-backups` - на коротком 400 «No query results for model Server».
- **Rate limit 60 с** - между созданиями ждать, иначе отказ с сообщением (раньше был немой 429, [DEV-418/F3](../../tickets/DEV-418.md#находки)).
- **Статус копии** проверять reload-ом или по API: у обычных бэкапов статус без reload до COMPLETED не доходит ([обзор UP, гоча 4](README.md#сквозные-гочи)), для World Backup ❓ не проверялось отдельно.
- **Деструктив** (Restore, удаление мира) - только на [srv:7166c707](../../registry/test-servers.md#7166c707) (одноразовый, разрешён)
  или на серверах прогона DEV-418 под [acc:admin](../../registry/test-accounts.md#admin).
- Флаг включён на [acc:admin](../../registry/test-accounts.md#admin) с 11-Aug; на [acc:shared-owner](../../registry/test-accounts.md#shared-owner) ❓ не подтверждено.

## Покрытие

- **Автотестов нет.** План `tests/game/panel/world-backup.spec.ts` (в памяти): матрица окна + Cancel, create, ротация,
  DELETE на PENDING, `/features`.
- Ручной QA: [PROD-134-world-backup-REPORT.md](../../../agents.docs/game-panel/PROD-134-world-backup-REPORT.md), ран-бук
  [PROD-134-world-backup-testplan.md](../../../agents.docs/game-panel/PROD-134-world-backup-testplan.md).
- Открыто у DevOps (§6 ран-бука): ротация при ошибке, fallback `world_backup_<дата>` при сбое заливки, реальная очистка
  через 7 дней, судьба копий при Cancel / Terminate, удаление при отсутствующем файле, лимит 0/N, зачистка legacy `s3`.

## История

| Дата | Тикет | Что |
|---|---|---|
| 10..11-Aug-2026 | [DEV-418](../../tickets/DEV-418.md) | Флаг включён, матрица окна ✅, копии висели PENDING → FAILED |
| 13-Aug-2026 | [DEV-418](../../tickets/DEV-418.md) | Фикс хранилища `s3 → wings` ([DEV-418/F1](../../tickets/DEV-418.md#находки)), create / Restore / Delete ✅ |
| 14-Aug-2026 | [DEV-418](../../tickets/DEV-418.md) | Итоговый прогон на 4 свежих серверах, F2-F5 исправлены. Клиентская часть PASS |
| 14..17-Aug-2026 | [DEV-401](../../tickets/DEV-401.md) | Окно при смене игры в cancel-модуле |
| 05-Oct-2026 | [DEV-506](../../tickets/DEV-506.md) | Окно на Versions → Install + Wipe; «Continue without backup» шлёт `delete_files:true` |
| 19..20-Oct-2026 | [DEV-571](../../tickets/DEV-571.md) | «Готово» только после ноды, Continue → abandon, права и Audit. Stage PASS |
