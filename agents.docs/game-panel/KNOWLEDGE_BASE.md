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

Матрица прав глазами invitee (подтверждено флипами роли Co-owner ↔ Moderator ↔ Member):

| Контрол | Co-owner | Moderator | Member |
|---|---|---|---|
| Start | ✅ | ✅ | ✅ |
| **Restart / Kill** | ✅ | ❌ | ❌ |
| **Поле консоли** (`consoleCommandInput`) | ✅ | ✅ | ❌ |
| Edit Server | ✅ | ✅ | ✅ |
| Config (motd) editable | ✅ | ✅ | ✅ |
| Backups: create-форма (имя + Create) | ✅ | ✅ | ✅ |
| **Backups: список + меню «...» (управление)** | ✅ | ✅ | ❌ список пуст, меню нет |
| **Sharing: управление участниками** (role-select, trash) | ❌ (только Owner) | ❌ | ❌ |

- **Moderator — посередине:** без Restart/Kill (как Member), но с консолью и управлением бэкапами (как Co-owner).
  Чёткие границы: **Restart/Kill** — только Co-owner(+Owner); **консоль + управление бэкапами** — Co-owner и Moderator, НЕ Member.
- ⚠️ **Owner-only:** управление ролями/удаление участников (role-select `.sharing__members-column-role-select`,
  trash `.sharing__members-column-action-btn`) — ни Co-owner, ни Moderator их не видят.
- ⚠️ Member **не видит сами строки бэкапов** (список пуст) — проверять отсутствие управления через
  `backups.anyManageMenuButton` (`.backups-list__more-btn`) `toBeHidden`, не через число строк.
- Смена роли (owner-side) → персист подтверждать reload + poll (in-place текст лагает, §5e). Invitee видит
  новую роль после reload своей страницы (`srv.goto()`/`backups.goto()`). **Мутацию роли всегда откатывать в Co-owner.**
- Тест: `role.enforcement.spec.ts` (ROLE-001 Member power/console, ROLE-002 Member backups-management,
  ROLE-003 Moderator-посередине; serial, 2 контекста, self-cleaning).

## 5j. Security / негатив (подтверждено DOM 06-Jun-2026)

Тест: `security.spec.ts` (Phase 5). Сервер Online не нужен.

- **IDOR / broken access control (`/server/{uuid}`):** по UUID, который аккаунту не принадлежит
  (несуществующий ИЛИ подменённый префикс реального), панель НЕ даёт доступа — рендерит
  **«The requested resource does not exist on this server.»** и **не показывает power-контролы**.
  ⚠️ Ответ ОДИНАКОВ для несуществующего и чужого UUID (нет enumeration-утечки forbidden/not-found — это хорошо).
  - Надёжные сигналы: `GamePanelServerPage.hasPowerControls()` (доступ) и `notFoundError`
    (`getByText(/requested resource does not exist/i)` — отказ). НЕ полагаться на слово «error» в body
    (есть в промо/скриптах страницы → ложные срабатывания).
- **Stored XSS в имени бэкапа / имени папки:** поля `Enter backup name` (≤38) и `Folder name` принимают
  `<` и payload как есть (НЕ стрипают). Создание с именем `<img src=x onerror=alert(N)>` → имя **экранируется**
  (рендерится как текст; строка/запись находится по литеральному тексту payload) и **alert НЕ срабатывает**
  → stored-XSS НЕТ ни там, ни там. Проверка: слушатель `page.on("dialog")` (любой нативный диалог =
  сработавший XSS) + `backupRow(payload)`/`fileEntry(payload)` виден. Self-cleaning: бэкап (дождаться COMPLETED)
  и папка удаляются. Имя папки в файл-менеджере — реальный HTML-sink в ячейке списка, но БЫСТРО (без async-джобы).
- ⚠️ IDOR-тест делит общий `page`; после навигаций на чужие сервера **вернуть на нужную страницу**
  (`backups.goto()`/`files.goto()`) перед действиями — `createBackup`/`createFolder` сами goto НЕ делают.

## 6. Статус миграции из browseruse

