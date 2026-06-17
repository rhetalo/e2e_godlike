# ARCHITECTURE — repo map & reuse rules

Detailed architecture and "reuse-don't-duplicate" reference, extracted from `CLAUDE.md`
to keep that file a tight contract (< 200 lines, see п51 in `AI_AGENTS_NOTES.md`).

- **This file** = the map of the codebase + how to reuse existing abstractions.
- `TEST_GUIDELINES.md` = how to *write* a test (philosophy, anti-patterns, templates).
- `CLAUDE.md` = the non-negotiable contract + pointers to both.

---

## Repository map

```
fixtures/base.ts        Custom test fixture — wraps page.goto() to auto-dismiss
                        cookie/promo banners. STOREFRONT specs import from here.
fixtures/test-data.ts   Central URLs, credentials (env-based), QuickPickModpacks
fixtures/games.json     Data-driven game list (name + expectPromoValid)

pages/BasePage.ts       Abstract base: goto(), waitForUrl(), shared header/heading
pages/*.ts              Page Objects — storefront funnel + VirtFusion panel.
                        VpsPanelServerPage is the reference ("etalon") implementation.

components/*.ts          Component Objects — Header, Footer, CookieBanner,
                         StripeCardFields (iframe), SeedCard, StorefrontTariffCard, ...

utils/selectors.ts       SINGLE SOURCE OF TRUTH for selectors (documented priority).
utils/auth.ts            VirtFusion login + storageState persistence + TEST_SERVER_*
utils/bannerHandlers.ts  addLocatorHandler orchestration over CookieBanner
utils/iframe-helper.ts   Stable Stripe iframe locators (by title attribute)

tests/funnels|general|modded|vps/funnel|vps/panel/   specs grouped by domain
```

---

## Before implementing any test — search first

The #1 failure mode of AI in a large Playwright project is **not bad code — it is
duplicating architecture that already exists.** Always search first:

1. **Search existing tests** — `tests/**/*.spec.ts`. Is this flow already covered? Grep for
   the feature, URL, or user action.
2. **Search existing Page Objects** — `pages/*.ts`. Does a page object for this screen exist?
   (`VpsPanelServerPage` is the reference pattern.)
3. **Search existing Components** — `components/*.ts`. Header, Footer, CookieBanner,
   StripeCardFields, SeedCard, StorefrontTariffCard, selectors for billing/payment/promo, etc.
4. **Search existing Fixtures & utils** — `fixtures/*`, `utils/selectors.ts`, `utils/auth.ts`,
   `utils/iframe-helper.ts`. The selector you need is probably already in `selectors.ts`.
5. **Reuse existing code whenever possible.** A new locator goes into the existing page
   object/component, sourced from `selectors.ts` — not inline in a spec.
6. **Never create duplicate abstractions.** No second "ActivityTable", second banner helper,
   second login flow, second selector for the same element.

If similar functionality already exists, **extend it instead of creating a new
implementation.** If you believe a new abstraction is genuinely needed, say so in the plan
and explain why the existing one can't be extended — then wait for approval.

---

## How to write a NEW test — decision flow

(Only after the search step above and an approved plan.)

1. **Pick the folder by domain** (`tests/<domain>/`) and match the existing naming
   (`<feature>.spec.ts`). Keep specs focused (~≤300 lines); split by `describe` if larger.

2. **Choose the import:**
   - Storefront-facing test (hits `godlike.host`, has marketing banners):
     `import { test, expect } from "../../fixtures/base";`
   - Panel test (hits `vf-panel.godlike.host`, no marketing banners): you may import
     from `@playwright/test`, but page navigation must still go through a Page Object.

3. **Drive the UI through Page Objects and Components — never raw locators in the spec.**
   If the locator you need doesn't exist on a page/component yet, ADD it there, sourced
   from `utils/selectors.ts`. Do not inline CSS/text selectors in the spec body.

4. **Assertions live in the spec**, wrapped in `test.step(...)`. Page/component methods
   return state (`Promise<boolean>` / values) or perform actions — they must not call `expect`.

5. **Tag it:** `@smoke` (critical path), `@critical` (user story), or `@regression`.

6. **Synchronize with web-first waits**, never `waitForTimeout`. Use
   `expect(locator).toBeVisible/toHaveText/toBeEnabled`, `locator.waitFor({ state })`,
   or `expect.poll(...)` for reactive Vue values.

---

## Reusing fixtures

`fixtures/base.ts` overrides `page.goto()` so that after every navigation it waits for
network to settle and dismisses cookie/promo banners twice (banners appear via delayed
JS). Just `await page.goto(path)` as usual — banner handling is automatic. Do NOT
re-implement banner dismissal in the spec; do NOT use `addLocatorHandler` for banners
(it intercepts mid-test nav clicks and redirects to `/` — see the comment in base.ts).

Credentials come from `fixtures/test-data.ts` / `utils/*` via `process.env.* ?? fallback`.
Never hardcode credentials, server UUIDs, or URLs in a spec.

---

## Reusing Page Objects

- Concrete pages should `extend BasePage` and navigate via `BasePage.goto(path)`
  (handles `domcontentloaded` + banner dismissal). Some older panel pages still use a
  standalone `constructor(page: Page)` — when you touch one, prefer migrating it to
  `BasePage`, but match the file's existing style if a full migration is out of scope.
- `VpsPanelServerPage` is the **reference pattern** for panel pages — study it before
  adding a new panel page.
- Methods are actions (`selectTemplate()`, `deployFirstPlan()`) or state readers
  (`getStatusText()`, `isCardComplete()`). Expose locators as getters. Keep one
  responsibility per class; if a class crosses ~150 lines covering multiple tabs,
  prefer composing tab Components rather than growing the class.

---

## Reusing Components

- Preferred pattern is **Locator-rooted** (see `SeedCard`, `StorefrontTariffCard`):
  `constructor(private readonly root: Locator)` with static `nth()`/`byName()` factories.
  Use page-rooted components only for genuine page-globals (`Header`, `Footer`, `CookieBanner`).
- `StripeCardFields` + `utils/iframe-helper.ts` is the reference for iframe handling
  (target frames by stable `title`, `waitForReady()` across frames, read state from
  container CSS classes). Reuse this approach for any new payment/iframe work.
- Components never assert — they return state.

---

## Selectors

All selectors come from `utils/selectors.ts`, grouped by domain. The file documents the
priority: stable IDs → BEM classes → semantic attributes → roles. Explicitly avoid
`:nth-child`, Vue `data-v-*` hashes, and (where avoidable) `:has-text()`. When adding a
selector, put it in `selectors.ts` with a short dated source comment.

---

## Stateful / serial panel tests

VirtFusion panel suites that change server state use
`test.describe.configure({ mode: "serial" })` with a shared `BrowserContext` and an
`afterAll` that restores the server to Running. If you add such a test:
- log in once via `loginAndSaveSession()` and reuse `storageState.panel.json`;
- make the test arrange its own precondition where possible rather than depending on a
  sibling's side effect;
- ensure `afterAll` leaves the server in a clean state.

> Flaky note: don't equate the `ensureOffline` budget with the `afterAll` hook timeout —
> use `test.setTimeout(180s)` + `ensureOffline(90s)`. See `AGENT_HANDOFF.md`.
