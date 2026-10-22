---
id: UP/client-only-mods
title: Client-only моды - скрытие в каталоге и отключение на сервере
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-10-12        # последняя живая сверка - финал DEV-500
tickets: [DEV-500, DEV-492, DEV-558]
flags: [MOD_SCAN_BACKFILL]
tests: []                      # автотестов нет, только ручной QA
sources:
  - kb/tickets/DEV-500.md, DEV-492.md
  - test-docs/ultra.panel/DEV-500/client-only-mods-hide-REPORT.md (+ RECHECK, RECHECK2, RECHECK3)
  - test-docs/ultra.panel/DEV-492/dev492-post-install-mod-scan-REPORT.md
  - memory: dev500-client-only-mods-hide, dev492-post-install-mod-scan
---

# Client-only моды - скрытие в каталоге и отключение на сервере

> **В двух словах.** Есть моды, нужные только игроку: шейдеры, миникарты, твики интерфейса. На сервере они
> бесполезны или роняют его. Панель защищает от них в двух местах: **каталог** их не показывает
> ([DEV-500](../../tickets/DEV-500.md)), а если такой мод всё-таки попал на сервер (в модпаке или руками),
> **сканер** находит его и при старте переименовывает в `*.jar.disabled`
> ([DEV-492](../../tickets/DEV-492.md)). Моды, нужные и клиенту, и серверу, остаются.

## Где в интерфейсе

- **Каталог Mods** ([UP/extensions-catalog](extensions-catalog.md)): клиентских модов в выдаче нет. Пустая страница -
  «Nothing found / Nothing matches the current filters», без Total и без «Try the next page» на последней или
  единственной странице ([new-panel!547](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/547)).
- **Окно «Some mods were disabled» → Got It** - после установки модпака или на старте, когда сканер отключил моды.
- **Files** - отключённые моды лежат в `mods/` как `*.jar.disabled`.
- **Конструктор модпаков** клиентские моды показывает специально (их ставит игрок себе).

## Как работает (под капотом)

### 1. Скрытие в каталоге ([DEV-500](../../tickets/DEV-500.md))

| Провайдер | Правило скрытия | Откуда данные |
|---|---|---|
| Modrinth | `server_side=unsupported` + пост-фильтр live-выдачи | таблица `mods` (panel DB) + live search API Modrinth |
| CurseForge | метки `Client` / `Server` в `gameVersions` **самого нового файла под выбранные loader + version**: скрыт, если есть хотя бы одна `Client` и ни одной `Server`. Файл без меток - откат на `latestFiles` | live API CF; в БД поля среды у CF = NULL ([panel!1672](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1672)) |

- Скрытие **только в каталоге**: прямой `POST /minecraft/mods {provider, mod_id, version_id}` скрытый мод ставит.
- Скорость: CF страницы 2-4 стали 370-530 мс (было 240-520), Modrinth без изменений (~250 мс).

### 2. Скан и отключение на сервере ([DEV-492](../../tickets/DEV-492.md))

- После установки модпака (каталог CF/Modrinth, custom manifest, конструктор), одиночного мода или Update
  неизвестные jar получают вердикт за 0-7 с, **до первого Start**. Повторная установка того же пака новых записей не создаёт.
- На старте breaking-моды переименовываются в `*.jar.disabled`. Старт не медленнее (Starting через 0,2 с).
- **Фоновый сканер `scanner`** работает непрерывно: вручную залитый jar подхватывается примерно за 18 минут.
- Таблицы panel DB:

| Таблица | Что хранит |
|---|---|
| `server_modpacks` | факт установки модпака |
| `minecraft_mod_scan_results` | вердикты по jar (`source='install'` - дочитка после установки) |
| `server_client_only_mod_overrides` | решение пользователя по моду, матч по хешу |

