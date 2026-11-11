---
id: ADM/server-transfer
title: Сервер в админке - Transfer (перенос на другую ноду)
type: feature
product: ADM
status: draft
updated: 2026-11-11
verified_on: 2026-10-27        # DEV-583: только просмотр модалки, без переносов
tickets: [DEV-583, DEV-659, DEV-661, DEV-672]
flags: []
tests: []                      # автотестов нет и не будет без ок владельца
sources:
  - kb/tickets/DEV-583.md
  - kb/tickets/DEV-659.md
  - kb/tickets/DEV-661.md
  - kb/tickets/DEV-672.md
  - test-docs/panel/DEV-583/DEV-583-qa.html
  - memory: feedback-legacy-admin-ask-first, dev583-transfer-sorting
---

# Сервер в админке - Transfer

> **В двух словах.** Вкладка Transfer у сервера в админке - это инструмент саппорта: перенести контейнер на другую ноду,
> например при разгрузке. Модалка показывает ноды по локациям: первой идёт локация самого сервера, внутри ноды
> отсортированы по реальной нагрузке. Сам перенос мутирует чужой живой сервер, поэтому QA только смотрит список.

## Где в интерфейсе

| Что | Путь / селектор | Источник |
|---|---|---|
| 11-Nov-2026 | [DEV-672](../../tickets/DEV-672.md) | Шаг «Transfer databases» убран из колбека Wings, admin Confirm, Rollback и `ServerTransferWorkflow` ([panel!1795](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1795)): базы остаются на месте; prod PASS. DEV-688 на проде всё ещё воспроизводится (wing129) |
| Страница | `/admin/servers/view/{id}/manage-transfer` (`{id}` - числовой ID сервера) | [DEV-583](../../tickets/DEV-583.md) |
| Кнопка «Transfer Server» | только открывает модалку `#transferServerModal` (`data-toggle="modal"`, без формы) | DEV-583 |
| Поиск | `#nodeSearch` (по имени ноды) | DEV-583 |
| Сортировка | `.sort-btn[data-sort=load\|cpu\|ram\|disk\|name]`, активная - класс `active`; повторный клик меняет направление | DEV-583 |
| Мутирующие контролы | выбор ноды, аллокация, «Remember this node», **Apply**, **Confirm Transfer** (disabled до выбора) | DEV-583 |

## Как работает (под капотом)

- Данные лежат в `window.Pterodactyl`: `serverLocationId`, `metricStaleAfterSeconds` (окно свежести, на проде 7200 с),
  `nodeData` - массив нод (собственная нода сервера и удалённые ноды исключены).
- Поля ноды: `real_cpu_percent` - среднее за 15 мин до последнего CPU-семпла; `real_ram_*` / `real_disk_*` - последний
  **полный** семпл в окне свежести (тот же, что берёт балансировщик); `real_age_seconds`; `real_load_percent` = максимум из трёх.
  `ram_percent` / `disk_percent` - выделено лимитами серверов (может быть >100% из-за overallocate), показывается в подсказке.
- Источник метрик - таблица `load_balancer_metrics` (сборщик пишет раз в минуту).
- Нет метрик или они старше окна - все `real_*` = null, в UI «no data», нода всегда в конце группы.
- Бейдж возраста: серый до 5 мин, жёлтый `label-warning` после 5 мин, красный за 25% до конца окна, потом «stale».
  Считается от момента загрузки страницы, обновляется раз в 30 с.

## Правила и граничные случаи

- Базы сервера при переносе (legacy, workflow) и Rollback не переносятся: остаются на DB host, где созданы, с теми же именем и доступами ([DEV-672](../../tickets/DEV-672.md), с 11-Nov-2026).
- Группы: локация сервера первая (бейдж «Current location»), остальные по `localeCompare` имени.
- Внутри группы: выбранная метрика, при равенстве - Load, потом имя. Null в конце в обоих направлениях.
- Бейдж метрики красный при >90%.

## Гочи для тестирования

- Открывать модалку через `$('#transferServerModal').modal('show')` - кнопку «Transfer Server» владелец просил не нажимать.
- Сверка с БД: ±0,2 по CPU - нормальный сдвиг окна на минуту между загрузкой страницы и запросом.
- Нода без метрик для негативного кейса: ищи по `MAX(created_at)` в `load_balancer_metrics` старше 2 ч (27-Oct это была wing11).

## Что проверять (если задача про трансфер)

1. Первая группа = локация сервера, своей ноды нет.
2. Порядок по каждой кнопке в обе стороны, null в конце.
3. Сверка 2-4 нод с `load_balancer_metrics` (read-only SQL).
4. Ничего не выбирать и не подтверждать.

## Покрытие

- **Спеков на админку нет.**
- Ручной QA [DEV-672](../../tickets/DEV-672.md) 11-Nov-2026, prod: Transfer + Rollback своего `83d391c4`, базы на месте; подключение после Rollback не проверено (DEV-688).
- Ручной QA [DEV-661](../../tickets/DEV-661.md) 09-Nov-2026, stage: Rollback, A→B→A, рестарт и стоп Wings, sync на чужой ноде - PASS.
- Ручной QA [DEV-659](../../tickets/DEV-659.md) 05-Nov-2026, prod: Del / Rollback после A→B, A→B→A, A→B→C на своих серверах, PASS.
- Ручной QA [DEV-583](../../tickets/DEV-583.md) 27-Oct-2026, prod: шаги MR 1-6 PASS + сверка с БД, поиск, второй сервер.

## История

| Дата | Тикет | Что |
|---|---|---|
| 09-Nov-2026 | [DEV-661](../../tickets/DEV-661.md) | Rollback и возврат на ноду со своей копией больше не требуют рестарта Wings: панель шлёт sync при Rollback, ошибка шага не даёт 500 и не обрывает остальные шаги ([panel!1768](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1768) + [wing-panel!14](https://git.godlike.ovh/panel/wing-panel-godlike-host/-/merge_requests/14)); stage PASS 6/6, на прод Wings ещё не раскатан |
| 05-Nov-2026 | [DEV-659](../../tickets/DEV-659.md) | «Del from the old node» не удаляет живой сервер после A→B→A, освобождает только свои порты, confirm у Del/Rollback ([panel!1765](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1765)); панель PASS на проде, найден баг Wings [DEV-688](https://antihost.atlassian.net/browse/DEV-688) - сервер не стартует после возврата на ноду со своей копией. [panel!1774](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1774): повторный Del пишет «nothing to delete». Закрыт 06-Nov |
| 27-Oct-2026 | [DEV-583](../../tickets/DEV-583.md) | Локация сервера первой, сортировка Load / CPU / Mem / Disk / Name по реальным метрикам, бейдж возраста ([panel!1702](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1702)); PASS, 3 OBS |
