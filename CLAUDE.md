# CLAUDE.md

Guidance for Claude Code when working in this repository. This file is the **contract** —
kept tight on purpose (< 200 lines). Architecture detail and how-tos live in `agents.docs/`
(linked below), because a long CLAUDE.md gets followed worse, not better.

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

- `agents.docs/ARCHITECTURE.md` — repo map, search-first/reuse rules, Page Object &
  Component patterns, selectors, stateful-test setup. **Read before touching any test.**
- `agents.docs/TEST_GUIDELINES.md` — how to write a test: structure, tagging, anti-patterns, Vue/VirtFusion gotchas
- `agents.docs/AGENT_HANDOFF.md` — auth flows, storageState files, server gotchas, roadmap
- `agents.docs/CODE_REVIEW.md` — log of past fixes and why
- `agents.docs/vps-panel/` — VPS (vf-panel/VirtFusion) audit, Install/Build/Delete plan, **HANDOFF.md** (continue here)
- `agents.docs/game-panel/` — game panel (ultra.panel) knowledge base + test plan (~64 tests; **Phase 5 закрыта**; next = только **деструктив** — нужен явный risk-decision владельца)
- `agents.docs/MCP_RECON_VS_CODE.md` — Playwright MCP vs наш код-формат (когда что применять)
- `agents.docs/AI_AGENTS_NOTES.md` — выжимка best-practices по ИИ-агентам под наш QA-репо

## Implementation workflow

Do NOT jump straight into editing 20 files. For any non-trivial change:

1. **Analyze** — read the relevant existing tests, page objects, components, fixtures
   (see the search-first checklist in `ARCHITECTURE.md`).
2. **Present an implementation plan** — what you'll add/change, which existing code you'll
   reuse or extend, and which files you'll touch.
3. **Ask questions if requirements are ambiguous** (see "Ask before coding").
4. **Wait for approval** before writing code.
5. **Implement** — smallest change that fits the existing architecture.
6. **Run tests** — the affected spec(s), then `npx tsc --noEmit`.
7. **Report changes** — what changed, what you reused, test results, anything skipped.

## Effort — подстройка под сложность задачи

Подстраивай уровень усилий (Effort) под реальную сложность задачи и **проговаривай это**:
- Механические/текстовые правки (переименования, комментарии, перевод, форматирование) —
  **низкий Effort**. Не жги ресурсы зря.
- Recon живого DOM, мутирующие/stateful-тесты, отладка флоки, архитектурные решения — **выше**.
- В начале нетривиального хода одной строкой обозначь выбранный уровень и предложи
  **понизить** (проще) или **повысить** (сложнее). Лимиты расходуются — это важно владельцу.

## Reuse, don't duplicate — the #1 rule

The #1 failure mode of AI in a large Playwright project is **not bad code — it is
duplicating architecture that already exists.** Before writing anything: search existing
`tests/`, `pages/`, `components/`, `fixtures/`, `utils/selectors.ts`. If similar
functionality exists, **extend it** — don't create a second login flow / banner helper /
ActivityTable / selector. New abstraction only with a justification in the plan + approval.
Full search-first checklist and reuse patterns: `agents.docs/ARCHITECTURE.md`.

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

## Writing a test — the essentials

(Full decision flow, repo map and reuse detail: `agents.docs/ARCHITECTURE.md`. Test
philosophy, templates and anti-patterns: `agents.docs/TEST_GUIDELINES.md`.)

- **Folder by domain** (`tests/<domain>/`), name `<feature>.spec.ts`, keep specs ~≤300 lines.
- **Import:** storefront test → `import { test, expect } from "../../fixtures/base";`
  (auto-dismisses banners). Panel test → `@playwright/test` is fine, but navigate via a
  Page Object. Banner handling is automatic — never re-implement it or use `addLocatorHandler`
  for banners (it hijacks mid-test nav — see `fixtures/base.ts`).
- **Drive the UI through Page Objects / Components — never raw locators in the spec.** A
  missing locator goes into the PO/component, sourced from `utils/selectors.ts`.
- **Assertions live in the spec**, wrapped in `test.step(...)`. Page/component methods
  return state or perform actions — they must not call `expect`.
- **Tag it:** `@smoke` (critical path) / `@critical` (user story) / `@regression`.
- **Web-first waits only** — `expect(locator).toBeVisible/...`, `locator.waitFor({state})`,
  `expect.poll(...)`. Never `waitForTimeout`.

## Conventions / hard rules

- No `waitForTimeout` in `pages/`, `components/`, `tests/` (the only sanctioned uses are
  the documented crawler rate-limiting in `valid.links.spec.ts` and the banner second-pass
  in `fixtures/base.ts`).
- Every test must contain at least one `expect`. Never gate setup with a silent
  `.catch(() => false)` early-return — use `test.skip(condition, reason)` with a logged reason.
- No raw locators or hardcoded test data (URLs, UUIDs, credentials) in spec bodies.
  Credentials/URLs come from `fixtures/test-data.ts` / `utils/*` via `process.env.* ?? fallback`.
- All selectors come from `utils/selectors.ts` (priority: stable IDs → BEM → semantic
  attributes → roles; avoid `:nth-child`, `data-v-*`, and where possible `:has-text()`).
- Stateful panel tests run `mode: "serial"` with a shared context and a clean-state
  `afterAll`. Details in `ARCHITECTURE.md` / `AGENT_HANDOFF.md`.
- Docs and code comments in this repo are bilingual (RU/EN); follow the surrounding file.

## Ask before coding — clarifying questions

Stop and ask when any of these is unclear, instead of assuming:

1. **Environment** — live production, or a staging/seeded environment now available?
2. **Account/state safety** — will this create orders, mutate a real VPS, or consume a
   one-time promo on the shared account? Acceptable? How to clean up?
3. **Selector changes** — if a needed `data-testid` is missing, add it to the app repo or
   work around it with existing selectors?
4. **Migration vs. match** — migrate an older standalone Page Object to `BasePage`, or keep
   the change minimal and match existing style?
5. **Tag / suite** — which tag (`@smoke` / `@critical` / `@regression`) and which folder?

When unsure whether an action is reversible or could affect the shared production account,
ask first.
