---
id: UP/upgrade
title: Upgrade / Boost - смена тарифа из панели
type: feature
product: UP
status: draft
updated: 2026-10-23
verified_on: 2026-10-09        # страница сломана, TASK-tariff-list-400
tickets: [TASK-tariff-list-400, DEV-534, DEV-579]
flags: []
tests: [tests/game/panel/promo.spec.ts]
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §7c, §9d (recon 06-Jun-2026)
  - kb/tickets/TASK-tariff-list-400.md
  - test-docs/ultra.panel/tariff-list-400-BUG.md
  - kb/products/up/README.md (раздел «Связь с соседними продуктами», пробел 7)
---

# Upgrade / Boost - смена тарифа из панели

> **В двух словах.** Кнопка **Boost My Server** открывает страницу апгрейда: текущий план и карточки
> тарифов на выбор, дальше оплата в биллинге. Сюда же ведут окно «Lag Detected»
> ([UP/throttling](throttling.md)) и промо Free Premium. ⚠️ На 09-Oct-2026 страница не грузит тарифы
> (бесконечный спиннер, баг Critical) - клиент не может купить апгрейд.

## Где в интерфейсе

- Overview → **Boost My Server** (`current__tariff-button`) → `/server/{uuid}/upgrade?promocode=UPGRADE50F`. KB §7c.
- Страница `server__upgrade`: карточка текущего плана `current-plan-card__*`, карточки планов `simple-plan-card__*` с реальными
  ценами (`€ 6.29 / 1 Month`), категории **Budget / Premium**, кнопки **See all plans**, **See Premium benefits**, квиз
  «Not sure what you need? → Go to quiz», кнопка «назад».
- **Free Premium:** кнопка «What is a Free Premium?» на каждой странице сервера → окно со списком премиум-фич и CTA
  «Get Premium (3-Days Trial)». KB §9d.

## Как работает (под капотом)

- Тарифы: `GET /api/v2/tariffs-new/{service_id}/list`. Бэкенд `TariffListService` берёт продукты из WHMCS.
- Текущий план: `GET /api/v2/billing/{service_id}/current` (200 даже при поломке списка).
- `service_id` = ID услуги WHMCS, он же суффикс имени сервера `_NNNNNN`.
- Выбор плана ведёт в оплату биллинга (BIL). На тест-аккаунте апгрейды оплачиваются кредитным балансом.
- Как работает промокод `UPGRADE50F` и оплата Boost - ❓ не описано ([обзор UP, пробел 7](README.md#пробелы)).

## Правила и граничные случаи

1. **Баг Critical (09-Oct):** `tariffs-new/.../list` ~19 с → 400 TypeError `TariffListService::filterProducts`, в ответе
   внутренний путь и имя класса. Воспроизводится на всех открытых серверах. Найден при QA [DEV-534](../../tickets/DEV-534.md),
   карточка [TASK-tariff-list-400](../../tickets/TASK-tariff-list-400.md), Jira-ключ и статус фикса ❓.
2. Кнопка выбора у части планов неактивна (`simple-plan-card__select-btn-disabled`) - по какому правилу ❓.

## Гочи для тестирования

- **Платёжный флоу:** только структурные проверки, никогда не выбирать план и не доходить до оплаты.
- CTA Free Premium (триал) не жать.
- Если страница грузится бесконечно, сначала проверить ответ `tariffs-new/.../list` - это известный баг, а не флак.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Boost ведёт на Upgrade, карточки планов и цены | `promo.spec.ts` (UPG-001) | ✅ структурно (при баге 400 упадёт) |
| Окно Free Premium | `promo.spec.ts` (PREM-001) | ✅ |
| Оплата апгрейда, промокод | не покрыто (платёж) | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 06-Jun-2026 | - | Recon Upgrade и Free Premium, KB §7c, §9d |
| 09-Oct-2026 | [TASK-tariff-list-400](../../tickets/TASK-tariff-list-400.md) | Список тарифов падает с 400, Upgrade не работает |
| 21-Oct-2026 | [DEV-579](../../tickets/DEV-579.md) | Project Zomboid: -Xmx в ProjectZomboid64.json пересчитывается от памяти тарифа при каждом старте (panel!1695). PASS |
