---
id: KB-COVERAGE
title: Матрица покрытия - фичи KB и автотесты
type: index
status: draft
updated: 2026-10-30
verified_on: null              # генерируется из KB и tests/, с продуктом не сверяется
sources:
  - kb/products/**/*.md (шапка tests:, раздел «Покрытие»)
  - tests/**/*.spec.ts
---

# Матрица покрытия - фичи KB и автотесты

> **В двух словах.** Для каждой страницы фичи: какие спеки её покрывают, сколько в них тестов и что
> сказано в её таблице «Покрытие» (✅ авто / руками / ❌ нет). Внизу - покрытие, о котором KB не знает.
> **Файл генерируется** `python -I kb/_tools/coverage.py . --write` - руками не править.

Легенда: **Тестов** - вызовы `test(` в спеках из шапки `tests:` (спек на несколько фич считается у каждой).
**Покрытие** - строки таблицы на странице: ✅ / руками / ❌. Пусто в «Спеки» = автотестов нет.

## UP - игровая панель

Страниц: 30, с автотестами: 23, тестов в их спеках: 95.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [UP - игровая панель ultra.panel + API v2](products/up/README.md) | draft | все спеки продукта (37) | 95 | 0 / 0 / 0 |
| [Backups - бэкапы сервера, базы и папки](products/up/backups.md) | draft | `backups.server-scope.api.spec.ts`, `backups.slots-full.spec.ts`, `backups.spec.ts`, `backups.throttle.spec.ts`, `role.enforcement.spec.ts`, `security.spec.ts` | 14 | 9 / 1 / 1 |
| [Client-only моды - скрытие в каталоге и отключение на сервере](products/up/client-only-mods.md) | draft | `client-only-mods.spec.ts` | 2 | 0 / 0 / 0 |
| [Config - server.properties и блок Docker/Java](products/up/config.md) | draft | `config.spec.ts`, `security.spec.ts` | 6 | 3 / 1 / 1 |
| [Console - лог сервера и ввод команд](products/up/console.md) | draft | `console.palette.spec.ts`, `console.spec.ts`, `players.spec.ts`, `security.console.spec.ts` | 6 | 5 / 0 / 1 |
| [Каталог расширений - моды, плагины, модпаки](products/up/extensions-catalog.md) | draft | `extension.sources.spec.ts`, `extensions.spec.ts`, `mods.spec.ts`, `plugins.spec.ts` | 17 | 4 / 2 / 4 |
| [Files - файловый менеджер, Recycle Bin, SFTP](products/up/files.md) | draft | `files.recycle.spec.ts`, `files.search.spec.ts`, `files.spec.ts`, `files.structure.spec.ts`, `security.spec.ts` | 15 | 6 / 4 / 4 |
| [Java detection и гейт старта](products/up/java-detection.md) | draft | `mods.spec.ts` | 5 | 0 / 0 / 0 |
| [Вход в панель и дашборд My Servers](products/up/login-dashboard.md) | draft | `auth.logout.spec.ts`, `dashboard.spec.ts`, `login.spec.ts`, `security.spec.ts` | 15 | 4 / 0 / 1 |
| [Модпаки - каталог, видимость и установка](products/up/modpack-catalog.md) | draft | `extension.sources.spec.ts`, `extensions.spec.ts` | 6 | 2 / 4 / 3 |
| [Loader gating - каталог и установка по ядру сервера](products/up/mods-loader-gating.md) | draft | `mods.spec.ts` | 5 | 0 / 0 / 0 |
| [Players - администраторы, игроки, whitelist, баны](products/up/players.md) | draft | `players.spec.ts` | 2 | 2 / 0 / 1 |
| [Port & Domains - поддомен и порты сервера](products/up/ports-domains.md) | draft | `network.connection-info.spec.ts`, `network.spec.ts` | 5 | 2 / 1 / 2 |
| [Power - Start, Shut Down, Restart, Kill](products/up/power.md) | draft | `power.spec.ts`, `role.enforcement.spec.ts` | 6 | 4 / 1 / 2 |
| [Referral - реферальная программа в панели](products/up/referral.md) | draft | `referral.spec.ts` | 1 | 1 / 0 / 1 |
| [Overview сервера - Server Information и Edit Server](products/up/server-overview.md) | draft | `edit.server.spec.ts`, `network.connection-info.spec.ts`, `server.overview.spec.ts` | 5 | 3 / 1 / 2 |
| [Sharing, роли участников и Audit Log](products/up/sharing-roles.md) | draft | `role.enforcement.spec.ts`, `sharing.audit.spec.ts`, `sharing.spec.ts` | 9 | 5 / 0 / 2 |
| [Tasks - задачи и расписание (команда, power-действие)](products/up/tasks.md) | draft | `tasks.spec.ts` | 3 | 3 / 0 / 1 |
| [Throttling - окно «Lag Detected» при нехватке CPU](products/up/throttling.md) | draft | `throttling.notification.spec.ts` | 1 | 0 / 0 / 0 |
| [Квиз апгрейда (Upgrade Quiz) - подбор тарифа и оффер](products/up/upgrade-quiz.md) | draft | `upgrade-quiz.token.api.spec.ts` | 3 | 1 / 2 / 2 |
| [Upgrade / Boost - смена тарифа из панели](products/up/upgrade.md) | draft | `promo.spec.ts` | 2 | 2 / 0 / 1 |
| [Versions - смена ядра и версии Minecraft](products/up/versions.md) | draft | `versions.spec.ts` | 2 | 2 / 1 / 2 |
| [World Backup - копия мира перед опасными действиями](products/up/world-backup.md) | draft | `world-backup.spec.ts` | 2 | 0 / 0 / 0 |
| [Cancel module - отмена сервера, пауза и удержание](products/up/cancel-module.md) | draft | - | - | 0 / 0 / 0 |
| [Databases - базы данных MySQL для сервера](products/up/databases.md) | stale | - | - | 0 / 0 / 0 |
| [Free-серверы в панели - ограничения бесплатного тарифа](products/up/free-servers.md) | draft | - | - | 0 / 0 / 0 |
| [Game settings - настройки не-Minecraft игр (Palworld, ARK)](products/up/game-settings.md) | draft | - | - | 0 / 0 / 0 |
| [Missing mod dependencies - автодозагрузка зависимостей модов](products/up/missing-mod-deps.md) | draft | - | - | 0 / 0 / 0 |
| [Модалки и оверлеи панели](products/up/modals.md) | draft | - | - | 0 / 0 / 0 |
| [Split Server - деление сервера на основной и саб-серверы](products/up/split-server.md) | draft | - | - | 0 / 0 / 0 |

