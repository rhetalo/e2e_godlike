---
id: KB-TEMPLATES
title: Шаблоны страниц KB
status: draft
updated: 2026-10-15
---

# Шаблоны страниц KB

> **В двух словах.** У всех страниц KB один каркас. Его можно копировать как есть: сверху
> front matter, потом «В двух словах», потом детали. Ссылки на ID оформляются по
> [id-scheme.md](id-scheme.md).

## Карточка тикета - `kb/tickets/<KEY>.md`

```markdown
---
id: DEV-562
title: Steam Port для Project Zomboid в Overview
type: ticket
product: [UP]                  # префиксы из id-scheme
features: [UP/server-overview] # фичи, которые тикет меняет
status: done                   # QA-статус: in-qa / done / blocked / partial
qa_verdict: PASS               # PASS / PASS-with-issues / FAIL / -
updated: 2026-10-15
verified_on: 2026-10-15        # когда последний раз сверяли с живым продуктом
env: [prod]
jira: https://<jira>/browse/DEV-562
sources:
  - test-docs/ultra.panel/DEV-562-jira-comment.md
  - memory: dev562-pz-steam-port
---

# DEV-562 - Steam Port для Project Zomboid в Overview

> **В двух словах.** Что поменяли и зачем, человеческим языком. Чем закончилось QA.

## Что изменилось
Поведение до и после, 3-6 пунктов.

## Как это работает
Откуда берутся данные, какие API / флаги / таблицы участвуют. Только проверенное.

## Итог QA
Вердикт, дата, окружение, отчёт (ссылкой), артефакт (`art:<id>`).

## Находки
| ID | Суть | Статус |
|---|---|---|
| DEV-562/F1 | ... | открыт / исправлен / вынесен в DEV-xxx |

## Связи
- MR: [panel!1679](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1679), [new-panel!557](...)
- Серверы: [srv:d70813d3](../registry/test-servers.md#d70813d3)
- Флаги: [flag:...](../registry/flags.md#...)
- Связанные тикеты: [DEV-xxx](DEV-xxx.md)

## Хвосты
Что осталось открытым, у кого.
```

## Страница фичи - `kb/products/<prod>/<slug>.md`

```markdown
---
id: UP/java-detection
title: Java detection и гейт старта
type: feature
product: UP
status: draft          # draft / verified / stale
updated: 2026-10-15
verified_on: 2026-10-09
tickets: [DEV-472, DEV-485]
flags: [java-start-gate, java-mismatch-fixer]
tests: [tests/game/panel/versions.spec.ts]
---

# Java detection и гейт старта

> **В двух словах.** Что это для пользователя, 2-4 предложения.

## Где в интерфейсе
## Как работает (под капотом)
## Правила и граничные случаи
## Гочи для тестирования
## Покрытие
Автотесты, ручные чеклисты, что не покрыто.
## История
Тикеты, которые меняли фичу, по датам.
```

## Правила заполнения

- Пишем **только то, что подтверждено** источником. Предположения помечаем `❓` и не выдаём за факт.
- Каждый факт со ссылкой на источник: отчёт, память или recon с датой.
- Дата всегда в формате `YYYY-MM-DD` или `DD-Mon-YYYY`.
- Без em-dash, только дефис `-`.
- Без паролей, email и токенов.
