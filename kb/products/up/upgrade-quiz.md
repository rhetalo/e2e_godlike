---
id: UP/upgrade-quiz
title: Квиз апгрейда (Upgrade Quiz) - подбор тарифа и оффер
type: feature
product: UP
status: draft
updated: 2026-10-30
verified_on: 2026-10-30
tickets: [DEV-593]
flags: []
tests: [tests/game/panel/upgrade-quiz.token.api.spec.ts]
sources:
  - kb/tickets/DEV-593.md
  - test-docs/godlike.host/DEV-593/RESULTS.md (не в git)
  - QA-инструкция DEV-593: Claude Doc https://claude.ai/artifact/GtSF7Dj8Zwfh9kzs4tQkvF
  - billing DB (read-only): mod_upsell_quiz_*, tblproducts (30-Oct-2026)
---

# Квиз апгрейда (Upgrade Quiz)

> **В двух словах.** Короткий опрос (тип сервера, игроки, лаги) подбирает тариф выше текущего и показывает оффер с ценой
> «Total due today». Accept Offer меняет тариф с оплатой из биллинга. Страница в новой панели, данные и офферы - в биллинге
> (аддон `upsell_quiz`). С [DEV-593](../../tickets/DEV-593.md) квиз работает только у владельца сервера и только с токеном панели.

## Где в интерфейсе

- Новая панель: `/server/{short}/upgrade-quiz`, вход из Upgrade («Not sure what you need? → Go to quiz»).
- Старая панель: на `/server/{short}/upgrade` остался блок «Not sure what you need?» с кнопкой «Go to quiz», она открывает квиз этого
  сервера в новой панели (`/server/{uuid}/upgrade-quiz`). Свой квиз в старой панели убран: `/server/{short}/upgrade/quiz` → 404.
- Шаги Minecraft Vanilla: «What type of Minecraft server» → «How many players» → «Does your server lag» → «Get My Setup» → оффер
  (текущий и рекомендованный тариф, «Total due today», **Restart Quiz**, **Back**, **Accept Offer**) → модалка «Confirmation Of Tariff Plan
  Change» («$X will be deducted from your balance», **Confirm Upgrade**) → `/server/{short}/upgrade`.
- Квиз есть для Minecraft, Rust, Terraria, Palworld, ARK; нет, например, для Hytale и Project Zomboid (пустая страница, кнопки нет).

## Как работает (под капотом)

- Токен: `GET /api/v2/servers/{uuid}/upgrade-quiz/token` → `{token, expires_at}`, 1 час. Дальше каждый запрос к биллингу
  `index.php?m=upsell_quiz&format=json&resource=..&action=..` с `Authorization: Bearer v1.…`. Подробно - [API](api/upgrade-quiz.md).
- На 401 фронт один раз берёт новый токен и повторяет запрос; не помогло - экран «Session expired» + Reload. Прогресс квиза хранится
  в биллинге, Reload продолжает (из QA-инструкции 📖).
- Квизы и ответы - таблицы `mod_upsell_quiz_*`. У варианта ответа `action`: `upgrade_plan` + `value` = id продукта WHMCS, или
  `upgrade_premium` (переключить на линейку Premium). Пример Vanilla (`quiz_id 9`): «20-30» → 345 Ultra Budget, «Yes, I get lags» →
  Premium.
- Варианты ответа с тарифом не выше текущего скрыты: у Quadra нет «5-10» и «10-20», список начинается с «20-30» (30-Oct-2026).
- Accept Offer → `upgrade/store` → инвойс в биллинге; на тест-аккаунтах оплачивается кредитом.

## Правила и граничные случаи

1. Токен выдаётся **только владельцу**: сабюзер (любая роль, проверен Co-owner) и root-админ панели получают 403 `not_owner` и текст
   «The upgrade quiz is unavailable…», глобального тоста нет.
2. Trial (демо из конструктора модпаков, у него в панели `free=0`, trial узнаётся через `/api/v2/whmcs/trial/{uuid}`): кнопки квиза нет,
   по прямой ссылке страница уводит на Overview.
3. Ресурсы (сабмит, оффер, цена) другой услуги с чужим токеном - 403 `forbidden`, даже у того же клиента.

## Не баг - так задумано

- Premium-клиенту при ответе «No - it's stable» Vanilla-квиз предлагает тариф из линейки Budget (Quadra Premium $19.99 → Ultra Budget
  $23.99: RAM 4 → 6 GB, CPU 10 → 3, SSD 200 → 30 GB). Ниже текущего тариф не уходит. ❓ Так ли задумано - открытый вопрос
  [DEV-593/Q1](../../tickets/DEV-593.md#находки).
- На trial страница по прямой ссылке успевает запросить токен до редиректа - пользователь туда из UI не попадает (решение владельца 30-Oct).

## Гочи для тестирования

- **Accept Offer + Confirm Upgrade списывают реальные деньги** (кредит или карта). Только на своём сервере и с ок владельца на сумму;
  Restart Quiz перед уходом, чтобы не оставлять висящий оффер.
- Модалка DEV-559 «Some mods were disabled» на модовых серверах перехватывает клики по квизу - закрыть «Got It».
- Отказы пишутся в Module Log биллинга (`upsell_quiz` / `auth`) - удобно сверять через billing DB `tblmodulelog`.
- VIP-клиент (аккаунт QA) видит Premium-плашки на текущем тарифе; апгрейд из квиза группу не смотрит.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Токен владельцу, 401 без токена, 403 на другую услугу, 401 подделка, 403 сабюзеру | `upgrade-quiz.token.api.spec.ts` (TC-GP-QUIZ-TOKEN-001..003) | ✅ read-only |
| Проход квиза, Restart, Accept, оплата | ручной QA [DEV-593](../../tickets/DEV-593.md) | ❌ в e2e не идёт (оплата) |
| Старая панель: Go to quiz → новая | ручной QA DEV-593 | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 03-Jul-2025 | - | Квиз перенесён в панель, проверки владельца в биллинге закомментированы (коммит 87f8c23e2, из Jira 📖) |
| 30-Oct-2026 | [DEV-593](../../tickets/DEV-593.md) | Токен владельца, закрыты все эндпоинты, квиз убран из старой панели. PASS prod |
