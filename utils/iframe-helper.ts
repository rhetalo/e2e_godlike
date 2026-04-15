import { type Page, type FrameLocator } from '@playwright/test';

/**
 * Locate a Stripe Elements iframe by its container ID.
 * Stripe embeds card fields inside cross-origin iframes whose `name` attributes
 * contain random hashes — so we target them via the stable `title` attribute
 * or the parent container's known ID.
 */
export function stripeCardFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe[title="Secure card number input frame"]');
}

export function stripeExpiryFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe[title="Secure expiration date input frame"]');
}

export function stripeCvcFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe[title="Secure CVC input frame"]');
}

/**
 * Verify that all three Stripe card-entry iframes are attached to the DOM.
 */
export async function waitForStripeFrames(page: Page): Promise<void> {
  await page.locator('iframe[title="Secure card number input frame"]').waitFor({ state: 'attached' });
  await page.locator('iframe[title="Secure expiration date input frame"]').waitFor({ state: 'attached' });
  await page.locator('iframe[title="Secure CVC input frame"]').waitFor({ state: 'attached' });
}
