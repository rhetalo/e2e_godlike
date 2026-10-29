---
id: UP/client-only-mods
title: Client-only моды - скрытие в каталоге и отключение на сервере
type: feature
product: UP
status: draft
updated: 2026-10-29
verified_on: 2026-10-29        # Forge/NeoForge/legacy - DEV-559
tickets: [DEV-500, DEV-492, DEV-558, DEV-557, DEV-556, DEV-559]
flags: [MOD_SCAN_BACKFILL, mod-scan-side-detection-enforce]
tests: [tests/game/panel/client-only-mods.spec.ts]
sources:
  - kb/tickets/DEV-500.md, DEV-492.md
  - test-docs/ultra.panel/DEV-500/client-only-mods-hide-REPORT.md (+ RECHECK, RECHECK2, RECHECK3)
  - test-docs/ultra.panel/DEV-492/dev492-post-install-mod-scan-REPORT.md
  - kb/tickets/DEV-559.md (Forge/NeoForge, гард)
  - memory: dev500-client-only-mods-hide, dev492-post-install-mod-scan, dev559-forge-neoforge-client-mods
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
- **Окно «Some mods were disabled»** - после установки модпака или на старте, когда сканер отключил моды. С 23-Oct-2026 в окне
  список «Disabled client-side mods» (и «Other disabled files» для старых записей без имени). «Got It» закрывает окно до
  нового отключения (localStorage), «Don't Show Again» гасит насовсем ([DEV-556](../../tickets/DEV-556.md), [API](api/minecraft-mods.md#get-serversuuidminecraftclient-only-notice)).
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

