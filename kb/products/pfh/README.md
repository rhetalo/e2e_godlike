---
id: PFH
title: PFH - PlayFreeHost (бесплатный Minecraft-хостинг)
type: product-overview
product: PFH
status: draft
updated: 2026-10-23
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

| Часть | Что | Страница |
|---|---|---|
| Лендинг `playfreehost.com` | WordPress, одна страница: hero «Free Minecraft Server Hosting», шаги, тариф, FAQ (13 вопросов), финальный CTA | [PFH/landing](landing.md) |
| Вход и регистрация | окно «Sign in to continue» поверх лендинга: email + пароль, регистрация, reCAPTCHA, Google и Discord | [PFH/landing](landing.md) |
| Создание сервера | CTA ведут в биллинг `free_start.php?product=282&config=529&brand=pfh` | [PFH/landing](landing.md), [BIL/free-products](../bil/free-products.md) |
| Панель `playfreehost.com/panel` | копия ultra.panel для free-пользователей, аккаунты синхронны, свой деплой фронта | [PFH/panel](panel.md), [UP/free-servers](../up/free-servers.md) |

## Как работает (под капотом)

1. Кнопка CTA на лендинге открывает окно входа; вход по email или через Google / Discord (API панели).
2. После входа - `free_start.php?product=282&config=529&brand=pfh` в биллинге: создаётся бесплатный сервер (продукт 282).
3. Сервером клиент управляет в `playfreehost.com/panel` (бэкенд общий с ultra.panel).

Подробно, с эндпоинтами и тем, что поменялось с QA 10-Aug: [PFH/landing](landing.md#как-работает-под-капотом).

## Правила и граничные случаи

1. **Фронт панели PFH деплоится отдельно и может отставать** от ultra.panel: так было с
   [DEV-563/BUG-1](../../tickets/DEV-563.md#находки). Подробно: [PFH/panel](panel.md#правила-и-граничные-случаи).
2. **Все ограничения free** (запрет смены игры) действуют и здесь - бэкенд общий ([UP/free-servers](../up/free-servers.md)).

## Открытые находки

Таблица находок лендинга (футер на `#`, нет `alt`, `lang="ru-RU"`, аналитика): [PFH/landing](landing.md#открытые-находки-recon-15-oct-2026).

## Гочи для тестирования

- reCAPTCHA на формах: автоматизировать регистрацию нельзя, только вручную ([PFH/landing](landing.md#гочи-для-тестирования)).
- Создание free-сервера - реальная услуга в биллинге; у аккаунта с фришкой второй не создаётся.
- Свежесть фронта панели PFH: `Last-Modified` у `playfreehost.com/panel/assets/index-*.js` ([PFH/panel](panel.md#гочи-для-тестирования)).
- Тестовые free-серверы - в [реестре](../../registry/test-servers.md#d716acea) ([srv:d716acea](../../registry/test-servers.md#d716acea) создан через PFH).

## Покрытие

- **Автотестов нет.** Ручной QA лендинга 10-Aug-2026 и recon 15-Oct ([PFH/landing](landing.md#покрытие)), панели - [DEV-563](../../tickets/DEV-563.md) ([PFH/panel](panel.md#покрытие)).
