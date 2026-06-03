# Game Panel — Test Plan & Coverage Map

> Покрытие панели `ultra.panel.godlike.host`. Risk-based, по фазам. Обновляется по мере работы.
> См. также `KNOWLEDGE_BASE.md` (UI-карта, данные, гочи).

## Фазы

| Фаза | Содержание | Состояние | Приоритет | Статус |
|------|------------|-----------|-----------|--------|
| 0. Foundation | env + `gameAuth` + `storageState.game.json` + page objects + селекторы + доки | — | enabling | ✅ done |
| 1. Smoke / структурный | Login, Dashboard, Server overview | read-only | P1 | ✅ done (8 тестов) |
| 2. Power lifecycle | Start (+EULA) → Online; Restart (полный цикл); Kill → Offline | мутации (serial + teardown) | **P1 — ядро** | ✅ done (3 теста) |
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

## Phase 2 — что ещё можно добить

- **Console (live)** — на Online-сервере отправить команду → отклик в `.terminal` (источник правды).
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
