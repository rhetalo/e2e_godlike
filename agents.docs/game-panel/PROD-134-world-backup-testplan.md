# PROD-134 — World Backup (Minecraft Java + Bedrock)

Ран-бук ручного тестирования + карта автоматизации. Источник: AC задачи PROD-134 +
QA-шаги разработчика (18 шагов). Фича за Pennant feature flag `world-backup`.

> Статус на 10-Aug-2026: **флаг ВЫКЛЮЧЕН на нашем аккаунте** (подтверждено live-recon, см. ниже) →
> фичи в DOM/API нет, исполнение заблокировано. Разработчик писал «вже доступна на цьому акаунті» —
> для `test@testmail.com` это НЕ так. Ниже — что делать, как только флаг реально включат.
> Выделенный одноразовый prod-сервер под деструктив: `ultra.panel.godlike.host/server/7166c707`
> (полный UUID `7166c707-2531-4317-921c-48cad672dc01`, Minecraft **Java**; владелец дал разрешение
> на разрушающие действия именно на нём). Под **Bedrock**-сценарии нужен отдельный сервер.
>
> **Live-recon 10-Aug-2026 (доказательство, что флаг off):**
> - `GET https://panel.godlike.host/api/v2/features` (API-хост = `panel.godlike.host`, НЕ `ultra.panel`) →
>   `["java-mismatch-fixer","affiliate-banner","hytale-world","inactivity-chat","extensions-onboarding"]`
>   — `world-backup` отсутствует.
> - File Manager кнопки: `Backups`, `Recycle Bin`, `Clear Recycle Bin` — кнопки `World Backups` НЕТ.
> - Как включат: `world-backup` появится в `/features`, рядом с Recycle Bin возникнет кнопка `World Backups`.

## API-механика (recon 11-Aug-2026) — пригодится, когда флаг включат
- **API-хост = `panel.godlike.host`** (фронт-SPA = `ultra.panel.godlike.host`). Проверки слать на API-хост.
- Роут задеплоен: `GET/POST /api/v2/servers/{FULL_UUID}/world-backups`, `DELETE .../world-backups/restore`.
  Требует **полный** uuid (short → 400 «No query results for model Server»).
- **Гейт (флаг off):** `404 {"success":false,"message":"World Backups are not available for this account."}`.
  Это account-level Pennant-гейт. Когда включат — станет `200` со списком, и `world-backup` появится в `/api/v2/features`.
- **Проверено на обоих акках (`test@testmail.com`, `r.hetalo@godlike.host`) — фича ВЫКЛЮЧЕНА.**
  Нужно: «Feature Flags Enabled=Yes» + `php artisan pennant:purge world-backup` на конкретном аккаунте.

## Живой прогон 11-Aug-2026 (аккаунт r.hetalo, сервер 85fc5bd9, Neoforge Java, offline)
Флаг ВКЛЮЧЁН и подтверждён (`world-backup` в `/features`; `GET .../world-backups` 200; кнопка World Backups есть).
Селекторы/факты, снятые вживую (для будущего спека):
- **Попап-компонент:** `WorldBackupPromptDialog`. Заголовок **«Save Your World First?»**, кнопки
  **«Create World Backup»** и **«Continue Without Backup»**, красное предупреждение «your world may be
  permanently lost». Текст подтверждает 7 дней + не занимает обычные слоты.
- **Раздел World Backups:** inline-вид в File Manager (кнопка рядом с Recycle Bin переключает список).
  Empty-state: «No World Backups yet. One is offered before any action that can delete your world».
  Отдельной кнопки Create НЕТ — копия предлагается только попапом.
- **Reinstall-флоу:** Overview → `Edit Server` → `Reinstall Server` → «Confirm Server Reinstallation»
  с чекбоксом `input[aria-label="Delete files"]` + «Yes, Reinstall Server» (`POST .../reinstall`).
- **API-лимит по умолчанию = 1** (`meta.limit`), `world.variant:"java"`, `paths:["world"]` (Neoforge — измерения внутри).
- ⚠️ Onboarding-тур **Shepherd** (`.shepherd-element`) перехватывает клики на /files — в тесте убирать.

