# Game Panel — Test Plan & Coverage Map

> Покрытие панели `ultra.panel.godlike.host`. Risk-based, по фазам. Обновляется по мере работы.
> См. также `KNOWLEDGE_BASE.md` (UI-карта, данные, гочи).

## Фазы

| Фаза | Содержание | Состояние | Приоритет | Статус |
|------|------------|-----------|-----------|--------|
| 0. Foundation | env + `gameAuth` + `storageState.game.json` + page objects + селекторы + доки | — | enabling | ✅ done |
| 1. Smoke / структурный | Login, Dashboard, Server overview | read-only | P1 | ✅ done (8 тестов) |
| 2. Power lifecycle | Start (+EULA) → Online; Restart (полный цикл); Kill → Offline | мутации (serial + teardown) | **P1 — ядро** | ✅ done (3 теста) |
| 2b. Console (live) | стрим лога + поле команд; безопасная команда `list` → отклик | read-only команда (serial, поднимает Online) | P1 | ✅ done (2 теста) |
| 3. Stateful (мягкие) | **Files ✅ (2)**, **Config ✅ (2)**, **Players: whitelist через консоль ✅ (2)**; Databases — заблокировано (баг ноды) | мутации, self-cleaning | P2 | ✅ done (soft) |
| 3b. Stateful (тяжёлые) | **Backups create→COMPLETED→delete ✅ (2)**; смена версии (Versions); установка плагинов/модпаков | мутации, self-cleaning | P2 | 🔄 in progress |
| 4. Access / multi-actor | **Sharing ✅ (5)**, **Port & Domains ✅ (2)**, **Tasks ✅ (2)**, **enforcement ролей ✅ (3: Member+Moderator)** | мутации, 2-й аккаунт | P3 | ✅ done |
| 5. Негатив / security | **IDOR ✅ + stored XSS (имя бэкапа, имя папки) ✅ (3)**; XSS/SQLi в др. инпутах (console/config motd) — todo | смешанно | P3 | 🔄 in progress |

## Phase 1 — реализовано

| TC | Проверка |
|----|----------|
| TC-GP-LOGIN-001 | Чузер раскрывает форму; email/password/кнопка видимы; пароль маскируется |
| TC-GP-LOGIN-002 | Неверные креды (фейковый email) → не попадаем на дэшборд |
| TC-GP-LOGIN-003 | Верные креды → редирект на «My Servers» |
| TC-GP-DASH-001 | Дэшборд: ≥1 сервер, счётчик в заголовке согласован |
| TC-GP-DASH-002 | Глобальный сайдбар: My Servers / Billing / Support Tickets / Knowledge Base |
| TC-GP-SRV-001 | Сервер: имя, статус-слово, power-контролы Start/Restart/Kill |
| TC-GP-SRV-002 | Видны все табы контента (Overview…Players) |
| TC-GP-SRV-003 | Server Information: адрес `srvN.godlike.club:PORT` + UUID |

## Phase 2 — реализовано

`tests/game/panel/power.spec.ts` (`@critical`, serial, `afterAll` → Offline):

| TC | Проверка |
|----|----------|
| TC-GP-PWR-001 | Offline → **Start** (+авто-приём EULA) → Online (1.1 мин) |
| TC-GP-PWR-002 | Online → **Restart** → полный цикл (тоггл уходит из Running и возвращается) → Online |
| TC-GP-PWR-003 | Online → **Kill** → Offline |

Подтверждено recon'ом (детали — в `KNOWLEDGE_BASE.md` §5a): EULA-диалог при первом старте,
статус online = «Running», цикл рестарта ~65–70с, консоль в `.terminal`.

## Phase 2b — Console реализовано

`tests/game/panel/console.spec.ts` (`@critical`, serial, `beforeAll` → Online, `afterAll` → Offline):

| TC | Проверка |
|----|----------|
| TC-GP-CON-001 | консоль стримит лог сервера (regex `INFO/Done/Pterodactyl/Server thread`); поле команд видимо и доступно |
| TC-GP-CON-002 | команда `list` (read-only) → отклик в логе (`players online` / `There are N of a max`) |

