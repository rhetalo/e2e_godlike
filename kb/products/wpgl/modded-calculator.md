---
id: WPGL/modded-calculator
title: Калькулятор modded-хостинга - модпак и тариф
type: feature
product: WPGL
status: draft
updated: 2026-10-18
verified_on: 2026-08-05        # миграция на Inc 6-виджет <plan-calculator-widget>
tickets: [DEV-532]
flags: []
tests: [tests/modded/slider.modded.spec.ts, tests/modded/modpack.config.modded.spec.ts, tests/general/smoke.pages.spec.ts]
sources:
  - шапки tests/modded/slider.modded.spec.ts, modpack.config.modded.spec.ts
  - kb/products/wpgl/README.md (Карта разделов, гочи 3-4)
  - kb/tickets/DEV-532.md
  - memory: inc6-calc-widget-migration, seed-modded-calculators
---

# Калькулятор modded-хостинга - модпак и тариф

> **В двух словах.** На `/modded-minecraft-server-hosting/` клиент выбирает модпак (быстрые кнопки ATM 10, BMC 4...
> или поиск), его версию и слайдером - тариф под нужное число игроков. Кнопка **Host Now** уводит в
> [modded-воронку](modded-funnel.md) с выбранными модпаком и тарифом. Ниже - сетка модпаков с кнопками Install.

## Где в интерфейсе

- Калькулятор `#plan-calculator` - веб-компонент `<plan-calculator-widget>` в открытом Shadow DOM (с 05-Aug-2026).
- Quick-pick «пилюли» модпаков, автокомплит модпака и поле версии, слайдер игроков `input[type=range].ui-slider__input`.
- **Host Now** - ссылка с `productId` и `modpackId` в `href`.
- Сетка модпаков: кнопки **Install** с `data-product-id` / `data-modpack-id` / `data-promo`.

## Как работает (под капотом)

- Список модпаков калькулятор берёт из panel API `/api/v2/minecraft/modpacks` ([DEV-532](../../tickets/DEV-532.md) - видимость `is_listed`).
- Слайдер **дискретный** 0..N (не ARIA 0..100); сдвиг выбирает другой план - меняется `productId` в ссылке.
- Скрытый `#planCalculatorFieldPlayersCount` повторяет значение слайдера.

## Гочи для тестирования

- **Shadow DOM:** локаторы Playwright его пробивают, `querySelectorAll` в `page.evaluate` - нет.
- **Слайдер не искать по `role=slider`** - он кастомный, без роли (на этом recon уже ошибался: «слайдер удалён»).
- Калькулятор оживает лениво - после реального движения мыши (`page.mouse.move()` ×2).
- Диапазон и шаг читать из DOM, не хардкодить max.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Страница грузится, калькулятор монтируется | `smoke.pages.spec.ts` | ✅ |
| Слайдер: диапазон, равномерный шаг, End / Home | `slider.modded.spec.ts` | ✅ |
| Скрытый input игроков повторяет слайдер | `slider.modded.spec.ts` | ✅ |
| Сдвиг слайдера меняет productId в ссылке | `slider.modded.spec.ts` | ✅ |
| Quick-pick меняет modpackId в ссылке корзины | `modpack.config.modded.spec.ts` | ✅ |
| Автокомплит модпаков (≥5 опций) + поле версии | `modpack.config.modded.spec.ts` | ✅ |
| Install в сетке несут data-product-id / data-modpack-id | `modpack.config.modded.spec.ts` | ✅ |
| Видимость модпаков `is_listed` в калькуляторе | только ручной QA [DEV-532](../../tickets/DEV-532.md) | ❌ авто нет |

## История

| Дата | Тикет | Что |
|---|---|---|
| 05-Aug-2026 | - | Калькулятор мигрировал на Inc 6-виджет (Shadow DOM, нативный слайдер) |
| 08-Oct-2026 | [DEV-532](../../tickets/DEV-532.md) | Скрытие дублей модпаков через `is_listed` |
