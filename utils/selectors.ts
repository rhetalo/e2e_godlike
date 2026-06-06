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

/* ===== Server States ===== */
// Confirmed: vlang 78–80
export const SERVER_STATE = {
  stopped: '"Stopped"',   // vlang[78]
  running: '"Running"',   // vlang[79]
  paused: '"Paused"',     // vlang[80]
} as const;

/* ===== Media Tab — Build / Install ===== */
// All strings confirmed from :vlang on real server page:
export const MEDIA = {
  // The main action button on the Media tab:
  //   "Rebuild" (vlang[196]) — when server already has OS
  //   "Install" (vlang[173]) — fresh install (also "Install with" vlang[172])
  actionButton: 'button:has-text("Rebuild"), button:has-text("Install")',

  // Rebuild confirmation modal (vlang[118] + vlang[119]):
  rebuildConfirmText: 'Are you sure you want to rebuild this server?',
  rebuildConfirmButton: 'button:has-text("Continue")',  // vlang[119]

  // Install confirmation modal (vlang[128] + vlang[130]):
  installConfirmButton: 'button:has-text("Install Now")',  // vlang[130]

  // "Cancel" button in both modals (vlang[3] / vlang[140])
  cancelButton: 'button:has-text("Cancel"), button:has-text("Cancel Rebuild")',

  // OS template section:
  operatingSystemLabel: ':has-text("Operating System")',  // vlang[149]
  templateOption: '[class*="template-option"], [class*="os-option"], [data-template-id], [class*="media-item"]',

  // Status during build (vlang[136, 181]):
  buildingText: ':has-text("Server Setup"), :has-text("being built")',
} as const;

/* ===== Power Controls ===== */
// Confirmed action names from live dash-app.js:
export const POWER = {
  boot: 'button[data-action="boot_server"], button:has-text("Boot")',
  shutdown: 'button[data-action="shutdown_server"], button:has-text("Shutdown")',  // vlang[123]
  powerOff: 'button[data-action="poweroff_server"], button:has-text("Power Off")', // vlang[120]
  restart: 'button[data-action="restart_server"], button:has-text("Restart")',     // vlang[94]
} as const;

/* ===== Notifications ===== */
export const ALERTS = {
  // vlang[276]: "Server created successfully."
  success: '[class*="alert-success"], [class*="toast-success"]',
  error: '[class*="alert-danger"], [class*="alert-error"], [class*="toast-error"]',
  anyAlert: '[class*="alert"], [class*="toast"], [role="alert"]',
} as const;

/* ===== Game Panel — ultra.panel.godlike.host (Minecraft) ===== */
// Confirmed via live recon 03-Jun-2026 (server ebb03adc, Paper 1.21.11).
// Panel is a Vue SPA; server cards are clickable divs (no href), power
// controls and tabs are text-labelled. An onboarding shepherd.js overlay
// can intercept clicks — see GAME_PANEL_TOUR + components/game/ShepherdTour.
export const GAME_PANEL_LOGIN = {
  chooserButton: 'button:has-text("Through Login/Password")', // chooser screen before the form
  email: 'input[type="email"]',         // placeholder "Username or Email"
  password: 'input[type="password"]',   // placeholder "Password"
  submit: 'button[type="submit"]:has-text("Login"), button:has-text("Login")',
  error: '[class*="toast"], [class*="alert"], [class*="notification"], [class*="error"]',
} as const;

export const GAME_PANEL_TOUR = {
  overlay: '.shepherd-modal-is-visible, .shepherd-modal-overlay-container, .shepherd-enabled',
  close: 'button:has-text("Skip"), button:has-text("Close"), button:has-text("Got it"), button[aria-label="Close"]',
} as const;

export const GAME_PANEL_DASHBOARD = {
  heading: 'h1, h2',                       // filter by /My Servers/ in the page object
  server: '.dashboard__servers .server',
  serverSuspended: '.dashboard__servers .server.server__suspended',
  serverName: '.dashboard__servers .server .main1',
  filterSuspended: 'button:has-text("Suspended")',
  filterFree: 'button:has-text("Free")',
} as const;