Результаты проверок:
| Кейс | Метод | Результат |
|---|---|---|
| Флаг включён | API+UI | ✅ PASS |
| 7-day + отдельные слоты (текст раздела) | UI | ✅ PASS |
| Дефолт-лимит = 1 | API meta | ✅ PASS |
| **Reinstall + Delete files → попап перехватывает** | UI, guard на `/reinstall` | ✅ PASS (POST /reinstall НЕ ушёл до выбора; попап «Save Your World First?») |
| Попап-предупреждение «world may be permanently lost» | UI | ✅ PASS |
| **File Manager: delete `world`/файла внутри → попап** | UI | ✅ PASS (2-ШАГА: обычный «Delete File» → **дожать Delete** → WB-попап «Save Your World First?» ПЕРЕД софт-удалением). Проверено: папка `world` ✅, файл внутри `world/level.dat_old` ✅ |
| **File Manager: delete файла ВНЕ world → нет попапа** | UI | ✅ PASS (`eula.txt`,`server.properties` → только обычный «Delete File»; `eula.txt` дожат → ушёл в Recycle Bin → восстановлен). Триггер корректно **world-scoped** |
| ⚠️ ранее ошибочно записал File Manager как FAIL — снято: отменял на 1-м диалоге, попап на 2-м шаге |
| **Create World Backup** (`POST .../world-backups`) | API | ✅ PASS создание (копия «World Backup 2026-08-11 09:54:34», uuid b50752c2) |
| **Retention 7 дней** | API | ✅ PASS `created_at 09:54:34` → `expires_at` ровно +7 дней |
| **Квота-разделение (не ест обычные 3)** | API | ✅ PASS обычных бэкапов `total:1` без изменений |
| **Лимит 1 (can_create)** | API | ✅ PASS `can_create:false` пока слот занят |
| **DELETE на PENDING → отказ** | API | ✅ PASS `DELETE /world-backups/{uuid}` → **409** «still being created and cannot be deleted yet» |
| **PENDING статус в UI: Restore/Delete disabled** | UI | ✅ PASS раздел World Backups: колонки Name/Status/Remaining; PENDING = «Creating…»; Restore и Delete **серые/disabled**. ⚠️ мелочь: таймер «Remaining» у PENDING рендерится «d h left» без цифр (перепроверить на COMPLETED) |
| POST при занятом слоте / FAILED не считается | API | ℹ️ POST вернул 202 даже при `can_create:false` — но старая копия к тому моменту была `FAILED`; `used` не считает FAILED (упавшие остаются в списке, слот не занимают). Ротацию «удалить старую после COMPLETED новой» без воркера НЕ проверить |
| **Modpack Delete/Backup → попап; Overwrite → нет** | UI, guard на install | ✅ PASS (все 3 режима). RAM-warning «Install Anyway» пробивается → **Delete → WB-попап**, **Backup → WB-попап** (install POST не летит), **Overwrite → БЕЗ попапа**, сразу `POST /minecraft/modpacks` (заблокирован). Ровно по AC. Endpoint install: `POST /api/v2/servers/{uuid}/minecraft/modpacks` |
| **Change Version + Wipe → попап** | UI, guard на install | ✅ PASS. Versions → семейство (`.server__builds-build` карточки, drill-down `?type=`) → карточка версии → диалог **«Select Build»** с чекбоксом **«Wipe Server Files»** → Install → **WB-попап** (install POST не ушёл — перехвачено; пошаговый трейс). Endpoint: `POST /minecraft/versions/install`. Без Wipe → попапа нет, install летит сразу |
| incidental: «Continue Without Backup» продолжает деструктив | UI | ℹ️ кнопка попапа «Continue Without Backup» → выполняет исходное действие (install-запрос ушёл) — подтверждает «отказаться и продолжити» |
| **Cancel/X в попапе → деструктив НЕ выполняется** | UI | ✅ PASS (Volodymyr п.7): попап «Save Your World First?» → X → reinstall POST НЕ ушёл, попап закрылся |
| **Java раздельные измерения + исключение постороннего** | UI+API meta | ✅ PASS: на Paper создал `world_nether`+`world_the_end`+`world_old` → `meta.world.paths` стал `["world","world_nether","world_the_end"]` (посторонний `world_old` НЕ включён). Ровно AC/шаг 4. Убрано за собой |
| ⚠️ side: scope триггера попапа шире content-scope | UI | ℹ️ удаление `world_old` ТОЖЕ вызывает попап (триггер, похоже, по префиксу `world*`), хотя в backup-content `world_old` не входит — для разраба (over-trigger, вероятно намеренно как safety) |
| **L2/DevOps конфиг лимита (0/N на клиента)** | — | ⛔ НЕ owner-доступно: `/server/{id}/admin` = Roadmap/Onboarding-дашборд (фича admin-panel), поля лимита нет. Конфиг лимита — в бэкенд-админке (pterodactyl Build) = DevOps. Consumer-сторона (default 1, can_create, квота) уже ✅ |
| **Завершение бэкапа (PENDING→COMPLETED)** | API | ⛔ **СТОПОР (окружение-wide)** — ТРИ сервера, ДВЕ ноды: `85fc5bd9` (Neoforge, node 396), `e0ef886f` (Paper, node 396), `43ae756d` (Paper, **node 407**) — везде копия висит `PENDING`, `size:0`, не двигается. POST=202 Accepted, копии зависают `PENDING size:0`, а спустя ~1 час флипаются в **`FAILED`** (проверено: копия 09:54 → FAILED к 11:03). Т.е. джоба не консюмится/не заливается и по таймауту падает — **world-backup jobs FAIL, никогда не COMPLETED во всём окружении**. Для DevOps: проверить обработчик очереди world-backup **И Hetzner/S3-креды/связность** (падение на аплоаде — вероятная причина). Downstream (COMPLETED, rotation, Restore, fallback, cleanup) заблокирован до фикса |