- Канонический набор доки (`QA_test_docs/ultra.panel/00..10`) — основа; уникальные детали фич
  (SFTP, recycle bin, bulk-операции с файлами) из `Ultra_Panel_Description` дополняют функционал.
- Прежние page objects browseruse (плоские, текстовые локаторы) **не переносятся** — заменены
  на `pages/game/*` с локаторами из `selectors.ts`. Прежний проект можно удалять после переноса доки.

## 7. Live-recon 06-Jun-2026 (Playwright MCP) — новые экраны, дрейф, API

> Прогон через Playwright MCP по всем экранам сервера + глобальному сайдбару. Read-only +
> одна self-cleaning проба (папка create→delete). Новые экраны раньше были только «видны»
> (smoke TC-GP-SRV-002), теперь сняты структурно. Кандидатные тесты — в `TEST_PLAN.md`.

### 7.0 Дрейф vs то, что записано выше
- **Дашборд:** заголовок теперь **«My Servers (30)»** (в §3 было ~26). Бейджи карточек:
  `Suspended` и **`Free`** (новый). Карточки серверов — по-прежнему `div` с router-переходом.
- **Тест-сервер `test_e2e`/`ebb03adc`** теперь раннит **`neoforge 1.21.1` (build 21.1.200)**, не
  «paper 1.21.11» (§3 устарел). Адрес/план прежние: `srv6.godlike.club:26150`, Double, 5-10
  slots, 2 GiB, storage ~321 MiB, статус Offline. ⚠️ В диалоге **Edit Server** «Server Type» =
  `PC-Paper` (внутренний лейбл расходится с фактическим neoforge — не пугаться).
- **Shepherd-тур = 6 шагов** и всплывает на КАЖДОЙ навигации (Step 1 «Your server» на дашборде,
  Step 2 «Main Menu» на сервере, …). Кнопка гашения — **«Skip for now»**.
- **Чузер логина** — текст «Through login/password» (нижний регистр); рядом OAuth-ссылка
  **«Authorization»** → `panel.godlike.host/api/v2/whmcs/login` (вне scope). `gameAuth` уже
  целится через case-insensitive `:has-text`.

### 7a. Versions `/server/{uuid}/minecraft/versions` (НЕ покрыто)
- Шапка: «Currently running NeoForge» + «Installed Minecraft Version: 1.21.1» + «Installed Build:
  21.1.200».
- Сетка кликабельных карточек server-software (h4): **Vanilla, Paper, Pufferfish, Spigot, Folia,
  Purpur, Waterfall, Velocity, Fabric, BungeeCord, Quilt, Forge, NeoForge, Mohist, Arclight,
  Sponge, Leaves, Canvas** — у каждой «N Minecraft versions / N Builds».
- Клик по семейству → URL `?type=NEOFORGE` → drill-down: **Go Back**, тогл **Show Snapshot
  Versions**, список версий-карточек («1.21.1 RELEASE / 230 Build(s)» …). Дальше: версия → билд →
  **install**. ⚠️ Смена версии = **деструктивный rebuild** сервера → тест только структурный
  (не жать install).

### 7b. Plugins/Mods `/extensions` + Modpacks `/modpacks` (НЕ покрыто) — ОДИН компонент
- Оба экрана — один Vuetify-компонент **`server__extensions__*`** (даже `document.title` =
  «Extensions»); отличаются контентом. Заголовок `h1.server__extensions__header-title`
  («Mods» / «Modpacks»).
- Контролы: фильтр-кнопки **Mods / Plugins / All / Installed**
  (`server__extensions__extension-type__button`), поиск
  (`server__extensions__extension-search__input`), **Category** + **Author**
  (`server__extensions__filter-item`), **sort-by** (`server__extensions__sort-by`), тело
  (`server__extensions__body`) + футер с пагинацией (`server__extensions__footer`). Кнопки
  **Help / Tutorial**. У каждого элемента каталога — кнопка **Install** (`v-btn--slim`).
- ⚠️ Install = мутация (добавляет мод/плагин; обратимо через uninstall, но тяжело). Тест —
  структурный; install/uninstall — отдельный self-cleaning кейс с осторожностью.

