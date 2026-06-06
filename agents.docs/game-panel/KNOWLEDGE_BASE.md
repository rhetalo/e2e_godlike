# Game Panel — Knowledge Base (ultra.panel.godlike.host)

> Живая база знаний по панели управления игровыми серверами (основная игра — **Minecraft**).
> Источник: live-recon 03-Jun-2026 (сервер `ebb03adc`, Paper 1.21.11) + мигрировано из
> прежнего проекта `e2e_browseruse/QA_test_docs/ultra.panel`. Обновляй по мере находок.

## 1. Что это и где живёт в репо

| | |
|---|---|
| URL | `https://ultra.panel.godlike.host` |
| Тип | Vue SPA, REST + WebSocket-консоль |
| Auth | Email/Password (+ Steam/WHMCS OAuth — out of scope) |
| Page Objects | `pages/game/` (`GamePanelBasePage`, `GamePanelLoginPage`, `GamePanelDashboardPage`, `GamePanelServerPage`) |
| Overlay-компонент | `components/game/ShepherdTour.ts` |
| Auth/сессия | `utils/gameAuth.ts` → `storageState.game.json` |
| Селекторы | `utils/selectors.ts` → `GAME_PANEL_*` |
| Тесты | `tests/game/panel/` (запуск: `npm run test:game`) |

## 2. Среда и безопасность

- **Всё на проде**, staging нет. Тестовый аккаунт `test@testmail.com` — **полная свобода**
  (старт/стоп/ребилд серверов разрешён). Оплата апгрейдов идёт **кредитным балансом** (не деньги).
- Правило: мутирующие тесты **self-cleaning** (создал → проверил → удалил/вернул как было).
- **Серверы НЕ вечные** — покупаются/удаляются под разные игры, внутри разные настройки.
  Поэтому UUID тестового сервера — в env (`GAME_PANEL_SERVER_UUID`), не в коде. Сменился сервер
  → поменял env, тесты не трогаем.

## 3. Тестовые данные

| Что | Значение |
|---|---|
| Основной аккаунт | `test@testmail.com` / `test@testmail.com` (пароль = email) |
| Серверов на аккаунте | ~26 (часть `Suspended`, часть `Free`) |
| Текущий тестовый сервер | `ebb03adc-48bf-46f1-95dd-a45d07f0d23d` (`test_e2e`, переименован 05-Jun) |
| Игра/тип | Minecraft, Paper 1.21.11, план Double, 2 GiB RAM, 5-10 slots |
| Адрес | `srv6.godlike.club:26150`, локация West, America |
| Состояние | Offline (startable, не suspended) |
| 2-й аккаунт (Фаза 4) | `dan.ica.althe.i.aa@gmail.com` / то же; приглашён на сервер выше |

## 4. Карта UI (подтверждено recon)

**Login `/login`:** сначала чузер-кнопка **«Through Login/Password»**, по клику раскрывается
форма: `input[type="email"]` (placeholder «Username or Email»), `input[type="password"]`,
кнопка **«Login»**. Успех → редирект на `/?page=1`.

**Dashboard `/?page=1`:** заголовок **«My Servers (N)»**. Серверы — кликабельные `div`
(`.dashboard__servers .server`, модификатор `.server__suspended`), имя в `span.main1`. Колонки:
Game / Name / Active Server / Players / CPU% / RAM / Storage. Фильтры **Suspended**, **Free**,
тогл list/grid. Глобальный сайдбар: My Servers, Main Site, Referral Program, Billing, Discord,
Support Tickets, Knowledge Base.

**Server `/server/{uuid}`:** две навигации —
- **серверный сайдбар** (разделы-роуты): Overview, Sharing, Port & Domains (`/network`),
  Backups, Tasks, Databases (`/database`);
- **таб-полоса контента**: Overview, Console, Files, Versions (`/minecraft/versions`),
  Plugins/Mods (`/extensions`), Modpacks, Config, Players.

Блоки: power-контролы **Start / Restart / Kill** + **Boost My Server**; Server Information
(Status, Domain/IP, ID, Name, Location, **Edit Server**, **Invite People**); консоль
(Commands input, Full Server Log, Mod Conflict); Server Usage (CPU/RAM/Storage).

**Sharing `/server/{uuid}/sharing`:** Invite User, Pending Invites, **Roles**, **Members**,
Audit Log, кнопка **«Send Invite»**.

## 5. Гочи (важно для стабильности)

