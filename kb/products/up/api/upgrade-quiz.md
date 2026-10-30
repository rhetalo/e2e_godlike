---
id: UP/api/upgrade-quiz
title: API - квиз апгрейда (токен панели + JSON API биллинга)
type: api
product: UP
status: verified
updated: 2026-10-30
verified_on: 2026-10-30
tickets: [DEV-593]
features: [UP/upgrade-quiz]
sources:
  - kb/tickets/DEV-593.md
  - test-docs/godlike.host/DEV-593/RESULTS.md (не в git)
  - memory: dev593-quiz-token-security
---

# API - квиз апгрейда

> **В двух словах.** Квиз живёт в двух местах: панель выдаёт владельцу сервера токен, а сам квиз (вопросы, ответы, офферы, цена,
> апгрейд) - JSON API биллинга (аддон WHMCS `upsell_quiz`, продукт BIL). С [DEV-593](../../../tickets/DEV-593.md) биллинг принимает
> запросы только с токеном и сверяет, что ресурс принадлежит услуге из токена.

## Эндпоинты

| Метод | Путь | Что делает | Раздел |
|---|---|---|---|
| GET | `panel.godlike.host/api/v2/servers/{uuid}/upgrade-quiz/token` | Выдать токен квиза владельцу | [ниже](#get-serversuuidupgrade-quiztoken) |
| GET/POST | `godlike.host/clientarea/index.php?m=upsell_quiz&format=json&resource=..&action=..` | Квиз, сабмиты, офферы, цена, апгрейд | [ниже](#json-api-биллинга-upsell_quiz) |
| GET | `panel.godlike.host/api/client/servers/{short}/upgrade-quiz/token` | Старый маршрут (старая панель) | удалён, 404 ✅ |

## GET /servers/{uuid}/upgrade-quiz/token

Выдаёт подписанный токен на услугу WHMCS сервера (`external_id`). Ничего не меняет.

**Ответы**
| Код | code | Когда | Тело |
|---|---|---|---|
| 200 | - | владелец сервера | `{"token":"v1.<service_id>.<client_id>.<exp>.<hmac>","expires_at":<unix>}` ✅ |
| 403 | `not_owner` | сабюзер любой роли, root-админ панели | `{"code":"not_owner"}` ✅ |
| 400 | - | у пользователя нет доступа к серверу | ✅ (сам запрос фронт не шлёт) |
| 409 | `not_linked` | у сервера или владельца пустой `external_id` | 📖 |
| 503 | `not_configured` | не задан `WHMCS_QUIZ_TOKEN_SECRET` | 📖 |

**Поведение**
- Токен: `v1` + `service_id` + `client_id` + `exp` (unix, +3600 с) + HMAC-SHA256 (64 hex). Схема `QuizTokenResponse` в `utils/schemas/upgradeQuiz.ts`.
- Для trial-сервера токен тоже выдаётся (200); не показывать квиз на trial - задача фронта (редирект на Overview).

## JSON API биллинга (upsell_quiz)

База: `https://godlike.host/clientarea/index.php?m=upsell_quiz&format=json`. Заголовок `Authorization: Bearer <quiz_token>`.

| resource / action | Метод | Что | Проверено |
|---|---|---|---|
| `quiz/show` (`id`, `service_id`, `lang`) | GET | вопросы квиза | ✅ |
| `offer/index` (`quiz_id`, `service_id`) | GET | офферы услуги по квизу | ✅ |
| `submission/index`, `submission/store`, `submission/update` (`id`) | GET / POST | ответы клиента | ✅ |
| `offer/store`, `offer/update` (`id`), `offer/destroy` (`id`) | POST | создать / изменить / удалить оффер (Restart Quiz = destroy) | ✅ |
| `pricing/show` (`id` оффера) | GET | цена «Total due today» | ✅ |
| `upgrade/store` (`{"offer_id": N}`) | POST | принять оффер → инвойс → апгрейд | ✅ |

**Отказы** (тело `{"code": "...", "message": "..."}`, схема `QuizBillingDenial`)
| Код | code | Когда |
|---|---|---|
| 401 | `token_missing` | нет `Authorization` (пустой Bearer - тоже) |
| 401 | `token_invalid` | подпись или формат не сходятся (подмена услуги, клиента, срока, токен без подписи) |
| 401 | `token_expired` | токену больше часа |
| 403 | `forbidden` | ресурс другой услуги, некорректный id (`[1]`), клиент из токена не владеет услугой |
| 503 | `not_configured` | пустой `Quiz token secret` в настройках аддона 📖 |
| 422 | - | валидация (например `offer_id` в query вместо тела: «Invalid Offer ID.») |
| 500 | - | неизвестный `resource`/`action`: HTML «Oops!» со stack trace, до проверки токена ⚠️ [DEV-593/O1](../../../tickets/DEV-593.md#находки) |

**CORS**
- Preflight с origin панели (`ultra.panel.godlike.host`) → 204, `Access-Control-Allow-Origin` + `Allow-Headers: Authorization, Content-Type, Accept`,
  **без** `Allow-Credentials`. С чужого origin → 204 без CORS-заголовков. Origin старой панели всё ещё разрешён (O2). ✅
- Общий CORS-код биллинга обслуживает и сайт: у `api-cart.php`, `custom-login.php`, `country.php` `Allow-Credentials: true` остаётся. ✅

**Журнал**
- Каждый отказ - строка в Module Log (`tblmodulelog`, module `upsell_quiz`, action `auth`): `code`, `endpoint`, `token_service_id`,
  `requested_service_id`, `origin` (пустой = не из браузера), `enforced=1`. Токена и слова Bearer в логе нет. ✅

**История изменений**
| Дата | Тикет | Что изменилось |
|---|---|---|
| 30-Oct-2026 | [DEV-593](../../../tickets/DEV-593.md) | Токен владельца обязателен, проверка ресурса по услуге, CORS без credentials, журнал отказов |

**Как проверено**
Prod 30-Oct-2026: живые запросы curl и браузер (два клиента, сабюзер, админ, trial), сверка с billing DB (`tblmodulelog`, `tblinvoices`,
`mod_upsell_quiz_offers`). Сломанный токен проверен подменой ответа в браузере (🧪, реакция UI). 503-ветки живьём не видели.
