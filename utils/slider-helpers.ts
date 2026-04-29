/**
 * Slider helpers — generic utilities for any slider implementation.
 *
 * The godlike.host plan calculator is rendered by a Vue / Vuetify bundle that
 * uses an ARIA-compliant v-slider widget. Both keyboard stepping (preferred)
 * and mouse drag (fallback) are supported here.
 */
import type { Locator, Page } from "@playwright/test";

export interface SliderHandles {
  /** The interactive thumb / handle that receives keyboard focus. */
  thumb: Locator;
  /** The track the thumb travels along — used for mouse-drag fallback. */
  track: Locator;
}

/**
 * Move a custom slider thumb to a given fraction (0..1) along its track using
 * mouse drag. Use only as a fallback when keyboard stepping is unavailable.
 */
export async function dragSliderToFraction(
  page: Page,
  { thumb, track }: SliderHandles,
  fraction: number,
): Promise<void> {
  if (fraction < 0 || fraction > 1) {
    throw new Error(`Fraction must be between 0 and 1, got ${fraction}`);
  }

  const trackBox = await track.boundingBox();
  const thumbBox = await thumb.boundingBox();
  if (!trackBox || !thumbBox) {
    throw new Error("Slider thumb or track is not visible");
  }

  const startX = thumbBox.x + thumbBox.width / 2;
  const startY = thumbBox.y + thumbBox.height / 2;
  const targetX = trackBox.x + trackBox.width * fraction;
  const targetY = trackBox.y + trackBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const x = startX + ((targetX - startX) * i) / steps;
    const y = startY + ((targetY - startY) * i) / steps;
    await page.mouse.move(x, y);
  }
  await page.mouse.up();
}

/** Extract the first integer from a string (e.g. "8 GB" -> 8, "$12.50" -> 12). */
export function firstInt(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.match(/-?\d+/);
  return m ? Number(m[0]) : null;
}

/** Extract the first decimal price from a string (e.g. "$12.50" -> 12.5). */
export function firstPrice(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.match(/-?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(",", ".")) : null;
}

/** Multi-currency-safe price extraction (handles $ € £ ₴ zł). */
export function parsePrice(priceStr: string): number {
  const normalized = priceStr.replace(",", ".");
  const match = normalized.match(/[\d]+(\.\d+)?/);
  return match ? parseFloat(match[0]) : NaN;
}
