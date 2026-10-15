---
id: TASK-split-server
title: Split Server: управление ресурсами split-серверов в новой панели
type: ticket
product: [UP]
features: [UP/split-server]
status: done
qa_verdict: PASS
updated: 2026-10-15
verified_on: 2026-09-10
jira: -
sources:
  - test-docs/ultra.panel/split-server-REPORT.md
  - memory: split-server-qa
---

# TASK-split-server - Split Server: управление ресурсами split-серверов в новой панели

> **В двух словах.** Клиент может разделить свой сервер на основной и до 3 саб-серверов и сам
> перераспределять между ними RAM и диск. Раньше это было только в старой панели, теперь
> перенесено в ultra.panel. QA 10-Sep: 13/13 шагов PASS, найденные баги исправлены.

## Как это работает
- API (`panel.godlike.host`): `GET/POST /api/v2/servers/{uuid}/split`, `PATCH .../split/{subUuid}/resources {memory,disk}`, `DELETE .../split/{subUuid}`.
- Правила: минимум 100 МБ RAM и 100 МБ диска на саб, максимум 3 саба.
- Правка ресурсов перезапускает **работающий** сервер. Остановленный остаётся offline.
- Права участников на сабы синхронизируются **вручную** («Sync Subuser Permissions», `sync_permissions:true`). Это by design.
- Member без `split_access` не видит вкладку Split.
- Дашборд группирует семью серверов `[MainN]/[SubN_M]`, свёрнутая группа показывает бейдж `+N`.

## Итог QA
PASS 13/13, 10-Sep-2026, prod, [acc:admin](../registry/test-accounts.md#admin). Отчёт: [split-server-REPORT.md](../../test-docs/ultra.panel/split-server-REPORT.md). Артефакт `art:33a83ab3`.

## Находки
| ID | Суть | Статус |
|---|---|---|
| TASK-split-server/BUG-1 | Модалка-гвард создания не закрывалась после «Yes» | исправлен |
| TASK-split-server/BUG-2 | Форма создания не сбрасывала имя | исправлен |
| TASK-split-server/BUG-3 | Синк прав не автоматический | by design |

## Связи
- Фичи: [UP/split-server](../products/up/split-server.md), [UP/sharing-roles](../products/up/sharing-roles.md)
- Серверы: [srv:1d7d34aa](../registry/test-servers.md#1d7d34aa) (main), [srv:0c7b82c3](../registry/test-servers.md#0c7b82c3), [srv:60fdf307](../registry/test-servers.md#60fdf307).
- Jira-ключа нет (разработчик Sergiy Serpichenko, инициатор L2). ❓ ключ.
