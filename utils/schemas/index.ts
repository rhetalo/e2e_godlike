/**
 * zod-схемы ответов API и хелпер проверки (agents.docs/DECISIONS.md, IMPROVEMENTS_2026-10.md §3).
 *
 * Зачем: ловить переименованное / пропавшее / сменившее тип поле при статусе 200 — по ВСЕМ элементам
 * ответа, а не только по первому. Схемы не строгие к лишним полям (z.object отбрасывает неизвестные):
 * новое поле в API тест не валит, пропажа или смена типа контрактного поля — валит.
 *
 * Использование в спеке (ассерт — в спеке, хелпер ничего не ассертит):
 *   expect(schemaIssues(ExtensionListResponse, json)).toEqual([]);
 * При падении в отчёте — список «путь: что не так» (data.3.provider: Expected string, received null).
 */
import type { z } from "zod";

export * from "./backups";
export * from "./extensions";
export * from "./minecraftServer";

/** Проблемы валидации как «путь: сообщение» (пустой массив = ответ соответствует схеме). Не больше `limit` строк. */
export function schemaIssues(schema: z.ZodType, data: unknown, limit = 20): string[] {
  const res = schema.safeParse(data);
  if (res.success) return [];
  return res.error.issues.slice(0, limit).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
}
