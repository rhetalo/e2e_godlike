---
name: live-recon
description: >-
  Read-only разведка живого DOM на godlike.host / vf-panel (VirtFusion) /
  ultra.panel (game panel) ПЕРЕД написанием Playwright-теста для нового экрана,
  таба или флоу. Используй, когда нужны реальные селекторы, структура формы,
  лейблы полей, статусы или save/load-поведение страницы, которая ещё НЕ
  задокументирована в agents.docs. Логинится через существующий auth-хелпер,
  выгружает контролы/лейблы/структуру, затем УДАЛЯЕТ пробу. Триггеры: «recon»,
  «разведка», «снять живой DOM», «какие там селекторы», «новый таб/экран не
  описан», «нужна структура формы перед тестом».
---

# Live DOM recon (read-only)

Цель: дёшево и безопасно снять реальную структуру живой страницы, чтобы написать
корректные локаторы и page object с первого раза. **Прод живой — только чтение.**

## 0. Сначала не делай recon зря

Проверь, не задокументировано ли уже:
- `agents.docs/<surface>/KNOWLEDGE_BASE.md` (vps-panel / game-panel);
- `utils/selectors.ts` (нужный селектор часто уже есть);
- существующий page object в `pages/` (`pages/game/*`, `VpsPanel*`).

Если структура уже описана — recon не нужен, бери оттуда.

## 1. Выбери auth и навигацию

| Surface | Auth-хелпер | Navи через |
|---|---|---|
| game panel (ultra.panel) | `utils/gameAuth.ts` (`loginAndSaveGameSession`, `GAME_STORAGE_STATE_PATH`, `GAME_SERVER_UUID`) | `GamePanelServerPage`/`...Page.open()` |
| vps panel (VirtFusion) | `utils/auth.ts` (`loginAndSaveSession`, `STORAGE_STATE_PATH`, `TEST_SERVER_UUID`) | `VpsPanelServerPage` |
| storefront | `fixtures/base.ts` | `page.goto()` (баннеры гасятся сами) |

## 2. Напиши ВРЕМЕННУЮ пробу (не настоящий тест)

`tests/<domain>/_recon.<thing>.temp.spec.ts`. Имя с префиксом `_recon.` и суффиксом
`.temp` — чтобы было очевидно, что это мусор на удаление. Залогинься через хелпер,
открой экран через page object (он сам гасит shepherd/cookie-оверлеи).

**Только чтение.** Никаких кликов, которые мутируют: не жать Save / Place Order /
Continue на оплате / Rebuild / Kill. Navи и `page.evaluate`-дампы — да.

## 3. Что выгружать (через `page.evaluate`, печатать маркерами `RECON_*`)

- **Контролы:** `input, select, textarea` → `{tag, type, name, id, class, placeholder, value, label}`.
- **Кнопки:** текст всех `button` (ищем Save/Apply/Reset/Delete — есть ли вообще сохранение).
- **Лейблы/строки:** для форм — текст строки-контейнера каждого поля (имя свойства/настройки).
- **Структура якоря:** для 1–2 ключевых полей — цепочку предков (`tag.class` по уровням) и
  `outerHTML` строки, чтобы найти СТАБИЛЬНЫЙ контейнер-локатор.

Печатай **однострочный** JSON (`JSON.stringify(x)` без отступов) — иначе `grep` порежет.

## 4. Гочи (иначе проба зависнет или даст мусорные локаторы)

- ⚠️ **`networkidle` не наступает** на страницах панели (живой websocket-консоль). Жди его
  ТОЛЬКО ограниченно: `page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(()=>{})`.
  Без таймаута — вечное ожидание до таймаута теста.
- ⚠️ **Динамические Vuetify-id** (`input-v-131`, `switch-v-109`) меняются между перезагрузками —
  как селекторы НЕПРИГОДНЫ. Якорь — видимый лейбл/текст или стабильный BEM-класс
  (`.server__config-switch`, `.server__file-manager__*`).
- Дай Vue отрендерить: дожидайся конкретного элемента (`locator.waitFor`), а не «поспать».
  В одноразовой пробе допустим `waitForTimeout` (это не тест), но в финальном коде — нет.

## 5. Прогон и итерации

```bash
npx playwright test tests/<domain>/_recon.<thing>.temp.spec.ts --reporter=line 2>&1 | grep -E "RECON_|passed|failed"
```

Каждый прогон ≈ 1+ мин (логин + навигация). **Минимизируй число проходов** — собирай за
один проход всё, что нужно. Если режешь вывод `grep`'ом, не потеряй многострочный JSON
(печатай однострочным).

## 6. Прибраться и зафиксировать

1. **УДАЛИ пробу** (`rm tests/<domain>/_recon.*.temp.spec.ts`). Никогда не коммить её
   (см. память: scratch-probe-convention).
2. Запиши находки в `agents.docs/<surface>/KNOWLEDGE_BASE.md` с пометкой даты
   («подтверждено DOM <дата>») — селекторы, save-механизм, статусы, гочи.
3. Добавь селекторы в `utils/selectors.ts` (новый/существующий блок) с датированным
   комментарием-источником.

Дальше — обычный workflow: page object (по образцу `GamePanelFilesPage`/`VpsPanelServerPage`)
→ селекторы → спек с `test.step` и web-first ассертами.
