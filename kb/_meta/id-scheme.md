---
id: KB-ID-SCHEME
title: Схема ID и правила ссылок
status: draft
updated: 2026-10-15
---

# Схема ID и правила ссылок

> **В двух словах.** У каждой сущности одна «домашняя» страница, а её ID пишется так, чтобы
> было понятно, к чему он относится, без контекста. Голые `F1`, `BUG-1`, `B6` больше не пишем:
> только с префиксом родителя (`DEV-492/F5`). Любое упоминание ID - ссылка на его дом.

## Почему так

На 15-Oct-2026 в отчётах `F1` значит семь разных вещей (DEV-472, DEV-492, DEV-500, DEV-515,
DEV-532, Launcher, Palworld). Так же `BUG-1`, `B1`, `R1`, `S3`, `N1`, `D1`, `A1`, `Q1`. Отдельно
ID требований из старых docx (`REQ-NAV-001`) пересекаются между витриной и панелью.
Полный список коллизий: [inventory-2026-10-15.md](inventory-2026-10-15.md#5-коллизии-локальных-id).

## Продукты (префиксы)

| Префикс | Что это | Адрес |
|---|---|---|
| `WPGL` | Витрина, WordPress | godlike.host |
| `BIL` | Биллинг WHMCS: clientarea, корзина, чекаут, инвойсы | godlike.host/clientarea/ |
| `UP` | Игровая панель (новая) + её API | ultra.panel.godlike.host, panel.godlike.host/api/v2 |
| `OLDP` | Старая клиентская игровая панель: клиент видит свои серверы | panel.godlike.host/ |
| `ADM` | Админка. Доступ только у админов с выданной ролью, вход через корп-почту | panel.godlike.host/admin |
| `VPS` | VPS-панель VirtFusion | vf-panel.godlike.host |
| `PFH` | PlayFreeHost, бесплатный хостинг | playfreehost |
| `AFF` | Партнёрка | affiliate.godlike.host |
| `INFRA` | Ноды, stage, CI, деплой | - |

> Префиксы в ID пишем заглавными (`UP/java-detection`), папки - строчными (`products/up/`).

## Репозитории кода (GitLab `git.godlike.ovh`)

| Короткое имя | Репо | Что это | Пример MR |
|---|---|---|---|
| `new-panel` | `panel/godlike-new-panel` | Фронт новой панели ultra.panel (MR `!5xx`) | [new-panel!557](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/557) |
| `panel` | `panel/panel-godlike-host` | Бэкенд panel.godlike.host: API v2, админка, старая панель (MR `!16xx`) | [panel!1679](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1679) |
| `billing` | `billing/billing-godlike-host` | WHMCS-биллинг (BIL) | [billing!718](https://git.godlike.ovh/billing/billing-godlike-host/-/merge_requests/718) |
| `wp` | `wp/godlike-host` | Витрина WordPress (WPGL) | [wp!704](https://git.godlike.ovh/wp/godlike-host/-/merge_requests/704) |
| `e2e` | `e2e/godlike-tests` | Этот репо, автотесты | - |

Доступ у владельца есть к панельным репо. К `billing` и `wp` доступа пока нет. Старые MR без репо (`!445`, `!622`, `!671`) оставляем с ❓, пока не станет ясно, чьи они.
Деление «фронт в new-panel, бэкенд в panel» выведено по номерам MR и пока не подтверждено.

## Типы сущностей

| Тип | Формат ID | Пример | Дом |
|---|---|---|---|
| Jira-тикет | `<KEY>-<N>` | `DEV-562`, `DEV-418`, `GROWTH-95` | `kb/tickets/DEV-562.md` |
| Задача без тикета | `TASK-<slug>` | `TASK-split-server` | `kb/tickets/TASK-split-server.md` |
| Фича | `<PROD>/<slug>` | `UP/java-detection` | `kb/products/up/java-detection.md` |
| Фичефлаг | `flag:<name>` | `flag:world-backup` | `kb/registry/flags.md#world-backup` |
| Тест-сервер | `srv:<short8>` | `srv:ebb03adc` | `kb/registry/test-servers.md#ebb03adc` |
| Тест-аккаунт | `acc:<role>` | `acc:shared-owner`, `acc:admin`, `acc:invitee` | `kb/registry/test-accounts.md#shared-owner` |
| Окружение | `env:<name>` | `env:prod`, `env:stage` | `kb/registry/environments.md#stage` |
| Находка / баг / кейс внутри задачи | `<TICKET>/<LOCAL>` | `DEV-492/F5`, `DEV-563/FE-07`, `TASK-split-server/BUG-1` | якорь в отчёте задачи |
| Тест-кейс автотеста | `TC-<PROD>-<AREA>-NNN` | `TC-UP-PWR-001` (в спеках пока старое `TC-GP-*`, это то же самое) | спек (grep по ID) |
| Требование из старых docx | `REQ-<PROD>-<AREA>-NNN` | `REQ-WPGL-NAV-001`, `REQ-UP-AUTH-007` | страница фичи |
| Merge request | `<repo>!<N>` | `panel!1672`, `new-panel!547` | ссылка на GitLab (см. «Репозитории кода») |
| Опубликованный артефакт | `art:<id>` | `art:52DJGadW` | карточка тикета, блок «Артефакты» |

## Локальные ID в новых отчётах (единые буквы)

Буквы остаются короткими, но **на всю KB одинаковыми**:

| Буква | Значит |
|---|---|
| `F` | Находка или дефект, найденный в ходе QA |
| `C` | Кейс проверки (строка матрицы) |
| `D` | Пункт DoD |
| `AC` | Acceptance criteria из тикета |
| `R` | Перепроверка (recheck) |
| `Q` | Открытый вопрос к разработке или владельцу |
| `O` | Наблюдение без дефекта |

Внутри отчёта в заголовке пишем полное имя: `### DEV-492/F5 - старая запись override`. Так
якорь уникален и находится grep-ом по всему репо.

В карточке тикета KB находки собраны в таблицу раздела «Находки», поэтому ссылка ведёт на
раздел: `[DEV-492/F5](../tickets/DEV-492.md#находки)`.

**Старые отчёты не переписываем.** При ссылке на них просто добавляем префикс (`DEV-515/F3`).

## Как ставить ссылки

- **В markdown (репо):** относительная ссылка, `[DEV-492/F5](../tickets/DEV-492.md#находки)`.
- **В Jira, Notion, Confluence, артефактах:** полный URL на опубликованную страницу. До
  публикации - URL файла в GitLab.
- **Jira-тикет:** ссылка на карточку в KB. В самой карточке есть ссылка на Jira.
- **Сервер:** `srv:ebb03adc` всегда ведёт в реестр, где написано, чей он, под что и можно ли
  трогать.

## Ловушки

- `QA-563` - это имя сервера, а не Jira-ключ. Имена серверов пишем через `srv:`.
- Тикет переехал между проектами Jira - основной **актуальный** ключ, старый пишем как «бывш.». Пример: `DEV-418` (бывш. `PROD-134`, в памяти встречается и опечатка «PROTD-134»).
- В QA_TEST_COVERAGE ТЗ написаны кириллицей (`ТЗ-...`), а в `agents.docs/tz/` - латиницей
  (`TZ-...`). Канон - латиница.
