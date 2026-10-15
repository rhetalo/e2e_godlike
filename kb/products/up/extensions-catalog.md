---
id: UP/extensions-catalog
title: Каталог расширений - моды, плагины, модпаки
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-10-09        # последняя живая сверка - QA DEV-534
tickets: [DEV-405, DEV-498, DEV-534, DEV-515, DEV-500, DEV-532]
flags: [extension-compatibility, cf-modrinth-source-switch]
tests:
  - tests/game/panel/extensions.spec.ts
  - tests/game/panel/mods.spec.ts
  - tests/game/panel/plugins.spec.ts
  - tests/game/panel/extension.sources.spec.ts
sources:
  - kb/tickets/DEV-405.md, DEV-498.md, DEV-534.md, DEV-515.md, DEV-500.md, DEV-532.md
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §7b, §7b-bis (recon 06-Jun и 20-Jul-2026)
  - test-docs/ultra.panel/dev405-cf-modrinth-REPORT.md, mods-loader-filter-REPORT.md
  - memory: cf-modrinth-source-swap, mods-loader-filter-qa
---

# Каталог расширений - моды, плагины, модпаки

> **В двух словах.** Вкладки Plugins/Mods и Modpacks в сервере - это витрина, где клиент ищет
> и ставит моды, плагины и сборки в один клик. С 30-Sep-2026 список для CurseForge и Modrinth
> приходит напрямую из их API, а не из нашей базы. По умолчанию каталог показывает только то, что
> подходит ядру и версии сервера; «All» расширяет выбор. Установленный мод можно обновить кнопкой Update.

## Где в интерфейсе

- Вкладки сервера **Plugins/Mods** (`/server/{uuid}/extensions`) и **Modpacks** (`/modpacks`) - это **один**
  компонент `server__extensions__*`, разный только контент и заголовок («Mods» / «Modpacks»). Источник: KNOWLEDGE_BASE §7b.
- Контролы: кнопки типа **Mods / Plugins / All / Installed**, поиск, фильтры **Loader, MC version, Category, Author**
  (Author скрыт на Modrinth), сортировка, пагинация, кнопки Help / Tutorial. Источник: §7b, [DEV-405](../../tickets/DEV-405.md).
- Переключатель **источника** (провайдера): CurseForge, Modrinth, Hangar, SpigotMC, Polymart и др. для сборок
  (FTB, ATLauncher, Technic, VoidsWrath). Набор зависит от вкладки (автотест TC-GP-SRC-004).
- Карточка мода → кнопка **Install** → диалог `.server__dialogs__action-dialog` (для плагинов заголовок «Install plugins») со списком версий и предупреждениями
  «Incompatible with your Minecraft version / loader», «Insufficient RAM». Источник: §7b-bis.
- Фильтр **Installed** → на карточке Uninstall; если есть новая версия - чип «Update available» и кнопка **Update**
  ([DEV-405](../../tickets/DEV-405.md)).
- Фильтры читаются из URL: `?provider=&loader=&mc_version=&search=&page=` и держатся после reload
  ([DEV-498](../../tickets/DEV-498.md), [DEV-534](../../tickets/DEV-534.md)).

## Как работает (под капотом)

| Действие | API (`panel.godlike.host/api/v2/servers/{uuid}/...`) | Источник |
|---|---|---|
| Список | `GET minecraft/{mods\|plugins\|modpacks}?provider=&search=&loader=&mc_version=&categories[]=&page=&per_page=&sort_by=` | [DEV-405](../../tickets/DEV-405.md), §7b-bis |
| Версии | `GET minecraft/{mods\|plugins\|modpacks}/{provider}-{id}/versions` - сырые файлы провайдера, newest-first | §7b-bis |
| Установлено | `GET minecraft/{mods\|plugins}/installed` - детект **по файлу на диске** | §7b-bis |
| Установка | `POST minecraft/mods {provider, mod_id, version_id}` | [DEV-405](../../tickets/DEV-405.md) |
| Удаление | `DELETE minecraft/mods/{provider}-{id}` | [DEV-405](../../tickets/DEV-405.md) |
| Модпак | `POST minecraft/modpacks` с обязательными `install_mode` (`overwrite`) и `world_folder` | [DEV-515](../../tickets/DEV-515.md) |