## VPS - панель VirtFusion

Страниц: 10, с автотестами: 10, тестов в их спеках: 46.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [VPS - панель VirtFusion (vf-panel.godlike.host)](products/vps/README.md) | draft | все спеки продукта (13) | 46 | 0 / 0 / 0 |
| [Вход в VPS-панель, Dashboard и список серверов](products/vps/login-dashboard.md) | draft | `vps.panel.login.spec.ts`, `vps.panel.server.spec.ts` | 14 | 6 / 0 / 1 |
| [Media VPS - порядок загрузки (Boot Order)](products/vps/media.md) | draft | `vps.panel.media.spec.ts` | 3 | 3 / 0 / 1 |
| [Network VPS - IP, статистика трафика, Reverse DNS](products/vps/network.md) | draft | `vps.panel.network.spec.ts` | 3 | 3 / 0 / 1 |
| [Options VPS - VNC, Rescue, сброс пароля, Boot Type](products/vps/options.md) | draft | `vps.panel.options.spec.ts` | 4 | 4 / 0 / 2 |
| [Power VPS - Boot, Shutdown, Power Off, Restart](products/vps/power.md) | draft | `vps.panel.power.actions.spec.ts`, `vps.panel.server.spec.ts` | 13 | 7 / 0 / 0 |
| [Воронка покупки VPS - лендинг, cart-vps, checkout WHMCS](products/vps/purchase-funnel.md) | draft | `vps.funnel.billing.spec.ts`, `vps.funnel.configure.spec.ts`, `vps.funnel.happy-path.spec.ts` | 9 | 4 / 0 / 1 |
| [Rebuild VPS - переустановка ОС](products/vps/rebuild.md) | draft | `vps.panel.rebuild.os-selection.spec.ts`, `vps.panel.rebuild.real.spec.ts`, `vps.panel.rebuild.selection.spec.ts` | 6 | 6 / 0 / 1 |
| [Страница сервера VPS - статус, кнопки питания и вкладки](products/vps/server-page.md) | draft | `vps.panel.server.spec.ts` | 7 | 3 / 0 / 1 |
| [Storage VPS - диск сервера](products/vps/storage.md) | draft | `vps.panel.storage.spec.ts` | 1 | 1 / 0 / 1 |

