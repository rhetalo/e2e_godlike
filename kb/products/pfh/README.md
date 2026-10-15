---
id: PFH
title: PFH - PlayFreeHost (бесплатный Minecraft-хостинг)
type: product-overview
product: PFH
status: draft
updated: 2026-10-15
verified_on: 2026-10-15        # live recon лендинга (Claude Browser, read-only)
tickets: [DEV-563]
flags: []
tests: []                      # автотестов нет
sources:
  - live recon https://playfreehost.com/ 15-Oct-2026 (Claude Browser - Playwright MCP был занят)
  - kb/tickets/DEV-563.md
  - memory: playfreehost-landing-qa (QA 10-Aug-2026), dev563-free-egg-lock
---

# PFH - PlayFreeHost (бесплатный Minecraft-хостинг)

> **В двух словах.** PlayFreeHost - отдельный бренд для бесплатных Minecraft-серверов. Это лендинг на
> WordPress с одной задачей: зарегистрировать или залогинить пользователя и создать ему бесплатный
> сервер. Под капотом всё общее с godlike: тот же free-продукт 282 в биллинге и та же игровая панель
> (копия ultra.panel на `playfreehost.com/panel`).

## Из чего состоит

| Часть | Что | Источник |
|---|---|---|
| Лендинг `playfreehost.com` | WordPress, одна страница: hero «Free Minecraft Server Hosting», шаги, тариф, FAQ (13 вопросов), финальный CTA | recon 15-Oct |
| Вход и регистрация | окно «Sign in to continue» поверх лендинга: email + пароль (+ remember), регистрация (имя, email, пароль, согласие), reCAPTCHA, Google и Discord | recon 15-Oct |
| Создание сервера | CTA ведут в биллинг `free_start.php?product=282&config=529&brand=pfh` | recon 15-Oct, [BIL](../bil/README.md#free-продукты) |
| Панель `playfreehost.com/panel` | копия ultra.panel для free-пользователей, аккаунты синхронны, свой деплой фронта | [DEV-563](../../tickets/DEV-563.md), [UP/free-servers](../up/free-servers.md) |

## Как работает (под капотом)

1. Кнопки **CREATE MY FREE SERVER** / **GET FREE SERVER** (`.pfh-cta-button`, `.pfh-plan__button`, атрибуты `data-pfh-open`, `data-pfh-destination`) открывают окно входа.
2. Вход: форма email + пароль или соцсети - `panel.godlike.host/api/v2/social/{google|discord}/redirect`. Восстановление пароля - `godlike.host/clientarea/password/reset`.
3. После входа - `free_start.php?product=282&config=529&brand=pfh` в биллинге: создаётся бесплатный сервер (продукт 282).
4. Сервером клиент управляет в `playfreehost.com/panel` (бэкенд общий с ultra.panel).

**Изменилось с QA 10-Aug:** соц-вход раньше шёл через `godlike.host/clientarea/social_auth.php`, теперь через API панели; появились GTM и meta description.

## Правила и граничные случаи

1. **Фронт панели PFH деплоится отдельно и отстаёт:** на 15-Oct собран 30-Sep, без [new-panel!558](https://git.godlike.ovh/panel/godlike-new-panel/-/merge_requests/558) -
   у free видны поля смены игры, Save → 403 ([DEV-563/BUG-1](../../tickets/DEV-563.md#находки)).
2. **Все ограничения free** (запрет смены игры) действуют и здесь - бэкенд общий ([UP/free-servers](../up/free-servers.md)).

## Открытые находки (recon 15-Oct-2026)

| Что | Статус |
|---|---|
| Футер Terms of Service, Privacy Policy, PayNow Terms ведут на `#`, хотя на них ссылается согласие при регистрации | открыто с 10-Aug |
| У всех 22 картинок нет `alt` | открыто с 10-Aug |
| `<html lang="ru-RU">` на английской странице (влияет на SEO и скринридеры) | новое 15-Oct ❓ завести баг |
| Аналитика | ✅ GTM появился (в августе была только Cloudflare Insights); доходят ли события воронки - ❓ не проверено |
| meta description | ✅ появился |

## Гочи для тестирования

- reCAPTCHA на формах: автоматизировать регистрацию нельзя, только вручную.
- Создание free-сервера - реальная услуга в биллинге; у аккаунта с фришкой второй не создаётся.
- Свежесть фронта панели PFH: `Last-Modified` у `playfreehost.com/panel/assets/index-*.js`.
- Тестовые free-серверы - в [реестре](../../registry/test-servers.md#d716acea) ([srv:d716acea](../../registry/test-servers.md#d716acea) создан через PFH).

## Покрытие

- **Автотестов нет.** Ручной QA лендинга 10-Aug-2026 (вёрстка 1440 / 768 / 375 без горизонтального скролла, бургер, FAQ), панели - [DEV-563](../../tickets/DEV-563.md).
