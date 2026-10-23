---
id: KB-REG-FLAGS
title: Фичефлаги и эксперименты
type: registry
status: draft
updated: 2026-10-15
verified_on: -
sources:
  - memory: dev485-java-start-gate, dev515-mods-loader-gating, cf-modrinth-source-swap, prod-134-world-backup, cancel-retention-dev401, mc-extensions-refactor-epic, dev492-post-install-mod-scan, dev477-node-resource-limits
---

# Фичефлаги и эксперименты

> **В двух словах.** Многие новые фичи панели включены не всем, а через флаг. Главная ловушка:
> флаг считается **по владельцу сервера**, а не по тому, кто смотрит. Поэтому если открыть
> чужой сервер с флагом, фичу видно, а свой сервер без флага её не покажет. Список текущих
> флагов отдаёт `GET /api/v2/features`.

## Pennant-флаги панели (UP / API v2)

### java-start-gate
- **Что:** бэкенд-гейт старта сервера при несовместимой Java ([DEV-485](../tickets/DEV-485.md)).
- **Состояние:** включается на конкретный сервер. Включён на [srv:ca326e28](test-servers.md#ca326e28).

### java-mismatch-fixer
- **Что:** старый реактивный попап «смените Java».
- **Состояние:** включён глобально.

### extension-compatibility
- **Что:** `extension_capabilities`, заглушки по ядру и префилл фильтров модов.
- **Тикеты:** [DEV-515](../tickets/DEV-515.md), [DEV-529](../tickets/DEV-529.md), [DEV-534](../tickets/DEV-534.md).
- **Состояние:** включён у 3 пользователей, считается по владельцу. Ждёт раскатки или снятия флага разработчиком.

### world-backup
- **Что:** World Backup ([DEV-418](../tickets/DEV-418.md)).
- **Состояние:** включается на аккаунт (после включения нужен `pennant:purge`). Включён на [acc:admin](test-accounts.md#admin) с 11-Aug.

### cancellation-retention-steps
- **Что:** экраны удержания в cancel-модуле ([DEV-401](../tickets/DEV-401.md)).
- **Состояние:** только [acc:admin](test-accounts.md#admin), считается по владельцу сервера.

### modpack-catalog-v2
- **Что:** каталог модпаков v2 (Inc 1d эпика MC extensions).
- **Состояние:** только для staff.

### affiliate-banner
❓ Назначение не описано, владелец тоже не знает (15-Oct). Спросить у разработки. Включён (по `/api/v2/features`).

### hytale-world
❓ Назначение не описано, владелец тоже не знает (15-Oct). Спросить у разработки. Включён.

### inactivity-chat
❓ Назначение не описано, владелец тоже не знает (15-Oct). Спросить у разработки. Включён.

### extensions-onboarding
❓ Назначение не описано, владелец тоже не знает (15-Oct). Спросить у разработки. Включён.

### admin-panel
❓ Назначение не описано, владелец тоже не знает (15-Oct). Спросить у разработки. Включён.

## Не флаги, но работают как переключатели

### is-listed
- **Что:** колонка `modpacks_v2.is_listed`, видимость модпака в клиентском каталоге ([DEV-532](../tickets/DEV-532.md)).
- **Где:** отдельно для каждого модпака, правится в ADM.

### cf-modrinth-source-switch
- **Что:** переключатель источника каталога на прямые API CF/Modrinth ([DEV-405](../tickets/DEV-405.md)).
- **Где:** меняется через SSH, имени нет. Включён 30-Sep.

## Env-переменные бэкенда и фронта

### GODLIKE_NODE_RESOURCE_LIMITS_ENABLED
Лимиты ресурсов нод ([DEV-477](../tickets/DEV-477.md)). Значение ❓.

### MOD_SCAN_BACKFILL
`MOD_SCAN_BACKFILL_*` - лимиты дочитки модов ([DEV-492](../tickets/DEV-492.md)): 200 файлов / 32 МБ / 256 МБ.

### VITE_MANAGED_MODPACK_URL
Ссылка на managed-модпак в панели ([DEV-459](../tickets/DEV-459.md)). Исправлено в !532.

### Env бэкапов и установки модпака
Подробно: [API - backups](../products/up/api/backups.md#модель-квоты-после-dev-484), [DEV-452](../tickets/DEV-452.md), [DEV-484](../tickets/DEV-484.md).

| Переменная | Значение | Что делает |
|---|---|---|
| `BACKUP_THROTTLE_LIMIT` / `BACKUP_THROTTLE_PERIOD` | прод `1` / `3600`, дефолт `config/backups.php` `2` / `600` | лимит частоты бэкапов, читают оба счётчика (`backups` и `backup_instances`) |
| `GODLIKE_PREINSTALL_BACKUP_EXEMPT_FROM_THROTTLE` | по умолчанию `true`, значение на проде ❓ | включает проверку исключения пре-инсталл бэкапа из лимита частоты. Строка `is_system_initiated=true` ставится всегда |
| `WORKFLOW_MODPACK_INSTALL_ENABLED` | по умолчанию `false`, на проде workflow-путь включён | выбирает workflow-путь установки модпака; от него зависят три причины стадии установки |

## Флаги автотестов (наш репо)

| Переменная | Что включает |
|---|---|
| `RUN_THROTTLING_TEST` | Тест вебхука throttling |
| `RUN_PLUGIN_INSTALL` | Тест реальной установки плагина |
| `RUN_LOCAL_ONLY` | PayPal popup-тест (только локально) |

## A/B-эксперименты (Amplitude)

### cancel-new-inpanel
A/B cancel-модуля: варианты `old_with_hytale` и `new_with_freez`.

### flash-sale
A/B flash-sale на витрине. В тестах фиксируется через `pinAmplitudeExperiments`.

## Настройки аккаунта

### restart-confirmation
`user.restart_confirmation` - подтверждение Restart в панели.