- Лимиты дочитки (со слов разработчика): 200 файлов / 32 МБ на файл / 256 МБ всего, env
  [MOD_SCAN_BACKFILL](../../registry/flags.md#mod_scan_backfill). Go-сканер не берёт jar больше 100 МБ.
- Работает без флагов, на проде примерно с 28-Sep-2026.

## Правила и граничные случаи

1. **Сторона мода известна только у Fabric** (`fabric.mod.json`). Forge/NeoForge jar всегда `safe`
   («side detection deferred») - клиентские Forge-моды на сервере **не отключаются**
   ([DEV-492/F9](../../tickets/DEV-492.md#находки), вынесено в DEV-321 v1, ❓ ключ). Legacy Forge 1.12.2 и ниже (`mcmod.info`) - тоже всегда safe.
2. **Сброс override (DEV-558, prod 21-Oct-2026).** Uninstall стирает запись по хешу файла; Reinstall, смена версии с
   Wipe, модпак `delete`/`backup`, удаление модпака стирают все записи сервера. Файл, исчезнувший и вернувшийся через
   файловый менеджер/SFTP, записи не сбрасывает (неотличим от ручного включения). Исправляет
   [DEV-492/F5](../../tickets/DEV-492.md#находки). С panel!1697 сброс идёт после фактического удаления: Reinstall только
   с «Delete files» (`reallocate`), модпак `delete`/`backup` - в джобе после `deleteFiles` (упавший бэкап память не
   трогает), плюс смена игры. Ретест 21-Oct PASS.
3. **jar больше 100 МБ без вердикта** (Cobblemon 131 МБ) - [DEV-492/F2](../../tickets/DEV-492.md#находки).
4. **«Some mods were disabled» → Got It не пишет `acknowledged_at`**, окно повторяется - [DEV-492/F3](../../tickets/DEV-492.md#находки).
5. **Утечки Modrinth:** индекс матчит проект по среде, если хоть одна версия `client_and_server` / `unknown`
   (JEBr, FISM) - [DEV-500/F3](../../tickets/DEV-500.md#находки), остаток 3 мода.
6. **CF без меток** (JER, TexTrue) остаются скрыты, Living Horizon виден в Forge 1.20.1 -
   [DEV-500/N2, O1](../../tickets/DEV-500.md#находки), Low. Остаток видимых клиентских CF - 14 из 131 ([DEV-500/N4](../../tickets/DEV-500.md#находки)).
7. **Правило `client_side=required + server_side=optional` убрано:** оно прятало client+server моды (GeckoLib, Xaero, EMI) -
   [DEV-500/F2](../../tickets/DEV-500.md#находки).

## Гочи для тестирования

- **Сервер 26.x:** пустой loader = loader сервера, а под 26.3 модов почти нет. Для выборок ставить фильтр руками
  (Forge 1.20.1, Fabric 1.21.1).
- **Эталон для CF** - сайт-API `curseforge.com`, официальный CF API без ключа недоступен.
- **Отключение проверять на Fabric-сервере** (Forge всегда safe). Клиентский тест-мод: CF Controlling (250398), файлы
  19.0.3 Fabric 1.21.1 = 5759860, 18.0.4 Fabric 1.21 = 5603224; в каталоге скрыт, ставить `POST /minecraft/mods
  {provider, mod_id, version_id}`. Отключение срабатывает на Start, Restart (после «Yes, Restart») и принятии EULA;
  если старт блокирует префлайт `server-jar/status` (`ambiguous_loader`), сканер не запускается.
- Стенды: каталог - [srv:8c2a6bd7](../../registry/test-servers.md#8c2a6bd7) (на нём модпак BMC4, 266 jar - не трогать),
  скан - [srv:ca326e28](../../registry/test-servers.md#ca326e28), Paper - [srv:f8e7df56](../../registry/test-servers.md#f8e7df56),
  trial - [srv:33b383ef](../../registry/test-servers.md#33b383ef).

## Покрытие

- **Автотестов нет.** Ручной QA: отчёты [DEV-500](../../../test-docs/ultra.panel/DEV-500/client-only-mods-hide-RECHECK3-REPORT.md)
  (финал) и [DEV-492](../../../test-docs/ultra.panel/DEV-492/dev492-post-install-mod-scan-REPORT.md).
- Не покрыто: Forge-моды (by design safe), legacy Forge, перепроверка F5 после [panel!1665](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1665).

## История

| Дата | Тикет | Что |
|---|---|---|
| ~28-Sep-2026 | [DEV-492](../../tickets/DEV-492.md) | Дочитка вердиктов сразу после установки на проде |
| 05-Oct-2026 | [DEV-500](../../tickets/DEV-500.md) | Первый прогон: AC1, AC2 FAIL (CF не фильтруется, GeckoLib прятался) |
| 07-Oct-2026 | [DEV-500](../../tickets/DEV-500.md) | [panel!1652](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1652), [panel!1660](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1660), [new-panel!546](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/546): CF клиентских 131 → 56 → 15 |
| 09-Oct-2026 | [DEV-492](../../tickets/DEV-492.md) | [panel!1665](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1665): манифест с битым fileID не рвёт установку, легаси-эндпоинт проверяет ядро. PASS |
| 12-Oct-2026 | [DEV-500](../../tickets/DEV-500.md) | [panel!1672](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1672) + [new-panel!547](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/547): CF по файлу под loader+version, 14 из 131. PASS |

Связано: пост-инсталл скан как отдельная фича (`UP/post-install-mod-scan`) пока описан здесь; окно
«Missing mod dependencies» - [TASK-missing-mod-deps](../../tickets/TASK-missing-mod-deps.md).