Источник правды — `.terminal` (`getConsoleText()`); команда `list` состояние не меняет.

## Phase 3 — реализовано

`tests/game/panel/files.spec.ts` (`@critical`, serial, self-cleaning):

| TC | Проверка |
|----|----------|
| TC-GP-FILE-001 | создание папки → появляется в списке |
| TC-GP-FILE-002 | удаление папки → исчезает из списка (Recycle Bin 24ч) |

`tests/game/panel/config.spec.ts` (`@critical`, serial, self-cleaning; редактор server.properties):

| TC | Проверка |
|----|----------|
| TC-GP-CFG-001 | изменить `motd` → reload → значение сохранилось (автосейв) → **вернуть оригинал** → reload → откат подтверждён |
| TC-GP-CFG-002 | Config рендерит ключевые поля (`motd`/`difficulty`/`max-players`/`level-name`), `level-name` непуст |

Детали Config-таба (автосейв без Save-кнопки, динамические id, локаторы) — `KNOWLEDGE_BASE.md` §5c.

`tests/game/panel/players.spec.ts` (serial, self-cleaning):

| TC | Проверка |
|----|----------|
| TC-GP-PLR-001 (`@regression`) | таб `/players` рендерит `.server__players` + карточку «Server Administrators» (offline-ok) |
| TC-GP-PLR-002 (`@critical`) | whitelist add → list → remove игрока (`Notch`) через консоль; ответы «Added/Removed … whitelist» (online, обязательный откат) |

Управление игроками требует Online-сервера → делаем через консоль (источник правды).
⚠️ Сервер сильно модовый — боот до готовности консоли долгий (`waitForConsoleReady` 360с). Детали — `KNOWLEDGE_BASE.md` §5d.

## Phase 3b — реализовано (Backups)

`tests/game/panel/backups.spec.ts` (serial, self-cleaning; работает offline):

| TC | Проверка |
|----|----------|
| TC-GP-BKP-001 (`@critical`) | создать серверный бэкап (выбор сервера + имя) → строка в списке → дождаться `COMPLETED` → **удалить** → строки нет (мутация, self-cleaning) |
| TC-GP-BKP-002 (`@regression`) | структура: форма create (имя + Create Backup + табы типа), список с квотой `N/3 slots used`, секция Scheduled |

⚠️ **Статус бэкапа НЕ обновляется без reload** → ждём `COMPLETED` через `expect.poll` + `backups.refresh()`
(не реактивный `toBeVisible`). НЕ жмём **Restore** (перезапишет сервер) и не трогаем чужой бэкап «111».
Квота — 3 слота. Create — async-джоба (`test.setTimeout` ~600с, poll ~9 мин запас; по факту бэкап ~292 MB
готов за пару минут). Детали — `KNOWLEDGE_BASE.md` §5h.

✅ **Прогнан целиком 06-Jun: оба теста зелёные (39.9с), self-cleaning подтверждён, в `main`.**

## Phase 4 — реализовано (Sharing + Port & Domains)

`tests/game/panel/sharing.spec.ts` (offline-ok, без мутаций):

| TC | Проверка |
|----|----------|
| TC-GP-SHR-001 (`@regression`) | Sharing рендерит форму инвайта (Send Invite + email) + владелец в участниках |
| TC-GP-SHR-002 (`@critical`) | приглашённый аккаунт (`GAME_INVITEE_EMAIL`) виден в Sharing → доступ предоставлен |
| TC-GP-SHR-003 (`@critical`) | **invitee** (2-й аккаунт) видит расшаренный сервер `test_e2e` в своём дашборде |
| TC-GP-SHR-004 (`@critical`) | **invitee** открывает страницу расшаренного сервера (`/server/{uuid}`) — доступ есть |
| TC-GP-SHR-005 (`@critical`) | **смена роли** участника: Co-owner → Moderator → reload → откат (мутация, self-cleaning) |

