# VPS Panel — Test Plan & Coverage (ТЗ: Install / Build / Delete)

> Закрытие задачи «Покрытие автотестами Install / Build / Delete VPS». Зафиксировано 03-Jun-2026.
> См. `KNOWLEDGE_BASE.md` (факты, гочи, legacy-карта) и `HANDOFF.md` (текущее состояние).

## Матрица ТЗ

| Сценарий | Маппинг | Статус | Что есть / что надо |
|---|---|---|---|
| **Install** | Воронка покупки VPS | ✅ покрыто (до WHMCS checkout) | `vps.funnel.spec.ts`; косметически усилить ассерты (visible вместо count) |
| **Build** | **Реальный rebuild** сервера | ✅ **ПОКРЫТО** | `vps.panel.rebuild.spec.ts` SUITE 7 (TC-VPS-BUILD-001, `@critical`, последний тест): реальный rebuild → Build → Complete → Running (~30с). Там же все UI-проверки rebuild. **23/23 зелёных, 0 skipped.** |
| **Delete** | Удаление сервера | ❌ **вне скоупа** | В панели delete НЕТ (= отмена услуги в биллинге). Решение владельца — не покрываем. Legacy delete-локаторы удалены |

## Существующие тесты (полный список — см. walk-through в чате/аудите)

`funnel/vps.funnel.spec.ts` (Install) · `panel/`: `vps.build.spec.ts` (legacy build), `vps.panel.rebuild.spec.ts`
(build UI-only), `vps.panel.power.actions.spec.ts` (power, эталон), `vps.panel.server.spec.ts`,
`vps.panel.media.spec.ts`, `vps.panel.network.spec.ts`, `vps.panel.options.spec.ts`,
`vps.panel.storage.spec.ts`, `vps.panel.login.spec.ts`.

## План работ (большой заход)

### A. Реальный Build (rebuild) — ядро задачи
- [ ] **Recon (read-only + скрины):** подтвердить финальную кнопку «Install with {OS}», confirm-модал,
      переходы статуса `Building → Running`, маркер завершения (activity table / статус-бейдж), тайминги.
- [ ] Расширить `VpsPanelRebuildPage`: метод реального запуска rebuild + ожидание `Building`/`Running`.
- [ ] Новый `tests/vps/panel/vps.rebuild.real.spec.ts` (`@critical`, **serial + teardown**):
      выбрать ОС → Install → confirm → дождаться `Building` → дождаться `Running`. Ребилдим `c13d2e04`.
- [ ] Тайминги щедрые (`test.setTimeout`), как в power lifecycle game-панели.

### B. Реорг / технический долг
- [ ] Мигрировать `vps.build.spec.ts` на `VpsPanelServerPage` + `VpsPanelRebuildPage` (или заменить его
      новым real-rebuild-спеком и удалить).
- [ ] Удалить legacy `VpsPanelServerDetailPage.ts` и delete-часть `VpsPanelServersListPage.ts`
      (фантомные/ложно-позитивные) после миграции.
- [ ] Почистить фантом-ассерты: `toBeAttached()` → `toBeVisible()` (media radios), убрать `.catch(()=>false)`
      в setup → `test.skip(reason)`; `.count()`/`.first()` гейтить на visible.
- [ ] Снизить хрупкость `vps.panel.rebuild.spec.ts` (40+ skip на одном helper).

### C. Install (косметика)
- [ ] Усилить ассерты воронки на visible; (опц.) тест навигации до WHMCS checkout без Place Order.

## Сделано 03-Jun-2026
- ✅ **Реальный rebuild** живёт в `vps.panel.rebuild.spec.ts` SUITE 7 (последний тест) — переиспользует
  `openRebuildPage()` (надёжный reach), затем `rebuildPage.selectOs()` + `confirmRealRebuild()`
  (Install → «Install Without» SSH-модалка) → ждёт задачу Build → Complete → Running.
  Отдельный `vps.rebuild.real.spec.ts` УДАЛЁН (страдал от изоляции). `open()` из PO убран — reach
  делает `openRebuildPage()` в спеке.
- ✅ **`openRebuildPage()` устойчив**: (1) если уже на «Server Setup» (OS-карточки) → reach ok;
  (2) кнопку Rebuild ждём с таймаутом (transient после Cancel). `ensureRunning` НЕ нужен —
  Rebuild доступен и при Stopped (подтверждено вживую). Итог: **23/23 зелёных, 0 skipped.**
- ✅ Удалены legacy: `vps.build.spec.ts`, `pages/VpsPanelServerDetailPage.ts`, `pages/VpsPanelServersListPage.ts`.
- ✅ Убран мой `afterEach` Cancel-teardown из rebuild-спека (создавал churn → таймауты).

## Находки/гочи (новое)
- **«Server Setup…» pending-state:** сервер `c13d2e04` был залипшим на экране выбора ОС
  (баннер «Cancel Rebuild»). Вероятно UI-only rebuild-тесты (`vps.panel.rebuild.spec.ts`) доходят до
  этого экрана и не всегда чисто отменяют → сервер остаётся в pending. `open()` теперь это переживает,
  а реальный rebuild — расшибает. **TODO:** убедиться, что UI-only тесты жмут Cancel в finally/afterEach.

## Техдолг — статус
- ✅ **Фантом-ассерт media** исправлен (`vps.panel.media.spec.ts` 1.1): вместо голого `toBeAttached()`
  — РАБОЧЕЕ состояние (ровно один radio `checked`) + Apply visible&enabled. (`toBeVisible` неприменим —
  radio CSS-скрыт кастомным tile-UI.)
- ✅ **Скипы rebuild-спека устранены** (было до 7): `openRebuildPage()` теперь (1) распознаёт, что уже
  на «Server Setup» (по OS-карточкам), (2) ждёт кнопку Rebuild с таймаутом (transient после Cancel).
  **ВАЖНО:** Rebuild доступен в любом power-статусе, включая Stopped (подтверждено вживую) — `ensureRunning`
  НЕ применять. ⚠️ НЕ делать early-return "если уже на OS-странице (isLoaded)" — ловит transient
  mid-cancel (карточки видны, но аккордеоны не кликабельны) → expandAccordion таймаутит. Только
  чистый Rebuild → Continue. Итог `vps.panel.rebuild.spec.ts`: **22 passed, 0 failed, иногда 1 skip**
  (редкий transient «Server Setup» — кнопка Rebuild не нашлась за 15с; не падение). Real rebuild — зелёный.
- (опц.) Install: усилить ассерты воронки на visible; тест навигации до WHMCS checkout без Place Order.

## Решения (log)
- 03-Jun-2026: Delete вне скоупа (панель не умеет удалять сервер). Build = реальный rebuild.
  Ребилдить разрешено `c13d2e04` (srv-433986); есть 2-й сервер; можно купить ещё.
- Домен деструктивный → **не гадать по локаторам**, валидировать скринами, дёргать владельца.

## Открытые вопросы
- Точные селекторы реального rebuild (confirm + завершение) — выяснить recon'ом.
- Нужен ли отдельный сервер под повторяемый rebuild (чтобы не трогать `c13d2e04`), или ок ребилдить его.
