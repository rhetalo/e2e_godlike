---
id: KB-TICKETS
title: Тикеты и задачи
type: index
updated: 2026-10-23
---

# Тикеты и задачи

> **В двух словах.** Карточка на каждую задачу, которую проходил QA: что поменяли, чем
> закончилось, какие находки и с чем связано. Задачи без Jira-ключа называются `TASK-<slug>`.
> Индекс собирается скриптом из front matter карточек, руками не правится.

| ID | Суть | Продукт | Статус | QA | Регресс | Сверено |
|---|---|---|---|---|---|---|
| [DEV-400](DEV-400.md) | Страницы модпаков ведут в новую воронку cart-modded-new | WPGL, BIL | done | PASS | - | 2026-08-20 |
| [DEV-401](DEV-401.md) | Cancel retention - новые экраны Game Recommendation и Free Plan в модуле отмены | UP, BIL | done | PASS-with-issues | - | 2026-08-17 |
| [DEV-402](DEV-402.md) | Страницы игр подключены к новой воронке (Vue-cart) | WPGL, BIL | done | - | - | 2026-08-20 |
| [DEV-405](DEV-405.md) | Источник модов, плагинов и сборок в новой панели - прямые API CurseForge и Modrinth | UP | done | PASS | - | 2026-10-05 |
| [DEV-418](DEV-418.md) | World Backup - отдельная копия мира Minecraft перед опасными действиями | UP | partial | PASS-with-issues | - | 2026-08-14 |
| [DEV-452](DEV-452.md) | Понятные причины отказа при создании пре-инсталл бэкапа модпака (троттлинг vs остальные) | UP | done | PASS | no | 2026-10-21 |
| [DEV-455](DEV-455.md) | Попап Free Server Gift и цепочка писем (GROWTH-95) | WPGL, BIL | done | PASS-with-issues | no | 2026-10-15 |
| [DEV-458](DEV-458.md) | Custom Modpack Setup как one-time add-on в биллинге | BIL, WPGL | blocked | FAIL | - | 2026-09-28 |
| [DEV-459](DEV-459.md) | Custom Modpack Setup - точки входа в воронке и в игровой панели | WPGL, UP | done | PASS | - | 2026-09-28 |
| [DEV-472](DEV-472.md) | Автодетект версии Java и попап ошибки Java | UP | done | PASS | - | 2026-10-08 |
| [DEV-476](DEV-476.md) | Поиск файлов /files/search - потоковый, с лимитами, без долгих PHP-FPM запросов | UP | done | PASS | covered | 2026-10-20 |
| [DEV-477](DEV-477.md) | Лимиты ресурсов нод (Unlimited / Percentage / Fixed) вместо overallocation | ADM, INFRA | n/a | - | - | - |
| [DEV-484](DEV-484.md) | Единый лимит бэкапов - вывести pre-install бэкап из-под троттлинга и свести счётчики | UP | done | PASS | covered | 2026-10-20 |
| [DEV-485](DEV-485.md) | Фоновая проверка Java при старте сервера (гейт java-start-gate) | UP | done | PASS-with-issues | - | 2026-10-09 |
| [DEV-486](DEV-486.md) | Старый Version Changer ломался на образах yolks-javaNN-libxrender | OLDP | done | PASS | - | 2026-09-25 |
| [DEV-492](DEV-492.md) | Определять новые клиентские моды сразу после установки модпака | UP | done | PASS-with-issues | - | 2026-10-09 |
| [DEV-498](DEV-498.md) | Неправильная работа фильтра загрузчиков модов | UP | done | PASS | - | 2026-09-25 |
| [DEV-500](DEV-500.md) | Скрыть чисто клиентские моды во вкладке модов | UP | done | PASS | - | 2026-10-12 |
| [DEV-506](DEV-506.md) | Versions - Arclight 1.21.1 и 1.20.1 после установки откатываются на 1.21 / 1.20 | UP | done | PASS-with-issues | - | 2026-10-05 |
| [DEV-512](DEV-512.md) | Смена версии теряет суффикс libxrender у Docker-образа | UP, OLDP | done | PASS | - | 2026-10-07 |
| [DEV-513](DEV-513.md) | Устаревший «Образ Docker» в Параметрах запуска после серверной смены образа | OLDP, ADM | done | PASS | - | 2026-10-12 |
| [DEV-515](DEV-515.md) | Автофильтр версий во вкладке модов и блокировка вкладок для несовместимых ядер | UP | done | PASS | - | 2026-10-07 |
| [DEV-529](DEV-529.md) | Versions - Arclight на Forge/NeoForge после запуска сервера превращается в Forge/NeoForge | UP | done | PASS | - | 2026-10-08 |
| [DEV-532](DEV-532.md) | Убрать дубли модпаков CurseForge / Modrinth из выбора на modded-странице | UP, ADM, WPGL | done | PASS | - | 2026-10-08 |
| [DEV-534](DEV-534.md) | Фильтры «All» и «All versions» в каталоге модов и плагинов не расширяют список | UP | done | PASS-with-issues | - | 2026-10-09 |
| [DEV-546](DEV-546.md) | Блок «Boost your server» на чекауте v2 (только UI и QA-превью под флагом) | BIL | done | PASS | blocked | 2026-10-19 |
| [DEV-549](DEV-549.md) | Фікси після DEV-515 - сценарії туторіалу на заглушках, блокування кнопки кастомних модпаків та API | UP | done | PASS | blocked | 2026-10-19 |
| [DEV-556](DEV-556.md) | Ошибки установки модов понятно в интерфейсе | UP | done | PASS | covered | 2026-10-23 |
| [DEV-557](DEV-557.md) | Jar больше 100 МБ никогда не получает вердикт сканера клиентских модов | UP, INFRA | done | FAIL | no | 2026-10-23 |
| [DEV-558](DEV-558.md) | Переустановленный клиентский мод не отключается (правило DEV-275) | UP | done | PASS | candidate | 2026-10-21 |
| [DEV-562](DEV-562.md) | Steam Port для подключения к серверу Project Zomboid в Overview | UP | done | PASS | no | 2026-10-15 |
| [DEV-563](DEV-563.md) | Запретить Free-серверам изменять тип сервера (Ultra Panel и PlayFreeHost) | UP, PFH | partial | PASS-with-issues | candidate | 2026-10-15 |
| [DEV-564](DEV-564.md) | Bedrock NetherNet - UDP-порты под каждый слот вместо transport nethernet | UP | partial | PASS-with-issues | candidate | 2026-10-21 |
| [DEV-566](DEV-566.md) | Каталог Minecraft-схематик /minecraft-schematics/ | WPGL | done | PASS | blocked | 2026-10-22 |
| [DEV-571](DEV-571.md) | World Backup - «готово» только после ноды, Continue without backup отменяет незавершённые копии | UP | done | PASS | blocked | 2026-10-23 |
| [DEV-579](DEV-579.md) | Project Zomboid - лимит -Xmx в ProjectZomboid64.json следует за тарифом | UP | done | PASS | candidate | 2026-10-21 |
| [TASK-missing-mod-deps](TASK-missing-mod-deps.md) | Окно Missing mod dependencies (автодозагрузка зависимостей) | UP | done | PASS-with-issues | - | 2026-09-29 |
| [TASK-palworld-settings](TASK-palworld-settings.md) | Palworld Settings: UI-редактор PalWorldSettings.ini | UP | partial | PASS-with-issues | - | 2026-08-20 |
| [TASK-split-server](TASK-split-server.md) | Split Server: управление ресурсами split-серверов в новой панели | UP | done | PASS | - | 2026-09-10 |
| [TASK-tariff-list-400](TASK-tariff-list-400.md) | Список тарифов для апгрейда падает с 400, Upgrade бесконечно грузится | UP, BIL | blocked | FAIL | - | 2026-10-09 |
| [TASK-throttling-webhook](TASK-throttling-webhook.md) | Throttling: алерт троттлинга CPU и модалка «Lag Detected» | UP | in-qa | - | - | 2026-06-15 |
| [TASK-v2-subuser-permissions](TASK-v2-subuser-permissions.md) | API v2 не проверял права сабюзеров (BaseServerRequest) | UP | partial | PASS-with-issues | - | 2026-09-22 |

