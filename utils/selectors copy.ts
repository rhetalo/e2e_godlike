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

/* ===== VPS Hosting (/vps-hosting/ → /cart-vps/) ===== */
// Confirmed via debug spec 17-Apr-2026.
export const VPS = {
  // Landing page — different BEM from game server storefronts
  planCard: ".vps-vds-dedi__plans-item",
  deployButton: "a.deploy-btn", // <a> link, not <button>
  deployButtonFull: "a.deploy-btn.vps-vds-dedi__plans-item__button",

  // Cart URL pattern (Vue SPA, different from /cart/)
  cartUrlPattern: /\/cart-vps/,

  // Billing step — same BEM as game servers (/cart-vps/)
  // Use .period__price-primary_amount for discounted price (not .period__price)
  periodPriceAmount: ".period__price-primary_amount",
  periodPriceFull: ".period__price-secondary",
  periodDiscount: ".period__discount",
  orderPricingPrice: ".order__pricing-price",

  // Configure step — /cart-vps?...&step=3
  // Only 2 datacenters: USA, Europe — no continent dropdown
  locationContainer: ".configure-server__locations",
  locationItem: ".configure-server__location",
  locationItemActive: ".configure-server__location-active",
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

/**
 * VPS Panel Selector Strategy Map
 * =================================
 * Target: https://vf-panel.godlike.host  (VirtFusion v4.x)
 *
 * ALL strings sourced from live :vlang props on the actual server detail page
 * and vlang JS chunks from /servers list.
 * Extracted from: GET /server/9c49ed96-56f4-41c8-bc5f-a8d44c21a486
 */

/* ===== Login Page (G01 chunk — confirmed) ===== */
export const LOGIN = {
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  loginButton: 'button:has-text("Login")',
  errorText: ':has-text("Please enter valid credentials. All attempts are logged.")',
} as const;

/* ===== Navigation Bar ===== */
export const NAV = {
  serversLink: 'a:has-text("Servers")',
  dashboardLink: 'a:has-text("Dashboard")',
  logoutLink: 'a:has-text("Logout")',
} as const;

/* ===== Servers List (/servers) ===== */
export const SERVER_LIST = {
  manageButton: 'button:has-text("Manage"), a:has-text("Manage")',
  deleteButton: 'button:has-text("Delete"), a:has-text("Delete")',
} as const;

/* ===== Delete Server Modal (from /servers list) ===== */
export const DELETE_MODAL = {
  // Confirmed from vlang in /servers page JS chunk:
  title: ':has-text("Delete Server")',
  body: ':has-text("Are you sure you want to delete this server?")',
  cancelButton: 'button:has-text("Cancel")',
  confirmButton: '[class*="modal"] button:has-text("Delete"), [role="dialog"] button:has-text("Delete")',
  successToast: ':has-text("Server deleted successfully")',
  errorToast: ':has-text("Server could not be deleted")',
} as const;

/* ===== Server Detail Page — Tab Names (/server/{UUID}) ===== */
// ALL confirmed from :vlang attribute on <client-server-manage> (vlang keys 71–77):
export const TABS = {
  overview: 'button:has-text("Overview"), a:has-text("Overview")',
  media: 'button:has-text("Media"), a:has-text("Media")',
  options: 'button:has-text("Options"), a:has-text("Options")',
  network: 'button:has-text("Network"), a:has-text("Network")',
  storage: 'button:has-text("Storage"), a:has-text("Storage")',
  backups: 'button:has-text("Backups"), a:has-text("Backups")',
  sharing: 'button:has-text("Sharing"), a:has-text("Sharing")',
} as const;

/* ===== Server Status Badge ===== */
// Confirmed HTML (May 2026):
//   <div class="p-3">&nbsp;&nbsp;Running</div>
//   <div class="p-3">&nbsp;&nbsp;Stopped</div>
// innerText() resolves &nbsp; to regular space — match with .trim()
export const STATUS = {
  badge: 'div.p-3',                       // filter by text "Running" or "Stopped"
  runningText: 'Running',                 // exact string after trim()
  stoppedText: 'Stopped',                 // exact string after trim()
} as const;

/* ===== Media Tab — Boot Order ===== */
// Confirmed HTML (May 2026). The Media tab shows:
//   1. Power management buttons (same as Overview)
//   2. Activity table (history of server actions)
//   3. Boot Order section (HDD / CD-DVD toggle)
// NOTE: There is NO OS template selection on this tab.
export const MEDIA = {
  // Boot Order section
  bootOrderHeading: 'h2.mb-4',                               // text: "Boot Order"
  hddTile: '.radio-tile:has(.radio-tile-label:has-text("HDD"))',
  cdDvdTile: '.radio-tile:has(.radio-tile-label:has-text("CD/DVD"))',
  hddRadio: 'input.radio-button[type="radio"][value="1"]',
  cdDvdRadio: 'input.radio-button[type="radio"][value="2"]',
  applyButton: 'button#server-boot-order-button',            // ⚠️ do NOT click in tests

  // Activity table (also present on Media tab)
  activityTable: 'table.table.table-normal',
  activityRows: "table.table.table-normal tbody tr:not([id^='debug'])",
  completeBadge: 'span.badge.badge-active',
} as const;

/* ===== Power Controls ===== */
// Confirmed from live dash-app.js and DevTools (May 2026):
export const POWER = {
  // Buttons
  boot: 'button[data-action="boot_server"]',       // NO modal — direct action
  shutdown: 'button[data-action="shutdown_server"]', // opens Bootstrap modal
  powerOff: 'button[data-action="poweroff_server"]', // opens Bootstrap modal
  restart: 'button[data-action="restart_server"]',   // opens Bootstrap modal

  // Active Bootstrap modal (Bootstrap adds .show class when open)
  activeModal: '.modal.show',

  // Cancel button — IDENTICAL HTML in ALL power modals (confirmed):
  //   <button type="button" class="btn btn-light w-100" data-bs-dismiss="modal">Cancel</button>
  modalCancel: 'button.btn.btn-light.w-100[data-bs-dismiss="modal"]',

  // Confirm buttons — specific text per action:
  shutdownConfirm: 'button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Shutdown")',
  restartConfirm: 'button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Restart")',
  powerOffConfirm: 'button.btn.btn-primary.w-100[data-bs-dismiss="modal"]:has-text("Power Off")',

  // Rebuild confirm — btn-danger, has stable id (confirmed):
  //   <button id="server-install-button" class="btn btn-danger w-100" data-bs-dismiss="modal">Continue</button>
  rebuildConfirm: 'button#server-install-button',

  // Confirmed modal body texts:
  shutdownModalText: 'Are you sure you want to shutdown this server?',
  restartModalText: 'Are you sure you want to restart this server?',
  powerOffModalText: 'Are you sure you want to power off this server?',
  rebuildModalText: 'Are you sure you want to rebuild this server?',
} as const;

/* ===== Activity Table ===== */
// Confirmed HTML (from DevTools snapshot, May 2026):
//   <table class="table table-normal mb-0">
//     <thead><tr><th>Task</th><th>Requested</th><th>Duration</th><th>Progress</th></tr></thead>
//     <tbody>
//       <tr><td>Poweroff</td>...<span class="badge badge-active w-100">Complete</span></tr>
//       <tr id="debugNNNN" style="display:none">...</tr>  ← excluded in queries
//     </tbody>
//   </table>
export const ACTIVITY = {
  table: 'table.table.table-normal',
  rows: "table.table.table-normal tbody tr:not([id^='debug'])",
  taskCell: 'table.table.table-normal tbody tr:not([id^="debug"]) td:first-child',
  completeBadge: 'span.badge.badge-active',
} as const;

/* ===== Notifications ===== */
export const ALERTS = {
  // vlang[276]: "Server created successfully."
  success: '[class*="alert-success"], [class*="toast-success"]',
  error: '[class*="alert-danger"], [class*="alert-error"], [class*="toast-error"]',
  anyAlert: '[class*="alert"], [class*="toast"], [role="alert"]',
} as const;
