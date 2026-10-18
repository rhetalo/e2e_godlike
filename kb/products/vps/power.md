---
id: VPS/power
title: Power VPS - Boot, Shutdown, Power Off, Restart
type: feature
product: VPS
status: draft
updated: 2026-10-18
verified_on: 2026-06-19        # тайминги из activity history May 2026; спек зелёный 19-Jun
tickets: []
flags: []
tests: [tests/vps/panel/vps.panel.power.actions.spec.ts, tests/vps/panel/vps.panel.server.spec.ts]
sources:
  - шапка tests/vps/panel/vps.panel.power.actions.spec.ts (тайминги May 2026)
  - agents.docs/vps-panel/KNOWLEDGE_BASE.md §6, HANDOFF.md
  - kb/products/vps/README.md (статусы и переходы)
  - memory: panel-teardown-hook-timeout
---

# Power VPS - Boot, Shutdown, Power Off, Restart

> **В двух словах.** Четыре действия с питанием VPS на [странице сервера](server-page.md): включить (Boot),
> штатно выключить (Shutdown), выключить жёстко (Power Off) и перезапустить (Restart). Все, кроме Boot,
> спрашивают подтверждение в модалке. Каждое действие ставит задачу в activity table, готово - бейдж **Complete**.

## Где в интерфейсе

- Страница сервера → кнопки **Boot**, **Shutdown**, **Power Off**, **Restart**.
- Shutdown / Power Off / Restart открывают модалку (`.modal.show`): заголовок, вопрос, confirm и Cancel.
- Boot - прямой клик, без модалки; при Running кнопка disabled.

## Статусы и переходы

| Из | Действие | В | Модалка | Время (activity, May 2026) |
|---|---|---|---|---|
| Running | Shutdown | Stopped | да | 6-43 с |
| Running | Power Off | Stopped | да | 3-5 с |
| Stopped | Boot | Running | нет | 3-5 с |
| Running | Restart | Running (без промежуточного Stopped) | да | ~10 с |

Статус VirtFusion обновляет поллингом ~2 с.

## Правила и граничные случаи

1. **Cancel в модалке не меняет статус** - проверено тестом на каждой из трёх модалок.
2. Задача в activity table: тип (Boot / Shutdown / Poweroff), прогресс 100%, реальная длительность, бейдж Complete.

## Не баг - так задумано

| Кажется багом | На самом деле | Источник |
|---|---|---|
| Restart не показывает Stopped | VirtFusion перезапускает без промежуточного статуса | шапка power.actions |
| Boot неактивна | сервер уже Running | шапка power.actions |

## Гочи для тестирования

- **Stateful:** power меняет реальный сервер - `serial`, один сервер, `afterAll` возвращает в Running.
- **Слитые тесты длиннее микро-шагов:** `test.setTimeout(180s)`, иначе teardown падает по таймауту хука.
- Confirm-кнопки брать геттерами PO (`*ConfirmButton`), модалку закрывает `data-bs-dismiss` - ждать её скрытия, без `waitForTimeout`.
- Порядок state-machine в спеке: Shutdown → Boot → Power Off → Boot → Restart.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Shutdown: Running → Stopped (модалка → confirm → activity → статус) | `vps.panel.power.actions.spec.ts` (PWR-001) | ✅ |
| Boot: Stopped → Running | `vps.panel.power.actions.spec.ts` (PWR-002) | ✅ |
| Power Off: Running → Stopped | `vps.panel.power.actions.spec.ts` (PWR-003) | ✅ |
| Restart: Running → Running | `vps.panel.power.actions.spec.ts` (PWR-004) | ✅ |
| Activity: записи Complete, прогресс 100%, длительность | `vps.panel.power.actions.spec.ts` (PWR-005) | ✅ |
| Модалки: заголовок, вопрос, confirm, Cancel не меняет статус | `vps.panel.power.actions.spec.ts` (PWR-006) | ✅ |
| Кнопки питания на странице (smoke) | `vps.panel.server.spec.ts` (SRV-004) | ✅ |

## История

| Дата | Тикет | Что |
|---|---|---|
| May 2026 | - | Тайминги сняты из activity history, спек power.actions - эталон stateful-теста |
| 18-Oct-2026 | - | В ночном отчёте PWR-003 прошёл только с 3-й попытки - кандидат в разбор по истории прогонов |
