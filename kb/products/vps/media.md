---
id: VPS/media
title: Media VPS - порядок загрузки (Boot Order)
type: feature
product: VPS
status: draft
updated: 2026-10-18
verified_on: 2026-06-19        # селекторы - DevTools May 2026; фантом-ассерт исправлен 03-Jun
tickets: []
flags: []
tests: [tests/vps/panel/vps.panel.media.spec.ts]
sources:
  - шапка tests/vps/panel/vps.panel.media.spec.ts (селекторы DevTools, May 2026)
  - agents.docs/vps-panel/TEST_PLAN.md (Техдолг - фантом-ассерт media)
---

# Media VPS - порядок загрузки (Boot Order)

> **В двух словах.** Вкладка Media на [странице сервера](server-page.md) задаёт, с чего грузится VPS: с диска
> (HDD) или с привода (CD/DVD, например подключённый ISO). Выбор применяется кнопкой **Apply** и ставит
> задачу в activity table.

## Где в интерфейсе

- Вкладка **Media** → секция **Boot Order**: плитки **HDD** (`value="1"`) и **CD/DVD** (`value="2"`) - кастомные radio.
- Кнопка **Apply** (`button#server-boot-order-button`).
- Результат - строка в activity table с бейджем **Complete**.

## Правила и граничные случаи

1. Рабочее состояние: выбран **ровно один** radio (`checked`).
2. Смена устройства без Apply ничего не меняет.

## Гочи для тестирования

- **Плитку `.radio-tile` кликать нельзя** - перехват указателя; выбирать только `radio.check()`.
- **Сам `<input>` CSS-скрыт** под плиткой, поэтому `toBeVisible` к нему неприменим, а голый `toBeAttached` - фантом-ассерт.
  Проверять рабочее состояние: ровно один `checked` + Apply visible и enabled.
- Тест меняет реальную настройку сервера - возврат на исходное устройство отдельным шагом (MED-003).

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Вкладка открыта, Boot Order видна, текущее устройство определено | `vps.panel.media.spec.ts` (MED-001) | ✅ |
| Переключение на другое устройство → Apply → Complete | `vps.panel.media.spec.ts` (MED-002) | ✅ |
| Возврат на исходное устройство → Apply → Complete | `vps.panel.media.spec.ts` (MED-003) | ✅ |
| Подключение ISO и реальная загрузка с CD/DVD | не покрыто | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| May 2026 | - | Селекторы сняты в DevTools |
| 03-Jun-2026 | - | Фантом-ассерт `toBeAttached` заменён проверкой рабочего состояния |
