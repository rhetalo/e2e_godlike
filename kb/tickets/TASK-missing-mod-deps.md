---
id: TASK-missing-mod-deps
title: Окно Missing mod dependencies (автодозагрузка зависимостей)
type: ticket
product: [UP]
features: [UP/missing-mod-deps]
status: done
qa_verdict: PASS-with-issues
updated: 2026-10-15
verified_on: 2026-09-29
jira: -
sources:
  - test-docs/ultra.panel/missing-mod-deps-popup-REPORT.md
  - memory: missing-mod-deps-popup-qa
---

# TASK-missing-mod-deps - Окно Missing mod dependencies (автодозагрузка зависимостей)

> **В двух словах.** Если сервер падает на старте из-за того, что моду не хватает другого мода,
> панель сама это замечает и предлагает установить недостающее одной кнопкой. Работает на
> Fabric, NeoForge и Forge. На Quilt окно не появляется.

## Как это работает
- Сервер падает на старте → фронт парсит лог → `POST /minecraft/mod-configurator/resolve-missing` → окно со строками лога и списком REQUIRED TO INSTALL.
- Install / Install All ставят зависимости через `POST /minecraft/mods`.
- Парсит форматы Fabric (`requires version X or later of Y, which is missing!`) и NeoForge (`Mod X requires Y Z or above`).
- Ставится свежая версия зависимости, а не минимальная из лога.

## Итог QA
PASS (Fabric, NeoForge, Forge 1.20.1 + CF-мод), 24-25 Sep. Три бага перепроверены и исправлены 29-Sep. Отчёт: [missing-mod-deps-popup-REPORT.md](../../test-docs/ultra.panel/missing-mod-deps-popup-REPORT.md).

## Находки
| ID | Суть | Статус |
|---|---|---|
| TASK-missing-mod-deps/F1 | Quilt 1.21.1: окно не появляется, resolve-missing не вызывается | открыт |
| TASK-missing-mod-deps/F2 | Quilt + Fabric-мод: тост «Conflict detected», старт блокируется | открыт |
| TASK-missing-mod-deps/F3 | Опечатка «Incomatible» | исправлен 29-Sep |
| TASK-missing-mod-deps/F4 | Модпак без Fabric API: ложное «Partially installed» | исправлен 29-Sep |
| TASK-missing-mod-deps/F5 | MonoLib не попадал в Installed | исправлен 29-Sep |
| TASK-missing-mod-deps/O1 | Окно пишет «can start», хотя MonoLib 4.1.0 требует loader ≥ 0.16.9 | наблюдение |

## Связи
- Фичи: [UP/missing-mod-deps](../products/up/missing-mod-deps.md)
- Сервер: [srv:ca326e28](../registry/test-servers.md#ca326e28).
- Связанные: [DEV-529](DEV-529.md).
