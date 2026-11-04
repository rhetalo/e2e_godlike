/**
 * Контракт JSON-LD страницы тарифов игры (DEV-604, wp!755/!783): один ProductGroup на страницу,
 * каждый тариф - вариант Product со своим Offer и ссылкой `?plan=<sku>`.
 * KB: kb/products/wpgl/tariffs-for-bots.md, kb/tickets/DEV-604.md.
 *
 * Снято live 03-04 Nov 2026 (прод, 156 страниц с блоком тарифов). Цена - строка с двумя знаками,
 * за месяц (`unitCode: MON`). Даты акции (`validFrom` / `priceValidUntil`) бывают только у глобальной акции.
 */
import { z } from "zod";

const Money = z.string().regex(/^\d+\.\d{2}$/);

export const TariffVariant = z.object({
  "@type": z.literal("Product"),
  sku: z.string().regex(/^\d+$/),
  size: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  offers: z.object({
    "@type": z.literal("Offer"),
    price: Money,
    priceCurrency: z.string().regex(/^[A-Z]{3}$/),
    url: z.string().regex(/\?plan=\d+$/),
    priceSpecification: z.object({
      price: Money,
      referenceQuantity: z.object({ unitCode: z.literal("MON") }),
    }),
    shippingDetails: z.object({ "@id": z.string() }),
  }),
});

export const TariffProductGroup = z.object({
  "@type": z.literal("ProductGroup"),
  name: z.string().regex(/ Server Hosting$/),
  productGroupID: z.string().min(1),
  hasVariant: z.array(TariffVariant).min(1),
});

export type TariffProductGroupT = z.infer<typeof TariffProductGroup>;
