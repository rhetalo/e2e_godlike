/**
 * Контракт api/v2 состояния Minecraft-сервера (UP): ядро/версия и статус server-jar.
 * KB: kb/products/up/mods-loader-gating.md (extension_capabilities), kb/products/up/java-detection.md (java_preflight).
 * Эндпоинты: GAME_PANEL_EXTENSIONS_API.minecraftVersion (selectors.ts), server-jar/status - GamePanelExtensionsPage.fetchServerJarStatus.
 *
 * Снято live-пробой 16-Oct-2026 (read-only GET, 5 канонических серверов, все Paper 1.21.11).
 * ⚠️ На пробе `extension_capabilities` и `java_preflight` = null на ВСЕХ серверах (флаг гейтинга выключен,
 * префлайт не запускался), `details` = null, `status` = "idle". Форму этих объектов живьём не видели,
 * поэтому их внутренности НЕ контрактуем — только «объект или null». Уточнить схему, когда проба покажет
 * заполненный объект (флаг `extension_capabilities` включён / после Start с префлайтом).
 */
import { z } from "zod";

/** Ещё не снятый живьём объект: проверяем только «объект или null». */
const UnprobedObject = z.record(z.string(), z.unknown()).nullable();

/** GET /servers/{uuid}/minecraft/version — тип и версия ядра (источник правды для гейтинга модов). */
export const MinecraftVersionResponse = z.object({
  success: z.literal(true),
  data: z.object({
    minecraft_version: z.string().min(1),   // "1.21.11"
    minecraft_type: z.string().min(1),      // "PAPER" / "FABRIC" / ...
    minecraft_build: z.string().nullable(), // "261933"; строка, не число
    egg: z.string().min(1),                 // "PC-Paper"
    required_java: z.object({
      min: z.number().int().nullable(),
      max: z.number().int().nullable(),     // на пробе null (верхней границы нет)
      recommended: z.number().int().nullable(),
      source: z.string().min(1),            // "columns"
    }),
    extension_capabilities: UnprobedObject,
  }),
});

/** GET /servers/{uuid}/minecraft/server-jar/status — состояние проверки server-jar перед стартом. */
export const ServerJarStatusResponse = z.object({
  success: z.literal(true),
  status: z.string().min(1),                // на пробе "idle"; по KB ещё checking / failed
  error: z.string().nullable(),             // по KB: java_too_old / ambiguous_loader / ...
  details: UnprobedObject,
  java_preflight: UnprobedObject,
});
