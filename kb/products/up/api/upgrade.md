---
id: UP/api/upgrade
title: API - апгрейд тарифа (вариант A/B, события страницы, котировка и оплата)
type: api
product: UP
status: verified
updated: 2026-11-12
verified_on: 2026-11-03
tickets: [DEV-528, DEV-660, DEV-662]
features: [UP/upgrade]
sources:
  - kb/tickets/DEV-528.md
  - test-docs/ultra.panel/DEV-528/RESULTS.md (не в git)
  - MR panel!1671, billing!718, new-panel!550 (описания и шаги QA)
  - memory: dev528-boost-next-plan-ab
---

# API - апгрейд тарифа

> **В двух словах.** Страница апгрейда (`/server/{id}/upgrade`) спрашивает у панели вариант A/B, считает цену, шлёт события страницы
> и платит в два шага: котировка (`POST /upgrades`) и оплата (`POST /upgrades/{uuid}/pay`). С [DEV-528](../../../tickets/DEV-528.md)
> котировка несёт разметку захода (`open_id`, `ab_variant`, `preselect_applied`), которая доезжает до биллинга и события `upgrade`.

## Эндпоинты

| Метод | Путь | Что делает | Проверено |
|---|---|---|---|
| GET | `/experiments/upgrade-next-plan` | вариант A/B текущего пользователя | ✅ 03-Nov |
| POST | `/tariffs-new/upgrade` | расчёт цены (`calc_only: true`) | ✅ |
| POST | `/servers/{uuid}/upgrade-page/events` | событие страницы апгрейда (fire-and-forget) | ✅ |
| POST | `/upgrades` | котировка: создаёт intent, возвращает `uuid`, цену, срок | ✅ |
| POST | `/upgrades/{uuid}/pay` | оплата intent | ✅ |
| GET / POST | `/plan/{uuid}/discard` | откатываемый счёт (`data` или `null`) / откат последнего апгрейда (Discard changes) | ✅ 12-Nov |
| GET | `/tariffs-new/{service_id}/list`, `/billing/{service_id}/current` | тарифы и текущий план | ✅ (см. [UP/upgrade](../upgrade.md)) |

### GET /experiments/upgrade-next-plan
- Ответ: `{"success":true,"variant":"off"|"control"|"treatment"}`. Гость - 401 `Unauthenticated.` ✅
- Режим из `settings::godlike:upgrade:next_plan_ab_mode` (`off` по умолчанию, `50`, `all`), при `50` группа = sha256(`dev528:` + WHMCS client id).
  Поверх режима QA-allowlist `settings::godlike:upgrade:next_plan_ab_qa` (`<client>:<group>,...`) ✅. Без `external_id` → `off` 📖.
