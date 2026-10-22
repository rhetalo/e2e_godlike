---
id: UP/java-detection
title: Java detection и гейт старта
type: feature
product: UP
status: draft
updated: 2026-10-18
verified_on: 2026-10-09        # последняя живая сверка - добивка DEV-485
tickets: [DEV-472, DEV-485, DEV-512]
flags: [java-start-gate, java-mismatch-fixer, restart-confirmation]
tests: [tests/game/panel/mods.spec.ts]   # только контракт API (TC-GP-MOD-005); поведение - ручной QA
sources:
  - kb/tickets/DEV-472.md, DEV-485.md
  - test-docs/ultra.panel/DEV-472/java-detection-matrix-REPORT.md
  - test-docs/ultra.panel/DEV-485/java-start-gate-REPORT.md
  - memory: dev472-485-java-recheck-handoff, dev485-java-start-gate
---

# Java detection и гейт старта

> **В двух словах.** Каждой версии Minecraft нужна своя Java. Панель сама считает, какая Java нужна
> серверу (`required_java`), и если стоит слишком старая - не даёт серверу стартовать и предлагает
> правильный образ в окне. Работают два механизма: старый реактивный попап после краша
> ([DEV-472](../../tickets/DEV-472.md)) и новый гейт на бэкенде до старта ([DEV-485](../../tickets/DEV-485.md)).
> Слишком **новая** Java не блокируется.

## Где в интерфейсе

- **Окно «Java Version Error» / «needs Java N»** - после краша из-за Java (старый механизм) или при отказе
  гейта на Start. В окне предвыбрана рекомендованная Java (plain-образ, не libxrender), запись по **Save**,
  **Close** ничего не меняет. Источник: [DEV-472](../../tickets/DEV-472.md), [DEV-485](../../tickets/DEV-485.md).
