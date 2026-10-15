---
id: KB-GLOSSARY
title: Глоссарий godlike
type: glossary
status: draft
updated: 2026-10-15
verified_on: null              # термины собраны из страниц KB; у каждого есть ссылка на «дом»
sources:
  - test-docs/glossary.md (17-Jun-2026, перенесён и расширен)
  - kb/products/*/README.md, kb/products/up/*.md, kb/registry/*.md
---

# Глоссарий godlike

> **В двух словах.** Единый словарь терминов проекта: как мы называем вещи в отчётах, баг-репортах и
> автотестах. У каждого термина короткое объяснение и ссылка на страницу, где он описан подробно.
> Встретил новый термин в задаче - сначала сюда, потом в текст. Словарь же даёт контекст ИИ-агенту:
> с ним меньше выдуманных названий.

Правило ссылок: на термин ссылаемся по разделу (`glossary.md#игровая-панель`), подробности - по ссылке в строке.

## Продукты

| Термин | Что это | Подробно |
|---|---|---|
| **WPGL** | витрина godlike.host на WordPress | [WPGL](products/wpgl/README.md) |
| **BIL** | биллинг WHMCS `godlike.host/clientarea/` | [BIL](products/bil/README.md) |
| **UP** | новая игровая панель ultra.panel + API `panel.godlike.host/api/v2` | [UP](products/up/README.md) |
| **OLDP** | старая клиентская игровая панель `panel.godlike.host/` | [OLDP](products/oldp/README.md) |
| **ADM** | админка `panel.godlike.host/admin` | [ADM](products/adm/README.md) |
| **VPS** | панель VirtFusion `vf-panel.godlike.host` | [VPS](products/vps/README.md) |
| **PFH** | PlayFreeHost, бренд бесплатных Minecraft-серверов | [PFH](products/pfh/README.md) |
| **AFF** | партнёрка `affiliate.godlike.host` / `panel-affiliate.godlike.host` | [UP/referral](products/up/referral.md) |
| **Dedicated** | выделенные серверы, панель `baremetal.godlike.host` | [внешние доки](registry/external-docs.md#antihost---инструкции-поддержки-по-игровым-серверам) |

## Игровая панель

| Термин | Что это | Подробно |
|---|---|---|
| **Pterodactyl** | open-source панель игровых серверов, на которой построены UP, OLDP и ADM | [UP](products/up/README.md#как-устроено) |
| **Wings / нода** | агент Pterodactyl на физической машине, где крутятся серверы (`srvN.godlike.club`, `wingNNNN`) | [внешние доки](registry/external-docs.md#devops---что-пригодится-qa) |
| **Egg / яйцо** | шаблон типа сервера (игра + ядро): команда запуска, образы Docker. Nest - группа яиц | [ADM](products/adm/README.md) |
| **Ядро / loader** | серверное ПО Minecraft: Vanilla, Paper, Forge, NeoForge, Fabric, Quilt, Arclight, Mohist... | [UP/versions](products/up/versions.md) |
| **Flavor** | вариант гибридного ядра Arclight: forge / neoforge / fabric | [UP/mods-loader-gating](products/up/mods-loader-gating.md) |
| **Allocation / аллокация** | пара IP + порт, выданная серверу | [UP/ports-domains](products/up/ports-domains.md) |
| **Short / full UUID** | короткий (8 символов) и полный id сервера; часть ручек API принимает только полный | [обзор UP, гоча 1](products/up/README.md#сквозные-гочи) |
| **Docker-образ / Java-образ** | образ, в котором запускается сервер; определяет версию Java (`yolks-javaNN`, `-libxrender`) | [UP/java-detection](products/up/java-detection.md) |
| **required_java / java_preflight** | какая Java нужна серверу и вердикт проверки до старта | [UP/java-detection](products/up/java-detection.md) |
| **Гейт старта** | отказ бэкенда запускать сервер на слишком старой Java | [UP/java-detection](products/up/java-detection.md) |
| **extension_capabilities** | что поддерживает ядро сервера: моды, плагины, модпаки | [UP/mods-loader-gating](products/up/mods-loader-gating.md) |
| **Client-only мод** | мод только для игрока (шейдеры, миникарты); на сервере скрывается и отключается | [UP/client-only-mods](products/up/client-only-mods.md) |
| **Модпак / сборка** | готовый набор модов; установка = переустановка сервера | [UP/modpack-catalog](products/up/modpack-catalog.md) |
| **is_listed** | видимость модпака в клиентском каталоге | [UP/modpack-catalog](products/up/modpack-catalog.md) |
| **World Backup** | копия только мира перед опасным действием, живёт 7 дней | [UP/world-backup](products/up/world-backup.md) |
| **Split / саб-сервер** | деление сервера на основной и до 3 саб-серверов | [UP/split-server](products/up/split-server.md) |
| **Роли** | Owner, Co-owner, Moderator, Member | [UP/sharing-roles](products/up/sharing-roles.md) |
| **Pennant-флаг** | фичефлаг Laravel; считается по владельцу сервера | [реестр флагов](registry/flags.md) |
| **Throttling / Lag Detected** | окно об апгрейде, когда серверу не хватает CPU | [UP/throttling](products/up/throttling.md) |
| **Cancel-модуль / retention** | окно отмены подписки с экранами удержания | [UP/cancel-module](products/up/cancel-module.md) |
| **Free-сервер / фришка** | бесплатный сервер (продукты 282 / 1127) | [UP/free-servers](products/up/free-servers.md) |
| **Shepherd-тур** | обучающий оверлей панели, перехватывает клики | [UP/modals](products/up/modals.md) |

## Витрина и биллинг

| Термин | Что это | Подробно |
|---|---|---|
| **Воронка / funnel** | путь покупки: выбор → конфигурация → корзина → оплата | [WPGL](products/wpgl/README.md#карта-разделов) |
| **Корзина / cart-страница** | WP-страница корзины (`cart-modded-new`, `cart-vps` ...), их 23 | [WPGL](products/wpgl/README.md#корзины-funnel-страницы) |
| **Vue-cart** | новая корзина и чекаут с 20-Aug-2026 | [BIL](products/bil/README.md#карта-разделов) |
| **Service id / ID услуги** | ID услуги WHMCS; суффикс `_NNNNNN` в имени сервера | [BIL](products/bil/README.md#как-устроено) |
| **Clientarea / кабинет** | личный кабинет WHMCS | [BIL](products/bil/README.md) |
| **MONTHLY75, MODPACK50, VANILLA20** | промо: флеш-акция на 1 мес, таймер модпаков, дефолтный код | [WPGL](products/wpgl/README.md#промо---как-работает) |
| **Flash-sale** | промо-модалка и A/B в Amplitude, перехватывает клики | [WPGL](products/wpgl/README.md#промо---как-работает) |
| **Калькулятор / plan-calculator-widget** | виджет выбора тарифа на modded-странице, в Shadow DOM | [WPGL](products/wpgl/README.md#карта-разделов) |
| **Seed / Seed finder** | Minecraft-сид; каталог сидов `/minecraft-seeds/` | [WPGL](products/wpgl/README.md#карта-разделов) |
| **Витрина серверов** | `/servers/` - серверы игроков на сайте (отложено) | [WPGL](products/wpgl/README.md#карта-разделов) |

## VPS

| Термин | Что это | Подробно |
|---|---|---|
| **VirtFusion** | стороннее ПО VPS-панели | [VPS](products/vps/README.md) |
| **Power actions** | Boot / Shutdown / Power Off / Restart; stateful, serial | [VPS](products/vps/README.md#статусы-и-переходы) |
| **Rebuild** | переустановка ОС VPS; разрешён на всех VPS владельца | [VPS](products/vps/README.md#rebuild-переустановка-ос) |
| **Activity table** | журнал задач VirtFusion, готово = бейдж Complete | [VPS](products/vps/README.md#как-устроено) |

## Люди и процессы

| Термин | Что это | Подробно |
|---|---|---|
| **L1 / L2** | первая и вторая линии поддержки; L1 эскалирует в L2 по формату | [внешние доки](registry/external-docs.md#antihost---инструкции-поддержки-по-игровым-серверам) |
| **DevOps** | команда инфраструктуры: ноды, бэкапы, stage, флаги через CLI | [внешние доки](registry/external-docs.md#devops---что-пригодится-qa) |
| **MR `new-panel!N` / `panel!N`** | merge request во фронт или бэкенд панели | [схема ID](_meta/id-scheme.md#репозитории-кода-gitlab-gitgodlikeovh) |
| **`srv:` / `acc:` / `flag:` / `art:`** | ссылки на сервер, аккаунт, флаг, артефакт | [схема ID](_meta/id-scheme.md#типы-сущностей) |
| **Находка `F` / кейс `C` / `R` / `O`** | локальные ID внутри задачи (`DEV-492/F5`) | [схема ID](_meta/id-scheme.md#локальные-id-в-новых-отчётах-единые-буквы) |

## Тестовая инфраструктура

| Термин | Что это | Подробно |
|---|---|---|
| **PO (Page Object)** | класс экрана в `pages/*.ts`; UI драйвим через PO, не сырыми локаторами | `agents.docs/ARCHITECTURE.md` |
| **Component Object** | переиспользуемый компонент в `components/*.ts` (Header, CookieBanner ...) | `agents.docs/ARCHITECTURE.md` |
| **storageState** | сохранённая сессия Playwright (`storageState.panel.json`, `storageState.game.json`) | [аккаунты](registry/test-accounts.md) |
| **Теги** | `@smoke` / `@critical` / `@regression` / `@flaky` | `agents.docs/TEST_GUIDELINES.md` |
| **Карантин** | нестабильный тест, выведенный из гейтящего прогона (`npm run test:quarantine`) | `agents.docs/TEST_GUIDELINES.md` |
| **Self-cleaning** | мутирующий тест сам возвращает состояние (создал → проверил → удалил) | `CLAUDE.md` |
| **Recon** | разведка живого DOM и API перед тестом или выводом | `agents.docs/MCP_RECON_VS_CODE.md` |