### 7c. Boost / Upgrade `/server/{uuid}/upgrade?promocode=UPGRADE50F` (НЕ покрыто) — ПЛАТЁЖНЫЙ ФЛОУ
- Кнопка **«Boost my server»** (overview, `current__tariff-button`) ведёт сюда с промокодом.
- Контент: карточка текущего плана **`current-plan-card__*`** + карточки планов на выбор
  **`simple-plan-card__*`** (есть `simple-plan-card__select-btn-disabled`), категории **Budget /
  Premium**, кнопки **See all plans**, **See Premium benefits**, блок-квиз `quiz-suggestion__*`
  («Not sure what you need? → Go to quiz»). Корень `server__upgrade`, кнопка назад
  `server__upgrade__btn-back`.
- **Реальные цены** (напр. `€ 6.29 / 1 Month`). Выбор плана → checkout/оплата. ⚠️ КАК
  storefront-воронка: тест **только структурный**, НИКОГДА не выбирать план/не доходить до оплаты.

### 7d. Databases `/database` — баг создания подтверждён 06-Jun (запаркован)
- Структура: `h3` «Databases», `h4` «**0 databases remaining**», кнопка **Create Database**,
  таблица колонок **NAME / ENDPOINT / USERNAME / PASSWORD / TYPE / ADMIN LINK** + action-кол,
  пустое состояние «No databases found / No available databases for this server», футер «Showing 0
  database».
- **Create-диалог:** заголовок «Create Database», одно поле **Tag** (`Enter an optional database
  tag`, опциональное) + кнопки **Close** / **Create Database**.
- ⚠️ Жмём Create → `POST …/databases/` → диалог **остаётся открыт**, «0 databases remaining» не
  меняется, таблица пуста → **база не создаётся** (баг воспроизведён; точный 400 SQLSTATE
  «Connection refused (CREATE DATABASE)» — см. `TEST_PLAN.md`). Тесты Databases остаются
  запаркованы. Кандидат в баг-репорт.

### 7e. Tasks → Configure-диалог (дополнение к §5g)
- У дефолтной задачи кнопка **Configure** открывает диалог **`server__dialogs__action-dialog`**
  («Configure your task», подпись «Fill in the required fields to save this task.»):
  - «Send command»: поле **Task name** (`Enter a name...`) + **Payload** (textarea `Command`);
  - «Send power action»: **Task name** + **Power action** (select);
  - кнопки **Cancel** / **Save**; закрытие — `server__dialogs__action-dialog__btn-close`.
- ⚠️ **Save** создаёт запись в «Your Tasks» (мутация) → возможен self-cleaning кейс (создать →
  проверить во вкладке «Your Tasks» → удалить). Run по-прежнему не жать.

### 7f. Edit Server-диалог `edit__server-block__dialog` (overview, НЕ покрыто)
- Открывается кнопкой **Edit server** (overview). Блок **General information**: **Server Name**
  (input, тек. `test_e2e`), **Game/Platform** (select + «Minecraft»), **Server Type** (select +
  «PC-Paper»). Блок **SERVER ACTIONS**: **Import Server**, **Reinstall Server**, кнопки **Cancel**
  / **Save Changes**. BEM: `edit__server-block`, `dialog__title/text/block-title/button/actions`,
  `app-text-field__label`, `app-select-field__label`.
- ⚠️ **Reinstall Server = деструктив** (переустановка/затирание) — НИКОГДА не жать. Хороший
  self-cleaning кейс — **rename**: сменить Server Name → Save → проверить (заголовок/дашборд) →
  **вернуть `test_e2e`**.

### 7g. Referral `/referral` (глобальный сайдбар, НЕ покрыто)
- Глобальная страница (`default_layout__wrapper`). Секции: **Referral Program** (`referral-page__*`),
  **Share with Friends** (`share-card__*` + read-only реф-ссылка `link-card__input` вида
  `affiliate.godlike.host/ref/<code>`, кнопка **Copy Link**), баланс/выплата
  (`balance-card__*` + кнопка **Request Withdrawal**), соц-кнопки (`social-share__*`),
  «How It Works?» (3 шага), «Referrals Analytics».
