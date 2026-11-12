---
id: UP/api/cors
title: API - CORS панели и кэш preflight
type: api
product: UP
status: verified
updated: 2026-11-12
verified_on: 2026-11-11
tickets: [DEV-673]
features: [UP/api/cors]
tests: [tests/game/panel/cors.preflight.api.spec.ts]
sources:
  - kb/tickets/DEV-673.md
  - MR panel!1773 (config/cors.php)
  - test-docs/ultra.panel/DEV-673/ (не в git)
---

# API - CORS панели и кэш preflight

> **В двух словах.** ultra.panel (`ultra.panel.godlike.host`) и API (`panel.godlike.host`) - разные origin, поэтому перед запросом
> с `Authorization` браузер шлёт preflight `OPTIONS`. С [DEV-673](../../../tickets/DEV-673.md) ответ несёт
> `Access-Control-Max-Age: 7200`, и браузер 2 часа не повторяет preflight для того же URL.

## Контракт preflight

`OPTIONS /api/v2/*` и `OPTIONS /api/client/*` (`cors.paths` в `config/cors.php`), без авторизации:

| Запрос | Ответ |
|---|---|
| `Origin` из `APP_CORS_ALLOWED_ORIGINS` (прод: ultra.panel) | `204`, `access-control-allow-origin: <origin>`, `allow-credentials: true`, `allow-methods: GET, POST, PUT, PATCH, DELETE, HEAD`, `allow-headers` = запрошенные, **одна** строка `access-control-max-age: 7200` ✅ |
| Чужой `Origin` | `204` без `allow-origin` и без `max-age` ✅ |
| Путь вне `cors.paths` (`/auth/login`) | обычный ответ, CORS-заголовков нет ✅ |

- `max_age` = env `APP_CORS_MAX_AGE`, по умолчанию 7200 (потолок Chrome; Firefox 86400, Safari 600). Выключает кэш только явный `0`
  (`-1` зажимается до 0); пусто или нечисловое значение = 7200.
- `APP_CORS_ALLOWED_ORIGINS`: элементы обрезаются, пустые отбрасываются (с panel!1773).
- Дубль `access-control-max-age` (например, nginx или Cloudflare добавят свой) - браузер игнорирует оба, кэш снова выключен. Тест это ловит.

## Поведение в браузере

- Кэш per URL вместе с query: каждый новый адрес (папка в Files, страница списка) делает preflight один раз. Перезагрузка страницы сервера: 0 OPTIONS из 44.
- Сервер сбросить кэш в браузере не может: после сужения origin/методов старый preflight живёт до 2 ч.
- GET и PUT на один URL перезаписывают запись кэша друг друга (`allowed_headers: *`). Отложено разработчиком до метрик.
- Эффект на проде (nginx, DevOps 12-Nov): доля OPTIONS 47.5% (05-09.11) → 9.4% (11.11), около 3 млн → 305 тыс. в сутки.

## Как тестировать

- Playwright не показывает CORS preflight ни в `page.on('request')`, ни в MCP `network_requests`. В браузере - только CDP
  (`newCDPSession` + `Network.requestWillBeSent`, `method: OPTIONS`).
- Контракт проверяем напрямую `APIRequestContext.fetch(..., { method: "OPTIONS" })`; дубли заголовка видны только в `headersArray()`.

## История

| Дата | Тикет | Что |
|---|---|---|
| 11-Nov-2026 | [DEV-673](../../../tickets/DEV-673.md) | `max_age` 0 → 7200 через env, trim списка origin |