Инвайты НЕ отправляем (Send Invite шлёт реальный email; invite-мутация проделана владельцем вручную).
Мульти-актёр: 2-й аккаунт логинится через `loginInviteeAndSaveSession` (login==password==email),
сессия в `storageState.game.invitee.json`. Детали — `KNOWLEDGE_BASE.md` §5e.

`tests/game/panel/network.spec.ts` (Port & Domains, offline-ok, без мутаций):

| TC | Проверка |
|----|----------|
| TC-GP-NET-001 (`@regression`) | Subdomain-блок виден + кнопка Update Subdomain |
| TC-GP-NET-002 (`@regression`) | Network Ports: ≥1 карточка порта + кнопка Add Additional Port |

Update Subdomain / Add Port НЕ жмём (меняют сетевые настройки). Детали — `KNOWLEDGE_BASE.md` §5f.

`tests/game/panel/tasks.spec.ts` (Tasks, offline-ok, без мутаций):

| TC | Проверка |
|----|----------|
| TC-GP-TASK-001 (`@regression`) | All Tasks: дефолтные задачи «Send command» и «Send power action» отрендерены |
| TC-GP-TASK-002 (`@regression`) | секция Scheduled Tasks присутствует (пустое состояние «no scheduled tasks») |

Run/Configure НЕ жмём (Run выполняет задачу = мутация). Детали — `KNOWLEDGE_BASE.md` §5g.

`tests/game/panel/role.enforcement.spec.ts` (multi-actor, мутация роли, self-cleaning):

| TC | Проверка |
|----|----------|
| TC-GP-ROLE-001 (`@critical`) | invitee-**Member лишён Restart/Kill и поля консоли** (у Co-owner они есть); owner понижает роль → invitee теряет контролы → откат в Co-owner возвращает их |
| TC-GP-ROLE-002 (`@critical`) | invitee-**Member не управляет бэкапами** (меню «...» скрыто, список пуст); Co-owner — видит строки + управление; откат self-cleaning |
| TC-GP-ROLE-003 (`@critical`) | **Moderator — посередине**: без Restart/Kill (как Member), но с полем консоли и управлением бэкапами (как Co-owner); откат в Co-owner |

Enforcement — через присутствие/отсутствие контролов в DOM (Vue убирает по роли). Owner-only — управление
участниками (role-select/trash). Роль invitee ВСЕГДА откатывается в Co-owner. Матрица 3 ролей — `KNOWLEDGE_BASE.md` §5i.

## Phase 5 — реализовано (Security / негатив)

`tests/game/panel/security.spec.ts` (offline-ok):

| TC | Проверка |
|----|----------|
| TC-GP-SEC-001 (`@critical`) | **IDOR**: чужой/несуществующий UUID сервера → «resource does not exist» + нет power-контролов; свой сервер (baseline) → контролы есть. Read-only |
| TC-GP-SEC-002 (`@critical`) | **stored XSS** в имени бэкапа (`<img onerror>`) НЕ исполняется (нет нативного диалога) и экранируется (рендер как текст); self-cleaning (создать→дождаться→удалить) |
| TC-GP-SEC-003 (`@critical`) | **stored XSS** в имени папки (файл-менеджер) НЕ исполняется и экранируется; self-cleaning (создать→удалить). Быстрее SEC-002 (без async-джобы) |

IDOR — read-only. XSS — мутации (свой бэкап/папка, удаляются). Детали и сигналы — `KNOWLEDGE_BASE.md` §5j.
Остаток Phase 5: XSS/SQLi в других инпутах (console / config motd).

## Phase 2 — что ещё можно добить

- **Boost** — поведение кнопки Boost (промо-апгрейд? — осторожно, проверить, что не списывает лишнего).

## Известные проблемы прода (на 03-Jun-2026)

- **Databases — создание не работает.** UI отдаёт 400: `{success:false, message:"Failed to create
  database.", error:"SQLSTATE[HY000] [2002] Connection refused (... CREATE DATABASE ... )"}`.
  Похоже на проблему ноды; на плане Double к тому же «0 databases remaining». Тесты Databases
  **запаркованы** до починки (проверено и со стороны пользователя). Кандидат в баг-репорт.

