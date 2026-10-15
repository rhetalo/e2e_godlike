---
id: KB-INVENTORY-2026-10-15
title: Этап 0 - инвентаризация знаний о проекте
status: draft
updated: 2026-10-15
sources:
  - C:\Playwrite\e2e_browseruse\QA_test_docs\ (docx, март 2026)
  - agents.docs/**
  - test-docs/**
  - память Claude (~90 файлов)
  - tests/** (карта спеков)
---

# Этап 0 - инвентаризация знаний о проекте

> **В двух словах.** Знаний о проекте много, но они рассыпаны по четырём местам и местами
> противоречат друг другу. Самое ценное - это описание игровой панели и отчёты по задачам
> за август-октябрь. Самое слабое - биллинг, админка, PlayFreeHost, stage и лендинги: о них
> почти ничего не записано. Отсюда собираем каркас KB (этап 1).

## 1. Где что лежит

| Источник | Что внутри | Свежесть | Судьба |
|---|---|---|---|
| `C:\Playwrite\e2e_browseruse\QA_test_docs\` (docx) | ISTQB-комплект по WPGL и UP: описание, 85 + 151 требований, 44 + 54 кейсов, чеклисты, RTM | март 2026, реверс по UI | Брать дерево модулей и NFR. Витрина и моды сильно устарели. Отчёт о выполнении в `QA_Documentation_Ultra_Panel` выдуман, не доверять |
| `agents.docs/game-panel/KNOWLEDGE_BASE.md` | Самое подробное описание UP: вкладки, API v2, модалки, cancel-модуль | 27-Jul, основной recon 03-23 Jun | Главный донор для `products/up/` |
| `agents.docs/vps-panel/*` | VirtFusion: power, media, network, rebuild, гочи | 03-19 Jun | Донор для `products/vps/` |
| `agents.docs/QA_TEST_COVERAGE_AND_SPECS.md` | Что покрыто автотестами по WPGL/воронкам/UP | 02-Oct | Донор матрицы покрытия (этап 4) |
| `agents.docs/tz/TZ-*.md` | Ретро-ТЗ по 25 областям | 17-Jun | Сверить и привязать к фичам |
| `agents.docs/godlike-mcp-usage.md` | Как устроен WP: 8 локалей, ~2613 страниц, типы постов, Yoast, Cloudflare | 03-Sep | Донор для `products/sf/` |
| `agents.docs/AGENT_HANDOFF.md` | Auth-флоу, storageState, история сессий | шапка 18-Jun, правки до 02-Oct | Тест-инфра, оставить в agents.docs. Карта файлов устарела |
| `test-docs/**/*-REPORT.md`, testplan, BUG | ~35 отчётов по задачам Aug-Oct | свежие | Донор карточек тикетов и фич |
| `test-docs/glossary.md`, `navigation.md` | Глоссарий, пилот переноса docx | 17-Jun | Глоссарий переезжает в `kb/glossary.md` |
| Память Claude | ~45 файлов с продуктовым знанием (задачи, гочи, флаги, серверы) | до 15-Oct | Продуктовое переносим в KB, в памяти оставляем ссылку |
| `tests/**` | ~65 спеков, ~470 тестов: funnels 6, game/panel 31, general 6, modded 9, vps 13 | живое | Матрица «фича ↔ тест» |
| Корневые `g-*.md`, `vps-*.md`, `wp-hosting-page.md` | aria-дампы **Antihost**, не godlike | Aug-Sep | Не для KB. Antihost отделился (своя команда и QA), дампы перенесены в `C:\Playwrite\antihost-qa\recon-dumps\` |
| `main-sharing.md` (корень) | aria-дамп Sharing в UP | 10-Sep | Удалить после переноса знания |

## 2. Карта продукта (черновик для майндкарты)

**WPGL - витрина (WordPress)**
- Шапка/футер/навигация, 8 языков (Polylang), 4 валюты, CookieYes.
- Страницы игр (~34-38), каталог игр, KB сайта (`ht_kb`), отзывы, партнёрка, ping, контакты, блог.
- Калькуляторы: modded (Shadow-DOM `<plan-calculator-widget>`), Seed finder `/minecraft-seeds/`.
- Воронки: game, modded `cart-modded-new` (DEV-400), seed, mobile cart, VPS `/cart-vps/`,
  конструктор модпаков + trial, Custom Modpack Setup (DEV-458/459).
- Лендинги: Launcher, SMP One-Click, Modpack Program, PlayFreeHost.
- Промо: MONTHLY75/50, MODPACK50, VANILLA20, flash-sale (A/B в Amplitude), попап Free Server Gift (DEV-455).

**BIL - WHMCS**
- Корзина и чекаут (Vue-cart после редизайна), язык чекаута отдельно от витрины.
- Оплата: Stripe (iframe), PayPal, Crypto, кредитный баланс.
- Clientarea: Product Details, Request Cancellation / Resume subscription, статусы Active/Paused/Suspended.
- Free-продукты 282 (EU) / 1127 (USA). Письма eSputnik.
- ⚠️ Как продукт почти не описан: жизненный цикл услуги, инвойсы, upgrade, кредит.

**UP - игровая панель ultra.panel (+ API panel.godlike.host/api/v2, Pterodactyl под капотом)**
- Вход (логин/пароль, OAuth WHMCS, Steam), Dashboard «My Servers».
- Сервер: Overview (Server information, Steam Port DEV-562, Edit/Import/Reinstall), Power, Console (xterm, палитра Commands), Files (+ Recycle Bin, SFTP), Config, Players, Versions (18 ядер, Arclight/Mohist DEV-506/529), Startup/Docker image.
- Extensions: моды/плагины/модпаки, источники CF/Modrinth/Hangar/Spigot/Polymart (DEV-405/534), фильтр по загрузчику (DEV-498), loader gating (DEV-515), скрытие client-only (DEV-500), пост-инсталл скан (DEV-492), missing deps, каталог модпаков v2 `is_listed` (DEV-532).
- Java: detection + попап (DEV-472), гейт старта (DEV-485).
- Sharing и роли (Owner/Co-owner/Moderator/Member), Audit Log, права сабюзеров v2.
- Port & Domains, Backups, World Backup (PROD-134), Tasks, Databases.
- Монетизация: Boost/Upgrade, Free Premium, Referral, Throttling «Lag Detected», Cancel module + retention (DEV-401), Split Server.
- Не-MC игры: Palworld Settings, PZ, ARK, Rust, Terraria, Arma.
- Free-серверы: запрет смены egg (DEV-563).

**OLDP - старая клиентская панель (panel.godlike.host/)**
- Клиент видит в ней свои серверы.
- Version changer, libxrender (DEV-486), Docker image в Startup (DEV-513).
- ⚠️ Описания нет.

**ADM - админка (panel.godlike.host/admin)**
- Доступ только у админов с ролью, вход через корп-почту.
- Лимиты нод (DEV-477), `is_listed` модпаков (DEV-532), Docker image (DEV-513, админ-часть).
- ⚠️ Описания нет. Правило: ничего не делать без явного ок владельца.

**VPS - vf-panel (VirtFusion)**
- Login, `/servers`, Overview и статусы, Power + Activity, Media (Boot Order), Network (rDNS), Storage, Options (VNC, Reset Password, BIOS/UEFI), Rebuild.
- Удаления в панели нет, только отмена услуги в биллинге. Rescue не покрыт.

**PFH - PlayFreeHost**
- Лендинг, free-серверы, фронт без !558 (DEV-563 BUG-1).
- ⚠️ Описания нет, только отчёты.

**INFRA / окружения**
- prod, stage (`stage.ultra.panel...`, Google-OAuth, сессия ~30-40 мин, нода stage.wing01).
- Прогоны: VPS по cron 09:00 → Slack. GitLab CI только доставляет код.
- Интеграции: CurseForge, Modrinth, Amplitude, Stripe, PayPal, eSputnik, Cloudflare, WP Rocket, Yoast, Polylang, GTM, Trustpilot, Chatwoot, Discord, Slack.

## 3. Реестры-заготовки (переедут в `kb/registry/` и `kb/tickets/` на этапе 1)

### 3.1 Тикеты

| ID | Суть | Продукт | QA-статус |
|---|---|---|---|
| DEV-400 | Страницы модпаков ведут в `cart-modded-new` | WPGL/BIL | PASS 18/18 |
| DEV-401 | Cancel retention: экраны Game Rec + Free Plan | UP/BIL | live 14-Aug, часть багов не перепроверена |
| DEV-402 | Воронка игр под Vue-cart | WPGL | сделано 20-Aug |
| DEV-405 | Моды/модпаки прямо из API CF/Modrinth | UP | PASS 05-Oct |
| DEV-455 / GROWTH-95 | Попап Free Server Gift + письма | WPGL/BIL | закрыт 15-Oct |
| DEV-458 | Custom Modpack Setup, add-on в биллинге | BIL | блокер: письмо/тикет |
| DEV-459 | Custom Modpack, точки входа | WPGL/UP | PASS 28-Sep |
| DEV-472 | Java detection + попап | UP | закрыт 08-Oct |
| DEV-477 | Лимиты ресурсов нод | ADM/INFRA | у DevOps |
| DEV-485 | Гейт старта по Java | UP | PASS 09-Oct, хвосты: письмо, DoD |
| DEV-486 | Version changer + libxrender | OLDP | PASS 25-Sep |
| DEV-492 | Пост-инсталл скан модов | UP | закрыт 09-Oct |
| DEV-498 | Фильтр модов по загрузчику | UP | PASS 25-Sep |
| DEV-500 | Скрытие client-only модов | UP | PASS 12-Oct |
| DEV-506 | Откат версии Arclight | UP | Install ок → DEV-529 |
| DEV-512 | libxrender | UP | закрыт 02-Oct |
| DEV-513 | Устаревший Docker image в Startup | OLDP/ADM | PASS 12-Oct |
| DEV-515 | Loader gating модов | UP | PASS 07-Oct, снять флаг |
| DEV-529 | Arclight → Forge после старта; Mohist installed=null | UP | закрыт 08-Oct |
| DEV-532 | Видимость каталога модпаков `is_listed` | UP/ADM | PASS 08-Oct |
| DEV-534 | Фильтр «All» шлёт `any` (бывш. DEV-405/B6) | UP | PASS 09-Oct |
| DEV-562 | Steam Port для PZ в Overview | UP | PASS 15-Oct |
| DEV-563 | Free-серверам запрещена смена egg | UP/PFH | 20 PASS, BUG-1 ждёт деплоя PFH |
| PROD-134 | World Backup | UP | клиент PASS, открыт DevOps §6 |
| Упоминания | DEV-145, DEV-275, DEV-315, DEV-321, DEV-441, DEV-523, PROD-126 | - | только ссылки |

Задачи без тикета (получат `TASK-<slug>`): split-server, palworld-settings, smp-oneclick,
launcher-landing, kb-redesign, kb-search-scope, playfreehost-landing, modpack-program,
throttling-webhook, v2-subuser-permissions, neoforge-unixargs-stage, missing-mod-deps,
cancel-amplitude, tariff-list-400 (Critical), mc-extensions-epic.

### 3.2 Фичефлаги

| Флаг | Что гейтит | Состояние (как записано) |
|---|---|---|
| `java-start-gate` | Гейт старта DEV-485 | per-server, вкл. на srv:ca326e28 |
| `java-mismatch-fixer` | Старый Java-попап | вкл. глобально |
| `extension-compatibility` | `extension_capabilities`, заглушки, префилл фильтров | 3 юзера, ждёт раскатки |
| `world-backup` | PROD-134 | per-account, вкл. на админ-акке |
| `cancellation-retention-steps` | DEV-401 | только админ-акк |
| `modpack-catalog-v2` | Каталог v2 | только staff |
| `affiliate-banner`, `hytale-world`, `inactivity-chat`, `extensions-onboarding`, `admin-panel` | ❓ назначение не описано | on |
| env: `GODLIKE_NODE_RESOURCE_LIMITS_ENABLED`, `MOD_SCAN_BACKFILL_*`, `VITE_MANAGED_MODPACK_URL`, `RUN_THROTTLING_TEST` | разное | см. карточки |
| A/B: `cancel_new_inpanel`, flash-sale (Amplitude) | эксперименты | - |

**Важно:** Pennant-флаги считаются **по владельцу сервера**, а не по тому, кто смотрит.

### 3.3 Тест-серверы

Около 50 серверов на prod и 3 на stage. Ключевые:
- `ebb03adc` - канонический e2e.
- `ca326e28` - Java.
- `8c2a6bd7` - моды. Сейчас на нём BMC4, не трогать.
- `546bc52e` - SMP + флаг.
- `7166c707` - одноразовый, деструктив разрешён.

Сырой список ниже, по данным памяти. На этапе 1 он переедет в `registry/test-servers.md` с
полями «владелец, можно ли трогать, текущее состояние» и будет сверен с панелью.

**prod**

- Автотесты:
  - `ebb03adc` - канонический e2e и v2-subuser.
  - Дедики: `f9793ddc` power, `00915cdc` backup, `ec78834c` file, `55ab39de` console, `e9440b5d` rename.
  - `0c743c25` - спек CF/Modrinth. `d2f7fff5` - extension.sources.
  - `ac8aa1e0` - suspended. `93521c70` - удалён.
- Java и моды:
  - `ca326e28` - DEV-472/485/486/513, deps, SMP.
  - `8c2a6bd7` - DEV-405/500/532, на нём BMC4.
  - `546bc52e` - SMP + флаг, DEV-515/529.
  - `0cf8346f` - DEV-506/529, чужой владелец.
  - `42ea3555` - loader filter.
- Прочие задачи:
  - `45b14521` - DEV-562-MC. `f8e7df56` - баг тарифов.
  - `7166c707` - одноразовый, деструктив ок.
- PROD-134: `85fc5bd9`, `e0ef886f`, `43ae756d`, `799c975d`, `93bbc747` (Bedrock), `7d7041c8`, `b4089560`, `09f8d87d`, `feede8c1`.
- DEV-401: `09f8d87d`, `feede8c1`, `7c7745c8` (Rust), `2c8c5f83` (Terraria). `43ae756d` в PENDING-отмене.
- Cancel Amplitude: `c2b09498`.
- Split: `1d7d34aa` (main), сабы `0c7b82c3` / `60fdf307`.
- DEV-562: `d70813d3` (PZ), `1db4a8bb` (Arma). ARK `8235fb62` / `acb329a3` - клиентские, только просмотр.
- DEV-563: `0010cf61`, `d716acea` (free), `75d1175e` (платный), `3f1e7d13` (Terraria free).
- Trial конструктора: `33b383ef`.

**stage**

- `9f455f13` / `9efab4bc` - Palworld.
- `62c8289b` - NeoForge.

**Аккаунты (роли)**

- `acc:shared-owner` - общий тест-акк, panel user 388101.
- `acc:admin` - админ-акк владельца, 307989. Видит чужие серверы, на stage их ~16930, не трогать.
- `acc:invitee` - Co-owner / Member для проверок прав.
- `acc:dev455-a..f` - аккаунты A-F под DEV-455.
- `acc:clean` - чистые аккаунты под DEV-458.

### 3.4 Артефакты

| Тикет | Артефакты |
|---|---|
| DEV-455 | VM2rh8AJ (v8) |
| DEV-500 | 52DJGadW (финал) |
| DEV-534 | 7s2HNX3K |
| DEV-405 | GBN6ovw5 (финал) |
| DEV-472/485 | 85pGYiQq |
| DEV-492 | D4WSCgGP |
| DEV-515 | 1Np4pNEE (v3) |
| DEV-506 | FHKDBWnD |
| DEV-529 | KqV91eLm, Shoij6C4 |
| DEV-532 | XKUJWAPb |
| DEV-562 | TGPa13TZ |
| DEV-563 | DNfdiDJ2 (v3) |
| Split | 33a83ab3 |

Демо-страница недели: `test-docs/demo-2026-10-08/demo-qa-week.html`.

### 3.5 Гочи, которые экономят recon (переедут на страницы фич)

- **API:**
  - `panel.godlike.host/api/v2` требует полный UUID, short даёт 400.
  - `GET /minecraft/version` → `extension_capabilities` - источник правды по гейтингу модов.
- **Флаги:** Pennant считается по владельцу сервера.
- **ultra.panel:**
  - `networkidle` ненадёжен (живой ws), ждать конкретный `waitForResponse`.
  - Консоль - xterm, читать через ws.
  - Цепочка модалок установки пака: RAM → Install Anyway → Save Your World First? → Some mods disabled.
  - Audit Log не пишет `power.start`.
- **Моды:**
  - На 26.x пустой loader = loader сервера.
  - CF фильтрует loader только вместе с версией.
  - Сканер не берёт jar больше 100 МБ.
- **WHMCS:**
  - Free-продукты 282 / 1127. Суффикс `_NNNNNN` в имени сервера = service id.
  - `free_gift_status.user_id` = `tblusers.id`.
  - Закрытие cancel-модалки после экрана reason отправляет **реальную** отмену. Откат - «Resume your subscription».
  - Язык чекаута отдельно от витрины.
- **Витрина:**
  - MONTHLY75 действует только на 1 месяц.
  - Калькуляторы в Shadow DOM, гидрация после mouse-нуджа. Смена валюты работает только в headed.
  - VPS-тогглы прячут планы (`:visible`).
  - Аноним в `cart-modded-new` видит Login-стену.
- **Stage:** Google-OAuth, сессия ~30-40 мин.
- **Прочее:**
  - World Backup - 1 копия в 60 с.
  - Throttling webhook без auth, ~раз в 3 дня.

## 4. Противоречия (исправить при переносе)

1. «Staging нет» (CLAUDE.md, game-panel KB §2, QA_COVERAGE, README) - а stage есть и используется.
2. VPS Delete: в `VPS_COVERAGE_ANALYSIS.md` «надо писать тест», в `vps-panel/*` «удаления нет».
   Analysis целиком устарел.
3. Rebuild: TEST_PLAN ссылается на несуществующий `vps.panel.rebuild.spec.ts`. На деле есть
   `rebuild.real` / `os-selection` / `selection`.
4. `AGENT_HANDOFF.md` §2/§5: перечислены удалённые файлы, репо назван GitHub (README - GitLab).
5. Число тестов UP: «~58» / «~64» / «~65», а по факту 31 спек.
6. game-panel KB §3 и §7.0: тестовый сервер Paper или NeoForge, серверов ~26 или 30.
   Дописано поверх, не исправлено.
7. TZ-SEEDS-CALC: AC про калькулятор, хотя калькулятор заменён Seed finder.
8. Реферальная механика в docx: 50% и «100% profit» одновременно.

## 5. Коллизии локальных ID

`F1`, `F3`, `F5`, `B1..`, `BUG-1`, `R1`, `S1..`, `N1`, `D1`, `A1`, `C1`, `G2`, `Q1` - каждый
означает разное в 2-7 отчётах. Пример: `F1` = DEV-472 (Java новее → попап), DEV-492
(manifest без дочитки), DEV-500 (CF не фильтрует client-only), DEV-515 (Leaves/Waterfall),
DEV-532 (BMC4 ambiguous_loader), Launcher (og:image), Palworld (кейсы валидации).
Решение: [id-scheme.md](id-scheme.md), неймспейс `<TICKET>/<LOCAL>`.

## 6. Пробелы (продукт есть, доки нет)

1. BIL как продукт: жизненный цикл услуги, инвойсы, upgrade, кредит, отмена.
2. ADM: админка и старая панель.
3. PFH: PlayFreeHost.
4. Stage: страница окружения (URL, ноды, аккаунты, что задеплоено).
5. Лендинги и конструктор модпаков: знание только в отчётах.
6. Не-MC игры: разбросано по отчётам.
7. UP после июля (Java, моды, Arclight/Mohist, tariff-list 400): в отчётах, не сведено в KB.
8. VPS: Rescue, dashboard, цикл Building → Running.

## 7. ⚠️ Риск: секреты в репо

Пароли тест-аккаунтов лежат открытым текстом в **закоммиченных** файлах:
- `agents.docs/AGENT_HANDOFF.md` (12 строк)
- `agents.docs/CODE_REVIEW.md` (5)
- `agents.docs/game-panel/KNOWLEDGE_BASE.md` (2)
- `agents.docs/game-panel/TEST_PLAN.md` (1)
- `agents.docs/vps-panel/HANDOFF.md` (1)
- `agents.docs/vps-panel/KNOWLEDGE_BASE.md` (1)
- `README.md` (1)

Подсчёт по шаблону «password/пароль:», часть совпадений может оказаться ложной.
Репо пушится в GitHub (`rhetalo/e2e_godlike`) и GitLab, значит пароли есть и в истории.
Ещё они лежат в старых docx и в ~5 файлах памяти.

**Решение владельца (15-Oct):** риск принят. Это тестовые аккаунты без ценности, админского
пароля в репо нет. Пароли не трогаем. Правило KB остаётся прежним: в `kb/` секреты не пишем,
аккаунт = роль + env-переменная.
