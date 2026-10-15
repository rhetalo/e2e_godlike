---
id: UP/server-overview
title: Overview сервера - Server Information и Edit Server
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-10-15        # DEV-562 и DEV-563
tickets: [DEV-562, DEV-563]
flags: []
tests:
  - tests/game/panel/server.overview.spec.ts
  - tests/game/panel/edit.server.spec.ts
  - tests/game/panel/network.connection-info.spec.ts
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §4, §7f, §7h, §9f (recon 06..19-Jun-2026)
  - kb/tickets/DEV-562.md, DEV-563.md
  - memory: dev562-pz-steam-port, dev563-free-egg-lock
---

# Overview сервера - Server Information и Edit Server

> **В двух словах.** Первая страница сервера: статус, адрес для подключения, ID, локация, тариф,
> power-кнопки и короткая консоль. Отсюда же через **Edit Server** меняют имя, игру и тип сервера или
> переустанавливают его. Адрес показывается реальным IP, а для Project Zomboid рядом есть Steam Port.

## Где в интерфейсе

- `/server/{uuid}` (принимает полный и короткий uuid). Заголовок-имя `server__overview-title`. KB §4, §7h.
- **Server Information:** Status, Domain/IP (`.roadmap-ip`), ID, Name, Location, кнопки **Edit Server** и **Invite People**.
  Для PZ - строка **Steam Port** (`[data-test="steam-port"]`) с копированием, тост «Steam port successfully copied»
  ([DEV-562](../../tickets/DEV-562.md)).
- **Power-контролы** - [UP/power](power.md). **Консоль**: Commands input, Full Server Log, Mod Conflict. **Server Usage**: CPU / RAM / Storage.
- **Карточка тарифа** `current__tariff*`, промо «Free Premium» `premium__block*`, бейдж версии + «Refresh version».
- **«Java & Minecraft Version Notice»** со ссылками на Versions и Config ([UP/java-detection](java-detection.md)).
- **Edit Server** (`edit__server-block__dialog`): Server Name, Game/Platform, Server Type; блок SERVER ACTIONS: Import Server,
  Reinstall Server; Cancel / Save Changes. KB §7f.

## Как работает (под капотом)

- Данные: `GET /api/v2/servers/{shortUuid}`. Ключевые поля (KB §9f, [DEV-562](../../tickets/DEV-562.md)):

| Поле | Что значит |
|---|---|
| `allocation.ip` | реальный публичный IP - его показывает Domain/IP |
| `allocation.ip_alias` | FQDN ноды (`srvN.godlike.club`) - раньше ошибочно показывался вместо IP |
| `allocation.port` | игровой порт |
| `query_port` | Steam query-порт, выводится из аллокации с именем `QUERY_PORT` |
| `steam_port` | только PZ, число или null |
| `is_ark`, `is_minecraft`, `is_bedrock` ... | флаги типа игры, по ним ветвится логика порта |

- **Steam Port** берётся из переменной `STEAM_PORT` и показывается только для egg из `PROJECT_ZOMBOID_EGG_IDS`. Валидация:
  1024-65535, без ведущих нулей, не равен основному, это allocation того же сервера на той же ноде и IP. Иначе `null` и строки нет.
- **Смена игры** у free-сервера запрещена: в UI нет полей Game/Platform и Server Type, бэкенд → 403
  ([UP/free-servers](free-servers.md)).
- Именованные аллокации: `/api/v2/servers/{fullUuid}/allocations` (только полный uuid).

## Правила и граничные случаи

1. **`query_port` хрупкий:** у части яиц аллокация названа иначе (Unturned = `ALLOCATED_GAME_PORT_2`) или query-порта нет
   (Starbound) → нужен фолбэк на `allocation.port`. KB §9f.
2. **Арма с `STEAM_PORT` → null:** игра определяется по egg, а не по наличию переменной.
3. **Переводов Steam Port нет:** в RU английский fallback ([DEV-562/F3](../../tickets/DEV-562.md#находки)).
4. **360 px:** кнопка копирования Domain/IP уходит за край карточки ([DEV-562/F1](../../tickets/DEV-562.md#находки)), Steam Port помещается.
5. **Reinstall Server = деструктив** (переустановка, затирание). С галочкой удаления файлов открывает окно
   [World Backup](world-backup.md).
6. **Имя сервера дрейфует** при реинсталле (авто-имя вида `Fcz3VN5n_439772`), UUID стабилен; суффикс `_NNNNNN` = ID услуги WHMCS.

## Гочи для тестирования

- **Адрес читать только из `.roadmap-ip`** - в консоли тоже есть `127.0.0.1:PORT`. KB §9f.
- **Rename - безопасный self-cleaning кейс:** сменить имя → Save → проверить → вернуть. Reinstall не жать никогда. KB §7f.
- **Идентичность сервера - только по UUID**, не по имени.
- Steam Port проверять на [srv:d70813d3](../../registry/test-servers.md#d70813d3) (PZ), регресс null - Arma
  [srv:1db4a8bb](../../registry/test-servers.md#1db4a8bb), MC [srv:45b14521](../../registry/test-servers.md#45b14521).

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Имя, статус, кнопки, вкладки, адрес и UUID | `server.overview.spec.ts` (SRV-001..003) | ✅ |
| Rename с откатом | `edit.server.spec.ts` (TC-GP-EDIT-001) | ✅ |
| Server IP = `allocation.ip`, не FQDN | `network.connection-info.spec.ts` (TC-GP-NET-010) | ✅ |
| Steam Port PZ | только ручной QA [DEV-562](../../tickets/DEV-562.md) | ❌ авто нет |
| Import Server, Reinstall | не покрыто (деструктив) | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 06-Jun-2026 | - | Recon Overview и Edit Server, KB §7f, §7h |
| ~25-Jun-2026 | - | Domain/IP показывает `allocation.ip` вместо `ip_alias` |
| 15-Oct-2026 | [DEV-562](../../tickets/DEV-562.md) | Steam Port для Project Zomboid |
| 15-Oct-2026 | [DEV-563](../../tickets/DEV-563.md) | У free-серверов в Edit Server только имя |
