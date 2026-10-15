---
id: KB-REG-ENV
title: Окружения (prod / stage)
type: registry
status: draft
updated: 2026-10-15
sources:
  - memory: staging-env-incoming, stage-admin-account-scope, stage-neoforge-unixargs, ci-and-reporting
  - fixtures/test-data.ts, utils/gameAuth.ts, playwright.config.ts
---

# Окружения

> **В двух словах.** У проекта два окружения. **prod** - живой продукт, на котором крутятся
> автотесты и почти весь ручной QA. **stage** - копия панели для проверки фич до релиза. В
> stage-панели видны реальные клиентские серверы, поэтому там работаем только на своих
> тестовых. Автотесты пока целиком на prod.

## prod

| Продукт | Адрес |
|---|---|
| [WPGL](../_meta/id-scheme.md#продукты-префиксы) витрина | https://godlike.host/ |
| BIL биллинг (WHMCS) | https://godlike.host/clientarea/ |
| UP игровая панель | https://ultra.panel.godlike.host/ |
| UP API | https://panel.godlike.host/api/v2/ |
| OLDP старая клиентская панель | https://panel.godlike.host/ |
| ADM админка | https://panel.godlike.host/admin |
| VPS панель | https://vf-panel.godlike.host/ |
| AFF партнёрка | https://affiliate.godlike.host/ |

**Правила на prod:**
- Аккаунты общие и боевые: никаких заказов, оплат и необратимых действий без явного ок владельца.
- Мутации (power, rebuild, backup) делаем только на выделенных тест-серверах ([реестр](test-servers.md)), с откатом.
- Промо, цены и тексты меняются: проверяем структуру, а не маркетинговые формулировки.
- В ADM ничего не делаем без явного ок на конкретное действие.

## stage

> Как stage устроен и разворачивается, описано у DevOps: [внешние доки](external-docs.md#devops---что-пригодится-qa).

| Что | Адрес / факт |
|---|---|
| UP панель | https://stage.ultra.panel.godlike.host/ |
| API / OAuth | `stage.panel.godlike.host` (callback `/oauth2/callback`) |
| Нода | `stage.wing01` |
| Вход | Google-OAuth, логинится владелец. Сессия живёт ~30-40 мин |

**Правила на stage:**
- Под [acc:admin](test-accounts.md#admin) в списке около 16930 **реальных клиентских** серверов.
  Открывать чужие нельзя, даже Overview. Работаем только на сервере, который дал владелец.
- `storageState` в свежем контексте не переживает. Рабочий путь - CDP на живом залогиненном окне.
- Что задеплоено на stage, а что нет, нигде не фиксируется. Перед проверкой нужно сверить
  (пример: DEV-562 проверяли на prod, потому что stage не задеплоен).

❓ Есть ли stage для WPGL, BIL и VPS - не описано.

## Где гоняются автотесты

- **CI:** GitLab, ветка `main` репо `e2e/godlike-tests`. Стадия `deploy_to_vps` доставляет код на VPS.
- **Прогон:** VPS по cron в 09:00 → отчёт в Slack (+ Markdown-лог в CI).
- Cron на VPS запускается без `CI=true`, поэтому ретраев нет (`retries=0`).
- На `gitlab/main` пушим только реально рабочие тесты.
