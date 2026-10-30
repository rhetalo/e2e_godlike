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

  /**
   * JSON API квиза апгрейда в биллинге (аддон upsell_quiz, DEV-593). Ресурс и действие - query-параметрами
   * (`resource=offer&action=index&quiz_id=..&service_id=..`), авторизация - токен панели в `Authorization: Bearer`.
   */
  upsellQuizApi: "/clientarea/index.php?m=upsell_quiz&format=json",
} as const;

/** Квиз Minecraft Vanilla в биллинге (mod_upsell_quiz_quizes.id, live 30-Oct-2026). */
export const UPSELL_QUIZ_MC_VANILLA_ID = process.env.UPSELL_QUIZ_MC_VANILLA_ID ?? "9";

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

/**
 * Каталог игр /game-servers-en/, блок «List of games» (live-recon 15-Oct-2026: 20 ссылок).
 * coreGames — игры, которые точно должны быть (структурная проверка: список может расти).
 * landing — путь лендинга; у Minecraft ссылка ведёт на главную.
 */
export const GamesCatalog = {
  minLinks: 20,
  coreGames: ["Rust", "ARK Survival Evolved", "Minecraft", "Terraria", "Valheim"],
  sample: { name: "Rust", landing: /\/rust-server-hosting\/?(\?.*)?$/ },
  minecraft: { name: "Minecraft", landing: /^https:\/\/godlike\.host\/(\?.*)?$/ },
  /** Сетка карточек (live-recon 16-Oct-2026): порог «не меньше» под View All - каталог растёт, ровно N не сверяем. */
  grid: {
    minCards: 40,
    mobileGames: ["Minecraft Bedrock", "Terraria"],
    search: {
      single: { query: "rust", expected: "Rust" },
      // Пробелы + верхний регистр: поиск обязан обрезать и игнорировать регистр.
      multi: { query: "  ARK ", needle: "ark", expected: ["ARK Survival Evolved", "ARK: Survival Ascended"] },
    },
  },
} as const;

/**
 * Валюты свитчера в шапке витрины: [код, символ] в порядке отображения.
 * Confirmed live-recon 15-Oct-2026: 21 валюта (было 4 на 10-Jun). Валюта по умолчанию — по IP
 * (из Украины — UAH), поэтому тесты не завязываются на конкретную дефолтную валюту.
 */
export const StorefrontCurrencies = [
  ["USD", "$"], ["GBP", "£"], ["PLN", "zł"], ["EUR", "€"], ["INR", "₹"],
  ["MXN", "M$"], ["AUD", "A$"], ["CAD", "C$"], ["PHP", "₱"], ["BRL", "R$"],
  ["ARS", "AR$"], ["COP", "COL$"], ["CLP", "CLP$"], ["PEN", "S/"], ["IDR", "Rp"],
  ["VND", "₫"], ["MYR", "RM"], ["PKR", "Rs"], ["TRY", "₺"], ["SAR", "SAR"], ["UAH", "₴"],
] as const;

/**
 * Цена витрины «символ валюты + число» для ЛЮБОЙ валюты свитчера («€5.11», «₴719.00», «AR$1200»).
 * Валюта по умолчанию зависит от IP (из UA — UAH), поэтому не завязываемся на €/$.
 * Длинные символы первыми, чтобы «AR$» не матчился как «$».
 */
export const StorefrontPriceRe = new RegExp(
  `(?:${[...StorefrontCurrencies.map(([, symbol]) => symbol)]
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"))
    .join("|")})\\s?\\d`,
);

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

/**
 * Тестовые CurseForge manifest.json для окна «Upload custom modpack» (DEV-556, 23-Oct-2026).
 * Используются только для валидации (POST .../manifest/validate, read-only) - Proceed с ними не жмём.
 * partial: валидная запись (Fabric API 0.116.17 для 1.21.1) + запись без fileID → isValid, 1 пропуск.
 * broken: не JSON → «Invalid JSON: Syntax error».
 */
export const CurseForgeManifests = {
  partial: JSON.stringify({
    minecraft: { version: "1.21.1", modLoaders: [{ id: "fabric-0.16.10", primary: true }] },
    manifestType: "minecraftModpack",
    manifestVersion: 1,
    name: "e2e partial manifest",
    files: [
      { projectID: 306612, fileID: 8786256, required: true },
      { projectID: 238222, required: true },
    ],
  }),
  broken: "{not json",
} as const;

/**
 * Клиентский тест-мод для сканера client-only (DEV-492 / DEV-558): CF Controlling 19.0.3 под Fabric 1.21.1.
 * В каталоге скрыт (DEV-500) → ставится прямым POST /minecraft/mods. Панель определяет файл по хешу как
 * Modrinth-проект xv94TkTM → Uninstall идёт по `modrinth-xv94TkTM`. Live 23-Oct-2026 на test_e2e_mut_fabric.
 */
export const ClientOnlyTestMod = {
  install: { provider: "curseforge", mod_id: "250398", version_id: "5759860" },
  uninstallKey: "modrinth-xv94TkTM",
  catalogName: "Controlling",
  fileName: /^Controlling-fabric-1\.21\.1-19\.0\.3\.jar$/,
} as const;
