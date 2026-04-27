import { Page, expect } from '@playwright/test';

export async function dismissPromoBannerIfAny(page: Page): Promise<void> {
  const closeSelectors = [
    '.flash-sale-modal__close',
    '.flash-sale-modal button[aria-label*="close" i]',
    '[class*="modal"] [class*="close"]',
  ];
  for (const sel of closeSelectors) {
    const el = page.locator(sel).first();
    try {
      if (await el.isVisible({ timeout: 1000 })) {
        await el.click({ trial: false });
        return;
      }
    } catch { /* ignore — banner is optional */ }
  }
}

export async function acceptCookiesIfAny(page: Page): Promise<void> {
  const candidates = [
    'button:has-text("Accept")',
    'button:has-text("Agree")',
    '[class*="cookie"] button',
  ];
  for (const sel of candidates) {
    const el = page.locator(sel).first();
    try {
      if (await el.isVisible({ timeout: 1000 })) {
        await el.click();
        return;
      }
    } catch { /* ignore */ }
  }
}

export async function expectUrlContains(page: Page, fragment: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(fragment.replace(/[/\\.]/g, m => '\\' + m)));
}

export function parsePrice(raw: string): number {
  const m = raw.replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : NaN;
}
