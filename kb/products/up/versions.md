---
id: UP/versions
title: Versions - смена ядра и версии Minecraft
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-10-08        # последняя живая сверка - DEV-529 (Mohist)
tickets: [DEV-506, DEV-529, DEV-512, DEV-472]
flags: [world-backup]
tests: [tests/game/panel/versions.spec.ts]
sources:
  - kb/tickets/DEV-506.md, DEV-529.md, DEV-512.md, DEV-472.md, DEV-418.md
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §7a, §9e (recon 06-Jun-2026)
  - test-docs/ultra.panel/DEV-506/dev506-arclight-version-REPORT.md
  - test-docs/ultra.panel/DEV-529/dev529-arclight-start-REPORT.md
  - memory: dev506-arclight-version-rollback, dev529-arclight-start-fix
---

# Versions - смена ядра и версии Minecraft

> **В двух словах.** Вкладка Versions показывает, какое ядро и какая версия Minecraft стоят на сервере, и
> даёт поставить другое: 18 семейств ядер (Vanilla, Paper, Forge, Fabric, Arclight...), дальше версия и
> билд. Установка - это пересборка сервера, а с галочкой Wipe ещё и удаление файлов. От того, что панель
> считает установленным, зависят требование к Java ([UP/java-detection](java-detection.md)) и подбор модов
> ([UP/mods-loader-gating](mods-loader-gating.md)), поэтому ошибки детекта здесь ломают сразу несколько фич.

## Где в интерфейсе