1. **Onboarding-оверлей shepherd.js** (`.shepherd-modal-is-visible` / `.shepherd-modal-overlay-container`)
   перехватывает клики. Гасится через `ShepherdTour.dismissIfPresent()` (вызывается в
   `GamePanelBasePage.open()`). Аналог cookie-баннера storefront'а.
2. **`networkidle` не наступает** на странице сервера (websocket-консоль) — навигация ждёт его
   с `.catch()` и затем конкретный элемент (power-кнопка/заголовок).
3. **Карточки серверов — не ссылки**, а `div` с router-переходом по клику.
4. **Поле email — `type="email"`**, но на чузер-экране до раскрытия формы есть лишний `type="text"`
   инпут — целиться строго в `input[type="email"]`.
5. На странице сервера **2 iframe** (промо/чат) — учитывать при будущих iframe-проверках.
6. В панели есть **промо-элементы** («free premium», Boost) — структурные ассерты, не точный текст.
7. Роуты принимают и **полный UUID**, и **короткий id** (`ebb03adc`) — в href'ах встречаются оба.

## 5a. Power-флоу (подтверждено recon 03-Jun-2026)

Тоггл-кнопка меняет текст: **Start** (offline) → **Starting...** → **Shut Down** (online).
Restart/Kill — отдельные кнопки, открывают Vuetify-диалог `.v-card.dialog`.

- **Статус Online = «Running»** (не «Online»); Offline = «Offline». Надёжнее ориентироваться
  на тоггл: `Shut Down` виден ⇒ online, `Start` виден ⇒ offline.
- **EULA (первый старт):** диалог «Accept Minecraft® EULA», кнопка `button.dialog__button-primary`
  («I Accept»). Пишет `eula=true` в `eula.txt` файлового менеджера. `clickStart()` принимает сам.
- **Restart:** диалог «Restart the server?» → `button.dialog__button-primary` («Yes, Restart»).
  Цикл: `Shut Down/Running → Stopping... → Start/Offline (кратко) → Starting... → Shut Down/Running`,
  ~65–70с. Кнопка «прыгает» (мелькает даже «Start»). Надёжная проверка — `waitForRestartCycle()`:
  тоггл `Shut Down` исчезает → снова появляется.
- **Kill:** диалог «Kill the server?» → `button.dialog__button-primary` («Yes, Kill»). Мгновенно → Offline.
- **Shut Down:** тоггл, без модалки.
- **Тайминги:** первый старт (ставит файлы/конфиги) — до нескольких минут; обычный старт ≈ минута;
  стоп ≈ 30с. В тестах: `waitForOnline` 300с, `waitForOffline` 90с, `test.setTimeout` до 360с.
- **Консоль (источник правды по действиям):** лог в `.terminal-container` / `.terminal`; стримит
  boot-лог сервера и строки `[Pterodactyl Daemon]: ...`. Командный инпут — `consoleCommandInput`.
- Транзиентные кнопки — с многоточием: **«Starting...»**, **«Stopping...»** (искать regex, не exact).

## 5b. File manager (подтверждено DOM 03-Jun-2026)

`/server/{uuid}/files`. Список — **v-data-table** (`tr.v-data-table__tr`), имя в
`span.server__file-manager__file-list__file-name`. Хлебные крошки `.v-breadcrumbs` (root).

- **Создание:** кнопки `New folder` / `New file` → диалог (`h4.server__file-manager__dialog-title`
  «Create folder»/«Create file») → имя в `input.v-field__input` → `button.server__file-manager__modal-button--primary` («Save»).
  Для текстового файла есть CodeMirror-редактор (`.cm-content`, contenteditable).
- **Удаление (2 пути):** (а) **чекбокс строки → нижний `Delete`** в
  `.server__file-manager__action-btn-group` → confirm-диалог «Are you sure you want to delete this
  file(s)?» (кнопки Cancel / Delete; файл уходит в **Recycle Bin на 24ч**); (б) per-row меню «...»
  (`i.mdi-dots-horizontal`) → `.server__file-manager__file-list-item__actions-list` → пункт Delete.
  В тестах используем путь (а) — однозначнее (у каждой строки своё «...»-меню, `.first()` ловит скрытое).
- Прочие действия над выделением: Download / Move / Duplicate / **Zip**(/Unzip) / Recycle Bin
  (Restore, Delete permanently, Clear Recycle Bin).
- Page object: `GamePanelFilesPage` (`createFolder`, `deleteEntry`, `deleteEntryIfPresent`, `hasEntry`).
- ⚠️ **Databases — создание не работает** (см. TEST_PLAN: 400 / Connection refused; план Double = 0 слотов).

