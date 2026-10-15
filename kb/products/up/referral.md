---
id: UP/referral
title: Referral - реферальная программа в панели
type: feature
product: UP
status: draft
updated: 2026-10-15
verified_on: 2026-06-19        # live DOM реф-ссылки
tickets: []
flags: [affiliate-banner]
tests: [tests/game/panel/referral.spec.ts]
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §7g (recon 06..19-Jun-2026)
---

# Referral - реферальная программа в панели

> **В двух словах.** Страница Referral показывает клиенту его реферальную ссылку, баланс от приглашённых
> и кнопку вывода денег. Ссылка ведёт на партнёрку `affiliate.godlike.host` (продукт AFF). Это глобальная
> страница аккаунта, не конкретного сервера.

## Где в интерфейсе

- Глобальный сайдбар → **Referral Program** (`/referral`). KB §7g.
- Секции: **Referral Program**, **Share with Friends** (реф-ссылка `https://affiliate.godlike.host/ref/<code>` только для чтения +
  **Copy Link**), баланс и **Request Withdrawal**, кнопки соцсетей, «How It Works?» (3 шага), «Referrals Analytics».

## Как работает (под капотом)

- Реф-код в ссылке - UUID (`/ref/<UUID>`). Как начисляется вознаграждение и как работает вывод - ❓ не описано (продукт AFF без страницы).
- Флаг [flag:affiliate-banner](../../registry/flags.md#affiliate-banner) включён, но что он гейтит - ❓ (возможно, баннер партнёрки).

## Гочи для тестирования

- **Request Withdrawal не жать** - вывод денег.
- Реф-ссылку читать из `.link-card__input input` (сам `<input>` внутри обёртки `div`); старый селектор матчил пустую ноду.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Реф-ссылка с реальным кодом, Copy Link, How It Works | `referral.spec.ts` (REF-001) | ✅ структурно |
| Начисления, вывод | не покрыто (деньги) | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 06-Jun-2026 | - | Recon страницы, KB §7g |
| 19-Jun-2026 | - | Уточнён селектор реф-ссылки, REF-001 проверяет реальный код |
