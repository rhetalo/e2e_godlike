import { type Page, type FrameLocator, type Locator } from '@playwright/test';
import { CHECKOUT } from '../utils/selectors';
import {
  stripeCardFrame,
  stripeExpiryFrame,
  stripeCvcFrame,
  waitForStripeFrames,
} from '../utils/iframe-helper';

/**
 * StripeCardFields — Stripe Elements card-entry iframes on checkout (Step 3).
 *
 * Card number, expiry, and CVC each live in separate cross-origin iframes.
 * We target them via stable `title` attributes — never by the randomised `name`.
 *
 * WHY a component: iframe boundary requires `frameLocator` handling;
 * this encapsulates all waiting, interaction, and state-checking logic so
 * tests never access iframes directly.
 */
export class StripeCardFields {
  private readonly cardFrame: FrameLocator;
  private readonly expiryFrame: FrameLocator;
  private readonly cvcFrame: FrameLocator;

  /** Outer container locators (live in the main page DOM). */
  readonly cardContainer: Locator;
  readonly expiryContainer: Locator;
  readonly cvcContainer: Locator;

  constructor(private page: Page) {
    this.cardFrame = stripeCardFrame(page);
    this.expiryFrame = stripeExpiryFrame(page);
    this.cvcFrame = stripeCvcFrame(page);
    this.cardContainer = page.locator(CHECKOUT.stripeCardContainer);
    this.expiryContainer = page.locator(CHECKOUT.stripeExpiryContainer);
    this.cvcContainer = page.locator(CHECKOUT.stripeCvcContainer);
  }

  /* ---------- Waiting ---------- */

  /** Wait for all three Stripe iframes to attach to the DOM. */
  async waitForReady(): Promise<void> {
    await waitForStripeFrames(this.page);
  }

  /* ---------- Input locators (inside iframes) ---------- */

  get cardInput(): Locator {
    return this.cardFrame.locator(
      'input[name="cardnumber"], input[autocomplete="cc-number"]',
    );
  }

  get expiryInput(): Locator {
    return this.expiryFrame.locator(
      'input[name="exp-date"], input[autocomplete="cc-exp"]',
    );
  }

  get cvcInput(): Locator {
    return this.cvcFrame.locator(
      'input[name="cvc"], input[autocomplete="cc-csc"]',
    );
  }

  /* ---------- Actions ---------- */

  async fillCardNumber(value: string): Promise<void> {
    await this.cardInput.click();
    await this.cardInput.fill(value);
  }

  async fillExpiry(value: string): Promise<void> {
    await this.expiryInput.click();
    await this.expiryInput.fill(value);
  }

  async fillCvc(value: string): Promise<void> {
    await this.cvcInput.click();
    await this.cvcInput.fill(value);
  }

  /* ---------- Visibility assertions (containers in main DOM) ---------- */

  async expectFieldsVisible(): Promise<void> {
    await this.cardContainer.waitFor({ state: 'visible', timeout: 15_000 });
    await this.expiryContainer.waitFor({ state: 'visible', timeout: 5_000 });
    await this.cvcContainer.waitFor({ state: 'visible', timeout: 5_000 });
  }

  /* ---------- State checks (Stripe CSS classes on containers) ---------- */

  /** Returns true when the card container has StripeElement--invalid class. */
  async isCardInvalid(): Promise<boolean> {
    const cls = await this.cardContainer.getAttribute('class') ?? '';
    return cls.includes('StripeElement--invalid');
  }

  /** Returns true when the card container has StripeElement--complete class. */
  async isCardComplete(): Promise<boolean> {
    const cls = await this.cardContainer.getAttribute('class') ?? '';
    return cls.includes('StripeElement--complete');
  }
}
