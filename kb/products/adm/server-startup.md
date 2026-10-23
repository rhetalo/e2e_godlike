---
id: ADM/server-startup
title: Сервер в админке - Startup (образ Docker, смена egg) и Build
type: feature
product: ADM
status: draft
updated: 2026-10-23
verified_on: 2026-10-21        # DEV-579: Build → Memory по ок владельца
tickets: [DEV-486, DEV-513, DEV-472, DEV-579, DEV-418]
flags: []
tests: []                      # автотестов нет и не будет без ок владельца
sources:
  - kb/tickets/DEV-486.md, DEV-513.md, DEV-472.md, DEV-579.md, DEV-418.md
  - test-docs/ultra.panel/DEV-486/version-changer-libxrender-REPORT.md
  - test-docs/ultra.panel/DEV-472/java-detection-matrix-REPORT.md
  - test-docs/ultra.panel/DEV-579/DEV-579-testplan.md
  - memory: feedback-legacy-admin-ask-first, dev486-version-changer-libxrender, dev513-startup-stale-image, dev579-pz-xmx-sync
---

# Сервер в админке - Startup и Build

> **В двух словах.** В админке у каждого сервера есть вкладки, где админ задаёт то, что клиенту недоступно: свой
> образ Docker (Java), тип сервера (egg), память и лимиты. QA пользуется ими как инструментом, чтобы подготовить
> сервер под сценарий: поставить нестандартный образ, сменить egg, снизить тариф без биллинга. Это живой прод
> и чужие серверы рядом, поэтому каждое действие - только после явного ок владельца.

## Где в интерфейсе

| Вкладка | Путь | Что там | Источник |
|---|---|---|---|
| Startup | `/admin/servers/view/{id}/startup` | поле `custom_docker_image` (свой образ), выбор egg (`#pEggId`), чекбокс `skip_scripts`, кнопка Save Modifications | [DEV-486](../../tickets/DEV-486.md), [DEV-513](../../tickets/DEV-513.md) |
| Build | `/admin/servers/view/{id}/...` (точный путь ❓) | Memory (RAM сервера), лимит World Backup 0/N | [DEV-579](../../tickets/DEV-579.md), [DEV-418](../../tickets/DEV-418.md) |

`{id}` - числовой ID сервера в панели (например 771938 у [srv:ca326e28](../../registry/test-servers.md#ca326e28)), не короткий UUID.

## Как работает (под капотом)

- **`custom_docker_image`** записывает образ в `servers.image`. Если такого образа нет в `docker_images` egg, клиент в
  [OLDP «Параметрах запуска»](../oldp/startup-params.md) видит «Образ Docker этого сервера был установлен администратором»;
  очистка поля возвращает обычный выбор. С [DEV-513](../../tickets/DEV-513.md) клиент видит смену без F5.
- **Смена egg** (`#pEggId`) меняет тип сервера. `skip_scripts` - не запускать install-скрипт egg при смене.
- **Build → Memory** меняет RAM в обход биллинга: тариф в WHMCS не меняется, бейдж тарифа в панели остаётся прежним
  ([DEV-579](../../tickets/DEV-579.md): 6144 → 4096, после старта `-Xmx3072m`, бейдж «6 Ram» остался).
- **Build → лимит World Backup 0/N** живёт только здесь, в клиентской панели его нет ([DEV-418](../../tickets/DEV-418.md)).

## Зачем QA сюда ходил

| Дата | Тикет | Действие | Результат |
|---|---|---|---|
| 25-Sep-2026 | [DEV-486](../../tickets/DEV-486.md) | `custom_docker_image` = libxrender-образ на egg 3; смена egg 3 → 121 | сервер переведён на egg 121 |
| ~06-Oct-2026 ❓ | [DEV-472](../../tickets/DEV-472.md) | смена egg на 1800 (Modpack-CurseForge) + Reinstall | пак не ставится, файлы удалены, детект `skipped` - [DEV-472](../../tickets/DEV-472.md#находки)/O2, вопрос разрабу |
| 12-Oct-2026 | [DEV-513](../../tickets/DEV-513.md) | A1 смена образа, A2 custom-образ, A3 очистка | клиент видит всё без F5, PASS |
| 21-Oct-2026 | [DEV-579](../../tickets/DEV-579.md) | Build → Memory 6144 → 4096 (даунгрейд клиенту недоступен) | `-Xmx3072m`, PASS |

## Правила

1. **Ничего без явного ок владельца на конкретное действие** - даже просмотр egg-скриптов. Перед действием перечислить:
   URL, сервер, что меняю; после - отчитаться списком ([ADM](README.md#правила), [DECISIONS](../../../agents.docs/DECISIONS.md)).
   «Делай что хочешь с сервером» = свобода в клиентской панели, не в админке.
2. Только серверы из [реестра](../../registry/test-servers.md); админ-аккаунт видит чужие ([acc:admin](../../registry/test-accounts.md#admin)).
3. Смена Memory - в обход биллинга: фиксировать в отчёте, что тариф WHMCS остался прежним, и возвращать значение после прогона.

## Гочи для тестирования

- **Админку - во второй вкладке,** клиентскую панель не перезагружать, если проверяется отображение изменения у клиента (DEV-513).
- **libxrender-образы есть только в eggs 2, 121, 1863;** на egg 3 их ставят только через `custom_docker_image` ([OLDP/version-changer](../oldp/version-changer.md)).
- Смена egg без `skip_scripts` гоняет install-скрипт egg - это фактически переустановка ❓ (вывод из назначения флага, отдельно не проверялось).
- 06-Oct-2026 был инцидент: две смены egg и два Reinstall на ca326e28 без предупреждения владельца. Поэтому правило 1.

## Что проверять (если задача про админку)

| Сценарий | Ожидание |
|---|---|
| Custom-образ, которого нет в egg | у клиента надпись «установлен администратором» без F5 |
| Очистка custom-образа | у клиента снова select |
| Смена образа на вариант из egg | у клиента новый образ без F5 |
| Build → Memory | новое значение подхватывается после старта; тариф в биллинге не меняется |

## Покрытие

- **Автотестов нет и не будет без ок владельца.**
- Ручные шаги: DEV-513 A1-A3, DEV-579 XMX-04 ([DEV-579-testplan.md](../../../test-docs/ultra.panel/DEV-579/DEV-579-testplan.md)).

## История

См. таблицу «Зачем QA сюда ходил».
