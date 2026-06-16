import { type Locator, type Page, expect } from '@playwright/test';
import { MOBILE_CART } from '../utils/selectors';

/**
 * MobileCartPage — Page Object for /mobile-cart/?is_cart_opened=true
 *
 * PAGE: MobileCartPage
 * URL: https://godlike.host/mobile-cart/?is_cart_opened=true
 *
 * SECTIONS:
 *   Header:
 *     - element: Page title "Configure your Plan"
 *       selector: .cart-page__title
 *       type: text
 *
 *   Game Select:
 *     - element: Search-enabled dropdown (49 games)
 *       selector: .game-select → .game-select__selected (click to open)
 *       type: custom Vue dropdown
 *     - element: Game chips (quick-pick row)
 *       selector: .game-chip
 *       type: chip buttons
 *
 *   RAM (Plan) Dropdown:
 *     - selector: .custom-select containing .custom-select__plan
 *     - Disabled until game selected (.custom-select--disabled)
 *     - Minecraft auto-selects "2 GB Double"; Rust shows "Select plan"
 *     - Minecraft tiers: 2-20GB (9 options), Rust tiers: 8-24GB (6 options)
 *
 *   Billing Period Dropdown:
 *     - selector: .custom-select containing .custom-select__billing
 *     - Options: 1 Month (20% OFF) | 3 Months (28% OFF) | 6 Months (35% OFF) | 12 Months (40% OFF)
 *     - Total price changes with period (e.g. 3mo = 3 × per-month price)
 *
 *   Location Dropdown:
 *     - selector: .custom-select with .location-group
 *     - Auto-selects nearest server by ping
 *
 *   Pricing:
 *     - .cart__pricing-price = discounted/actual price (e.g. "$6.39")
 *     - .cart__pricing-price-discounted = original/strikethrough price (e.g. "$7.99")
 *     - Shows $0.00 until game+plan selected; may take ~1s to update
 *
 *   Order Button: .cart__button[type="submit"] — "Order Now"
 *
 *   Promocode:
 *     - .cart__promocode-button — collapsed toggle ("Have a Promocode?")
 *     - Expands to show input + Apply button
 *
 * DYNAMIC BEHAVIORS:
 *   - Game chip click → enables RAM dropdown, auto-selects default plan (game-dependent)
 *   - Plan/billing change → recalculates total price (~500ms delay)
 *   - Billing period changes total (3mo shows 3× monthly rate)
 *   - Location auto-selects lowest-ping server
 *
 * VALIDATIONS:
 *   - RAM dropdown disabled with "Select Game First" placeholder before game selection
 *   - Price shows $0.00 until game+plan selected
 */
