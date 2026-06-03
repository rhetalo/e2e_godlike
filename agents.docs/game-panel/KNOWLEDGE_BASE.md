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
| Текущий тестовый сервер | `ebb03adc-48bf-46f1-95dd-a45d07f0d23d` (`Fcz3VN5n_439772`) |
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

## 6. Статус миграции из browseruse

- Канонический набор доки (`QA_test_docs/ultra.panel/00..10`) — основа; уникальные детали фич
  (SFTP, recycle bin, bulk-операции с файлами) из `Ultra_Panel_Description` дополняют функционал.
- Прежние page objects browseruse (плоские, текстовые локаторы) **не переносятся** — заменены
  на `pages/game/*` с локаторами из `selectors.ts`. Прежний проект можно удалять после переноса доки.
