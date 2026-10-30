/**
 * Контракт токена квиза апгрейда (DEV-593): панель выдаёт владельцу сервера подписанный токен,
 * биллинг (аддон upsell_quiz) принимает запросы квиза только с ним.
 * KB: kb/products/up/api/upgrade-quiz.md, kb/tickets/DEV-593.md.
 *
 * Снято live 30-Oct-2026 (прод, QA DEV-593): формат токена `v1.<service_id>.<client_id>.<exp>.<hmac sha256>`,
 * срок 1 час. Отказы биллинга - `{code, message}`, отказ панели - `{code}`.
 */
import { z } from "zod";

/** GET /api/v2/servers/{uuid}/upgrade-quiz/token (владелец). */
export const QuizTokenResponse = z.object({
  token: z.string().regex(/^v1\.\d+\.\d+\.\d+\.[0-9a-f]{64}$/),
  expires_at: z.number().int().positive(),
});

/** Отказ биллинга на m=upsell_quiz (401 / 403 / 503). */
export const QuizBillingDenial = z.object({
  code: z.enum(["token_missing", "token_invalid", "token_expired", "forbidden", "not_configured"]),
  message: z.string().min(1),
});
