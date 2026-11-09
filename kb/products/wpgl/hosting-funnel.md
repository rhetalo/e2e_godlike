---
id: WPGL/hosting-funnel
title: Новый конфигуратор хостинга (hosting funnel, A/B вариант B)
type: feature
product: WPGL
status: draft
updated: 2026-11-06
verified_on: 2026-11-06
tickets: []
flags: [hostingFunnelVariant]
tests: [tests/funnels/hosting-funnel.spec.ts]
sources:
  - live recon 06-Nov-2026 (Playwright MCP + скрипты), pages/HostingFunnelPage.ts
---

# Новый конфигуратор хостинга (hosting funnel)

> **В двух словах.** С ~05-Nov-2026 на главной и на странице modded-хостинга идёт A/B: половина посетителей видит
> старый калькулятор, половина - новый пошаговый конфигуратор из 5 шагов (что ставим → сколько игроков → размер
> сервера → локация → период оплаты). Справа всегда карточка с рекомендованным тарифом и ценой. В конце кнопка
> HOST NOW: гостю она открывает регистрацию прямо внутри конфигуратора.

## Где в интерфейсе

- **Главная `/`** и **`/modded-minecraft-server-hosting/`**, только вариант **B** серверного A/B.
- Вариант задаёт cookie `hostingFunnelVariant` = `A` | `B`: WordPress ставит её случайно при первом заходе и
  дальше уважает. **A** = старое: на главной `#server-configurator` ([WPGL/home-configurator](home-configurator.md)), на modded `#plan-calculator`
  ([WPGL/modded-calculator](modded-calculator.md)). **B** = этот конфигуратор.
- Хост `#hosting-funnel` с открытым Shadow DOM, атрибут `data-entry-page` = `home` | `modded`.

## Шаги

| # | Шаг | Что на экране | Кнопка дальше |
|---|---|---|---|
| 1 | What should we install? | Главная: 4 таба (Minecraft Modpack / Minecraft / Custom Modpack / Other Games), модпак не выбран. Modded: 2 таба, модпак предвыбран. Карточки «Popular modpacks» с «N GB Required» | Continue (заблокирована без модпака) |
| 2 | Who's playing? | Пресеты (Me + a friend / Friend group / Community / Public server) + слайдер 1-2 … 50+, по умолчанию 3-4 | Continue |
| 3 | Server size | Формула «модпак N GB + игроки M GB = Estimate», лента тарифов Double … Elder Guardian, рекомендованный выбран (бейдж Recommended), меньшие - точка «Below recommended» | Done |
| 4 | Server location | Ближайшая локация с пингом (EU East 11 ms) | Use Nearest Location |
| 5 | Billing period | Monthly / Quarterly / 6 months / Yearly: цена в месяц, «per GB», скидка First Purchase, цена продления | Continue |
| - | Сводка | «All set. Let's host your server!» со строками и кнопками Change, CTA **HOST NOW** | - |

## Как работает (под капотом)

- Данные: `clientarea/api-cart-modpack.php` (`product_groups`, `products&gid=57`, `product&pid=…&promocode=…`, `locations`,
  `auth_data`), `panel.godlike.host/api/v2/minecraft/modpacks(/popular)`.
- Промокод зависит от числа игроков (наблюдали `VANILLA20` / `MODPACK30` / `COMMUNITY40`) ❓ правило не разведано.
- **HOST NOW** гостем: `api-cart.php?sync=<pid>` + `auth_data`, навигации нет - внутри компонента форма Register/Login
  (Google, Discord, email/username/password) и «Back to configuration».
- Прогресс хранится в `sessionStorage["godlike-hosting-funnel"]`: после reload открывается сводка.

## Правила и граничные случаи

1. Больше игроков → больше оценка RAM → рекомендация сдвигается на тариф крупнее (3-4 → Rampage 10 GB, 5-6 → Immortal 12 GB на ATM10).
2. Длиннее период → ниже цена за месяц (Monthly ₴1,259 → Yearly ₴991 на Rampage, UAH).
3. Шаги после текущего недоступны, пока не пройден предыдущий; к пройденным можно вернуться кликом по степперу.

## Гочи для тестирования

- Вариант пиннится cookie: по умолчанию все тесты получают **A** (`pinAmplitudeExperiments`), спек этого
  конфигуратора включает **B** через `pinHostingFunnelVariant(context, "B")` (`utils/amplitude.ts`).
- Кнопка шага 3 **Done** - голый `.f-btn` без `.f-pane__go` (у Continue / Use Nearest Location он есть).
- «Below recommended» - пустой `span.f-plan__dot` с aria-label, текстом не ищется.
- HOST NOW дальше формы регистрации не проходим: аккаунты и заказы на проде не создаём.
- **Флэш-сейл бьёт только Monthly первой покупки.** Ночной прогон 09-Nov-2026 (VPS в Германии, EUR) получил
  Monthly €8 = продление €31.99 × 25% («Save 75%»), а Yearly €12.66 - Monthly стал дешевле Yearly. Видимость акции
  задаёт сервер (`data-is-flash-sale-active`, окно `data-flash-sale-start/end`), в UA-сессии и у владельца её не было.
  Поэтому длину периода сравниваем по Quarterly → 6 months → Yearly и по цене продления (TC-HF-005).

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Стартовое состояние главной: 5 шагов, 4 таба, блок без модпака | `hosting-funnel.spec.ts` (TC-HF-001) | ✅ |
| Табы Minecraft / Other Games | TC-HF-002 | ✅ |
| Полный путь до сводки, HOST NOW активен | TC-HF-003, TC-HF-102 (modded) | ✅ |
| Рекомендация растёт с игроками, Below recommended | TC-HF-004 | ✅ |
| Период: Quarterly > 6 months > Yearly за месяц, продление убывает, правая карточка = цена периода | TC-HF-005 | ✅ |
| HOST NOW → регистрация, Back to configuration | TC-HF-006, TC-HF-102 | ✅ |
| Прогресс в sessionStorage переживает reload | TC-HF-007 | ✅ |
| Modded: 2 таба, модпак предвыбран | TC-HF-101 | ✅ |
| Custom Modpack, Other Games до конца, Login залогиненным, корзина/чекаут | не покрыто | ❌ |
| Старый конфигуратор главной `#server-configurator` (вариант A) | [WPGL/home-configurator](home-configurator.md) | ✅ |

## История

| Дата | Тикет | Что |
|---|---|---|
| ~05-Nov-2026 | - | A/B выкачен без анонса QA; старые modded-тесты падали «через раз» (`#plan-calculator` нет в B) |
| 06-Nov-2026 | - | Пиннинг A для старых тестов (0d2b534), recon B, 9 автотестов `hosting-funnel.spec.ts` |
| 09-Nov-2026 | - | TC-HF-005 упал на флэш-сейле «-75% на Monthly» (DE/EUR): проверка переписана без Monthly первой покупки |
