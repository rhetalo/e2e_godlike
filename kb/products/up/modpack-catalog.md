---
id: UP/modpack-catalog
title: Модпаки - каталог, видимость и установка
type: feature
product: UP
status: draft
updated: 2026-10-16
verified_on: 2026-10-16        # последняя живая сверка - DEV-452
tickets: [DEV-532, DEV-405, DEV-472, DEV-492, DEV-459, DEV-452, DEV-484]
flags: [is-listed, modpack-catalog-v2, extension-compatibility, VITE_MANAGED_MODPACK_URL]
tests: [tests/game/panel/extensions.spec.ts, tests/game/panel/extension.sources.spec.ts]
sources:
  - kb/tickets/DEV-532.md, DEV-405.md, DEV-472.md, DEV-492.md, DEV-459.md, DEV-515.md
  - kb/products/up/README.md (гоча 7, пробел 9)
  - test-docs/ultra.panel/dev532-modpack-catalog-visibility-REPORT.md
  - kb/tickets/DEV-452.md, DEV-484.md, kb/products/up/api/modpacks.md
  - memory: dev532-modpack-catalog-visibility, panel-modals-handle-myself, dev452-modpack-backup-fail-reasons
---

# Модпаки - каталог, видимость и установка

> **В двух словах.** Модпак - это готовая сборка модов. Во вкладке Modpacks клиент выбирает сборку
> (CurseForge, Modrinth, FTB и др.) и ставит её на сервер, по сути переустанавливая его. Какие сборки видны
> клиенту, решает админ галочкой `is_listed` - так скрывают дубли одной сборки с разных площадок. После
> установки панель сама подгоняет версию Minecraft, ядро и Java и проверяет новые моды на «клиентские».

## Где в интерфейсе

- Таб **Modpacks** (`/server/{uuid}/modpacks`) - тот же компонент, что каталог модов
  ([UP/extensions-catalog](extensions-catalog.md)), с заголовком «Modpacks».
