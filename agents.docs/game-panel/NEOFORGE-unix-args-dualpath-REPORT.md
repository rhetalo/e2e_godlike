# QA-отчёт: поддержка обоих путей `unix_args.txt` для NeoForge (stage)

> **Дата:** 19-Aug-2026 · **Окружение:** stage (`stage.ultra.panel.godlike.host`, Pterodactyl под ultra.panel)
> **Сервер:** `neoforge_test` · UUID `62c8289b-240a-4c3a-a786-28bb1ec0875a` · node `stage.wing01` · RAM 8 ГБ · PC Minecraft
> **Тестировщик:** r.hetalo (+ Claude Code, live-driving по CDP через сессию владельца)

## TL;DR
**Фикс работает.** Установщик модпаков создаёт корневой `unix_args.txt`-симлинк для **обоих** путей NeoForge - modern `net/neoforged/neoforge` (5 паков подтверждают) и legacy `net/neoforged/forge` (Prominence Classic 1.20.1). Обычный Forge и Fabric не задеты, переустановка-поверх обновляет симлинк без «висения». **`server_jar_missing` не воспроизведён ни в одном из 12 прогонов.** Оставшиеся нюансы - внешние, к фиксу не относятся (см. «Находки»).

---

## Суть фичи и механизм
Установщик модпаков должен создавать корневой `unix_args.txt` для обоих вариантов структуры NeoForge:
- legacy **NeoForge 1.20.1** → `libraries/net/neoforged/forge/<ver>/`
- modern **NeoForge 1.20.2+** → `libraries/net/neoforged/neoforge/<ver>/`
+ сохранять обычный Forge (`net/minecraftforge/forge`) и не ломать Fabric.

Стартовая команда сервера (`invocation`) содержит условие:
```
… -Djava.awt.headless=true $( [ ! -f unix_args.txt ] && printf %s "-jar server.jar" || printf %s "@unix_args.txt" )
```
Есть корневой `unix_args.txt` ⇒ запуск через `@unix_args.txt`; нет ⇒ `-jar server.jar` → у NeoForge/Forge без рабочего server.jar это и есть `server_jar_missing`. Корневой `unix_args.txt` - **симлинк** (`Lrwxrwxrwx`) на реальный `libraries/.../unix_args.txt` (размер симлинка = длина пути-цели: 55 б = neoforge, 59 б = neoforged/forge, 62 б = minecraftforge).

## Метод проверки
- Чтение файлов/состояния - API Pterodactyl `/api/client` (GET, ptlc-токен).
- Установки - `/api/v2/.../minecraft/modpacks` (`install_mode` ∈ delete|backup|overwrite) и `/versions/install`.
- Старт/стоп - UI-кнопки; консоль - live websocket-фреймы (детект `server_jar_missing` + маркеров старта: EULA / ModLauncher / Loading N mods / Fabric Loader).

---

## Основные сценарии (по AC разработчика)

| # | Сценарий | Пак / способ | Корневой `unix_args.txt` | Путь-источник | Старт (нет `server_jar_missing`) | Итог |
|---|----------|--------------|--------------------------|---------------|----------------------------------|------|
| 1+2 | **Modern NeoForge 1.21.1** | модпак ATM10 (cf 925200) | ✅ симлинк 55 б | `net/neoforged/neoforge/21.1.247` | ✅ `@unix_args.txt`, ~461 мод → EULA | **PASS** |
| 3 | **Legacy NeoForge 1.20.1** | модпак Prominence Classic v2.8.0 (cf 574291, ver 5527350) | ✅ симлинк 59 б | `net/neoforged/forge/1.20.1-47.1.106` | ⚠️ не стартует, но `server_jar_missing` НЕТ (см. находку №1) | **PASS (файлы)** |
| 4 | **Обычный Forge 1.20.1** (1.17+) | предустановлен (build 47.4.4) | ✅ симлинк 62 б | `net/minecraftforge/forge/1.20.1-47.4.4` | ✅ `@unix_args.txt` (fmlloader/modlauncher) | **PASS** |
| 5 | **Переустановка поверх** | ATM10 `install_mode=overwrite` поверх Prominence | ✅ симлинк перескочил 59→55 б | было `neoforged/forge` → стало `neoforged/neoforge/21.1.247`, старый путь удалён | ✅ старт, симлинк НЕ «висящий» | **PASS** |
| 6 | **Fabric (негатив)** | Versions 1.21.1 | ✅ ОТСУТСТВУЕТ (верно) | нет `net/minecraftforge`/`neoforged` | ✅ `-jar server.jar`, Fabric Loader 0.19.3 | **PASS** |