- Таб **Versions**, `/server/{uuid}/minecraft/versions`. Источник: KNOWLEDGE_BASE §7a.
- **Шапка:** «Currently running NeoForge», «Installed Minecraft Version: 1.21.1», «Installed Build: 21.1.200».
  У ядер с билдами `#N` (Paper, Folia, Canvas, Leaves) строки «Installed Build» нет
  ([DEV-506/O2](../../tickets/DEV-506.md#находки), вероятно by design).
- **Сетка семейств** (карточки, у каждой «N Minecraft versions / N Builds»): Vanilla, Paper, Pufferfish, Spigot,
  Folia, Purpur, Waterfall, Velocity, Fabric, BungeeCord, Quilt, Forge, NeoForge, Mohist, Arclight, Sponge, Leaves, Canvas.
- **Drill-down:** клик по семейству → `?type=NEOFORGE` → список версий («1.21.1 RELEASE / 230 Build(s)»),
  тоггл **Show Snapshot Versions**, **Go Back** → версия → **Select Build** → **Install** (+ галочка Wipe). Источник: §9e.
- **Refresh version** - перечитать установленное ([DEV-529](../../tickets/DEV-529.md)).
- Install с Wipe открывает окно **«Save Your World First?»** ([UP/world-backup](world-backup.md)).

## Как работает (под капотом)

| Действие | API (`/api/v2/servers/{uuid}/...`) | Источник |
|---|---|---|
| Тип и версия сервера | `GET minecraft/version` (+ `extension_capabilities` под флагом) | [DEV-506](../../tickets/DEV-506.md), [DEV-515](../../tickets/DEV-515.md) |
| Установленный билд | `GET minecraft/versions/installed` (билд, `latest`) - определяется **по файлам** на диске | [DEV-506](../../tickets/DEV-506.md) |
| Установка | `POST minecraft/versions/install {build, delete_files}` | [DEV-506](../../tickets/DEV-506.md) |

- **Выбор Java при смене версии.** `JavaImageMatcher::pick()` получает текущий образ: если сервер на `-libxrender`
  и в egg есть libxrender-вариант нужной Java, берётся он, иначе первый по порядку в egg. Правка во всех 4 местах
  выбора образа (легаси changer, новый changer, установка ядра `applyJavaImage`, `ApplyRequiredJavaImageAction`),
  то есть и в UP, и в OLDP. Источник: [DEV-512](../../tickets/DEV-512.md).
- **Требование к Java** пересчитывается после смены ядра (миграция `add_minecraft_core_changed_at`, см.
  [UP/java-detection](java-detection.md)).
- **Гибриды Arclight** определяются по flavor (`-forge` / `-neoforge` / `-fabric`) и после Start, Restart и
  Refresh остаются `ARCLIGHT`. Раньше детект «по файлам» видел внутри Arclight библиотеки
  `libraries/net/minecraftforge/forge/...` и перезаписывал тип в Forge/NeoForge. Источник: [DEV-529](../../tickets/DEV-529.md).
- **Mohist** после Start сохраняет установленный билд (раньше `build:null`, фикс 08-Oct). Youer и Magma в каталоге нет.

## Правила и граничные случаи

1. **У разных версий бывают билды с одинаковыми именами** (у Arclight 1.21 и 1.21.1 по 632 билда). Фикс
   [DEV-506](../../tickets/DEV-506.md) - на бэкенде, каталог не объединяли. Проверено на Fabric, Quilt, Paper,
   Canvas, Folia, Leaves, Sponge, Mohist.
2. **Уже испорченные серверы фикс DEV-529 не чинит** (скоуп согласован с разработчиком).
3. **Билд может не стартовать сам по себе:** Arclight 1.21.1 `1.0.1-8ec9529-forge` (mixin InvalidInjectionException),
   Arclight `1.0.1-neoforge` = NeoForge 21.1.192, а актуальным модам нужен ≥21.1.218 - падение без предупреждения
   ([DEV-529/F3, F4](../../tickets/DEV-529.md#находки)).
4. **Внешний источник ядра может лежать:** Pufferfish (jar → 502) и Mohist 1.20.1 #347 (404), ошибка пользователю
   непонятная ([DEV-506/O1](../../tickets/DEV-506.md#находки)).
5. **После установки модпака** панель сама обновляет версию MC и loader ([DEV-472/F6](../../tickets/DEV-472.md#находки)).

## Гочи для тестирования

- **Install = деструктивный rebuild.** Автотесты только структурные, до Install не доходят. Ручная смена ядра -
  только на своих тест-серверах ([srv:0cf8346f](../../registry/test-servers.md#0cf8346f) использовался с Wipe по
  разрешению владельца).
- **Проверять после Start, а не только после Install:** баг DEV-506/F1 проявлялся примерно через минуту после старта.
- **Правда - `GET minecraft/version` и `/versions/installed`**, UI шапки сверять с ними, при сомнении - консоль
  (`Launching target 'arclightserver'`).
- Клик по карточке версии капризен к селектору (карточка - `div`-контейнер, не текст). Источник: §9e.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Шапка установленной версии и сетка семейств | `versions.spec.ts` (TC-GP-VER-001) | ✅ |
| Drill-down семейства без установки | `versions.spec.ts` (TC-GP-VER-002) | ✅ |
| Install, Wipe, детект после старта, Java после смены | только ручной QA ([DEV-506](../../tickets/DEV-506.md), [DEV-529](../../tickets/DEV-529.md), [DEV-512](../../tickets/DEV-512.md)) | ❌ авто нет |
| Сабюзер с правом Versions | не проверялся | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 06-Jun-2026 | - | Recon таба, KNOWLEDGE_BASE §7a, §9e |
| 25-Sep-2026 | [DEV-486](../../tickets/DEV-486.md) | Старый Version Changer (OLDP) и libxrender-образы |
| 02..07-Oct-2026 | [DEV-512](../../tickets/DEV-512.md) | Смена версии сохраняет libxrender |
| 05-Oct-2026 | [DEV-506](../../tickets/DEV-506.md) | Arclight 1.21.1 / 1.20.1 больше не откатывается на 1.21 / 1.20 |
| 06..08-Oct-2026 | [DEV-529](../../tickets/DEV-529.md) | Arclight остаётся Arclight после старта, Mohist держит билд |