- **Цепочка окон при установке:** «Install modpacks» → «needs more RAM» → Install Anyway → «Save Your World First?»
  ([UP/world-backup](world-backup.md)) → «Some mods were disabled» → Got It. Источник: [обзор UP, гоча 7](README.md#сквозные-гочи),
  [DEV-472](../../tickets/DEV-472.md).
- **Режимы установки:** Install Over, Delete Existing Files, Create Backup and Install ([DEV-418](../../tickets/DEV-418.md)).
- **Свой модпак:** Files → `/mods` → «Upload custom modpack / Upload manifest» (CF `manifest.json`).
- **Платная сборка «под ключ»:** блок «Don't want to build or configure your modpack yourself?» в Modpacks и в `/mods`
  ведёт на заказ Custom Modpack Setup ([DEV-459](../../tickets/DEV-459.md)).
- **Админка** `/admin/modpacks-v2/view/{id}`: чекбокс «Client catalog» (колонка Listed / Hidden) - это ADM, только с ок владельца.

## Как работает (под капотом)

- **Список:** `GET /api/v2/servers/{uuid}/minecraft/modpacks?provider=...`. CurseForge и Modrinth - live API
  провайдера; остальные (FTB, ATLauncher, Technic, VoidsWrath) и поля `ram` / `is_optimized` - своя библиотека панели
  ([DEV-405](../../tickets/DEV-405.md)).
- **Установка:** `POST minecraft/modpacks` с обязательными `install_mode` (валидно `overwrite`) и `world_folder`
  ([DEV-515](../../tickets/DEV-515.md)). Под [flag:extension-compatibility](../../registry/flags.md#extension-compatibility)
  на ядре без модов → 409 `modpacks_not_supported`.
- **API установки и отказов:** подробные коды, поля и порядок проверок - в [UP API - modpacks](api/modpacks.md), асинхронные ошибки - в [UP API - server](api/server.md).
- **Видимость:** колонка `modpacks_v2.is_listed` ([flag:is-listed](../../registry/flags.md#is-listed)), меняется в админке
  `PATCH .../listing` и действует со следующего запроса (API `Cache-Control: no-cache`, Cloudflare `DYNAMIC`).
  Скрытая запись пропадает из клиентского каталога и калькулятора modded-страницы, `meta.total` уменьшается.
  Источник: [DEV-532](../../tickets/DEV-532.md).
- **Скрытая ≠ удалённая:** detail отдаёт 200 с версиями, серверы на ней ставятся и обновляются, админка пулов её видит,
  прямая ссылка корзины `modpackId=modrinth:...` открывается.
- **После установки:**
  - запись в `server_modpacks` - от неё считается `required_java`; переживает Wipe и смену версии, снимается Uninstall
    или вайпом с 26.x ([DEV-472](../../tickets/DEV-472.md));
  - панель обновляет версию MC и loader, установщик ставит подходящую Java ([DEV-472/F6, F7](../../tickets/DEV-472.md#находки));
  - неизвестные jar получают вердикт за 0-7 с, клиентские отключаются на старте ([UP/client-only-mods](client-only-mods.md)).
- **Каталог v2** - под [flag:modpack-catalog-v2](../../registry/flags.md#modpack-catalog-v2) (только staff). Что именно
  он меняет для клиента ❓ ([обзор UP, пробел 5](README.md#пробелы)).

## Отказы при установке с бэкапом (DEV-452)

Только режим «Create Backup and Install». Бэкенд проверяет заранее, экран прогресса при отказе не открывается:

| Ситуация | Ответ | Что видит пользователь |
|---|---|---|
| Нет свободных слотов бэкапов | 409 `no_free_backup_slots` | диалог «No Free Backup Slots» + Go To Backups |
| Лимит частоты бэкапов | 409 `backup_throttled` (`retry_after`, `retry_at`, `throttle_limit`, `throttle_period`) | диалог «Backup Limit Reached», только крестик |
| Отказ позже по ходу установки | поле `modpack_install_error` (8 кодов) | тост со своим текстом на каждый код |

- Порядок проверок: сначала лимит частоты, потом слоты ([API - modpacks](api/modpacks.md#post-serversuuidminecraftmodpacks)).
- После [DEV-484](../../tickets/DEV-484.md) пре-инсталл бэкап вне лимита частоты, поэтому `backup_throttled` из новой панели получить нельзя.
  Диалог «Backup Limit Reached» проверен только подменой ответа.
- Слот пре-инсталл бэкап занимает: на тарифе с одним слотом вторая установка с бэкапом невозможна, пока бэкап не удалён.
- Старая React-панель отказы не объясняет ([DEV-452/Q1](../../tickets/DEV-452.md#хвосты)).
- Открытые находки: [DEV-452/F1, F2, F3](../../tickets/DEV-452.md#находки), [DEV-484/F1](../../tickets/DEV-484.md#находки).

## Правила и граничные случаи

1. **Скрытие ручное, по одному модпаку.** Глобального приоритета CF над Modrinth нет. Нескрытых пар по имени 50+
   ([DEV-532/O1](../../tickets/DEV-532.md#находки)), но совпадение имени ≠ дубль: Create+ - три разных записи (O2).
2. **Стоковая Modrinth BMC4 не стартует** - `server-jar/status` = `ambiguous_loader` (6 модов с меткой fabric в
   Forge-сборке), на ней 15+ клиентских серверов ([DEV-532/F1](../../tickets/DEV-532.md#находки)).
3. **Повторный Start молча откатывается** без сообщения ([DEV-532/F2](../../tickets/DEV-532.md#находки)).
4. **Ошибки манифеста** (несуществующий fileID) не рвут установку, но в UI не показываются
   ([DEV-492/F6, F7](../../tickets/DEV-492.md#находки)).
5. **Установка при лежащей ноде** - немая неудача ([DEV-492/F4](../../tickets/DEV-492.md#находки)).
6. **«Some mods were disabled» повторяется** - Got It не пишет `acknowledged_at` ([DEV-492/F3](../../tickets/DEV-492.md#находки)).
7. **Конструктор модпаков** на витрине - отдельная история (WPGL), клиентские моды там показываются специально.

## Гочи для тестирования

- **Установка модпака = переустановка сервера** (overwrite). Только с ок владельца и на своих серверах; AC 7 DEV-405
  для сборок поэтому не проверялся.
- **Модалки цепочки снимать по очереди**, ждать короткими шагами (≤60-90 с). EULA и свои окна закрываем сами.
- **Гоча админки:** клик по чекбоксу через `label[for=modpackIsListed]` (label перехватывает клик).
- **После скрытия дублей вернуть `is_listed=1`** (в DEV-532 скрывали 6 Modrinth-записей, все вернули).
- На [srv:8c2a6bd7](../../registry/test-servers.md#8c2a6bd7) стоит Modrinth BMC4 v59 + 15 disabled модов - не трогать.
- **Order Now на проде не жать** (создание сервера = оплата).

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Рендер каталога Modpacks | `extensions.spec.ts` (TC-GP-EXT-002) | ✅ |
| Список сборок из CF/Modrinth напрямую | `extension.sources.spec.ts` (TC-GP-SRC-003) | ✅ |
| `is_listed`: скрытие, detail, корзина, калькулятор | ручной QA [DEV-532](../../tickets/DEV-532.md) + регресс `slider.modded`, `modpack.config.modded` | ⚠️ авто только витрина |
| Установка модпака, режимы, цепочка окон | ручной QA попутно ([DEV-472](../../tickets/DEV-472.md), [DEV-492](../../tickets/DEV-492.md), [DEV-418](../../tickets/DEV-418.md)) | ❌ авто нет |
| Upload custom modpack | ручной QA [DEV-492](../../tickets/DEV-492.md) | ❌ авто нет |
| Отказы пре-инсталл бэкапа: слоты живьём, диалог и тосты подменой ответа | ручной QA [DEV-452](../../tickets/DEV-452.md), [DEV-484](../../tickets/DEV-484.md) | ⚠️ авто нет |
| Бейдж Optimized | нечем проверить (единственный `modpack_variants` неактивен) | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 14-Aug-2026 | [DEV-418](../../tickets/DEV-418.md) | «Save Your World First?» на Delete Existing Files и Create Backup and Install |
| 28-Sep-2026 | [DEV-459](../../tickets/DEV-459.md) | Вход в Custom Modpack Setup из Modpacks и `/mods` |
| 30-Sep..05-Oct-2026 | [DEV-405](../../tickets/DEV-405.md) | Сборки CF/Modrinth из live API |
| 02..08-Oct-2026 | [DEV-472](../../tickets/DEV-472.md) | После установки обновляются версия, loader, Java |
| 08-Oct-2026 | [DEV-532](../../tickets/DEV-532.md) | Видимость `is_listed`, скрытие дублей |
| 09-Oct-2026 | [DEV-492](../../tickets/DEV-492.md) | Скан модов сразу после установки, манифест не рвёт установку |
| 09-Sep-2026 | [DEV-452](../../tickets/DEV-452.md) | Префлайт лимита и слотов, 8 причин отказа, диалог и тосты (QA 16-Oct-2026) |
| 16-Sep-2026 | [DEV-484](../../tickets/DEV-484.md) | Пре-инсталл бэкап вне лимита частоты |
