# Регресс-playbook — эпика «Рефакторинг Minecraft-розширень» (Inc 0-3)

> Единая регресс-сеть под большой прогон. Источник: Jira-эпика + 4 плана
> (`2026-06-24-inc0..inc3`). Составлено 20-Jul-2026 (recon подтверждён live).
> **Роль QA здесь — регрессионная страховка, а не проверка внутренностей рефактора.**

## 0. Что проверяем и почему так

Вся эпика — **бэкенд-рефактор**, спроектированный быть **невидимым** для клиента:
публичный контракт `api/v2` и `catalog_id = provider:external_id` не меняются, внутренний
PK суррогатный (клиенту невидим), legacy React не трогают.

- **Основной приёмочный слой — PHPUnit на бэке** (`php artisan test --filter=…` в каждом DoD).
  Это делает разработчик в godlike-репо (gitlab). Мы это НЕ дублируем и не можем запустить отсюда.
- **Наш слой — E2E-регресс наблюдаемых поверхностей**: доказать, что видимое поведение не сломалось
  до/после деплоя каждого инкремента. Внутренности (swap-миграции, resolver, дедуп PK, парсеры)
  через UI/API **не наблюдаемы** → остаются на PHPUnit.

## 1. Окружение (решить утром)

| Вариант | Как навести | Риск |
|---|---|---|
| **prod-baseline** (сейчас) | дефолт, ничего не менять | рефактора там ещё нет → это baseline «как было» |
| **stage** | `GAME_PANEL_URL=<stage-url>` (+ storefront baseURL при нужде) | ⚠️ логин через GitLab-OAuth отваливается |
| **prod для тест-юзера** | дефолтные URL, обычный email/password-логин | самый чистый, если выкатят |

**Env-флаги (уже заведены в `utils/gameAuth.ts`):**
- `GAME_PANEL_URL` — URL панели (prod ↔ stage).
- `GAME_PANEL_STORAGE_STATE` — путь к готовому storageState.
- `GAME_PANEL_SKIP_LOGIN=1` — не логиниться, взять готовую сессию (**обход кривого stage-OAuth**:
  залогиниться руками в браузере → сохранить storageState → указать путь + этот флаг).
- `GAME_PANEL_PLUGIN_SERVER_UUID` — сервер под плагин/мод-тесты (дефолт `93521c70`).
- `RUN_PLUGIN_INSTALL=1` — включить мутирующие install/uninstall-кейсы (по умолчанию OFF).

**Stage-fallback по шагам:** если OAuth не проходит автоматически —
1) открыть stage-панель в обычном браузере, залогиниться через gitlab руками;
2) выгрузить storageState (Playwright codegen `--save-storage` или devtools);
3) `GAME_PANEL_URL=<stage> GAME_PANEL_STORAGE_STATE=<path> GAME_PANEL_SKIP_LOGIN=1 npx playwright test --project=game-panel`.

## 2. Baselines, снятые сегодня (prod, сервер 93521c70)

Сверять после деплоя — эти shape'ы должны остаться идентичными.

- **`/api/v2/features`** = `["java-mismatch-fixer","affiliate-banner","hytale-world","inactivity-chat","extensions-onboarding"]`.
  ⚠️ **`modpack-catalog-v2` тут УЖЕ нет** (флаг staff-only, наш тест-аккаунт его не видит) →
  проверку Inc 1d «/features без флага» с нашего аккаунта сделать **нельзя** (нечему исчезать).
- **`/api/v2/servers/{uuid}/minecraft/version`** = `{minecraft_version, minecraft_type, minecraft_build, egg}`
  (пример: `{"minecraft_version":"26.2","minecraft_type":"PAPER","minecraft_build":"285825","egg":"PC-Paper"}`).
- **RAM Calculator** — публично `https://godlike.host/minecraft-ram-calculator/` (Vue-бандл), зовёт
  `GET /api/v2/ram-calculator/modpacks` + `/products`. **Тестируется без панели.**
- **Каталог plugins/mods** (`/api/v2/servers/{uuid}/minecraft/{plugins|mods}`) → `data[].{id (сырой
  провайдерский), provider, is_installed, is_supported, categories[]}`; версии `.../{provider}-{external_id}/versions`
  → `data[].{id, name, game_versions[], download_url}`, newest-first. Детали: KB game-panel §7b-bis.

## 3. Матрица регресса по инкрементам

Легенда: 🤖 auto (спек) · 👤 manual · 🚫 не наблюдаемо E2E (→ PHPUnit) · ⚠️ ожидаемое ИЗМЕНЕНИЕ (не баг).

### Inc 0 — loader/version single source
| TC | Проверка | Как | Статус |
|---|---|---|---|
| TC-GP-VER-001 | `/minecraft/version` отдаёт корректные `minecraft_type`+`minecraft_version` (не пусто, совпадает с baseline) | 🤖 API | ⬜ построить |
| TC-GP-VER-002 | Бейдж версии/лоадера в панели рендерит то же значение | 🤖 UI | ⬜ построить |
| — | resolver, backfill колонок, дерив mcversion, миграция 13 callers | 🚫 | PHPUnit `--filter=Minecraft` |

