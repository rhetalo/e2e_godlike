---
id: TASK-v2-subuser-permissions
title: API v2 не проверял права сабюзеров (BaseServerRequest)
type: ticket
product: [UP]
features: [UP/sharing-roles]
status: partial
qa_verdict: PASS-with-issues
updated: 2026-10-15
verified_on: 2026-09-22
jira: -
sources:
  - memory: v2-subuser-permission-fix
  - tests/game/panel/permission.enforcement.api.spec.ts
---

# TASK-v2-subuser-permissions - API v2 не проверял права сабюзеров (BaseServerRequest)

> **В двух словах.** Часть ручек API v2 (смена Docker-образа, переустановка, смена версии,
> параметры запуска) не проверяла, есть ли у приглашённого участника право на действие.
> Фикс переводит их на общую проверку прав. Подтверждено для смены Docker-образа, остальное не проверено.

## Как это работает
- Права проверяет `BaseServerRequest`.
- Ручки: `server.docker_access` → `POST /api/v2/servers/{uuid}/docker`; `server.reinstall` → `POST .../reinstall`; `server.change_version` → `POST .../minecraft/bedrock/versions`; `server.edit_startup` → ❓ роут не найден.
- Матрица ролей в БД: Owner - все 4 права; Co-owner - change_version + edit_startup; Moderator и Member - ни одного.

## Итог QA
- `docker_access`: PASS 22-Sep (сабюзер → 403, владелец → 422 на пустом теле).
- Остальные 3 не верифицированы: reinstall и change_version деструктивны, пустым телом их безопасно не проверить.

## Находки
| ID | Суть | Статус |
|---|---|---|
| TASK-v2-subuser-permissions/O1 | `BaseServerRequest` отвергает владельца без строки в `server_user_has_roles` | вне скоупа |
| TASK-v2-subuser-permissions/O2 | Берёт только первую роль, право во второй роли не видит | вне скоупа |

## Покрытие
`permission.enforcement.api.spec.ts` (TC-GP-PERM-API-001, docker_access). ❓ На 15-Oct спек не закоммичен.

## Связи
- Аккаунты: [acc:invitee](../registry/test-accounts.md#invitee), [acc:shared-owner](../registry/test-accounts.md#shared-owner).
- Сервер для деструктивной проверки: [srv:7166c707](../registry/test-servers.md#7166c707) (нужен risk-decision).