## 5c. Config tab — server.properties (подтверждено DOM 04-Jun-2026)

`/server/{uuid}/config`. Это **редактор `server.properties`** в виде Vuetify-формы.
Сервер Online **не требуется** (форма доступна в любом статусе).

- **Каждое свойство — строка `.server__config-switch`**: текст строки начинается с имени
  свойства (`motd`, `difficulty`, `max-players`, `level-name`, `server-port`, `pvp`, …) +
  краткое описание; внутри — контрол (`input.v-field__input`, `select`, или switch-чекбокс).
- ⚠️ **Save-кнопки НЕТ** — форма **автосейвит** при изменении поля (PATCH на blur). Есть
  только кнопки **Reset**. Персист проверяется **перезагрузкой** страницы + чтением значения.
- ⚠️ **id инпутов динамические** (`input-v-131`, `switch-v-109`) — между перезагрузками
  меняются, как селекторы **непригодны**. Якорь — имя свойства в тексте строки.
- ⚠️ **`networkidle` не наступает** и здесь (websocket жив) — ждать ограниченно + `.catch`
  (см. `GamePanelConfigPage.setValue`, таймаут 8с).
- Доступные ключи (recon): gamemode/difficulty (select), level-name/level-seed, max-players,
  online-mode, white-list, spawn-protection, allow-flight, pvp, hardcore, motd, view/simulation-
  distance, server-port (26150), server-ip, enable-rcon/query, op-permission-level, и блок
  Docker/Java (version `1.21.11`, `server.jar`, JVM-флаги Aikar — последние два **Readonly**).
- Page object: `GamePanelConfigPage` (`row`, `input`, `getValue`, `setValue`, `hasField`).
- В тестах безопасно меняем только `motd` (косметическая строка) с обязательным откатом.

## 5d. Players tab (подтверждено DOM 05-Jun-2026)

`/server/{uuid}/players`. Рендерит блок `.server__players` с карточками
(`.server__players-card__title`, напр. **«Server Administrators»**) — сам таб виден и offline.

- ⚠️ **Управление игроками требует Online-сервера** (offline есть hint «нужен запуск»,
  action-кнопок нет). В тестах делаем через **консоль** (источник правды), а не UI.
- Консольные команды whitelist (подтверждённые ответы):
  - `whitelist add <Name>` → `Added <Name> to the whitelist`
  - `whitelist list` → `There are N whitelisted player(s): <Name>, …`
  - `whitelist remove <Name>` → `Removed <Name> from the whitelist`
  - `<Name>` должен резолвиться (online-mode) — берём реальный аккаунт (`Notch`); всегда `remove` в откат.
- ⚠️ **Сервер `ebb03adc` СИЛЬНО модовый** (terralith / pixelmon / neoforge / tectonic …) →
  боот до маркера «Done» долгий и плавающий. Для онлайн-тестов: `ensureOnline` 300с +
  `waitForConsoleReady` **360с**, `test.setTimeout` ~480с. Иначе флоки-таймаут в `beforeAll`.
- Page object: `GamePanelPlayersPage` (`area`, `cardTitle`, `hasCard`).

## 5e. Sharing section (подтверждено DOM 05-Jun-2026)

`/server/{uuid}/sharing` (сайдбар-раздел Sharing). Работает и offline. Карточки:
**Invite User** (форма + Send Invite), **Pending Invites**, **Roles** (Owner/Co-owner/
Moderator/Member + счётчики), **Members**, **Audit Log**.

- BEM-классы: `.sharing__card` / `.sharing__card-header-title`, `.sharing__invite-form`
  (`input[type="email"]` placeholder «Email» + role-select), `.sharing__invite-form-submit`
  («Send Invite», **disabled** пока не заполнены email+role), `.sharing__invite-list` / `__invite-row`.
- На 05-Jun **2-й аккаунт `GAME_INVITEE_EMAIL` (dan.ica…@gmail.com) уже Co-owner** в Members
  (есть и pending-инвайт на другой адрес).
- ⚠️ В тестах **НЕ жмём Send Invite** (шлёт реальный email). Покрываем структуру + что
  приглашённый виден в Members (доступ предоставлен). Мутацию invite — только с владельцем.
- На Sharing может всплыть отдельный шаг shepherd-тура (`goto` гасит его ещё раз).
- Page object: `GamePanelSharingPage` (`inviteForm`, `inviteEmail`, `sendInviteButton`, `card`, `hasUser`).
- **Мульти-актёр работает:** `loginInviteeAndSaveSession` (gameAuth) логинит 2-й аккаунт
  (login==password==email, подтверждено владельцем), сессия в `storageState.game.invitee.json`.
  Invitee (Co-owner) видит `test_e2e` в своём дашборде и открывает `/server/{uuid}` — покрыто
  TC-GP-SHR-003/004.
