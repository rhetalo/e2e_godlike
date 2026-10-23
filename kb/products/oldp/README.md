---
id: OLDP
title: OLDP - старая клиентская панель (panel.godlike.host)
type: product-overview
product: OLDP
status: draft
updated: 2026-10-23
verified_on: 2026-10-12        # DEV-513
tickets: [DEV-486, DEV-512, DEV-513]
flags: []
tests: []                      # автотестов нет
sources:
  - kb/tickets/DEV-486.md, DEV-512.md, DEV-513.md
  - memory: panel-scope-new-panel, dev486-version-changer-libxrender, dev513-startup-stale-image
---

# OLDP - старая клиентская панель (panel.godlike.host)

> **В двух словах.** Старая игровая панель на `panel.godlike.host/` - здесь клиент тоже видит и
> настраивает свои серверы. Бэкенд общий с новой панелью ([UP](../up/README.md)), но интерфейс свой, на
> Pterodactyl-фронте. По умолчанию QA «панели» означает только UP; старую трогаем, только когда задача
> про неё. Описание собрано из трёх задач, полного recon не было.

## Что известно

| Раздел | Что | Страница |
|---|---|---|
| Страница сервера | `panel.godlike.host/server/<short>` | - |
| «Ядро & Версия» (Version Changer) | смена версии Minecraft, расширение Blueprint versionchanger; Java подбирается автоматически, libxrender сохраняется | [OLDP/version-changer](version-changer.md) |
| «Параметры запуска» | «Образ Docker» (Java): выбор из списка egg или надпись «установлен администратором»; `meta.docker_image` в `/startup` | [OLDP/startup-params](startup-params.md) |
| Язык интерфейса | в отчётах QA тексты русские («Изменение версии Minecraft», «Параметры запуска»); какие языки есть ещё - ❓ | - |

## Как работает (под капотом)

- Бэкенд общий с [UP](../up/README.md) (репо `panel`), выбор Java при смене версии - общий `JavaImageMatcher::pick()`
  ([OLDP/version-changer](version-changer.md#как-работает-под-капотом)).
- Образы libxrender есть не во всех eggs - таблица в [OLDP/version-changer](version-changer.md#образы-libxrender-по-egg).
- **Фиксы делают в core-коде панели,** а не в расширении versionchanger: патчи расширения теряются при `blueprint -upgrade` ([DEV-513](../../tickets/DEV-513.md)).

## Гочи для тестирования

- **Скоуп:** проверять OLDP только если задача про неё (memory panel-scope-new-panel). Если задача не про старую панель -
  не упоминать её в отчётах даже как «не проверялось».
- Нестандартный образ и смена egg - через админку ([ADM/server-startup](../adm/server-startup.md)), только с ок владельца.
- Образ в «Параметрах запуска» проверять переходом по меню, а не перезагрузкой ([OLDP/startup-params](startup-params.md#гочи-для-тестирования)).

## Пробелы

Полной карты разделов нет: консоль, файлы, бэкапы, расписания, совместный доступ в старой панели не описаны. Чем она отличается от UP по функциям - ❓.
