---
id: BIL/accounts
title: Аккаунты клиентов - регистрация, вход, соцсети
type: feature
product: BIL
status: draft
updated: 2026-10-18
verified_on: 2026-10-13        # маркетинг-согласие аккаунтов Free Gift - 13-Oct (DEV-455)
tickets: [DEV-455, DEV-402]
flags: []
tests: [tests/general/registration-flow.spec.ts, tests/general/login.validation.spec.ts]
sources:
  - kb/products/bil/README.md (Как устроено, Правила 1, 4, 5, гоча 4)
  - шапки tests/general/registration-flow.spec.ts, login.validation.spec.ts
  - kb/tickets/DEV-455.md, DEV-402.md; memory: dev455-free-server-gift, playfreehost-landing-qa
---

# Аккаунты клиентов - регистрация, вход, соцсети

> **В двух словах.** Клиент - это аккаунт WHMCS. Зарегистрироваться или войти можно в блоке авторизации прямо в
> корзине (email и пароль или Google, Discord, Twitch, Apple), на `register.php` биллинга или через попап
> Free Server Gift. После входа корзина переходит к выбору периода (step 2).

## Где в интерфейсе

- Блок авторизации в Vue-корзине: `.auth-page` (новая воронка с 20-Aug-2026, [DEV-402](../../tickets/DEV-402.md)) или `.auth-block`
  (старая `/cart/`); вкладки входа и регистрации, кнопки Google / Discord / Twitch / Apple.
- `godlike.host/clientarea/register.php`, `social_auth.php`.
- Попап Free Server Gift: регистрация или вход → второй попап «Твой сервер готов» ([WPGL/promo](../wpgl/promo.md)).

## Как работает (под капотом)

- В WHMCS два разных ID: `tblusers.id` (пользователь) и client id (`userid` в админке). `user_id` в `free_gift_status` - это `tblusers.id`.
- В блоке авторизации формы входа и регистрации лежат в DOM обе сразу (`v-show`), поля адресуются по id (`#loginFormEmail`, `#registerFormEmail`...).

## Правила и граничные случаи

1. Пустая или неверная отправка формы входа в корзине не переводит на step 2.
2. На корзине нет страницы `/clientarea/login` (404) - валидация только в блоке корзины.
3. **На `register.php` нет поля маркетинг-согласия,** а аккаунты из попапа Free Gift получили «Opted Out from Marketing Emails» (13-Oct, ❓ не закрыто).
4. **PHP Fatal (memory 512 МБ)** в `clientarea.php` у одного нового аккаунта, хук `ClientAreaFooterOutputHook.php:38` (24-Sep, не воспроизводится 08-Oct).
5. Новая регистрация из попапа размечалась как `sign_in` - исправлено ([DEV-455/F-05](../../tickets/DEV-455.md#находки)).

## Гочи для тестирования

- **`registration-flow` создаёт реального пользователя** на проде; креды ротируются (30 записей).
- **Капча WHMCS** в окне Playwright отбивает первую отправку формы.
- **Мигающий auth-block** при валидной сессии - ждать URL `step=2`, логиниться, только если блок держится.
- Скрытая форма в DOM: `.first()` по типу инпута может взять невидимую форму - только id-селекторы из `AUTH.any*`.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Регистрация при оформлении тарифа | `registration-flow.spec.ts` | ✅ |
| Пустая / неверная отправка входа не ведёт на step 2 | `login.validation.spec.ts` | ✅ |
| Вход через соцсети (Google, Discord, Twitch, Apple) | не покрыто | ❌ |
| `register.php`, маркетинг-согласие | только ручной QA [DEV-455](../../tickets/DEV-455.md) | ❌ авто нет |

## История

| Дата | Тикет | Что |
|---|---|---|
| 20-Aug-2026 | [DEV-402](../../tickets/DEV-402.md) | Новая воронка со своим блоком `.auth-page` |
| 24-Sep..13-Oct-2026 | [DEV-455](../../tickets/DEV-455.md) | Регистрация из попапа Free Gift, находки по `sign_in` и маркетинг-согласию |
