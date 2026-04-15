import { ENV } from '../config/env';
import type { CartQueryParams } from '../data/promo-codes';

export function buildCartUrl(params: Partial<CartQueryParams> = {}): string {
  const defaults: CartQueryParams = {
    productId: ENV.DEFAULT_PRODUCT_ID,
    billingCycle: ENV.DEFAULT_BILLING_CYCLE,
    currency: ENV.DEFAULT_CURRENCY,
    language: ENV.DEFAULT_LANGUAGE,
    location: ENV.DEFAULT_LOCATION,
  };
  const merged = { ...defaults, ...params };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined) qs.set(key, value);
  }
  return `/cart?${qs.toString()}`;
}

export function buildCartUrlWithPromo(promo: string, discount = '20.00'): string {
  return buildCartUrl({ promo, discount });
}
