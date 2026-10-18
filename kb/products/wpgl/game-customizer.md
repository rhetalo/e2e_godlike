---
id: WPGL/game-customizer
title: Кастомайзер тарифа на страницах игр (Customize server)
type: feature
product: WPGL
status: draft
updated: 2026-10-18
verified_on: 2026-06-17        # программа унификации: game-slider → GameSliderPage PO
tickets: []
flags: []
tests: [tests/modded/game-slider.spec.ts]
sources:
  - шапка tests/modded/game-slider.spec.ts, pages/GameSliderPage.ts
  - memory: test-quality-plan (game-slider - silent-skip → test.skip, 8 мест)
---

# Кастомайзер тарифа на страницах игр (Customize server)

> **В двух словах.** На страницах игр кнопка **Customize server** открывает панель, где тариф собирается
> слайдерами: число слотов (Slots), память (RAM) и срок (Days Runtime). Слоты и память связаны: двигаешь
> одно - сдвигается и другое. Цена тарифа пересчитывается от выбора. У части игр кастомайзера нет - это ожидаемо.

## Где в интерфейсе

- Страница игры → **Customize server** → 3 блока-слайдера: **Slots**, **RAM**, **Days Runtime** (опции 30 / 90 / 180 / 360).
- Рядом - цена тарифа, она меняется от RAM.

## Как работает (под капотом)

- Значения слайдеров на каждой игре свои, тест их не хардкодит, а читает из живой страницы (`GAME_CONFIGS` + `GameSliderPage`).

## Правила и граничные случаи

1. **Slots ↔ RAM синхронизированы:** последняя опция Slots двигает RAM на последнюю, средняя - на парную среднюю,
   первая оставляет RAM на первой.
2. Прямой клик по RAM меняет RAM; смена RAM с первой на последнюю меняет цену.
3. У части игр кнопки **Customize server** нет - тест это проверяет как ожидаемое состояние, а не падение.

## Гочи для тестирования

- Условный пропуск игры - только `test.skip(cond, reason)`; раньше было 8 `if (...) return` (silent-skip), исправлено.
- Все взаимодействия - через `GameSliderPage`, без сырых локаторов в спеке.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Игры без кастомайзера - кнопки нет (ожидаемо) | `game-slider.spec.ts` | ✅ |
| Структура: 3 блока, опции Days 30 / 90 / 180 / 360 | `game-slider.spec.ts` | ✅ |
| Slots, RAM, Days: клик обновляет значение | `game-slider.spec.ts` | ✅ |
| Синхронизация Slots ↔ RAM | `game-slider.spec.ts` | ✅ |
| Смена RAM меняет цену | `game-slider.spec.ts` | ✅ |
| Выбор в кастомайзере доезжает в корзину | не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 16..17-Jun-2026 | - | Унификация: `GameSliderPage` PO, silent-skip → `test.skip` |
