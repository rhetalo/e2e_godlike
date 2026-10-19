---
id: BIL/services-cancellation
title: Услуги в кабинете - Product Details, статусы, отмена и возврат подписки
type: feature
product: BIL
status: draft
updated: 2026-10-19
verified_on: 2026-10-19        # billing-sql: tblhosting.domainstatus, услуга 461901; экраны отмены - QA DEV-401 14-17 Aug
tickets: [DEV-401, DEV-563]
flags: [cancellation-retention-steps]
tests: []                      # спеков кабинета нет; модуль отмены - только ручной QA
sources:
  - kb/products/bil/README.md (Статусы и переходы, Правила 2-3, гоча 3)
  - kb/tickets/DEV-401.md; kb/products/up/cancel-module.md
  - memory: cancel-retention-dev401, cancel-retention-run-notes
  - billing-sql 19-Oct-2026: tblhosting, tblcancelrequests; panel-sql 19-Oct-2026: servers
---

# Услуги в кабинете - Product Details, статусы, отмена и возврат подписки

> **В двух словах.** Каждая купленная услуга (сервер) живёт в кабинете биллинга на странице Product Details.
> Оттуда клиент может запросить отмену - она открывает модуль удержания в игровой панели
> ([UP/cancel-module](../up/cancel-module.md)), - и вернуть подписку обратно. Здесь описана сторона биллинга:
> статусы услуги и откат; экраны удержания - на странице UP.

## Где в интерфейсе

- `godlike.host/clientarea/clientarea.php?action=productdetails&id=<id>` - страница услуги, кнопка **Request Cancellation**.
- После запроса: флаг «Cancellation Requested», кнопка **«Cancel the cancellation»**; на карточке тарифа баннер **«Resume your subscription»**.

## Как работает (под капотом)

- Request Cancellation уводит кросс-доменом в UP `/server/{uuid}?canceled=true` с модалкой отмены.
- Отмена = `POST cancel` из модуля; откат = `POST .../reversal`, `reverted_at` проставляется асинхронно.
- Суффикс имени сервера `_NNNNNN` = ID услуги WHMCS.

## Статусы и переходы

| Из | Событие | В |
|---|---|---|
| Active | Request Cancellation → отмена в модуле | Active до конца периода + «Cancellation Requested», открывается support-тикет |
| pending-отмена | «Cancel the cancellation» / Resume subscription | Active без флага |
| Active | пауза из модуля отмены (freeze) | Paused |
| Active | «Continue With Free Plan» | парный free-продукт ([BIL/free-products](free-products.md)) |

Статусы услуги в WHMCS (`tblhosting.domainstatus`, все 7 значений по базе, billing-sql 19-Oct-2026): **Pending, Active, Paused, Suspended, Cancelled, Terminated, Fraud**.
Какое событие переводит услугу в Cancelled, Suspended или Fraud вне отмены и trial - не описано ❓.

## Правила и граничные случаи

1. **Request Cancellation жать через ~10 с после загрузки** страницы, иначе стартует старая отмена в биллинге.
2. **Скидка 30% в модуле** требует неоплаченного инвойса (amount due > 0).
3. Флаг [cancellation-retention-steps](../../registry/flags.md#cancellation-retention-steps) считается по владельцу сервера.

## Не баг - так задумано

| Кажется багом | На самом деле | Источник |
|---|---|---|
| После отмены статус Active | WHMCS держит услугу до конца оплаченного периода | [DEV-401](../../tickets/DEV-401.md) |
| Free-шаг удержания не показан | у тарифа нет парного free-продукта | [DEV-401](../../tickets/DEV-401.md) |

## Гочи для тестирования

- **Закрытие модалки отмены после экрана reason = реальная отмена.** Откат - «Cancel the cancellation» или баннер Resume.
- Пауза - реальный Paused в WHMCS; снимать «Unpause Server» → «Undo pause».
- **Отмена [srv:43ae756d](../../registry/test-servers.md#43ae756d) не висит:** услуга 461901 в WHMCS **Terminated 14-Aug-2026** (день теста ловушки),
  хотя оплачена до 11-Sep; запросов в `tblcancelrequests` нет. В панели строка сервера осталась, `external_id = NULL`
  (billing-sql 19-Oct-2026, panel-sql). Почему отмена из модуля сработала сразу, а не в конце периода - ❓.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Request Cancellation → модуль, экраны удержания, откат | только ручной QA [DEV-401](../../tickets/DEV-401.md) | ❌ авто нет |
| Статусы услуги, инвойсы, продление | не описано и не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 14..17-Aug-2026 | [DEV-401](../../tickets/DEV-401.md) | Экраны Game Recommendation и Free Plan, QA PASS-with-issues |