export const GAME_PANEL_SERVER = {
  editServer: 'button:has-text("Edit Server"), a:has-text("Edit Server")',
  invitePeople: 'button:has-text("Invite People"), a:has-text("Invite People")',
  consoleCommandInput: 'input[placeholder*="Command" i], [class*="console"] input',
  consoleLog: ".terminal-container, .terminal", // websocket-лог сервера
  // ВАЖНО: online-статус в панели — "Running" (не "Online"); offline — "Offline".
  statusWord: /Running|Online|Offline|Starting|Stopping|Installing|Suspended/i,
  addressText: /srv\d+\.godlike\.club:\d+/i,
  // Edit Server диалог (rename + Game/Platform/Type). ⚠️ "Reinstall Server" НЕ жать (деструктив).
  // После "Save Changes" диалог закрывается и заголовок обновляется РЕАКТИВНО (без reload).
  editDialog: ".edit__server-block__dialog",
  editNameInput: ".edit__server-block__dialog input.v-field__input", // первый v-field__input = Server Name
  editSaveButton: '.edit__server-block__dialog button:has-text("Save Changes")',
  overviewTitle: ".server__overview-title",                           // h2 с именем сервера
} as const;

// Power toggle uses accessible button NAMES (exact). The primary button toggles
// Start → Starting → Shut Down; Restart/Kill are separate and open a confirm dialog.
// Confirmed via live DOM 03-Jun-2026.
export const GAME_PANEL_POWER = {
  start: "Start",
  starting: "Starting",
  shutDown: "Shut Down",
  restart: "Restart",
  kill: "Kill",
} as const;

// Vuetify confirmation / EULA dialog. Primary button = confirm
// ("I Accept" / "Yes, Restart" / "Yes, Kill"); the other is Cancel.
export const GAME_PANEL_DIALOG = {
  root: ".v-card.dialog",
  confirmBtn: "button.dialog__button-primary",
  cancelBtn: "button.dialog__button:not(.dialog__button-primary)",
  eulaTitle: /Accept Minecraft.*EULA/i,
  restartTitle: /Restart the server\?/i,
  killTitle: /Kill the server\?/i,
} as const;

// Top tab strip inside the server view (route-backed).
export const GAME_PANEL_TABS = [
  'Overview', 'Console', 'Files', 'Versions', 'Plugins/Mods', 'Modpacks', 'Config', 'Players',
] as const;

// Per-server left sidebar sections.
export const GAME_PANEL_SECTIONS = [
  'Overview', 'Sharing', 'Port & Domains', 'Backups', 'Tasks', 'Databases',
] as const;

// File manager (/server/{uuid}/files). Confirmed via live DOM 03-Jun-2026.
// Список — v-data-table (tr.v-data-table__tr); удаление: чекбокс строки → нижний
// Delete → confirm-диалог (.v-card.dialog → .dialog__button-primary; в Recycle Bin на 24ч).
export const GAME_PANEL_FILES = {
  newFolderButton: 'button:has-text("New folder")',
  newFileButton: 'button:has-text("New file")',
  uploadButton: 'button:has-text("Upload file")',
  dialogTitle: ".server__file-manager__dialog-title",                      // "Create folder" / "Create file"
  dialogNameInput: "input.v-field__input",                                // внутри диалога
  dialogSaveButton: "button.server__file-manager__modal-button--primary", // "Save"
  fileName: ".server__file-manager__file-list__file-name",
  row: "tr.v-data-table__tr",
  rowCheckbox: 'input[type="checkbox"]',
  footerActionGroup: ".server__file-manager__action-btn-group",           // Download/Move/Duplicate/Delete
  // confirm-диалог удаления («Delete File»): подтверждение — danger-кнопка (НЕ dialog__button-primary)
  dialogTitleSel: ".server__file-manager__dialog-title",
  deleteConfirmButton: "button.server__file-manager__modal-button--danger",
  dialogCloseButton: "button.server__file-manager__dialog__btn-close",     // Cancel
  // SFTP Connect диалог (структурный; ⚠️ Generate/Save НЕ жать — меняют SFTP-пароль)
  sftpButton: 'button:has-text("SFTP Connect")',
  sftpForm: ".server__file-manager__sftp-form",
  // CurseForge upload-модпак диалог (структурный; ⚠️ не загружать)
  curseForgeButton: 'button:has-text("Upload custom modpack")',
  curseForgeDialog: ".curseforge-dialog__content, [class*='curseforge-dialog']",
  // per-row "..." меню действий (Open/Pin/Copy×3/Rename/Move/Archive/Duplicate/Download/Delete)
  rowActionsBtn: ".server__file-manager__file-list-item__actions-btn",
  rowActionsItem: ".v-overlay--active .v-list-item",                        // пункт открытого меню
  // Rename-диалог (из "..."→Rename): инпут предзаполнен текущим именем, confirm-кнопка "Rename"
  // (класс .server__file-manager__modal-button; заголовок диалога шарится с "Move file").
  renameConfirm: '.v-overlay--active button.server__file-manager__modal-button:has-text("Rename")',
} as const;

