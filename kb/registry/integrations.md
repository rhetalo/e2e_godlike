---
id: KB-REG-INTEGRATIONS
title: Внешние интеграции
type: registry
status: draft
updated: 2026-10-15
sources:
  - kb/_meta/inventory-2026-10-15.md §2
  - agents.docs/godlike-mcp-usage.md, agents.docs/game-panel/KNOWLEDGE_BASE.md
---

# Внешние интеграции

> **В двух словах.** Сторонние сервисы, от которых зависит продукт. Если что-то «сломалось
> само», первым делом стоит проверить, не изменилось ли поведение у одного из них.

| Сервис | Где используется | Что делает | Гоча |
|---|---|---|---|
| CurseForge | UP каталог модов и модпаков | Источник модов и паков (прямой API с 30-Sep, [DEV-405](../tickets/DEV-405.md)) | Фильтр loader работает только вместе с версией. Эталон меток: `curseforge.com/api/v1/mods/{id}/files` |
| Modrinth | UP каталог | Второй источник модов и паков | Дубли паков с CF скрываются через `is_listed` ([DEV-532](../tickets/DEV-532.md)) |
| Hangar, Spigot, Polymart | UP плагины | Источники плагинов | - |
| Pterodactyl + Wings | UP, OLDP, ADM | Движок игровых серверов: ноды, egg, файлы, консоль | Консоль идёт по websocket. Чтение симлинка через API даёт 500 |
| VirtFusion | VPS | Движок VPS-панели | Удаления в панели нет, только отмена услуги в BIL |
| WHMCS | BIL | Биллинг: услуги, инвойсы, отмены | Язык чекаута отдельно от витрины. Free-продукты 282 / 1127 |
| Stripe, PayPal, Crypto | BIL | Оплата | Stripe внутри iframe. Оплату автотестами не трогаем |
| Amplitude | WPGL, UP | Аналитика и A/B ([flags](flags.md#ab-эксперименты-amplitude)) | События отмены шлёт бэкенд: `/api/v2/whmcs/cancel/{uuid}/event` |
| eSputnik | BIL / WPGL | Письма (цепочка Free Server Gift, [DEV-455](../tickets/DEV-455.md)) | - |
| Polylang | WPGL | 8 языков | - |
| Yoast | WPGL | SEO-мета, schema | - |
| WP Rocket + Cloudflare | WPGL | Кеш | Cloudflare чистится руками. Устаревшая страница после правки - это ожидаемо |
| CookieYes | WPGL | Cookie-баннер | Перекрывает клики. Закрывается в `fixtures/base.ts` |
| GTM, redtrack, FB pixel, ipapi | WPGL | Трекинг, гео | - |
| Trustpilot | UP | Giveaway-модалка | Её scrim даёт флоки power-тестов |
| Chatwoot | UP | Чат поддержки | - |
| Discord, Slack | UP / CI | Сообщество, отчёты автотестов | - |
