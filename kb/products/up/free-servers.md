---
id: UP/free-servers
title: Free-серверы в панели - ограничения бесплатного тарифа
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-10-15
tickets: [DEV-563, DEV-401, DEV-455]
flags: []
tests: []                      # автотестов нет
sources:
  - kb/tickets/DEV-563.md, DEV-401.md, DEV-455.md
  - test-docs/ultra.panel/DEV-563/DEV-563_free_egg_lock_checklist.xlsx
  - memory: dev563-free-egg-lock
---

# Free-серверы в панели - ограничения бесплатного тарифа

> **В двух словах.** Бесплатный сервер живёт в той же панели, что и платный, но с ограничениями. Главное
> на 15-Oct-2026: у free-сервера нельзя сменить игру или тип сервера - поля убраны из интерфейса, а бэкенд
> отклоняет попытку. Free-серверы видны и в ultra.panel, и в панели PlayFreeHost: бэкенд у них общий.

## Где в интерфейсе

- **Дашборд:** фильтр **Free** в «My Servers».
- **Edit Server** у free-сервера: только Server Name, полей Game/Platform и Server Type нет, переустановка не предлагается
  ([DEV-563](../../tickets/DEV-563.md), [UP/server-overview](server-overview.md)).
- **PlayFreeHost:** `playfreehost.com/panel` - дубль ultra.panel для free-пользователей, аккаунты синхронны, свой деплой фронта.

## Как работает (под капотом)

- **Признак free** в panel DB - только `servers.free` (плюс `free_timer`). Связи с продуктом WHMCS в панели нет.
- **Free-продукты WHMCS:** 282 и 1127 (US / не-US), группа Free Tariffs (Hidden). Есть и не-MC free (Terraria (USA) Free server).
  Суффикс имени `_NNNNNN` = ID услуги WHMCS.
- **Смена nest/egg** у free → 403 «Changing the server type is only available on paid plans.» Отказ атомарный: имя из того
  же запроса тоже не сохраняется. Подделать `free` / `free_timer` в PUT нельзя (проверка по БД).
  MR: [panel!1680](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1680),
  [new-panel!558](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/558).
- **Откуда берутся free-серверы:** лендинг `godlike.host/free-minecraft-server-hosting/` создаёт пользователя и сервер в 1 клик;
  попап Free Server Gift ([DEV-455](../../tickets/DEV-455.md)); перевод платного сервера на free из cancel-модуля
  ([UP/cancel-module](cancel-module.md)).
- `activity_logs` смену egg не пишет.

## Правила и граничные случаи

1. **Суть запрета - смена игры.** Смена версии / платформы MC на Versions, модпаки, Import / Reinstall - вне тикета (N/A, решение владельца 15-Oct).
2. **PlayFreeHost отстаёт по фронту:** на 15-Oct собран 30-Sep, без new-panel!558 - поля видны, Save → 403
   ([DEV-563/BUG-1](../../tickets/DEV-563.md#находки)).
3. **Старые free в panel DB, но API отвечает «does not exist»** - это terminated-услуги WHMCS, не баг ([DEV-563/O1](../../tickets/DEV-563.md#находки)).
4. **Free-слот аккаунта** может быть общим с PROD-126 ❓ ([DEV-401](../../tickets/DEV-401.md)).
5. Другие ограничения free (ресурсы, таймер `free_timer`, suspend) - ❓ не описаны.

## Гочи для тестирования

- Free для теста: [srv:0010cf61](../../registry/test-servers.md#0010cf61) (старый лендинг → ultra.panel),
  [srv:d716acea](../../registry/test-servers.md#d716acea) (через playfreehost.com), [srv:3f1e7d13](../../registry/test-servers.md#3f1e7d13) (Terraria);
  платный регресс - [srv:75d1175e](../../registry/test-servers.md#75d1175e).
- Свежесть фронта PFH: `Last-Modified` у `playfreehost.com/panel/assets/index-*.js`.
- Проверять 403 прямым PUT, не только отсутствие полей.

## Покрытие

- **Автотестов нет.** Ручной чек-лист FE-01..FE-26: [DEV-563_free_egg_lock_checklist.xlsx](../../../test-docs/ultra.panel/DEV-563/DEV-563_free_egg_lock_checklist.xlsx).
- Хвост: перепроверить FE-07 / FE-10 после деплоя фронта PlayFreeHost.

## История

| Дата | Тикет | Что |
|---|---|---|
| 14..17-Aug-2026 | [DEV-401](../../tickets/DEV-401.md) | Перевод на free-план из cancel-модуля |
| 15-Oct-2026 | [DEV-455](../../tickets/DEV-455.md) | Попап Free Server Gift и цепочка писем |
| 15-Oct-2026 | [DEV-563](../../tickets/DEV-563.md) | Запрет смены игры / типа сервера для free |
