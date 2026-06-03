# VPS Panel — Handoff (continue here in a fresh session)

> Одна страница «где мы и что дальше». Читать вместе с `KNOWLEDGE_BASE.md` + `TEST_PLAN.md`
> и корневым `CLAUDE.md`. Обновлено 03-Jun-2026.

## TL;DR (обновлено 03-Jun-2026)
Задача: закрыть ТЗ «Install / Build / Delete VPS» в vf-panel (VirtFusion).
- **Install** — покрыто воронкой (`vps.funnel.spec.ts`).
- **Build = реальный rebuild** — ✅ **СДЕЛАНО**: `tests/vps/panel/vps.rebuild.real.spec.ts` (зелёный).
- **Delete** — снято со скоупа (панель не умеет удалять сервер; это отмена услуги в биллинге).
- Legacy удалён (`vps.build.spec.ts`, `VpsPanelServerDetailPage`, `VpsPanelServersListPage`).
- **ТЗ по сути закрыто.** Осталось — необязательный техдолг (см. TEST_PLAN «Осталось»).

## Контекст/доступ
- Auth: `utils/auth.ts` (`PANEL_EMAIL`/`PANEL_PASSWORD` → `storageState.panel.json`).
- Тестовый сервер: `c13d2e04-2544-41fc-afff-9ae5c49aca93` (srv-433986). Ребилдить РАЗРЕШЕНО.
  Есть 2-й сервер; можно купить ещё. Аккаунт тестовый — полная свобода.
- ⚠️ DOM врёт (скрытые элементы) → ассертить `toBeVisible`, модалки через `.modal.show`,
  реальность сверять скринами, не гадать — дёргать владельца.

## Следующий шаг (ровно один)
**Recon реального rebuild (read-only, со скринами)** на `c13d2e04`:
1. Rebuild → Continue → выбрать ОС (`div.card.os-select`) → НЕ нажимать Install.
2. Снять: точный текст/селектор финальной кнопки «Install with {OS}», есть ли confirm-модал,
   как выглядит статус `Building`, где маркер завершения (activity table / бейдж), тайминги.
3. По результату — добавить метод rebuild в `VpsPanelRebuildPage` и написать
   `tests/vps/panel/vps.rebuild.real.spec.ts` (`@critical`, serial + teardown в Running).

Эталон stateful-теста: `tests/vps/panel/vps.panel.power.actions.spec.ts`
и (game-панель) паттерн `ensureOnline/waitForOnline` из `pages/game/GamePanelServerPage.ts`.

## После rebuild — реорг (TEST_PLAN §B)
Мигрировать/удалить `vps.build.spec.ts`, удалить legacy `VpsPanelServerDetailPage` +
delete-часть `VpsPanelServersListPage`, почистить фантом-ассерты (`toBeAttached`→`toBeVisible`,
`.catch(()=>false)`→`test.skip`).

## Что НЕ трогать
- Не ломать существующие зелёные тесты (power.actions, network, options, storage, login, media).
- Game-панель (ultra.panel) — на паузе, 15 тестов зелёные (см. `agents.docs/game-panel/`).
- Незакоммиченные правки владельца: `pages/VpsPage.ts`, 2 funnel-спека — не мои, не смешивать.