export class MobileCartPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly gameSelect: Locator;
  readonly gameSearchInput: Locator;
  readonly gameChips: Locator;
  readonly ramDropdown: Locator;
  readonly billingDropdown: Locator;
  readonly locationDropdown: Locator;
  readonly totalPrice: Locator;
  readonly originalPrice: Locator;
  readonly orderButton: Locator;
  readonly promocodeToggle: Locator;
  readonly promoResult: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator(MOBILE_CART.pageTitle);
    this.gameSelect = page.locator(MOBILE_CART.gameSelect);
    this.gameSearchInput = page.locator(MOBILE_CART.gameSelectSearchInput);
    this.gameChips = page.locator(MOBILE_CART.gameChip);
    this.ramDropdown = page.locator(MOBILE_CART.section).filter({ hasText: 'RAM (Plan)' }).locator(MOBILE_CART.customSelect);
    this.billingDropdown = page.locator(MOBILE_CART.section).filter({ hasText: 'Billing Period' }).locator(MOBILE_CART.customSelect);
    this.locationDropdown = page.locator(MOBILE_CART.section).filter({ hasText: 'Location' }).locator(MOBILE_CART.customSelect);
    this.totalPrice = page.locator(MOBILE_CART.pricingPrice);
    this.originalPrice = page.locator(MOBILE_CART.pricingDiscounted);
    this.orderButton = page.locator(MOBILE_CART.orderButton);
    this.promocodeToggle = page.locator(MOBILE_CART.promocodeToggle);
    this.promoResult = page.locator(MOBILE_CART.promocodeDisplayPrice);
  }

  async goto(): Promise<void> {
    await this.page.goto('/mobile-cart/?is_cart_opened=true');
    await this.waitForReady();
  }

  async waitForReady(): Promise<void> {
    await this.page.locator(MOBILE_CART.vueApp).waitFor({ state: 'attached', timeout: 15_000 });
    // Wait for either cart page title (logged in) or auth page (needs login)
    await this.page.waitForFunction(
      () => document.querySelector('.cart-page__title') || document.querySelector('.auth-page'),
      { timeout: 15_000 }
    );
  }

  /** Check if auth wall is shown and handle login if needed. */
  async loginIfNeeded(email: string, password: string): Promise<void> {
    const authVisible = await this.page.locator('.auth-page').count();
    if (authVisible === 0) return;

    // Click Login tab
    await this.page.locator('.auth-page__tab').filter({ hasText: 'Login' }).click();
    await this.page.locator('.cart__input[type="email"]').waitFor({ state: 'visible' });

    await this.page.locator('.cart__input[type="email"]').fill(email);
    await this.page.locator('.cart__input[type="password"]').fill(password);
    await this.page.locator('.login__form-bottom__button').click();

    // Wait for cart to load after login
    await this.pageTitle.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /* --- Game Selection --- */

  async selectGameByChip(gameName: string): Promise<void> {
    await this.gameChips.filter({ hasText: gameName }).first().click();
    // Чип активирует RAM-дропдаун (снимает --disabled) и авто-выбирает тариф → цена становится ненулевой.
    await this.expectPlanDropdownEnabled();
    await this.waitForPriceNonZero();
  }

  async selectGameBySearch(gameName: string): Promise<void> {
    await this.gameSelect.locator(MOBILE_CART.gameSelectSelected).click();
    await this.gameSearchInput.fill(gameName);

    const option = this.page
      .locator(MOBILE_CART.gameSelectOption)
      .filter({ hasText: gameName })
      .first();
    await expect(option).toBeVisible();
    await option.click();

    // Выбор игры активирует RAM-дропдаун (снимает --disabled). Rust авто-тариф не ставит — цену не ждём.
    await this.expectPlanDropdownEnabled();
  }

  /* --- RAM / Plan --- */

  async getSelectedPlan(): Promise<string> {
    return (await this.ramDropdown.locator(MOBILE_CART.customSelectSelected).innerText()).trim();
  }

  async selectPlan(planName: string): Promise<void> {
    const selected = this.ramDropdown.locator(MOBILE_CART.customSelectSelected);
    await selected.click();
    await this.ramDropdown.locator(MOBILE_CART.customSelectOption).filter({ hasText: planName }).click();
    // Дропдаун зеркалит выбор в .custom-select__selected — детерминированный сигнал применения.
    await expect(selected).toContainText(planName);
  }

  async getPlanOptions(): Promise<string[]> {
    await this.ramDropdown.locator(MOBILE_CART.customSelectSelected).click();
    const names = await this.ramDropdown.locator(MOBILE_CART.customSelectOption).allInnerTexts();
    // Close dropdown by clicking selected again
    await this.ramDropdown.locator(MOBILE_CART.customSelectSelected).click();
    return names.map(n => n.trim());
  }

  async expectPlanDropdownDisabled(): Promise<void> {
    await expect(this.ramDropdown).toHaveClass(/disabled/);
  }

  async expectPlanDropdownEnabled(): Promise<void> {
    await expect(this.ramDropdown).not.toHaveClass(/disabled/, { timeout: 5_000 });
  }

  /* --- Billing Period --- */

  async getSelectedBillingPeriod(): Promise<string> {
    return (await this.billingDropdown.locator(MOBILE_CART.customSelectSelected).innerText()).trim();
  }

  async selectBillingPeriod(label: string): Promise<void> {
    const selected = this.billingDropdown.locator(MOBILE_CART.customSelectSelected);
    await selected.click();
    await this.billingDropdown.locator(MOBILE_CART.billingOptionRow).filter({ hasText: label }).click();
    // Период отражается в .custom-select__selected; итоговая цена пересчитывается реактивно — её поллит спек.
    await expect(selected).toContainText(label);
  }

  /* --- Pricing --- */

  /** Get the actual/discounted price (e.g. "$6.39"). */
  async getTotalPrice(): Promise<string> {
    return (await this.totalPrice.innerText()).trim();
  }

  /** Get the original/strikethrough price (e.g. "$7.99"). Returns null if not shown. */
  async getOriginalPrice(): Promise<string | null> {
    if (await this.originalPrice.count() === 0) return null;
    if (!(await this.originalPrice.isVisible())) return null;
    return (await this.originalPrice.innerText()).trim();
  }

  /**
   * Дождаться, пока итоговая цена уйдёт с плейсхолдера $0.00 (после выбора игры/тарифа).
   * Поллим разобранное число, а не строку — иначе подстрока "0.00" ложно срабатывала бы на "$10.00".
   */
  async waitForPriceNonZero(): Promise<void> {
    await expect
      .poll(
        async () => {
          const match = (await this.getTotalPrice()).replace(',', '.').match(/[\d]+(\.\d+)?/);
          return match ? parseFloat(match[0]) : 0;
        },
        { timeout: 10_000, intervals: [200, 300, 500] },
      )
      .toBeGreaterThan(0);
  }

  /* --- Promocode --- */

  async expandPromocode(): Promise<void> {
    await this.promocodeToggle.click();
    await this.page.locator(MOBILE_CART.promocodeInput).waitFor({ state: 'visible' });
  }

  async applyPromocode(code: string): Promise<void> {
    await this.expandPromocode();
    await this.page.locator(MOBILE_CART.promocodeInput).fill(code);
    await this.page.locator(MOBILE_CART.promocodeApplyButton).click();
  }

  /** Текст блока результата промокода (для невалидного кода — сообщение об ошибке). */
  async getPromoResultText(): Promise<string> {
    return (await this.promoResult.innerText()).trim();
  }

  /* --- Order --- */

  async clickOrderNow(): Promise<void> {
    await this.orderButton.click();
  }
}
