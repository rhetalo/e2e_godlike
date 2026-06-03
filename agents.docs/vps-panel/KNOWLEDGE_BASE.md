# VPS Panel — Knowledge Base (vf-panel.godlike.host / VirtFusion)

> База знаний по VPS-панели VirtFusion. Зафиксировано 03-Jun-2026 (checkpoint перед заходом
> на реальный rebuild). Обновлять по мере находок. См. также `TEST_PLAN.md`, `HANDOFF.md`
> и корневой `agents.docs/AGENT_HANDOFF.md` (общие auth/storageState/гочи).

## 1. Что это и где живёт

| | |
|---|---|
| URL | `https://vf-panel.godlike.host` |
| Тип | VirtFusion (Bootstrap-модалки `.modal.show`, частично Vue) |
| Auth | `utils/auth.ts`: `PANEL_EMAIL`/`PANEL_PASSWORD`, `loginAndSaveSession()` → `storageState.panel.json` |
| Тестовый сервер | `TEST_SERVER_UUID = c13d2e04-2544-41fc-afff-9ae5c49aca93` (`srv-433986`) |
| Доп. серверы | есть 2-й сервер; можно купить ещё (аккаунт тестовый, полная свобода) |
| Page Objects | `pages/VpsPanel*.ts` (+ `VpsPage`, `VpsConfigPage`, `CartBillingPage` для воронки) |
| Reference PO | **`VpsPanelServerPage`** (etalon) + tab-PO (Media/Network/Options/Storage) + `VpsPanelRebuildPage` |
| Тесты | `tests/vps/funnel/` (воронка) и `tests/vps/panel/` |

## 2. ⚠️ Главный гочи: DOM «врёт» (скрытый/фантомный DOM)

VirtFusion держит в разметке **скрытые элементы, которые реально не доступны** (Bootstrap-модалки
остаются в DOM закрытыми; кастомные radio прячут `<input>`). Последствия для тестов:
- **Нельзя верить** `.count()`, `toBeAttached`, `:has-text`, `.first()` **без `toBeVisible`-гейта** —
  они зеленеют на фантоме. Пример: media-radio проверяется через `toBeAttached()` (скрытый input).
- **Модалки скоупить через `.modal.show`** и фильтровать `:not([data-bs-dismiss="modal"])`
  (так делает `VpsPanelServerPage` — это правильный паттерн).
- **Реальность валидировать скриншотами** (recon), а при сомнении — дёргать владельца. Не гадать.

## 3. Решение по ТЗ Install/Build/Delete

- **Install** = воронка покупки (`tests/vps/funnel/vps.funnel.spec.ts`) — покрыто до WHMCS checkout.
- **Build** = **реальный rebuild** сервера в панели (переустановка ОС). Ребилдить можно `c13d2e04`.
- **Delete** = **ВНЕ СКОУПА.** В панели удаления сервера НЕТ (в списке `/servers` только Manage).
  Удаление = отмена услуги в биллинге (WHMCS), не действие панели. Подтверждено владельцем 03-Jun-2026.
  → Delete-автотест не пишем; легаси delete-локаторы (фантомные) удаляем.

## 4. Legacy page objects (к удалению/миграции)

| PO | Статус | Замена |
|---|---|---|
| `VpsPanelServerDetailPage.ts` | LEGACY (только в `vps.build.spec.ts`); фантом-селекторы (broad `[class*=...]`, модалки без `.show`) | `VpsPanelServerPage` |
| `VpsPanelServersListPage.ts` | LEGACY; delete-локаторы целятся в **скрытый `#deleteBackupModal`** — ложный позитив | навигация → `VpsPanelDashboardPage`; delete-часть **удалить** |
| `tests/vps/panel/vps.build.spec.ts` | LEGACY-спек; 50+ `.catch(()=>false)`; T2.6 реально жмёт rebuild на угаданных селекторах | переписать на `VpsPanelServerPage`+`VpsPanelRebuildPage` (см. TEST_PLAN) |

## 5. Rebuild — что известно (нужно подтвердить recon'ом со скринами)

Флоу (из `VpsPanelRebuildPage` + `vps.panel.rebuild.spec.ts`):
1. Страница сервера → кнопка Rebuild (`button[data-bs-target="#reinstallServerModal"]`).
2. Модал подтверждения → Continue → страница выбора ОС.
3. ОС-карточки: `div.card.os-select`; выбранная — `.selected-card.border-success`;
   аккордеоны-семейства: AlmaLinux, CentOS, Debian, Fedora, Games, Ubuntu; есть Swap Space.
4. Финальная кнопка **«Install with {OS}»** (`VpsPanelRebuildPage.finalInstallButton`) —
   сейчас в тестах НЕ нажимается (UI-only).
- **Не подтверждено (для реального rebuild-теста):** точный селектор/текст финального confirm,
  переходы статуса `Building → Running`, как ловить завершение (activity table? статус-бейдж?),
  сколько ждать. → выяснить recon'ом, валидировать скринами.

## 6. Полезное из существующего (переиспользовать)

- `VpsPanelServerPage`: `getStatusText()` (Running/Stopped/Paused/Building), `.modal.show`-хелперы,
  activity table (`activityRows`, дожидание Complete, debug-row фильтр), power-кнопки с
  `:not([data-bs-dismiss="modal"])`.
- `vps.panel.power.actions.spec.ts` — эталон stateful-теста (serial + `afterAll` восстановление).
  Тот же паттерн применим к реальному rebuild (serial + teardown в Running).
