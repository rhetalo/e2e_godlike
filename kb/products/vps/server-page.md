---
id: VPS/server-page
title: Страница сервера VPS - статус, кнопки питания и вкладки
type: feature
product: VPS
status: draft
updated: 2026-10-18
verified_on: 2026-06-19        # vps.panel.server зелёный на handoff 19-Jun; HTML - recon May 2026
tickets: []
flags: []
tests: [tests/vps/panel/vps.panel.server.spec.ts]
sources:
  - agents.docs/vps-panel/KNOWLEDGE_BASE.md §2, §6 (03-Jun-2026)
  - шапки tests/vps/panel/vps.panel.server.spec.ts, vps.panel.power.actions.spec.ts
  - pages/VpsPanelServerPage.ts (эталонный PO)
---

# Страница сервера VPS - статус, кнопки питания и вкладки

> **В двух словах.** `/server/{uuid}` - главный экран управления одним VPS. Сверху имя, статус и кнопки
> питания, ниже вкладки разделов. Каждое действие с сервером пишет строку в таблицу задач (activity table),
> и готовность действия видна по бейджу **Complete**. Отдельные разделы описаны своими страницами:
> [питание](power.md), [Rebuild](rebuild.md), [Media](media.md), [Options](options.md), [Network](network.md), [Storage](storage.md).

## Где в интерфейсе

- Шапка: имя сервера, статус (`div.p-3`): **Running** / **Stopped** / **Paused** / **Building**.
- Кнопки питания: Boot, Shutdown, Power Off, Restart, плюс **Rebuild** - [Power](power.md), [Rebuild](rebuild.md).
- Вкладки: **Overview**, **Media**, **Options**, **Network**, **Storage**, **Sharing**.
- Activity table (`table.table-normal`): строка на каждую задачу, бейдж `Complete` (`span.badge.badge-active`), прогресс и длительность.

## Как работает (под капотом)

- VirtFusion обновляет статус поллингом примерно раз в 2 с. Шапка `vps.panel.power.actions.spec.ts`.
- У кнопок нет `data-action`, поэтому все селекторы собраны в `VpsPanelServerPage` - эталонный PO панели. KB §6.
- Подтверждения действий - Bootstrap-модалки; открытая = `.modal.show`, закрытые остаются в разметке.

## Правила и граничные случаи

1. **Регистр статуса плавает** (`RUNNING` / `Running`) - читать только через `getStatusText()` и нормализовать.
2. **Boot всегда в DOM**, при Running он disabled - проверять доступность, а не наличие.
3. Вкладка **Sharing** есть, но не разведана ❓.

## Гочи для тестирования

- **DOM «врёт»:** модалки скоупить `.modal.show`, кнопки фильтровать `:not([data-bs-dismiss="modal"])`, всегда гейт `toBeVisible`. KB §2.
- **Activity table:** исключать debug-строки (`:has()`), ждать НОВУЮ строку и только потом бейдж Complete.
- Тестовый сервер - [srv:9c49ed96](../../registry/test-servers.md#9c49ed96); `c13d2e04` из agents.docs устарел.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Имя сервера и валидный статус | `vps.panel.server.spec.ts` (SRV-003) | ✅ |
| Кнопки питания присутствуют (smoke) | `vps.panel.server.spec.ts` (SRV-004) | ✅ |
| Каждая вкладка кликабельна и становится активной | `vps.panel.server.spec.ts` (цикл по 6 вкладкам, без ID) | ✅ |
| Вкладка Sharing - содержимое | не разведано ❓ | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| May 2026 | - | Recon HTML, эталонный `VpsPanelServerPage` |
| 03-Jun-2026 | - | Удалён legacy `VpsPanelServerDetailPage` (фантомные селекторы) |
