---
id: UP/ports-domains
title: Port & Domains - поддомен и порты сервера
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-06-19        # connection-info recon; раздел - 05..06-Jun
tickets: [DEV-562]
flags: []
tests: [tests/game/panel/network.spec.ts, tests/game/panel/network.connection-info.spec.ts]
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §5f, §9a, §9f (recon 05..19-Jun-2026)
  - kb/tickets/DEV-562.md
---

# Port & Domains - поддомен и порты сервера

> **В двух словах.** Здесь клиент выбирает красивый поддомен для своего сервера (вместо IP:порт) и видит
> порты сервера: основной и дополнительные. Дополнительный порт можно добавить сам - он нужен, например,
> для голосового чата или карты мира. Адрес для подключения на Overview берётся из тех же аллокаций.

## Где в интерфейсе

- Сайдбар сервера → **Port & Domains** (`/server/{uuid}/network`), работает и на выключенном сервере. KB §5f, §9a.
- **Subdomain:** селект домена (`.domainselect-field`), кнопки **Update Subdomain** и **Copy subdomain**.
- **Server Ports:** основной порт с кнопкой **Copy Port & IP**.
- **Additional Ports:** карточки портов и кнопка **Add Additional Port** → окно: поле **Name** («Enter a descriptive name...»),
  кнопки Cancel / Add Port.

## Как работает (под капотом)

- Порты - это аллокации Pterodactyl. Именованные аллокации: `/api/v2/servers/{fullUuid}/allocations` (`SERVER_PORT`,
  `ALLOCATED_UDP_PORT`, `QUERY_PORT`, `RCON_PORT`), у каждой `ip` + `ip_alias`. Только полный uuid. KB §9f.
- Адрес на Overview: `allocation.ip` + порт; Steam query-порт - из аллокации с именем `QUERY_PORT`; Steam Port PZ - из переменной
  `STEAM_PORT`, если это allocation того же сервера ([UP/server-overview](server-overview.md#как-работает-под-капотом)).

## Правила и граничные случаи

1. **Имя аллокации не стандартизовано** между яйцами (Unturned = `ALLOCATED_GAME_PORT_2`), поэтому `query_port` бывает пустым.
2. Провижинг-баг «порты не прописались» (7DTD) - другой слой, не путать с отображением. KB §9f.
3. Как работает Update Subdomain (DNS, задержка) - ❓ не разведано.

## Гочи для тестирования

- **Update Subdomain и Add Port - мутации** сетевых настроек реального сервера. В тестах только открыть окно, проверить, Cancel.
- `/allocations` с коротким uuid → 400 «No query results for model Server».

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Блок Subdomain, карточки портов, окно Add Port, кнопки Copy | `network.spec.ts` (NET-001..004) | ✅ структурно |
| Адрес = реальный IP аллокации | `network.connection-info.spec.ts` (NET-010) | ✅ |
| Смена поддомена, добавление порта | не покрыто (мутация) | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 05..06-Jun-2026 | - | Recon раздела и окна Add Additional Port |
| ~25-Jun-2026 | - | Адрес на Overview = `allocation.ip`, а не FQDN ноды |
| 15-Oct-2026 | [DEV-562](../../tickets/DEV-562.md) | Steam Port PZ проверяет, что порт - allocation этого сервера |
