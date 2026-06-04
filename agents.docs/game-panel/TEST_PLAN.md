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
| 3. Stateful (мягкие) | **Files ✅ (2)**, **Config: motd edit→verify→revert ✅ (2)**; Players (whitelist/op) — todo; Databases — заблокировано (баг ноды) | мутации, self-cleaning | P2 | 🔄 in progress |
| 3b. Stateful (тяжёлые) | Backups (create→restore→delete); смена версии (Versions); установка плагинов/модпаков | мутации, перезапуск сервера | P2 — позже | parked |
| 4. Access / multi-actor | Sharing: invite → invitee видит сервер → enforcement ролей; Port & Domains; Tasks | мутации, 2-й аккаунт | P3 | unlocked |
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

## ▶ Продолжаем здесь (resume point, 04-Jun-2026)

Реализовано: **17 тестов** — Phase 1 (8) + Phase 2 power (3) + Phase 2b console (2) + Phase 3 files (2) + Phase 3 config (2). `npx tsc --noEmit` чистый, оба config-теста зелёные.

Следующее по плану:
1. **Players** (Phase 3) — whitelist / op. Требует recon таба Players (UI vs команды через консоль). Сервер, вероятно, Online; обязательно откат (un-whitelist / deop). Консольный путь уже есть: `GamePanelServerPage.sendConsoleCommand`.
2. Databases — **остаются запаркованы** (баг ноды, 400/Connection refused).
3. Потом Phase 4 (Sharing/мульти-актор, 2-й аккаунт) → Phase 5 (негатив/security).

> Перед написанием: прочитать `KNOWLEDGE_BASE.md` (§5c — Config уже задокументирован), проверить что `GAME_PANEL_SERVER_UUID` в `.env` указывает на живой сервер и он не suspended.
