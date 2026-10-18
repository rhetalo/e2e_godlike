---
id: UP/sharing-roles
title: Sharing, роли участников и Audit Log
type: feature
product: UP
status: draft
updated: 2026-10-18
verified_on: 2026-09-22        # API-права docker_access; UI-матрица - recon 06-Jun
tickets: [TASK-v2-subuser-permissions, TASK-split-server]
flags: []
tests:
  - tests/game/panel/sharing.spec.ts
  - tests/game/panel/sharing.audit.spec.ts
  - tests/game/panel/role.enforcement.spec.ts
  # permission.enforcement.api.spec.ts (PERM-API-001) - лежит локально, не закоммичен (чужой WIP), см. «Покрытие»
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §4, §5e, §5i, §9b (recon 05-Jun..27-Jul-2026)
  - kb/tickets/TASK-v2-subuser-permissions.md, TASK-split-server.md
  - memory: v2-subuser-permission-fix, game-panel-networkidle-gotcha, game-panel-giveaway-and-audit
---

# Sharing, роли участников и Audit Log

> **В двух словах.** Владелец сервера может пригласить других людей по email и выдать им роль:
> Co-owner, Moderator или Member. От роли зависит, какие кнопки участник видит: например, Member может
> запустить сервер, но не перезапустить и не пользоваться консолью. Все действия на сервере пишутся в
> Audit Log. Права проверяются и в интерфейсе, и (частично) на бэкенде API v2.

## Где в интерфейсе

- Сайдбар сервера → **Sharing** (`/server/{uuid}/sharing`), работает и на выключенном сервере. Карточки (KB §5e):
  **Invite User** (email + роль + **Send Invite**, кнопка disabled, пока поля пустые), **Pending Invites**,
  **Roles** (счётчики Owner / Co-owner / Moderator / Member), **Members**, **Audit Log**. Раскрытие - «Show more».
- **Members:** у не-owner участника селект роли `.sharing__members-column-role-select` (автосейв) и корзина
  `.sharing__members-column-action-btn` (удаление). Видит только Owner.
- На Overview кнопка **Invite People**.
- Приглашённый видит расшаренный сервер в своём дашборде «My Servers».

## Как работает (под капотом)

- Смена роли: `POST .../members/change-role` (автосейв по выбору опции). Источник: [обзор UP, гоча 3](README.md#сквозные-гочи).
- Owner через инвайт не выдаётся - в селекте только Co-owner / Moderator / Member. KB §9b.
- **Бэкенд API v2:** права проверяет `BaseServerRequest` ([TASK-v2-subuser-permissions](../../tickets/TASK-v2-subuser-permissions.md)):

| Право | Ручка | Проверено |
|---|---|---|
| `server.docker_access` | `POST /api/v2/servers/{uuid}/docker` | ✅ сабюзер 403, владелец 422 на пустом теле (22-Sep) |
| `server.reinstall` | `POST .../reinstall` | ❌ деструктив |
| `server.change_version` | `POST .../minecraft/bedrock/versions` | ❌ деструктив |
| `server.edit_startup` | ❓ роут не найден | ❌ |

- Матрица прав в БД: Owner - все 4; Co-owner - `change_version` + `edit_startup`; Moderator и Member - ни одного.
- **Split:** права участников на саб-серверы синхронизируются вручную кнопкой «Sync Subuser Permissions»; Member без
  `split_access` не видит вкладку Split ([UP/split-server](split-server.md)).
- **Audit Log:** строка `.sharing__audit-row` = кто + время + ключ действия `server:<action>`
  (`server:power.stop`, `server:console.command` ...). KB §9b.

## Права по ролям (UI)

Enforcement - контрола **нет в DOM**, а не `disabled`. KB §5i, проверено флипами роли.

| Контрол | Owner | Co-owner | Moderator | Member |
|---|---|---|---|---|
| Start, Edit Server, Config (motd) | ✅ | ✅ | ✅ | ✅ |
| Restart / Kill | ✅ | ✅ | ❌ | ❌ |
| Поле консоли | ✅ | ✅ | ✅ | ❌ |
| Backups: форма создания | ✅ | ✅ | ✅ | ✅ |
| Backups: список и меню «...» | ✅ | ✅ | ✅ | ❌ (список пуст) |
| Sharing: роли и удаление участников | ✅ | ❌ | ❌ | ❌ |

## Правила и граничные случаи

1. **UI-матрица и матрица прав в БД не сверены:** в БД у Co-owner нет `docker_access` и `reinstall`, а UI-матрица эти права не описывает
   ([обзор UP, пробел 6](README.md#пробелы)).
2. **`BaseServerRequest` отвергает владельца без строки в `server_user_has_roles`** и берёт только первую роль
   ([TASK-v2-subuser-permissions/O1, O2](../../tickets/TASK-v2-subuser-permissions.md#находки), вне скоупа).
3. **Audit Log не пишет `server:power.start`** и индексируется с лагом.
4. **Send Invite шлёт реальное письмо.**

## Не баг - так задумано

| Кажется багом | На самом деле | Источник |
|---|---|---|
| В Audit Log нет старта сервера | `power.start` не логируется | KB §9b |
| У Member в Backups пустой список | Member не видит строки бэкапов | KB §5i |
| Права на сабы split не обновились сами | синк вручную, by design | [TASK-split-server/BUG-3](../../tickets/TASK-split-server.md#находки) |

## Гочи для тестирования

- **Смену роли проверять через reload + poll:** текст селекта обновляется не сразу. Слушатель ответа `change-role` ставить
  до клика (гонка reload vs POST роняла SHR-005).
- **Мутацию роли всегда откатывать в Co-owner.** Корзину участника не трогать (удаление необратимо без нового инвайта).
- **Send Invite в тестах не жать.**
- Второй аккаунт - [acc:invitee](../../registry/test-accounts.md#invitee) (Co-owner на сервере
  [acc:shared-owner](../../registry/test-accounts.md#shared-owner)), сессия `storageState.game.invitee.json`.
- Отсутствие управления бэкапами у Member проверять по `.backups-list__more-btn` `toBeHidden`, не по числу строк.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Рендер Sharing, invitee в Members | `sharing.spec.ts` (SHR-001, SHR-002) | ✅ |
| Invitee видит и открывает сервер | `sharing.spec.ts` (SHR-003, SHR-004) | ✅ |
| Смена роли с откатом | `sharing.spec.ts` (SHR-005) | ✅ |
| Audit Log, структурно | `sharing.audit.spec.ts` (SHR-006) | ✅ |
| Member / Moderator: power, консоль, бэкапы | `role.enforcement.spec.ts` (ROLE-001..003) | ✅ |
| API `docker_access` 403 | `permission.enforcement.api.spec.ts` (PERM-API-001) | ⚠️ ❓ не закоммичен на 15-Oct |
| Инвайт и принятие, удаление участника | не покрыто (реальное письмо) | ❌ |
| API `reinstall`, `change_version`, `edit_startup` | не проверено | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 05..06-Jun-2026 | - | Recon Sharing и матрицы ролей, KB §5e, §5i |
| 27-Jul-2026 | - | Найдено: `power.start` нет в Audit Log, SHR-006 переписан на структурный |
| 10-Sep-2026 | [TASK-split-server](../../tickets/TASK-split-server.md) | Синк прав на саб-серверы, `split_access` |
| 22-Sep-2026 | [TASK-v2-subuser-permissions](../../tickets/TASK-v2-subuser-permissions.md) | API v2 проверяет права сабюзера (`docker_access` подтверждён) |
