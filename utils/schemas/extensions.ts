/**
 * Контракт api/v2 каталога расширений игровой панели (UP): /servers/{uuid}/minecraft/{mods|plugins}.
 * KB: kb/products/up/extensions-catalog.md. Эндпоинты — GAME_PANEL_EXTENSIONS_API в utils/selectors.ts.
 *
 * Снято live-пробой 16-Oct-2026 (read-only GET, сервер ebb03adc, провайдеры curseforge + modrinth,
 * по 15 элементов): типы полей ниже — фактические. Строгость:
 *  - КОНТРАКТ (идентичность Inc 3: provider + сырой провайдерский id) — строго, без null;
 *  - ОФОРМЛЕНИЕ (иконка, описание, автор, url, path) — допускаем null: выборка мала, а пустая иконка у
 *    одного мода не должна валить контрактный тест.
 */
import { z } from "zod";

/** Элемент списка модов / плагинов. */
export const ExtensionItem = z.object({
  id: z.string().min(1),            // сырой id провайдера (external_id), НЕ суррогатный PK
  provider: z.string().min(1),      // curseforge / modrinth / hangar / ...
  name: z.string().min(1),
  is_installed: z.boolean(),
  is_supported: z.boolean(),
  categories: z.array(z.unknown()),
  downloads: z.number().nullable(),
  author: z.string().nullable(),
  description: z.string().nullable(),
  url: z.string().nullable(),
  icon_url: z.string().nullable(),
  path: z.string().nullable(),       // на пробе всегда null (заполняется у установленных из файла)
  ram: z.number().nullable(),
  is_optimized: z.boolean().nullable(),
});

/** Ответ списка: GET /minecraft/{mods|plugins}?provider&... */
export const ExtensionListResponse = z.object({
  success: z.literal(true),
  data: z.array(ExtensionItem).min(1),
});

/** Версия (файл) мода / плагина: GET /minecraft/{mods|plugins}/{provider}-{id}/versions. */
export const ExtensionVersion = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  game_versions: z.array(z.string()),
  // По документации CurseForge API downloadUrl = null у файлов, запрещающих стороннюю раздачу; на пробе
  // 16-Oct не встречалось, но null допускаем, чтобы такой мод в выдаче не дал ложное падение.
  download_url: z.string().nullable(),
});

export const ExtensionVersionsResponse = z.object({
  success: z.literal(true),
  data: z.array(ExtensionVersion).min(1),
});