## Известные риски / заметки

- Серверы не вечные → `GAME_PANEL_SERVER_UUID` в env; при ротации сервера обновить.
- A/B-промо Amplitude бьёт по storefront-воронке, **не** по панели (см. основной CLAUDE.md).
- Phase 3b (restore/версии) делаем после стабилизации мягких мутаций.

## ▶ Продолжаем здесь (resume point, 06-Jun-2026)

Реализовано: **36 тестов** — Phase 1 (8) + Phase 2 power (3) + console (2) + Phase 3 files (2) + config (2) + players (2) + Phase 3b backups (2) + Phase 4: sharing (5) + Port & Domains (2) + Tasks (2) + role enforcement (3: Member+Moderator) + **Phase 5 security (3)**. `npx tsc --noEmit` чистый.

✅ **Backups + Role enforcement (3 роли) + Security (IDOR/XSS) завершены (06-Jun), зелёные:** `backups.spec.ts`
(create→COMPLETED→delete), `role.enforcement.spec.ts` (Member + Moderator vs Co-owner), `security.spec.ts`
(SEC-001 IDOR; SEC-002 XSS имя бэкапа; SEC-003 XSS имя папки). Recon — KB §5h/§5i/§5j. Прод чист.

Владелец дал карт-бланш на мутации на тест-сервере (понимать ЧТО мутирует и КАК откатить; всегда self-cleaning). Дальше:
1. **Phase 5 остаток** — XSS/SQLi в console (требует Online — медленный boot модового сервера) / config motd (автосейв → откат обязателен; слабый sink — значение в `<input>`).
2. Phase 3b остаток (version change / установка плагинов / backups **restore** — restore деструктивный, аккуратно).
3. Phase 2 Boost (промо-апгрейд — осторожно, не списать лишнего).

> Перед написанием: `KNOWLEDGE_BASE.md` (§5c Config, §5d Players, §5h Backups, §5i Roles, §5j Security — задокументированы), проверить `GAME_PANEL_SERVER_UUID` живой/не suspended. Бэкапы: статус НЕ обновляется без reload (`expect.poll`+`refresh()`). Смена роли: персист через reload+poll; всегда откат в Co-owner. IDOR-сигнал: `notFoundError` + `hasPowerControls()` (не слово «error» в body). Онлайн-тесты модового сервера — **щедрые таймауты**.

---

## ▶▶ Live-recon 06-Jun-2026 (Playwright MCP) — пробелы, кандидаты, блокеры

> Разведка через MCP по всем экранам сервера + дашборд + Referral. Детали структуры/селекторов —
> `KNOWLEDGE_BASE.md` §7. Ниже — что покрывать дальше и чем это рискованно.

### 🔴 БЛОКЕР: `test_e2e` крашится на старте (06-Jun)
При нажатии **Start** сервер (`neoforge 1.21.1`, build 21.1.200) **падает в процессе инициализации**
и daemon глушит авто-рестарт: `[Pterodactyl Daemon]: Detected server process in a crashed state!
Exit code: 0, Out of memory: false. Aborting automatic restart`. Stack обрывается на
`net.minecraft.Util.blockUntilDone` → `server.Main.main` (типично для падения мода/датапака при загрузке).
- **Следствие:** все онлайн-зависимые тесты на этом сервере СЕЙЧАС бы падали в `beforeAll`/`ensureOnline`:
  **TC-GP-PWR-001/002** (Start/Restart→Online), **TC-GP-CON-001/002** (консоль), **TC-GP-PLR-002** (whitelist).
- **Действия:** (1) проверить причину (вкладка/блок **Mod Conflict** в консоли; убрать конфликтный мод
  или сменить версию/план RAM); (2) до починки — онлайн-тесты держать в карантине либо переключить
  `GAME_PANEL_SERVER_UUID` на здоровый Minecraft-сервер аккаунта (их много, см. дашборд). Кандидат в баг-репорт.
