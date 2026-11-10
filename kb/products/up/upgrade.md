---
id: UP/upgrade
title: Upgrade / Boost - смена тарифа из панели
type: feature
product: UP
status: draft
updated: 2026-11-10
verified_on: 2026-11-10
tickets: [TASK-tariff-list-400, DEV-534, DEV-579, DEV-593, DEV-594, DEV-528, DEV-547, DEV-660, DEV-657]
flags: []
tests: [tests/game/panel/promo.spec.ts, tests/game/panel/upgrade.ram-query.spec.ts, tests/game/panel/upgrade.tier.spec.ts, tests/game/panel/upgrade.cpu-labels.spec.ts]
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §7c, §9d (recon 06-Jun-2026)
  - kb/tickets/TASK-tariff-list-400.md
  - test-docs/ultra.panel/tariff-list-400-BUG.md
  - kb/products/up/README.md (раздел «Связь с соседними продуктами», пробел 7)
  - kb/tickets/DEV-528.md (A/B предвыбор, события, разметка оплат)
---

# Upgrade / Boost - смена тарифа из панели

> **В двух словах.** Кнопка **Boost My Server** открывает страницу апгрейда: текущий план и карточки
> тарифов на выбор, дальше оплата в биллинге. Сюда же ведут окно «Lag Detected»
> ([UP/throttling](throttling.md)) и промо Free Premium. ⚠️ На 09-Oct-2026 страница не грузит тарифы
> (бесконечный спиннер, баг Critical) - клиент не может купить апгрейд.

## Где в интерфейсе

- Overview → **Boost My Server** (`current__tariff-button`) → `/server/{uuid}/upgrade?entry=boost` (с 15-Oct-2026, [DEV-528](../../tickets/DEV-528.md);
  раньше `?promocode=UPGRADE50F`). Страница убирает маркер из URL и запоминает вход `boost_my_server`. KB §7c.
- Страница `server__upgrade`: карточка текущего плана `current-plan-card__*`, карточки планов `simple-plan-card__*` с реальными
  ценами (`€ 6.29 / 1 Month`), категории **Budget / Premium**, кнопки **See all plans**, **See Premium benefits**, квиз
  «Not sure what you need? → Go to quiz» ([UP/upgrade-quiz](upgrade-quiz.md)), кнопка «назад».
- **Free Premium:** кнопка «What is a Free Premium?» на каждой странице сервера → окно со списком премиум-фич и CTA
  «Get Premium (3-Days Trial)». KB §9d.

## Как работает (под капотом)

