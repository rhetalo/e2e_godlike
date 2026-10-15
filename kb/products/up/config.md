---
id: UP/config
title: Config - server.properties и блок Docker/Java
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-10-09        # Docker image в Config как путь смены Java (DEV-485); форма - recon 04-Jun
tickets: [DEV-472, DEV-485, DEV-513]
flags: []
tests: [tests/game/panel/config.spec.ts, tests/game/panel/security.spec.ts]
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §5c, §5j (recon 04..09-Jun-2026)
  - kb/tickets/DEV-472.md, DEV-485.md, DEV-513.md
  - kb/products/up/README.md (раздел Startup / Docker image, пробел 1)
---

# Config - server.properties и блок Docker/Java

> **В двух словах.** Вкладка Config - это форма поверх файла `server.properties` Minecraft: название,
> сложность, PvP, слоты, порт и прочее. Кнопки Save нет: каждое поле сохраняется само. Внизу блок
> Docker/Java, где клиент выбирает образ Java и включает автодетект ядра и версии.

## Где в интерфейсе

- `/server/{uuid}/config`, доступна в любом статусе сервера. KB §5c.
- Каждое свойство - строка `.server__config-switch`: имя (`motd`, `difficulty`, `max-players`, `level-name`, `server-port`, `pvp` ...),
  описание и контрол (поле, select или switch). Кнопки **Reset**, кнопки Save нет.
- Ключи из recon: gamemode, difficulty, level-name, level-seed, max-players, online-mode, white-list, spawn-protection, allow-flight,
  pvp, hardcore, motd, view-distance, simulation-distance, server-port, server-ip, enable-rcon, enable-query, op-permission-level.
- **Блок Docker/Java:** версия, `server.jar` и JVM-флаги Aikar (последние два readonly), combobox **Docker Image**, тоггл
  **«Enable Auto-detect Loader & Version»** (`minecraft_autodetect_enabled`). Источник: KB §5c, [DEV-472](../../tickets/DEV-472.md).

## Как работает (под капотом)

- **Автосейв:** PATCH при потере фокуса поля. Персист проверяется перезагрузкой.
- **Смена Docker Image** = смена Java сервера. Если сервер работает, Restart кнопкой на слишком старой Java гейт отклоняет 409
  и сервер продолжает работать ([DEV-485/F1](../../tickets/DEV-485.md#находки), [UP/java-detection](java-detection.md)).
- **Автодетект выключен** → старт под гейтом отвечает `skipped: server_toggle` ([DEV-485](../../tickets/DEV-485.md)).
- **Startup / Docker image в UP:** роут `/server/{id}/startup` рендерит пусто, смена образа идёт через этот combobox.
  Как это устроено в старой панели - [DEV-513](../../tickets/DEV-513.md) (OLDP). Других способов в UP не описано ❓
  ([обзор UP, пробел 1](README.md#пробелы)).

## Правила и граничные случаи

1. **`motd` хранит payload дословно как текст:** XSS / SQLi в значении не исполняются (SEC-004). Рендер motd в других местах не проверялся.
2. **Поле Config (motd) могут менять все роли**, включая Member ([UP/sharing-roles](sharing-roles.md#права-по-ролям-ui)).
3. Для не-Minecraft игр свои настройки (Palworld Settings, [TASK-palworld-settings](../../tickets/TASK-palworld-settings.md)).

## Гочи для тестирования

- **id инпутов динамические** (`input-v-131`) и меняются между загрузками. Якорь - имя свойства в тексте строки. KB §5c.
- **`networkidle` не наступает** - ждать ограниченно, затем reload и чтение значения.
- **В тестах меняем только `motd`** с обязательным откатом; исходное значение восстанавливается и после прогона, оставившего payload
  (regex `onerror=alert|DROP TABLE` в `security.spec.ts`).
- Смена Docker Image - реальная смена Java сервера, только на своих тест-серверах ([srv:ca326e28](../../registry/test-servers.md#ca326e28)).

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Ключевые свойства рендерятся | `config.spec.ts` (CFG-002) | ✅ |
| motd автосейв + откат | `config.spec.ts` (CFG-001) | ✅ |
| XSS / SQLi в motd | `security.spec.ts` (SEC-004) | ✅ |
| Docker Image, автодетект | только ручной QA [DEV-472](../../tickets/DEV-472.md), [DEV-485](../../tickets/DEV-485.md) | ❌ авто нет |

## История

| Дата | Тикет | Что |
|---|---|---|
| 04-Jun-2026 | - | Recon формы, KB §5c |
| 09-Jun-2026 | - | SEC-004: XSS / SQLi в motd хранятся как текст |
| 02..08-Oct-2026 | [DEV-472](../../tickets/DEV-472.md) | Автодетект, попап Java ведёт в Config |
| 09-Oct-2026 | [DEV-485](../../tickets/DEV-485.md) | Restart после смены образа под гейтом Java |