- **Смена роли участника** (мутация, покрыто SHR-005): у не-owner участника в Members есть
  Vuetify v-select `.sharing__members-column-role-select` (Co-owner/Moderator/Member). Клик →
  опция (`[role="option"]`) → **автосейв**. ⚠️ in-place `.v-select__selection-text` обновляется
  НЕ сразу → роль проверять **через reload**. Кнопка-корзина `.sharing__members-column-action-btn`
  УДАЛЯЕТ участника — НЕ трогаем (remove необратим без повторного инвайта/email). Хелперы:
  `GamePanelSharingPage.setMemberRole`/`getMemberRole`; self-cleaning (возврат в Co-owner).

## 5f. Port & Domains (подтверждено DOM 05-Jun-2026)

`/server/{uuid}/network` (сайдбар-раздел «Port & Domains»). Работает и offline. Два блока:
- **Subdomain** (`.server__subdomain-block`): домен-селект (`.domainselect-field`) + кнопки
  «Update Subdomain» / «Copy subdomain».
- **Network Ports** (`.server__network-ports`): карточки портов (`.server__network-ports__port`,
  `__port-port` — номер) + кнопка «Add Additional Port».
- ⚠️ В тестах **НЕ мутируем** (Update Subdomain / Add Port меняют сетевые настройки) —
  только структурные проверки. Page object: `GamePanelNetworkPage`.

## 5g. Tasks (подтверждено DOM 05-Jun-2026)

`/server/{uuid}/tasks` (сайдбар-раздел «Tasks»). Работает и offline. Два блока:
- **All Tasks** (`.server__tasks__panel`): табы «Your Tasks»/«Default Tasks»; дефолтные задачи-шаблоны
  (`.server__tasks__task` / `__task-title`): **«Send command»**, **«Send power action»** — у каждой
  кнопки **Configure** / **Run**.
- **Scheduled Tasks**: список запланированных (по умолчанию пусто — «You have no scheduled tasks yet»).
- ⚠️ В тестах **НЕ жмём Run/Configure** (Run выполняет задачу = мутация, напр. power-action) —
  только структурные проверки. Page object: `GamePanelTasksPage`.

## 5h. Backups (подтверждено DOM 05-Jun-2026)

`/server/{uuid}/backups` (сайдбар-раздел «Backups»). **Работает и offline** (запуск сервера НЕ требуется).
Две зоны: **форма создания** (`.backups`) + **список** (`.backups-list`) + секция **Scheduled** (`.scheduled-backups`).

- **Создание — INLINE-форма, НЕ модалка.** Шаги для серверного бэкапа:
  1. таб типа `.backups__tab` (**Server** / Database / Folder; Server выбран по умолчанию);
  2. выбрать **сервер** в v-select: клик по `.backups__form-select .v-field` (первый) → опция
     `.v-overlay--active .v-list-item` с именем сервера (**«test_e2e»**);
  3. ввести **имя** в `input[placeholder="Enter backup name"]` (макс **38** символов, счётчик `0/38`);
  4. кнопка **«Create Backup»** (`button.gradient-button`) — **disabled, пока не заданы сервер+имя**
     (только имени НЕ хватает — нужен и сервер). После — click авто-дожидается enabled.
  - Доп. контролы формы: свитч **Locked** (`.backups__switch`, выкл по умолч. → бэкап удаляем; вкл —
    «нельзя удалить, пока не разлочишь»), чекбокс **Schedule Backup** (выкл → разовый). В тестах не трогаем.
- ⚠️ **Create — async-джоба + статус НЕ обновляется реактивно.** Свежая строка появляется в списке
  быстро (реактивно), но **чип STATUS не переходит в `COMPLETED` без перезагрузки страницы** (подтверждено
  владельцем 05-Jun + наблюдением: бэкап реально готов, а в списке висит промежуточный статус). Аналог
  гоч Config/Sharing — «проверять через reload». Поэтому готовность ждать **поллингом с reload**
  (`expect.poll` → `backups.refresh()` (=`goto()`) + `backups.isCompleted()`), НЕ реактивным
  `expect(...).toBeVisible()`. Сам бэкап (на `ebb03adc` ~292 MB вышло) готовится за пару-тройку минут;
  в тесте держим запас: `poll` timeout ~9 мин, `test.setTimeout` ~600с.
