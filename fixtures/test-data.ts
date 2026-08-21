/**
 * Centralised test data. All values verified against the live godlike.host
 * site (see scripts/inspect-* in the original godlike-e2e project for raw
 * DOM dumps).
 *
 * URLs are paths relative to baseURL (https://godlike.host).
 */

export const BASE_URL = "https://godlike.host";

export const Urls = {
  home: "/",
  login: "/clientarea/login",
  clientarea: "/clientarea/clientarea.php",

  moddedHosting: "/modded-minecraft-server-hosting/",
  seedSkyHaven: "/minecraft-seeds/sky-haven-island-atm-10-seed/",

  /** Каталог игровых серверов (game-servers) — вход для promo-проверок по играм. */
  gameServers: "/game-servers-en/",

  /**
   * Лендинг Minecraft Java — вход в воронку для funnel/registration-спеков.
   *
   * Раньше они попадали сюда кликом «View all plans» с главной. Такой кнопки на
   * главной больше нет: единственная ссылка осталась в выпадашке хедера, которая
   * раскрывается по ховеру, и клик по ней перехватывает плашка
   * .main-header__intro-stripe («Stripe Climate Member»). Ходим прямым URL.
   */
  minecraftJava: "/minecraft-java-servers-hosting/",

  /** Vue cart used by both modpack-grid install buttons and seed BUY buttons. */
  cart: "/cart",

  /** Vue cart variant used by the in-page calculator's "Host Now" CTA. */
  cartModdedNew: "/cart-modded-new/",

  /**
   * Final WHMCS Lagom payment page. Reached AFTER login + Next step on the Vue
   * cart. Tests stop here — they NEVER click "Continue" on this page.
   */
  cartCheckout: "/clientarea/cart.php?a=checkout",
} as const;

/**
 * Ключевые публичные storefront-страницы для структурных SEO/breadth-проверок.
 * path — относительно BASE_URL; label — для имени теста. Confirmed recon 15-Jun-2026.
 */
export const StorefrontPages = [
  { path: "/", label: "Главная" },
  { path: "/minecraft-java-servers-hosting/", label: "Minecraft Java хостинг" },
  { path: "/vps-hosting/", label: "VPS хостинг" },
  { path: "/modded-minecraft-server-hosting/", label: "Modded хостинг" },
  { path: "/minecraft-seeds/", label: "Каталог сидов" },
] as const;

/** A URL is "the payment step" if it matches any of these. */
export const PaymentUrlPatterns = [
  /\/clientarea\/cart\.php\?a=checkout/i,
  /\/clientarea\/cart\.php\?a=complete/i,
  /\/clientarea\/viewinvoice\.php/i,
] as const;

/** A URL is "Vue cart step 2 (billing cycle)" if it matches this. */
export const VueCartStep2Pattern = /\/cart\?[^#]*step=2/i;

/**
 * Корзина, куда ведёт install-кнопка грида модпаков, — с productId в query.
 *
 * DEV-400: раньше это была только старая /cart?…, теперь кнопка ведёт в
 * /cart-modded-new/?…. Держим оба: страницы уже показали, что могут вернуться назад.
 */
export const ModdedCartProductPattern = /\/cart(-modded-new)?\/?\?[^#]*productId=/i;

/** Vue-cart путь с тарифом для проверки auth-block (login.validation.spec.ts). */
export const CartAuthValidationPath =
  "/cart?productId=346&billingCycle=monthly&currency=1&modpackId=curseforge-925200&promo=COMMUNITY40";

/**
 * Test account. Override via env vars when running locally if needed.
 * Reference project uses the same shared test@testmail.com account.
 */
export const Credentials = {
  email: process.env.CLIENTAREA_EMAIL ?? "test@testmail.com",
  password: process.env.CLIENTAREA_PASSWORD ?? "test@testmail.com",
};

/**
 * Свежий/free аккаунт (без активных подписок) — одноразовые промо ещё НЕ израсходованы.
 * Единственный источник правды для free-учётки; используется в
 * tests/modded/games.valid.promo.spec.ts. Override через CLIENTAREA_FREE_* в .env.
 */
export const CredentialsFree = {
  email: process.env.CLIENTAREA_FREE_EMAIL ?? "testfree2@testmail.com",
  password: process.env.CLIENTAREA_FREE_PASSWORD ?? "testfree2@testmail.com",
};

/**
 * Quick-pick modpack pills present on /modded-minecraft-server-hosting/.
 * Verified by DOM inspection on 2026-04-26.
 */
export const QuickPickModpacks = [
  "ATM 10",
  "BMC 4",
  "Prominence II",
  "RLCraft",
  "ATMons",
] as const;

export type QuickPickModpack = (typeof QuickPickModpacks)[number];
