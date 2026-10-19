---
id: UP/mods-loader-gating
title: Loader gating - каталог и установка по ядру сервера
type: feature
product: UP
status: draft
updated: 2026-10-19
verified_on: 2026-10-19        # последняя живая сверка - DEV-549 (туториал, кнопка, API по всем ядрам)
tickets: [DEV-515, DEV-529, DEV-534, DEV-549]
flags: [extension-compatibility]
tests: [tests/game/panel/mods.spec.ts]   # только контракт API (TC-GP-MOD-005); поведение - ручной QA
sources:
  - kb/tickets/DEV-515.md, DEV-529.md, DEV-534.md, DEV-532.md
  - test-docs/ultra.panel/dev515-mods-loader-gating-REPORT.md
  - test-docs/ultra.panel/dev529-arclight-start-REPORT.md
  - memory: dev515-mods-loader-gating, dev529-arclight-start-fix
---

# Loader gating - каталог и установка по ядру сервера

> **В двух словах.** Панель знает, какое ядро стоит на сервере (Forge, Fabric, Paper, Vanilla...), и сама
> подстраивает каталог расширений: подставляет нужные фильтры, показывает заглушку вместо неподходящей
> вкладки и не даёт поставить несовместимое даже через API. Работает только под флагом
> [flag:extension-compatibility](../../registry/flags.md#extension-compatibility), который на 15-Oct-2026 включён
> лишь у 3 пользователей. Это надстройка над [UP/extensions-catalog](extensions-catalog.md).

## Где в интерфейсе

- **Вкладки Plugins/Mods и Modpacks** ([UP/extensions-catalog](extensions-catalog.md)): фильтры Loader + MC version
  предзаполнены по ядру сервера.
- **Заглушки** вместо каталога (тексты EN/UA/RU по ТЗ):

| Ядро | Закрыто заглушкой | Пример текста |
|---|---|---|
| Vanilla | Mods, Modpacks, Plugins | ❓ текст не записан |
| Paper-подобные и proxy | Mods, Modpacks | «core supports plugins only» |
| Forge, NeoForge, Fabric, Quilt | Plugins | «mods only» |

- **Попап версий мода** показывает только совместимые версии, даже если клиент вручную сменил фильтр. Если
  совместимых нет - «No compatible versions were found for your server.», Install disabled.
- Версия в попапе предвыбрана, даже если фильтр не совпадает с ядром ([DEV-515/F6](../../tickets/DEV-515.md#находки)).
- **Tutorial** на вкладках строит шаги по ядру и вкладке запуска ([DEV-549](../../tickets/DEV-549.md)):

| Ядро | С какой вкладки | Шаги |
|---|---|---|
| Моды есть (Forge, Fabric, NeoForge, Quilt, гибриды) или флага нет | Mods / Modpacks | прежние 7: intro → modpacks → mods types / search / install → FM custom modpack → FM upload |
| Чистый мод-лоадер | Plugins | 8: первым «плагины недоступны, моды поддерживаются», затем прежние 7 |
| Paper-подобные | Mods / Modpacks | 6: «как ставить плагины» → шаг на заглушке → Plugins types / search / install (вкладка сама) → FM upload |
| Paper-подобные | Plugins | 5: тот же тур без шага на заглушке |
| Vanilla | любая | 1: шаг с текстом вкладки, «1 of 1», End Tutorial |

- **«Upload custom modpack» в File Manager** при `supports_modpacks:false` (Paper-подобные, Vanilla): контурная `#ff784d`,
  disabled, тултип «Custom modpacks cannot be uploaded on this core…» по hover и фокусу (Tab). На 390 px подпись «Upload manifest».
  Платная Custom Modpack Setup (DEV-527) на вкладке Modpacks доступна при любом ядре - так согласовано.

Источник: [DEV-515](../../tickets/DEV-515.md), [DEV-534](../../tickets/DEV-534.md), [DEV-549](../../tickets/DEV-549.md).

## Как работает (под капотом)

- **Источник правды:** `GET /api/v2/servers/{uuid}/minecraft/version` → `extension_capabilities`
  `{supports_mods, supports_plugins, supports_modpacks, mod_loader, game_version, enforced, plugin_loader}`.
  Без флага `extension_capabilities = null`: заглушек нет, поля фильтра пустые (бэкенд всё равно сужает список
  под сервер, см. [DEV-534](../../tickets/DEV-534.md)).
- **Флаг Pennant считается по владельцу сервера**, а не по тому, кто смотрит. Источник: [обзор UP, гоча 2](README.md#сквозные-гочи).
- **`/{mods|plugins}/{provider}-{id}/versions` игнорирует подменённые клиентом** `loader` / `mc_version` - бэкенд
  берёт значения сервера.
- **Бэкенд режет установку** ответом 409:

| Код | Когда |
|---|---|
| `mods_not_supported` | моды на ядре без модов (Paper, Vanilla) |
| `plugins_not_supported` | плагины на модовом ядре или Vanilla |
| `modpacks_not_supported` | модпак на ядре без модов |
| `incompatible_mod_loader` | файл мода под другой loader |
| `incompatible_game_version` | файл под другую версию MC |
| `incompatible_plugin_loader` | плагин под другой plugin loader |

- **Плагины фильтруются по версии MC:** Paper 26.2, WorldEdit - 50 → 5 версий ([DEV-515/F5](../../tickets/DEV-515.md#находки)).
- **Arclight** (гибрид моды + плагины) определяется по flavor `-forge` / `-neoforge` / `-fabric`. Flavor идёт в
  `extension_capabilities.mod_loader`, missing-mods (`resolve-missing` `meta.loader`) и optimization-mod
  (`godlikemetrics` кладётся по flavor). После Start / Restart / «Refresh version» тип остаётся `ARCLIGHT`
  ([DEV-529](../../tickets/DEV-529.md)).
- **Quilt принимает Fabric-моды** ([DEV-515/N1](../../tickets/DEV-515.md#находки), фикс 07-Oct).

## Правила и граничные случаи

1. **Leaves / Waterfall / Pufferfish** раньше не распознавались (`enforced:false`, Fabric API ставился на Leaves) -
   исправлено 06-Oct ([DEV-515/F1](../../tickets/DEV-515.md#находки)).
2. **`supports_plugins=false` → `plugin_loader: null`, `plugin_providers: []`** с [DEV-549](../../tickets/DEV-549.md) (раньше `spigot`).
   Гибриды и Paper-подобные без изменений. Сервер с ненайденным ядром (`minecraft_type: null`) тоже отдаёт `null` / `[]`
   при `supports_plugins: true` - так было и до DEV-549 ([DEV-549/L3](../../tickets/DEV-549.md#находки)).
3. **Без флага окно установки мода выбирает первый файл без учёта ядра** ([DEV-529/F2](../../tickets/DEV-529.md#находки), открыт).
4. **Velocity не ставится из UI** (версии без названий, 400) - [DEV-515/S1](../../tickets/DEV-515.md#находки), вне задачи.
5. **BungeeCord:** Simple Voice Chat помечен Installed, а на диске bukkit-jar - [DEV-515/S2](../../tickets/DEV-515.md#находки).
6. **Tutorial на заглушках** больше не ищет карточку, которой нет ([DEV-515/O1](../../tickets/DEV-515.md#находки) исправлен в
   [DEV-549](../../tickets/DEV-549.md)). Если каталог ещё грузится, шаг Installation показывается по центру без подсветки
   ([DEV-549/L1](../../tickets/DEV-549.md#находки)). Тур FM не стартует поверх туториала и не помечается показанным.
7. **Mohist:** после Start установленный билд раньше становился `build:null` - исправлено 08-Oct
   ([DEV-529/F1](../../tickets/DEV-529.md#находки)). Youer и Magma в каталоге панели нет.
8. **Риск раскатки флага:** стоковая Modrinth BMC4 не стартует из-за `ambiguous_loader`
   ([DEV-532/F1](../../tickets/DEV-532.md#находки)), на ней 15+ клиентских серверов.

## Гочи для тестирования

- **Тестовый владелец должен иметь флаг.** Под флагом - [srv:546bc52e](../../registry/test-servers.md#546bc52e)
  ([acc:admin](../../registry/test-accounts.md#admin)); без флага -
  [srv:0cf8346f](../../registry/test-servers.md#0cf8346f).
- **Мир 546bc52e на 26.2**, на 1.21.1 не грузится - стартовать через временный `level-name`.
- **Не верить фронту:** проверять 409 прямым POST и подмену `loader` в `/versions`.
- **Смена ядра = Versions → Install (+Wipe)** - деструктив, только на своих тест-серверах.

## Покрытие

- **Контракт - автотест** `mods.spec.ts` (TC-GP-MOD-005): zod-схема `GET minecraft/version`, в т.ч. `extension_capabilities`
  (объект или null; на проде 16-Oct везде null - флаг выключен, внутренности не контрактованы). Поведение гейтинга - только руками.
- Ручной QA: [dev515-mods-loader-gating-REPORT.md](../../../test-docs/ultra.panel/dev515-mods-loader-gating-REPORT.md),
  [dev529-arclight-start-REPORT.md](../../../test-docs/ultra.panel/dev529-arclight-start-REPORT.md).
- Не покрыто: Velocity ([DEV-515/S1](../../tickets/DEV-515.md#находки)), тексты заглушек на UA/RU после раскатки флага.

## История

| Дата | Тикет | Что |
|---|---|---|
| 05..07-Oct-2026 | [DEV-515](../../tickets/DEV-515.md) | Автофильтр, заглушки, 409 на несовместимое; F1-F6 и N1 исправлены, PASS 07-Oct |
| 06-Oct-2026 | [DEV-529](../../tickets/DEV-529.md) | Arclight остаётся Arclight после старта, flavor в capabilities ([DEV-515/F2](../../tickets/DEV-515.md#находки) закрыт здесь) |
| 08-Oct-2026 | [DEV-529](../../tickets/DEV-529.md) | Mohist сохраняет билд после старта |
| 09-Oct-2026 | [DEV-534](../../tickets/DEV-534.md) | «All» = `any` расширяет список поверх автофильтра |
| 19-Oct-2026 | [DEV-549](../../tickets/DEV-549.md) | Tutorial по ядру, кнопка Upload custom modpack disabled на ядрах без модпаков, `plugin_loader: null` без плагинов |

Открыто: снятие / раскатка флага `extension-compatibility` - за разработкой.
