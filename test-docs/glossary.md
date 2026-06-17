# Глоссарий доменных терминов

Словарь терминов godlike.host и панелей. Две роли: (1) единый язык для людей в кейсах
и баг-репортах; (2) **контекст для ИИ-агента** — по практике РГС IT, явный словарь резко
повышает качество генерации тест-кейсов и снижает «выдуманные» термины/селекторы.

Правило: новый доменный термин, встретившийся в кейсе/спеке, — сначала сюда.

## Продукты и панели

| Термин | Что это |
|--------|---------|
| **godlike.host** | Витрина (storefront) хостинга игровых серверов и VPS. Маркетинг-баннеры, cookie/promo-модалки (обрабатываются в `fixtures/base.ts`). |
| **vf-panel.godlike.host** | Панель управления VPS на **VirtFusion**. Без маркетинг-баннеров. PO-эталон — `VpsPanelServerPage`. |
| **ultra.panel** | Панель управления **игровым** сервером (game panel). Тесты в `tests/game/panel/`. |
| **VirtFusion** | Стороннее ПО виртуализации/панели VPS. Своя специфика: статусы в КАПСЕ (`RUNNING`/`STOPPED`), Vue-гидрация. |

## Витрина / покупка

| Термин | Что это |
|--------|---------|
| **Funnel / воронка** | Сквозной флоу покупки (выбор → конфигурация → корзина → оплата). `tests/funnels/`, `tests/vps/funnel/`. |
| **Tariff / тариф** | Карточка тарифа на витрине (`StorefrontTariffCard`). |
| **Seed** | Minecraft-сид; на сайте есть калькуляторы сидов (`tests/modded/*calculator*`, `slider.seed`). |
| **Modpack / modded** | Модовые сборки Minecraft. `tests/modded/`. Корзина `/cart-modded-new` — отдельный UI (не `CartPage`). |
| **Slots / RAM / Days** | Параметры конфигурации игрового сервера (слоты игроков / память / срок). |
| **Promo / промокод** | Промокод. Динамический, может меняться на проде — проверять структурно, не точную копию. |
| **Stripe** | Платёжный провайдер. Поля карты — в iframe (`StripeCardFields` + `utils/iframe-helper.ts`). **Оплату не трогаем без явного решения.** |

## Панель / VPS-операции

| Термин | Что это |
|--------|---------|
| **Power actions** | Boot / Shutdown / Reboot сервера. Stateful, serial, recovery в `afterAll`. |
| **Rebuild** | Переустановка ОС на VPS. Деструктив — отдельный risk-decision. |
| **Throttling webhook** | Вебхук троттлинга CPU (`panel.godlike.host/api/v2/webhook/throttling`, без auth, Minecraft-only). UI — модалка «Lag Detected» + апгрейд. |

## Тестовая инфраструктура

| Термин | Что это |
|--------|---------|
| **PO (Page Object)** | Класс экрана в `pages/*.ts`. Драйвим UI через PO, не сырыми локаторами в спеке. |
| **Component Object** | Переиспользуемый компонент в `components/*.ts` (Header, Footer, CookieBanner, SeedCard…). |
| **storageState** | Сохранённая Playwright-сессия авторизации (`storageState.panel.json` и т.п.). `utils/auth.ts`. |
| **qa-gate / qa-postedit** | Хуки качества: `qa-gate.mjs` (tsc+eslint перед commit/push), `qa-postedit.mjs` (eslint изменённого файла после правки). |
| **Tags** | `@smoke` / `@critical` / `@regression` / `@flaky` — см. `agents.docs/TEST_GUIDELINES.md` §5.5–5.7. |
| **@flaky / карантин** | Известный нестабильный тест, выведенный из гейтящего прогона (`npm run test:quarantine`). Видимый долг. |
