---
id: UP/databases
title: Databases - базы данных MySQL для сервера
type: feature
product: UP
status: stale                  # состояние после июня не проверялось
updated: 2026-10-15
verified_on: 2026-06-06
tickets: []
flags: []
tests: []                      # TC-GP-DB-001 запаркован
sources:
  - agents.docs/game-panel/KNOWLEDGE_BASE.md §5b, §7d (recon 03..06-Jun-2026)
  - agents.docs/game-panel/TEST_PLAN.md («Известные проблемы прода»)
  - kb/products/up/README.md («Что устарело», п.10)
---

# Databases - базы данных MySQL для сервера

> **В двух словах.** Раздел Databases должен давать клиенту отдельную базу данных для сервера (нужна
> многим плагинам). В июне 2026 создание базы не работало: бэкенд падал с ошибкой подключения, а на
> тарифе тест-сервера к тому же 0 доступных баз. Что из этого баг, а что ограничение тарифа, не
> выяснено, после июня раздел не проверялся.

## Где в интерфейсе

- Сайдбар сервера → **Databases** (`/server/{uuid}/database`). KB §7d.
- Заголовок «Databases», счётчик «**N databases remaining**», кнопка **Create Database**.
- Таблица NAME / ENDPOINT / USERNAME / PASSWORD / TYPE / ADMIN LINK; пустое состояние «No databases found / No available databases
  for this server», футер «Showing 0 database».
- Окно **Create Database**: одно необязательное поле **Tag** («Enter an optional database tag»), кнопки Close / Create Database.

## Как работает (под капотом)

- Создание: `POST .../databases/`.
- В июне ответ 400: `{success:false, message:"Failed to create database.", error:"SQLSTATE[HY000] [2002] Connection refused (... CREATE DATABASE ...)"}`.
  Окно остаётся открытым, счётчик не меняется, таблица пустая. Источник: TEST_PLAN, KB §7d.

## Правила и граничные случаи

1. **Число баз зависит от тарифа ❓:** на плане Double тест-сервера «0 databases remaining».
2. **Баг или нет слотов ❓** - не разделено ([обзор UP, «Что устарело» п.10](README.md#что-устарело-в-источниках)).
3. В ответе ошибки виден внутренний SQL - сам по себе кандидат в баг (утечка деталей).

## Гочи для тестирования

- Проверять на сервере с тарифом, где есть слоты баз; на Double результат ничего не скажет.
- Перед вердиктом смотреть ответ `POST .../databases/`, а не только UI.

## Покрытие

- **Автотестов нет.** TC-GP-DB-001 запаркован до починки (TEST_PLAN).
- Нужна перепроверка: работает ли создание на тарифе со слотами баз.

## История

| Дата | Тикет | Что |
|---|---|---|
| 03..06-Jun-2026 | - | Recon раздела, создание падает 400 Connection refused, тесты запаркованы |
