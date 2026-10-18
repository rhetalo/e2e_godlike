---
id: VPS/storage
title: Storage VPS - диск сервера
type: feature
product: VPS
status: draft
updated: 2026-10-18
verified_on: 2026-06-19        # HTML подтверждён May 2026
tickets: []
flags: []
tests: [tests/vps/panel/vps.panel.storage.spec.ts]
sources:
  - шапка tests/vps/panel/vps.panel.storage.spec.ts (HTML May 2026)
---

# Storage VPS - диск сервера

> **В двух словах.** Вкладка Storage только показывает диск VPS: букву диска, бейдж **Primary** и размер в GB.
> Изменить там ничего нельзя - поэтому и покрытие намеренно минимальное.

## Где в интерфейсе

- Вкладка **Storage** → карточка диска: `<h4>Drive: A</h4>`, бейдж `span.badge.badge-warning` **Primary**, размер (`30 GB` на тестовом сервере).

## Правила и граничные случаи

1. Размер диска зависит от тарифа; тест проверяет формат «число + GB», не конкретное число.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Карточка диска: Drive: буква, размер в GB, бейдж Primary | `vps.panel.storage.spec.ts` (STG-001) | ✅ |
| Несколько дисков, расширение диска после апгрейда | не разведано ❓ | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| May 2026 | - | HTML вкладки подтверждён, спек storage |
