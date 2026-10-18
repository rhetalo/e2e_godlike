---
id: KB-COVERAGE
title: Матрица покрытия - фичи KB и автотесты
type: index
status: draft
updated: 2026-10-18
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

Страниц: 29, с автотестами: 20, тестов в их спеках: 81.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [UP - игровая панель ultra.panel + API v2](products/up/README.md) | draft | все спеки продукта (30) | 81 | 0 / 0 / 0 |
| [Backups - бэкапы сервера, базы и папки](products/up/backups.md) | draft | `backups.spec.ts`, `role.enforcement.spec.ts`, `security.spec.ts` | 10 | 5 / 0 / 1 |
| [Config - server.properties и блок Docker/Java](products/up/config.md) | draft | `config.spec.ts`, `security.spec.ts` | 6 | 3 / 1 / 1 |
| [Console - лог сервера и ввод команд](products/up/console.md) | draft | `console.palette.spec.ts`, `console.spec.ts`, `players.spec.ts`, `security.console.spec.ts` | 6 | 5 / 0 / 1 |
| [Каталог расширений - моды, плагины, модпаки](products/up/extensions-catalog.md) | draft | `extension.sources.spec.ts`, `extensions.spec.ts`, `mods.spec.ts`, `plugins.spec.ts` | 17 | 4 / 2 / 4 |
| [Files - файловый менеджер, Recycle Bin, SFTP](products/up/files.md) | draft | `files.recycle.spec.ts`, `files.spec.ts`, `files.structure.spec.ts`, `security.spec.ts` | 12 | 4 / 1 / 2 |
| [Java detection и гейт старта](products/up/java-detection.md) | draft | `mods.spec.ts` | 5 | 0 / 0 / 0 |
| [Вход в панель и дашборд My Servers](products/up/login-dashboard.md) | draft | `auth.logout.spec.ts`, `dashboard.spec.ts`, `login.spec.ts`, `security.spec.ts` | 15 | 4 / 0 / 1 |
| [Модпаки - каталог, видимость и установка](products/up/modpack-catalog.md) | draft | `extension.sources.spec.ts`, `extensions.spec.ts` | 6 | 2 / 4 / 3 |
| [Loader gating - каталог и установка по ядру сервера](products/up/mods-loader-gating.md) | draft | `mods.spec.ts` | 5 | 0 / 0 / 0 |
| [Players - администраторы, игроки, whitelist, баны](products/up/players.md) | draft | `players.spec.ts` | 2 | 2 / 0 / 1 |
| [Port & Domains - поддомен и порты сервера](products/up/ports-domains.md) | draft | `network.connection-info.spec.ts`, `network.spec.ts` | 5 | 2 / 0 / 1 |
| [Power - Start, Shut Down, Restart, Kill](products/up/power.md) | draft | `power.spec.ts`, `role.enforcement.spec.ts` | 6 | 4 / 1 / 2 |
| [Referral - реферальная программа в панели](products/up/referral.md) | draft | `referral.spec.ts` | 1 | 1 / 0 / 1 |
| [Overview сервера - Server Information и Edit Server](products/up/server-overview.md) | draft | `edit.server.spec.ts`, `network.connection-info.spec.ts`, `server.overview.spec.ts` | 5 | 3 / 1 / 2 |
| [Sharing, роли участников и Audit Log](products/up/sharing-roles.md) | draft | `role.enforcement.spec.ts`, `sharing.audit.spec.ts`, `sharing.spec.ts` | 9 | 5 / 0 / 2 |
| [Tasks - задачи и расписание (команда, power-действие)](products/up/tasks.md) | draft | `tasks.spec.ts` | 3 | 3 / 0 / 1 |
| [Throttling - окно «Lag Detected» при нехватке CPU](products/up/throttling.md) | draft | `throttling.notification.spec.ts` | 1 | 0 / 0 / 0 |
| [Upgrade / Boost - смена тарифа из панели](products/up/upgrade.md) | draft | `promo.spec.ts` | 2 | 2 / 0 / 1 |
| [Versions - смена ядра и версии Minecraft](products/up/versions.md) | draft | `versions.spec.ts` | 2 | 2 / 1 / 2 |
| [Cancel module - отмена сервера, пауза и удержание](products/up/cancel-module.md) | draft | - | - | 0 / 0 / 0 |
| [Client-only моды - скрытие в каталоге и отключение на сервере](products/up/client-only-mods.md) | draft | - | - | 0 / 0 / 0 |
| [Databases - базы данных MySQL для сервера](products/up/databases.md) | stale | - | - | 0 / 0 / 0 |
| [Free-серверы в панели - ограничения бесплатного тарифа](products/up/free-servers.md) | draft | - | - | 0 / 0 / 0 |
| [Game settings - настройки не-Minecraft игр (Palworld, ARK)](products/up/game-settings.md) | draft | - | - | 0 / 0 / 0 |
| [Missing mod dependencies - автодозагрузка зависимостей модов](products/up/missing-mod-deps.md) | draft | - | - | 0 / 0 / 0 |
| [Модалки и оверлеи панели](products/up/modals.md) | draft | - | - | 0 / 0 / 0 |
| [Split Server - деление сервера на основной и саб-серверы](products/up/split-server.md) | draft | - | - | 0 / 0 / 0 |
| [World Backup - копия мира перед опасными действиями](products/up/world-backup.md) | draft | - | - | 0 / 0 / 0 |

## VPS - панель VirtFusion

Страниц: 1, с автотестами: 1, тестов в их спеках: 46.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [VPS - панель VirtFusion (vf-panel.godlike.host)](products/vps/README.md) | draft | все спеки продукта (13) | 46 | 0 / 0 / 0 |

## WPGL - витрина

Страниц: 1, с автотестами: 1, тестов в их спеках: 95.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [WPGL - витрина godlike.host (WordPress)](products/wpgl/README.md) | draft | все спеки продукта (26) | 95 | 0 / 0 / 0 |

## ADM

Страниц: 1, с автотестами: 0, тестов в их спеках: 0.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [ADM - админка панели (panel.godlike.host/admin)](products/adm/README.md) | draft | - | - | 0 / 0 / 0 |

## BIL

Страниц: 1, с автотестами: 1, тестов в их спеках: 17.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [BIL - биллинг WHMCS (godlike.host/clientarea)](products/bil/README.md) | draft | все спеки продукта (8) | 17 | 0 / 0 / 0 |

## OLDP

Страниц: 1, с автотестами: 0, тестов в их спеках: 0.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [OLDP - старая клиентская панель (panel.godlike.host)](products/oldp/README.md) | draft | - | - | 0 / 0 / 0 |

## PFH

Страниц: 1, с автотестами: 0, тестов в их спеках: 0.

| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |
|---|---|---|---|---|
| [PFH - PlayFreeHost (бесплатный Minecraft-хостинг)](products/pfh/README.md) | draft | - | - | 0 / 0 / 0 |

## Покрытие, о котором KB не знает

**Спеки без страницы KB** (0) - ни одна страница не ссылается на них в `tests:`:

- нет

**TC-ID, которых KB не упоминает** (0) - по спекам:

- нет