### Inc 1 — modpacks + RAM Calculator
| TC | Проверка | Как | Статус |
|---|---|---|---|
| TC-SF-RAM-001 | RAM-калькулятор грузится; `/ram-calculator/modpacks` и `/products` → 200, shape (`catalog_id`, `id`, `ram_requirements[].amount_mb`) как baseline | 🤖 storefront+API | ⬜ построить |
| TC-SF-RAM-002 | Выбор модпака → калькулятор считает RAM (эффект: число памяти обновилось) | 🤖 UI | ⬜ построить |
| TC-GP-EXT-MPK-001 | Каталог `/modpacks` рендерится (уже есть в extensions.spec) | 🤖 | ✅ есть |
| TC-GP-EXT-MPK-002 | Установка модпакa по новому `install_id` (provider:modpack_id:version_id) + старый формат | 👤/🤖 мутация | ⬜ risk-gate |
| — | RAM «популярное» `install_count → downloads` | ⚠️ порядок изменится | не баг |
| — | `/api/features` без `modpack-catalog-v2` | 🚫 staff-only | нельзя с тест-аккаунта |
| — | swap v1→v2, дроп таблиц, node_modpacks FK, inline-Eloquent | 🚫 | PHPUnit `--filter=Modpack/RamCalculator` |

### Inc 2 — mods surrogate
| TC | Проверка | Как | Статус |
|---|---|---|---|
| TC-GP-MOD-001 | Каталог mods: список 200, `data[].id`=провайдерский (не суррогат), provider присутствует | 🤖 API | ✅ `mods.spec.ts` |
| TC-GP-MOD-002 | Идентичность резолвится: `/mods/{provider}-{external_id}/versions` → 200, версии | 🤖 API | ✅ `mods.spec.ts` |
| TC-GP-MOD-003 | Install-диалог мода открывается/закрывается без мутации | 🤖 | ✅ `mods.spec.ts` |
| TC-GP-MOD-004 | install→installed→uninstall мода (self-cleaning, env-gate) | 🤖 мутация | ✅ написан (env-gate OFF) |
| — | swap-миграция, ноль сирот FK, коллизия id, парсеры | 🚫 | PHPUnit `--filter=Mod` |

### Inc 3 — plugins surrogate + парсеры
| TC | Проверка | Как | Статус |
|---|---|---|---|
| TC-GP-PLG-001 | Каталог plugins: список 200 + контракт (`id` провайдерский, provider, is_installed, categories) | 🤖 API | ✅ написан |
| TC-GP-PLG-002 | Идентичность по `{provider}-{external_id}` резолвится через `/versions` | 🤖 API | ✅ написан |
| TC-GP-PLG-003 | type-фильтры Plugins/Installed переключают источник каталога | 🤖 | ✅ написан |
| TC-GP-PLG-004 | Поиск пробрасывает `search=` в запрос | 🤖 | ✅ написан |
| TC-GP-PLG-005 | Install-диалог открывается/закрывается без мутации | 🤖 | ✅ написан |
| TC-GP-PLG-006 | install→installed→uninstall (env-gate `RUN_PLUGIN_INSTALL=1`) | 🤖 мутация | ✅ написан |
| — | Modrinth-парсер, game_versions у Hangar/Spigot/Polymart, newestFirst по датам | 🚫 недетерм. на prod-UI | PHPUnit `--filter=Plugin` (фикстуры) |

## 4. Порядок прогона (завтра)

1. **Определить окружение** (§1) → навести env-флаги.
2. **Read-only сначала** (безопасно на любом окружении): version, каталоги plugins/mods/modpacks,
   RAM-калькулятор. Снять как «зелёный baseline».
3. **Мутации — только с risk-decision владельца** и `RUN_PLUGIN_INSTALL=1`: install/uninstall
   plugin → mod → modpack. Serial + гарантированный откат. На общем сервере — по одному, проверяя откат.
4. **Сверить с baseline из §2** (shape ответов не изменился = контракт цел).
5. **Что 🚫** — не пытаться крыть E2E; отметить «verified by backend PHPUnit» со ссылкой на DoD.

## 5. Live-prod safety

- Мутации (install/uninstall) — self-cleaning, `serial`, откат в `finally`/`afterAll`, env-gate OFF по умолчанию.
- Сервер под тесты — `GAME_PANEL_PLUGIN_SERVER_UUID` (дефолт `93521c70`), из env.
- Деструктив (reinstall, смена версии/ядра, дроп) — НЕ трогаем; это отдельный risk-decision.
- Промо/цены/контент каталога недетерминированы → **структурные** ассерты, не точный текст.

## 5-bis. Свод «кроки QA» из планов (DEV PHPUnit / Ops-гейт / наш E2E)

