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

## ▶ Продолжаем здесь (resume point, 07-Jun-2026)

Реализовано: **~51 тест**. База (36): Phase 1 (8) + power (3) + console (2) + files (2) + config (2) + players (2) + backups (2) + sharing (5) + Port&Domains (2) + Tasks (2) + role enforcement (3) + security (3).
**07-Jun (MCP-сессия, +15 тестов):** VER×2, EXT×2, REF, UPG, PREM, NET-003, FILE-003, SFTP-001, CF-001, FILE-004, CON-003, TASK-003, EDIT-001 — детали в секциях ниже («Live-recon Round-1/2/3 (MCP)» + «Реализовано из матрицы»). Онлайн-набор (PWR/CON/PLR) **пере-подтверждён зелёным** после реинсталла сервера. `npx tsc --noEmit` чистый. Сравнение Playwright MCP vs наш код-формат — `agents.docs/MCP_RECON_VS_CODE.md`.

✅ **Backups + Role enforcement (3 роли) + Security (IDOR/XSS) завершены (06-Jun), зелёные:** `backups.spec.ts`
(create→COMPLETED→delete), `role.enforcement.spec.ts` (Member + Moderator vs Co-owner), `security.spec.ts`
(SEC-001 IDOR; SEC-002 XSS имя бэкапа; SEC-003 XSS имя папки). Recon — KB §5h/§5i/§5j. Прод чист.

Владелец дал карт-бланш на мутации на тест-сервере (всегда self-cleaning). Дальше (низкий приоритет, деструктив — отдельной сессией):
1. **Phase 5 остаток** — XSS/SQLi в console / config motd (автосейв → откат обязателен; слабый sink — значение в `<input>`).
2. Phase 3b остаток — version change (rebuild) / установка плагина-модпака / backups **restore** (деструктивный).
(Boost-апгрейд закрыт структурно — UPG-001.)

> Перед написанием: `KNOWLEDGE_BASE.md` (§5c Config, §5d Players, §5h Backups, §5i Roles, §5j Security — задокументированы), проверить `GAME_PANEL_SERVER_UUID` живой/не suspended. Бэкапы: статус НЕ обновляется без reload (`expect.poll`+`refresh()`). Смена роли: персист через reload+poll; всегда откат в Co-owner. IDOR-сигнал: `notFoundError` + `hasPowerControls()` (не слово «error» в body). Онлайн-тесты модового сервера — **щедрые таймауты**.

---

## ▶▶ Live-recon 06-Jun-2026 (Playwright MCP) — пробелы, кандидаты, блокеры

> Разведка через MCP по всем экранам сервера + дашборд + Referral. Детали структуры/селекторов —
> `KNOWLEDGE_BASE.md` §7. Ниже — что покрывать дальше и чем это рискованно.

### 🟢 [РЕШЕНО 06-Jun] Был блокер: `test_e2e` крашился на старте
> **РЕШЕНО:** владелец **переустановил** сервер (причина — несовместимая конфигурация). Питание ОК,
> сервер **онлайн**, консоль жива (отправил `list` → ответ «There are 0 of a max of 20 players online»).
> После реинсталла сервер свежий: **20 слотов**, ~247 MiB, neoforge 1.21.1, **не падает**. Онлайн-тесты
> (**PWR-001/002, CON-001/002/003, PLR-002**) снова реальны.
> ⚠️ **Каверза остаётся:** смена версии / несовместимые настройки могут снова уронить старт →
> онлайн-тесты писать с **щедрым `ensureOnline`-таймаутом и понятным фейлом** (не вечное ожидание),
> а в идеале — assert «дошёл до Online» с диагностикой из консоли при провале.

<details><summary>История блокера (для контекста)</summary>

При нажатии **Start** сервер (`neoforge 1.21.1`, build 21.1.200) **падал в процессе инициализации**
и daemon глушит авто-рестарт: `[Pterodactyl Daemon]: Detected server process in a crashed state!
Exit code: 0, Out of memory: false. Aborting automatic restart`. Stack обрывается на
`net.minecraft.Util.blockUntilDone` → `server.Main.main` (типично для падения мода/датапака при загрузке).
- **Следствие:** все онлайн-зависимые тесты на этом сервере СЕЙЧАС бы падали в `beforeAll`/`ensureOnline`:
  **TC-GP-PWR-001/002** (Start/Restart→Online), **TC-GP-CON-001/002** (консоль), **TC-GP-PLR-002** (whitelist).