### Bedrock (сервер 93bbc747, BEDROCK-Vanilla, node 414)
| Кейс | Метод | Результат |
|---|---|---|
| Bedrock world path/variant | API | ✅ PASS `world.variant:"bedrock"`, `level_name:"Bedrock level"`, `paths:["worlds/Bedrock level"]` — ровно AC «worlds/<level-name>» |
| Флаг/лимит 1/квота на Bedrock | API | ✅ PASS `world-backups` 200, `limit:1`, обычные backups отдельно |
| **Bedrock: попап срабатывает** | UI, guard /reinstall | ✅ PASS Reinstall+Delete files → «Save Your World First?» (reinstall POST не ушёл; bedrock-детекция мира работает) |
| Bedrock create→COMPLETED / Restore (аддоны/конфиги/allowlist целы) | — | ⛔ ждёт воркера (тот же стопор) |

## TL;DR — почему не автоматизируется «всё сам»

1. **Флаг не self-serve:** включение = админ-тумблер «Feature Flags Enabled=Yes» + `php artisan
   pennant:purge world-backup` (CLI на ноде). Нет шелла → нужен DevOps/Сергій.
2. **Ядро error-handling через UI недостижимо:** stop node / stop Wings (симуляция падения
   бэкапа) — инфра, нет кнопки. Без него не проверить ротацию-при-ошибке, FAILED, retry,
   fallback `world_backup_<date>`.
3. **Верификация хранилища вне панели:** «лёг на Hetzner / не осел на SSD / удалён из бакета» —
   S3/Hetzner-консоль или БД. Это DevOps.
4. **Terminate + 7-дневный cleanup:** необратимо / тайм-триггер → DevOps, в окне QA-дня не
   подтвердить реальное удаление на +7д.
5. **root-admin:** 404-до-флага и поле лимита в Build-форме требуют root-админки (у нас, вероятно,
   только owner-аккаунт).

Итого: автотестами безопасно закрывается ~40-50% AC; остальное — staging/DevOps/root-admin.

## Кто что физически выполняет

