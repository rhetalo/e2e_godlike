/**
 * throttlingWebhook.ts — хелпер для вебхука троттлинга CPU игровой панели.
 *
 * Эндпоинт (Godlike Panel API v2, подтверждено live-recon 15-Jun-2026):
 *   POST https://panel.godlike.host/api/v2/webhook/throttling
 *   - Авторизация НЕ требуется (приняло POST без токена; ответ {"success":true}).
 *   - Тело — Alertmanager-payload (Prometheus). Сервер маршрутизируется по
 *     `alerts[].labels.name` = UUID сервера (подтверждено владельцем: «name это server_id»).
 *   - Невалидный/несуществующий UUID → 422 {"message":"The server uuid field value does not exist."}.
 *
 * ⚠️ Эффект: панель показывает разовое уведомление-модалку о троттлинге с предложением
 * апгрейда. Триггерится по серверу **раз в 3 дня** (анти-спам) → каждый успешный вызов
 * «сжигает» окно сервера. См. tests/game/panel/throttling.notification.spec.ts.
 */
import { type APIRequestContext, type APIResponse } from "@playwright/test";

/** База Godlike Panel API v2. Переопределяется через env. */
export const PANEL_API_V2_BASE =
  process.env.PANEL_API_V2_BASE ?? "https://panel.godlike.host/api/v2";

export const THROTTLING_WEBHOOK_URL = `${PANEL_API_V2_BASE}/webhook/throttling`;

/**
 * Собирает Alertmanager-payload для алерта `ContainerCPUThrottlingHigh`.
 * `serverUuid` подставляется в `alerts[].labels.name` (и `commonLabels.name`) — по нему
 * панель находит сервер. Остальные поля повторяют реальный алерт cadvisor/Alertmanager.
 */
export function buildThrottlingPayload(serverUuid: string): Record<string, unknown> {
  const labels = {
    alertname: "ContainerCPUThrottlingHigh",
    instance: "wing3.panel.godlike.host:8001",
    job: "cadvisor",
    name: serverUuid,
    severity: "warning",
  };
  const annotations = {
    description:
      `Увага! Контейнер ${serverUuid} (Instance: wing3.panel.godlike.host:8001)\n` +
      "був обмежений по CPU більше ніж на 30% протягом останніх 10 хвилин.\n" +
      "Поточне значення троттлінгу: 100.00%.\n" +
      "Рекомендується переглянути виділені для нього ресурси.\n",
    summary: `Високий троттлінг CPU у контейнері ${serverUuid}`,
  };
  return {
    receiver: "webhook-throttling",
    status: "firing",
    alerts: [
      {
        status: "firing",
        labels,
        annotations,
        startsAt: "2025-08-08T16:35:58.117Z",
        endsAt: "0001-01-01T00:00:00Z",
        generatorURL: "http://cad1549d4efa:9090/graph",
        fingerprint: "d4c85d62b0e7d92a",
      },
    ],
    groupLabels: {
      alertname: "ContainerCPUThrottlingHigh",
      instance: "wing3.panel.godlike.host:8001",
      job: "cadvisor",
    },
    commonLabels: labels,
    commonAnnotations: annotations,
    externalURL: "http://e444c1af0b3a:9093",
    version: "4",
    groupKey:
      '{}/{alertname="ContainerCPUThrottlingHigh"}:{alertname="ContainerCPUThrottlingHigh"}',
    truncatedAlerts: 0,
  };
}

/**
 * Шлёт алерт троттлинга для указанного сервера. Возвращает сырой ответ —
 * проверки (status/тело) делает спек.
 */
export function fireThrottlingAlert(
  request: APIRequestContext,
  serverUuid: string,
): Promise<APIResponse> {
  return request.post(THROTTLING_WEBHOOK_URL, {
    data: buildThrottlingPayload(serverUuid),
    headers: { "Content-Type": "application/json" },
  });
}
