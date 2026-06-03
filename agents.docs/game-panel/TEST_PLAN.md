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
| 3. Stateful (мягкие) | **Files: create folder → delete ✅ (2 теста)**; Config (edit→verify→revert), Players (whitelist/op) — todo; Databases — заблокировано (баг ноды) | мутации, self-cleaning | P2 | 🔄 in progress |
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

Реализовано: **15 тестов** — Phase 1 (8) + Phase 2 power (3) + Phase 2b console (2) + Phase 3 files (2). `npx tsc --noEmit` чистый.

Следующее по плану (Phase 3 «мягкие мутации», self-cleaning):
1. **Config** — `tests/game/panel/config.spec.ts`: открыть Config-таб → изменить значение → проверить → **вернуть как было**. Нужен recon полей формы (KB §4 описывает таб, но не конкретные инпуты).
2. **Players** — whitelist / op на Online-сервере (команды через консоль или UI-таб Players); обязательно откат.
3. Databases — **остаются запаркованы** (баг ноды, 400/Connection refused).

Потом Phase 4 (Sharing/мульти-актор, 2-й аккаунт) → Phase 5 (негатив/security).

> Перед написанием: прочитать `KNOWLEDGE_BASE.md`, проверить что `GAME_PANEL_SERVER_UUID` в `.env` указывает на живой сервер, и что сервер не suspended.
