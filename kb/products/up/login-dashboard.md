---
id: UP/login-dashboard
title: Вход в панель и дашборд My Servers
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-06-09        # recon входа, дашборда и logout
tickets: [TASK-split-server, DEV-563]
flags: []
tests:
  - tests/game/panel/login.spec.ts
  - tests/game/panel/auth.logout.spec.ts
  - tests/game/panel/dashboard.spec.ts
  - tests/game/panel/security.spec.ts
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §1, §4, §5, §7.0, §8c (recon 03..09-Jun-2026)
  - kb/products/up/README.md (раздел «Вход»)
  - kb/registry/environments.md
---

# Вход в панель и дашборд My Servers

> **В двух словах.** Клиент входит в ultra.panel по email и паролю или через аккаунт биллинга (WHMCS) и
> попадает на дашборд «My Servers» - список всех своих серверов с фильтрами и двумя видами (плитка и
> список). Отсюда открывается любой сервер. Сверху и сбоку - глобальная навигация: биллинг, тикеты,
> база знаний, реферальная программа, аккаунт.

## Где в интерфейсе

- **`/login`:** сначала кнопка-выбор «Through login/password», по ней раскрывается форма: поле «Username or Email»
  (`input[type="email"]`), пароль, кнопка **Login**. Рядом ссылка **Authorization** → `panel.godlike.host/api/v2/whmcs/login`
  (вход через WHMCS). KB §4, §7.0.
- **Дашборд `/?page=1`:** заголовок **«My Servers (N)»**, колонки Game / Name / Active Server / Players / CPU% / RAM / Storage,
  фильтры **Suspended** и **Free**, тоггл grid / list. Карточка показывает адрес `srvN.godlike.club:PORT` и кнопку Copy.
  Бейджи карточек `Suspended` и `Free`.
- **Группы Split:** семья `[MainN]` / `[SubN_M]`, свёрнутая группа с бейджем `+N` ([UP/split-server](split-server.md)).
- **Глобальный сайдбар:** My Servers, Main Site, Referral Program, Billing, Discord, Support Tickets, Knowledge Base.
  Billing ведёт в `godlike.host/clientarea` (BIL).
- **Меню аккаунта** (кнопка с email внизу сайдбара): Knowledgebase, Edit Account, **Log Out**. Рядом селект языка (EN) и
  колокольчик уведомлений со счётчиком. KB §8c.

## Как работает (под капотом)

- SPA держит токен в localStorage `access_token`, запросы к API идут с `Authorization: Bearer ptlc_*`
  ([обзор UP](README.md#как-устроено)). Текущий пользователь - `GET /api/v2/auth/current`.
- Успешный вход → редирект на `/?page=1`. Log Out - ссылка `/logout` → редирект на `/login`.
- Без сессии любой `/server/{uuid}` редиректит на `/login`.
- Чужой или несуществующий UUID → «The requested resource does not exist on this server.», ответ одинаков для обоих случаев
  (нет утечки «существует, но чужой»). KB §5j.
- **Stage:** вход только через Google-OAuth, сессия живёт ~30-40 мин ([env:stage](../../registry/environments.md#stage)).

## Правила и граничные случаи

1. **Steam-вход, восстановление пароля, Edit Account, смена языка, уведомления** - не разведаны ([обзор UP, пробел 2](README.md#пробелы)).
2. **Карточки серверов - не ссылки**, а `div` с переходом по клику.
3. **Серверы, terminated в WHMCS,** есть в БД панели, но API отвечает «does not exist» ([DEV-563/O1](../../tickets/DEV-563.md#находки)).
4. Счётчик «My Servers (N)» на тест-аккаунте растёт со временем (26 → 30 → больше), не завязываться на число.

## Гочи для тестирования

- **Целиться строго в `input[type="email"]`** - на экране выбора до раскрытия формы есть лишний `type="text"`. KB §5.
- **Shepherd-тур** (6 шагов, на каждой навигации, «Skip for now») перехватывает клики - гасится в `GamePanelBasePage.open()`.
- **Log Out убивает сессию `storageState`** - тест только в изолированном контексте.
- Сессии тестов: `utils/gameAuth.ts` → `storageState.game.json`, второй аккаунт - `storageState.game.invitee.json`
  ([acc:shared-owner](../../registry/test-accounts.md#shared-owner), [acc:invitee](../../registry/test-accounts.md#invitee)).

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Форма входа, неверные и валидные данные, формат email, F5, редирект без сессии | `login.spec.ts` (LOGIN-001..006) | ✅ |
| Log Out | `auth.logout.spec.ts` (AUTH-004) | ✅ |
| Дашборд: счётчик, сайдбар, grid / list, адрес на карточке | `dashboard.spec.ts` (DASH-001..004) | ✅ |
| IDOR чужого UUID | `security.spec.ts` (SEC-001) | ✅ |
| Вход через WHMCS, Steam, восстановление пароля | не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 03-Jun-2026 | - | Recon входа и дашборда, KB §4 |
| 06-Jun-2026 | - | Фильтр и бейдж Free, shepherd-тур 6 шагов, ссылка Authorization |
| 09-Jun-2026 | - | Logout (AUTH-004), IDOR (SEC-001) |
| 10-Sep-2026 | [TASK-split-server](../../tickets/TASK-split-server.md) | Группы split-серверов на дашборде |