| Слой | Исполнитель |
|---|---|
| popup появляется+Cancel; API GET-матрица; WB create happy; ротация default-1 happy; WB не ест квоту-3; DELETE PENDING→reject; `/features` содержит `world-backup` | **Claude (Playwright)** — на `7166c707` |
| Reinstall+Delete насквозь; version/core wipe; modpack Delete/Backup; Restore-очистка+точное соответствие; delete world-папки; concurrent-restore | **Claude на `7166c707`** (деструктив разрешён) |
| `pennant:purge`; stop node; stop Wings; FAILED+retry; fallback `world_backup_<date>`; Terminate→delete objects; миграции/pteroq/scheduler | **DevOps / backend / Сергій** |
| объект на Hetzner; нет утечки на SSD; объект удалён из бакета; реальный cleanup +7д | **DevOps (S3/БД)** |
| 404 до флага; поле лимита в Build; лимит 0/3; снятие флага | **QA с root-admin** |

## Переиспользуемая архитектура (не плодить новое)

- `pages/game/GamePanelBackupsPage.ts` — create/delete/status/quota/scheduled. **Расширить** под World Backup.
- `pages/game/GamePanelFilesPage.ts` — delete/recycle/restore → триггер попапа на удалении `world`.
- `pages/game/GamePanelVersionsPage.ts` + reinstall-диалог в `GamePanelServerPage` — триггеры попапа.
- `utils/gameAuth.ts` — добавить `GAME_SERVER_WORLDBACKUP_UUID=7166c707`; env-переключатель prod↔stage уже есть.
- Новый блок `GAME_PANEL_WORLD_BACKUP` в `utils/selectors.ts` (после live-recon включённого попапа/раздела).

---

## Ручной ран-бук (порядок намеренный: неразрушающее → деструктив → Terminate последним)

### Фаза 0. Предусловия (DevOps/backend)
- [ ] Миграции прогнаны, `pteroq` перезапущен, планировщик активен.
- [ ] Креды S3/Hetzner настроены.
- [ ] Серверы готовы: Java Paper (`level-name=world` + `world_nether` + `world_the_end`); Bedrock Vanilla; опц. Forge/Fabric.
- [ ] Доступ к root-admin и к Hetzner-бакету (верификация объектов).

### Фаза 1. Pennant-гейтинг (шаги 1-3, 18)
- [ ] **До флага**, root-admin: `GET/POST/retry/restore/DELETE /api/v2/servers/{uuid}/world-backups` → **404** каждый.
- [ ] `GET /api/v2/servers/{uuid}/backups` (обычные) → работает как раньше (регресс).
- [ ] Тумблер «Feature Flags Enabled=Yes» + `php artisan pennant:purge world-backup` → повтор: список **200**; `GET /api/v2/features` содержит `world-backup`.
- [ ] (шаг 18) Выключить флаг с существующей копией → API **404**, запись+объект живы; вернуть флаг+purge → доступ вернулся, срок жизни прежний.

### Фаза 2. Создание + содержимое архива (шаги 4-7)
- [ ] Java dimensions: копия → ровно `world` + `world_nether` + `world_the_end`. Каталог `world_old` рядом → **не** в следующей копии.
- [ ] `level-name` = `My World` (с пробелом), рестарт, копия → путь `My World`; старый `world_nether` **не** включён.
- [ ] Forge/Fabric: один каталог уровня, измерения **внутри**.
- [ ] Bedrock Vanilla: копия → путь `worlds/<level-name>`.

### Фаза 3. Лимиты и ротация (шаги 8-10, 12)
- [ ] Default-лимит: поле в Build пустое → создать 2-ю → пока `PENDING`, видны обе; после `COMPLETED` старая **исчезает**.
- [ ] Уронить 2-ю (DevOps: stop node) → 1-я **остаётся**.
- [ ] Лимит `0`: API отказ, панель «выключено». Лимит `3`: хранятся три. Несвязанный Build-апдейт из биллинга → `3` **сохраняется**.
- [ ] World Backup **не** уменьшает стандартные 3 слота обычных бэкапов.

### Фаза 4. Ошибки / таймаут / retry (шаги 11-13, DevOps)
- [ ] Stop Wings → создать копию → сразу `FAILED`, слот свободен, retry **немедленно** (не через 30 мин).
- [ ] Retry → `world_backup_<date>`; предыдущая успешная **не тронута**. Fallback-копия ушла **в storage**, не на SSD.
- [ ] `PENDING`-копия: `DELETE` → **отказ**.

