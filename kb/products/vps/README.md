---
id: VPS
title: VPS - панель VirtFusion (vf-panel.godlike.host)
type: product-overview
product: VPS
status: draft
updated: 2026-10-15
verified_on: 2026-06-19        # последний recon / handoff VPS-панели
tickets: []
flags: []
tests: [tests/vps/panel/*.spec.ts, tests/vps/funnel/*.spec.ts]
sources:
  - agents.docs/vps-panel/KNOWLEDGE_BASE.md (03-Jun-2026)
  - agents.docs/vps-panel/HANDOFF.md, TEST_PLAN.md (до 19-Jun-2026)
  - шапки спеков tests/vps/panel/*.spec.ts (селекторы и тайминги подтверждены May-Jun 2026)
  - utils/auth.ts, pages/VpsPanel*.ts, git log utils/auth.ts
  - memory: vps-funnel-restructure
---

# VPS - панель VirtFusion (vf-panel.godlike.host)

> **В двух словах.** Это панель, где клиент управляет купленным VPS: включить и выключить, переустановить
> ОС, поменять порядок загрузки, посмотреть сеть и диск, открыть VNC-консоль. Панель - готовый продукт
> VirtFusion, не наша разработка. Покупка VPS идёт через витрину и биллинг, а **удаления сервера в
> панели нет** - это отмена услуги в биллинге. Тесты гоняются на живом проде по cron каждое утро.

## Как устроено

| Что | Факт | Источник |
|---|---|---|
| Адрес | `https://vf-panel.godlike.host` | KB §1 |
| Движок | VirtFusion: Bootstrap-модалки (`.modal.show`), частично Vue | KB §1 |
| Вход | email + пароль, env `PANEL_EMAIL` / `PANEL_PASSWORD`, сессия `storageState.panel.json` ([acc:vps-panel](../../registry/test-accounts.md#vps-panel)) | `utils/auth.ts` |
| Тестовый сервер | [srv:9c49ed96](../../registry/test-servers.md#9c49ed96) (`TEST_SERVER_UUID` в `utils/auth.ts`, с 10-Jun-2026) | git log |
| Обновление статуса | VirtFusion поллит примерно раз в 2 с | шапка power.actions |
| Задачи | каждое действие пишет строку в activity table (`table.table-normal`), готово = бейдж `Complete` (`span.badge.badge-active`) | шапки спеков |
| Автотесты | проект Playwright `vps-panel` (`tests/vps/panel/`), воронка - `vps-funnel` (`tests/vps/funnel/`) | `playwright.config.ts` |

**Связь с соседними продуктами.**
- **Покупка (Install)** - витрина `/vps-hosting/` → корзина `cart-vps` → чекаут WHMCS (WPGL + BIL). Покрыта воронкой до чекаута.
- **Удаление** - только отмена услуги в биллинге (BIL). В списке `/servers` у сервера есть только **Manage**.

## Карта разделов

Маршруты: `/login`, `/dashboard`, `/servers`, `/server/{uuid}`. Страница сервера - вкладки.

| Раздел | Что это | Автотесты | Знания |
|---|---|---|---|
| Вход | Форма email + пароль, редирект на `/dashboard`; без сессии - на `/login` | `vps.panel.login` (LOGIN-001..006 + редиректы) | ✅ |
| Dashboard и Servers | `/dashboard`, список `/servers` (All / Bookmarked, закладки), кнопка Manage | `vps.panel.server` (SRV-001, 002, 005, 006) | ✅ |
| Страница сервера | Имя, статус, power-кнопки, вкладки | `vps.panel.server` (SRV-003, 004 + вкладки) | ✅ |
| Power | Boot, Shutdown, Power Off, Restart + activity table | `vps.panel.power.actions` (PWR-001..006) | ✅ |
| Rebuild | Переустановка ОС: выбор шаблона → Install | `vps.panel.rebuild.*` (RBD-001..005, BUILD-001) | ✅ |
| Media | Boot Order: HDD / CD/DVD → Apply | `vps.panel.media` (MED-001..003) | ✅ |
| Network | Primary Network (IPv4), Statistics (Plotly-график), Reverse DNS, DNS resolver | `vps.panel.network` (NET-001..003) | ✅ |
| Storage | Карточка диска «Drive: A», Primary, размер в GB - только просмотр | `vps.panel.storage` (STG-001) | ✅ |
| Options | Под-табы VNC / Rescue / Password / Settings (Boot Type BIOS / UEFI) | `vps.panel.options` (OPT-001..004) | ⚠️ Rescue не покрыт |
| Воронка покупки | `/vps-hosting/` → `cart-vps` → WHMCS | `vps.funnel.*` (happy-path, configure, billing) | ⚠️ описано только в памяти |

## Статусы и переходы

Статус сервера (`div.p-3`): **Running**, **Stopped**, **Paused**, **Building**. Регистр бывает разный (`RUNNING` / `Running`) - нормализовать.

| Из | Действие | В | Окно подтверждения | Время (activity, May 2026) |
|---|---|---|---|---|
| Running | Shutdown | Stopped | да | 6-43 с |
| Running | Power Off | Stopped | да | 3-5 с |
| Stopped | Boot | Running | нет (кнопка disabled при Running) | 3-5 с |
| Running | Restart | Running (без перехода в Stopped) | да | ~10 с |
| любой | Rebuild → выбор ОС → Install → «Install Without» (SSH-ключ) | Building → Running | да | ~30 с до Running |

Источник: шапка `vps.panel.power.actions.spec.ts`, [TEST_PLAN](../../../agents.docs/vps-panel/TEST_PLAN.md).

## Rebuild (переустановка ОС)

1. Страница сервера → **Rebuild** (`button[data-bs-target="#reinstallServerModal"]`) → окно → **Continue**.
2. Страница «Server Setup»: карточки ОС `div.card.os-select` (15+), аккордеоны-семейства AlmaLinux, CentOS, Debian, Fedora, Games, Ubuntu; Swap Space.
3. Выбор карточки → `.selected-card.border-success`, появляется кнопка **«Install with {OS}»**.
4. Install → окно про SSH-ключ → **Install Without** → задача Build → Complete → Running.

- **Rebuild доступен в любом статусе,** включая Stopped.
- **Незавершённый выбор ОС оставляет сервер в «Server Setup»** (баннер «Cancel Rebuild»). UI-тесты, дошедшие до выбора ОС,
  должны жать Cancel; реальный rebuild это состояние «расшибает». Источник: TEST_PLAN «Находки».

## Правила и граничные случаи

1. **Удаления сервера в панели нет** - решение владельца 03-Jun-2026: Delete вне скоупа автотестов.
2. **Reset Password** может быть disabled на выключенном сервере; сам сброс шлёт письмо (окно с текстом про email).
3. **VNC toggle** обратим, создаёт задачу в activity.
4. **Rescue** - под-таб есть, не покрыт и не описан ❓.
5. **Воронка:** на лендинге тогглы Performance × Service прячут неактивные планы (`display:none`), у части тарифов (Nitro 1,
   productId 1005) нет периода 1 месяц - только 3 / 6 / 12. Источник: memory vps-funnel-restructure (17-Jul-2026).

## Не баг - так задумано

| Кажется багом | На самом деле |
|---|---|
| Нет кнопки удаления сервера | удаление = отмена услуги в биллинге |
| Restart не показывает Stopped | VirtFusion перезапускает без промежуточного статуса |
| Boot неактивна | сервер уже Running |

## Гочи для тестирования

1. **DOM «врёт».** VirtFusion держит в разметке закрытые модалки и скрытые `<input>`. `.count()`, `toBeAttached`, `:has-text`,
   `.first()` без проверки видимости зеленеют на фантоме. Модалки скоупить через `.modal.show`, кнопки фильтровать
   `:not([data-bs-dismiss="modal"])`. Сомнения - сверять скриншотами. KB §2.
2. **Radio Boot Order:** плитку `.radio-tile` кликать нельзя, только `radio.check()`; рабочее состояние = ровно один radio `checked`.
3. **Кнопки без `data-action`** - все селекторы через `VpsPanelServerPage`.
4. **Power и rebuild - stateful:** `serial`, общий сервер, `afterAll` возвращает в Running, `test.setTimeout(180s)`.
5. **Activity table:** debug-строки исключать (`:has()`), ждать новую строку и бейдж Complete.
6. **Flash-sale модалка** на витрине перехватывает клики в воронке - гасится `CookieBanner.dismissAll()` в `VpsPage.goto`.

## Что устарело в источниках

1. **Тестовый сервер:** `agents.docs/vps-panel/*` пишут `c13d2e04` (srv-433986). В коде с 04..10-Jun-2026 сменились
   `666b12fd` → `3bf4ed84` → **`9c49ed96`** (актуальный). Переустановка ОС разрешена
   на всех VPS владельца (подтверждено 15-Oct-2026).
2. **Имена спеков:** доки упоминают монолиты `vps.funnel.spec.ts` и `vps.panel.rebuild.spec.ts` - они разбиты на
   `vps.funnel.{happy-path,configure,billing}` и `vps.panel.rebuild.{os-selection,selection,real}`.
3. **`vps.build.spec.ts`, `VpsPanelServerDetailPage`, `VpsPanelServersListPage`** удалены 03-Jun-2026 (legacy с фантомными локаторами).

## Пробелы

1. Rescue-режим, VNC-консоль изнутри, смена DNS resolver, сохранение Reverse DNS - не разведаны.
2. Сколько VPS на тест-аккаунте и под что каждый - в [реестре серверов](../../registry/test-servers.md#vps-virtfusion) только актуальный.
3. Есть ли stage для VPS - ❓ ([env](../../registry/environments.md)).
4. Тарифы, апгрейд, продление VPS со стороны биллинга - не описаны.