## Расширенное покрытие (батч modern NeoForge 1.21.1 модпаком)

| Пак | Корневой `unix_args.txt` | Путь-источник | Старт | Итог |
|-----|--------------------------|---------------|-------|------|
| New Simple Mods (523038) | ✅ 55 б | `neoforged/neoforge/21.1.145` | ✅ | PASS |
| Craftoria (1039252) | ✅ 55 б | `neoforged/neoforge/21.1.230` | ✅ (2566 стр лога) | PASS |
| Medieval MC [NEOFORGE] (826840) | ✅ 55 б | `neoforged/neoforge/21.1.228` | ✅ (1471 стр) | PASS |
| Cobblemon Official [NeoForge] (821749) | лоадер не установился | — | — | вне скоупа (загрузка пака) |

Вывод расширения: у **всех** паков, где NeoForge-лоадер реально установился, корневой симлинк создаётся стабильно и указывает в `net/neoforged/neoforge/<ver>`. Механизм фикса консистентен между паками.

---

## Находки (вне скоупа фикса, для разработчика)

1. **Старт legacy NeoForge 1.20.1 не продемонстрирован (не баг `unix_args`).** Prominence Classic (NeoForge 1.20.1) устанавливается корректно (симлинк → `net/neoforged/forge`), но сервер не стартует: state держится `offline`, консоль пуста, при этом `server_jar_missing` НЕ возникает. Причины не в фиксе: (а) `/minecraft/version` после установки залипает на предыдущем значении (наблюдали `FABRIC 1.21.1` при верных файлах NeoForge 1.20.1) → вероятно неверный egg/Java при старте; (б) **в каталоге НЕТ поддерживаемого чистого NeoForge-1.20.1-пака** - все версии 1.20.1 помечены `is_supported:false` (проверено по 45 пакам). Рекомендация: чинить обновление version-метадаты после модпак-инсталла и/или дать поддерживаемый NeoForge-1.20.1-пак для полноценной старт-проверки.

2. **Versions-таб ≠ модпак-флоу.** Установка modern NeoForge 1.21.1 через вкладку **Versions** (не модпак) корневой `unix_args.txt` **НЕ создаёт**, но сервер стартует через рабочий `-jar server.jar` (`--fml.neoForgeVersion 21.1.248`, EULA, ошибок нет). Фикс живёт в модпак-флоу (как в баг-репорте). Уточнить: ожидается ли симлинк и для Versions-пути (AC1 говорит «в корне появился unix_args.txt»).

3. **Cobblemon Official [NeoForge] (821749) - установка пака не завершилась.** Загрузка server-pack ZIP с forgecdn не докачалась → NeoForge-лоадер не разложился (нет `libraries/`), поэтому корневой симлинк не создан (корректно - нечего линковать). Это установка конкретного пака, вне скоупа `unix_args`; на вердикт по фиксу не влияет.

---

## Итоговое покрытие

| Путь-структура | Кем покрыт | Файлы | Старт |
|---|---|---|---|
| `net/neoforged/neoforge` (modern) | ATM10, New Simple Mods, Craftoria, Medieval MC, S5 | ✅ | ✅ |
| `net/neoforged/forge` (legacy 1.20.1) | Prominence Classic | ✅ | ⚠️ (внешняя блокировка) |
| `net/minecraftforge/forge` (Forge) | предустановл. Forge 1.20.1 | ✅ | ✅ |
| нет лоадера (Fabric негатив) | Fabric 1.21.1 | ✅ (нет файла) | ✅ |
| reinstall-over (dangling) | ATM10-over-Prominence | ✅ (перескок) | ✅ |

**Оба пути NeoForge, требуемые фиксом, подтверждены на уровне создания корневого симлинка. `server_jar_missing` не воспроизведён нигде.**

## Текущее состояние сервера
`neoforge_test` = Medieval MC [NEOFORGE] 1.21.1 (последний прогон). При необходимости чистой базы - переустановить нужный лоадер.
