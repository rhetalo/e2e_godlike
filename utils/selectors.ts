/**
 * Selector Strategy Map
 * =====================
 * Priority order:
 *   1. Stable IDs (#frmCheckout, #stripeCreditCard, etc.)
 *   2. BEM-convention class selectors (.storefront__tariff, .auth-block__header-inner)
 *   3. Semantic HTML + attribute combos (input[name="paymentmethod"], iframe[title="..."])
 *   4. Role-based (role="dialog") — only where applicable
 *
 * REJECTED patterns:
 *   - :nth-child on dynamic lists
 *   - data-v-* Vue scoped attributes (hash-based, unstable)
 *   - Stripe iframe `name` attributes (contain random hashes)
 *   - Generic tag-only selectors (div, span)
 */

/* ===== Header & Navigation ===== */
export const HEADER = {
  root: ".site-header",
  logo: ".site-header .logo",
  nav: ".site-navigation",
  navItem: ".header-menu__item-link",
  hostNowButton: ".navigation-right__button",
  adminPanelsButton: ".site-header__panels",
} as const;

/* ===== Storefront / Product Cards ===== */
export const STOREFRONT = {
  hero: ".storefront__hero",
  introTitle: ".storefront__intro-title",
  variantTab: ".storefront__variant",
  variantActive: ".storefront__variant__active",
  tariffsBlock: ".storefront__tariffs-block",
  tariffCard: ".storefront__tariff",
  tariffTitle: ".storefront__tariff-title",
  tariffPrice: ".storefront__tariff-footer",
  tariffAddToCart: ".storefront__tariff-action__cart",
  discountBadge: ".storefront__tariffs-discount__percentage",
  firstPurchaseDiscount: ".storefront__tariffs-first-purchase",
} as const;

/* ===== Cart — Auth Step (Vue SPA) ===== */
export const AUTH = {
  vueApp: "[data-v-app]",
  wrapper: ".auth-block__wrapper",
  registerTab: ".auth-block__header-inner:first-child",
  loginTab: ".auth-block__header-inner:last-child",
  emailInput: '.auth-block .cart__input[type="email"]',
  usernameInput: '.auth-block .cart__input[type="text"]',
  passwordInput: '.auth-block .cart__input[type="password"]',
  loginButton: ".login__form-bottom__button",
  socialGoogle: ".auth-block__block-button__social_google",
  socialDiscord: ".auth-block__block-button__social_discord",
  socialTwitch: ".auth-block__block-button__social_twitch",
  socialApple: ".auth-block__block-button__social_apple",
} as const;

/* ===== Cart — Step 2: Billing & Promo (Vue SPA) ===== */
export const BILLING = {
  cycleContainer: ".billing-cycle",
  cycleTitle: ".billing-cycle__title",
  cycleList: ".billing-cycle__list",
  period: ".period",
  periodTitle: ".period__title",
  periodPrice: ".period__price",
  periodActive: ".period__active",
  renewInfo: ".period__renew",
} as const;

export const PROMO = {
  container: ".order__promo",
  input: ".promocode__input",
  applyButton: ".promocode__button",
  successLabel: ".promocode__label-success",
  errorLabel: ".promocode__label-error",
} as const;

export const ORDER_SUMMARY = {
  container: ".order",
  nextStepButton: ".order__button-order",
  planName: ".order__plan-value",
  billingCycle: ".order__billing-value",
  total: ".order__total",
} as const;

/* ===== Credit Balance (Checkout) ===== */
export const CREDIT_BALANCE = {
  applyRadio: "#useCreditOnCheckout",
  skipRadio: "#skipCreditOnCheckout",
  applyLabel: "label:has(#useCreditOnCheckout)",
  skipLabel: "label:has(#skipCreditOnCheckout)",
} as const;

/* ===== Cart — Step 3: Checkout (WHMCS) ===== */
export const CHECKOUT = {
  form: "#frmCheckout",
  stepIndicator: ".one-page-stepper",
  stepCaption: ".one-page-stepper__caption",
  paymentMethodRadio: 'input[name="paymentmethod"]',
  stripeRadio: 'input[name="paymentmethod"][value="stripe"]',
  paypalRadio: 'input[name="paymentmethod"][value="paypal_ppcpv"]',
  cryptoRadio: 'input[name="paymentmethod"][value="coinpayments"]',
  stripeCardContainer: "#stripeCreditCard",
  stripeExpiryContainer: "#stripeExpiryDate",
  stripeCvcContainer: "#stripeCvc",
  stripeCardIframe: 'iframe[title="Secure card number input frame"]',
  stripeExpiryIframe: 'iframe[title="Secure expiration date input frame"]',
  stripeCvcIframe: 'iframe[title="Secure CVC input frame"]',
  paypalContainer: "#paypal_ppcpv_input_container_button",
  paypalAlert: ".paypal-alert",
  orderSummary: ".order-summary",
  orderTotal: ".order-summary .total",
  submitButton: "#submit-checkout",
  completeOrderText: "Complete Order",
  stripeElementsContainer: "#stripeElements",
  newCardInfoTab: "#newCardInfoTab",
  creditCardInputFields: "#creditCardInputFields",
  stripeElementEmpty: ".StripeElement--empty",
  stripeElementInvalid: ".StripeElement--invalid",
  stripeElementComplete: ".StripeElement--complete",
} as const;