- **Действия:** (1) проверить причину (вкладка/блок **Mod Conflict** в консоли; убрать конфликтный мод
  или сменить версию/план RAM); (2) до починки — онлайн-тесты держать в карантине либо переключить
  `GAME_PANEL_SERVER_UUID` на здоровый Minecraft-сервер аккаунта (их много, см. дашборд). Кандидат в баг-репорт.
- Offline-тесты (структура, Config, Sharing, Backups, Network, Tasks, Security-IDOR/XSS) — **не затронуты**.

</details>

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

### Round-2 кандидаты (суб-флоу, MCP 06-Jun; детали — KB §8)

| TC ID | Флоу | Тип | Тег | Prod-safety |
|---|---|---|---|---|
| TC-GP-CON-003 | **Console «Commands»-палитра**: открыть → поиск/A-Z → выбрать команду → инпут заполнился шаблоном | структурный | @regression | offline-safe; команду НЕ отправлять |
| TC-GP-FILE-003 | **File row «...» меню**: полный набор (Open/Pin/Copy×3/Rename/Move/Archive/Duplicate/Delete) рендерится | структурный | @regression | read-only (меню не выполнять) |
| TC-GP-FILE-004 | **File Rename** (self-cleaning): Rename папки → проверить → вернуть имя | мутация | @regression | обязателен откат |
| TC-GP-SFTP-001 | **SFTP Connect** диалог: Host/Port/Username/Password + Open SFTP/Generate/Save видны | структурный | @regression | ⚠️ Generate/Save НЕ жать (меняет пароль) |
| TC-GP-CF-001 | **CurseForge** диалог: file-input + Browse/Cancel/Proceed | структурный | @regression | ⚠️ не загружать |
| TC-GP-AUTH-004 | **Logout**: user-меню → Log Out → редирект `/login` | флоу | @smoke | изолировать контекст (убивает сессию) |
| TC-GP-BKP-003 | **Scheduled backup**: Schedule Backup → Set interval → create→verify→delete | мутация | @regression | квота 3 слота; чужой «111» не трогать; self-cleaning |

### Round-3 кандидаты (бэклог разведан, MCP 06-Jun; детали — KB §9)

| TC ID | Флоу | Тип | Тег | Prod-safety |
|---|---|---|---|---|
| TC-GP-NET-003 | **Add Additional Port** диалог: поле Name + Cancel/Add Port | структурный | @regression | ⚠️ Add Port не жать (мутация) |
| TC-GP-SHR-006 | **Audit Log** пишет действие: совершить разрешённое → проверить запись по ключу (`server:power.*`) | флоу | @regression | действие должно быть безопасным/обратимым |
| TC-GP-FILE-005 | **CodeMirror-редактор**: открыть текстовый файл → контент в `.cm-content` → Cancel/Save видны | структурный | @regression | ждать async-монтаж; правку (если) откатывать |
| TC-GP-FILE-006 | **Recycle Bin**: удалить → перейти в `.trash` → строка видна (+ Restore/Clear контролы) | мутация | @regression | self-cleaning (Restore или Clear) |
| TC-GP-PREM-001 | **Free Premium** модалка: открывается, список фич + CTA | структурный | @regression | ⚠️ «Get Premium» CTA не жать |

**Полностью разведано (round 1–3):** все вкладки/разделы сервера, их диалоги/меню, глобальный сайдбар,
header-меню. Осталась единственная не до конца снятая деталь — **Versions 3-й уровень (выбор build →
install-confirm)**: install деструктивен (rebuild), доходить в тесте не нужно, поэтому низкий приоритет.

### ✅ Реализовано из матрицы (код, 06-Jun-2026)

Первый срез структурных тестов из round-1 матрицы — **зелёный (4 теста, 40.2s), `tsc` чистый, offline-safe:**
- **`versions.spec.ts`** — TC-GP-VER-001 (шапка «Currently running» + сетка семейств Vanilla/Paper/NeoForge),
  TC-GP-VER-002 (drill-down семейства → Go Back + Show Snapshot Versions; install НЕ жмём).
  Page object `GamePanelVersionsPage`, селекторы `GAME_PANEL_VERSIONS`.
- **`extensions.spec.ts`** — TC-GP-EXT-001 (Plugins/Mods: заголовок Mods + фильтры + поиск),
  TC-GP-EXT-002 (Modpacks: тот же компонент, заголовок Modpacks). Page object `GamePanelExtensionsPage`,
  селекторы `GAME_PANEL_EXTENSIONS`.