⚠️ Формальных «кроки QA» в планах нет - в DoD они значатся как секция **MR (godlike-mr)**, т.е.
пишутся разработчиком в самом MR на gitlab (у нас их пока нет). Ниже - **свод всех проверок,
разбросанных по планам + design-spec §8-9**, разложенный по слоям. Сверить с MR-шагами разработчиков.

Легенда: **DEV** = PHPUnit на бэке (разработчик) · **OPS** = операционный гейт (руками/DBA) · **QA** = наш E2E-нет.

### Inc 0 — loader/version
- DEV: resolver unit+integration - 4 сценария (колонки; mcjars self-heal только Java; Bedrock → без mcjars; всё пусто → `[null,null]`); backfill колонок из `mcversion` (+dry-run count); `mcversion` деривится в 1 месте; grep/arch-тест «никто не читает `$server->mcversion`»; переписаны `ServerMcVersionTest`/`Actualize…`/`DetectServerCore…`/`Reset…`; `--filter=Minecraft`.
- QA: `/minecraft/version` отдаёт верный type+version (TC-GP-VER-001, ⬜); бейдж версии в панели (TC-GP-VER-002, ⬜).

### Inc 1 — modpacks + RAM (1a→1b→1c→1d)
- OPS 1a: backfill в prod → **сверить COUNT** `modpacks WHERE is_optimized=0` vs `modpacks_v2`, `is_optimized=1` vs `modpack_variants`; `--dry-run`.
- DEV 1a: backfill идемпотентен; v1-only → v2; `is_optimized` → variant.
- DEV 1b: RAM через `ModpackRepositoryContract`; v1 RAM-repo удалён; shape (`catalog_id`/`id`/`ram_requirements`) неизменен; фиче-тесты эндпоинтов.
- **QA 1b: RAM-калькулятор (публичный) грузится + считает; `/ram-calculator/{modpacks,products}` shape = baseline** (TC-SF-RAM-001/002, ⬜ построить).
- DEV 1c: install оба формата (`install_id` + старые поля); job без inline-Eloquent/v1 `Modpack`; variant → `catalog_variant_id`.
- QA 1c: install модпака обоими форматами (TC-GP-EXT-MPK-002, ⬜ risk-gate).
- DEV/OPS 1d: `--filter=Modpack`+`RamCalculator`; grep-gate «нет v1 `Modpack`»; `/features` без `modpack-catalog-v2`; **FE подтвердил готовность**; **бекап БД перед дропом**; `node_modpacks` отвязан.
- ⚠️ QA 1d: `/features` без флага - **с тест-аккаунта не проверить** (staff-only), нужен staff или PHPUnit.

### Inc 2 — mods surrogate
- OPS: FK-аудит по `information_schema` + morph; **пауза Horizon** (стоп sync); `--dry-run`+снапшоты count; **бекап БД**; integration-тест целостности на temp-БД ДО прода.
- DEV: swap integration - counts сохранены, **ноль сирот в каждой дочерней** (`mod_versions`/`mod_category_mod`/`mod_links`/`authorables`/`mod_version_dependencies`), коллизия `(modrinth:abc, curseforge:abc)` → разные суррогаты; persistence lookup `[provider,external_id]`; `newestFirst`; api/v2 за `external_id`; `docs/mods-frontend-findings.md`; `--filter=Mod`.
- QA: каталог mods + `/mods/{provider}-{id}/versions` + install (TC-GP-MOD-001..004, ✅ read-only, install env-gate).

### Inc 3 — plugins surrogate + парсеры
- OPS: как Inc 2 (пауза Horizon/dry-run/бекап/temp-БД).
- DEV: swap integration (counts, ноль сирот, коллизия id); `PluginPersistenceService`+`PluginParserInterface`; **Modrinth-парсер починен** (нет early-exit); нет inline-персистенса/дублей категорий/хардкода пустых `game_versions`; **per-provider фикстурные тесты** (CurseForge/Modrinth/Hangar/SpigotMC/Polymart); api/v2 за `external_id`; `docs/plugins-frontend-findings.md`; `--filter=Plugin`.
- QA: каталог plugins + versions + install (TC-GP-PLG-001..006, ✅ read-only, install env-gate).

### Сквозное (design-spec §8-9)
- OPS каждый swap-инкремент: пауза Horizon + dry-run + бекап + integration на temp-БД + пауза расписания sync.
- DEV финал: полный `php artisan test` (`phpunit-godlike.xml`); `vendor/bin/pint --dirty` перед мерджем.
- Координация с FE: `/features` (1d), новый install-id (1c), shape RAM-API (1b) - согласовать заранее; `catalog_id` стабилен.

## 6. Открытые вопросы к владельцу (утро)

1. Окружение прогона: stage (кривой OAuth) или прод-для-тест-юзера?
2. Разрешены ли мутации install/uninstall для mods/modpacks (как для plugins) на `93521c70`?
3. Нужен ли staff-аккаунт, чтобы вообще увидеть `modpack-catalog-v2` для Inc 1d (иначе — только PHPUnit)?
4. Есть ли у разработчиков «кроки QA» в MR (godlike-mr) — сверить наш net с их ручным чек-листом.
