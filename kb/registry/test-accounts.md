---
id: KB-REG-ACCOUNTS
title: Тест-аккаунты (по ролям)
type: registry
status: draft
updated: 2026-10-15
sources:
  - fixtures/test-data.ts, utils/gameAuth.ts, utils/credentials.ts (имена env)
  - memory: stage-admin-account-scope, dev455-free-server-gift, custom-modpack-setup-qa, v2-subuser-permission-fix
---

# Тест-аккаунты

> **В двух словах.** Аккаунт в KB - это **роль**: кто он, для чего нужен и где брать доступ.
> Логины и пароли здесь не пишем. Они лежат в `.env` (локально и на VPS), а в KB указано
> только имя переменной.

### shared-owner

- **Кто:** общий тест-аккаунт, владелец тестовых серверов. Panel user id 388101.
- **Где работает:** UP (ultra.panel), WPGL/BIL (клиентская зона), автотесты.
- **Env:** `GAME_PANEL_EMAIL` / `GAME_PANEL_PASSWORD`, `CLIENTAREA_EMAIL` / `CLIENTAREA_PASSWORD`.
- **Можно:** мутации на своих тест-серверах с откатом.
- **Нельзя:** покупки, оплата, удаление чужого.

### admin

- **Кто:** личный аккаунт владельца с ролью админа. Panel user id 307989.
- **Где:** ADM, UP prod и stage. Видит **чужие** серверы (на stage около 16930).
- **Env:** нет, логинится владелец сам.
- **Правило:** чужие серверы не открывать. В ADM - только по явному ок на действие.
- **Важно:** часть флагов включена только на этом аккаунте (`cancellation-retention-steps`, `world-backup`), см. [flags.md](flags.md).

### invitee

- **Кто:** второй пользователь, приглашённый в Sharing тест-сервера (Co-owner / Moderator / Member).
- **Для чего:** проверки ролей и прав (role.enforcement, sharing, v2-subuser).
- **Env:** `GAME_PANEL_INVITEE_EMAIL` / `GAME_PANEL_INVITEE_PASSWORD`.
- **Правило:** после теста роль всегда возвращается в Co-owner.

### free-client

- **Кто:** клиент с бесплатным продуктом (free-сервер).
- **Env:** `CLIENTAREA_FREE_EMAIL` / `CLIENTAREA_FREE_PASSWORD`.
- ❓ Какие тесты используют этот аккаунт, нужно уточнить.

### vps-panel

- **Кто:** аккаунт VPS-панели (VirtFusion).
- **Env:** `PANEL_EMAIL` / `PANEL_PASSWORD`.

### dev455-a..f

- **Кто:** 6 аккаунтов A-F под сценарии [DEV-455](../tickets/DEV-455.md) (попап подарка и цепочка писем). Plus-адреса владельца.

### clean

- **Кто:** чистые аккаунты без истории под [DEV-458](../tickets/DEV-458.md) / [DEV-459](../tickets/DEV-459.md).

### registration

- **Env:** `TEST_USER_PASSWORD` - пароль для аккаунтов, которые создаёт `registration-flow.spec.ts`.
