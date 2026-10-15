---
id: UP
title: UP - игровая панель ultra.panel + API v2
type: product-overview
product: UP
status: draft            # собрано из доков/отчётов/памяти, живой сверки этой страницы не было
updated: 2026-10-15
verified_on: null        # у разделов свои даты recon, см. колонку «Источник» и таблицу ниже
tickets: [DEV-401, DEV-405, DEV-472, DEV-485, DEV-492, DEV-498, DEV-500, DEV-506, DEV-515, DEV-529, DEV-532, DEV-534, DEV-562, DEV-563, DEV-418]
flags: [java-start-gate, java-mismatch-fixer, extension-compatibility, world-backup, cancellation-retention-steps, modpack-catalog-v2]
tests: [tests/game/panel/*.spec.ts]
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md (recon 03-Jun..27-Jul-2026)
  - agents.docs/game-panel/TEST_PLAN.md
  - agents.docs/tz/TZ-GP-*.md (17-Jun-2026)
  - agents.docs/QA_TEST_COVERAGE_AND_SPECS.md §1.9 (02-Oct-2026)
  - test-docs/ultra.panel/*-REPORT.md, *-BUG.md (Aug-Oct 2026)
  - kb/_meta/inventory-2026-10-15.md
  - memory: game-panel-*, panel-modals-handle-myself, cf-modrinth-source-swap, split-server-qa, throttling-webhook-feature, v2-subuser-permission-fix, prod-134-world-backup, cancel-retention-dev401, stage-neoforge-unixargs, palworld-settings-qa, dev4xx/dev5xx-*
---

# UP - игровая панель ultra.panel + API v2

> **В двух словах.** Это личный кабинет клиента для игровых серверов: список своих серверов,
> кнопки Start/Restart/Kill, консоль, файлы, настройки, версии ядра, моды/плагины/модпаки,
> бэкапы, совместный доступ. Основная игра - Minecraft, но есть PZ, ARK, Rust, Terraria, Arma,
> Palworld. Оплата и тарифы живут не здесь, а в биллинге (BIL, страница появится в `kb/products/bil/`) - панель туда
> ссылается. Все тесты и QA идут на живом проде, кроме отдельных задач на stage.

## Как устроено

| Слой | Что | Факт / источник |
|---|---|---|
| Фронт | `ultra.panel.godlike.host` - Vue SPA (Vuetify), REST + WebSocket-консоль | KB §1 |
| API | `panel.godlike.host/api/v2/servers/{uuid}/...`, заголовок `Authorization: Bearer ptlc_*` (Pterodactyl client token; SPA держит его в localStorage `access_token`) | KB §7i, memory v2-subuser-permission-fix |
| Текущий юзер | `GET /api/v2/auth/current`; account-level флаги `GET /api/v2/features` | memory v2-subuser, prod-134 |
| Под капотом | Pterodactyl (Laravel) + Wings-ноды: в консоли строки `[Pterodactyl Daemon]`, классы `Pterodactyl\Services\...` в ошибках, яйца (egg) = тип сервера. Ноды вида `srvN.godlike.club`, `wing1000`, `srv1001` | KB §5a, §9f; tariff-list-400-BUG; memory cf-modrinth |
| Консоль | xterm (`.terminal.xterm`), SPA сам держит Wings-сокет; события `console output` / `install output` | KB §9f; memory stage-neoforge-unixargs |
| Pterodactyl client API | `/api/client/servers/{short}/...` тоже живой (чтение файлов, resources, startup); на stage power через него → 401, мутации идут через `/api/v2` | memory stage-neoforge-unixargs, dev513 |
| Фичефлаги | Laravel Pennant (таблица `features`), включение = админ-тумблер + `php artisan pennant:purge <flag>` (DevOps) | memory prod-134, cf-modrinth |
| Код | фронт `new-panel` (MR `!5xx`), бэкенд `panel` (MR `!16xx`), см. [id-scheme](../../_meta/id-scheme.md#репозитории-кода-gitlab-gitgodlikeovh). Деление фронт/бэк выведено по номерам MR ❓ | id-scheme |

**Вход.** На `/login` чузер «Through login/password» раскрывает форму email + пароль, успех →
`/?page=1`. Рядом ссылка «Authorization» → `panel.godlike.host/api/v2/whmcs/login` (OAuth через
WHMCS). Steam-вход упомянут в KB §1 как «out of scope», флоу не описан ❌. На stage вход только
Google-OAuth (`stage.panel.godlike.host/oauth2/callback`), сессия живёт ~30-40 мин
([env:stage](../../registry/environments.md#stage)). Источник: KB §4, §7.0; memory stage-neoforge-unixargs.

**Связь с соседними продуктами.**
- **BIL** (`godlike.host/clientarea/`): пункт сайдбара Billing ведёт туда; «Request Cancellation»
  живёт в clientarea productdetails и кросс-доменом открывает модуль отмены в UP (`?canceled=true`);
  Upgrade тянет тарифы через `GET /api/v2/tariffs-new/<service_id>/list`; суффикс имени сервера
  `_NNNNNN` = ID услуги WHMCS; апгрейды на тест-акке оплачиваются кредитным балансом. Источник: KB §2, §7g, §11; tariff-list-400-BUG; memory dev563.
- **OLDP** (`panel.godlike.host/`): старая клиентская панель на том же бэкенде. Version changer и
  Startup с Docker image ([DEV-486](../../tickets/DEV-486.md), [DEV-513](../../tickets/DEV-513.md)) проверялись там.
  По умолчанию QA «панели» = только UP (memory panel-scope-new-panel).
- **ADM** (`panel.godlike.host/admin`): `is_listed` модпаков ([DEV-532](../../tickets/DEV-532.md)), Docker image
  сервера (DEV-513), инвайты в split. Ничего без явного ок владельца.
- **PFH**: `playfreehost.com/panel` - дубль UP для free-юзеров, аккаунты синхронны, отдельный
  деплой фронта (отстаёт: без new-panel!558 на 15-Oct). Источник: memory dev563.

## Карта разделов

Маршруты: дашборд `/?page=1`, сервер `/server/{uuid}` (принимает full и short uuid). У сервера две
навигации: сайдбар (Overview, Sharing, Port & Domains, Backups, Tasks, Databases) и таб-полоса
(Overview, Console, Files, Versions, Plugins/Mods, Modpacks, Config, Players). KB §4.

Статус знаний: ✅ описано и сходится / ⚠️ описано, но устарело или только в отчётах / ❌ нет описания.

| Раздел | Что это | Фича | Тикеты | Автотесты | Знания |
|---|---|---|---|---|---|
| Вход | Логин/пароль, OAuth WHMCS, Steam, logout | [UP/login](login-dashboard.md) | - | login, auth.logout | ⚠️ пароль ✅, OAuth/Steam ❌ |
| Дашборд | «My Servers (N)», фильтры Suspended/Free, grid/list, группы split | [UP/dashboard](login-dashboard.md) | - | dashboard | ⚠️ |
| Overview сервера | Server Information (IP, порт, Steam Port), Edit Server (rename/Import/Reinstall), Java-notice | [UP/server-overview](server-overview.md) | [DEV-562](../../tickets/DEV-562.md) | server.overview, edit.server, network.connection-info | ✅ |
| Power | Start/Shut Down/Restart/Kill, EULA, гейт по Java | [UP/power](power.md) | [DEV-485](../../tickets/DEV-485.md) | power | ✅ |
| Console | xterm-лог, ввод команд, палитра Commands, Help | [UP/console](console.md) | - | console, console.palette, security.console | ✅ |
| Files | Файл-менеджер, Recycle Bin 24ч, CodeMirror, SFTP, Upload custom modpack | [UP/files](files.md) | - | files, files.recycle, files.structure | ✅ |
| Config | Редактор `server.properties` (автосейв) + блок Docker/Java (Docker Image combobox) | [UP/config](config.md) | - | config, security (SEC-004) | ✅ |
| Startup / Docker image | Смена образа Java; в UP через Config, `/server/{id}/startup` рендерит пусто | [UP/startup](config.md#как-работает-под-капотом) | [DEV-513](../../tickets/DEV-513.md) (OLDP) | permission.enforcement.api (docker_access) | ❌ |
| Players | Админы, Players List, Whitelist, Ban List (нужен online) | [UP/players](players.md) | - | players | ✅ |
| Versions | 18 ядер, drill-down версия → билд → Install (+Wipe) | [UP/versions](versions.md) | [DEV-506](../../tickets/DEV-506.md), [DEV-529](../../tickets/DEV-529.md) | versions | ⚠️ |
| Extensions-каталог | Моды/плагины/модпаки, источники CF/Modrinth/Hangar/Spigot/Polymart, фильтры, update | [UP/extensions-catalog](extensions-catalog.md) | [DEV-405](../../tickets/DEV-405.md), [DEV-534](../../tickets/DEV-534.md), [DEV-498](../../tickets/DEV-498.md) | extensions, mods, plugins, extension.sources | ⚠️ |
| ↳ Loader gating | Заглушки и автофильтр по ядру (`extension_capabilities`) | [UP/mods-loader-gating](mods-loader-gating.md) | [DEV-515](../../tickets/DEV-515.md), [DEV-529](../../tickets/DEV-529.md) | - | ⚠️ |
| ↳ Client-only моды | Скрытие клиентских модов в каталоге | [UP/client-only-mods](client-only-mods.md) | [DEV-500](../../tickets/DEV-500.md) | - | ⚠️ |
| ↳ Пост-инсталл скан | Вердикт по jar после установки, отключение на старте | [UP/post-install-mod-scan](client-only-mods.md#2-скан-и-отключение-на-сервере-dev-492) | [DEV-492](../../tickets/DEV-492.md) | - | ⚠️ |
| ↳ Каталог модпаков | Видимость `is_listed`, каталог v2 | [UP/modpack-catalog](modpack-catalog.md) | [DEV-532](../../tickets/DEV-532.md) | - | ⚠️ |
| ↳ Missing deps | Окно «Missing mod dependencies» после краша | [UP/missing-mod-deps](missing-mod-deps.md) | [TASK-missing-mod-deps](../../tickets/TASK-missing-mod-deps.md) | - | ⚠️ |
| Java detection | `required_java`, попап «needs Java N», префлайт и гейт старта | [UP/java-detection](java-detection.md) | [DEV-472](../../tickets/DEV-472.md), [DEV-485](../../tickets/DEV-485.md) | - | ⚠️ |
| Sharing и роли | Инвайт, Owner/Co-owner/Moderator/Member, права v2 | [UP/sharing-roles](sharing-roles.md) | [TASK-v2-subuser-permissions](../../tickets/TASK-v2-subuser-permissions.md) | sharing, role.enforcement, permission.enforcement.api | ✅ |
| Audit Log | Журнал действий `server:<action>` в Sharing | [UP/audit-log](sharing-roles.md) | - | sharing.audit | ✅ |
| Port & Domains | Поддомен, порты, Add Additional Port | [UP/ports-domains](ports-domains.md) | - | network | ✅ |
| Backups | Server/Database/Folder, квота N/3, Locked, Schedule, Restore | [UP/backups](backups.md) | - | backups, security (SEC-002) | ✅ |
| World Backup | Бэкап только мира (Java+Bedrock), попап «Save Your World First?» | [UP/world-backup](world-backup.md) | [DEV-418](../../tickets/DEV-418.md) | - | ⚠️ |
| Tasks | Send command / Send power action, Configure, Run, расписание | [UP/tasks](tasks.md) | - | tasks | ✅ |
| Databases | Create Database, таблица кредов | [UP/databases](databases.md) | - | - | ⚠️ |
| Upgrade / Boost | `/upgrade?promocode=...`, карточки планов, квиз | [UP/upgrade](upgrade.md) | [TASK-tariff-list-400](../../tickets/TASK-tariff-list-400.md) | promo (UPG-001) | ⚠️ |
| Free Premium | Модалка «What is a Free Premium?», CTA 3-Days Trial | [UP/free-premium](upgrade.md#где-в-интерфейсе) | - | promo (PREM-001) | ✅ |
| Referral | `/referral`, реф-ссылка `affiliate.godlike.host/ref/<code>`, Request Withdrawal | [UP/referral](referral.md) | - | referral | ✅ |
| Throttling | Вебхук → модалка «Lag Detected» с апгрейдом | [UP/throttling](throttling.md) | [TASK-throttling-webhook](../../tickets/TASK-throttling-webhook.md) | throttling.notification (env-gate) | ⚠️ |
| Cancel module | Модалка отмены, A/B old/new, pause, retention-экраны | [UP/cancel-module](cancel-module.md) | [DEV-401](../../tickets/DEV-401.md) | - | ⚠️ |
| Split Server | Main + до 3 сабов, перераспределение RAM/диска | [UP/split-server](split-server.md) | [TASK-split-server](../../tickets/TASK-split-server.md) | - | ⚠️ |
| Free-серверы | Free-тариф: запрет смены игры (egg) | [UP/free-servers](free-servers.md) | [DEV-563](../../tickets/DEV-563.md) | - | ⚠️ |
| Game settings | Palworld Settings (UI для `PalWorldSettings.ini`), ARK-аналог | [UP/game-settings](game-settings.md) | [TASK-palworld-settings](../../tickets/TASK-palworld-settings.md), DEV-145 (ARK, только упоминание) | - | ⚠️ Palworld, ❌ ARK |
| Модалки и оверлеи | EULA, giveaway/Trustpilot, shepherd-тур, цепочка модалок модпака | [UP/modals](modals.md) | - | косвенно (GamePanelBasePage.open) | ✅ |

Автотесты: 31 спек в `tests/game/panel/`, 81 `test()` (grep 15-Oct-2026), из них
`permission.enforcement.api.spec.ts` не закоммичен. Имена в таблице = `<имя>.spec.ts`.

## Сквозные гочи

1. **Short vs full UUID.** SPA-роуты и `GET /api/v2/servers/{short}` принимают короткий id, но часть
   v2-ручек требует полный: `/allocations`, `/world-backups` (short → 400 «No query results for
   model Server»), `whmcs/cancel/{fullUuid}/...`. Если 400 - сначала проверить uuid. Источник: KB §9f, §11; memory prod-134.
2. **Pennant-флаги считаются по ВЛАДЕЛЬЦУ сервера**, не по тому, кто смотрит
   ([flag:extension-compatibility](../../registry/flags.md#extension-compatibility),
   [flag:cancellation-retention-steps](../../registry/flags.md#cancellation-retention-steps)).
   [flag:java-start-gate](../../registry/flags.md#java-start-gate) переделан в per-server, потому что фоновая
   джоба старта идёт без юзера. Источник: memory cf-modrinth, cancel-retention-dev401, dev485.
3. **`networkidle` не наступает** (живой ws консоли + чат-виджет). Ждать конкретный
   `waitForResponse` сохранения, слушатель ставить до действия. Пример: гонка reload vs
   `POST .../members/change-role` ронила SHR-005. Источник: memory game-panel-networkidle-gotcha.
4. **Многие статусы не реактивны:** статус бэкапа не доходит до COMPLETED без reload; роль в Members
   и Players-таб лагают; тоггл power иногда не флипается в «Shut Down» при Running. Правда - консоль
   или reload. Источник: KB §5a, §5e, §5h, §10.
5. **Консоль = xterm**, текст надёжнее читать из `.terminal` или ws-фреймов; скоуп адреса по
   `.roadmap-ip`, потому что в консоли есть `127.0.0.1:PORT`. Источник: KB §9f; memory stage-neoforge-unixargs.
6. **Оверлеи ловят клики:** shepherd-тур (6 шагов, на каждой навигации, «Skip for now»), giveaway
   `.giveaway-modal` со скримом `.v-overlay__scrim`, промо «Get 3 Free Days». В cancel-модуле кнопки
   срабатывают только через `dispatchEvent('click')`. Источник: KB §5, §7.0, §11; memory panel-modals-handle-myself.
7. **Цепочки модалок:** установка модпака = «Install modpacks» → «needs more RAM» → Install Anyway →
   «Save Your World First?» → «Some mods were disabled» → Got It. После каждого действия снимать
   видимые `.v-overlay__content`, ждать короткими шагами (≤60-90 с). EULA принимаем сами. Источник: memory panel-modals-handle-myself.
8. **Audit Log не пишет `server:power.start`** (stop и console.command пишутся) и индексируется с
   лагом. Тест на старт по логу невозможен. Источник: KB §9b; memory game-panel-giveaway-and-audit.
9. **Роли = присутствие контролов в DOM**, не `disabled`. Restart/Kill - Owner и Co-owner; консоль и
   управление бэкапами - ещё Moderator; управление участниками - только Owner. На бэке v2 права
   сабюзера проверены только для `docker_access` (403). Источник: KB §5i; memory v2-subuser-permission-fix.
10. **Деструктив прячется за безобидными кнопками:** Reinstall Server, Versions → Install (+Wipe),
    Backups → Restore, установка модпака (overwrite), закрытие cancel-модалки ПОСЛЕ экрана reason
    (= реальная отмена, откат только в clientarea), pause = реальный Paused в WHMCS, Send Invite =
    реальное письмо. Источник: KB §7f, §8d, §11; memory cancel-retention-dev401.
11. **Каталог модов = live API провайдеров** (переключатель источника включён на проде 30-Sep).
    CF фильтрует loader только вместе с `mc_version`; на 26.x пустой loader = loader сервера;
    `All` шлёт `any`. Источник: memory cf-modrinth-source-swap, mods-loader-filter-qa, dev500.
12. **Правда по гейтингу модов** - `GET .../minecraft/version` → `extension_capabilities`; по Java -
    `server-jar/status` (`java_preflight`, `error=java_too_old`); прямой `POST /power` даёт 409, кнопка
    Start отказывает через полинг статуса. Источник: memory dev515, dev485; java-detection-matrix-REPORT.
13. **Имя сервера дрейфует** при реинсталле (авто-имя вида `Fcz3VN5n_439772`), UUID стабилен.
    Идентичность только по UUID. Источник: memory game-panel-next-focus.
14. **Rate limits:** World Backup - 1 копия в 60 с на сервер; throttling-модалка - ~раз в 3 дня на
    сервер (вебхук без auth всегда отвечает `success:true`, даже если модалки нет). Источник: memory prod-134, throttling-webhook-feature.
15. **Админ-аккаунт видит чужие серверы** (на stage ~16930). Трогать только серверы из
    [реестра](../../registry/test-servers.md); канонический e2e - [srv:ebb03adc](../../registry/test-servers.md#ebb03adc),
    деструктив разрешён на [srv:7166c707](../../registry/test-servers.md#7166c707). Источник: memory stage-admin-account-scope, prod-134.

## Что устарело в источниках

1. **«Staging нет»** (KB §2, CLAUDE.md, QA_COVERAGE) - stage есть: Palworld 20-Aug, NeoForge unix_args
   19-Aug, при этом на 15-Oct stage не задеплоен под DEV-562 (фронт от 20-Aug). Источник: inventory §4.1; memory dev562.
2. **Тест-сервер в KB:** §3 = Paper 1.21.11, ~26 серверов, имя `test_e2e`; §7.0 = NeoForge 1.21.1,
   30 серверов; memory 09-Jul = имя сброшено реинсталлом в авто-имя. Дата реинсталла: KB §10 «06-Jun»,
   memory «07-Jun». Плюс коммит 073fe33 называет `test_e2e` уже другой сервер
   ([srv:0c743c25](../../registry/test-servers.md#0c743c25)).
3. **Audit Log и `power.start`:** TZ-GP-SHARING (AC [x]), QA_COVERAGE §1.9 и TEST_PLAN (09-Jun) пишут,
   что SHR-006 проверяет `server:power.start`. С 27-Jul тест структурный, потому что старт не логируется.
4. **Модалка Restart/Kill:** KB §5a (19-Jun) - модалки нет; memory 24-Sep - «Restart The Server?» есть.
   Вероятное объяснение - настройка аккаунта `user.restart_confirmation` (memory dev472-485) ❓.
5. **Количество тестов UP:** «~58» (memory), «~64» (TEST_PLAN), «25 спеков / ~65» (QA_COVERAGE), по
   факту 31 спек / 81 тест.
6. **Extensions:** TZ-GP-EXTENSIONS и QA_COVERAGE знают только структурные EXT-001/002; не учтены
   mods/plugins (контракт api/v2, install→uninstall под `RUN_PLUGIN_INSTALL=1`) и extension.sources.
   KB §7b-bis описывает каталог до DEV-405 (каталог из БД панели).
7. **Сервер спека источников:** memory 05-Oct = [srv:d2f7fff5](../../registry/test-servers.md#d2f7fff5), последний
   коммит 073fe33 = [srv:0c743c25](../../registry/test-servers.md#0c743c25).
8. **«API v2 требует полный UUID»** (inventory §3.5) - обобщение: `GET /servers/{short}` работает, полный
   нужен только части ручек (см. гочу 1).
9. **Throttling:** memory 15-Jun «костяк не закоммичен» - спек и `utils/throttlingWebhook.ts` в git
   (коммит ebe81f4). Триггер по-прежнему нестабилен.
10. **Databases:** KB §5b «план Double = 0 слотов» и §7d «баг 400 Connection refused» - не ясно, баг или
    просто нет слотов на тарифе ❓. Состояние после июня не проверялось.

## Пробелы

1. **Startup / Docker image в UP:** роут `edit_startup` не найден, `/server/{id}/startup` пустой;
   как клиент меняет образ кроме Config-combobox, не описано.
2. **Вход через WHMCS OAuth и Steam**, восстановление пароля, Edit Account, язык (EN-селект),
   колокольчик уведомлений - не описаны вообще.
3. **Жизненный цикл сервера со стороны UP:** Suspended/Free/terminated (API «does not exist» для
   terminated), Import Server, Reinstall, Terminate (клиентской кнопки нет) - только обрывки.
4. **Не-MC игры:** PZ/ARK/Rust/Terraria/Arma/Bedrock/Hytale - что в UP отличается (табы, порты,
   game settings, `is_ark`/`is_bedrock`), есть только в отчётах DEV-562/DEV-418 и Palworld (stage).
5. **Флаги без назначения:** `affiliate-banner`, `hytale-world`, `inactivity-chat`,
   `extensions-onboarding`, `admin-panel`, плюс что именно гейтит `modpack-catalog-v2`.
6. **Права v2 по ролям:** `edit_startup`, `reinstall`, `change_version` на бэке не верифицированы;
   матрица прав в БД (Co-owner без docker_access/reinstall) не сверена с UI-матрицей KB §5i.
7. **Upgrade/тарифы:** баг `tariffs-new/.../list` 400 (Critical, 09-Oct) - судьба неизвестна; как
   работает Boost-оплата и промокод `UPGRADE50F`, не описано.
8. **Scheduled backups и scheduled tasks:** создание расписания и его удаление не разведаны.
9. **Модпаки:** установка (overwrite / Delete Existing Files), Upload custom modpack, провижининг
   лоадера (аномалия Cobblemon на stage) - только в отчётах, не сведено.
10. **Мобильная вёрстка и i18n UP** - есть точечные наблюдения (360px в DEV-562, RU fallback), сводки нет.
