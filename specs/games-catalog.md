# Game Servers Catalog - Test Plan

Target: https://godlike.host/game-servers-en/ (live production, read-only).
Recon facts: title "Best Game Server Hosting - Godlike"; H1 "Premium server hosting and more"; H2 sections: Game Server Hosting, High performance game servers, Rent a game server for a great price, List of games, How to Get Started (5 H3 steps), Security and reliability (3 H3), Why Choose Godlike.Host (4 H3), Pricing and plans, FAQ (8 H3 questions). "List of games" is a text block (`.seotext__body`) of 20 plain links, no images, no controls. Header mega-menu has top-5 games with "Starting at" prices plus "More Games / View all games" -> /game-servers-en/. Language switcher links exist for 7 locales.

Games in the list (name -> path): Rust /rust-server-hosting/, ARK Survival Evolved /ark-survival-evolved-server-hosting/, Minecraft / (home), FiveM /fivem-server-hosting/, Counter Strike 2 /best-cs2-server-hosting/, Unturned /unturned-server-hosting/, Terraria /terraria-server-hosting/, Mindustry /mindustry-server-hosting/, Factorio /factorio-server-hosting/, Conan Exiles /conan-exiles-server-hosting/, 7 days to die /7-days-to-die-server-hosting/, ARMA 3 /arma-3-server-hosting/, Don't Starve Together /dont-starve-together-server-hosting/, Vintage Story /vintage-story-server-hosting/, The Forest /the-forest-server-hosting/, Team Fortress 2 /tf2-server-hosting/, Space Engineers /space-engineers-server-hosting/, Quake Live /quake-live-server-hosting/, Valheim /valheim-server-hosting/, Garry's Mod /gmod-server-hosting/.

Observation for testers: the Rust landing page (fetched) had canonical pointing to /game-servers-en/ instead of itself - verify in scenario 3.5 whether this is real and report as a finding rather than assume.

### 1. Catalog page structure

**Seed:** `tests/seed.spec.ts`

#### 1.1 Page loads with correct title and H1

**Steps:**
1. Open https://godlike.host/game-servers-en/ in a fresh browser context.
2. Close the cookie banner via its close control only, if shown.
3. Read the document title and the H1.

**Expected:** HTTP 200; title contains "Game Server Hosting"; exactly one H1 is visible and non-empty. Failure: non-200, missing/duplicate H1.

#### 1.2 Key sections present in order

**Steps:**
1. Open the catalog page.
2. Collect all H2 headings.

**Expected:** H2s include "List of games", "How to Get Started", "Security and reliability", "Why Choose Godlike.Host", "Pricing and plans", "FAQ", in this relative order. Assert structure, not exact marketing copy.

#### 1.3 How to Get Started has five steps

**Steps:**
1. Open the page, scroll to "How to Get Started".
2. Count the H3 step headings under it.

**Expected:** 5 non-empty steps (Select a Game ... Make a Payment).

#### 1.4 Page has no console errors or failed critical requests

**Steps:**
1. Open the page, wait for load, scroll to the bottom.
2. Inspect console and network failures.

**Expected:** no uncaught JS errors; no 4xx/5xx for document, CSS or JS of the site's own origin.

### 2. "List of games" grid

**Seed:** `tests/seed.spec.ts`

#### 2.1 List contains the expected set of games

**Steps:**
1. Open the page and locate the "List of games" section.
2. Collect link texts.

**Expected:** at least 20 links; every name is non-empty and unique; includes Rust, ARK Survival Evolved, Minecraft, FiveM, Valheim. Prefer asserting a minimum core set over an exact count (catalog may grow).

#### 2.2 Every game link has a valid internal href

**Steps:**
1. Collect hrefs of all links in the list.
2. Check each.

**Expected:** every href is non-empty, not "#", on host godlike.host, and unique (Minecraft pointing to the home page is a known exception). No external hosts.

#### 2.3 All game links return 200 (no redirect chains)

**Steps:**
1. For each href, send a GET via `request` (read-only) with modest rate limiting.
2. Record status and final URL.

**Expected:** status 200 and final URL equals the href (or a single 301 to trailing-slash form). Failure: 404/5xx or more than one redirect.

#### 2.4 Click a game link opens its landing page

**Steps:**
1. Open the catalog page.
2. Click "Rust" in the List of games.
3. Read the H1 and URL.
4. Go back.

**Expected:** URL is /rust-server-hosting/; H1 contains "Rust"; after back the catalog page is shown with the list intact. Do not click any Order/Buy/Host button on the landing page.

#### 2.5 Minecraft entry leads to the Minecraft storefront

**Steps:**
1. Click "Minecraft" in the list.
2. Observe URL and H1.