**Статусы:**
- `done` - QA закрыт;
- `partial` - есть открытые хвосты;
- `blocked` - блокер;
- `in-qa` - в работе;
- `n/a` - QA не участвовал.

**Регресс** (решение при закрытии задачи, skill `qa-close`, D-025):
- `candidate` - покрыть автотестом, спека ещё нет;
- `covered` - автотест есть (в разделе «Регресс» карточки);
- `blocked` - покрыть позже: фича ещё не на проде, временный флаг или нужен стенд;
- `no` - в e2e не идёт, причина в карточке;
- `-` - карточка старше правила, решения нет.

## Бэклог автотестов

> Собирается из `regression:` карточек. Порядок и детали - в разделе «Регресс» каждой карточки.

- **candidate**: [DEV-558](DEV-558.md) - Переустановленный клиентский мод не отключается (правило DEV-275)
- **candidate**: [DEV-563](DEV-563.md) - Запретить Free-серверам изменять тип сервера (Ultra Panel и PlayFreeHost)
- **candidate**: [DEV-564](DEV-564.md) - Bedrock NetherNet - UDP-порты под каждый слот вместо transport nethernet
- **candidate**: [DEV-579](DEV-579.md) - Project Zomboid - лимит -Xmx в ProjectZomboid64.json следует за тарифом
- **blocked**: [DEV-546](DEV-546.md) - Блок «Boost your server» на чекауте v2 (только UI и QA-превью под флагом)
- **blocked**: [DEV-549](DEV-549.md) - Фікси після DEV-515 - сценарії туторіалу на заглушках, блокування кнопки кастомних модпаків та API
- **blocked**: [DEV-566](DEV-566.md) - Каталог Minecraft-схематик /minecraft-schematics/
- **blocked**: [DEV-571](DEV-571.md) - World Backup - «готово» только после ноды, Continue without backup отменяет незавершённые копии

Только упоминаются, карточек нет: DEV-145 (ARK settings), DEV-275, DEV-315 (конструктор модпаков), DEV-321, DEV-441, DEV-523, PROD-126, GROWTH-95.