/* ===== Minecraft Seeds ===== */
export const SEEDS = {
  hero: ".minecraft-seeds-hero",
  heroTitle: ".minecraft-seeds-hero__title",
  trendingGrid: ".minecraft-seeds-trending__grid",
  exploreGrid: ".minecraft-seeds-grid",
  card: ".minecraft-seeds-card",
  cardLink: ".minecraft-seeds-card__link",
  cardTitle: ".minecraft-seeds-card__title",
  cardImage: ".minecraft-seeds-card__image",
} as const;

/* ===== Game Servers ===== */
export const GAME_SERVERS = {
  filterTabs: '[class*="filter"]',
  searchInput: '[class*="search"] input',
  gameLink: 'a[href*="-server-hosting"]',
} as const;

/* ===== Shared / Layout ===== */
export const FOOTER = {
  root: "footer",
} as const;

export const FAQ = {
  section: '.section-faq, [class*="faq"]',
  item: '[class*="faq__item"], [class*="faq-item"]',
} as const;

/* ===== Mobile Cart (Vue SPA at /mobile-cart/) ===== */
export const MOBILE_CART = {
  /** Root Vue app container */
  vueApp: "[data-v-app]",
  appRoot: "#app-cart",
  wrapper: ".cart-mobile__wrapper",
  page: ".cart-page",
  pageTitle: ".cart-page__title",
  section: ".cart-page__section",
  labelCaption: ".cart__label-caption",

  /* --- Game Select --- */
  gameSelect: ".game-select",
  gameSelectSelected: ".game-select__selected",
  gameSelectSearchInput: ".game-select__search-input",
  gameSelectOptions: ".game-select__options",
  gameSelectOption: ".game-select__option",
  gameSelectOptionIcon: ".game-select__option-icon",
  gameSelectArrow: ".game-select__arrow",

  /* --- Game Chips (quick-pick below dropdown) --- */
  gameChipsContainer: ".game-chips-container",
  gameChip: ".game-chip",

  /* --- RAM / Plan Dropdown --- */
  customSelect: ".custom-select",
  customSelectSelected: ".custom-select__selected",
  customSelectOptions: ".custom-select__options",
  customSelectOption: ".custom-select__option",
  customSelectDisabled: ".custom-select--disabled",
  customSelectArrowOpen: ".custom-select__arrow--open",
  planOption: ".custom-select__plan",
  planImage: ".custom-select__plan-image",

  /* --- Billing Period Dropdown --- */
  billingOption: ".custom-select__billing",
  billingOptionRow: ".custom-select__billing-option",
  billingPrice: ".custom-select__billing-price",
  billingPriceDisabled: ".custom-select__billing-price-disabled",
  billingDiscount: ".custom-select__discount",

  /* --- Location Dropdown --- */
  locationGroup: ".location-group",
  pingDisplay: ".ping-display",
  pingGreen: ".ping-green",
  pingYellow: ".ping-yellow",
  pingRed: ".ping-red",
  optionActive: ".is-active",

  /* --- Pricing & CTA --- */
  pricing: ".cart__pricing",
  pricingPrice: ".cart__pricing-price",
  pricingDiscounted: ".cart__pricing-price-discounted",
  orderButton: '.cart__button[type="submit"]',

  /* --- Promocode --- */
  promocodeToggle: ".cart__promocode-button",
  promocodeInput: '.cart__input[placeholder="Enter your promocode"]',
  promocodeApplyButton: ".cart__promocode .cart__button",

  /* --- Auth (mobile variant) --- */
  authPage: ".auth-page",
  authTabs: ".auth-page__tabs",
  authTab: ".auth-page__tab",
  authTabActive: ".auth-page__tab-active",
  cartInput: ".cart__input",

  /* --- Close (WordPress mobile nav, not Vue) --- */
  wpCloseButton: ".mobile-navigation-close.js-mnav-close",
} as const;
