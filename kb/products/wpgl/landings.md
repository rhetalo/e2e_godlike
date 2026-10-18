---
id: WPGL/landings
title: Лендинги без автотестов - Launcher, SMP One-Click, KB сайта, каталог серверов игроков
type: feature
product: WPGL
status: draft
updated: 2026-10-18
verified_on: 2026-09-24        # SMP - финальный прогон 24-Sep; Launcher - 22-Sep; KB сайта - stage 31-Aug
tickets: []
flags: []
tests: []                      # автотестов нет ни на одну из страниц
sources:
  - kb/products/wpgl/README.md (Карта разделов, Пробелы)
  - memory: launcher-landing-qa, smp-oneclick-qa, kb-redesign-audit
---

# Лендинги без автотестов - Launcher, SMP One-Click, KB сайта, каталог серверов игроков

> **В двух словах.** Страницы витрины, которые проверялись только руками в рамках отдельных задач, и автотестов
> у них нет: лендинг лаунчера, One-Click сборки SMP, база знаний сайта и каталог серверов игроков. Одна страница
> на всех - чтобы матрица покрытия честно показывала их как дыру.

## Где в интерфейсе

| Страница | Что это | Ручной QA |
|---|---|---|
| `/launcher/` | лендинг Godlike Launcher (черновик, WP page 90380): секции `#launcher-hero` и др.; обе кнопки Download ведут на `panel.godlike.host/launcher/download` (`GodlikeLauncher-0.6.4.exe`) | 22-Sep-2026: DoD PASS |
| `/minecraft-smp/` | 6 One-Click сборок, кнопка `button.modpacks-body__install` → `cart-modded-new?productId=343&modpackId=godlike:<build>:1`, промо MODPACK50 | 22..24-Sep-2026 |
| `/knowledgebase-en/` (`ht_kb`) | база знаний сайта, 745 статей в sitemap; редизайн на stage | 31-Aug-2026: DoD PASS |
| `/servers/` | каталог серверов игроков (34, тип записи `server`), фильтры по тегам, версиям, лоадерам | разбор отложен владельцем 15-Oct |

## Правила и граничные случаи

1. **SMP:** после покупки попап «Commands for your build» всплывает при первом running, кнопка «Build commands» переоткрывает;
   конфиг LuckPerms импортируется автоматически (`lp import`) - починено 24-Sep.
2. **SMP:** событие `smp_build_cta_clicked` уходит в dataLayer, но до Amplitude не доходит; со страницы сборки (без placement) события нет.
3. **Launcher:** og:image - дефолтный скрин темы, og:title дублирует бренд (F1, до публикации).
4. **KB сайта:** ровно один `<h1>` на статьях, панельные CTA - `<a>` без href + onclick.

## Не баг - так задумано

| Кажется багом | На самом деле | Источник |
|---|---|---|
| После SMP One-Click сервер offline | автостарта нет | memory smp-oneclick-qa |
| В KB сайта нет блока «Top / Pinned» | решение владельца (рассинхрон спека и макета) | memory kb-redesign-audit |

## Покрытие

| Что | Где | Статус |
|---|---|---|
| Launcher: кнопки Download, структура секций | только ручной QA 22-Sep | ❌ авто нет |
| SMP One-Click: CTA → `cart-modded-new`, попап команд, `lp import` | только ручной QA 24-Sep | ❌ авто нет |
| KB сайта: структура статей, CTA в панель | только ручной QA 31-Aug (stage) | ❌ авто нет |
| Каталог серверов игроков `/servers/` | не разведано ❓ | ❌ |

## История

| Дата | Тикет | Что |
|---|---|---|
| 31-Aug-2026 | - | Аудит редизайна KB сайта на stage |
| 22-Sep-2026 | - | QA лендинга Launcher |
| 24-Sep-2026 | - | SMP One-Click: попап ✅, `lp import` починен, Amplitude не доходит |