- Offline-тесты (структура, Config, Sharing, Backups, Network, Tasks, Security-IDOR/XSS) — **не затронуты**.

### Кандидатные тесты по непокрытым экранам (status: TODO)

| TC ID | Экран / флоу | Тип | Тег | Prod-safety |
|---|---|---|---|---|
| TC-GP-VER-001 | **Versions**: шапка «Currently running …» + сетка семейств (Vanilla…NeoForge) + drill-down `?type=` со списком версий | структурный | @regression | read-only; **install НЕ жать** (rebuild) |
| TC-GP-EXT-001 | **Plugins/Mods + Modpacks** (один компонент `server__extensions`): фильтры Mods/Plugins/All/Installed, поиск/Category/Author, наличие Install | структурный | @regression | read-only; **Install НЕ жать** |
| TC-GP-UPG-001 | **Boost/Upgrade**: клик Boost → `/upgrade`, рендер `current-plan-card` + `simple-plan-card`, цены/категории | структурный | @regression | ⚠️ ПЛАТЁЖНЫЙ — план НЕ выбирать, checkout НЕ проходить |
| TC-GP-EDIT-001 | **Edit Server — rename** (self-cleaning): Edit server → сменить Server Name → Save → проверить → откатить `test_e2e` | мутация | @critical | ⚠️ **Reinstall Server НЕ жать** (затрёт сервер) |
| TC-GP-TASK-003 | **Tasks Configure → create** (self-cleaning): Configure «Send command» → имя+payload → Save → видно в «Your Tasks» → удалить | мутация | @regression | **Run НЕ жать**; обязателен teardown задачи |
| TC-GP-REF-001 | **Referral** `/referral`: реф-ссылка, баланс, How It Works, Analytics | структурный | @regression | ⚠️ **Request Withdrawal НЕ жать** (вывод средств) |
| TC-GP-DB-001 | **Databases create** | мутация | — | ⛔ ПАРКИНГ: баг прода (PUT/POST `/databases/` падает, 0 remaining) — до починки не писать |

### Матрица покрытия (после recon)

- **Покрыто (~28 тестов, всё зелёное на 06-Jun):** Login, Dashboard, Server Overview, Power, Console,
  Files, Config, Players, Backups, Sharing (+invitee), Network, Tasks (структура), Role enforcement, Security (IDOR/XSS).
- **Пробелы (по приоритету):**
  1. **Версии/каталоги/Referral/Upgrade** — структурные смоук-тесты, низкий риск, средне-низкий приоритет (TC-VER/EXT/UPG/REF-001).
  2. **Edit Server rename** — полезный self-cleaning кейс, но рядом деструктивный Reinstall (аккуратно) — средний приоритет.
  3. **Tasks create (Configure→Save)** — мутация с teardown — средний приоритет.
  4. **Остаток Phase 5** — XSS/SQLi в console/config motd (console требует Online ⇒ сейчас блокер).
  5. **Phase 3b остаток** — version change / install плагина/модпака / backups **restore** — деструктивно, низкий приоритет.
  6. **Databases** — заблокировано багом прода.
- **Селекторная заметка:** power-кнопки имеют стабильные классы `button.server-button-start /
  -restart` (использовать вместо `:has-text("Start")`, который ловит и «Restart»). Каталог —
  `server__extensions__*`; Upgrade — `current-plan-card__* / simple-plan-card__*`; Edit Server —
  `edit__server-block__dialog`; Tasks-диалог — `server__dialogs__action-dialog`. Все — в §7 KB,
  при написании тестов завести в `utils/selectors.ts` (`GAME_PANEL_*`).

### Resume point обновлён (06-Jun, после MCP-recon)
Следующий разумный шаг — **починить/обойти блокер сервера** (иначе онлайн-тесты красные), затем взять
дешёвые структурные смоуки (TC-VER/EXT/UPG/REF-001) — они offline-safe и не плодят риск. Edit-rename и
Tasks-create — когда дойдут руки до мутаций с teardown.