## WPGL - витрина

Страниц: 15, с автотестами: 12, тестов в их спеках: 95.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [WPGL - витрина godlike.host (WordPress)](products/wpgl/README.md) | draft | все спеки продукта (26) | 95 | 0 / 0 / 0 |
| [Кастомайзер тарифа на страницах игр (Customize server)](products/wpgl/game-customizer.md) | draft | `game-slider.spec.ts` | 19 | 5 / 0 / 1 |
| [Воронка игрового сервера - корзина, вход, Configure, чекаут WHMCS](products/wpgl/game-funnel.md) | draft | `funnel.cart.paypal.spec.ts`, `funnel.spec.ts`, `funnel.with.credit.check.spec.ts`, `login.validation.spec.ts`, `registration-flow.spec.ts` | 10 | 8 / 1 / 1 |
| [Каталог игр - сетка с фильтрами и список лендингов](products/wpgl/games-catalog.md) | draft | `games.catalog.spec.ts` | 6 | 6 / 0 / 1 |
| [Шапка, футер, навигация и SEO витрины](products/wpgl/header-navigation.md) | draft | `smoke.pages.spec.ts`, `storefront.breadth.spec.ts`, `valid.links.spec.ts` | 8 | 5 / 0 / 1 |
| [Языки и валюты витрины](products/wpgl/locale-currency.md) | draft | `locale.spec.ts` | 3 | 3 / 1 / 1 |
| [Мобильная корзина /mobile-cart](products/wpgl/mobile-cart.md) | draft | `funnel.mobile.spec.ts` | 4 | 4 / 0 / 1 |
| [Калькулятор modded-хостинга - модпак и тариф](products/wpgl/modded-calculator.md) | draft | `smoke.pages.spec.ts`, `modpack.config.modded.spec.ts`, `slider.modded.spec.ts` | 12 | 7 / 1 / 1 |
| [Воронка modded - cart-modded-new и страницы модпаков](products/wpgl/modded-funnel.md) | draft | `cart.modded-new.spec.ts`, `funnel.modded.spec.ts` | 6 | 4 / 1 / 1 |
| [Конструктор модпаков и 3-часовой trial](products/wpgl/modpack-constructor.md) | draft | `funnel.modpack-constructor.spec.ts`, `modpack.constructor.spec.ts` | 5 | 5 / 0 / 1 |
| [Промо витрины - MONTHLY75, дефолтные коды, MODPACK50, flash-sale, Free Server Gift](products/wpgl/promo.md) | draft | `funnel.mobile.spec.ts`, `games.invalid.promo.spec.ts`, `games.valid.promo.spec.ts` | 6 | 3 / 1 / 2 |
| [Сиды Minecraft - Seed finder, калькулятор сида, cart-seed](products/wpgl/seeds.md) | draft | `funnel.seed.spec.ts`, `smoke.pages.spec.ts`, `seed-list.finder.spec.ts`, `slider.seed.spec.ts` | 19 | 6 / 0 / 1 |
| [Custom Modpack Setup - «соберём модпак за тебя»](products/wpgl/custom-modpack-setup.md) | draft | - | - | 1 / 2 / 2 |
| [Лендинги без автотестов - Launcher, SMP One-Click, KB сайта, каталог серверов игроков](products/wpgl/landings.md) | draft | - | - | 0 / 3 / 4 |
| [Каталог Minecraft-схематик /minecraft-schematics/](products/wpgl/schematics.md) | draft | - | - | 0 / 2 / 2 |

