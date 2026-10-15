---
id: OLDP
title: OLDP - старая клиентская панель (panel.godlike.host)
type: product-overview
product: OLDP
status: draft
updated: 2026-10-15
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

| Раздел | Что | Источник |
|---|---|---|
| Страница сервера | `panel.godlike.host/server/<short>` | [DEV-486](../../tickets/DEV-486.md) |
| «Ядро & Версия» (Version Changer) | смена версии Minecraft: `POST /api/client/extensions/versionchanger/servers/{uuid}/install {build, delete_files}` → тост «Версия успешно изменена.» Это расширение Blueprint (versionchanger) | [DEV-486](../../tickets/DEV-486.md) |
| «Параметры запуска» | «Образ Docker» (Java); `GET /api/client/servers/:uuid/startup` отдаёт `meta.docker_image`. Режим «Образ Docker этого сервера был установлен администратором» (`isCustomImage`) | [DEV-513](../../tickets/DEV-513.md) |
| Язык интерфейса | в отчётах QA тексты русские («Изменение версии Minecraft», «Параметры запуска»); какие языки есть ещё - ❓ | [DEV-486](../../tickets/DEV-486.md), [DEV-513](../../tickets/DEV-513.md) |

## Как работает (под капотом)

- **Образы Java libxrender** (`yolks-javaNN-libxrender`) есть только в eggs 2 (PC-Forge), 121 (PC-Fabric), 1863 (PC-NeoForge);
  в egg 3 (PC-Paper) их нет. Около 330 серверов на таких образах. Источник: [DEV-486](../../tickets/DEV-486.md).
- **Выбор Java при смене версии** - общий с UP `JavaImageMatcher::pick()`: сохраняет libxrender, если сервер на нём был
  ([DEV-512](../../tickets/DEV-512.md), [UP/versions](../up/versions.md)).
- **Фиксы делают в core-коде панели,** а не в расширении versionchanger: патчи расширения теряются при `blueprint -upgrade` ([DEV-513](../../tickets/DEV-513.md)).

## Гочи для тестирования

- **Скоуп:** проверять OLDP только если задача про неё (memory panel-scope-new-panel).
- Нестандартный образ ставится через админку ([ADM](../adm/README.md)) - только с ок владельца.
- «Параметры запуска» раньше показывали старый образ до F5 - проверять переходом по меню, а не перезагрузкой ([DEV-513](../../tickets/DEV-513.md)).

## Пробелы

Полной карты разделов нет: консоль, файлы, бэкапы, расписания, совместный доступ в старой панели не описаны. Чем она отличается от UP по функциям - ❓.
