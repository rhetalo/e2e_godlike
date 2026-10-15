# Game servers catalog /game-servers-en/ - test plan (native)

## Application Overview

Live production storefront https://godlike.host/game-servers-en/ (WordPress template page-template-games). Read-only plan: never click Order/Buy/Host now/checkout, never log in. Recon 16-Oct-2026 (live, Playwright MCP) found TWO distinct blocks. (A) Games GRID (.games__wrapper, .game cards, 46 cards today) with filter tabs View All/PC/Mobile/Console and a "Search for games..." textbox; clicking a card goes DIRECTLY to /cart-game-servers/?productId=N&billingCycle=monthly (not to the landing). (B) The SEO tab "List of games" (li[data-tab=3], .seotext__body a, 20 links) which links to landing pages (e.g. Rust -> /rust-server-hosting/, Minecraft -> /). Existing tests/general/games.catalog.spec.ts (TC-GAMES-001..004) covers ONLY block B. Header "Game servers" dropdown (5 games + "More Games / View all games") has no dedicated coverage (storefront.breadth only checks mobile nav, locale.spec only the language/currency switcher). Prices are shown in the visitor's currency (UAH from UA IP) so assert structure (regex), not amounts. Prod appends ?rtkcid=... so match URLs by regex. Dismiss banners via fixtures/base.

## Test Scenarios

### 1. A. 'List of games' SEO block (landing links)

**Seed:** `tests/seed.spec.ts`

#### 1.1. A1 List contains a minimum set of games with unique names and core games present (covered by tests/general/games.catalog.spec.ts TC-GAMES-001)

**File:** `tests/general/games.catalog.spec.ts`

**Steps:**
  1. Open /game-servers-en/ and read links in .seotext__body a
    - expect: Live: 20 links; >=20, names unique, Rust/ARK Survival Evolved/Minecraft/Terraria/Valheim present
    - expect: Already covered - do not re-implement

#### 1.2. A2 Every link in the list is internal, non-empty and unique (covered by games.catalog.spec.ts TC-GAMES-002)

**File:** `tests/general/games.catalog.spec.ts`

**Steps:**
  1. Read hrefs of all list links
    - expect: No '#'/empty href, same host, no duplicate paths
    - expect: Already covered

#### 1.3. A3 Click Rust in list opens its landing, Back returns to catalog (covered by games.catalog.spec.ts TC-GAMES-003)

**File:** `tests/general/games.catalog.spec.ts`

**Steps:**
  1. Click 'Rust' in List of games, then page.goBack()
    - expect: URL matches /rust-server-hosting/, H1 contains Rust
    - expect: Back returns to /game-servers-en/ - covered

#### 1.4. A4 Minecraft entry in list leads to the home Minecraft storefront (covered by games.catalog.spec.ts TC-GAMES-004)

**File:** `tests/general/games.catalog.spec.ts`

**Steps:**
  1. Click 'Minecraft' in List of games
    - expect: Lands on https://godlike.host/ with Minecraft H1 - covered. Verified live: href is https://godlike.host/

#### 1.5. A5 Every list link resolves to a 200 landing page with an H1 (not covered; verified only for Rust, hrefs read live, 20/20 not fetched)

**File:** `tests/general/games.catalog.landings.spec.ts`

