---
id: KB-REG-MCP
title: MCP-серверы godlike (доступ AI-агента к сайту и базам)
type: registry
status: draft
updated: 2026-10-15
sources:
  - jira: DEV-450 (ТЗ «MCP-доступ до сайту godlike.host для маркетингу», Notion arcaneweb)
  - сообщение Sergey Serpichenko о подключении panel-sql и billing-sql
  - .mcp.json (локально, в .gitignore - там токены)
  - описания инструментов godlike-wp (tools/list, 15-Oct)
---

# MCP-серверы godlike

> **В двух словах.** Через MCP AI-агент (Claude) работает с продуктом напрямую. Он читает базы
> панели, WordPress и биллинга (только SELECT, персональные данные скрыты). Для WordPress
> есть узкий набор инструментов: SEO, редиректы, черновики, ссылки, sitemap, переводы, сверка
> каталога WHMCS с сайтом. Любая запись по умолчанию идёт в черновик и пишется в журнал аудита.
> Это сделано в [DEV-450](https://antihost.atlassian.net/browse/DEV-450) для маркетинга, но для QA
> так же полезно: можно проверить реальное состояние прода без ручных запросов к разработке.

## Серверы

| Сервер | Что | Адрес | У нас подключён |
|---|---|---|---|
| `godlike-panel-sql` | Read-only SQL по базе панели (UP/OLDP/ADM) | `panel.godlike.host/mcp/godlike-panel-sql` | ✅ |
| `godlike-billing-sql` | Read-only SQL по базе WHMCS (услуги, инвойсы, промокоды, клиенты) | ❓ | ❌ **нет** (на 15-Oct) |
| `godlike-wp-sql` | Read-only SQL по базе WordPress | `godlike.host/wp-json/godlike-mcp/v1/rpc` | ✅ |
| `godlike-wp` | Инструменты WP по ТЗ DEV-450 (чтение + запись с журналом) | тот же `godlike-mcp/v1/rpc`, другой ключ | ✅ |

**Как подключать:** `.mcp.json` в корне репо, перезапуск сессии, проверка командой `/mcp`.
В нашем репо `.mcp.json` в `.gitignore` (в нём токены), поэтому обновление ветки его не
приносит. Новый сервер нужно вписать руками.

**Правила (от разработки):**
- Сломать нельзя: всё, кроме SELECT, отклоняется.
- Базы отдельные: панель и биллинг друг друга не видят, в запросе указываем, какая нужна.
- ⚠️ **Время в биллинге на 3 часа впереди логов панели.** Учитывать при сверке событий.
- Наше правило: перед SQL одной строкой сказать владельцу, какая БД, какие таблицы и зачем.

## ТЗ DEV-450 ↔ инструменты `godlike-wp`

Сверено 15-Oct по описаниям инструментов. Набор инструментов зависит от прав токена, и всё,
что перечислено в ТЗ, нашему ключу **видно**.

| Пункт ТЗ | Задача | Инструменты |
|---|---|---|
| 4.1 (P0) | SEO-мета | `seo_meta_get`, `seo_meta_set`, `seo_audit` |
| 4.2 (P0) | Редиректы, цепочки, 404 | `redirect_list`, `redirect_create`, `redirect_delete`, `redirect_chains`, `redirect_404_list` |
| 4.3 (P0) | Черновики статей | `post_draft_create`, `post_draft_update`, `post_block_get`, `post_block_set`, `media_upload`, `draft_delete` |
| 4.4 (P1) | Лендинги из блоков | `page_section_types`, `page_sections_get`, `page_sections_set`, `page_draft_create` |
| 4.5.a (P1) | Каталог WHMCS | `catalog` (группы → продукты → месячная цена, только чтение) |
| 4.5.b (P0) | Сверка WHMCS ↔ WP ↔ cart | `catalog_diff`, `url_check` |
| 4.5.c (P2) | Новая игра | `game_payload` - только готовит payload, ничего не пишет (компромиссный вариант из ТЗ) |
| 4.6 (P0) | Перелинковка | `content_link_search`, `content_link_insert`, `content_link_remove`, `link_search`, `link_inventory`, `link_replace` |
| 4.7 (P1) | Хедер и футер | `theme_block_get`, `theme_block_set` (`header_menu`, `header_menu_vps`, `footer_menu` по языкам) |
| 4.8 (P1) | Баннеры и сайдбар блога | `theme_block_*` (`blog_list_banners`, `aside_banner`, `top_banner`), `term_block_get`, `term_block_set` (по категориям) |
| 4.9 (P1) | Schema | `schema_get`, `schema_set`, `schema_inventory` |
| 4.10 (P1) | Sitemap | `sitemap_inventory`, `sitemap_exclude`, `sitemap_orphans` |
| 4.11 (P2) | Воронки | `funnel_get`, `funnel_assign` |
| 4.12 (P1) | hreflang | `translations_audit`, `translations_link` |
| 4.13 (P0) | Alt картинок | `media_missing_alt`, `media_alt_set` |
| §3 п.4-5 | Журнал аудита, dry-run для пачек | `audit_read`, `apply_plan` (пачка → `plan_id` → применение) |

## Что из этого полезно QA

- **Сверка цен и cart-ссылок:** `catalog_diff` + `url_check`. Ловит цену на лендинге ≠ WHMCS,
  страницу без продукта, cart-URL, который **теряет query string** (`?pid=` срезан → пустая
  корзина, хотя статус 200). Это кейс 19-Aug с `/cart-game-servers/`.
- **Что поменялось на сайте:** `audit_read` показывает журнал правок, сделанных через MCP.
  Правки людей в wp-admin туда не попадают: журнал всего сайта - отдельный тикет (§3 п.4b ТЗ).
- **Рендерится ли блок:** `theme_block_get` / `term_block_get` прямо говорят, отображает ли тема
  блок. Некоторые баннерные зоны тема не показывает вообще.
- **Cloudflare не чистится сам.** После правки через MCP страница может выглядеть старой, это ожидаемо.

## Открыто

- ❌ `godlike-billing-sql` не подключён: нужен блок из `.mcp.json` разработки (адрес + токен).
- Есть ли stage для WP-MCP (§3 п.7 ТЗ) - ❓.
