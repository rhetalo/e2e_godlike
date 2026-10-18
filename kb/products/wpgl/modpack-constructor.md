---
id: WPGL/modpack-constructor
title: Конструктор модпаков и 3-часовой trial
type: feature
product: WPGL
status: draft
updated: 2026-10-18
verified_on: 2026-07-23        # последний коммит спеков конструктора; ответы trial-эндпоинта - memory
tickets: []
flags: []
tests: [tests/modded/modpack.constructor.spec.ts, tests/funnels/funnel.modpack-constructor.spec.ts]
sources:
  - шапки tests/modded/modpack.constructor.spec.ts, tests/funnels/funnel.modpack-constructor.spec.ts
  - memory: modpack-constructor-trial-funnel, custom-modpack-setup-qa
---

# Конструктор модпаков и 3-часовой trial

> **В двух словах.** На `/custom-minecraft-modpacks-constructor/` клиент сам собирает модпак: выбирает лоадер,
> версию Minecraft и моды. Конструктор проверяет совместимость (Dry-Run), может поднять **реальный демо-сервер**
> и предложить 3-часовой бесплатный trial через `/cart-modpack-constructor/`. Отдельно можно скачать клиентские
> моды архивом (**Download Client Mods**).

## Где в интерфейсе

- Конструктор - веб-компонент в Shadow DOM с ленивой гидрацией: лоадер (Fabric...), версия, поиск модов, бейджи
  совместимости, **Setup Status** (GOOD / WARNING), **Download Client Mods**.
- **Compilation (Dry-Run)** → «all mods compatible» → **Proceed with test run** → демо-сервер (pending → installing → starting...).
- `/cart-modpack-constructor/` → страница триалки «Validating your build…» → **Start 3-hour demo**.

## Как работает (под капотом)

- Start 3-hour demo: `POST /clientarea/api-cart.php` (продукт pid 343, customfield 1887 = `mod_test_session_id`) →
  `POST /clientarea/product_features.php?action=trial`:
  - успех → редирект на биллинг триальной услуги `clientarea.php?action=productdetails&id=...`;
  - **409** «An active trial already exists for this client» → текст под кнопкой.
- Download Client Mods - `POST /mod-configurator/client-mods`, отдаёт zip.

## Статусы и переходы

| Из | Событие | В |
|---|---|---|
| trial создан | 3 часа | работает |
| работает | не оплачен через 3 ч | суспенд |
| суспенд | 72 ч | terminate |

Активный или суспенднутый trial блокирует создание нового: **один на клиента**.

## Правила и граничные случаи

1. **Одна демо-сессия на аккаунт:** пока одна `running` (3 ч), Proceed with test run новую не поднимет.
2. **Несовместимый мод** (регресс DEV-315): бейдж **Incompatible**, Setup Status **WARNING**, Download Client Mods disabled.
3. Без установленных модов Download Client Mods disabled.
4. С конструктора есть вход в [Custom Modpack Setup](custom-modpack-setup.md) (`?tier=lite`).

## Гочи для тестирования

- **Ленивая гидрация и Shadow DOM** - всё через `ModpackConstructorPage` (mouse-нудж в `waitReady`, поиск по Enter).
- **Полный путь поднимает реальный демо-сервер** - тест `@slow`, ждёт готовность по API-статусу сессии, Start 3-hour demo не жмёт.
- Тариф и локация на странице триалки догружаются асинхронно - не завязываться.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Набор модов проходит совместимость и компиляцию (Dry-Run) | `funnel.modpack-constructor.spec.ts` | ✅ |
| Happy-path до страницы триалки (без сабмита) | `funnel.modpack-constructor.spec.ts` (`@slow`) | ✅ |
| Несовместимый мод: Incompatible, WARNING, Download disabled | `modpack.constructor.spec.ts` | ✅ |
| Совместимый клиентский мод: Download отдаёт zip | `modpack.constructor.spec.ts` | ✅ |
| Download disabled без модов | `modpack.constructor.spec.ts` | ✅ |
| Start 3-hour demo, 409 при активном trial, суспенд и terminate | не покрыто (одна сессия на аккаунт) | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| - | DEV-315 | Несовместимый мод больше не даёт скачать клиентские моды (регресс-тест) |
| Sep-2026 | - | Воронка до страницы триалки, сплит теста на `@critical` и `@slow` |