**Steps:**
  1. For each of the 20 hrefs from .seotext__body a, request it via page.request.get (no UI clicks) and open 3 representative ones (Rust, Counter Strike 2 /best-cs2-server-hosting/, Garry's Mod /gmod-server-hosting/)
    - expect: Status 200 (after redirects), no redirect to /game-servers-en/ or 404
    - expect: Landing H1 is non-empty and mentions the game; canonical of the landing points to itself (read the landing's own canonical, not the catalog's)
    - expect: Note slugs are irregular (best-cs2-..., tf2-..., gmod-...) so assert via hrefs read at runtime, never hardcoded

#### 1.6. A6 'List of games' sidebar tab is present among the 7 SEO tabs and its content is reachable (partly verified)

**File:** `tests/general/games.catalog.seo-tabs.spec.ts`

**Steps:**
  1. Scroll to the 'Game Server Hosting' SEO section, check tab list contains 'List of games', click li[data-tab=3]
    - expect: Live: after click .seotext__body links stay visible (20 links)
    - expect: Not verified live: whether the <h2>'List of games' becomes visible after the click (h2 was reported not visible in one probe) - open question, check manually before asserting

#### 1.7. A7 Catalog list vs grid parity: games in List of games are also present as grid cards (not covered)

**File:** `tests/general/games.catalog.parity.spec.ts`

**Steps:**
  1. Collect names from the list links and alt texts from grid cards .games__wrapper .game__image
    - expect: Names differ in spelling ('Counter Strike 2' vs 'CS 2', '7 days to die' vs '7 Days to Die', 'ARMA 3' vs 'Arma 3', 'Garry's Mod' vs 'Garrys Mod') so compare case-insensitively with an alias map or compare by landing path
    - expect: Soft assertion: every list game has a grid card; extra grid cards (e.g. Hytale, Palworld) are allowed. Not verified live as an automated check

### 2. B. Games grid, filters and search

**Seed:** `tests/seed.spec.ts`

#### 2.1. B1 Grid renders cards with name, platform icons and 'Starting at' price (not covered)

**File:** `tests/general/games.grid.spec.ts`

**Steps:**
  1. Open /game-servers-en/, count .games__wrapper .game cards
    - expect: Live: 46 cards under View All (>=40 as structural floor)
    - expect: Each card has an image with alt, and a 'Starting at' price matching currency-agnostic regex /[\d.,]+/ (live ex: ₴143.20 .. ₴17,099.10)
    - expect: Some cards carry badges ('new update', 'official partner') and some have no platform icons (Squad, Game Dedicated Server Hosting) - do not require icons on every card

#### 2.2. B2 Filter tabs PC / Mobile / Console narrow the grid, View All restores it (not covered)

**File:** `tests/general/games.grid.filters.spec.ts`

**Steps:**
  1. Click PC, then Mobile, then Console, then View All; count visible cards each time
    - expect: Live counts: View All 46, PC 44, Mobile 7, Console 2 (the logo imgs are excluded; Console shows 'no real game cards' visually - 2 hits were site logos)
    - expect: Assert ordering invariant only: Console <= Mobile <= PC <= View All; Mobile cards include Minecraft Bedrock and Terraria
    - expect: After View All count equals the initial count

#### 2.3. B3 Search filters the grid case-insensitively, trims whitespace (not covered)

**File:** `tests/general/games.grid.search.spec.ts`

**Steps:**
  1. Type 'rust' in 'Search for games...'
    - expect: Only the Rust card remains (live verified)
  2. Replace with '  ARK ' (leading/trailing spaces, upper case)
    - expect: Live: 2 cards remain - ARK Survival Evolved and ARK: Survival Ascended
  3. Clear the field
    - expect: Full grid returns (not verified live after clear - assert count equals initial)

#### 2.4. B4 Search with no matches shows an empty grid (negative; empty-state message not verified)

**File:** `tests/general/games.grid.search.spec.ts`

**Steps:**
  1. Type 'zzzzqq'
    - expect: Live: zero game cards visible, no JS crash
    - expect: No 'nothing found' text was found by regex probe - open question whether an empty-state message is intended; assert only 0 cards

#### 2.5. B5 Search edge inputs: special characters and very long string (not verified live)

**File:** `tests/general/games.grid.search.spec.ts`

**Steps:**
  1. Type '<script>', '%', 'a'.repeat(500), then a single letter 'a'
    - expect: Not verified live. Expected: no navigation, no dialog, no console error beyond baseline, grid filters or empties gracefully; field text is not rendered as HTML

#### 2.6. B6 Filter and search combined (not verified live)

**File:** `tests/general/games.grid.search.spec.ts`

**Steps:**
  1. Click Mobile, then search 'terraria'; then search 'rust' while Mobile is active
    - expect: Not verified live. Expected: Terraria visible for Mobile; Rust (PC only) yields an empty grid - confirm intended behaviour before asserting

#### 2.7. B7 Grid card click goes to the cart page with productId, Back returns to the catalog (not covered, read-only)

**File:** `tests/general/games.grid.cards.spec.ts`

**Steps:**
  1. Click the card image for Rust, Hytale, ARK: Survival Ascended, Minecraft, Soulmask, Squad one at a time (go back between). Do NOT interact with the cart page
    - expect: Live: every card opens /cart-game-servers/?productId=<N>&billingCycle=monthly (Rust 380, Hytale 914, ASA 414, Minecraft 342, Soulmask 757, Squad 739 on 16-Oct)
    - expect: Assert regex /cart-game-servers\/\?productId=\d+/ only, never hardcode IDs
    - expect: page.goBack() returns to /game-servers-en/ with the grid visible (live verified for last card)
    - expect: Sub-case: Minecraft in the grid goes to the cart while Minecraft in the SEO list goes to / - document as intended difference, not a defect (open question to marketing)

#### 2.8. B8 Cards that are plain links vs click-handlers (not covered)

**File:** `tests/general/games.grid.cards.spec.ts`

**Steps:**
  1. Check which cards expose a real <a href>: live snapshot shows only 'Modded Minecraft' (/modded-minecraft-server-hosting/), 'Game Dedicated Server Hosting' (/dedicated-server-hosting/) and 'Gaming VPS' (/gaming-vps/) as links; other cards are JS click handlers
    - expect: Link cards navigate to their landing (not the cart); verify Modded Minecraft and Gaming VPS by click (not verified live)
    - expect: Accessibility note: JS-only cards are not keyboard focusable/crawlable - report as improvement, not defect

### 3. C. Header navigation into games

**Seed:** `tests/seed.spec.ts`

#### 3.1. C1 Header 'Game servers' link opens the catalog (not covered; verified live)

**File:** `tests/general/header.games-nav.spec.ts`

**Steps:**
  1. Open https://godlike.host/ and click the 'Game servers' top-level link
    - expect: URL /game-servers-en/, H1 'Premium server hosting and more' (live verified)

#### 3.2. C2 Hover dropdown lists 5 games with prices and 'More Games / View all games' (not covered; verified live in DOM)

**File:** `tests/general/header.games-nav.spec.ts`

**Steps:**
  1. Hover 'Game servers'
    - expect: Dropdown items visible: Minecraft Bedrock, Vintage Story, Palworld, Terraria, ARK, each with image and 'Starting at' price; plus 'More Games - View all games' (hrefs verified in DOM)
    - expect: Assert structure: >=5 game items + 1 'View all games' link

#### 3.3. C3 Dropdown item Minecraft Bedrock opens its landing (not covered; verified live)

**File:** `tests/general/header.games-nav.spec.ts`

**Steps:**
  1. From /game-servers-en/ hover Game servers and click 'Minecraft Bedrock'
    - expect: URL /minecraft-bedrock-servers-hosting/, H1 'Minecraft Bedrock Edition Server Hosting', landing canonical equals its own URL (verified)

#### 3.4. C4 Dropdown item ARK opens its landing from the home page (not covered; verified live)

**File:** `tests/general/header.games-nav.spec.ts`

**Steps:**
  1. From https://godlike.host/ hover Game servers and click ARK
    - expect: URL /ark-survival-evolved-server-hosting/, H1 'ARK: Survival Evolved Server Hosting' (verified)

#### 3.5. C5 'View all games' returns to the catalog from a game landing (not covered; verified live)

**File:** `tests/general/header.games-nav.spec.ts`

**Steps:**
  1. Open /palworld-server-hosting/, hover Game servers, click 'More Games / View all games'
    - expect: URL /game-servers-en/ with H1 'Premium server hosting and more' (verified)

#### 3.6. C6 Remaining dropdown items (Vintage Story, Palworld, Terraria) open the right landings (not verified live by click)

**File:** `tests/general/header.games-nav.spec.ts`

**Steps:**
  1. Parametrised: hover, click each of /vintage-story-server-hosting/, /palworld-server-hosting/, /terraria-server-hosting/ from the header
    - expect: Each URL matches href read from the dropdown at runtime, status 200, H1 non-empty
    - expect: Dropdown item name/price consistent with the grid card for the same game (price regex only)

#### 3.7. C7 Header links to Minecraft/Modded/PRO Hosting/More entries (partly verified in DOM, not clicked)

**File:** `tests/general/header.games-nav.spec.ts`

**Steps:**
  1. Read top-level nav: Minecraft Server Hosting (/), Modded Minecraft Servers, Game servers, PRO Hosting (VPS /vps-hosting/, Dedicated /dedicated-server-hosting/, Gaming VPS /gaming-vps/), More
    - expect: Links exist with non-empty hrefs; PRO Hosting and More parents have href '' (hover-only menus) - do not click parents expecting navigation
    - expect: 'Host now' button must NOT be clicked (order funnel)

#### 3.8. C8 Mobile viewport: burger menu exposes Game servers entry (not verified live; mobile nav presence covered by storefront.breadth)

**File:** `tests/general/header.games-nav.mobile.spec.ts`

**Steps:**
  1. Set viewport 390x844, open the burger menu
    - expect: 'Game servers' link /game-servers-en/ is in the mobile menu and navigates to the catalog. Existing storefront.breadth only asserts mobileNav attached / desktop nav hidden

#### 3.9. C9 Footer 'Popular Games' links resolve to landings (not covered; hrefs read live)

**File:** `tests/general/footer.games.spec.ts`

**Steps:**
  1. Read footer Popular Games links (Vintage Story, Palworld, ARK, Terraria, Rust)
    - expect: Each href is absolute https://godlike.host/<slug>-server-hosting/ and returns 200 (request, no clicks). Link-checker valid.links.spec.ts may already hit these - check before implementing

### 4. D. Page-level, SEO and resilience

**Seed:** `tests/seed.spec.ts`

#### 4.1. D1 Catalog page basics: title, H1, rating strip, single H1 (not covered, verified live)

**File:** `tests/general/games.catalog.page.spec.ts`

**Steps:**
  1. Open /game-servers-en/
    - expect: Title 'Best Game Server Hosting - Godlike', one H1 'Premium server hosting and more'
    - expect: Text mentions 'over 45 different games' while grid shows 46 cards - copy is marketing, assert structurally only

#### 4.2. D2 FAQ accordion on the catalog page expands/collapses (not verified live)

**File:** `tests/general/games.catalog.page.spec.ts`

**Steps:**
  1. Click the first FAQ item 'What games do you support?' twice
    - expect: Not verified live. Expected: answer toggles visible/hidden; 8 FAQ items present (live snapshot)

#### 4.3. D3 Console errors on load of /game-servers-en/ (open question)

**File:** `tests/general/games.catalog.page.spec.ts`

**Steps:**
  1. Load page and collect console errors
    - expect: Live probe showed 3-5 console errors/1 warning per load (third-party/tracking not analysed). Do not assert zero; first triage the messages in .playwright-mcp console log, then decide on an allow-list

#### 4.4. D4 Language prefix: catalog is reachable and keeps the game list in another locale (not verified live)

**File:** `tests/general/games.catalog.locale.spec.ts`

**Steps:**
  1. Switch language to de/uk via header switcher (existing locale.spec covers the switcher) and open the catalog in that locale
    - expect: Not verified live. Expected: localized catalog exists or falls back; no 404. Slug is /game-servers-en/ in EN only - find the localized slug at runtime