- Ключа эксперимента в `GET /features` нет ✅.
- Фронт спрашивает вариант только у владельца и только при Boost на сервере, где предложение возможно (у бесплатного запроса нет) ✅.
  Таймаут 5 с, ошибка или таймаут → экран control, но в событиях и оплате `variant`/`ab_variant=error` (с 04-Nov-2026, фикс [DEV-528/F1](../../../tickets/DEV-528.md#находки)); сервер в `ab_group` пишет назначенную группу ✅.

### POST /tariffs-new/upgrade (расчёт)
- Тело: `external_id` (id услуги WHMCS), `product_id`, `billing_cycle`, `config_options` `[[option, value], ...]`, `calc_only: true`, `promocode`.
- Ответ: `price`, `old_price`, `is_discounted`. На проде около 5 с ✅.

### POST /servers/{uuid}/upgrade-page/events
- Всегда 202 без тела. Гость 401, чужой сервер 400 `The requested resource does not exist on this server.` ✅. Админ на чужом сервере - 202 без отправки 📖.
- `throttle:60,1`. `hosting_id`, `viewer`, `environment`, `user_id`, `client_id`, `ab_group` из тела не принимаются, их ставит сервер 📖.
- События и поля (сверено в Amplitude 03-Nov ✅):

| Событие | Ключевые поля |
|---|---|
| `upgrade_page_opened` | `open_id`, `step=0`, `entry`, `flow_name`, `variant`/`ab_group`, `preselect_applied`, `preselect_reason` (ok, not_boost, free...), `would_be_eligible`, `target_pid`, `current_pid`, `current_plan`, `current_plan_type`, `current_billing_cycle`, `is_free`, `total_due_today`, `viewer` |
| `upgrade_config_changed` | `param` (ram, cpu, ssd, cloud_backups, billing_cycle, plan_type), `value_before`, `value_after`, `total_due_today_after`, `pid_after`, `plan_after`, `plan_type_after`, `superseded`, `surface` |
| `upgrade_all_plans_toggled` | `open_id`, `step` |
| `upgrade_cta_clicked`, `upgrade_confirm_clicked` | `final_pid`, `final_plan`, `final_plan_type`, `final_ram/cpu/ssd/cloud_backups/billing_cycle`, `total_due_today`, `changes_count`, `final_is_target`, `surface` |

- `opened` уходит после ответа расчёта цены ([DEV-528/O1](../../../tickets/DEV-528.md#находки)). Параметр `game` до Amplitude не доходит.

### POST /upgrades (котировка)
- Тело: как у расчёта без `calc_only` + `flow_name`, `open_id` (uuid), `ab_variant` (off/control/treatment/error), `preselect_applied` (bool). Заголовок `Idempotency-Key`.
- 201: `{"data":{"uuid","price","old_price","is_discounted","expires_at"}}` ✅.
- Невалидные `open_id`, `ab_variant`, `preselect_applied` → 422, intent не создаётся ✅.
- Пишет строку в `upgrade_intents` (panel DB) с полями разметки ✅.
- С 10-Nov-2026 ([DEV-662](../../../tickets/DEV-662.md), panel!1778): последняя оплаченная попытка сервиса за 6 ч купила то же (план + цикл + опции, промокод не важен) →
  **409** `{"message":"This service was upgraded to the selected plan a moment ago.","reason":"nothing_to_upgrade","intent_uuid":"<оплаченной>"}`, строка не создаётся ✅ (prod 11-Nov).
- Тот же `Idempotency-Key` после отказа `nothing_to_upgrade` → снова 409 `nothing_to_upgrade` «This service is already on the selected plan.», не `idempotency_key_exhausted` ✅.
- Текущий тариф с текущими опциями (без апгрейда за 6 ч) → 201, `price: 0` ✅; под админ-видом на чужой услуге - 404 «not available».

### POST /upgrades/{uuid}/pay
- 200: `{"data":{"status":"paid","invoice_id":N,"payment":{"status","invoice_status","message"}}}` ✅.
- Нативный путь: WHMCS сам создаёт счёт и гасит кредитом, `payment.status=paid` → тост, клиент остаётся в панели.
  Кредита меньше суммы: WHMCS списывает его частично при создании счёта («Credit Automatically Applied at Invoice Creation»), `pay` → редирект на
  `viewinvoice.php?id=N`, intent `failed` «Payment Attempt Failed» ✅ (338268, 10-Nov-2026, [DEV-656](../../../tickets/DEV-656.md)).
- Ответ `pay` идёт ~16 с (нативный путь, prod 10-Nov). После `paid` FE ждёт рефетча `billing/{id}/current`, `tariffs-new/{id}/list`, `servers/{id}` и только потом закрывает окно;
  `list` упал → `window.location.reload()` ✅ ([DEV-656](../../../tickets/DEV-656.md)). 429 → окно остаётся, intent от `POST /upgrades` висит `pending` до `expires_at`.
- Есть промокод → биллинг отвечает `fallback`, панель создаёт счёт сама (`CreateInvoice` + строка Promo), затем кредит и `CapturePayment` через шлюз; не оплачено → редирект на `clientarea/viewinvoice.php?id=N`, intent `failed` ✅ ([DEV-528/O2](../../../tickets/DEV-528.md#находки)).
- С 09-Nov-2026 ([DEV-657](../../../tickets/DEV-657.md), panel!1779): кредит клиента >= остатка счёта → `ApplyCredit(invoiceid, amount=balance)`, счёт Paid за секунды, intent `paid`, клиент в панели;
  кредита меньше → ApplyCredit не шлётся, кредит остаётся на балансе, остаток в `CapturePayment`. До фикса `ApplyCredit` шёл без `amount` и ничего не применял ✅ (prod 10-Nov-2026).
- Тот же ручной путь включает **доплата CPU** (опция 104 ≠ 751) без промокода: счёт «Upgrade to new product: X. Configs: [[104,744],…]», `tblupgrades` не пишется,
  до DEV-657 кредит не применялся, `payment_message` «Payment Attempt Failed», intent `failed` навсегда; после ручного Apply Credit опция и ядра применяются ✅ ([DEV-660](../../../tickets/DEV-660.md), 05-Nov-2026). С 10-Nov гасится кредитом автоматически ([DEV-657](../../../tickets/DEV-657.md), счёт 338256).
- С 10-Nov-2026 ([DEV-662](../../../tickets/DEV-662.md)): `pay` на тот же план (`isNoop`) → 409 `nothing_to_upgrade` «This upgrade is not available for this service», попытка `failed / nothing_to_upgrade`, счёта нет ✅;
  повтор недавно оплаченной покупки (WHMCS ещё на старом плане) → 409, попытка `failed / duplicate_of:<uuid>`. Просроченные `pending` раз в час → `expired / pending_ttl`.
- События `upgrade_cta_clicked` / `upgrade_confirm_clicked`: `final_cpu` в старом формате «1 vCores / 3.7 GHz» при любом языке UI ✅ ([DEV-660](../../../tickets/DEV-660.md)).

### GET / POST /plan/{uuid}/discard (Discard changes)
- GET: `{"success":true,"data":null}`, пока откатывать нечего (первые 30 мин после апгрейда или нет ручного апгрейда) ✅. POST: всегда 200 `{"success":true}`, в это время без эффекта ✅.
- С 12-Nov-2026 ([panel!1820](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1820), F1 [DEV-662](../../../tickets/DEV-662.md)): POST после реального отката переводит оплаченную попытку этого счёта в `reverted` →
  гейт её не видит, тот же план покупается сразу (prod 12-Nov: 6055 → `reverted`, повтор 6056 `paid`) ✅. Откаты до деплоя остались `paid`.
- Подробно о Discard: [UP/upgrade](../upgrade.md).

## Биллинг и событие `upgrade`
- `godlike_upgrade_flow_context` (billing DB): `invoice_id`, `flow_name`, `open_id`, `ab_variant`, `preselect_applied` ✅.
- Событие `upgrade` (sGTM → Amplitude, лог `tblactivitylog` «upgrade data»): `invoice_id`, `flow_name`, `open_id`, `ab_variant`, `preselect_applied`,
  `environment`; `client_ip` нет ✅. Если счёт оплачен раньше записи разметки - `flow_name=unknown` без разметки ([DEV-528/F2](../../../tickets/DEV-528.md#находки)).
- `environment`: настройка `godlike_google_tag_manager.analytics_environment` (прод `production`), в панели `ANALYTICS_ENVIRONMENT` 📖.
