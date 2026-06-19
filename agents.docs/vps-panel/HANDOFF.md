# VPS Panel — Handoff (continue here in a fresh session)

> Одна страница «где мы и что дальше». Читать вместе с `KNOWLEDGE_BASE.md` + `TEST_PLAN.md`
> и корневым `CLAUDE.md`. Обновлено 19-Jun-2026.

## TL;DR (обновлено 19-Jun-2026)
Задача: закрыть ТЗ «Install / Build / Delete VPS» в vf-panel (VirtFusion).
- **Install** — покрыто воронкой (`tests/vps/funnel/`).
- **Build = реальный rebuild** — ✅ **СДЕЛАНО**: `tests/vps/panel/vps.panel.rebuild.real.spec.ts` (зелёный).
- **Delete** — снято со скоупа (панель не умеет удалять сервер; это отмена услуги в биллинге).
- Legacy удалён (`vps.build.spec.ts`, `VpsPanelServerDetailPage`, `VpsPanelServersListPage`).
- **ТЗ по сути закрыто.** Осталось — необязательный техдолг (см. TEST_PLAN «Осталось»).

## Контекст/доступ
- Auth: `utils/auth.ts` (`PANEL_EMAIL`/`PANEL_PASSWORD` → `storageState.panel.json`).
- Тестовый сервер: `c13d2e04-2544-41fc-afff-9ae5c49aca93` (srv-433986). Ребилдить РАЗРЕШЕНО.
  Есть 2-й сервер; можно купить ещё. Аккаунт тестовый — полная свобода.
- ⚠️ DOM врёт (скрытые элементы) → ассертить `toBeVisible`, модалки через `.modal.show`,
  реальность сверять скринами, не гадать — дёргать владельца.

## Состояние: ТЗ закрыто ✅ (обновлено 19-Jun-2026)
- Реальный rebuild покрыт: `tests/vps/panel/vps.panel.rebuild.real.spec.ts`
  (`@critical`, serial + teardown в Running) — эталон stateful-паттерна для VPS-панели.
- Реорг сделан: legacy `vps.build.spec.ts`, `VpsPanelServerDetailPage` и delete-часть
  `VpsPanelServersListPage` удалены; фантом-ассерты вычищены.
- Остальное — необязательный техдолг (см. `TEST_PLAN.md` «Осталось»): dashboard
  (список серверов / фильтрация), дожидание полного цикла Building→Running.

Эталон stateful-теста: `tests/vps/panel/vps.panel.power.actions.spec.ts`
и (game-панель) паттерн `ensureOnline/waitForOnline` из `pages/game/GamePanelServerPage.ts`.

## Что НЕ трогать
- Не ломать существующие зелёные тесты (power.actions, network, options, storage, login, media).
- Game-панель (ultra.panel) — Phase 5 закрыта, ~58 тестов зелёные (см. `agents.docs/game-panel/`).
- Незакоммиченные правки владельца: `pages/VpsPage.ts`, 2 funnel-спека — не мои, не смешивать.
