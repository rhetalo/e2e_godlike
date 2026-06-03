# VPS Test Coverage Analysis
**Дата анализа:** 2026-06-02  
**Аналитик:** AI Agent  
**Цель:** Сопоставить существующие E2E-тесты с требованием задачи:  
> _"Покрыть автоматизированными тестами сценарии: Install, Build, Delete VPS.  
> Критерии приёмки: все 3 сценария покрыты, интегрированы в dev-процесс, любой сбой сигнализирует о баге."_

---

## TL;DR — Статус по критериям приёмки

| Сценарий       | Статус          | Файл(-ы)                                                | Комментарий                                                    |
|----------------|-----------------|---------------------------------------------------------|----------------------------------------------------------------|
| **Install VPS**| ✅ Покрыт (частично) | `vps.funnel.spec.ts`                               | Воронка до checkout: landing → billing → configure → NEXT STEP |
| **Build VPS**  | ✅ Покрыт (частично) | `vps.build.spec.ts`, `vps.panel.rebuild.spec.ts`   | UI rebuild-флоу + OS selection; деструктив отменяется Cancel  |
| **Delete VPS** | ❌ НЕ покрыт    | _(нет теста)_ / `VpsPanelServersListPage.ts` (PO есть) | Page object готов, тест не написан                             |

**Критерий "все 3 сценария покрыты" — НЕ ВЫПОЛНЕН.** Delete VPS отсутствует.

---

## 1. Install VPS — Воронка покупки

**Интерпретация:** «Install» = прохождение воронки покупки VPS (landing → cart → configure → checkout).  
Полного end-to-end до реального создания сервера нет — это невозможно в автоматическом тесте без реальной оплаты и не нужно для CI.

### Файл: `tests/vps/funnel/vps.funnel.spec.ts` (742 строки)

#### Suite 1 — VPS Landing Page (`/vps-hosting/`)
| # | Тест | Что проверяет | Статус |
|---|------|---------------|--------|
| 1 | страница загружается, кнопки Deploy Now видны | `count >= 1` Deploy Now кнопок | ✅ |
| 2 | у каждой кнопки Deploy Now есть корректный href с productId | `href` содержит `/cart-vps` + `productId=\d+` | ✅ |
| 3 | клик Deploy Now ведёт в /cart-vps/ и монтирует Vue SPA | URL `/cart-vps` + `[data-v-app]` видим | ✅ |

#### Suite 2 — Billing Cycle Step (`/cart-vps/`)
| # | Тест | Что проверяет | Статус |
|---|------|---------------|--------|
| 4 | шаг биллинга загружается — 4 периода видны | 1 Month, 3 Months, 6 Months, 12 Months | ✅ |
| 5 | у каждого периода есть дисконтированная цена | `.period__price-primary_amount` ненулевая | ✅ |
| 6 | у каждого периода есть badge скидки | `.period__discount` содержит `\d+%` | ✅ |
| 7 | клик по периоду обновляет Billing cycle в order summary | `billingCaption` содержит выбранный период | ✅ |
| 8 | общая стоимость — ненулевая, меняется при смене периода | 12M > 1M по общей сумме | ✅ |
| 9 | кнопка NEXT STEP видна и активна | `.order__button-order` visible + enabled | ✅ |

#### Suite 3 — Configure Your Server (step=3)
| # | Тест | Что проверяет | Статус |
|---|------|---------------|--------|
| 10 | шаг конфигурации загружается — локации видны | `count >= 1` локаций | ✅ |
| 11 | доступны локации USA и Europe | оба текста присутствуют | ✅ |
| 12–N | OS selection (8 типов), version dropdowns, promo-цены, NEXT STEP | (детали в файле строки 380–742) | ✅ |

#### Граница покрытия
- ✅ Воронка полностью проверена **до нажатия финального NEXT STEP** на шаге Configure (переход в WHMCS checkout).
- ❌ Переход в `/clientarea/cart.php?a=checkout` и финальный `Place Order` **не тестируются** — это правильно, т.к. создало бы реальный заказ.
- ❌ Фактическое появление VPS в панели после оплаты не тестируется (out of scope для E2E).

**Вывод по Install:** Критерий _"любой сбой сигнализирует о баге"_ выполнен — если сломается landing, cart, billing или configure-шаг, тест упадёт.

---

## 2. Build VPS — Пересборка (Rebuild) существующего сервера

**Интерпретация:** «Build» = операция Rebuild (переустановка ОС) на существующем VPS в панели VirtFusion.  
Реальный Rebuild не выполняется — тест проверяет UI и отменяет через Cancel, чтобы не разрушить тестовый сервер.

### Файл A: `tests/vps/panel/vps.build.spec.ts`

Устаревший файл, использует старые page objects (`VpsPanelServerDetailPage`, `VpsPanelServersListPage`).  
Помечен к миграции/удалению в `AGENT_HANDOFF.md`.