**Expected:** lands on the home page (https://godlike.host/) which presents Minecraft hosting; no 404.

#### 2.6 Landing page H1/title matches the clicked game (data-driven, sample of 5)

**Steps:**
1. For Terraria, ARK, Vintage Story, Valheim, Garry's Mod: open the catalog, click the link.
2. Compare game name in the link text with landing-page H1 (case-insensitive, loose match).

**Expected:** each H1 mentions the game (allow variants like "CS2" vs "Counter Strike 2"). Failure: H1 of a different game.

#### 2.7 Keyboard navigation through the list

**Steps:**
1. Focus the first game link with Tab from the section start.
2. Press Tab repeatedly through the list; press Enter on a focused link.

**Expected:** links receive visible focus in DOM order; Enter navigates.

### 3. SEO and meta of the catalog

**Seed:** `tests/seed.spec.ts`

#### 3.1 Canonical points to the catalog itself

**Steps:**
1. Open the catalog and read `link[rel=canonical]`.

**Expected:** canonical equals https://godlike.host/game-servers-en/.

#### 3.2 hreflang alternates present for all locales

**Steps:**
1. Read `link[rel=alternate][hreflang]` entries.
2. Read the language switcher hrefs (ua, es, de, pl, fr, pt, it).

**Expected:** alternates exist for each locale and match the switcher URLs. Do not click the switcher (no language change).

#### 3.3 Meta description and robots

**Steps:**
1. Read meta description and meta robots.

**Expected:** non-empty description; robots does not contain noindex.

#### 3.4 Images have alt text

**Steps:**
1. Collect all `img` in main content.
2. Check alt attributes.

**Expected:** informative images have non-empty alt; report count of missing alts.

#### 3.5 Canonical of game landing pages is self-referencing (finding check)

**Steps:**
1. Open /rust-server-hosting/ and /terraria-server-hosting/.
2. Read each canonical.

**Expected:** each canonical equals its own URL. If it equals /game-servers-en/, log as a defect (recon suggested this for Rust).

### 4. Header navigation into games

**Seed:** `tests/seed.spec.ts`

#### 4.1 Games menu shows top games with prices

**Steps:**
1. Open the catalog on desktop viewport (1440x900).
2. Hover the header "Minecraft Server Hosting" / games menu trigger.
3. Read the menu items.

**Expected:** menu lists Minecraft Java, Modded Minecraft, Minecraft Bedrock, Vintage Story, Palworld, Terraria, ARK, each with a "Starting at" price containing a currency sign (EUR); do not assert exact amounts.

#### 4.2 Menu "Game servers" and "View all games" lead to the catalog

**Steps:**
1. Open the homepage, open the games menu.
2. Click "Game servers".
3. Reopen the menu on the catalog and click "View all games".

**Expected:** URL is /game-servers-en/ both times; page stays on the catalog.

#### 4.3 Menu game entries navigate to landing pages

**Steps:**
1. From the catalog, open the menu and click "Terraria".
2. Verify URL and H1.
3. Go back and repeat for "Palworld" and "ARK".

**Expected:** URLs /terraria-server-hosting/, /palworld-server-hosting/, /ark-survival-evolved-server-hosting/; H1 mentions the game.

#### 4.4 Other product links in the header resolve

**Steps:**
1. Read hrefs for VPS Hosting, Dedicated Hosting, Gaming VPS, Knowledge Base, Blog, Godlike Launcher.
2. GET each.

**Expected:** all return 200. Do not click login/cart/order controls.

#### 4.5 Mobile navigation

**Steps:**
1. Resize to 375x812 and open the catalog.
2. Open the burger menu, find the games entries.
3. Close the menu.

**Expected:** menu opens/closes; game links reachable; no horizontal page scroll.

### 5. FAQ and content blocks

**Seed:** `tests/seed.spec.ts`

#### 5.1 FAQ lists eight questions and expands

**Steps:**
1. Scroll to FAQ.
2. Count question headings.
3. Click the first question, then the second.

**Expected:** 8 questions; clicking reveals the answer text (non-empty); no navigation, no form submitted.

#### 5.2 FAQ answer collapses on second click

**Steps:**
1. Click a question to expand, click again.

**Expected:** answer hidden after the second click.

#### 5.3 Pricing and plans section renders

**Steps:**
1. Scroll to "Pricing and plans".
2. Read the section text and any comparison table.

**Expected:** section visible with non-empty text; any price shown contains a currency sign. Do not click plan/order buttons.

### 6. Negative and edge cases

**Seed:** `tests/seed.spec.ts`

#### 6.1 Non-existent game URL returns 404 page

**Steps:**
1. GET https://godlike.host/nonexistent-game-server-hosting/.

**Expected:** HTTP 404 with a styled error page containing a link back to the site; header still renders.

#### 6.2 Catalog without trailing slash

**Steps:**
1. Open https://godlike.host/game-servers-en (no slash).

**Expected:** single redirect to the slash URL, status 200.

#### 6.3 Query string does not break the page

**Steps:**
1. Open /game-servers-en/?utm_source=test&foo=bar.

**Expected:** page renders identically; canonical still the clean URL.

#### 6.4 Reload and back/forward preserve the list

**Steps:**
1. Open catalog, click a game, go back, reload, go forward.

**Expected:** list intact after each action; no blank page.

#### 6.5 Cookie banner closed does not block game links

**Steps:**
1. Open catalog with the banner visible; close it with its X button.
2. Click a game link.

**Expected:** link clickable without overlay interception.
