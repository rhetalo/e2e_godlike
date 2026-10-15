---
id: UP/cancel-module
title: Cancel module - отмена сервера, пауза и удержание
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-08-17        # последняя живая сверка - ре-прогон DEV-401
tickets: [DEV-401, DEV-418]
flags: [cancellation-retention-steps, cancel-new-inpanel]
tests: []                      # автотеста нет: ждёт раскатки флага
sources:
  - kb/tickets/DEV-401.md
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §11 (recon 23-24-Jun-2026)
  - test-docs/ultra.panel/cancel-retention-REPORT.md, cancel-retention-testplan.md
  - memory: cancel-retention-dev401, cancel-retention-run-notes
---

# Cancel module - отмена сервера, пауза и удержание

> **В двух словах.** Когда клиент нажимает «Request Cancellation» в биллинге, открывается модуль отмены в
> игровой панели. Он пытается удержать клиента: поставить сервер на паузу, сменить тариф или игру, дать
> скидку, перевести на бесплатный план - и только потом отменяет. Это **реальные** действия с услугой в
> WHMCS (пауза, отмена), поэтому тестировать надо аккуратно и знать, как откатить. Есть A/B двух вариантов
> модуля и флаг новых экранов удержания ([DEV-401](../../tickets/DEV-401.md)).

## Где в интерфейсе

- **Вход:** clientarea → Product Details (`godlike.host/clientarea/clientarea.php?action=productdetails&id=<whmcsId>`) →
  **Request Cancellation** → кросс-домен в UP `/server/{uuid}?canceled=true`, модалка поверх Overview. Источник: §11.
