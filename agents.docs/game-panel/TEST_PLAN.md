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
| 3b. Stateful (тяжёлые) | Backups (create→restore→delete); смена версии (Versions); установка плагинов/модпаков | мутации, перезапуск сервера | P2 — позже | parked |
| 4. Access / multi-actor | **Sharing ✅ (5, вкл. смену роли)**, **Port & Domains ✅ (2)**, **Tasks ✅ (2)**; enforcement ролей — todo | мутации, 2-й аккаунт | P3 | 🔄 in progress |
| 5. Негатив / security | IDOR (подмена UUID), XSS/SQLi в инпутах (console/имена файлов/config), валидация | смешанно | P3 | todo |

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

**Осталось по Phase 4:** enforcement ролей — что invitee под ролью Co-owner/Moderator/Member
**может/не может** (позитив/негатив; invitee выполняет действия). Смена роли — ✅ (SHR-005).

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

## ▶ Продолжаем здесь (resume point, 05-Jun-2026)

Реализовано: **28 тестов** — Phase 1 (8) + Phase 2 power (3) + console (2) + Phase 3 files (2) + config (2) + players (2) + Phase 4: sharing (5, вкл. смену роли) + Port & Domains (2) + Tasks (2). `npx tsc --noEmit` чистый, все зелёные.

Владелец дал карт-бланш на мутации на тест-сервере (главное — понимать ЧТО мутирует и КАК откатить; всегда self-cleaning). Следующее:
1. **Backups** — create → проверить в списке → delete (без restore). Одобрено. Нужен recon UI.
2. **enforcement ролей** — что invitee под Co-owner/Moderator/Member может/не может (позитив/негатив; invitee выполняет действия). Смена роли — ✅ (SHR-005, §5e).
3. **Phase 5 — негатив/security** (IDOR подменой UUID, XSS/SQLi в инпутах).
4. Phase 3b тяжёлые (version change / установка плагинов / backups restore) — аккуратно.

> Перед написанием: `KNOWLEDGE_BASE.md` (§5c Config, §5d Players — задокументированы), проверить `GAME_PANEL_SERVER_UUID` живой/не suspended. Онлайн-тесты модового сервера — **щедрые таймауты готовности** (боот долгий).
