# Cancel Module - Amplitude events (отчёт верификации)

- **Продукт / экран:** ultra.panel.godlike.host - модуль отмены услуги (`…/server/{uuid}?canceled=true`)
- **Таска:** «Передати події в Cancel Module on backend side» (Alyona Sirenko), priority medium
- **AC:** QA & PM подтверждает, что КАЖДОЕ событие корректно передаётся в Amplitude
- **Тест-сервер:** `c2b09498` (`test_amplitude_cancel`), план «Minecraft Budget - Double» €6.29/мес
- **Кто/когда:** Playwright-перехват + ручная проверка владельца, 23-24-Jun-2026
- **Итог:** все события воронки отправляются; 2 события (`start_cancel_request`, `view_cancel_module`) - server-side, подтвердить в Amplitude; 1 баг - «View Free Hosting» → 404 (§5.1)

---

## 0. Как события передаются (подтверждено перехватом)

Внутримодульные клики шлют событие на **бэкенд** (видно в Network браузера):

```
POST https://panel.godlike.host/api/v2/whmcs/cancel/{uuid}/event?locale=en
body: { "event": "<event_type>" }        // напр. {"event":"cancellation_reason_submitted_5","reason":"reason_8"}
```

`start_cancel_request` (и, по наблюдениям, частично сам факт показа) эмитятся **на стороне сервера**
- в браузере НЕ видны, проверяются только в дашборде Amplitude (подтверждено владельцем вручную).

**Метод проверки:** DevTools → Network, фильтр `cancel/`, читать `event` в Payload. Либо дашборд
Amplitude (User Look-Up) для server-side событий и кросс-проверки.

**Как форсить флоу:** A/B `cancel_new_inpanel` случаен на свежий браузер. Incognito + смотреть
1-й экран (есть «Select pause period» = Freeze, нет = Hytale), либо пиннинг `vardata` (KB §11).

---

## 1. Флоу Hytale (old) `.old-cancellation-modal` - ПОКРЫТ

Статус: ✅ лично подтверждено (событие ушло с верным именем) · 🖥 server-side (вне браузера) · ⚠️ см. примечание.

| # | event_type | Кнопка / экран | Safety | Статус |
|---|---|---|---|---|
| 1 | `start_cancel_request` | Request Cancellation (Product Details, clientarea) | 🟢 | ⏳ server-side - подтвердить в Amplitude |
| 2 | `view_cancel_module` | показ «Confirm Cancellation» | 🟢 | ⏳ server-side - подтвердить в Amplitude |
| 3 | `cancellation_plan_confirmed_2` | Cancel Plan | 🟢 | ✅ |
| 4 | `cancellation_plan_change_selected_2` | Change Plan | 🟢 | ✅ |
| 5 | `cancellation_hytale_declined_3` | No, continue with cancellation | 🟢 | ✅ |
| 6 | `change_to_hytale_3` | Yes, switch to Hytale! | 🟡 | ✅ (→ «Plan Continued», план НЕ сменился) |
| 7 | `cancellation_info_proceeded_4` | Proceed to Cancellation (1/4) | 🟢 | ✅ |
| 8 | `cancellation_abandoned_4` | Stay on my hosting (1/4) | 🟢 | ✅ |
| 9 | `cancellation_reason_submitted_5` | reason + Continue (2/4) | 🟢 | ✅ (property `reason` кодом `reason_N` - ожидаемо) |
| 10 | `cancellation_abandoned_5` | Stay on my hosting (2/4) | 🟢 | ✅ |
| 11 | `cancellation_discount_claimed_6` | Claim My Discount (Special Offer) | 🟡 | ✅ (→ «Plan Continued», ценовой скидки в биллинге не появилось) |
| 12 | `cancellation_discount_declined_6` | No thanks, continue with cancellation | 🟢 | ✅ |
| 13 | `cancellation_confirmed_7` | Confirm Cancellation (Final 4/4) | 🔴 | ✅ (реальная отмена выполнена и откачена) |
| 14 | `cancellation_stay_on_my_hosting_7` | Stay on my Hosting (Final) | 🟢 | ✅ |
| 15 | `cancellation_free_hosting_clicked_8` | View Free Hosting (Plan Cancelled, ссылка) | 🔴 | ✅ событие шлётся / 🐞 кнопка ведёт на 404 (§5.1) |
| 16 | `cancellation_reactivate_server_clicked_8` | Reactivate Server (Plan Cancelled) | 🟡 | ✅ (и событие, и откат отмены) |

Карта воронки (подтверждена): Confirm Cancellation → [Switch to Hytale?] → Important Information (1/4)
→ Select a reason (2/4, 11 чекбоксов причин) → Special Offer (3) → Final Confirmation (4/4)
→ Plan Cancelled [Reactivate Server / View Free Hosting / Close] / либо exit «Plan Continued».

## 2. Флоу Freeze (new, cmFreeze) `.cancellation-modal` - ПОКРЫТ