- ⚠️ **Request Withdrawal** = вывод средств — не жать. Покрываемо структурным смоуком (low prio).
- Прочий сайдбар — **внешние** ссылки на `godlike.host` (Billing → `/clientarea`, Support Tickets,
  Knowledge Base, Main Site) → вне scope панели.

### 7h. Overview — доп. селекторы (дополнение к §4)
- Промо **«Free Premium»** с обратным отсчётом — блок `premium__block*` (структурный ассерт, не текст).
- Power-тогл — `shut_down__button` / `__button-outline` / `__button-outline__text` (online ⇒ виден
  Shut Down). Бейдж версии + «Refresh version» — `minecraft-version-badge__refresh-btn`.
- Таб-чипы контента (Overview…Players) — `server-chips-navigation__chip`. Карточка плана —
  `current__tariff*`. Заголовок-имя — `server__overview-title`.
- Карточка «Java & Minecraft Version Notice» со ссылками «To minecraft versions» / «To Java
  versions» (= `/config`).

### 7i. Сетевой слой / API (для понимания async-флоу)
- База: **`panel.godlike.host/api/v2/servers/{uuid}/…`**, заголовок `Authorization: Bearer ptlc_*`
  (Pterodactyl client token). ⚠️ Токен в доки/логи/коммиты НЕ копировать.
- Файлы: список `GET …/files?dir=/`; создание папки `POST …/files/folder` (→200); удаление
  `POST …/files/trash` (→200) — **удаление = перемещение в Recycle Bin** (подтверждает §5b «24ч»,
  не permanent). После мутации фронт **перезапрашивает** список (объясняет реактивное появление
  строки и при этом — нереактивность статусов у бэкапов: там джоба асинхронна).
- Базы: `GET …/databases`; create `POST …/databases/` (падает, см. 7d).
- Консольные ошибки страниц — почти всё **сторонний шум** (ipapi.co CORS, redtrack 409, GTM,
  chat-виджет 429, FB-pixel ORB-blocked). Единственная first-party — `400` на
  `…/api/v2/auth/current?locale=en` (похоже на пре-авторизационный probe; логин при этом успешен).
- `networkidle` на страницах сервера не наступает (websocket-консоль + чат-виджет) — подтверждено.

## 8. Round-2 sub-flows (MCP, 06-Jun-2026) — непокрытые суб-флоу внутри вкладок

> Раскрытие вложенных меню/диалогов (open → capture → cancel). Всё offline-safe. Мутации — где
> помечено; в тестах — self-cleaning, опасные пункты не жать.

### 8a. Console — палитра «Commands» (`/console`, НЕ покрыто)
Полная страница консоли — `server__console-full*`; командный инпут `server__console-full-actions__field`
(placeholder «Enter a command»), кнопки **Help** и **Commands** (`server__console-full-actions__button--long`).
- **Commands** открывает диалог-палитру: поиск **«Search command...»**, сортировка **A-Z**, список
  команд `command-item__title` + `command-item__subtitle` (ban/deop/difficulty/gamemode/gamerule/help/
  kick/list/op/pardon/save-all/save-off/save-on/say/seed/setworldspawn/spawnpoint/stop/tell/tellraw/
  time/version/weather/whitelist add …). Клик по пункту — вставка шаблона команды в инпут.
- Тест-кандидат: открыть палитру → отфильтровать → выбрать → **проверить, что инпут заполнился**
  (offline-safe, команду НЕ отправлять).

### 8b. File manager — per-row «...» меню + диалоги (дополнение к §5b)
- **Полное «...» меню файла** (`i.mdi-dots-horizontal`): **Open, Download, Pin, Copy name, Copy path,
  Copy link, Duplicate, Rename, Move, Archive, Delete** (шире, чем фигурировало в §5b). Не-мутирующие:
  Open / Copy name|path|link / Pin (тогл). Мутации: Duplicate / Rename / Move / Archive / Delete.