| Шаг | ID   | Тест | Что проверяет |
|-----|------|------|---------------|
| T2.1 | Login + servers list | `/servers` загружается, Manage button видна | Навигация |
| T2.2 | Server detail | Manage → `/server/` открылся | Навигация |
| T2.3 | Server name | Имя сервера присутствует на странице | UI |
| T2.4 | Server status | Статус = Running/Stopped/Paused/Building | UI |
| T2.5 | **Rebuild action** | Кнопка Rebuild найдена, клик открывает модал | ✅ Rebuild UI |
| T2.6 | **Rebuild OS select** | В модале виден список OS + версии | ✅ Rebuild UI |

**Ограничения файла:**
- T2.5/T2.6 не нажимают финальную кнопку подтверждения Rebuild — Cancel.
- Использует угаданные/устаревшие селекторы (`VpsPanelServerDetailPage`).
- Кандидат на удаление или миграцию на `VpsPanelServerPage`.

---

### Файл B: `tests/vps/panel/vps.panel.rebuild.spec.ts` ← **Основной**

Новый, актуальный файл, использует `VpsPanelServerPage` + `VpsPanelRebuildPage`.

| Suite | Тест | Что проверяет | Статус |
|-------|------|---------------|--------|
| Suite 1 — Навигация | вкладка Rebuild присутствует | tab видна | ✅ |
| Suite 1 | клик Rebuild → URL содержит UUID | навигация | ✅ |
| Suite 1 | страница Rebuild загружается (h2/h3 заголовок) | заголовок виден | ✅ |
| Suite 2 — OS категории | все 8 OS-типов видны | Ubuntu, Debian, AlmaLinux, Rocky, CentOS, Fedora, Windows, Custom | ✅ |
| Suite 2 | клик по OS-категории → она активна | `active` CSS класс | ✅ |
| Suite 2 | смена OS-категории обновляет dropdown версий | dropdown обновляется | ✅ |
| Suite 3 — Версии ОС | Ubuntu 24 LTS видна и выбираема | конкретная версия | ✅ |
| Suite 3 | выбор версии → кнопка Rebuild доступна | button enabled | ✅ |
| Suite 3 | кнопка Rebuild существует на странице | локатор найден | ✅ |
| Suite 3 | клик Rebuild → модал подтверждения открывается | modal visible | ✅ |
| Suite 3 | модал содержит предупреждение о потере данных | текст предупреждения | ✅ |
| Suite 3 | **Cancel в модале НЕ запускает Rebuild** | модал закрыт, страница не изменилась | ✅ (guard) |

**Граница покрытия Rebuild:**
- ✅ Весь UI-флоу Rebuild покрыт: OS selection → version → button → modal → warning.
- ❌ Финальный клик `Rebuild` (подтверждение) **намеренно не тестируется** — разрушил бы тестовый сервер.
- ⚠️ Нет проверки, что после реального Rebuild сервер переходит в статус `Building` → `Running` (потребует изолированного тестового окружения).

**Вывод по Build:** Критерий _"любой сбой сигнализирует о баге"_ выполнен для UI-части — если Rebuild-вкладка, OS-выбор или модал сломаются, тест упадёт.

---

## 3. Delete VPS — Удаление сервера

### Статус: ❌ НЕ ПОКРЫТ

**Ни один тест не проверяет Delete-флоу.**

#### Что есть в кодовой базе

**Page Object готов:** `pages/VpsPanelServersListPage.ts`

```
Реализованы локаторы:
  deleteButton(index)        — кнопка Delete на строке в /servers
  deleteModal                — модал подтверждения
  deleteModalTitle           — "Delete Server"
  deleteModalBody            — "Are you sure you want to delete this server?"
  deleteModalCancelButton    — Cancel в модале
  deleteModalConfirmButton   — Confirm/Delete в модале
  successToast               — "Server deleted successfully"
  errorToast                 — "Server could not be deleted"

Реализован метод:
  clickDelete(index)         — клик Delete + ожидание открытия модала
```

**Что НЕ реализовано:**
- Тест-файл `vps.panel.delete.spec.ts` — **отсутствует**.
- В `vps.panel.server.spec.ts` Suite 5 (Servers List) — только проверки имени, закладок, вкладок; Delete не тестируется.
- В `vps.build.spec.ts` — `VpsPanelServersListPage` импортируется, но используется только для навигации (T2.1).

#### Историческая причина отсутствия теста

В `agents.docs/AGENT_HANDOFF.md` (строка ~467) указано:
> _"Suite 5 (Servers List): Delete тест убран — кнопка Delete существует только в `#deleteBackupModal` (скрытый модал), не на странице списка."_

Это означает, что ранее была попытка написать тест Delete, но выяснилось, что UI на `/servers` **не показывает кнопку Delete** (или она ведёт к удалению бэкапа, а не сервера). Точная точка в интерфейсе, откуда удаляется VPS, не подтверждена актуальными HTML-снимками.

#### Что нужно для реализации Delete-теста

