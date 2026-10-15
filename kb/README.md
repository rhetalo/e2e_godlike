---
id: KB
title: База знаний godlike (KB)
status: draft
updated: 2026-10-15
owner: r.hetalo
---

# База знаний godlike (KB)

> **В двух словах.** Здесь живёт описание продукта: что есть, как работает, откуда и куда
> идут данные, какие нюансы. Описываем продукт, а не тесты (про тесты - `agents.docs/` и
> `test-docs/`). Сначала пишем в репо (markdown, git), потом публикуем в Notion или Confluence.

## Зачем

1. Не делать recon с нуля перед каждой задачей.
2. Тест-планам и чеклистам нужна опора: на что ссылаться и с чем сверять.
3. Отчёты и Jira-комменты со связями: любой ID ведёт туда, к чему он относится.
4. Источник для MCP тимлида (аудит ТЗ против текущей логики), поэтому структура
   машиночитаемая: стабильные ID + front matter.

## Правила (контракт)

- **Любой ID - ссылка.** DEV-xxx, флаг, сервер, находка, кейс. Нет домашней страницы - сначала
  завести, потом ссылаться. Схема ID: [_meta/id-scheme.md](_meta/id-scheme.md).
- **Каждая страница начинается с «В двух словах»**: 2-4 предложения человеческим языком.
  Детали ниже.
- **Front matter обязателен:** `id`, `title`, `product`, `status` (draft / verified / stale),
  `updated`, `verified_on` (когда последний раз сверяли с живым продуктом), `sources`.
- **Один факт - одно место.** Остальные ссылаются, не копируют.
- **Без секретов.** Пароли, токены, email тест-аккаунтов не пишем. Аккаунт = роль + имя
  env-переменной.
- **Устаревшее не дописываем сверху, а правим** и ставим `verified_on`. Если не уверены -
  `status: stale` и пометка, что проверить.

## Структура (целевая, наполняется по этапам)

```
kb/
  README.md                 # этот файл
  map.md                    # майндкарта проекта (этап 2) ✅
  glossary.md               # словарь терминов
  products/
    wpgl/                   # WPGL  - витрина godlike.host (WordPress)
    bil/                    # BIL - биллинг WHMCS (clientarea, корзина, инвойсы)
    up/                     # UP  - игровая панель ultra.panel + API panel.godlike.host/api/v2
    oldp/                   # OLDP - старая клиентская панель panel.godlike.host/
    adm/                    # ADM - админка panel.godlike.host/admin (только админы)
    vps/                    # VPS - vf-panel (VirtFusion)
    pfh/                    # PFH - PlayFreeHost (бесплатный хостинг)
  tickets/                  # карточка на каждый тикет: DEV-562.md ...
  registry/
    environments.md         # prod / stage: URL, ноды, кто где
    flags.md                # фичефлаги
    test-servers.md         # тестовые серверы
    test-accounts.md        # тест-аккаунты по ролям (без секретов)
    integrations.md         # CurseForge, Modrinth, Amplitude, Stripe, eSputnik ...
  _meta/
    id-scheme.md            # схема ID и правила ссылок
    templates.md            # шаблоны карточки тикета и страницы фичи
    inventory-2026-10-15.md # этап 0: что знаем и где лежит
  _tools/
    linkcheck.py            # проверка ссылок и якорей: python -I kb/_tools/linkcheck.py .
    tickets_index.py        # пересборка tickets/README.md: python -I kb/_tools/tickets_index.py kb/tickets
```

## С чего начать

- **Карта всего проекта:** [map.md](map.md) - продукты → области → фичи → тикеты, всё ссылками.
- **Продукт целиком:** [products/up/README.md](products/up/README.md) - игровая панель (28 страниц фич), [products/vps/README.md](products/vps/README.md) - VPS-панель VirtFusion, [products/wpgl/README.md](products/wpgl/README.md) - витрина, [products/bil/README.md](products/bil/README.md) - биллинг, [products/pfh/README.md](products/pfh/README.md) - PlayFreeHost, [products/oldp/README.md](products/oldp/README.md) - старая панель, [products/adm/README.md](products/adm/README.md) - админка.
- **Задачи:** [tickets/README.md](tickets/README.md) - 30 карточек: что меняли, итог QA, находки.
- **Перед тестом:** [окружения](registry/environments.md), [серверы](registry/test-servers.md),
  [аккаунты](registry/test-accounts.md), [флаги](registry/flags.md), [интеграции](registry/integrations.md),
  [MCP-серверы](registry/mcp-tools.md) (SQL к базам, инструменты WP).
- **Перед коммитом в `kb/`:** прогнать `linkcheck.py` (0 битых ссылок) и пересобрать индекс тикетов.

## Этапы

| # | Этап | Статус |
|---|---|---|
| 0 | Инвентаризация + схема ID | ✅ 15-Oct-2026 |
| 1 | Каркас: реестры, 30 карточек тикетов, обзор UP | ✅ 15-Oct-2026 |
| 2 | Майндкарта [map.md](map.md) + первые 4 страницы фич UP | ✅ 15-Oct-2026 |
| 3 | Точечный ресерч GitHub (KB, глоссарии, связанные доки) | следующий |
| 4 | Репо продукта: архитектура + матрица «фича ↔ тесты ↔ дыры» | ждёт доступа |