// Config tab (/server/{uuid}/config). Confirmed via live DOM 04-Jun-2026 (recon).
// Редактор server.properties: каждая строка — .server__config-switch, внутри Vuetify-инпут
// (input.v-field__input) + лейбл-имя свойства (motd/difficulty/max-players/level-name/...).
// ⚠️ Save-кнопки НЕТ — форма автосейвит при изменении поля; персист проверяем через reload.
// id инпутов динамические (input-v-NNN) — НЕ использовать; якорь — имя свойства в тексте строки.
export const GAME_PANEL_CONFIG = {
  row: ".server__config-switch",          // одна строка-свойство (текст начинается с имени свойства)
  input: "input.v-field__input",          // текстовый инпут внутри строки
  // примеры ключей server.properties (для структурных проверок)
  keys: ["motd", "difficulty", "max-players", "level-name"],
} as const;

// Players tab (/server/{uuid}/players). Confirmed via live DOM 05-Jun-2026 (recon).
// Управление игроками (whitelist/op) требует Online-сервера; в тестах делаем через
// консоль (источник правды): whitelist add/list/remove (см. GamePanelServerPage).
// Сам таб рендерит блок .server__players с карточками (offline тоже виден).
export const GAME_PANEL_PLAYERS = {
  area: ".server__players",                     // корневой блок таба Players
  cardTitle: ".server__players-card__title",    // заголовок карточки (напр. "Server Administrators")
} as const;

// Sharing section (/server/{uuid}/sharing). Confirmed via live DOM 05-Jun-2026 (recon).
// Карточки Invite User / Pending Invites / Roles / Members / Audit Log. Работает и offline.
// Кнопка Send Invite disabled, пока не заполнены email+role. В тестах НЕ инвайтим
// (шлёт реальный email) — проверяем структуру + что уже приглашённый виден в Members.
export const GAME_PANEL_SHARING = {
  card: ".sharing__card",                                                  // карточка-секция
  cardTitle: ".sharing__card-header-title",                                // заголовок карточки
  inviteForm: ".sharing__invite-form",
  inviteEmail: '.sharing__invite-form input[type="email"]',                // поле email (placeholder "Email")
  sendInviteButton: '.sharing__invite-form-submit, button:has-text("Send Invite")',
  list: ".sharing__invite-list",                                           // таблица invites/members
  row: ".sharing__invite-row",
  // Смена роли участника (только у не-owner): Vuetify v-select Co-owner/Moderator/Member.
  // ⚠️ in-place selection-text обновляется НЕ сразу — персист/проверка через reload.
  memberRoleSelect: ".sharing__members-column-role-select",
  roleSelectionText: ".v-select__selection-text",
  roleOption: '[role="option"], .v-overlay .v-list-item',
} as const;

// Port & Domains (/server/{uuid}/network). Confirmed via live DOM 05-Jun-2026 (recon).
// Subdomain-блок (домен-селект + Update/Copy) + Network Ports (карточки портов + Add Port).
// Работает и offline. В тестах НЕ мутируем (Update Subdomain / Add Port) — структурные проверки.
export const GAME_PANEL_NETWORK = {
  subdomainBlock: ".server__subdomain-block",
  updateSubdomainButton: 'button:has-text("Update Subdomain")',
  portsSection: ".server__network-ports",
  portCard: ".server__network-ports__port",
  portValue: ".server__network-ports__port-port",
  addPortButton: 'button:has-text("Add Additional Port")',
  // Add Additional Port диалог (структурный; ⚠️ "Add Port" НЕ жать — добавит порт)
  addPortNameInput: '.v-overlay--active input[placeholder="Enter a descriptive name..."]',
  addPortConfirm: '.v-overlay--active button:has-text("Add Port")',
} as const;

