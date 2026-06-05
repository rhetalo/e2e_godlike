# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

End-to-end Playwright + TypeScript test suite for **godlike.host** (game-server &
VPS hosting storefront) and its **VirtFusion control panel** (`vf-panel.godlike.host`).

> ⚠️ **Tests run against LIVE PRODUCTION.** There is no staging environment and a
> small number of shared real accounts. This has hard consequences:
> - Never write tests that create irreversible state, spam orders, or could lock the
>   shared account. Read-only / self-cleaning flows only.
> - Panel power tests mutate a real VPS (boot/shutdown/rebuild). They run **serial**
>   and recover state in `afterAll`. Respect that — do not parallelize them.
> - Promo/price/content can change underneath you. Prefer structural assertions over
>   exact marketing copy.

## Read these first

Before writing or changing anything, read the authoritative in-repo docs — they
already encode hard-won knowledge and override anything generic:

- `agents.docs/TEST_GUIDELINES.md` — test structure, tagging, anti-patterns, Vue/VirtFusion gotchas
- `agents.docs/AGENT_HANDOFF.md` — auth flows, storageState files, server gotchas, roadmap
- `agents.docs/CODE_REVIEW.md` — log of past fixes and why
- `agents.docs/vps-panel/` — VPS (vf-panel/VirtFusion) audit, Install/Build/Delete plan, **HANDOFF.md** (continue here)
- `agents.docs/game-panel/` — game panel (ultra.panel) knowledge base + test plan (23 tests; Phase 4 Sharing owner+invitee done, next — роли / Port&Domains / Tasks)

## Implementation workflow

Do NOT jump straight into editing 20 files. Follow this loop for any non-trivial change:

1. **Analyze** — read the relevant existing tests, page objects, components, fixtures
   (see "Before implementing any test" below).
2. **Present an implementation plan** — what you'll add/change, which existing code you'll
   reuse or extend, and which files you'll touch.
3. **Ask questions if requirements are ambiguous** (see "Ask before coding").
4. **Wait for approval** before writing code.
5. **Implement** — smallest change that fits the existing architecture.
6. **Run tests** — the affected spec(s), then `npx tsc --noEmit`.
7. **Report changes** — what changed, what you reused, test results, anything skipped.

## Effort — подстройка под сложность задачи

Подстраивай уровень усилий (глубину рассуждений / Effort) под реальную сложность задачи и
**проговаривай это**:
- Механические/текстовые правки (переименования, комментарии, перевод названий тестов на
  русский, форматирование) — **низкий Effort**. Не жги ресурсы зря.
- Recon живого DOM, мутирующие/stateful-тесты, отладка флоки, архитектурные решения —
  **выше**.
- В начале нетривиального хода одной строкой обозначь выбранный уровень и предложи
  **понизить** (если задача проще, чем кажется) или **повысить** (если сложнее). Лимиты
  расходуются — это важно владельцу.

## Before implementing any test

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

## Commands

```bash
npm test                 # full suite (chromium only)
npm run test:funnel      # storefront + vps funnels
npm run test:panel       # VirtFusion panel tests (serial, stateful)
npm run test:modded      # modded minecraft / sliders / promo
npm run test:general     # smoke, login, registration, link-check
npm run test:smoke       # @smoke-tagged only
npm run test:headed      # debug with a visible browser
npm run report           # open last HTML report
```

Type-check before claiming done: `npx tsc --noEmit` (must be 0 errors).

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

## Reusing fixtures

`fixtures/base.ts` overrides `page.goto()` so that after every navigation it waits for
network to settle and dismisses cookie/promo banners twice (banners appear via delayed
JS). Just `await page.goto(path)` as usual — banner handling is automatic. Do NOT
re-implement banner dismissal in the spec; do NOT use `addLocatorHandler` for banners
(it intercepts mid-test nav clicks and redirects to `/` — see the comment in base.ts).

Credentials come from `fixtures/test-data.ts` / `utils/*` via `process.env.* ?? fallback`.
Never hardcode credentials, server UUIDs, or URLs in a spec.

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

## Reusing Components

- Preferred pattern is **Locator-rooted** (see `SeedCard`, `StorefrontTariffCard`):
  `constructor(private readonly root: Locator)` with static `nth()`/`byName()` factories.
  Use page-rooted components only for genuine page-globals (`Header`, `Footer`, `CookieBanner`).
- `StripeCardFields` + `utils/iframe-helper.ts` is the reference for iframe handling
  (target frames by stable `title`, `waitForReady()` across frames, read state from
  container CSS classes). Reuse this approach for any new payment/iframe work.
- Components never assert — they return state.

## Selectors

All selectors come from `utils/selectors.ts`, grouped by domain. The file documents the
priority: stable IDs → BEM classes → semantic attributes → roles. Explicitly avoid
`:nth-child`, Vue `data-v-*` hashes, and (where avoidable) `:has-text()`. When adding a
selector, put it in `selectors.ts` with a short dated source comment.

## Stateful / serial panel tests

VirtFusion panel suites that change server state use
`test.describe.configure({ mode: "serial" })` with a shared `BrowserContext` and an
`afterAll` that restores the server to Running. If you add such a test:
- log in once via `loginAndSaveSession()` and reuse `storageState.panel.json`;
- make the test arrange its own precondition where possible rather than depending on a
  sibling's side effect;
- ensure `afterAll` leaves the server in a clean state.

## Conventions / hard rules

- No `waitForTimeout` in `pages/`, `components/`, `tests/` (the only sanctioned uses are
  the documented crawler rate-limiting in `valid.links.spec.ts` and the banner second-pass
  in `fixtures/base.ts`).
- Every test must contain at least one `expect`. Never gate setup with a silent
  `.catch(() => false)` early-return — use `test.skip(condition, reason)` with a logged reason.
- No raw locators or hardcoded test data (URLs, UUIDs, credentials) in spec bodies.
- Docs and code comments in this repo are bilingual (RU/EN); follow the surrounding file.

## Ask before coding — clarifying questions

Stop and ask the user when any of these is unclear, instead of assuming:

1. **Environment:** Is this meant to run against live production, or is a staging/seeded
   environment now available? (Changes everything about destructive tests.)
2. **Account/state safety:** Will this test create orders, mutate a real VPS, or consume a
   one-time promo on the shared account? Is that acceptable / how should it clean up?
3. **Scope of selector changes:** If a needed `data-testid` is missing, should we add it to
   the application repo, or work around it with existing selectors?
4. **Migration vs. match:** When touching an older standalone Page Object, should I migrate
   it to `BasePage`, or keep the change minimal and match existing style?
5. **Tag / suite:** Which tag (`@smoke` / `@critical` / `@regression`) and which folder does
   this test belong to?

When unsure whether an action is reversible or could affect the shared production account,
ask first.
