---
id: WPGL/utm-clean-url
title: Очистка UTM из адреса с сохранением атрибуции
type: feature
product: WPGL
status: verified
updated: 2026-11-10
verified_on: 2026-11-10
tickets: [DEV-600]
flags: []
tests: []
sources:
  - kb/tickets/DEV-600.md
  - memory: dev600-utm-clean-url
---

# Очистка UTM из адреса с сохранением атрибуции

> **В двух словах.** Ссылка с utm открывается, и сайт сразу убирает utm из адресной строки, а кампанию
> сохраняет в cookie и dataLayer, откуда её берут GA4, Amplitude, RedTrack и биллинг. Что чистить, задаёт
> опция темы WP. На 10-Nov-2026 включён ограниченный тест на одну reddit-кампанию (режим `selected`).

## Как работает (под капотом)
1. Inline-скрипт `godlike-utm-capture` - первый в `<head>`. Режим и комбинации видны в хвосте скрипта: `("selected", [[src, med, camp]])`.
2. Если utm совпадают с правилом режима: cookie `utm_*`, `godlike_referrer` (первый адрес входа, 30 дней, не перезаписывается), `document_referrer`; `dataLayer.original_page_location` = исходный адрес; `history.replaceState` убирает только utm, остальной query (`ref_id`, `gclid`, `admitad_uid`) и `#якорь` остаются.
3. GTM (с v191): GA4 page_view и Amplitude берут адрес из `original_page_location`. Amplitude SDK пишет `$setOnce initial_utm_*`.
4. RedTrack: обёртка XHR `keepUtmForRedTrack` дописывает исходный query в клик (wp!793, без опоры на sub19).
5. Биллинг читает cookie `utm_*` и `godlike_referrer` при регистрации.

| Режим `crb_utm_strip_mode` | Что чистит |
|---|---|
| `off` | ничего |
| `canary` | только canary-ссылки |
| `selected` | только комбинации source / medium / campaign из `crb_utm_strip_selected` |
| `on` | все utm |

## Правила и граничные случаи
- Кампания из `selected` на проде: reddit / minecraftserver / `…sofar1` (65 символов); реальные RedTrack-ссылки несут `…sofar` (64) - это старая логика, адрес не чистится.
- Reddit-визит без действий занимает `godlike_referrer` на 30 дней: следующий Admitad-переход его не перезаписывает (запасная проверка Admitad в биллинге), основная метка `admitad_uid` пишется. По PDF разработчика - принято.
- ЕС: адрес чистится сразу, до выбора в баннере CookieYes; при Reject GA4 уходит в режим без cookie (`gcs=G100`) с исходным адресом.

## Гочи для тестирования
- **Прод-аналитика:** в пробах перехватывать и abort все хиты (`analytics.godlike.host/g/collect`, `amplitude.com/2`, `redtrack.godlike.host/<24hex>`, пиксели), не трогая navigation-запросы. Фильтр по хосту, не по подстроке URL (`admitad` в query ломал документ).
- **Повторный посетитель Amplitude** (сессия 30 мин): сдвинуть `sessionId` / `lastEventTime` в cookie `AMP_<key>` (base64 JSON). `page.clock` ломает ленивую загрузку GTM.
- **GA4 Realtime тестовые визиты не показывает** (ни с UA-IP, ни с VPN DE). Проверять стандартным отчётом «Привлечение трафика» на следующий день: в URL отчёта `_r.explorerCard..seldim=["sessionCampaignName"]`, фильтр через поиск. Названия кампаний > 64 символов GA4 не обрезает. «Сравнения» не создавать - сохраняются в ресурсе.
- **CookieYes** инжектится GTM-тегом по событию `geoInfoReady`, страна из `ipapi.co/json` (429 на общих IP → баннера нет). Для теста ЕС: VPN + стаб ipapi; в Playwright стаб регистрировать после `**/*` или в `**/*` звать `route.fallback()`.
- Проверка, что GTM с DEV-600 опубликован: `original_page_location` есть в `gtm.js?id=GTM-M9WVHNPF`.

## Покрытие
Автотестов нет: режим и комбинации - временный тест авторов ([DEV-600](../../tickets/DEV-600.md), `regression: blocked`).
Ручной QA 04-10 Nov 2026 - прод, PASS.

## История
- 2026-11-04..10 - [DEV-600](../../tickets/DEV-600.md): wp!763 / !792 / !793 + GTM v191, ограниченный тест `selected`.