// Tasks (/server/{uuid}/tasks). Confirmed via live DOM 05-Jun-2026 (recon).
// All Tasks (табы Your/Default + дефолтные задачи Send command / Send power action,
// у каждой Configure/Run) + Scheduled Tasks (список запланированных, по умолчанию пусто).
// Работает offline. ⚠️ В тестах НЕ жмём Run/Configure (Run выполняет задачу = мутация).
export const GAME_PANEL_TASKS = {
  panel: ".server__tasks__panel",
  title: ".server__tasks__title",
  taskItem: ".server__tasks__task",
  taskTitle: ".server__tasks__task-title",
  tabsButton: ".server__tasks__all-tasks__tabs-btn",
  // Configure-диалог задачи (.server__dialogs__action-dialog). Видна форма выбранного типа;
  // у "Send command" — Task name + Payload(Command). ⚠️ Run НЕ жмём.
  configureButton: 'button:has-text("Configure")',
  dialog: ".server__dialogs__action-dialog",
  dialogNameInput: '.v-overlay--active input[placeholder="Enter a name..."]:visible',
  dialogPayloadInput: '.v-overlay--active textarea[placeholder="Command"]',
  dialogSave: '.v-overlay--active button:has-text("Save")',
  // вкладка созданных задач + меню задачи (иконка → Schedule/Edit/Remove) + confirm удаления
  yourTasksTab: '[role="tab"]:has-text("Your Tasks")',
  taskMenuItem: ".v-overlay--active .v-list-item",          // Remove и др.
  deleteConfirm: '.v-overlay--active button:has-text("Delete")',
} as const;

// Backups (/server/{uuid}/backups). Confirmed via live DOM 05-Jun-2026 (recon).
// Работает и offline. Create — INLINE-форма (не модалка): таб типа (Server/Database/Folder),
// для Server нужно выбрать сервер в v-select + ввести имя → кнопка "Create Backup"
// (.gradient-button) включается. Список .backups-list (NAME/DATE/SIZE/STATUS/TYPE/ACTIONS),
// статус-чип .backups-list__status (--completed когда готов = async-джоба). Действия строки —
// меню "..." .backups-list__more-btn → .backups-list__action-menu (Restore/Rename/Lock/Delete).
// Квота: .backups-list__subtitle "N/3 slots used". ⚠️ Restore — деструктивный, НЕ трогаем.
export const GAME_PANEL_BACKUPS = {
  root: ".backups",
  tab: ".backups__tab",                                   // Server / Database / Folder
  form: ".backups__form",
  serverSelectField: ".backups__form-select .v-field",    // первый — v-select выбора сервера
  nameInput: 'input[placeholder="Enter backup name"]',    // имя бэкапа (макс 38)
  createButton: 'button.gradient-button:has-text("Create Backup")', // disabled пока нет сервера+имени
  overlayOption: ".v-overlay--active .v-list-item",        // опция открытого v-select (фильтр по имени сервера)
  // список существующих бэкапов
  list: ".backups-list",
  row: ".backups-list__row",
  nameCell: ".backups-list__name-cell",
  status: ".backups-list__status",                         // чип статуса в строке
  statusCompleted: ".backups-list__status--completed",     // модификатор "готов"
  quota: ".backups-list__subtitle",                        // "N/3 slots used"
  footer: ".backups-list__footer",                         // "Showing N backups. M remaining."
  refreshBtn: ".backups-list__refresh-btn",
  moreBtn: ".backups-list__more-btn",                      // меню "..." строки
  actionMenu: ".backups-list__action-menu",
  menuItem: ".backups-list__menu-item",                    // Restore / Rename / Lock / Delete
  // confirm-диалог удаления (.delete-dialog): "Delete Backup … permanent and cannot be undone"
  deleteConfirmButton: ".delete-dialog__confirm",          // danger-кнопка "Delete" (bg-error)
  deleteCancelButton: ".delete-dialog__cancel",
  // запланированные бэкапы
  scheduled: ".scheduled-backups",
  scheduledEmpty: ".scheduled-backups__empty",
} as const;

// Versions (/server/{uuid}/minecraft/versions). Confirmed via live DOM 06-Jun-2026 (MCP recon).
// Шапка "Currently running ..." (.server__version) + сетка семейств server-software
// (.server__versions-type: Vanilla/Paper/NeoForge/Fabric/...). Клик по семейству → ?type=NAME
// со списком версий (Go Back + тогл Show Snapshot Versions). ⚠️ install = деструктивный rebuild —
// в тестах до установки НЕ доходим, только структура + drill-down.
export const GAME_PANEL_VERSIONS = {
  root: ".server__versions",                       // сетка семейств
  installedBlock: ".server__version",              // карточка "Currently running ..."
  installedTitle: ".server__version-title",        // заголовок установленной версии
  familyCard: ".server__versions-type",            // карточка семейства (клик → список версий)
  familyTitle: ".server__versions-type__title",    // имя семейства (Vanilla/Paper/NeoForge/...)
  goBack: 'text="Go Back"',                         // в drill-down списке версий (вернуться к семействам)
  snapshotToggle: 'text="Show Snapshot Versions"',  // тогл snapshot-сборок в drill-down
} as const;