- **`referral.spec.ts`** — TC-GP-REF-001 (заголовок + readonly реф-ссылка + Copy Link + How It Works;
  Request Withdrawal НЕ жмём). Page object `GamePanelReferralPage` (глобальная, без uuid), `GAME_PANEL_REFERRAL`.
- **`promo.spec.ts`** — TC-GP-UPG-001 (Boost → /upgrade: карточка текущего плана + карточки планов + цена
  по тексту валюты; checkout НЕ проходим), TC-GP-PREM-001 (Free Premium модалка + CTA, не покупаем).
  Page object `GamePanelUpgradePage` (вход через `a[href*="/upgrade"]`), компонент `FreePremiumDialog`,
  селекторы `GAME_PANEL_UPGRADE` / `GAME_PANEL_PREMIUM`.
- **`network.spec.ts` (+NET-003)** — Add Additional Port диалог (поле Name + Add Port; закрываем без
  добавления). Расширен `GamePanelNetworkPage` (`openAddPortDialog`/`addPortNameInput`/`addPortConfirm`/`closeDialog`).
- **`files.structure.spec.ts`** — FILE-003 (per-row «...» меню: Rename/Delete/Copy path и др.),
  SFTP-001 (SFTP Connect диалог: Host/Username + Open SFTP/Generate), CF-001 (CurseForge upload:
  Browse/Proceed). Расширен `GamePanelFilesPage` (`openAnyRowMenu`/`openSftpDialog`/`openCurseForgeDialog`/
  `activeDialog`/`closeOverlay`). Ничего не сабмитим.
- **`files.spec.ts` (+FILE-004)** — переименование папки (create→rename→verify→delete, **self-cleaning**,
  первая мутация из новых). Метод `GamePanelFilesPage.renameEntry`; селектор `renameConfirm`
  (rename-диалог: инпут предзаполнен, confirm-кнопка «Rename», заголовок шарится с «Move file»).
- **`console.palette.spec.ts`** — CON-003 (палитра «Commands»: открытие + поиск/фильтр). Page object
  `GamePanelConsolePage` (/console), селекторы `GAME_PANEL_CONSOLE`. Offline-safe.
- **`tasks.spec.ts` (+TASK-003)** — создание+удаление задачи «Send command» (Configure→Save→Your Tasks→
  иконка→Remove→confirm Delete, **self-cleaning**). Методы `configureSendCommand`/`removeYourTask`.
- **`edit.server.spec.ts`** — EDIT-001 (rename сервера → реактивный заголовок → откат, **self-cleaning**).
  Методы `GamePanelServerPage.setServerName`/`overviewTitle`. ⚠️ **Гоча:** Edit-диалог **дозагружает имя
  асинхронно** после открытия — филл сразу после open затирается ответом fetch (Save шлёт старое имя).
  Фикс: `setServerName` ждёт **стабилизации** значения поля перед fill (через MCP с задержками гонки не
  было — потому баг проявился только в быстром прогоне). Reinstall в диалоге НЕ трогаем.
- **Итог реализации (эта сессия):** **15 новых тестов** (VER×2, EXT×2, REF, UPG, PREM, NET-003, FILE-003,
  SFTP-001, CF-001, FILE-004, CON-003, TASK-003, EDIT-001) зелёные, `tsc` = 0. 12 offline-структурных +
  3 self-cleaning мутации (FILE-004 rename, TASK-003 task, EDIT-001 server rename).
- **✅ Онлайн-набор подтверждён зелёным (07-Jun, после реинсталла):** `power.spec.ts` PWR-001/002/003
  (Start→Online / Restart-цикл / Kill→Offline, 57.5s), `console.spec.ts` CON-001/002 (15.6s),
  `players.spec.ts` PLR-001/002 (whitelist через консоль, 56.1s). Блокер краша снят end-to-end —
  свежий сервер грузится быстро (~минута на полный цикл). ⚠️ Каверза остаётся: смена версии/несовместимые
  настройки могут снова уронить старт → держать щедрый `ensureOnline`.
- **Остаток (низкий приоритет / деструктив):** version change (rebuild), install плагина/модпака,
  backups **restore**, XSS/SQLi в console/config (Phase 5 хвост). Все — деструктивные/тяжёлые, отдельно.
