---
id: TASK-tariff-list-400
title: Список тарифов для апгрейда падает с 400, Upgrade бесконечно грузится
type: ticket
product: [UP, BIL]
features: [UP/upgrade]
status: blocked
qa_verdict: FAIL
updated: 2026-10-15
verified_on: 2026-10-09
jira: -
sources:
  - test-docs/ultra.panel/tariff-list-400-BUG.md
  - memory: cf-modrinth-source-swap
---

# TASK-tariff-list-400 - Список тарифов для апгрейда падает с 400, Upgrade бесконечно грузится

> **В двух словах.** Страница апгрейда тарифа в новой панели не показывает тарифы: бесконечный
> спиннер. Клиент не может купить апгрейд, это прямые потери денег. Баг Critical, найден 09-Oct
> попутно при QA DEV-534.

## Как это работает
- Upgrade (кнопка «Boost My Server») запрашивает `GET /api/v2/tariffs-new/{service_id}/list`.
- Бэкенд `TariffListService` берёт продукты из WHMCS. Получает `null` (похоже на таймаут ~19 с), передаёт его в `filterProducts(array)` → TypeError → 400 с внутренним путём и именем класса в ответе.
- `GET /api/v2/billing/{service_id}/current` при этом отвечает 200.

## Итог QA
FAIL, 09-Oct-2026, prod. Воспроизводится на всех открытых серверах. Баг-репорт: [tariff-list-400-BUG.md](../../test-docs/ultra.panel/tariff-list-400-BUG.md).

## Связи
- Фичи: [UP/upgrade](../products/up/upgrade.md)
- Сервер: [srv:f8e7df56](../registry/test-servers.md#f8e7df56).
- Найден при [DEV-534](DEV-534.md) (бывш. DEV-405/B2).

## Хвосты
- ❓ Jira-ключ бага и статус фикса. Перепроверить страницу Upgrade.