- **Кнопки Start / Restart** - при отказе гейта сервер не стартует, клиент видит окно или тост.
- **Config → Docker/Java** (Docker Image combobox) - где клиент меняет образ Java (см. раздел Config в
  [обзоре UP](README.md#карта-разделов)).
- **Config → «Enable Auto-detect Loader & Version»** (`minecraft_autodetect_enabled`) - тоггл автодетекта.

## Как работает (под капотом)

**1. Требование к Java.** `required_java` считается из колонок версии (`columns`) или из каталога модпака
(`modpack_catalog`), выигрывает более свежий источник (миграция `2026_10_02 add_minecraft_core_changed_at`).
Запись модпака в `server_modpacks` переживает Wipe и смену версии, снимается Uninstall или вайпом с 26.x.
Источник: [DEV-472](../../tickets/DEV-472.md).

**2. Префлайт.** `GET .../minecraft/server-jar/status` → `java_preflight {verdict, recommended, min, max}`;
после фикса заполняется только при `too_old`. Источник: [DEV-472](../../tickets/DEV-472.md).

**3. Старый попап** ([flag:java-mismatch-fixer](../../registry/flags.md#java-mismatch-fixer), включён глобально).
Реактивный: фронт парсит лог краша → `POST minecraft/java-error` → окно. Показывается **только** у того, у кого
открыта вкладка, и только при фронтовом Start. Источник: [DEV-472](../../tickets/DEV-472.md).

**4. Гейт старта** ([flag:java-start-gate](../../registry/flags.md#java-start-gate), **per-server**). Бэкенд проверяет
Java до старта и отказывает на всех путях:

| Путь | Ответ при слишком старой Java |
|---|---|
| Start в новой панели: `POST minecraft/server-jar/ensure` (202 `checking`, старт в фоне) | полинг `server-jar/status` → `status=failed`, `error=java_too_old` + окно |
| `POST /api/v2/servers/{uuid}/power` start / restart | 409 `{"error":"java_too_old","required_java":N,"current_java":M}` |
| Планировщик (`POST tasks/run`, power start) | сервер не стартует |
| Restart кнопкой работающего сервера со сменённым образом | 409, сервер продолжает работать ([new-panel!548](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/548)) |
| Принятие EULA (идёт через `POST /power restart`) | тоже под гейтом |
| Автодетект выключен | `ensure` 202 `{"status":"failed","error":"java_too_old","skipped":"server_toggle"}` |

Источник: [DEV-485](../../tickets/DEV-485.md).

**Почему флаг per-server.** Сначала флаг был per-user, но фоновая задача `ensure` идёт без пользователя и читала
`__laravel_null=false` - гейт не срабатывал. Переделан на per-server в
[panel!1640](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1640). На 07-Oct включён только на
[srv:ca326e28](../../registry/test-servers.md#ca326e28), глобально false. Теневой режим (флаг выключен) пишет только
в файловый лог Laravel.

**Уведомления.** Только email и только для фоновых путей (не чаще 1 в час); `user_notifications` не пишутся by design.

## Правила и граничные случаи

1. **Блокируется только «слишком старая» Java.** Нижняя граница надёжна, верхняя эвристична и сломала бы Forge 1.16-.
   «Слишком новая» Java не открывает попап (фикс [DEV-472/F1](../../tickets/DEV-472.md#находки)).
2. **`kill` не блокируется.** Restart на выключенном сервере = start и гейтится безусловно.
3. **Для 26.x требование может не определяться** (`null`, [DEV-472/F5](../../tickets/DEV-472.md#находки)) - «проблема данных», не блокер.
4. **После установки модпака** панель обновляет версию MC / loader, установщик ставит подходящую Java
   ([DEV-472/F6, F7](../../tickets/DEV-472.md#находки)).
5. **libxrender** сохраняется только тем, кто уже был на нём ([DEV-512](../../tickets/DEV-512.md),
   [DEV-472/R1](../../tickets/DEV-472.md#находки)).
6. **Рестарт из попапа** ждёт power-lock вместо ошибки «another power action» ([DEV-472/F9](../../tickets/DEV-472.md#находки)).
7. **DoD «строка в консоли»** заменён тостом / окном / 409 - ❓ нужно согласие продукта.
8. **Restart без подтверждения** зависит от настройки аккаунта
   [restart-confirmation](../../registry/flags.md#restart-confirmation) (`user.restart_confirmation`); по коду тот же путь, отдельно не проверялось.

## Гочи для тестирования

- **Прямой `POST /power` ≠ кнопка Start.** Кнопка идёт через `ensure` и отказывает через полинг статуса.
  Проверять оба пути. Источник: [обзор UP, гоча 12](README.md#сквозные-гочи).
- **Вывод «гейт не работает» 06-Oct был ошибочным:** бэк [panel!1640](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1640) ещё не был выкачен. Перед вердиктом
  убедиться, что MR задеплоен. Источник: [DEV-485](../../tickets/DEV-485.md#итог-qa).
- **Краш на Java 8 быстрее опроса `/resources`** - доказывать по строкам консоли; рестарт Fabric - по сбросу uptime.
- Цепочка модалок при установке пака: needs more RAM → Install Anyway → Save Your World First? → Continue Without
  Backup → Some mods were disabled.
- Флаг гейта включён только на [srv:ca326e28](../../registry/test-servers.md#ca326e28); сервер без гейта -
  [srv:0cf8346f](../../registry/test-servers.md#0cf8346f).

## Покрытие

- **Контракт - автотест** `mods.spec.ts` (TC-GP-MOD-005): zod-схема `GET minecraft/server-jar/status` (`status`, `error`,
  `java_preflight` - объект или null; на проде 16-Oct null) и `required_java` в `minecraft/version`. Сам детект и гейт - только руками.
- Ручные матрицы: [java-detection-matrix-REPORT.md](../../../test-docs/ultra.panel/DEV-472/java-detection-matrix-REPORT.md)
  (C3-C10, модпаки M1/M2, ретесты 06-09 Oct) и [java-start-gate-REPORT.md](../../../test-docs/ultra.panel/DEV-485/java-start-gate-REPORT.md) (G0-G9).
- Не покрыто: лаунчер (решение владельца 02-Oct), не-Minecraft (Hytale), письмо при блоке фонового старта
  ([DEV-485/F2](../../tickets/DEV-485.md#находки)).

## История

| Дата | Тикет | Что |
|---|---|---|
| 25-Sep-2026 | [DEV-485](../../tickets/DEV-485.md) | G0 baseline: без флага сервер стартует и падает, попап только у открытой вкладки |
| 29-Sep-2026 | [DEV-485](../../tickets/DEV-485.md) | Не принято: гейт только на прямом `/power start` |
| 02..08-Oct-2026 | [DEV-472](../../tickets/DEV-472.md) | Матрица детекта: 9 находок, исправлены ([new-panel!542](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/542), [panel!1655](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1655)), PASS 08-Oct |
| 07-Oct-2026 | [DEV-485](../../tickets/DEV-485.md) | Флаг per-server ([panel!1640](https://git.godlike.ovh/panel/panel-godlike-host/-/merge_requests/1640) + [new-panel!535](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/535)), гейт на всех путях |
| 02..07-Oct-2026 | [DEV-512](../../tickets/DEV-512.md) | Смена версии сохраняет libxrender |
| 09-Oct-2026 | [DEV-485](../../tickets/DEV-485.md) | Restart кнопкой под гейтом ([new-panel!548](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/548)), PASS-with-issues |

Открыто: [DEV-472/O1](../../tickets/DEV-472.md#находки) (плавающее «Starting...» после краша, Low),
[DEV-485/F2](../../tickets/DEV-485.md#находки) (письмо не проверено), решение продукта по DoD «строка в консоли».
