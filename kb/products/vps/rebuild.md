---
id: VPS/rebuild
title: Rebuild VPS - переустановка ОС
type: feature
product: VPS
status: draft
updated: 2026-10-18
verified_on: 2026-06-19        # реальный rebuild зелёный (HANDOFF 19-Jun); разрешение на всех VPS - 15-Oct
tickets: []
flags: []
tests:
  - tests/vps/panel/vps.panel.rebuild.os-selection.spec.ts
  - tests/vps/panel/vps.panel.rebuild.selection.spec.ts
  - tests/vps/panel/vps.panel.rebuild.real.spec.ts
sources:
  - agents.docs/vps-panel/KNOWLEDGE_BASE.md §3, §5; TEST_PLAN.md (Сделано, Находки); HANDOFF.md
  - шапки tests/vps/panel/vps.panel.rebuild.*.spec.ts, vps.panel.rebuild.helpers.ts
  - pages/VpsPanelRebuildPage.ts
---

# Rebuild VPS - переустановка ОС

> **В двух словах.** Rebuild стирает диск VPS и ставит выбранную ОС заново. Клиент выбирает шаблон
> (Ubuntu, Debian, AlmaLinux и т.д.), жмёт Install, отказывается от SSH-ключа или добавляет его - и через
> ~30 секунд сервер снова Running на чистой системе. Это и есть «Build» из ТЗ Install / Build / Delete:
> покупка - в [воронке](purchase-funnel.md), удаления в панели нет.

## Где в интерфейсе

1. [Страница сервера](server-page.md) → **Rebuild** (`button[data-bs-target="#reinstallServerModal"]`) → модалка → **Continue**.
2. Экран «Server Setup»: карточки ОС `div.card.os-select` (15+), аккордеоны-группы **AlmaLinux, CentOS, Debian, Fedora, Games, Ubuntu**, секция **Swap Space**.
3. Клик по карточке → `.selected-card.border-success`, появляется кнопка **«Install with {OS}»**.
4. Install → модалка про SSH-ключ → **Install Without** → задача Build в activity table → Complete → Running.

## Статусы и переходы

| Из | Действие | В | Время |
|---|---|---|---|
| любой (вкл. Stopped) | Rebuild → ОС → Install → Install Without | Building → Running | ~30 с до Running |
| любой | Rebuild → Continue, ОС не выбрана, ушли | остаётся «Server Setup» с баннером **Cancel Rebuild** | - |

## Правила и граничные случаи

1. **Rebuild доступен в любом статусе питания,** включая Stopped - `ensureRunning` перед ним не нужен.
2. **Выбор ОС - single-select:** вторая карточка снимает выделение с первой; до выбора кнопки Install нет,
   при смене карточки меняется название ОС на кнопке.
3. **Незавершённый выбор оставляет сервер в «Server Setup»** (pending). Реальный rebuild это состояние «расшибает».
4. Переустановка ОС разрешена владельцем на **всех** его VPS (15-Oct-2026), основной - [srv:9c49ed96](../../registry/test-servers.md#9c49ed96).

## Гочи для тестирования

- **UI-тесты, дошедшие до выбора ОС, обязаны выйти чисто** (Cancel / возврат на сервер), иначе сервер залипает в pending.
- **Не делать early-return «уже на странице ОС»:** во время отмены карточки видны, а аккордеоны ещё не кликабельны -
  `expandAccordion` таймаутит. Только чистый Rebuild → Continue (`openRebuildPage()` в `vps.panel.rebuild.helpers.ts`).
- Кнопка Rebuild после Cancel появляется не сразу - ждать с таймаутом; редкий transient даёт 1 skip, не падение.
- **Реальный rebuild деструктивен:** отдельный файл `vps.panel.rebuild.real.spec.ts`, `@critical`, serial, гонять осознанно.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Страница выбора: 15+ карточек ОС с названиями, ничего не выбрано | `vps.panel.rebuild.os-selection.spec.ts` (RBD-001) | ✅ |
| Аккордеон: 6 групп, свёрнуты, раскрытие показывает шаблоны | `vps.panel.rebuild.os-selection.spec.ts` (RBD-002) | ✅ |
| Single-select карточек | `vps.panel.rebuild.selection.spec.ts` (RBD-003) | ✅ |
| Кнопка Install: нет до выбора, название ОС, Swap Space | `vps.panel.rebuild.selection.spec.ts` (RBD-004) | ✅ |
| Возврат на сервер без Install - rebuild не запущен | `vps.panel.rebuild.selection.spec.ts` (RBD-005) | ✅ |
| Реальный rebuild → Build → Complete → Running | `vps.panel.rebuild.real.spec.ts` (BUILD-001) | ✅ |
| Rebuild с SSH-ключом | не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 03-Jun-2026 | - | Реальный rebuild покрыт, legacy `vps.build.spec.ts` удалён, найдено pending-состояние «Server Setup» |
| 19-Jun-2026 | - | Rebuild-спек разбит на os-selection / selection / real |
| 15-Oct-2026 | - | Владелец разрешил rebuild на всех своих VPS |
