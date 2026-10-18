---
id: BIL/addons-trials
title: Add-on Custom Modpack Setup и trial конструктора модпаков
type: feature
product: BIL
status: draft
updated: 2026-10-18
verified_on: 2026-09-28        # QA DEV-458; trial - memory modpack-constructor-trial-funnel
tickets: [DEV-458]
flags: []
tests: [tests/funnels/funnel.modpack-constructor.spec.ts]
sources:
  - kb/products/bil/README.md (Карта разделов, Статусы и переходы)
  - kb/tickets/DEV-458.md; memory: custom-modpack-setup-qa, modpack-constructor-trial-funnel
---

# Add-on Custom Modpack Setup и trial конструктора модпаков

> **В двух словах.** Два особых продукта биллинга. **Custom Modpack Setup** - разовый add-on к серверу (Lite / Pro),
> продаётся со страницы витрины ([WPGL/custom-modpack-setup](../wpgl/custom-modpack-setup.md)). **Trial** - бесплатный
> 3-часовой сервер со сборкой из [конструктора модпаков](../wpgl/modpack-constructor.md), который суспендится без оплаты.

## Как работает (под капотом)

| Продукт | ID в WHMCS | Как создаётся |
|---|---|---|
| Custom Modpack Setup Lite | 1217 | one-time add-on, `product_features.php?action=modpack_setup_order` |
| Custom Modpack Setup Pro | 1218 | то же |
| Trial конструктора | pid 343 (customfield 1887 = `mod_test_session_id`) | `POST api-cart.php` → `POST product_features.php?action=trial` |

- Trial: успех → редирект на `clientarea.php?action=productdetails&id=<id>`; при активном trial - **409** «An active trial already exists for this client.»

## Статусы и переходы

| Из | Событие | В |
|---|---|---|
| trial активен | 3 ч без оплаты | Suspended |
| Suspended | 72 ч | terminate |

Активный или suspended trial блокирует новый: один на клиента.

## Правила и граничные случаи

1. **После оплаты Custom Modpack Setup письмо со ссылкой на тикет не приходит** - блокер запуска на 28-Sep ([DEV-458/F-EMAIL](../../tickets/DEV-458.md#находки)) ❓ ре-тест.
2. NeoForge в заказе add-on нет - так в каталоге конфиг-опций; переключается в панели после заказа.
3. На чекауте add-on одна строка Total без разбивки ([BIL/payments](payments.md)).

## Гочи для тестирования

- **Сабмит trial не проверяем** - флакает (редирект или 409), одна демо-сессия на аккаунт.
- Покупка add-on - реальный заказ; QA делался с кредитного баланса на чистом аккаунте.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Путь конструктора до страницы триалки (без сабмита) | `funnel.modpack-constructor.spec.ts` | ✅ |
| Создание trial, 409, суспенд и terminate | не покрыто | ❌ |
| Покупка add-on, письмо, тикет | только ручной QA [DEV-458](../../tickets/DEV-458.md) | ❌ авто нет |

## История

| Дата | Тикет | Что |
|---|---|---|
| 25..28-Sep-2026 | [DEV-458](../../tickets/DEV-458.md) | Add-on продаётся и создаётся, письмо после оплаты не приходит (FAIL) |
