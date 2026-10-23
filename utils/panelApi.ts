/**
 * panelApi.ts — тонкий клиент к Godlike Panel API v2 для проверок бэкенд-авторизации.
 *
 * Зачем: наши UI-тесты (role.enforcement.spec.ts) проверяют лишь скрытие контролов в DOM,
 * а бэкенд-проверку прав (403 на прямой v2-запрос в обход UI) — нет. Этот хелпер даёт
 * послать v2-запрос ОТ ИМЕНИ конкретного актёра (по его bearer-токену) и вернуть сырой
 * ответ; проверки (status/тело) делает спек.
 *
 * Авторизация панели (подтверждено live-recon 22-Sep-2026): API-хост = panel.godlike.host,
 * SPA хранит bearer `access_token` (`ptlc_…`) в localStorage origin ultra.panel.godlike.host.
 * Токен пишется свежим при loginAndSaveGameSession / loginInviteeAndSaveSession и лежит
 * в storageState → берём его оттуда, без запуска браузера.
 */
import * as fs from "fs";
import { type APIRequestContext, type APIResponse } from "@playwright/test";
import { PANEL_API_V2_BASE } from "./throttlingWebhook";

export { PANEL_API_V2_BASE };

/** Bearer-токен панели из сохранённого storageState (localStorage.access_token origin ultra.panel). */
export function readPanelToken(storageStatePath: string): string {
  const raw = JSON.parse(fs.readFileSync(storageStatePath, "utf8")) as {
    origins?: { localStorage?: { name: string; value: string }[] }[];
  };
  for (const origin of raw.origins ?? []) {
    for (const item of origin.localStorage ?? []) {
      if (item.name === "access_token" && item.value) return item.value;
    }
  }
  throw new Error(`panelApi: access_token не найден в ${storageStatePath} (сессия не залогинена?)`);
}

/** GET на v2-эндпоинт сервера от имени актёра (read-only проверки, напр. 422 валидации). Проверки — в спеке. */
export function getServerV2(
  request: APIRequestContext,
  token: string,
  serverUuid: string,
  path: string,
  params: Record<string, string> = {},
): Promise<APIResponse> {
  return request.get(`${PANEL_API_V2_BASE}/servers/${serverUuid}/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    params: { ...params, locale: "en" },
  });
}

/**
 * POST на v2-эндпоинт сервера от имени актёра (по его bearer-токену). Проверки — в спеке.
 *
 * ⚠️ БЕЗОПАСНОСТЬ: для проверок авторизации передавай ПУСТОЕ/невалидное тело у эндпоинтов,
 * где нужное поле помечено `required` (напр. `docker` → поле `image`). Тогда мутация
 * невозможна: либо 403 в authorize() ДО валидации, либо 422 «field required». НИКОГДА не
 * гоняй так деструктивные эндпоинты без required-поля (`reinstall`, установка версии) —
 * при отсутствии enforcement пустое тело запустит само действие.
 */
export function postServerV2(
  request: APIRequestContext,
  token: string,
  serverUuid: string,
  path: string,
  body: Record<string, unknown> = {},
): Promise<APIResponse> {
  return request.post(`${PANEL_API_V2_BASE}/servers/${serverUuid}/${path}?locale=en`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: body,
  });
}
