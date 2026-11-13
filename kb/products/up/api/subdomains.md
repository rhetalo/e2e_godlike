---
id: UP/api/subdomains
title: API - субдомены сервера и настройка доменов
type: api
product: UP
status: draft
updated: 2026-11-13
verified_on: 2026-11-13
tickets: [DEV-699]
features: [UP/ports-domains]
tests: []
sources:
  - kb/tickets/DEV-699.md
  - panel app/Http/Controllers/Api/Client/Servers/SubdomainController.php, Admin/SubDomainController.php, Listeners/Server/ServerEventSubscriber.php
---

# API - субдомены сервера и настройка доменов

> **В двух словах.** Какие домены клиент может выбрать для субдомена, решает таблица `domains` панели: у каждого домена
> список eggs и протокол SRV для каждого. Видимость блока на фронте решается отдельно, по игре
> ([DEV-699](../../../tickets/DEV-699.md)) - если egg забыт в `domains`, блок есть, а список пуст.

## `GET /api/v2/servers/{uuid}/subdomains`

Полный uuid. Авторизация владельца сервера (под Admin view тоже отвечает).

```json
{"success": true, "data": {"domains": [{"id": 1, "domain": "godlike.club"}, ...], "subdomain": null}}
```

- `domains` - домены из `domains`, где `egg_ids` содержит `server.egg_id` и `domains.free = server.free` ✅ (код + живой ответ).
- egg не в `domains` → `domains: []` ✅ (FTB 1871 / Quilt 1864 до 13-Nov).
- `subdomain` - текущий субдомен сервера или `null`. Формат непустого ❓.

## Таблица `domains` (панель, read-only SQL)

| Поле | Что |
|---|---|
| `domain` | `godlike.club` (1), `hardmc.pro` (2), `bestmc.fun` (3), `uaminecraft.pro` (4), `hardmode.pro` (5) |
| `egg_ids` | CSV eggs. На 13-Nov: Minecraft Java/Bedrock/прокси + модпак-eggs + Hytale 2068. Modpack-CurseForge 1800 / Modrinth 1812 / Technic 1816 - только в `godlike.club` |
| `protocol` | PHP serialize `{egg: "_minecraft" | null}` - сервис SRV |
| `protocol_types` | `{egg: "tcp" | "udp" | "none"}`; `none` → запись CNAME вместо SRV (Hytale) |
| `free` | у всех 5 = 0, поэтому Free-серверам список пустой (блок на фронте размыт) |

Правят в `panel.godlike.host/admin → Subdomains` (L2/админы). Сохранение формы **перезаписывает** протокол и тип всех eggs домена из полей формы;
убрать egg, на котором есть субдомен, нельзя.

## Поведение при смене egg

`ServerEventSubscriber` (строка ~139): если у сервера меняется egg, есть субдомен и нового egg нет в `egg_ids` его домена - субдомен удаляется ❓ (по коду, вживую не проверено).

## Записи `subdomains`

`server_id`, `domain_id`, `subdomain`, `port`, `record_type` (`SRV` / `CNAME`). На 13-Nov: Paper - почти всё SRV, NeoForge до правки - в основном CNAME.