- **Два варианта модуля** (A/B [flag:cancel-new-inpanel](../../registry/flags.md#cancel-new-inpanel)):

| Вариант | Модалка | Экран 1 | После «Cancel Plan» |
|---|---|---|---|
| `old_with_hytale` | `.old-cancellation-modal` | «Confirm Cancellation»: Change Plan, Cancel Plan | «Switch to Hytale?» → Important Information (1/4) → Select a reason (2/4) → Special Offer (3) → Final Confirmation (4/4) → Plan Cancelled |
| `new_with_freez` | `.cancellation-modal` | «Confirm Cancellation / We'll miss your server!»: Select pause period, Change Plan, Cancel Plan | «Select a reason»: Go to Pause Plan, Back, Continue |

- **Пауза** (вариант freeze): карточки 30 / 60 / 90 дней → «Pause my subscription». Снятие: «Unpause Server» → окно → «Undo pause».
- **Экраны удержания** (под [flag:cancellation-retention-steps](../../registry/flags.md#cancellation-retention-steps)), маршрут:
  Confirm Cancellation → Cancel Plan → **[Game Recommendation]** → Select a reason → **[Скидка 30%]** → **[Free Plan]** →
  «Proceed to Cancellation» → Plan Cancelled. Каждый шаг в скобках молча пропускается, если условие не выполнено.
- **Plan Cancelled:** «Undo Cancellation» / «Reactivate Server», «View Free Hosting», «Open Your Ticket».
- **Откат в биллинге:** баннер «Resume your subscription» на карточке тарифа, кнопка «Cancel the cancellation» на странице услуги.

## Как работает (под капотом)

- **Оракул экранов удержания:** `GET panel.godlike.host/api/v2/whmcs/cancel/{fullUuid}/retention-context` - lifetime,
  игры, бейдж %, `discount.available`, `free_plan`. UI сверяется с ним. Источник: [DEV-401](../../tickets/DEV-401.md).
- **Game Recommendation:** 3 игры из RAM-корзины сервера (`<6` / `6-15` / `≥16` GB), текущая исключается по egg.
  «Play [Game]» реально меняет игру: `POST change-egg-by-uuid` = reinstall + удаление файлов, на MC - окно
  [World Backup](world-backup.md). Бейдж -20% - только при lifetime ≥27 дней.
- **Скидка 30%:** lifetime ≥27 дней И неоплаченный инвойс И не trial И скидку раньше не брали.
- **Free Plan:** «Continue With Free Plan» → `POST .../free-plan`, сервер переходит на парный free-продукт (MC Java/Bedrock 282,
  Unturned 285, Terraria 286, Core Keeper 299, Enshrouded 316 ...). Условия: парный продукт есть, локация не free-queue,
  мир влезает или (большой мир и когорта World Backup). Общий ли free-слот с PROD-126 ❓.
- **Отмена:** «Proceed to Cancellation» сразу шлёт `POST cancel` (финального Confirm нет). Откат - `POST .../reversal`,
  `reverted_at` проставляется асинхронно.
- **Аналитика:** события уходят не в Amplitude из браузера, а на бэкенд
  `POST panel.godlike.host/api/v2/whmcs/cancel/{fullUuid}/event?locale=en` с телом `{"event":"<event_type>", ...}`, бэк
  форвардит в Amplitude. `start_cancel_request` и частично `view_cancel_module` - server-side, в Network браузера не видны.
  Sub-step события через `_` (`..._2_1`), точку Amplitude не принимает. Источник: §11.
- **Флаг удержания считается по владельцу сервера**, не по зрителю. На 14-Aug включён только на [acc:admin](../../registry/test-accounts.md#admin).

## Правила и граничные случаи

1. **Закрытие модалки X / Esc после экрана reason = реальная отмена** (`POST cancel`). By design по решению владельца
   ([DEV-401/F6](../../tickets/DEV-401.md#находки)).
2. **Пауза = реальный Paused в WHMCS.** WHMCS pending-cancellation держит статус Active до конца оплаченного периода,
   поэтому проверять текст «Cancellation Requested», а не только статус. Источник: §11.
3. **Deep-link `?canceled=true` ≠ кнопка Request Cancellation:** не шлёт клик-событие входа. Роут `/server/{id}/admin` - инертный fixture-режим.
4. **«Request Cancellation» жать после полной загрузки страницы** (~10 с), иначе запускается старая отмена в биллинге
   или уводит на `ultra.panel/login`.
5. **Вариант A/B назначается случайно по device_id** на каждый свежий контекст.
6. **OLD «View Free Hosting» вёл на 404** `godlike.host/free-minecraft-hosting-en/` (баг из recon 23-Jun, ❓ статус).
7. **«Resume your subscription» иногда отвечает «This service has no cancellation to reverse»** - интермиттентно
   ([DEV-401/F8](../../tickets/DEV-401.md#находки)).
8. **Каждая отмена открывает support-тикет.**

## Гочи для тестирования

- **Кнопки модуля срабатывают только через `locator.dispatchEvent('click')`** - обычный `.click()` перехватывает оверлей
  `.v-btn__overlay`, экран «залипает». Карточки паузы 30/60/90 - не `<button>`. Источник: §11.
- **Пиннинг A/B:** `context.route` на `api.lab.eu.amplitude.com/sdk/v2/vardata` + пред-засев LS `amp-exp-$default_instance-u6z6Wv`
  (расширение `pinAmplitudeExperiments`, сейчас scoped на витрину).
- **Перехват событий:** `page.on('request')` по `/whmcs\/cancel\/[^/]+\/event/`, а не по домену Amplitude.
- **Откат обязателен:** «Cancel the cancellation» в clientarea или «Reactivate Server» сразу после отмены; пауза - «Unpause Server» → «Undo pause».
  Повторный вход в модуль Undo не даёт.
- Серверы прогонов: [srv:09f8d87d](../../registry/test-servers.md#09f8d87d), [srv:feede8c1](../../registry/test-servers.md#feede8c1)
  (оба переведены на free), [srv:7c7745c8](../../registry/test-servers.md#7c7745c8), [srv:2c8c5f83](../../registry/test-servers.md#2c8c5f83),
  события - [srv:c2b09498](../../registry/test-servers.md#c2b09498). [srv:43ae756d](../../registry/test-servers.md#43ae756d) -
  висит ли отмена в WHMCS ❓.

## Покрытие

- **Автотестов нет.** Решение: писать после раскатки флага на всех ([DEV-401](../../tickets/DEV-401.md#хвосты)).
- Ручной QA: события обеих воронок (23-24-Jun, KNOWLEDGE_BASE §11), экраны удержания
  ([cancel-retention-REPORT.md](../../../test-docs/ultra.panel/cancel-retention-REPORT.md), 14-17-Aug).
- Не проверено: экран скидки 30% и события `cancel_discount_offer_*` (нужен сервер с неоплаченным инвойсом), «Open Your Ticket»,
  перепроверка [DEV-401/F5, F7, F8](../../tickets/DEV-401.md#находки).

## История

| Дата | Тикет | Что |
|---|---|---|
| 23..24-Jun-2026 | - (dev-таска «события Cancel Module на бэкенде», ❓ ключ) | Recon модуля, A/B old/new, все события воронок доходят |
| 14..17-Aug-2026 | [DEV-401](../../tickets/DEV-401.md) | Экраны Game Recommendation и Free Plan, блокеры F1-F4, F9 исправлены |
| 14..17-Aug-2026 | [DEV-418](../../tickets/DEV-418.md) | Окно World Backup при смене игры |
