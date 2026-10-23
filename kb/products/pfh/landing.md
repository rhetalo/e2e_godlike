---
id: PFH/landing
title: Лендинг PlayFreeHost - вход, регистрация и создание бесплатного сервера
type: feature
product: PFH
status: draft
updated: 2026-10-23
verified_on: 2026-10-15        # live recon лендинга (Claude Browser, read-only)
tickets: []
flags: []
tests: []                      # автотестов нет
sources:
  - live recon https://playfreehost.com/ 15-Oct-2026 (из обзора kb/products/pfh/README.md)
  - memory: playfreehost-landing-qa (QA против DoD 10-Aug-2026)
  - test-docs/godlike.host/playfreehost-lang-ru-BUG.md
  - kb/products/bil/free-products.md
---

# Лендинг PlayFreeHost - вход, регистрация и создание бесплатного сервера

> **В двух словах.** `playfreehost.com` - одностраничный WordPress-сайт с одной целью: довести человека до
> бесплатного Minecraft-сервера. Любая главная кнопка открывает окно входа или регистрации, после входа
> пользователь уходит в биллинг godlike, где создаётся free-сервер (продукт 282). Управлять сервером он
> потом будет в [панели PFH](panel.md).

## Где в интерфейсе

| Блок | Что там | Источник |
|---|---|---|
| Hero | заголовок «Free Minecraft Server Hosting», кнопка CTA | recon 15-Oct |
| Шаги, тариф | как получить сервер, карточка бесплатного тарифа с кнопкой | recon 15-Oct |
| FAQ | аккордеон, 13 вопросов | recon 15-Oct |
| Финальный CTA | ещё одна кнопка создания сервера | recon 15-Oct |
| Шапка | на мобильном - бургер-меню | QA 10-Aug |
| Футер | ссылки Terms of Service, Privacy Policy, PayNow Terms | QA 10-Aug, recon 15-Oct |
| Окно «Sign in to continue» | поверх лендинга: вход (email + пароль + remember), регистрация (имя, email, пароль, согласие), reCAPTCHA, кнопки Google и Discord | recon 15-Oct |

Кнопки **CREATE MY FREE SERVER** / **GET FREE SERVER**: классы `.pfh-cta-button`, `.pfh-plan__button`, атрибуты
`data-pfh-open`, `data-pfh-destination`. Дизайн - Figma «Play free host» (landing_desktop / landing_mobile / popup).

## Как работает (под капотом)

1. Кнопка CTA открывает окно входа (`data-pfh-open`), куда вести после входа - в `data-pfh-destination`.
2. Вход по email и паролю или через соцсети: `panel.godlike.host/api/v2/social/{google|discord}/redirect`.
   Восстановление пароля - `godlike.host/clientarea/password/reset` (биллинг godlike).
3. После входа - `free_start.php?product=282&config=529&brand=pfh` в биллинге: создаётся бесплатный сервер на
   продукте 282 ([BIL/free-products](../bil/free-products.md)).
4. Дальше сервер живёт в [панели PFH](panel.md) (`playfreehost.com/panel`), бэкенд и аккаунты общие с godlike.

Аккаунт общий с godlike: регистрация на PFH - это клиент того же биллинга и той же панели ([BIL/free-products](../bil/free-products.md)).
Отличает ли что-то, кроме `brand=pfh` в ссылке, PFH-клиента от обычного - ❓ не проверено.

**Что поменялось с QA 10-Aug:** соц-вход раньше шёл через `godlike.host/clientarea/social_auth.php` (с `state=...free_start.php`
для возврата), теперь через API панели; в ссылку создания добавился `brand=pfh`; появились GTM и meta description.

## Правила и граничные случаи

1. **Один free-сервер на аккаунт:** у аккаунта, где уже есть фришка, второй не создаётся. Какой текст при этом видит
   пользователь на PFH - ❓ не проверено (на `/cart-free` витрины это `free_server_exists`, [BIL/free-products](../bil/free-products.md)).
2. **Согласие при регистрации ссылается на Terms / Privacy / PayNow**, а сами ссылки в футере ведут на `#` (см. ниже).
3. Ошибочные состояния входа и запуска (неверный пароль, сбой создания) извне не проверялись - ❓ (DoD 11 задачи лендинга).
4. Редактируемость контента в WP-админке не проверялась - ❓ (DoD 4).

## Открытые находки (recon 15-Oct-2026)

| Что | Статус |
|---|---|
| Футер Terms of Service, Privacy Policy, PayNow Terms ведут на `#`, хотя на них ссылается согласие при регистрации | открыто с 10-Aug |
| У всех 22 картинок нет `alt` | открыто с 10-Aug |
| `<html lang="ru-RU">` и `og:locale ru_RU` (Yoast SEO) на английской странице: SEO, скринридеры, предложение «перевести с русского» | новое 15-Oct, баг собран: [playfreehost-lang-ru-BUG.md](../../../test-docs/godlike.host/playfreehost-lang-ru-BUG.md), Jira-ключ ❓ |
| Аналитика | ✅ GTM появился (в августе была только Cloudflare Insights); доходят ли события воронки - ❓ не проверено |
| meta description | ✅ появился |
| CLS (Lighthouse) | ❓ не мерили |

## Гочи для тестирования

- **reCAPTCHA** на формах входа и регистрации: регистрацию автоматизировать нельзя, только руками.
- **Создание free-сервера - реальная услуга** в биллинге прода; делать только на тестовом аккаунте под задачу.
  Сервер, созданный через PFH: [srv:d716acea](../../registry/test-servers.md#d716acea).
- **Статусы быстро устаревают:** автор лендинга катит фиксы быстро, перед выводом «не исправлено» перепроверять live.
- Язык разметки смотреть в исходнике страницы (Ctrl+U), а не по тексту.

## Что проверять (минимальный регресс)

| Что | Ожидание |
|---|---|
| Вёрстка 1440 / 768 / 375 | без горизонтального скролла, картинки не битые, ошибок консоли нет |
| Бургер на мобильном, FAQ | открываются и закрываются |
| Каждая CTA-кнопка | открывает окно «Sign in to continue» |
| Кнопки Google / Discord | ведут на `panel.godlike.host/api/v2/social/google/redirect` и `.../social/discord/redirect` |
| Вход тестовым free-аккаунтом | переход на `free_start.php?product=282&config=529&brand=pfh` |
| Футер | Terms / Privacy / PayNow ведут на реальные страницы (сейчас нет) |
| Разметка | `lang` и `og:locale` английские (сейчас нет), у картинок есть `alt` (сейчас нет) |

## Покрытие

- **Автотестов нет.**
- Ручной QA против DoD 10-Aug-2026: вёрстка, адаптив, бургер, FAQ, кнопки не меньше 40px, webp + lazy - ✅; блокеры тогда - аналитика и мёртвый футер.
- Live recon 15-Oct-2026 (read-only).

## История

| Дата | Тикет | Что |
|---|---|---|
| 10-Aug-2026 | ❓ ключ задачи лендинга не записан | QA лендинга против DoD, reCAPTCHA добавлена после ревью |
| 15-Oct-2026 | - | Recon: соц-вход через API панели, `brand=pfh`, GTM, meta description; найден `lang="ru-RU"` |
