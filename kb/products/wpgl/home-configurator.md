---
id: WPGL/home-configurator
title: Конфигуратор главной (вариант A, server-configurator)
type: feature
product: WPGL
status: draft
updated: 2026-11-06
verified_on: 2026-11-06
tickets: []
flags: [hostingFunnelVariant]
tests: [tests/funnels/server-configurator.spec.ts]
sources:
  - live recon 06-Nov-2026, pages/ServerConfiguratorPage.ts
---

# Конфигуратор главной (вариант A)

> **В двух словах.** На главной в первом экране стоит виджет подбора сервера: выбираешь игру, для Minecraft можно
> выбрать модпак, двигаешь слайдер числа игроков - виджет показывает рекомендованный тариф с ценой, а Host now ведёт
> в корзину. С ~05-Nov-2026 это вариант A; вариант B - новый пошаговый [WPGL/hosting-funnel](hosting-funnel.md).

## Где в интерфейсе

- Главная `/`, блок `.main-header__intro--configurator`, хост `#server-configurator` (открытый Shadow DOM, Tailwind).
- Вариант задаёт cookie `hostingFunnelVariant=A` (см. [WPGL/hosting-funnel](hosting-funnel.md#где-в-интерфейсе)).
- Атрибуты хоста: `data-cart-base-url=…/cart-main`, `data-default-gid=57`, `data-billing-cycle=monthly`, `data-currency`.

## Как работает

- **Choose your game:** ~47 карточек `button[data-game-card]` (aria-label = игра), выбранная `aria-pressed=true`, по умолчанию Minecraft.
- **Minecraft:** «Select Modpack» (No modpack) + «Modpack Version» + quick-pick ATM 10 / BMC 4 / Prominence II / RLCraft / ATMons.
  У других игр полей модпака нет.
- **Списки (listbox):** кнопка `aria-haspopup=listbox` + панель по `aria-controls` (`ul[role=listbox] > li[role=option]`).
  У «Select Modpack» в панели поиск `Search modpacks…`: **серверный** `GET panel /api/v2/minecraft/modpacks?query=…&per_page=25`,
  без подгрузки при прокрутке (максимум 25 + «No modpack»), пусто → «No modpacks found». Выбор пака тянет
  `/api/v2/minecraft/modpacks/curseforge/<id>` и активирует «Modpack Version» с самой свежей версией (выбрана первой).
- **Number of Players:** слайдер-ручка `role=slider` (Home/End работают), шкала зависит от игры и модпака
  (Minecraft 5-10 … 225+, с ATM10 1-2 … 50+, Terraria 8 … 48).
- **Recommended Plan:** имя тарифа, RAM, слоты, модпак, цена со скидкой и зачёркнутая.
- **Host now** → `/cart-main/?productId=…[&modpackId=curseforge:<project>:<file>]&billingCycle=monthly`.

## Наблюдения recon 06-Nov-2026

| Выбор | Тариф | Корзина |
|---|---|---|
| Minecraft, без модпака, старт | Double 2 GB, 5-10 Slots | productId=342 |
| + ATM 10 | Quadra 4 GB, 1-2 Slots (End → Elder Guardian 32 GB, 50+) | productId=343, modpackId=curseforge:925200:9431424 |
| Terraria | Palladium 2 GB, 8 Slots | productId=368 |
| Поиск «skyfactory» → SkyFactory 4 (13 версий), версия 4.2.1 вместо 4.2.4 | Quadra 4 GB | productId=343, modpackId=curseforge:296062:3012232 (fileId меняется с версией) |

## Гочи для тестирования

- Первый `button[aria-haspopup=listbox]` - выбор **игры**, не модпака; поле модпака ищем по лейблу «Select Modpack».
- Заголовок «Recommended Plan» вне `.plan-card`.
- Сразу после загрузки `.plan-card` пустая - ждать `.plan-card h3`.
- В выдаче поиска встречаются дубли названий (два «SkyFactory 5», два «SkyFactory One»): каталог агрегирует несколько
  источников, у записи поле `provider` = curseforge / atlauncher / technic / feedthebeast / modrinth (проверено API 06-Nov-2026,
  дубли = curseforge + atlauncher с 0 загрузок). В списке источник не показан - клиент видит два одинаковых пункта (UX, не баг).
  Ассерты по поиску - только «название содержит запрос», без уникальности.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Структура: игры, Minecraft по умолчанию, quick-pick, слайдер, тариф, Host now | `server-configurator.spec.ts` (TC-SC-001) | ✅ |
| Слайдер End/Home меняет и возвращает тариф | TC-SC-002 | ✅ |
| Скидка: новая цена меньше зачёркнутой | TC-SC-003 | ✅ |
| Quick-pick модпака → корзина с productId + modpackId | TC-SC-004 | ✅ |
| Другая игра: без модпака, корзина без modpackId | TC-SC-005 | ✅ |
| Поиск модпака: фильтр по запросу, «No modpacks found» | TC-SC-006 | ✅ |
| Модпак из поиска → версия по умолчанию; другая версия → другой fileId в корзине | TC-SC-007 | ✅ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 06-Nov-2026 | - | Recon, 5 автотестов `server-configurator.spec.ts`; затем поиск модпака и выбор версии (TC-SC-006/007) |