- **SFTP Connect** (кнопка `SFTP Connect`): диалог **«Connect with SFTP»** — поля **Host / Port /
  Username / Password**, кнопки **Open SFTP**, **Generate** (пароль), **Save**. BEM
  `server__file-manager__sftp-dialog__title|info`, `server__file-manager__sftp-form`, `__btn-copy`.
  ⚠️ Generate/Save меняют SFTP-пароль → тест только структурный.
- **CurseForge** (кнопка `Upload custom modpack`): диалог `curseforge-dialog__*` — `input[type=file]`,
  кнопки **Browse file / Cancel / Proceed**. Загрузка кастомного модпака из zip. ⚠️ Не загружать → структурный.
- Прочее на странице: **Recycle Bin** (строка-кнопка), **Search** (`textbox`), **Download SFTP Client**,
  bulk-бар (Download/Move/Duplicate/Delete/Zip/Unzip). Файловый редактор (CodeMirror `.cm-content`) —
  открывается по Open текстового файла (§5b).

### 8c. Header / глобальное (НЕ покрыто)
- Кнопка-аккаунт **«test@testmail.com»** → меню: **Knowledgebase**, **Edit Account** (внешний WHMCS?),
  **Log Out**. Тест-кандидат: **Logout** → редирект на `/login` (smoke). Рядом — селект языка (**EN**,
  combobox) и колокольчик уведомлений с `v-badge__badge` (счётчик «0»).
- ⚠️ Log Out убивает сессию текущего `storageState` — в авто-тестах изолировать (отдельный контекст),
  иначе уронит соседние тесты.

### 8d. Backups — форма создания богаче §5h (НЕ покрыто полностью)
Кроме задокументированного (табы **Server/Database/Folder**, Server-select, Name 0/38, Create Backup,
Locked, Schedule):
- **Ignored Files & Directories** (`backups__ignored-files-btn`) — настройка исключений (новое).
- **Schedule Backup** (`backups__checkbox`) → раскрывает **Set interval** (`backups__form-*`) =
  **запланированные бэкапы** (целый непокрытый флоу; раздел «Scheduled» по умолчанию пуст).
- **Locked** — `backups__locked-toggle` / `backups__locked-title` / `__locked-description`.
- Тест-кандидаты: (1) структурный — все контролы формы; (2) scheduled-backup create→verify→delete
  (мутация, self-cleaning, осторожно с квотой 3 слота и чужим бэкапом «111»).

## 9. Round-3 sub-flows (MCP, 06-Jun-2026)

### 9a. Network — Add Additional Port диалог (`/network`)
Страница: **Update Subdomain** (Copy subdomain / Update Subdomain) + **Server Ports** (главный `26150`,
Copy Port & IP) + **Additional Ports** (Add Additional Port). BEM `server__subdomain-block`,
`server__network-ports__port*`.
- **Add Additional Port** → диалог `dialog__*`: поле **Name** («Enter a descriptive name...») + кнопки
  **Cancel / Add Port**. ⚠️ Add Port = мутация (новый порт) → тест структурный (открыть+проверить+cancel).

### 9b. Sharing — Audit Log + опции роли (дополнение к §5e)
- **Invite role-select** (`.sharing__invite-form-select`) опции: **Co-owner / Moderator / Member**
  (Owner через инвайт НЕ выдаётся — соответствует модели §5i).
- **Audit Log** реально пишет действия: строка = actor (`test@testmail.com`) + время + **ключ-действие**
  (подтверждено: `server:power.start` от старта, что я делал ранее). Тест-кандидат: совершить
  разрешённое действие → проверить новую запись в Audit Log по ключу (`server:power.*` и т.п.).
- Карты раскрываются кнопкой `sharing__card-show-btn` («Show more»). Счётчики ролей в
  `sharing__overview-block` (Owner/Co-owner/Moderator/Member + числа).

### 9c. File manager — CodeMirror-редактор + Recycle Bin
- **Открытие текстового файла** (клик по имени или «...»→Open) → URL `?dir=/&file=<name>`, монтируется
  **CodeMirror** (`.cm-editor` / `.cm-content` / `.cm-gutters`), контент редактируемый (напр. `eula=true`),
  кнопки **Cancel / Save**. ⚠️ Редактор монтируется **асинхронно** — ждать `.cm-content`, не сразу.
  ✅ **Покрыто FILE-005** (`files.structure.spec.ts`, read-only): `GamePanelFilesPage.openFileInEditor`
  («...»→Open) → `editorContent`/`getEditorText` → `leaveEditor` (без Save). Открываем `server.properties`
  (ядровый, гарантированно есть). Правку→Save→revert оставили на отдельный self-cleaning кейс.