### Фаза 5. Восстановление (шаги 14-15, 7)
- [ ] Создать копию, изменить мир, переименовать `level-name`, Restore → `server.properties` на архивный уровень; переименованный каталог **удалён**; `plugins/`, `mods/`, `config/`, `server.jar` **на месте**; сервер стартует со старым миром. Ключ: **полная очистка** папки, а не перезапись.
- [ ] Restore + во 2-й вкладке сразу тот же → 2-й **отклонён**, распаковка **один раз**.
- [ ] Bedrock Restore: мир заменён, аддоны/конфиги/allowlist **на месте**.

### Фаза 6. Попап-перехват (триггеры + негативы)
Для каждого позитива: попап появляется, отмена возможна, при отказе UI предупреждает «мир будет потерян навсегда», при ошибке бэкапа — fallback-ветка (Retry `world_backup_<date>` / Continue without backup).
- [ ] Reinstall — попап **только** при Delete files (без Delete — нет попапа).
- [ ] Java Change Version/Core с Wipe/Delete → попап.
- [ ] Bedrock Change Version с удалением файлов → попап.
- [ ] Modpack: Delete и Backup → попап; **Overwrite → попапа НЕТ**.
- [ ] File Manager: удаление `world` **или файла внутри неё** → попап **до** Recycle Bin.
- [ ] **Негатив:** удаление файлов **вне** `world` (`plugins`, `config`, `server.properties`) → **попапа НЕТ**.

### Фаза 6b. Поведение попапа (шаг 7 чеклиста)
- [ ] **Cancel** в попапе → деструктивное действие **не выполняется**, сервер не ломается.
- [ ] **Continue without backup** → деструктивное действие **выполняется** (мир теряется, как и предупреждали).
- [ ] Нельзя запустить **два Restore одновременно** (второй запрос отклонён).

### Фаза 6c. UI-раздел World Backups (шаг 6 чеклиста)
- [ ] Кнопка **World Backups** присутствует рядом с **Recycle Bin** (сейчас ОТСУТСТВУЕТ — флаг off).
- [ ] Отображаются **статусы** копий (PENDING/COMPLETED/FAILED).
- [ ] Отображается **время жизни** (TTL) копии.
- [ ] Для копии в **PENDING** недоступны **Restore** и **Delete**.

### Фаза 7. Retention / Terminate (шаги 16-17 — Terminate ПОСЛЕДНИМ)
- [ ] Обратный отсчёт от **создания**, не «прыгает» после загрузки. Suspend/Cancel → срок **не меняется**.
- [ ] Terminate → все `world-backups` сервера в бакете удалены **мгновенно** (Hetzner-консоль).
- [ ] 7-дневный cleanup: удаление ровно через 7 дней (DevOps по БД/планировщику или отложенный ретест).

### Фаза 8. Кросс-проверка хранилища (сквозной AC, DevOps)
- [ ] Каждый объект реально на Hetzner; на локальной ноде ничего не осело (в т.ч. fallback-копия).

---

## Дыры в спеке — спросить
- Fallback `world_backup_<date>` — архитектурные детали к **Маркіяну** (как копия уходит в storage, не на SSD).
- Требует ли `POST world-backup` остановленного сервера, или строго «на гарячу»?
- Форма конфигурации лимита: поле в Build vs отдельный admin-эндпоинт.
- Есть ли у попапа «не спрашивать снова» (влияет на изоляцию тестов).

## Что делаю, как только флаг включат
1. `live-recon` включённого попапа/раздела Restore/лимит-поля на `7166c707` → селекторы в `GAME_PANEL_WORLD_BACKUP`.
2. Скаффолд автослайса: `tests/game/panel/world-backup.spec.ts` (popup+Cancel матрица, WB create/quota-separation, ротация default-1, DELETE-PENDING-reject, `/features`), self-cleaning, serial.
3. Деструктив насквозь (Restore/version-wipe/delete-world) — на `7166c707`, отдельным spec с afterAll-recovery.
4. Инфра/хранилище/Terminate/cleanup — остаются за DevOps по ручному ран-буку выше.
