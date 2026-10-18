---
id: VPS/login-dashboard
title: Вход в VPS-панель, Dashboard и список серверов
type: feature
product: VPS
status: draft
updated: 2026-10-18
verified_on: 2026-06-19        # спеки login/server зелёные на handoff 19-Jun; HTML - recon May 2026
tickets: []
flags: []
tests: [tests/vps/panel/vps.panel.login.spec.ts, tests/vps/panel/vps.panel.server.spec.ts]
sources:
  - agents.docs/vps-panel/KNOWLEDGE_BASE.md §1 (03-Jun-2026)
  - шапки tests/vps/panel/vps.panel.login.spec.ts, vps.panel.server.spec.ts
  - utils/auth.ts (loginAndSaveSession, storageState.panel.json)
---

# Вход в VPS-панель, Dashboard и список серверов

> **В двух словах.** Клиент входит в панель VirtFusion по email и паролю и попадает на `/dashboard`. Оттуда
> раздел **Servers** ведёт в список `/servers` с вкладками All / Bookmarked, а кнопка **Manage** у сервера
> открывает его страницу. Без сессии любой защищённый адрес отправляет на `/login`. Удаления сервера в
> списке нет - только Manage ([обзор VPS](README.md#как-устроено)).

## Где в интерфейсе

- `/login` - форма: email, пароль, кнопка входа. На пустой форме кнопка **disabled**.
- `/dashboard` - стартовая страница после входа; в навигации ссылки **Dashboard** и **Servers**.
- `/servers` - список серверов аккаунта: вкладки **All** / **Bookmarked**, у строки иконка закладки и кнопка **Manage**.
- Manage → `/server/{uuid}` - [страница сервера](server-page.md).

## Как работает (под капотом)

- Это готовая панель VirtFusion, не наша разработка: Bootstrap + частично Vue. KB §1.
- Сессия в тестах: `utils/auth.ts` → `loginAndSaveSession()` логинится один раз и сохраняет `storageState.panel.json`;
  учётка - env `PANEL_EMAIL` / `PANEL_PASSWORD` ([acc:vps-panel](../../registry/test-accounts.md#vps-panel)).

## Правила и граничные случаи

1. Под живой сессией `/login` сам редиректит на `/dashboard`, а `/dashboard` открывается без редиректа.
2. Неверный пароль или неверный email - остаёмся на форме логина (без перехода).
3. Без сессии защищённые маршруты (`/dashboard`, `/servers`, страница сервера) редиректят на `/login`.

## Не баг - так задумано

| Кажется багом | На самом деле | Источник |
|---|---|---|
| В списке `/servers` нет кнопки удаления | удаление VPS = отмена услуги в биллинге | KB §3, решение владельца 03-Jun-2026 |
| Кнопка входа неактивна | форма пустая - так задумано | `vps.panel.login.spec.ts` |

## Гочи для тестирования

- **DOM «врёт»:** скрытые элементы VirtFusion дают ложный зелёный на `.count()` / `toBeAttached`; ассертить
  `toBeVisible`. [Обзор VPS, гоча 1](README.md#гочи-для-тестирования).
- В доках `agents.docs/vps-panel/*` устаревший тестовый сервер `c13d2e04`; актуальный - [srv:9c49ed96](../../registry/test-servers.md#9c49ed96).

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Страница `/login`: форма, поля, заголовок, disabled на пустой форме | `vps.panel.login.spec.ts` (LOGIN-001) | ✅ |
| Валидный вход → `/dashboard`; `/login` и `/dashboard` под сессией | `vps.panel.login.spec.ts` (LOGIN-002..004) | ✅ |
| Неверный пароль / email - остаёмся на форме | `vps.panel.login.spec.ts` (LOGIN-005, 006) | ✅ |
| Без сессии - редирект на `/login` (по маршрутам) | `vps.panel.login.spec.ts` (цикл без ID) | ✅ |
| Dashboard, Servers → Manage → страница сервера | `vps.panel.server.spec.ts` (SRV-001, 002) | ✅ |
| Список `/servers`: сервер виден, All / Bookmarked, иконка закладки | `vps.panel.server.spec.ts` (SRV-005, 006) | ✅ |
| Сохранение закладки (bookmark → появился в Bookmarked) | не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| May 2026 | - | Recon HTML, спеки login / server |
| 03-Jun-2026 | - | Удалены legacy `VpsPanelServersListPage` с фантомными delete-локаторами |
