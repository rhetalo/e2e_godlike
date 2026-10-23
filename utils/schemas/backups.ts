/**
 * Контракт api/v2 списка бэкапов сервера (UP): общая квота слотов `meta.quota` (DEV-484).
 * KB: kb/products/up/api/backups.md (значения refusal, примеры отказов), kb/tickets/DEV-484.md.
 * Эндпоинт: GAME_PANEL_BACKUPS.listApi (selectors.ts), ловит GamePanelBackupsPage.gotoCapturingList.
 *
 * Снято live-пробой 23-Oct-2026 (read-only GET, 3 сервера тест-аккаунта: 0 и 1 бэкап, can_create=true).
 * Отказы (`no_free_slots` / `throttled` + retry_after) живьём в этой пробе не видели - их формы взяты из
 * API-доки KB (сняты в QA DEV-484 20-Oct), поэтому refusal - enum, retry_after - int | null.
 * Элементы `data` контрактуем минимально: поля, по которым UI рисует строку списка.
 */
import { z } from "zod";

export const BackupQuota = z.object({
  limit: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),     // может быть больше limit («4/3») у серверов сверх нового лимита
  free: z.number().int().nonnegative(),
  can_create: z.boolean(),
  refusal: z.enum(["no_free_slots", "throttled"]).nullable(),
  retry_after: z.number().int().nonnegative().nullable(),
});

/** GET /servers/{uuid}/backups - объединённый список бэкапов + общая квота. */
export const BackupsListResponse = z.object({
  success: z.literal(true),
  data: z.array(
    z.object({
      uuid: z.string().uuid(),
      name: z.string(),
      status: z.string().min(1),            // "COMPLETED" / ...
    }),
  ),
  meta: z.object({ quota: BackupQuota }),
});
