---
id: VPS/network
title: Network VPS - IP, статистика трафика, Reverse DNS
type: feature
product: VPS
status: draft
updated: 2026-10-18
verified_on: 2026-06-19        # HTML-снимки 25-May-2026; спек зелёный 19-Jun
tickets: []
flags: []
tests: [tests/vps/panel/vps.panel.network.spec.ts]
sources:
  - шапка tests/vps/panel/vps.panel.network.spec.ts (HTML-снимки 2026-05-25)
  - kb/products/vps/README.md (Карта разделов, Пробелы)
---

# Network VPS - IP, статистика трафика, Reverse DNS

> **В двух словах.** Вкладка Network показывает сеть VPS: основной IPv4-адрес, график трафика (Statistics),
> настройку обратной DNS-записи (Reverse DNS) и DNS-резолвер. Тесты проверяют только просмотр и открытие
> окон - сами записи не меняют.

## Где в интерфейсе

- Вкладка **Network** → карточка **Primary Network**: заголовок `h2` и IPv4-адрес.
- Кнопка **Statistics** → график трафика (Plotly).
- **Reverse DNS** → модалка редактирования, Cancel закрывает.
- **DNS resolver** - multiselect, на тестовом сервере выбран Cloudflare.

## Правила и граничные случаи

1. Сохранение Reverse DNS и смена DNS-резолвера не разведаны ❓ - что меняется на сервере и сколько применяется.

## Гочи для тестирования

- Тесты в serial на одном общем контексте (вкладка открывается один раз).
- Plotly-график рисуется после клика - ждать сам график, а не только кнопку.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Вкладка активна, карточка Primary Network с IPv4 | `vps.panel.network.spec.ts` (NET-001) | ✅ |
| Statistics рендерит Plotly-график | `vps.panel.network.spec.ts` (NET-002) | ✅ |
| Reverse DNS: модалка открывается и закрывается по Cancel | `vps.panel.network.spec.ts` (NET-003) | ✅ |
| Сохранение Reverse DNS, смена DNS-резолвера | не разведано ❓ | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 25-May-2026 | - | HTML-снимки вкладки, спек network |
