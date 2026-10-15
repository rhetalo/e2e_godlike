---
id: UP/console
title: Console - лог сервера и ввод команд
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-07-27        # последний recon консоли (маркер запуска)
tickets: []
flags: []
tests:
  - tests/game/panel/console.spec.ts
  - tests/game/panel/console.palette.spec.ts
  - tests/game/panel/security.console.spec.ts
  - tests/game/panel/players.spec.ts
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §4, §5a, §5d, §5j, §8a, §9f (recon 03-Jun..27-Jul-2026)
  - kb/products/up/README.md (гоча 5)
  - memory: stage-neoforge-unixargs
---

# Console - лог сервера и ввод команд

> **В двух словах.** Консоль показывает живой лог игрового сервера и даёт отправлять в него команды
> (`say`, `whitelist add`, `stop` ...). Короткая консоль есть на Overview, полная - на вкладке Console, там
> же палитра готовых команд. Для QA консоль - главный источник правды: что сервер реально сделал, видно
> только здесь.

## Где в интерфейсе

- **Overview:** блок консоли (Commands input, Full Server Log, Mod Conflict). KB §4.
- **Вкладка Console** (`/server/{uuid}/console`, `server__console-full*`): поле «Enter a command», кнопки **Help** и **Commands**. KB §8a.
- **Палитра Commands:** поиск «Search command...», сортировка A-Z, список команд (ban, op, gamemode, gamerule, say,
  stop, whitelist add ...). Клик по пункту вставляет шаблон в поле, команда не отправляется.

## Как работает (под капотом)

- Терминал - **xterm** (`.terminal.xterm`, контейнер `.terminal-container`). SPA сам держит WebSocket к Wings, события
  `console output` / `install output`. Источник: [обзор UP](README.md#как-устроено), KB §9f.
- В лог попадают boot-лог сервера и служебные строки `[Pterodactyl Daemon]: ...`.
- Команда уходит в stdin игрового сервера (не в БД), ответ приходит строкой в лог.
- Из-за живого WebSocket на странице сервера никогда не наступает `networkidle`.

## Правила и граничные случаи

1. **Поле ввода видят Owner, Co-owner и Moderator; у Member его нет** ([UP/sharing-roles](sharing-roles.md#права-по-ролям-ui)).
2. **Команда работает только на запущенном сервере.** Управление игроками на вкладке Players тоже требует Online. KB §5d.
3. **Payload в выводе рендерится как текст:** `say <img onerror>` не исполняется (SEC-005). KB §5j.
4. **В Audit Log пишется `server:console.command`.** KB §9b.

## Гочи для тестирования

- **Текст читать из `.terminal` или WS-фреймов**, адрес сервера - только из `.roadmap-ip` (в консоли есть `127.0.0.1:PORT`).
- **Консоль - сигнал «сервер запущен»**, когда тоггл power залип: `isOnlineByConsole()`, `waitForServerRunning()`. KB §5a.
- **Модовый [srv:ebb03adc](../../registry/test-servers.md#ebb03adc) грузится долго:** `ensureOnline` 300 с +
  `waitForConsoleReady` 360 с, `test.setTimeout` ~480 с. KB §5d.
- **Подтверждённые ответы whitelist:** `whitelist add <Name>` → `Added <Name> to the whitelist`, `whitelist list` →
  `There are N whitelisted player(s): ...`, `whitelist remove <Name>` → `Removed <Name> from the whitelist`. Имя должно
  быть реальным аккаунтом (online-mode), в откат всегда `remove`.
- **Краш быстрее опроса** `/resources` - причину старта или падения доказывать строками консоли ([UP/java-detection](java-detection.md#гочи-для-тестирования)).

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Лог стримится, поле команд доступно | `console.spec.ts` (CON-001) | ✅ |
| Команда `list` получает ответ | `console.spec.ts` (CON-002) | ✅ |
| Палитра Commands, поиск | `console.palette.spec.ts` (CON-003) | ✅ |
| XSS в выводе консоли | `security.console.spec.ts` (SEC-005) | ✅ |
| Whitelist через консоль | `players.spec.ts` (PLR-002) | ✅ |
| Кнопки Help, Full Server Log, Mod Conflict | не разведаны | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 03..06-Jun-2026 | - | Recon консоли и палитры, KB §5a, §8a |
| 09-Jun-2026 | - | SEC-005: XSS в выводе консоли не исполняется |
| 27-Jul-2026 | - | Консоль как запасной сигнал «Running», когда тоггл power не флипается |