1. **Сторона мода (DEV-559, parser v9, прод с 26-Oct-2026).** Fabric - `fabric.mod.json`. Forge/NeoForge - `clientSideOnly=true` или зависимость minecraft/forge/neoforge с `side=CLIENT` в `mods.toml`, плюс байткод `@Mod clientSideOnly=true` (работает и для legacy 1.12.2 с `mcmod.info`). Флаг `mod-scan-side-detection-enforce`. Моды без признаков (Mouse Tweaks, старые Controlling) остаются safe. Гард: Forge/NeoForge breaking-мод, который жёстко требует включённый мод (по `mod_id`/`provides`), не отключается, а ранее отключённый возвращается - [DEV-559/K1](../../tickets/DEV-559.md) (на обсуждении): так возвращается и Sodium, роняющий NeoForge-сервер.
2. **Сброс override (DEV-558, prod 21-Oct-2026).** Uninstall стирает запись по хешу файла; Reinstall, смена версии с
   Wipe, модпак `delete`/`backup`, удаление модпака стирают все записи сервера. Файл, исчезнувший и вернувшийся через
   файловый менеджер/SFTP, записи не сбрасывает (неотличим от ручного включения). Исправляет
   [DEV-492/F5](../../tickets/DEV-492.md#находки). С panel!1697 сброс идёт после фактического удаления: Reinstall только
   с «Delete files» (`reallocate`), модпак `delete`/`backup` - в джобе после `deleteFiles` (упавший бэкап память не
   трогает), плюс смена игры. Ретест 21-Oct PASS.
3. **jar больше 100 МБ без вердикта** (Cobblemon 131 МБ) - [DEV-492/F2](../../tickets/DEV-492.md#находки).
4. **Окно «Some mods were disabled»** ([DEV-556](../../tickets/DEV-556.md), закрывает [DEV-492/F3](../../tickets/DEV-492.md#находки)):
   «Got It» пишет в `localStorage` ключ `client-only-notice-dismissed:<uuid>` = `revision` и на бэкенд ничего не шлёт.
   Окно вернётся, только когда `revision` вырастет (новое отключение). Ручное включение мода убирает его из списка, `revision`
   не меняет. В другом браузере или профиле окно появится снова - by design. `acknowledged_at` пишет только «Don't Show Again».
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
- **Окно «Some mods were disabled» модальное:** пока открыто, Start / Shut Down не нажимаются - сначала «Got it».
- **Источник правды - `client-only-notice`** (`mods` = неподтверждённые отключённые моды, лежащие как `.jar.disabled`); `installed`
  кеширует пути ~5 мин и может ещё показывать `.jar`.
- **Install асинхронный:** `POST /minecraft/mods` отвечает 200 раньше, чем jar скачан. Uninstall сразу после Install приходит
  раньше файла, и файл остаётся на диске. Ждать мод в `installed` (появляется за секунды).
- **Запись сканера может пережить Uninstall** ([DEV-558/OBS-5](../../tickets/DEV-558.md#находки)): через ~10 с после Uninstall отключённого мода
  иногда появляется новая запись того же хеша, и следующий Install отключается молча, без окна. Надёжная чистка в тестах -
  Install → Uninstall (Uninstall активного файла стирает запись по хешу).
- **Отключение проверять на Fabric, Forge 1.20.1 или NeoForge 1.21.1** (с DEV-559 Forge/NeoForge тоже размечаются; гочи - [DEV-559](../../tickets/DEV-559.md#гочи-для-тестирования)). Клиентский тест-мод: CF Controlling (250398), файлы
  19.0.3 Fabric 1.21.1 = 5759860, 18.0.4 Fabric 1.21 = 5603224; в каталоге скрыт, ставить `POST /minecraft/mods
  {provider, mod_id, version_id}`. Отключение срабатывает на Start, Restart (после «Yes, Restart») и принятии EULA;
  если старт блокирует префлайт `server-jar/status` (`ambiguous_loader`), сканер не запускается.
- Стенды: каталог - [srv:8c2a6bd7](../../registry/test-servers.md#8c2a6bd7) (на нём модпак BMC4, 266 jar - не трогать),
  скан - [srv:ca326e28](../../registry/test-servers.md#ca326e28), Paper - [srv:f8e7df56](../../registry/test-servers.md#f8e7df56),
  trial - [srv:33b383ef](../../registry/test-servers.md#33b383ef).

## Покрытие

- **Автотест** `client-only-mods.spec.ts` на [srv:75d1175e](../../registry/test-servers.md#75d1175e): TC-GP-COM-001 (отключение на старте
  + окно со списком), TC-GP-COM-002 (Uninstall → Install той же версии → снова отключён, [DEV-558](../../tickets/DEV-558.md)). Ручной QA: отчёты [DEV-500](../../../test-docs/ultra.panel/DEV-500/client-only-mods-hide-RECHECK3-REPORT.md)
  (финал) и [DEV-492](../../../test-docs/ultra.panel/DEV-492/dev492-post-install-mod-scan-REPORT.md).
- Не покрыто автотестом: Forge/NeoForge-ветка ([DEV-559](../../tickets/DEV-559.md), `regression: candidate`, нужен NeoForge-сервер под мутации), гард зависимостей, перепроверка F5 после [panel!1665](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1665).

## История

| Дата | Тикет | Что |
|---|---|---|
| ~28-Sep-2026 | [DEV-492](../../tickets/DEV-492.md) | Дочитка вердиктов сразу после установки на проде |
| 05-Oct-2026 | [DEV-500](../../tickets/DEV-500.md) | Первый прогон: AC1, AC2 FAIL (CF не фильтруется, GeckoLib прятался) |
| 07-Oct-2026 | [DEV-500](../../tickets/DEV-500.md) | [panel!1652](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1652), [panel!1660](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1660), [new-panel!546](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/546): CF клиентских 131 → 56 → 15 |
| 09-Oct-2026 | [DEV-492](../../tickets/DEV-492.md) | [panel!1665](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1665): манифест с битым fileID не рвёт установку, легаси-эндпоинт проверяет ядро. PASS |
| 12-Oct-2026 | [DEV-500](../../tickets/DEV-500.md) | [panel!1672](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1672) + [new-panel!547](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/547): CF по файлу под loader+version, 14 из 131. PASS |
| 23-Oct-2026 | [DEV-556](../../tickets/DEV-556.md) | [panel!1701](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1701) + [new-panel!571](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/571): в окне список модов, Got It до роста `revision`. PASS |
| 22..23-Oct-2026 | [DEV-557](../../tickets/DEV-557.md) | Jar больше 100 МБ (Cobblemon) без вердикта: mod-scan-service!7 на проде не действует, FAIL; сервис переписан (!8-!11), перепроверяет DevOps |
| 29-Oct-2026 | [DEV-559](../../tickets/DEV-559.md) | Forge/NeoForge клиентские моды отключаются ([mod-scan-service!14](https://git.godlike.ovh/panel/mod-scan-service/-/merge_requests/14), parser v9, флаг `mod-scan-side-detection-enforce`). PASS, K1 Sodium + гард на обсуждении |

Связано: пост-инсталл скан как отдельная фича (`UP/post-install-mod-scan`) пока описан здесь; окно
«Missing mod dependencies» - [TASK-missing-mod-deps](../../tickets/TASK-missing-mod-deps.md).