## ADM

Страниц: 4, с автотестами: 0, тестов в их спеках: 0.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [ADM - админка панели (panel.godlike.host/admin)](products/adm/README.md) | draft | - | - | 0 / 0 / 0 |
| [Каталог модпаков v2 в админке - скрытие из клиентского каталога (is_listed)](products/adm/modpack-catalog.md) | draft | - | - | 0 / 0 / 0 |
| [Сервер в админке - Startup (образ Docker, смена egg) и Build](products/adm/server-startup.md) | draft | - | - | 0 / 0 / 0 |
| [Сервер в админке - Transfer (перенос на другую ноду)](products/adm/server-transfer.md) | draft | - | - | 0 / 0 / 0 |

## BIL

Страниц: 8, с автотестами: 5, тестов в их спеках: 20.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [BIL - биллинг WHMCS (godlike.host/clientarea)](products/bil/README.md) | draft | все спеки продукта (8) | 17 | 0 / 0 / 0 |
| [Аккаунты клиентов - регистрация, вход, соцсети](products/bil/accounts.md) | draft | `login.validation.spec.ts`, `registration-flow.spec.ts` | 3 | 2 / 1 / 2 |
| [Add-on Custom Modpack Setup и trial конструктора модпаков](products/bil/addons-trials.md) | draft | `funnel.modpack-constructor.spec.ts` | 2 | 1 / 1 / 2 |
| [Чекаут WHMCS - Review & Checkout и язык чекаута](products/bil/checkout.md) | draft | `funnel.seed.spec.ts`, `funnel.spec.ts`, `funnel.modded.spec.ts`, `vps.funnel.happy-path.spec.ts` | 6 | 4 / 1 / 2 |
| [Оплата - Stripe, PayPal, Crypto, кредитный баланс, валюта](products/bil/payments.md) | draft | `funnel.cart.paypal.spec.ts`, `funnel.with.credit.check.spec.ts` | 5 | 5 / 1 / 1 |
| [Free-продукты и письма - бесплатные серверы, cart-free, цепочка eSputnik](products/bil/free-products.md) | draft | - | - | 0 / 3 / 3 |
| [Услуги в кабинете - Product Details, статусы, отмена и возврат подписки](products/bil/services-cancellation.md) | draft | - | - | 0 / 1 / 2 |
| [Тарифы и апгрейд со стороны биллинга - tariffs-new API](products/bil/tariffs.md) | draft | - | - | 2 / 0 / 2 |

## OLDP

Страниц: 3, с автотестами: 0, тестов в их спеках: 0.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [OLDP - старая клиентская панель (panel.godlike.host)](products/oldp/README.md) | draft | - | - | 0 / 0 / 0 |
| [Параметры запуска в старой панели - выбор образа Docker (Java)](products/oldp/startup-params.md) | draft | - | - | 0 / 0 / 0 |
| [Смена версии Minecraft в старой панели (Version Changer) и выбор Java](products/oldp/version-changer.md) | draft | - | - | 0 / 0 / 0 |

## PFH

Страниц: 3, с автотестами: 0, тестов в их спеках: 0.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [PFH - PlayFreeHost (бесплатный Minecraft-хостинг)](products/pfh/README.md) | draft | - | - | 0 / 0 / 0 |
| [Лендинг PlayFreeHost - вход, регистрация и создание бесплатного сервера](products/pfh/landing.md) | draft | - | - | 0 / 0 / 0 |
| [Панель PlayFreeHost (playfreehost.com/panel) - копия ultra.panel для free](products/pfh/panel.md) | draft | - | - | 0 / 0 / 0 |

## Покрытие, о котором KB не знает

**Спеки без страницы KB** (0) - ни одна страница не ссылается на них в `tests:`:

- нет

**TC-ID, которых KB не упоминает** (0) - по спекам:

- нет