- **Список** `.backups-list__table`: строки `.backups-list__row`; колонки NAME/DATE/SIZE/**STATUS**/TYPE/ACTIONS
  (`.backups-list__name-cell`, `__status-cell`, …). **Статус-чип** `.backups-list__status`; готовый —
  модификатор **`.backups-list__status--completed`** (текст «COMPLETED»). Якорь «бэкап готов» — этот класс.
- **Квота:** `.backups-list__subtitle` → «**N/3 slots used**», футер `.backups-list__footer` → «Showing N
  backups. M remaining.» На тест-сервере **3 слота** (на 05-Jun занят 1 — реальный бэкап «111», 721 MB).
- **Действия строки:** `.backups-list__download-btn` (Download) + меню **«...»** `.backups-list__more-btn` →
  `.backups-list__action-menu` с пунктами `.backups-list__menu-item`: **Restore / Rename / Lock / Delete**.
  ⚠️ Delete фильтровать СТРОГО по тексту (`/^Delete$/i`) — рядом **Restore** (деструктивный, перезапишет
  сервер — НЕ трогаем).
- **Удаление (МУТАЦИЯ):** пункт «Delete» → confirm-диалог **`.delete-dialog`** («Delete Backup … This action
  is permanent and cannot be undone») → danger-кнопка **`.delete-dialog__confirm`** (Cancel — `.delete-dialog__cancel`).
- ⚠️ **Удаление IN-PROGRESS бэкапа ненадёжно** — сначала дождись COMPLETED, потом удаляй (иначе teardown
  может оставить мусор и съесть слот). Тест **обязан** быть self-cleaning (precondition + afterAll чистят своё имя).
- Page object: `GamePanelBackupsPage` (`createBackup`, `backupRow`, `completedStatusOf`, `deleteBackup`,
  `deleteIfPresent`, `quota`, `scheduledSection`). Создаём/удаляем ТОЛЬКО свой бэкап; чужой «111» не трогаем.

## 5i. Role enforcement (подтверждено DOM 06-Jun-2026)

Роли участника: **Owner / Co-owner / Moderator / Member**. Owner раздаёт роли; смена роли участника — §5e
(SHR-005, `setMemberRole`/`getMemberRole`). Enforcement реализован **через присутствие/отсутствие контролов
в DOM** (Vue убирает их по роли), НЕ через `disabled`.

Матрица прав глазами invitee (подтверждено флипом роли Co-owner ↔ Member):

| Контрол | Co-owner | Member |
|---|---|---|
| Start | ✅ | ✅ |
| **Restart / Kill** | ✅ видны | ❌ скрыты |
| **Поле консоли** (`consoleCommandInput`) | ✅ | ❌ скрыто |
| Edit Server | ✅ | ✅ |
| Config (motd) editable | ✅ | ✅ |
| Backups: create-форма (имя + Create) | ✅ | ✅ |
| **Backups: список существующих + меню «...»** | ✅ (строки + управление) | ❌ список пуст, меню «...» нет |
| **Sharing: управление участниками** (role-select, trash) | ❌ (только Owner) | ❌ |

- ⚠️ **Owner-only:** управление ролями/удаление участников (role-select `.sharing__members-column-role-select`,
  trash `.sharing__members-column-action-btn`) — даже Co-owner их не видит.
- ⚠️ Member **не видит сами строки бэкапов** (список пуст) — проверять отсутствие управления через
  `backups.anyManageMenuButton` (`.backups-list__more-btn`) `toBeHidden`, не через число строк.
- Смена роли (owner-side) → персист подтверждать reload + poll (in-place текст лагает, §5e). Invitee видит
  новую роль после reload своей страницы (`srv.goto()`/`backups.goto()`). **Мутацию роли всегда откатывать в Co-owner.**
- Тест: `role.enforcement.spec.ts` (ROLE-001 power/console, ROLE-002 backups-management; serial, 2 контекста, self-cleaning).
- Moderator (промежуточная роль) — пока НЕ снимали (todo).

## 6. Статус миграции из browseruse

- Канонический набор доки (`QA_test_docs/ultra.panel/00..10`) — основа; уникальные детали фич
  (SFTP, recycle bin, bulk-операции с файлами) из `Ultra_Panel_Description` дополняют функционал.
- Прежние page objects browseruse (плоские, текстовые локаторы) **не переносятся** — заменены
  на `pages/game/*` с локаторами из `selectors.ts`. Прежний проект можно удалять после переноса доки.