| # | event_type | Кнопка / экран | Safety | Статус |
|---|---|---|---|---|
| 1 | `start_cancel_request` | Request Cancellation | 🟢 | ⏳ server-side - подтвердить в Amplitude |
| - | `view_cancel_module` | показ «Confirm Cancellation» | 🟢 | ⏳ server-side - подтвердить в Amplitude |
| 2 | `cancellation_plan_confirmed_2` | Cancel Plan | 🟢 | ✅ |
| 3 | `cancellation_plan_change_selected_2` | Change Plan | 🟢 | ✅ |
| 4 | `pause_plan_start_2` | Select pause period | 🟢 | ✅ |
| 5 | `pause_for_30_days_2_1` | Pause for 30 Days (опция-карточка) | 🟢 | ✅ |
| 6 | `pause_for_60_days_2_1` | Pause for 60 Days | 🟢 | ✅ |
| 7 | `pause_for_90_days_2_1` | Pause for 90 Days | 🟢 | ✅ (проверено владельцем) |
| 8 | `pause_my_subscription_2_1` | Pause My Subscription | 🔴 | ✅ (реальная пауза выполнена и снята) |
| 9 | `back_to_other_options_2_1` | Back To Other Options | 🟢 | ✅ |
| 10 | `undo_pause_2_2` | Unpause Server → окно → Undo pause | 🟡 | ✅ (двухшаговый откат паузы) |
| 11 | `go_to_pause_plan_3` | Go to Pause Plan | 🟢 | ✅ |
| 12 | `cancellation_reason_submitted_3` | reason + Continue | 🟡 | ✅ (reason кодом - ожидаемо) |
| 13 | `undo_cancellation_4` | Undo Cancellation (Plan Cancelled) | 🟡 | ✅ |
| 14 | `open_your_ticket_4` | Open Your Ticket (Plan Cancelled) | 🟡 | ✅ |

---

## 3. Итог покрытия

- **Все события воронки отправляются** (оба флоу). Подтверждены перехватом + ручной проверкой владельца.
- **2 события server-side** (`start_cancel_request`, `view_cancel_module`) - в браузере не видны, остаётся
  подтвердить в дашборде Amplitude (см. §5.3).
- **1 баг:** «View Free Hosting» → 404 (§5.1). Событие при этом шлётся.
- Реальные **отмена** (`confirmed_7`) и **пауза** (`pause_my_subscription_2_1`) выполнены и **откачены**.

## 4. Безопасность / состояние сервиса

Сервис `c2b09498` итогово **Active** (владелец подтвердил; переведён на план **Hytale** - намеренно, откат не нужен).
Откаты в ходе тестов: реальная отмена → **«Cancel the cancellation»** в clientarea (или **Reactivate Server**
на Plan Cancelled); реальная пауза → **Unpause Server** + «Undo pause». ⚠️ Пауза = WHMCS-статус **Paused**
(suspend) - проверять статус по clientarea, она авторитетна.

## 5. 🐞 Находки

1. **🐞 Баг (контент/ссылка):** «View Free Hosting» на экране Plan Cancelled (Hytale) - событие
   `cancellation_free_hosting_clicked_8` шлётся корректно, **но кнопка ведёт на 404**:
   `https://godlike.host/free-minecraft-hosting-en/` (полный URL из проверки содержал `?_gl=…`). Нужна корректная страница.
2. **ℹ️ Ограничение реализации (не баг):** в именах Amplitude-событий нельзя использовать точку - только `_`.
   Поэтому sub-step события идут как `pause_for_30_days_2_1`, `undo_pause_2_2` и т.п. (вместо `…_2.1`/`…_2.2`
   из ТЗ). ТЗ привести к подчёркиванию; графики/воронки строить по реальным именам.
3. **⏳ Подтвердить в Amplitude:** `start_cancel_request` / `view_cancel_module` - server-side (в браузере не видны).
   Дашборд: Event Volume по имени за 24ч, либо User Look-Up по тест-юзеру с привязкой ко времени клика.
4. **✅ Снято:** `reason` приходит кодом (`reason_1`…) - по подтверждению владельца ожидаемо (текст в ТЗ был
   примером). `undo_pause_2_2` - двухшаговый (Unpause Server → окно → Undo pause), работает.

## 6. ⚙️ Тех-нюанс (НЕ баг, важно для прогона): Vuetify-клик

Кнопки модуля надёжно срабатывают только через **`dispatchEvent('click')`**, а не обычный клик - тот
периодически перехватывается оверлеем `.v-btn__overlay` (событие не уходит, экран не меняется; ранее
ошибочно принял за «rate-limit/залипание»). Тот же паттерн, что Boot Order radio в vf-panel. Длины паузы
30/60/90 - **кликабельные опции-карточки** (не `<button>`), события реальны (поправка к ранней находке).
**Доснять остаток** (free_hosting_8 + freeze cancel-цикл) можно dispatch-кликами либо вручную в Amplitude.
