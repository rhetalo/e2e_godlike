---
id: UP/api/setup-onboarding
title: API - setup-onboarding (онбординг первого запуска)
type: api
product: UP
status: draft
updated: 2026-11-12
verified_on: 2026-11-12
tickets: [DEV-651]
features: [UP/modpack-catalog, UP/server-overview]
sources:
  - MR panel!1790, panel!1799
  - QA DEV-651 12-Nov (network в браузере, prod)
---

# API - setup-onboarding

> **В двух словах.** Попап первого запуска спрашивает у бэкенда, показывать ли его, отмечает показ и шлёт
> события аналитики. Админ включает его принудительно отдельным эндпоинтом. Подробности фичи: [DEV-651](../../../tickets/DEV-651.md).

Знаки: ✅ живьём, 📖 из MR, ❓ нет в источниках. Легенда: [README](README.md#легенда).

## Эндпоинты

| Метод | Путь | Что делает | Ответ |
|---|---|---|---|
| GET | `/servers/{uuid}/setup-onboarding` | состояние: `eligible`, `needs_setup`, `should_auto_show`, `ram_mb` | 200 ✅ |
| POST | `/servers/{uuid}/setup-onboarding/shown` | отметить показ (`shown_at`) | 204 ✅ |
| POST | `/servers/{uuid}/setup-onboarding/events` | событие аналитики (`event`, `option`, `trigger`, ...), id сервера из URL | 202 ✅; не-владелец 403, throttle 60/мин 📖 |
| GET / PUT | `/admin/setup-onboarding/{uuid}` | карточка админки, Force-enable | ✅ через UI админки |

## События (DEV-651)
`onboarding_shown{trigger:auto|button_overview}`, `option_selected`, `show_all_clicked`, `upgrade_plan_clicked{modpack_id}`,
`install_started`, `install_completed`, `install_failed{stage,reason}` (не видели), `launcher_download_clicked`,
`onboarding_skipped{step,reason}`. `onboarding_shown` и `launcher_download_clicked` уходят без `option` (OBS-2).

## Связанное
- `POST /servers/{uuid}/minecraft/modpacks` с `setup_onboarding:true` - обход проверки ядра: [modpacks](modpacks.md).
- Каталог с `ram_aware=1&max_ram_mb=<RAM>` отдаёт `recommended_ram_mb`, `meta.over_ram_count`: [UP/modpack-catalog](../modpack-catalog.md).