- **Откуда список.** CurseForge и Modrinth - live API провайдера (переключатель
  [flag:cf-modrinth-source-switch](../../registry/flags.md#cf-modrinth-source-switch), включён по SSH 30-Sep-2026).
  Признак нового пути: CF total = 10000 (лимит API), старый путь давал 10003 = count() таблицы.
  Остальные провайдеры и поля сборок `ram` / `is_optimized` - из своей библиотеки панели. Источник: [DEV-405](../../tickets/DEV-405.md).
- **`id` в ответе = сырой id провайдера** (`external_id`), не наш PK. На этом держится идентичность
  `{provider}-{id}` (TC-GP-MOD-002, TC-GP-PLG-002). Источник: §7b-bis.
- **Фильтры по умолчанию.** Пустые loader / mc_version бэкенд подставляет значениями сервера. «All» и «All versions»
  шлют `loader=any` / `mc_version=any` и реально расширяют список ([DEV-534](../../tickets/DEV-534.md)). В расширенном
  списке несовместимые моды помечены Incompatible.
- **Подгонка под ядро** (заглушки, автофильтр, отказ бэкенда на несовместимое) - отдельная фича
  [UP/mods-loader-gating](mods-loader-gating.md), под [flag:extension-compatibility](../../registry/flags.md#extension-compatibility).
- **Скрытие клиентских модов** - отдельная фича [UP/client-only-mods](client-only-mods.md).
- **Update не атомарный:** фронт делает DELETE старой версии, потом POST новой. Файл выбирается под loader и версию
  **сервера**, а не просто самый свежий (Storage Drawers forge-26.3.0.0 → forge-26.3.0.1). Источник: [DEV-405](../../tickets/DEV-405.md).
- **Видимость модпаков в каталоге** правит админ полем `is_listed` ([flag:is-listed](../../registry/flags.md#is-listed),
  [DEV-532](../../tickets/DEV-532.md)). Страницы фичи `UP/modpack-catalog` пока нет.

## Правила и граничные случаи

1. **CurseForge фильтрует loader только вместе с версией MC.** До фикса [DEV-498](../../tickets/DEV-498.md)
   CF + Fabric без версии отдавал Forge/NeoForge-моды. Modrinth был корректен всегда.
2. **На сервере 26.x пустой loader = loader сервера**, а под 26.3 модов почти нет. Для выборок фильтры ставили вручную
   (Forge 1.20.1, Fabric 1.21.1). Источник: [DEV-500](../../tickets/DEV-500.md).
3. **CurseForge `/versions` отдаёт максимум 50 файлов** ([DEV-405/B5](../../tickets/DEV-405.md#находки), вынесено, ❓ ключ).
4. **Список MC-версий в фильтре зашит во фронте** ([DEV-405/B2](../../tickets/DEV-405.md#находки)): на 05-Oct из 26.x есть только 26.3.
5. **CF-мод в Installed может быть подписан «modrinth»** - детект установленного по хешу
   ([DEV-405/N1](../../tickets/DEV-405.md#находки)).
6. **Без флага `extension-compatibility` на Paper поля фильтра пустые, но список уже сужен под сервер**
   ([DEV-534/F1](../../tickets/DEV-534.md#находки), Low).
7. **Пустое состояние «Mods Not Available… server loader»** показывается и когда пусто из-за поиска - вводит в заблуждение
   ([DEV-498/O1](../../tickets/DEV-498.md#находки)).
8. **Глобальный middleware превращает `''` в `null`** - корень [DEV-405/B1](../../tickets/DEV-405.md#находки)
   (со слов разработчика 30-Sep).

## Гочи для тестирования

- **Install = мутация** (POST, тяжело откатывается). Автотест install → uninstall только self-cleaning и под env
  (`RUN_PLUGIN_INSTALL=1` для PLG-006). Установка модпака = переустановка сервера, только с ок владельца.
- Кнопка Install и фильтр «Installed» совпадают по тексту: в PO различать по контейнеру (карточка vs
  `__extension-type__button`). Источник: §7b-bis.
- Элементы карточек имеют `data-v-*` - не использовать в селекторах. Источник: §7b-bis.
- Эталоны для сверки выдачи: CF `curseforge.com/api/v1/mods/{id}/files` (`gameVersions`), Modrinth
  `api.modrinth.com/v2/projects?ids=[..]` (`loaders`). Официальный CF API без ключа нам недоступен.
  Источник: [DEV-498](../../tickets/DEV-498.md), [DEV-500](../../tickets/DEV-500.md).
- Каталог живой: числа (total, выдача первой страницы) меняются день ко дню. В тестах - структурные проверки.
- На [srv:8c2a6bd7](../../registry/test-servers.md#8c2a6bd7) стоит модпак BMC4 - не трогать.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Рендер каталога Mods и Modpacks | `extensions.spec.ts` (TC-GP-EXT-001/002) | ✅ |
| Контракт списка, идентичность `{provider}-{id}`, Install-диалог, install → uninstall | `mods.spec.ts` (MOD-001..004) | ✅ |
| То же для плагинов + type-фильтры + поиск | `plugins.spec.ts` (PLG-001..006, PLG-006 за `RUN_PLUGIN_INSTALL=1`) | ✅ |
| Источник CF/Modrinth напрямую, набор провайдеров по вкладкам | `extension.sources.spec.ts` (SRC-001..004) | ✅ |
| Фильтр Loader на CF ([DEV-498](../../tickets/DEV-498.md)), «All» = `any` ([DEV-534](../../tickets/DEV-534.md)) | только ручной QA | ❌ авто нет |
| Update установленного мода | только ручной QA, авто-TC предложен в [DEV-405](../../tickets/DEV-405.md) | ❌ авто нет |
| Установка модпака из каталога (AC 7 DEV-405) | не проверялась | ❌ |
| Бейдж Optimized | нечем проверить (единственный `modpack_variants` неактивен) | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 20-Jul-2026 | - | Recon каталога и api/v2-контрактов (Inc 3 эпика MC extensions), KNOWLEDGE_BASE §7b-bis |
| 25-Sep-2026 | [DEV-498](../../tickets/DEV-498.md) | Фильтр загрузчика на CurseForge без версии MC |
| 30-Sep..05-Oct-2026 | [DEV-405](../../tickets/DEV-405.md) | Источник = прямые API CF/Modrinth, новые фильтры, Update мода |
| 07-Oct-2026 | [DEV-515](../../tickets/DEV-515.md) | Подгонка каталога под ядро → [UP/mods-loader-gating](mods-loader-gating.md) |
| 08-Oct-2026 | [DEV-532](../../tickets/DEV-532.md) | Скрытие дублей модпаков `is_listed` |
| 09-Oct-2026 | [DEV-534](../../tickets/DEV-534.md) | «All» / «All versions» расширяют список (`any`) |
| 12-Oct-2026 | [DEV-500](../../tickets/DEV-500.md) | Скрытие клиентских модов → [UP/client-only-mods](client-only-mods.md) |

Открыто: [DEV-405/B2, B4, B5](../../tickets/DEV-405.md#находки) - отдельные тикеты у разработки (❓ ключи),
[DEV-534/F1, F2](../../tickets/DEV-534.md#находки) - Low, [DEV-498/F2](../../tickets/DEV-498.md#находки) - NeoForge 3/195, Low.
