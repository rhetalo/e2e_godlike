---
id: WPGL/custom-modpack-setup
title: Custom Modpack Setup - «соберём модпак за тебя»
type: feature
product: WPGL
status: draft
updated: 2026-10-18
verified_on: 2026-09-28        # QA DEV-458 / DEV-459 на проде; 18-Oct - апселл в панели перед окном CurseForge
tickets: [DEV-458, DEV-459]
flags: []
tests: []                      # спеков витрины нет; апселл в панели проходит TC-GP-CF-001 (UP/files)
sources:
  - kb/tickets/DEV-458.md, DEV-459.md
  - memory: custom-modpack-setup-qa
  - коммит 3df605e (18-Oct-2026): CF-001 - апселл Modpack setup перед окном CurseForge
---

# Custom Modpack Setup - «соберём модпак за тебя»

> **В двух словах.** Платная разовая услуга: команда Godlike сама собирает, настраивает и тестирует модпак на
> сервере клиента. Тарифы **Lite** (до 30 модов, €9.99) и **Pro** (до 60 модов, €17.99), готово за 12-24 часа.
> Продаётся со страницы `/custom-modpack-setup/`, а входов в неё четыре - на сайте и в игровой панели.

## Где в интерфейсе

- Sales-страница `/custom-modpack-setup/` (шаблон `modpack-setup-cart.php`, виджет `#modpack-setup-cart` в Shadow DOM), выбор Lite / Pro.
- **Входы** ([DEV-459](../../tickets/DEV-459.md)): страница modded-хостинга (`?tier=lite`), [конструктор](modpack-constructor.md) (`?tier=lite`),
  вкладка Modpacks в панели (`?serviceid=<id>`), папка `/mods` в Files панели.
- В панели перед окном загрузки CurseForge-модпака всплывает апселл **Modpack setup** (Lite / Pro, «I'll upload it myself»,
  «Order now») - [UP/files](../up/files.md).

## Как работает (под капотом)

- Оплата - через WHMCS как one-time add-on к серверу ([DEV-458](../../tickets/DEV-458.md)).
- После оплаты задумано авто-письмо «Let's build your custom modpack! Next steps for your server» со ссылкой на создание тикета, где клиент передаёт список модов.

## Правила и граничные случаи

1. **Блокер запуска на 28-Sep-2026:** письмо после оплаты не приходит - передать моды нечем ([DEV-458/F-EMAIL](../../tickets/DEV-458.md#находки)). Ре-теста после фикса в источниках нет ❓.
2. Server-type при заказе только Forge / Fabric, NeoForge - переключить в панели после заказа.
3. На чекауте WHMCS одна строка Total, без двух позиций (low).

## Не баг - так задумано

| Кажется багом | На самом деле | Источник |
|---|---|---|
| После оплаты нет формы сбора модов | форма вынесена из скоупа, вместо неё письмо со ссылкой на тикет | [DEV-458](../../tickets/DEV-458.md) |
| Витрина €35.98, чекаут $44.98 | специфика аккаунта: валюта, промо, овердью | [DEV-458](../../tickets/DEV-458.md) |

## Гочи для тестирования

- Виджет в Shadow DOM: `querySelector` в `page.evaluate` его не видит.
- **Order now в апселле и оплату не жать** - реальный заказ. В панели тест проходит апселл через «I'll upload it myself».

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Апселл в панели перед окном CurseForge → «I'll upload it myself» | `files.structure.spec.ts` (TC-GP-CF-001, игровая панель) | ✅ |
| 4 входа ведут на sales-страницу с параметрами | только ручной QA [DEV-459](../../tickets/DEV-459.md) | ❌ авто нет |
| Покупка, письмо после оплаты, тикет | только ручной QA [DEV-458](../../tickets/DEV-458.md) | ❌ авто нет |

## История

| Дата | Тикет | Что |
|---|---|---|
| 25..28-Sep-2026 | [DEV-458](../../tickets/DEV-458.md), [DEV-459](../../tickets/DEV-459.md) | QA: входы PASS, письмо после оплаты не приходит (FAIL) |
| 18-Oct-2026 | - | Апселл Modpack setup в панели перед окном CurseForge, тест CF-001 обновлён |