- **Recycle Bin** (кнопка-строка `.server__file-manager__file-list__recycle-bin` наверху списка) → URL
  `?dir=/.trash-<shortid>`, breadcrumb «root/Recycle Bin». ⚠️ **Уточнено live-recon 09-Jun:** **Restore** —
  это **ОТДЕЛЬНАЯ кнопка** (`button.v-btn--slim`, текст «Restore»), **НЕ внутри** `action-btn-group`
  (там только Download/Move/Duplicate/Delete=permanent); рядом — **Clear Recycle Bin** (`v-btn--slim`,
  disabled при пустой корзине). Обе disabled до выбора строки чекбоксом. Подтверждает §5b: удаление → trash → 24ч.
  ✅ **Покрыто FILE-006** (`files.recycle.spec.ts`, мутация, self-cleaning): `GamePanelFilesPage.openRecycleBin`
  + `restoreEntry` (чекбокс строки → standalone-кнопка Restore, селектор `GAME_PANEL_FILES.recycleRestoreButton`).
  ⚠️ Тест-папки копятся дублями в корзине между прогонами (teardown чистит только корень) — авто-очистка 24ч.

### 9d. Free Premium модалка (`premium__dialog`)
Кнопка **«What is a Free Premium?»** (на каждой странице сервера) → модалка `premium__dialog*` со списком
премиум-фич (Personal Support, Top Node Hosting, Pre-made Server Setups, Extended Deletion Time, Unlimited
SSD/CPU, Server Setup by Support, Dedicated SysAdmin) + CTA **«Get Premium (3-Days Trial)»**.
⚠️ CTA = конверсия/триал (ведёт к апгрейду) — НЕ жать; тест структурный.

### 9e. Versions — drill-down (дополнение к §7a)
Список версий семейства (`?type=NEOFORGE`) содержит тогл **«Show Snapshot Versions»** (показать snapshot-
сборки) и **«Go Back»**. Клик по версии → уровень билдов → выбор → install. ⚠️ Клик по версии капризен
к селектору (карточка — `div`-контейнер, не текст); install = деструктивный rebuild — в тестах не доходить.

## 10. Online-проверка post-reinstall (MCP, 06-Jun-2026)

Владелец **переустановил** `test_e2e` (старый крашился из-за несовместимой конфигурации). После реинсталла —
свежий и стабильный: статус **online** (тогл «Shut Down»), **20 слотов** (`0/20`), RAM ~834 MiB/2 GiB,
storage ~247 MiB, neoforge 1.21.1. Онлайн-флоу, ранее заблокированные крашем, теперь работают:

- **Живая консоль (`/console`):** стримит boot-лог до next-steps-баннера. **Command roundtrip подтверждён:**
  ввод `list` в `input[placeholder="Enter a command"]` (+ Enter) → в `.terminal` появляется
  **«There are 0 of a max of 20 players online:»**. То есть CON-001/002/003 снова реальны.
- **Players-онлайн (`/players`):** при онлайне карты `server__players-card` (`__players-card__title`):
  **Server Administrators**, **Players List** (счётчик `server__players-count` «Players: 0 / 20»),
  **Whitelist** («Only players from the list will be able to join…»), **Ban List**; у карт — **Search**-инпуты,
  кнопки `server__players-primary-btn`, пустые состояния `server__players-none*`. ⚠️ Players-таб догоняет
  онлайн-статус через свой websocket с лагом (мелькает хинт «currently offline») — в тестах ждать веб-сокет/
  использовать консоль как источник правды (§5d).
- ⚠️ **Каверза (со слов владельца):** смена версии / несовместимые настройки могут снова уронить старт.
  Онлайн-тесты — щедрый `ensureOnline`-таймаут + понятный фейл с диагностикой, а не вечное ожидание.
