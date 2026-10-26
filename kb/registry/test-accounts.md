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

- **Кто:** общий тест-аккаунт, владелец тестовых серверов. **Без фичефлагов** - видит продукт как обычный клиент.
- **ID:** panel user 388101, WHMCS client 494912 (`root_admin=0`, сверено в panel DB 15-Oct).
- **Где работает:** UP (ultra.panel), WPGL/BIL (клиентская зона), автотесты.
- **Env:** `GAME_PANEL_EMAIL` / `GAME_PANEL_PASSWORD`, `CLIENTAREA_EMAIL` / `CLIENTAREA_PASSWORD`.
- **Можно:** мутации на своих тест-серверах с откатом.
- **Нельзя:** покупки, оплата, удаление чужого.

### admin

- **Кто:** личный аккаунт владельца на корп-почте, с ролью админа.
- **ID:** panel user 307989, WHMCS client 379911 (`root_admin=1`, сверено в panel DB 15-Oct).
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
- **Продукт:** [VPS](../products/vps/README.md), тестовый сервер [srv:9c49ed96](test-servers.md#9c49ed96).

### dev455-a..f

- **Кто:** 6 аккаунтов A-F под сценарии [DEV-455](../tickets/DEV-455.md) (попап подарка и цепочка писем). Plus-адреса владельца.

### dev546-boost

- **Кто:** тест-клиент WHMCS 629255 (USD), создан владельцем под [DEV-546](../tickets/DEV-546.md) (блок Boost на чекауте).
- **Где:** BIL, чекаут `cart.php?a=checkout&checkout_variant=b`. Состоит в списке «Checkout Boost QA clients».
- **Env:** нет, логинится владелец или по его доступу.
- **Правило:** оплата только с ок владельца (кредит на счёте). Второй клиент в списке, 616588 (EUR, RO), чужой - не трогать.

### clean

- **Кто:** чистые аккаунты без истории под [DEV-458](../tickets/DEV-458.md) / [DEV-459](../tickets/DEV-459.md).

### registration

- **Env:** `TEST_USER_PASSWORD` - пароль для аккаунтов, которые создаёт `registration-flow.spec.ts`.

### dev576-checkout

- **Кто:** тест-клиент WHMCS DEV576@testmail.com (Client ID 633684 ❓ со слов владельца), создан владельцем под [DEV-576](../tickets/DEV-576.md).
- **Где:** BIL, чекаут v2. Состоит в списке «Checkout Boost QA clients», вариант b держится без параметра.
- **Env:** нет, логинится владелец.