- Тарифы: `GET /api/v2/tariffs-new/{service_id}/list`. Бэкенд `TariffListService` берёт продукты из WHMCS.
- Текущий план: `GET /api/v2/billing/{service_id}/current` (200 даже при поломке списка).
- `service_id` = ID услуги WHMCS, он же суффикс имени сервера `_NNNNNN`.
- Выбор плана ведёт в оплату биллинга (BIL). На тест-аккаунте апгрейды оплачиваются кредитным балансом.
- Как работает промокод `UPGRADE50F` и оплата Boost - ❓ не описано ([обзор UP, пробел 7](README.md#пробелы)).

## A/B «следующий план после Boost» ([DEV-528](../../tickets/DEV-528.md))

- Группа B (treatment): после Boost справа сразу следующий по RAM видимый план того же типа (Budget → Budget, Premium → Premium),
  цикл и опции как у текущего, метка **Recommended** и кнопка «Upgrade for €X». Смена RAM или типа снимает метку, возврат возвращает.
- Без предложения: группа A, бесплатный сервер, максимальный план, вход не через Boost (F5, Back, прямой URL), сабюзер, админ на чужом сервере,
  у следующего плана нет текущего цикла или опции.
- Флаг `off / 50 / all` + QA-allowlist по client id ([flag](../../registry/flags.md#upgrade-next-plan-ab)). Вариант ждёт до 5 с, потом экран A с `variant=error` в событиях (с 04-Nov).
- Входы различаются в событиях и оплате: `boost_my_server`, `backups`, `cancellation`, `free_to_paid`, `modpack_requirement`, `premium_banner`,
  `upgrade_quiz`, `lagscore`... Поля - [API - апгрейд](api/upgrade.md).
- Оплата: нативный апгрейд WHMCS (кредит списывается при создании счёта) или, если есть промокод, ручной счёт панели (промокод, доплата CPU). С 09-Nov ручной счёт гасится кредитом автоматически, если кредита хватает на весь счёт,
  иначе редирект на счёт - [DEV-657](../../tickets/DEV-657.md) (было [DEV-528/O2](../../tickets/DEV-528.md#находки)).

## Правила и граничные случаи

1. **Баг Critical (09-Oct):** `tariffs-new/.../list` ~19 с → 400 TypeError `TariffListService::filterProducts`, в ответе
   внутренний путь и имя класса. Воспроизводится на всех открытых серверах. Найден при QA [DEV-534](../../tickets/DEV-534.md),
   карточка [TASK-tariff-list-400](../../tickets/TASK-tariff-list-400.md), Jira-ключ и статус фикса ❓.
2. **`?ram=N` (DEV-594):** сводится к наименьшему плану `>= N` из сетки тарифов (прод 02-Nov: 2..16 шагом 2, 20, 32, 64, 96, 130 GB),
   выше сетки - максимальный; мусор, `0`, дробь или `<=` текущей RAM платного - без Recommended. Тир (Budget/Premium) сохраняется.
   Сюда ведут RAM-диалог модпака и Lag Score.
3. **Тир (Budget/Premium) берётся из пар `godlike_budget_premium_pair` (billing), а не из группы продукта** - флаг
   `is_premium` в `mod_godlike_product_attributes` = 0 у всех. 03-Nov-2026: пар нет для Wither 714/718, Warden 715/719,
   Ender Dragon 716/720 → Premium-клиент видит «Budget», `tariffs-new/{id}/list` отдаёт `isPremium: false` и `products: []`,
   а страница шлёт `tariffs-new/upgrade` с `product_id: 343` → 404 «This upgrade is not available for this service».
   С Wither (64 GB, Budget и Premium) апгрейд на Warden / Ender Dragon недоступен - конфигуратор пустой (подтверждено владельцем
   на 4 живых услугах). Цепочка: panel `TariffListService` → billing `product_features.php` `group_pairs` (группы по паре;
   нет пары - пустой список) → `group_products` (скрытые `hidden = 1` отбрасываются намеренно). Поэтому у **Hytale** (пары есть,
   все 12 тарифов скрыты) апгрейд тоже пустой, тот же 404 (~104 живые услуги). 03-Nov владелец добавил пары и открыл Hytale:
   Wither на своей услуге считается (96 GB $4319.21, 130 GB $5915.44); Hytale не подтверждён (у Premium 915/921 нет путей в
   `tblproduct_upgrade_products`). ⚠️ **Под админ-видом расчёт `tariffs-new/upgrade` даёт 404 на ЛЮБОЙ чужой услуге** - так задумано (админ не
   апгрейдит чужую услугу), проверять расчёт только на своей. Итог 03-Nov: **не баг, данные** - без пары у текущего тарифа апгрейдиться некуда; аудит недостающих пар (Discord, Enshrouded,
   Garry's Mod с живыми клиентами; GTA5, PZ, Rust, Terraria, V Rising без клиентов; RedM скрыт с 2 клиентами) - `PAIRS-AUDIT.md` рядом с багом; оформлен в `test-docs/ultra.panel/BUG-max-plan-tier-pairs/BUG.md`, найден при [DEV-594](../../tickets/DEV-594.md).
4. Кнопка выбора у части планов неактивна (`simple-plan-card__select-btn-disabled`) - по какому правилу ❓.

## Гочи для тестирования

- **Платёжный флоу:** только структурные проверки, никогда не выбирать план и не доходить до оплаты.
- Save Setup на странице апгрейда открывает окно подтверждения (`confirm-on-save`), платит только Confirm Upgrade. Окно можно закрыть крестиком ([DEV-660](../../tickets/DEV-660.md)).
- Список CPU: первый пункт - ядра плана («N vCores, included», у Premium «Max»), остальные - доплаты `cpu_add` («+ N vCore(s)»). Сумма прорейтится до `nextduedate` ([DEV-660](../../tickets/DEV-660.md)).
- CTA Free Premium (триал) не жать.
- Если страница грузится бесконечно, сначала проверить ответ `tariffs-new/.../list` - это известный баг, а не флак.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Boost ведёт на Upgrade, карточки планов и цены | `promo.spec.ts` (UPG-001) | ✅ структурно (при баге 400 упадёт) |
| Окно Free Premium | `promo.spec.ts` (PREM-001) | ✅ |
| `?ram=` → Recommended и конфигуратор (DEV-594) | `upgrade.ram-query.spec.ts` (UPG-RAM-001..003) | ✅ |
| Оплата апгрейда, промокод | не покрыто (платёж) | ❌ |
| A/B предвыбор после Boost, события страницы | ручной QA [DEV-528](../../tickets/DEV-528.md) | ⏳ blocked до раскатки флага |
| Тир плана = тир сервера: сетка See All Plans, `?ram=`, сохранение выбора (DEV-547) | `upgrade.tier.spec.ts` (UPG-TIER-001..003) | ✅ |
| Тир в квизе, `previous_*` в оплате, вход из клиентской зоны (DEV-547) | ручной QA [DEV-547](../../tickets/DEV-547.md) | ❌ не в e2e (биллинг, оплата) |
| Подписи CPU: «N vCores, included» / «Max», доплаты «+ N vCore(s)», без повторов (DEV-660) | `upgrade.cpu-labels.spec.ts` (UPG-CPU-001..002) | ✅ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 06-Jun-2026 | - | Recon Upgrade и Free Premium, KB §7c, §9d |
| 09-Oct-2026 | [TASK-tariff-list-400](../../tickets/TASK-tariff-list-400.md) | Список тарифов падает с 400, Upgrade не работает |
| 21-Oct-2026 | [DEV-579](../../tickets/DEV-579.md) | Project Zomboid: -Xmx в ProjectZomboid64.json пересчитывается от памяти тарифа при каждом старте (panel!1695). PASS |
| 30-Oct-2026 | [DEV-593](../../tickets/DEV-593.md) | Квиз апгрейда только с токеном владельца; апгрейд из квиза за кредиты прошёл (VIP, Quadra Premium → Ultra Budget). PASS |
| 02-Nov-2026 | [DEV-594](../../tickets/DEV-594.md) | `?ram=` округляется до реального плана, RAM-диалог модпака ведёт на ceil GB (new-panel!576). PASS |
| 03-Nov-2026 | [DEV-528](../../tickets/DEV-528.md) | A/B: после Boost предлагается следующий план, 5 событий страницы, разметка оплат. PASS с замечаниями (F1, F2), prod через allowlist |
| 04-Nov-2026 | [DEV-528](../../tickets/DEV-528.md) | Ретест: сбой группы = `error` вместо `control`, оплата кредитом с полной разметкой (panel!1764, billing!769, new-panel!606). PASS |
| 04-Nov-2026 | [DEV-547](../../tickets/DEV-547.md) | Тир предложенного плана = тир сервера во всех входах (сетка, `?ram=`, модпак, квиз, Lag Score), новые поля событий, `entry=client_area`, `previous_*` в оплате (new-panel!568, panel!1699, billing!740). PASS |
| 05-Nov-2026 | [DEV-660](../../tickets/DEV-660.md) | Доплата CPU подписана как надбавка: «2 vCores, included», «+ 1 vCore» (new-panel!608). Цены и аналитика без изменений, доплата куплена и применилась. PASS |
| 10-Nov-2026 | [DEV-657](../../tickets/DEV-657.md) | Ручной путь оплаты (промо, доплата CPU) гасится кредитом автоматически, intent `paid`, без редиректа (panel!1779). PASS |
