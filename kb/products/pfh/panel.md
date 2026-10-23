---
id: PFH/panel
title: Панель PlayFreeHost (playfreehost.com/panel) - копия ultra.panel для free
type: feature
product: PFH
status: draft
updated: 2026-10-23
verified_on: 2026-10-15        # QA DEV-563 на проде
tickets: [DEV-563]
flags: []
tests: []                      # автотестов нет
sources:
  - kb/tickets/DEV-563.md
  - test-docs/ultra.panel/DEV-563/DEV-563-jira-comment.md
  - test-docs/ultra.panel/DEV-563/DEV-563_free_egg_lock_checklist.xlsx
  - memory: dev563-free-egg-lock, MEMORY.md (строка индекса DEV-563 про деплой фронта PFH 15-Oct)
  - kb/products/up/free-servers.md
---

# Панель PlayFreeHost (playfreehost.com/panel)

> **В двух словах.** Пользователи PlayFreeHost управляют сервером не в ultra.panel, а в её копии по адресу
> `playfreehost.com/panel`. Бэкенд и аккаунты общие с [UP](../up/README.md), поэтому все ограничения бесплатного
> тарифа действуют и здесь. Отличие одно, но важное: фронт PFH собирается и деплоится отдельно и может
> отставать от ultra.panel на несколько релизов.

## Где в интерфейсе

- `playfreehost.com/panel` - тот же интерфейс, что [ultra.panel](../up/README.md), сюда ведёт [лендинг PFH](landing.md) после создания сервера.
- Ключевой экран для free-ограничений - **Edit Server** (имя, игра, тип сервера), см. [UP/free-servers](../up/free-servers.md).

## Как работает (под капотом)

| Что | Факт | Источник |
|---|---|---|
| Бэкенд | общий с ultra.panel (`panel.godlike.host/api/v2`), значит запреты бэкенда действуют в обеих панелях | [DEV-563](../../tickets/DEV-563.md) |
| Аккаунты | синхронны с godlike: тот же логин работает в обеих панелях | [DEV-563](../../tickets/DEV-563.md) |
| Фронт | свой билд, свой деплой; версию видно по `Last-Modified` у `playfreehost.com/panel/assets/index-*.js` | [DEV-563](../../tickets/DEV-563.md) |
| Признак free | в panel DB только `servers.free`; связи с продуктом WHMCS нет | [DEV-563](../../tickets/DEV-563.md) |

Отличается ли панель PFH от ultra.panel чем-то, кроме отставания фронта (брендинг, набор разделов) - ❓ не описано.

## Правила и граничные случаи

1. **Смена игры у free запрещена бэкендом:** смена nest / egg → 403 «Changing the server type is only available on paid plans.»
   Отказ атомарный: имя из того же запроса тоже не сохраняется ([UP/free-servers](../up/free-servers.md)).
2. **Старый фронт показывает то, что бэкенд не даст сделать.** Так было 15-Oct: фронт PFH собран 30-Sep (`index-BtcjH5zw.js`),
   без [new-panel!558](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/558), поэтому у free видны селекты
   Game / Platform и Server Type, а Save даёт 403 ([DEV-563/BUG-1](../../tickets/DEV-563.md#находки)).
3. **BUG-1 закрыт:** фронт PFH задеплоен 15-Oct-2026, владелец перепроверил - селектов у free больше нет
   ([DEV-563](../../tickets/DEV-563.md#находки)). Урок остаётся: после релиза new-panel сверять свежесть фронта PFH отдельно.

## Гочи для тестирования

- **Сначала проверить свежесть фронта:** `Last-Modified` у `playfreehost.com/panel/assets/index-*.js` сравнить с датой нужного MR
  в ultra.panel. Если фронт старше - расхождение с ultra.panel ожидаемо, это не новый баг, а недеплой.
- **Негатив по API** (смена egg у free) на чужом или общем сервере не делать: при регрессии запрос реально сменит игру.
  Только на выделенном free-сервере.
- `activity_logs` смену egg не пишет - по аудиту факт смены не проверить.
- Тестовые серверы: [srv:d716acea](../../registry/test-servers.md#d716acea) (создан через playfreehost.com),
  для сравнения [srv:0010cf61](../../registry/test-servers.md#0010cf61) (free через лендинг godlike → ultra.panel).
  Аккаунт - free-клиент ([acc:free-client](../../registry/test-accounts.md#free-client)).

## Что проверять (минимальный регресс)

| Что | Ожидание |
|---|---|
| Фронт PFH свежий | `Last-Modified` у `index-*.js` не старше последнего релиза new-panel, затрагивающего free |
| Edit Server у free-сервера в PFH | только имя, нет селектов Game / Platform и Server Type (DEV-563 FE-07 / FE-10) |
| Переименование free-сервера | сохраняется |
| Тот же сервер в ultra.panel | ведёт себя так же (общий бэкенд) |

## Покрытие

- **Автотестов нет.**
- Ручной QA [DEV-563](../../tickets/DEV-563.md) 15-Oct-2026, чек-лист FE-01..FE-26:
  [DEV-563_free_egg_lock_checklist.xlsx](../../../test-docs/ultra.panel/DEV-563/DEV-563_free_egg_lock_checklist.xlsx); по PFH - FE-07 / FE-10 FAIL (только фронт).

## История

| Дата | Тикет | Что |
|---|---|---|
| 30-Sep-2026 | - | Последняя сборка фронта PFH на момент QA |
| 15-Oct-2026 | [DEV-563](../../tickets/DEV-563.md) | Запрет смены игры у free: бэкенд защищает обе панели, фронт PFH без new-panel!558 |