// Plugins/Mods (/server/{uuid}/extensions) + Modpacks (/server/{uuid}/modpacks).
// Confirmed via live DOM 06-Jun-2026 (MCP recon). ⚠️ ОДИН компонент .server__extensions для обоих
// (отличаются контентом; document.title у modpacks тоже "Extensions"). Заголовок h1.__header-title
// = "Mods" / "Modpacks". Фильтр-кнопки Mods/Plugins/All/Installed (.__extension-type__button),
// поиск (.__extension-search__input), Category/Author (.__filter-item), sort-by. У элемента — Install.
// ⚠️ В тестах Install НЕ жмём (установка мода/плагина = мутация) — структурные проверки.
export const GAME_PANEL_EXTENSIONS = {
  root: ".server__extensions",
  headerTitle: ".server__extensions__header-title", // "Mods" / "Modpacks"
  typeButton: ".server__extensions__extension-type__button", // Mods / Plugins / All / Installed
  searchInput: ".server__extensions__extension-search__input",
  filterItem: ".server__extensions__filter-item",   // Category / Author
  sortBy: ".server__extensions__sort-by",
  body: ".server__extensions__body",
  installButton: 'button:has-text("Install")',      // per-item (НЕ жать)
} as const;

// Referral (/referral). Глобальная страница (default_layout), не server-scoped.
// Confirmed via live DOM 06-Jun-2026 (MCP recon). Реф-ссылка (readonly) + Copy Link, баланс +
// Request Withdrawal, How It Works (3 шага), соц-кнопки, Referrals Analytics.
// ⚠️ В тестах НЕ жмём Request Withdrawal (вывод средств) — структурные проверки.
export const GAME_PANEL_REFERRAL = {
  title: ".referral-page__title",
  refLink: ".link-card__input-wrapper input, .link-card__input", // readonly реф-ссылка
  copyLinkButton: ".link-card__btn",
  withdrawButton: ".balance-card__btn",              // ⚠️ Request Withdrawal — НЕ жать
  howItWorks: ".how-it-works__title",
  socialShare: ".social-share__buttons",
} as const;

// Boost / Upgrade (/server/{uuid}/upgrade). Confirmed via live DOM 06-Jun-2026 (MCP recon).
// Вход — ссылка "Boost my server" (a[href*="/upgrade"], с промокодом). Карточка текущего плана
// + карточки планов на выбор + цены + Budget/Premium + квиз. ⚠️ ПЛАТЁЖНЫЙ ФЛОУ: план НЕ выбирать,
// checkout НЕ проходить — только структурные проверки.
export const GAME_PANEL_UPGRADE = {
  boostLink: 'a[href*="/upgrade"]',                  // "Boost my server" (вход; промокод в href)
  root: ".server__upgrade",
  currentPlanCard: ".current-plan-card__wrapper",
  planCard: ".simple-plan-card__wrapper",
  // цену проверяем по тексту валюты в корне (классы цены грузятся async / варьируются)
  priceText: /[€$]\s?\d/,
  backButton: ".server__upgrade__btn-back",
} as const;

// Free Premium модалка. Кнопка "What is a Free Premium?" (на страницах сервера) → premium__dialog
// со списком премиум-фич + CTA "Get Premium (3-Days Trial)". Confirmed via MCP recon 06-Jun-2026.
// ⚠️ CTA = конверсия/триал (ведёт к апгрейду) — НЕ жать; только структура.
export const GAME_PANEL_PREMIUM = {
  openButton: 'button:has-text("What is a Free Premium?")',
  dialog: ".premium__dialog",
  dialogTitle: ".premium__dialog-title",
  ctaButton: ".premium__dialog-button",              // "Get Premium (3-Days Trial)" — ⚠️ НЕ жать
} as const;

// Console full-page (/server/{uuid}/console). Confirmed via MCP recon 06-Jun-2026.
// Командный инпут + кнопка "Commands" → диалог-палитра (searchable справочник команд:
// .command-item__title/__subtitle, поиск "Search command..."). Палитра — read-only (не отправляет).
export const GAME_PANEL_CONSOLE = {
  commandInput: 'input[placeholder="Enter a command"]',
  commandsButton: 'button:has-text("Commands")',
  paletteSearch: 'input[placeholder="Search command..."]',
  paletteItem: ".command-item__title",
} as const;
