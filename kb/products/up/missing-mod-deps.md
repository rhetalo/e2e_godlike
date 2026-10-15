---
id: UP/missing-mod-deps
title: Missing mod dependencies - автодозагрузка зависимостей модов
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-10-06        # flavor Arclight в resolve-missing (DEV-529); основной QA 24..29-Sep
tickets: [TASK-missing-mod-deps, DEV-529]
flags: []
tests: []                      # автотестов нет
sources:
  - kb/tickets/TASK-missing-mod-deps.md, DEV-529.md
  - test-docs/ultra.panel/missing-mod-deps-popup-REPORT.md
  - memory: missing-mod-deps-popup-qa
---

# Missing mod dependencies - автодозагрузка зависимостей модов

> **В двух словах.** Если сервер падает на старте, потому что одному моду не хватает другого, панель
> сама это замечает и показывает окно «Missing mod dependencies» со списком недостающего и кнопкой
> установки. Работает на Fabric, NeoForge и Forge, на Quilt окно не появляется.

## Где в интерфейсе

- Окно **«Missing mod dependencies»** после краша на старте: строки лога и список **REQUIRED TO INSTALL**, кнопки **Install** и **Install All**.

## Как работает (под капотом)

1. Сервер падает на старте → фронт парсит лог краша.
2. `POST /minecraft/mod-configurator/resolve-missing` → список зависимостей.
3. Install / Install All ставят их через `POST /minecraft/mods` ([UP/extensions-catalog](extensions-catalog.md)).

- Распознаются форматы Fabric (`requires version X or later of Y, which is missing!`) и NeoForge (`Mod X requires Y Z or above`).
- Ставится **свежая** версия зависимости, а не минимальная из лога.
- Для Arclight loader берётся по flavor (`resolve-missing` `meta.loader`) ([DEV-529](../../tickets/DEV-529.md)).

## Правила и граничные случаи

1. **Quilt:** окно не появляется, `resolve-missing` не вызывается ([TASK-missing-mod-deps/F1](../../tickets/TASK-missing-mod-deps.md#находки), открыт).
2. **Quilt + Fabric-мод:** тост «Conflict detected», старт блокируется ([F2](../../tickets/TASK-missing-mod-deps.md#находки), открыт).
3. **Окно пишет «can start»,** хотя зависимость требует более новый loader (MonoLib 4.1.0 → loader ≥ 0.16.9) - [O1](../../tickets/TASK-missing-mod-deps.md#находки).

## Гочи для тестирования

- Воспроизведение: поставить мод без его зависимости и запустить сервер. Стенд - [srv:ca326e28](../../registry/test-servers.md#ca326e28).
- Это окно - **предмет проверки**, его не закрывать автоматически вместе с прочими модалками ([UP/modals](modals.md)).

## Покрытие

- **Автотестов нет.** Ручной QA: [missing-mod-deps-popup-REPORT.md](../../../test-docs/ultra.panel/missing-mod-deps-popup-REPORT.md),
  PASS на Fabric, NeoForge, Forge 1.20.1 + CF-мод.

## История

| Дата | Тикет | Что |
|---|---|---|
| 24..25-Sep-2026 | [TASK-missing-mod-deps](../../tickets/TASK-missing-mod-deps.md) | QA окна, PASS кроме Quilt |
| 29-Sep-2026 | [TASK-missing-mod-deps](../../tickets/TASK-missing-mod-deps.md) | Исправлены F3 (опечатка), F4 (ложное «Partially installed»), F5 (MonoLib не в Installed) |
| 06-Oct-2026 | [DEV-529](../../tickets/DEV-529.md) | Loader для Arclight по flavor |
