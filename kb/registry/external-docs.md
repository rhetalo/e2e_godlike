---
id: KB-REG-EXTERNAL-DOCS
title: Внешняя документация (Confluence)
type: registry
status: draft
updated: 2026-10-15
verified_on: 2026-10-15        # список страниц снят через Atlassian MCP (только чтение)
sources:
  - Atlassian MCP: listConfluenceSpaces, listConfluenceContent, searchConfluence (15-Oct-2026)
---

# Внешняя документация (Confluence)

> **В двух словах.** В компании уже есть Confluence (`antihost.atlassian.net/wiki`), и в нём живут
> инструкции поддержки и DevOps по godlike. KB их не копирует, а ссылается: факт живёт там, где его
> поддерживают. Здесь - карта этих пространств и страниц, полезных QA. У нас доступ только на чтение.

## Пространства

| Ключ | Название | Что внутри | Полезно QA |
|---|---|---|---|
| `DevOps` | DevOps | ~100 страниц: ДЦ и стойки, ноды Wings, VirtFusion, бэкапы, мониторинг, stage, еженедельные ревью инцидентов, runbooks | ✅ много |
| `ANTIHOST` | Antihost Team | ~20 инструкций поддержки по игровым серверам: яйца, Docker-образы, порты, логи, FiveM, ARK, Dedicated | ✅ |
| `DEV`, `D` | DEV (два пространства) | только шаблонная стартовая страница «Welcome to your new space!» (созданы 06-May и 15-May-2026, не заполнялись; сверено 15-Oct) | - |
| `L2` | L2 (база знаний) | только домашняя страница | - |
| `MARKETING`, `AD`, `AAP` | Marketing, Analytics & Design, AI Analytics Platform | только домашние страницы | - |

Ссылки ниже: `https://antihost.atlassian.net/wiki/spaces/<ключ>/pages/<id>`.

## DevOps - что пригодится QA

| Страница | Зачем QA | Связь в KB |
|---|---|---|
| [Як розгорнути Stage-оточення Godlike з нуля](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/91553798) | как устроен stage | [env:stage](environments.md#stage) |
| [STAGE Observability](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/190152707) | логи и метрики stage | [env:stage](environments.md#stage) |
| [Current Infrastructure Overview](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/176848897) | общая схема инфраструктуры | - |
| [Infrastructure Inventory 2026](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/42631169) | список ДЦ и машин | - |
| [Wing Server Naming Convention and Assignment Guidelines](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/10616836) | что значат имена нод `srvN`, `wingNNNN` | [UP](../products/up/README.md#как-устроено) |
| [Node Hardware Reference: CPU and RAM Limits by Location and Type](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/131694593) | лимиты нод по локациям | [DEV-477](../tickets/DEV-477.md) |
| [Capacity Forecast - Node Resources (30d)](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/39124993) | загрузка нод | [DEV-477](../tickets/DEV-477.md) |
| [Wings Setup](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/131203074), [Runbook - Wings](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/169639937) | как работают и чинятся ноды игровой панели | [UP](../products/up/README.md) |
| [Wing Backup Restore Architecture and Script Overview](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/62291969), [Backups infrastructure](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/46989317) | хранение и восстановление бэкапов | [UP/backups](../products/up/backups.md), [UP/world-backup](../products/up/world-backup.md) |
| [Manual Backup for support team](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/10846211) | ручной бэкап поддержкой | [UP/backups](../products/up/backups.md) |
| [VirtFusion Overview](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/141164545) | устройство VPS-платформы | [VPS](../products/vps/README.md) |
| [VirtFusion Backup System Overview and Configuration Guide](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/126877697) | бэкапы VPS | [VPS](../products/vps/README.md) |
| [VirtFusion Paused VM RAM wipe](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/75759622) | что происходит с VPS на паузе | [VPS](../products/vps/README.md) |
| [PowerDNS Infrastructure Overview](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/103251969) | DNS (поддомены серверов) | [UP/ports-domains](../products/up/ports-domains.md) |
| [Google SSO для nginx через oauth2-proxy](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/86179841) | почему stage пускает только через Google | [env:stage](environments.md#stage) |
| [DevOps Critical Incidents Quarterly Review](https://antihost.atlassian.net/wiki/spaces/DevOps/pages/128286734) и еженедельные ревью | история инцидентов прода - сверять с падениями автотестов | - |

## ANTIHOST - инструкции поддержки по игровым серверам

| Страница | Связь в KB |
|---|---|
| [Формат обращения L1 к L2](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/12255233) | [глоссарий: L1 / L2](../glossary.md#люди-и-процессы) |
| [Общий гайд по параметрам запуска игровых серверов](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/12517377) | [UP/config](../products/up/config.md) |
| [Добавление необходимого Docker Image](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/36601860) | [UP/java-detection](../products/up/java-detection.md), [ADM](../products/adm/README.md) |
| [Импорт и обновление игровых яиц (Eggs) в панели Pterodactyl](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/57737217) | [ADM](../products/adm/README.md) |
| [Ошибка «port is already allocated» при запуске игрового сервера](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/45744130) | [UP/ports-domains](../products/up/ports-domains.md) |
| [Шаблоны логов консоли (Server Console Log Patterns)](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/26574857), [Логирование серверов](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/26509313) | [UP/console](../products/up/console.md) |
| [Планировщик](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/12615728) | [UP/tasks](../products/up/tasks.md) |
| [Перенос сервера и баз данных](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/12648475) | [UP/databases](../products/up/databases.md) |
| [Проверка сетевой доступности серверов разных игр](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/12713985) | [UP/ports-domains](../products/up/ports-domains.md) |
| [Virtfusion](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/12648498) | [VPS](../products/vps/README.md) |
| [Dedicated Servers - Support Guide](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/17137665) | выделенные серверы, панель `baremetal.godlike.host` - продукт приостановлен (владелец 15-Oct), в KB не описываем |
| FiveM: [ошибка 30120](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/36700161), [txAdmin](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/46137348), [vMenu](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/55279618), [скрипты](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/69337089) | не-MC игры в UP ([обзор UP, пробел 4](../products/up/README.md#пробелы)) |
| ARK: [конфиги](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/70090753), [своя карта](https://antihost.atlassian.net/wiki/spaces/ANTIHOST/pages/86638593) | [UP/game-settings](../products/up/game-settings.md) |

## Правила

- Ссылаемся, не копируем. Если факт из Confluence нужен в KB, пишем одну строку и ссылку.
- Страницы Confluence меняют другие команды: перед выводом на их основе - открыть и сверить дату.
- Заголовки и id сняты 15-Oct-2026; новые страницы появляются регулярно (особенно ревью инцидентов DevOps).