1. **Выяснить точку входа:** найти в живом UI место, где удаляется сервер:
   - `/servers` список → кнопка Delete (если существует)
   - Страница сервера `/server/{UUID}` → Settings/Options → Delete/Terminate
   - Sidebar → Protect Server → Unprotect → Delete

2. **Решить проблему тестовых данных:** реальный Delete уничтожает сервер → нужен либо:
   - Отдельный **ephemeral тестовый сервер** (создаётся в beforeAll, удаляется в тесте)
   - **Мок/stub** — нереально для VirtFusion (нет API mock)
   - **UI-only тест с Cancel** (аналогично Rebuild) — проверяет модал но не фактическое удаление

3. **Минимальный тест (Cancel-guard):**
   ```
   1. Перейти на /servers
   2. Найти строку тестового сервера
   3. Нажать Delete → убедиться что модал открылся
   4. Проверить заголовок "Delete Server" и текст предупреждения
   5. Нажать Cancel → убедиться что модал закрылся, сервер остался в списке
   ```
   Это покрывает UI-флоу без деструктивного действия.

---

## 4. Дополнительное покрытие (за рамками 3 сценариев)

Реализованные тесты, не относящиеся напрямую к Install/Build/Delete, но важные для стабильности VPS-продукта:

| Файл | Область | Тестов |
|------|---------|--------|
| `vps.panel.server.spec.ts` | Dashboard nav, server detail, power controls smoke, tab nav, servers list | ~15 |
| `vps.panel.power.actions.spec.ts` | Shutdown / Boot / PowerOff / Restart — state transitions + modal flows | ~12 |
| `vps.panel.rebuild.spec.ts` | Rebuild tab, OS categories, version selection, confirm modal | ~10 |
| `vps.panel.login.spec.ts` | Panel login, session, auth redirect | ~5 |
| `vps.panel.network.spec.ts` | Network tab, IPv4, stats chart, reverse DNS modal, DNS resolver | ~5 |
| `vps.panel.storage.spec.ts` | Storage tab, disk card (Drive letter + GB size) | ~2 |
| `vps.panel.media.spec.ts` | Boot order HDD↔CD/DVD change + teardown | ~2 |
| `vps.panel.options.spec.ts` | VNC toggle, Reset Password modal, BIOS/UEFI settings | ~8 |
| `vps.build.spec.ts` | (Устарел) Login + servers list + rebuild smoke | ~6 |

---

## 5. Соответствие критериям приёмки

| Критерий | Выполнен? | Детали |
|----------|-----------|--------|
| Все 3 сценария покрыты | ❌ **Нет** | Delete VPS не покрыт |
| Интегрированы в dev-процесс | ✅ Да | Тесты в репо, запускаются через `npx playwright test` |
| Любой сбой сигнализирует о баге | ✅ Да (Install, Build) | Падение = реальная проблема |
| Любой сбой сигнализирует о баге | ❌ Нет (Delete) | Нет теста → баг не обнаруживается |

---

## 6. Приоритет следующих шагов

### P1 — Обязательно для закрытия задачи
1. **Написать `vps.panel.delete.spec.ts`**  
   Минимально: Cancel-guard тест (открыть Delete модал, проверить контент, отменить).  
   Файл `VpsPanelServersListPage.ts` с PO готов — нужен только spec-файл.  
   **Блокер:** сначала подтвердить в живом UI, где именно находится кнопка Delete для сервера.

### P2 — Желательно
2. **Мигрировать `vps.build.spec.ts`** на `VpsPanelServerPage` + `VpsPanelRebuildPage`, удалить устаревшие PO (`VpsPanelServerDetailPage`, `VpsPanelServersListPage` если Delete не нужен).
3. **Добавить в `vps.funnel.spec.ts`** финальный тест навигации до WHMCS checkout (без Place Order — проверить только что страница загрузилась).

### P3 — Технический долг
4. Уточнить статус `Protect Server` (feature-flag?) — добавить тест когда функция станет доступна.
5. Добавить тест реального Rebuild в изолированном окружении с ephemeral-сервером.

---

## Приложение: Карта файлов

```
tests/vps/
├── funnel/
│   └── vps.funnel.spec.ts          ← Install VPS (воронка покупки)
└── panel/
    ├── vps.build.spec.ts            ← Build VPS smoke (УСТАРЕЛ, к миграции)
    ├── vps.panel.login.spec.ts      ← Auth
    ├── vps.panel.media.spec.ts      ← Boot order
    ├── vps.panel.network.spec.ts    ← Network tab
    ├── vps.panel.options.spec.ts    ← VNC, Password, Settings
    ├── vps.panel.power.actions.spec.ts  ← Power controls (детальные)
    ├── vps.panel.rebuild.spec.ts    ← Build VPS (основной, актуальный)
    ├── vps.panel.server.spec.ts     ← Server page structure + nav
    └── vps.panel.storage.spec.ts    ← Storage tab
    ← ОТСУТСТВУЕТ: vps.panel.delete.spec.ts  ❌

pages/
├── VpsPanelServersListPage.ts       ← PO с Delete modal локаторами (готов)
└── ... (остальные PO)
```
