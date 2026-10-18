---
id: WPGL/header-navigation
title: Шапка, футер, навигация и SEO витрины
type: feature
product: WPGL
status: draft
updated: 2026-10-18
verified_on: 2026-10-15        # меню - live recon MCP godlike-wp; SEO / footer / mobile - recon 15-Jun
tickets: []
flags: []
tests: [tests/general/storefront.breadth.spec.ts, tests/general/valid.links.spec.ts, tests/general/smoke.pages.spec.ts]
sources:
  - kb/products/wpgl/README.md (Шапка и меню, live 15-Oct)
  - шапки tests/general/storefront.breadth.spec.ts, valid.links.spec.ts, smoke.pages.spec.ts
  - memory: prod-regressions-22jul, storefront-locale-coverage
---

# Шапка, футер, навигация и SEO витрины

> **В двух словах.** Каркас сайта godlike.host: шапка с меню (игры, PRO-хостинг, ссылки на панели), футер с
> юридическими страницами и соцсетями, мобильная навигация и SEO-теги страниц. Тесты проверяют, что ключевые
> страницы открываются, внутренние ссылки живые, а теги и навигация на месте. Язык и валюта в шапке - отдельная
> страница [WPGL/locale-currency](locale-currency.md).

## Где в интерфейсе

- Шапка: Host now, Minecraft Server Hosting, Game servers, PRO Hosting, More, Admin Panels, язык и валюта -
  подробно в [обзоре WPGL](README.md#шапка-и-меню-live-15-oct).
- Футер: Modded, Seeds, Seed Map, конструктор модпаков, страницы игр, вход в биллинг и панель, Discord, тикет,
  About, Reviews, Contact us, Privacy и Terms.
- Мобильная ширина: десктопное меню скрыто, своя мобильная навигация.

## Как работает (под капотом)

- **Меню хранится в двух местах:** конструктор меню темы (опции `_crb_header_menu_*_<locale>`) и меню WordPress
  как запасной вариант. Ссылки, зашитые в файлы темы, правятся только деплоем.
- Кеш: WP Rocket чистится кодом, Cloudflare - только руками; правку меню HTTP-запросом сразу не увидеть.

## Правила и граничные случаи

1. Несуществующая страница отдаёт **404, а не 500**.
2. SEO-теги (title, description, canonical, OpenGraph, `h1`) проверяются структурно на ключевых страницах, не по тексту.
3. Опции меню заведены для 22 локалей, а `hreflang` на сайте только 8 ❓.

## Гочи для тестирования

- **Шапку переделывают без предупреждения** (23-Jul-2026 пропал блок цены `.main-header__games-tariff`) -
  «вчера ок, сегодня стабильно красный» = изменение прода, сначала recon.
- Краулер `valid.links` - единственное место с санкционированной паузой (rate-limit), сырые локаторы там разрешены.
- `.first()` по классу хрупок: прод добавляет соседние элементы с тем же классом.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Главная, modded и сид-страница грузятся, калькуляторы монтируются, 404 вместо 500 | `smoke.pages.spec.ts` | ✅ |
| SEO-теги на ключевых страницах | `storefront.breadth.spec.ts` | ✅ |
| Футер: Privacy, Terms, соцсети | `storefront.breadth.spec.ts` | ✅ |
| Мобильная ширина: десктоп-меню скрыто, мобильная навигация есть | `storefront.breadth.spec.ts` | ✅ |
| Все внутренние ссылки доступны | `valid.links.spec.ts` | ✅ |
| Пункты меню и их ссылки | не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 15-Jun-2026 | - | Добавлен `storefront.breadth` (SEO, футер, мобильная ширина) |
| 23-Jul-2026 | - | Редизайн шапки, пропал ценник в шапке |
| 15-Oct-2026 | - | Меню снято live через MCP godlike-wp |
