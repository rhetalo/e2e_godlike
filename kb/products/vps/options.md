---
id: VPS/options
title: Options VPS - VNC, Rescue, сброс пароля, Boot Type
type: feature
product: VPS
status: draft
updated: 2026-10-18
verified_on: 2026-06-19        # структура из live HTML May 2026
tickets: []
flags: []
tests: [tests/vps/panel/vps.panel.options.spec.ts]
sources:
  - шапка tests/vps/panel/vps.panel.options.spec.ts (live HTML, май 2026)
  - kb/products/vps/README.md (Правила, Пробелы)
---

# Options VPS - VNC, Rescue, сброс пароля, Boot Type

> **В двух словах.** Вкладка Options собирает настройки VPS в четыре под-таба: **VNC** (удалённый экран
> сервера), **Rescue** (режим восстановления), **Password** (сброс root-пароля письмом) и **Settings**
> (тип загрузки BIOS / UEFI). Тесты меняют только обратимое: VNC включают и возвращают, сброс пароля
> доводят лишь до окна и жмут Cancel.

## Где в интерфейсе

- Вкладка **Options** → Bootstrap pills: **VNC** (активен по умолчанию) / **Rescue** / **Password** / **Settings**.
- **VNC** - тоггл включения; переключение ставит задачу в activity table.
- **Password** - **Reset Password** → модалка с текстом про письмо на email → Cancel / подтверждение.
- **Settings** - секция **Boot Type** с опциями **BIOS** / **UEFI**.

## Правила и граничные случаи

1. **Reset Password может быть disabled,** когда сервер Stopped.
2. **Подтверждённый сброс пароля шлёт письмо** клиенту - в тестах только до Cancel.
3. **VNC toggle обратим** и создаёт задачу в activity table - тест возвращает исходное состояние.
4. **Rescue** - под-таб есть, содержимое не разведано ❓.

## Гочи для тестирования

- Не нажимать подтверждение Reset Password - реальное письмо и смена пароля на общем сервере.
- VNC-консоль изнутри (сам экран) не разведана ❓ - только тоггл.

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Options открывается, 4 под-таба, VNC по умолчанию | `vps.panel.options.spec.ts` (OPT-001) | ✅ |
| VNC toggle меняет состояние, задача в activity table | `vps.panel.options.spec.ts` (OPT-002) | ✅ |
| Reset Password: модалка с текстом про email, Cancel | `vps.panel.options.spec.ts` (OPT-003) | ✅ |
| Settings: Boot Type, опции BIOS / UEFI | `vps.panel.options.spec.ts` (OPT-004) | ✅ |
| Rescue-режим | не разведано ❓ | ❌ |
| Смена Boot Type с применением | не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| May 2026 | - | Структура под-табов из live HTML, спек options |
