---
id: UP/modals
title: Модалки и оверлеи панели
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-10-02        # цепочка модалок модпака (DEV-472)
tickets: [DEV-472, DEV-418, DEV-492]
flags: []
tests: []                      # гасятся в GamePanelBasePage.open(), отдельного спека нет
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §5, §5a, §7.0, §9d (recon 03-Jun..27-Jul-2026)
  - kb/products/up/README.md (гочи 6, 7)
  - memory: panel-modals-handle-myself, game-panel-giveaway-and-audit
---

# Модалки и оверлеи панели

> **В двух словах.** В панели много всплывающих окон: обучающий тур, промо и опросы, EULA, подтверждения,
> предупреждения при установке модпака. Для клиента это подсказки, для тестов - главный источник флаков,
> потому что оверлей перехватывает клик. Эта страница - справочник: какое окно что значит и что с ним
> делать в тесте.

## Каталог окон

| Окно | Когда | Что делать в тесте | Источник |
|---|---|---|---|
| Shepherd-тур (6 шагов) | на каждой навигации | «Skip for now» (`ShepherdTour.dismissIfPresent()`) | KB §5, §7.0 |
| Giveaway / Trustpilot `.giveaway-modal` | ~1 раз за сессию, по таймеру | крестик или «Maybe later»; CTA Trustpilot не трогать | KB §5 |
| Промо «Get 3 Free Days», `.roadmap-v2-placeholder` | промо | закрыть / обойти | memory |
| Free Premium `premium__dialog` | по кнопке | только структурно, CTA триала не жать | [UP/upgrade](upgrade.md) |
| «Accept Minecraft® EULA» | первый старт | «I Accept» сами | [UP/power](power.md) |
| «Restart The Server?» | Restart (если включено подтверждение ❓) | «Yes, Restart» для своих действий | [UP/power](power.md) |
| «Java Version Error» / «needs Java N» | краш или отказ гейта | предмет проверки, разбирать | [UP/java-detection](java-detection.md) |
| «Missing mod dependencies» | краш из-за зависимостей | предмет проверки, разбирать | [UP/missing-mod-deps](missing-mod-deps.md) |
| «This modpack needs more RAM» | установка модпака | **Install Anyway** (не апгрейд тарифа) | [UP/modpack-catalog](modpack-catalog.md) |
| «Save Your World First?» | опасное действие с миром | по ситуации; при разрешённой очистке - Continue Without Backup | [UP/world-backup](world-backup.md) |
| «Some mods were disabled» | после скана модов | Got It (окно может повторяться) | [UP/client-only-mods](client-only-mods.md) |
| «Lag Detected» `.upgrade-dialog` | вебхук троттлинга | Keep current plan; Upgrade не жать | [UP/throttling](throttling.md) |
| Cancel-модуль | Request Cancellation | только `dispatchEvent('click')`, закрытие после reason = реальная отмена | [UP/cancel-module](cancel-module.md) |

## Как работает (под капотом)

- Почти все окна - Vuetify `v-dialog`: контент `.v-overlay__content`, фон-скрим `.v-overlay__scrim` перехватывает клики.
- Shepherd-тур - отдельная библиотека (`.shepherd-modal-overlay-container`).
- Giveaway всплывает по таймеру уже после навигации, поэтому кроме гашения в `GamePanelBasePage.open()` есть страховка
  `neutralizeOverlays` (делает оверлей прозрачным для кликов).

## Правила (что жать самим, что нет)

- **Сами:** EULA, подтверждения своих действий, промо и онбординг, «needs more RAM» → Install Anyway, «Some mods were disabled» → Got It.
- **Не жать, спросить владельца:** оплата и апгрейд, удаление данных без разрешения, согласия про аккаунт или деньги, незнакомые окна.
- **Не закрывать, а разбирать:** окно, которое проверяем (Java, Missing deps).

## Гочи для тестирования

- **После каждого действия, которое может открыть окно,** сначала снять видимые `.v-overlay__content` и разобрать их, потом ждать результат.
- **Ждать короткими шагами** (≤60-90 с) с проверкой окон и кнопок питания, а не одним длинным циклом.
- **Цепочка модпака:** Install modpacks → needs more RAM → Install Anyway → Save Your World First? → Some mods were disabled → Got It.

## Покрытие

- Гашение тура и giveaway встроено в `GamePanelBasePage.open()` и косвенно проверяется всеми спеками панели.
- Отдельного спека на каталог окон нет.

## История

| Дата | Тикет | Что |
|---|---|---|
| 03..06-Jun-2026 | - | Shepherd-тур, Free Premium |
| 27-Jul-2026 | - | Giveaway-модалка ловит клик Start, добавлены гашение и `neutralizeOverlays` |
| 14-Aug-2026 | [DEV-418](../../tickets/DEV-418.md) | Окно «Save Your World First?» |
| 24-Sep..02-Oct-2026 | [DEV-472](../../tickets/DEV-472.md) | Правило: окна на наших тест-серверах разбираем сами; цепочка модпака |
| 09-Oct-2026 | [DEV-492](../../tickets/DEV-492.md) | «Some mods were disabled» повторяется (`acknowledged_at` не пишется) |
