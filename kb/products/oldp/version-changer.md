---
id: OLDP/version-changer
title: Смена версии Minecraft в старой панели (Version Changer) и выбор Java
type: feature
product: OLDP
status: draft
updated: 2026-10-23
verified_on: 2026-10-12        # DEV-513, попутно changer + libxrender
tickets: [DEV-486, DEV-512, DEV-513]
flags: []
tests: []                      # автотестов нет
sources:
  - test-docs/ultra.panel/DEV-486/version-changer-libxrender-REPORT.md (25-Sep-2026)
  - kb/tickets/DEV-486.md, DEV-512.md, DEV-513.md
  - memory: dev486-version-changer-libxrender, dev513-startup-stale-image
---

# Смена версии Minecraft в старой панели (Version Changer)

> **В двух словах.** В старой панели клиент меняет версию Minecraft в разделе «Ядро & Версия»: выбирает ядро и
> версию, жмёт Install и получает тост «Версия успешно изменена.» Заодно панель сама подбирает Java под новую
> версию: если текущая подходит - не трогает, если нет - ставит нужную и сохраняет вариант libxrender, если он
> был. Логика выбора Java общая с новой панелью.

## Где в интерфейсе

- Страница сервера `panel.godlike.host/server/<short>` → раздел **«Ядро & Версия»** → экран «Изменение версии Minecraft».
- Выбор ядра (например Fabric) → карточка версии (заголовок вида «1.21.1 RELEASE») → модалка **Install** с переключателем Wipe.
- Успех: тост **«Версия успешно изменена.»**, строка «Installed Minecraft Version: 1.21.1».
- Какая Java стоит, видно в [«Параметрах запуска»](startup-params.md) → «Образ Docker».

## Как работает (под капотом)

1. Install шлёт `POST /api/client/extensions/versionchanger/servers/{uuid}/install` с телом `{build, delete_files}`
   (`delete_files` = Wipe). Ответ при успехе `{"success":true}`.
2. Changer - расширение Blueprint `versionchanger`, но выбор Java - в core-коде панели: `JavaImageMatcher::pick()`.
   Он же используется в новом changer [UP/versions](../up/versions.md), при установке ядра и в `ApplyRequiredJavaImageAction` ([DEV-512](../../tickets/DEV-512.md)).
3. Номер Java читается из имени образа, в том числе `yolks-javaNN-libxrender` (до фикса [DEV-486](../../tickets/DEV-486.md) читался как 0 → отказ в смене).
4. Если текущая Java подходит под новую версию - образ не меняется. Если не подходит - берётся образ нужной Java из списка
   `docker_images` egg. С [DEV-512](../../tickets/DEV-512.md): если текущий образ `-libxrender` и в egg есть libxrender-вариант нужной Java,
   берётся он; обычный сервер остаётся на обычной Java ([panel!1655](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1655)).
5. Итоговый образ пишется в `servers.image`; клиенту он виден через `meta.docker_image` в [startup-params](startup-params.md).

### Образы libxrender по egg

| Egg | Есть `yolks-javaNN-libxrender` | Как образ показан в «Параметрах запуска» |
|---|---|---|
| 2 PC-Forge | да | выбирается в списке |
| 121 PC-Fabric | да | выбирается в списке, например «Java 17 (libxrender)» |
| 1863 PC-NeoForge | да | выбирается в списке |
| 3 PC-Paper | нет | «Образ Docker этого сервера был установлен администратором» |

Масштаб на проде 25-Sep: около 330 серверов на libxrender (java25 157, java17 126, java21 47), из них 17 на PC-Paper.

## Правила и граничные случаи

1. **Порядок образов в egg решает, какой выберется** внутри одной Java. Пример: в egg 3 два образа Java 17, первым стоит
   `ghcr.io/ptero-eggs/yolks:java_17` («Java 17(Legacy)»), поэтому changer берёт его, а не harbor-прокси
   ([DEV-486](../../tickets/DEV-486.md#находки)/S3, открыт, лечится порядком образов в egg без кода).
2. **На egg 3 libxrender снимался даже при подходящей Java** (DEV-486/S4) - вынесено в [DEV-512](../../tickets/DEV-512.md), исправлено.
3. Сервер после смены версии стартует (проверено: `Done (2.176s)`, статус «Работает»).

## Гочи для тестирования

- **Скоуп:** старую панель проверяем только когда задача про неё ([OLDP](README.md#гочи-для-тестирования)).
- **Фиксы делают в core-коде панели,** а не в расширении: патчи расширения теряются при `blueprint -upgrade` ([DEV-513](../../tickets/DEV-513.md)).
- **Итоговый образ сверять не по экрану,** а по `servers.image` (SQL) или `meta.docker_image` из `GET /api/client/servers/:uuid/startup`.
- **Скрипт + SQL пропускают баги отображения:** зависший образ в «Параметрах запуска» нашёлся только в ручном прогоне по клику (DEV-486 U3-U5).
- Поставить серверу libxrender-образ на egg без такого образа или сменить egg можно только через админку
  ([ADM/server-startup](../adm/server-startup.md)) и только с ок владельца.
- Тестовый сервер: [srv:ca326e28](../../registry/test-servers.md#ca326e28) (id 771938, egg 121).

## Что проверять (минимальный регресс)

| Сценарий | Ожидание |
|---|---|
| `java17-libxrender`, версия, которой нужна та же Java 17 | образ не меняется |
| `java17-libxrender` → версия на Java 21 (egg 121) | `java21-libxrender` |
| Обычная Java → версия на другой Java | обычная Java нужной версии, без libxrender |
| После смены перейти в «Параметры запуска» по меню | виден новый образ без F5 ([startup-params](startup-params.md)) |
| Старт сервера после смены | сервер стартует |

## Покрытие

- **Автотестов нет.**
- Ручной QA: [DEV-486](../../tickets/DEV-486.md) S1-S7 (SQL-сверка) и U1-U5 (по клику), отчёт
  [version-changer-libxrender-REPORT.md](../../../test-docs/ultra.panel/DEV-486/version-changer-libxrender-REPORT.md); [DEV-513](../../tickets/DEV-513.md) T2-T4.
- Не гоняли отдельно eggs 2 и 1863 и образ `ghcr.io/stereotype95/yolks-java17-xrender` (1 сервер).

## История

| Дата | Тикет | Что |
|---|---|---|
| 25-Sep-2026 | [DEV-486](../../tickets/DEV-486.md) | Java из имени libxrender-образа читается верно; найдено: libxrender теряется, образ в «Параметрах запуска» устаревает |
| 02-Oct-2026 | [DEV-512](../../tickets/DEV-512.md) | Сохранение libxrender при смене Java (во всех 4 местах выбора образа) |
| 07-Oct-2026 | [DEV-512](../../tickets/DEV-512.md) | panel!1655: обычный сервер больше не получает libxrender на Java 17 |
| 12-Oct-2026 | [DEV-513](../../tickets/DEV-513.md) | Попутно в старой панели: `java17-libxrender` → `java21-libxrender` ✅ |
