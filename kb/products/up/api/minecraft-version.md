---
id: UP/api/minecraft-version
title: API - minecraft/version (ядро сервера и extension_capabilities)
type: api
product: UP
status: draft
updated: 2026-10-19
verified_on: 2026-10-19
tickets: [DEV-515, DEV-529, DEV-549]
features: [UP/mods-loader-gating, UP/extensions-catalog, UP/versions]
sources:
  - kb/tickets/DEV-515.md, DEV-549.md
  - panel!1670 (дифф ServerExtensionCapabilitiesResolver)
  - живые ответы prod 19-Oct-2026 (QA DEV-549)
---

# API - minecraft/version

> **В двух словах.** Один GET отдаёт, какое ядро и версия Minecraft стоят на сервере, и блок
> `extension_capabilities` - что на этом ядре можно ставить. Фронт строит по нему заглушки, фильтры каталога,
> туториал и состояние кнопки «Upload custom modpack». Блок есть только у владельца с флагом `extension-compatibility`.

Знаки: ✅ живьём, 🧪 подмена ответа в браузере, 📖 из тикета или MR, ❓ нет в источниках. Легенда: [README](README.md#легенда).

## Эндпоинт

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/api/v2/servers/{uuid}/minecraft/version` | ядро, версия, билд, Java и `extension_capabilities` |

Нужен полный UUID: по короткому (`546bc52e`) приходит 400 «No query results for model» ✅.

## Ответ

```json
{"success": true, "data": {
  "minecraft_version": "1.20.1", "minecraft_type": "FABRIC", "minecraft_build": "292499",
  "egg": "PC-Paper", "required_java": {"min": 17, "max": null, "recommended": 17, "source": "columns"},
  "extension_capabilities": {"supports_mods": true, "supports_plugins": false, "supports_modpacks": true,
    "mod_loader": "fabric", "game_version": "1.20.1", "enforced": true,
    "plugin_loader": null, "plugin_providers": [], "plugin_platforms": []}}}
```

- `minecraft_build` - `remote_id` из таблицы `mcjars_builds`, а не имя билда: `292499` = Fabric `0.19.5`,
  `239622` = Arclight 1.21 `1.0.1-8ec9529-fabric` ✅.
- `egg` - исходный egg сервера, после смены ядра не меняется (Fabric на egg `PC-Paper`) ✅.
- Если версию не удалось прочитать, приходит `minecraft_type: null` и `message: "Failed fetch version. Try again later."` ✅.

## extension_capabilities по ядрам (prod, 19-Oct-2026) ✅

| Ядро | mods | plugins | modpacks | mod_loader | plugin_loader | plugin_providers | enforced |
|---|---|---|---|---|---|---|---|
| Forge 1.19.3 / 1.20.1 / 26.3 | true | false | true | `forge` | `null` | `[]` | true |
| Fabric 1.20.1 | true | false | true | `fabric` | `null` | `[]` | true |
| NeoForge 1.21.1 | true | false | true | `neoforge` | `null` | `[]` | true |
| Paper 26.2 / 1.20.1 | false | true | false | `null` | `paper` | curseforge, modrinth, hangar, spigotmc, polymart | true |
| Purpur 26.2 | false | true | false | `null` | `purpur` | те же 5 | true |
| Arclight 1.20.1 forge | true | true | true | `forge` | `spigot` | curseforge, modrinth, spigotmc, polymart | true |
| Ядро не найдено (`minecraft_type: null`) | true | true | true | `null` | `null` | `[]` | false |
| Владелец без флага | `extension_capabilities: null` | | | | | | |

- `plugin_platforms` не пустой только у Paper-подобных (Purpur: `purpur, paper, spigot, bukkit`).
- До [DEV-549](../../../tickets/DEV-549.md) у чистых мод-лоадеров было `plugin_loader: "spigot"` и непустые провайдеры 📖.
- По коду `plugin_loader` берётся из ядра, только если плагины разрешены; `enforced` = ядро определено
  (`DETECTED`) и включён `GODLIKE_MINECRAFT_EXTENSION_COMPATIBILITY_ENFORCED` 📖 (panel!1670).

## Связанные эндпоинты

- `GET .../minecraft/modpack-setup/quote` - тарифы услуги Custom Modpack Setup (DEV-527). 200 с Lite / Pro и на Paper,
  и на Vanilla; 404 «The requested resource does not exist», если у сервера нет `external_id` (не из биллинга) ✅.
- Каталог: `GET .../minecraft/plugins?provider=&loader=&mc_version=` - при `plugin_loader: null` фронт шлёт пустой `loader` ✅.
