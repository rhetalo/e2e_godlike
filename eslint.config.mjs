// @ts-check
/**
 * ESLint flat config (ESLint 9 + typescript-eslint 8).
 *
 * Цель — автоматизировать «hard rules» из CLAUDE.md, которые раньше держались только
 * на дисциплине: запрет waitForTimeout, expect в каждом тесте, отсутствие test.only.
 *
 * Стратегия первого захода — мягкая: правила Playwright и явные запреты репо = error,
 * а legacy-шум (any, неиспользуемые переменные) = warn, чтобы `npm run lint` был полезен,
 * а не превращался в стену красного на старом коде. Ужесточаем позже, по мере чистки.
 *
 * Храповик (16-Oct-2026, DECISIONS.md D-021, RESEARCH_2026-10-16 F1): легаси-нарушения правил,
 * которые раньше были warn, заморожены в eslint-suppressions.json (ESLint bulk suppressions),
 * сами правила = error, CI гоняет `eslint . --max-warnings 0`. Новое нарушение валит гейт; починил
 * легаси → `npx eslint . --prune-suppressions` и закоммитить обновлённый файл (счётчик идёт только вниз).
 * Новые подавления руками НЕ добавлять (`--suppress-all` повторно не запускать) - чинить код.
 */
import tseslint from "typescript-eslint";
import playwright from "eslint-plugin-playwright";
import globals from "globals";

export default tseslint.config(
  // ── Что не линтим ───────────────────────────────────────────────
  {
    ignores: [
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      ".history/**", // снимки VS Code Local History — не наш код
      ".playwright-mcp/**", // служебный вывод Playwright MCP (логи, снапшоты, разовые пробы) — не наш код
      "test-docs/**", // QA-отчёты и разовые скрипты к ним (не коммитятся) - не код автотестов
      "storageState*.json",
      "eslint.config.mjs",
    ],
  },

  // ── Базовые правила для всего TS-кода (pages/components/utils/tests) ──
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      // node — process/__dirname; browser — document/window в page.evaluate-колбэках.
      globals: { ...globals.node, ...globals.browser },
      sourceType: "module",
    },
    rules: {
      // legacy-шум: предупреждаем, но не блокируем (чистим постепенно).
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // ── Правила Playwright — только для спеков ───────────────────────
  {
    ...playwright.configs["flat/recommended"],
    files: ["tests/**/*.ts"],
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      // Hard rules репо → error:
      "playwright/no-wait-for-timeout": "error", // синхронизация web-first, а не сон
      // каждый тест содержит хотя бы один expect; хелперы-ассерты (assert*) считаются валидными
      "playwright/expect-expect": ["error", { assertFunctionPatterns: ["^assert"] }],
      "playwright/no-focused-test": "error", // забытый .only прячет остальные тесты
      // test.skip(condition, reason) — санкционированный анти-silent-skip паттерн репо;
      // ловим только голый test.skip() без условия.
      "playwright/no-skipped-test": ["error", { allowConditional: true }],
      // valid-title автофиксом срезает осмысленные префиксы заголовков ("Step 1:" → "1:") —
      // деградация читаемости, в hard-rules репо не входит. Выключено осознанно.
      "playwright/valid-title": "off",

      // ── Второй слой (внедрён по итогам ресёрча QA/AI-практик, 17-Jun) ──
      // Источник: OTUS «Вы неправильно тестируете асинхронный код» + «5 ошибок в E2E».
      // expect внутри if/try-catch может молча НЕ выполниться (false positive
      // «зелёного» теста) — ровно та боль, что лечит наше правило «≥1 expect на тест».
      // error + легаси в eslint-suppressions.json (храповик 16-Oct-2026).
      "playwright/no-conditional-expect": "error",
      // if/switch в теле теста — ветка может молча не выполниться. Санкционированный
      // условный пропуск = test.skip(cond, reason), он правилом не ловится.
      // error + легаси в eslint-suppressions.json (храповик 16-Oct-2026).
      "playwright/no-conditional-in-test": "error",
      // expect вне тела теста (в хелпере/верхнем уровне) — почти всегда ошибка структуры.
      "playwright/no-standalone-expect": "error",
      // web-first ассерты (await expect(loc).toBeVisible()) вместо expect(await loc.isVisible()).
      // Hard-rule репо «web-first waits». error + легаси в eslint-suppressions.json (16-Oct-2026).
      "playwright/prefer-web-first-assertions": "error",
      // force:true маскирует реальную проблему UI (анти-паттерн OTUS). Только warn —
      // в репо есть задокументированные легитимные случаи (скрытые custom-UI инпуты,
      // напр. VpsPanelMediaPage), их error сломал бы зря.
      "playwright/no-force-option": "warn",

      // ── Hard-rule «no raw-locators в теле спека» (CLAUDE.md) ──
      // Спек драйвит UI через Page Object/Component; сырой page.locator()/getBy* прямо
      // в спеке — антипаттерн (селектор должен жить в utils/selectors.ts → PO).
      // error + легаси (funnel.*, storefront.breadth, login.validation) в eslint-suppressions.json
      // (16-Oct-2026). valid.links (краулер) и *.helpers.ts исключены ниже отдельным блоком.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='page'][callee.property.name=/^(locator|frameLocator|getBy[A-Za-z]+)$/]",
          message:
            "Сырой локатор в теле спека — заведи его в Page Object/Component (селектор из utils/selectors.ts). Hard-rule CLAUDE.md: спек драйвит UI через PO.",
        },
      ],

      // ── Бесплатные правила плагина (16-Oct-2026, RESEARCH F4: 0 нарушений на момент включения) ──
      // Теги — ровно наш набор (CLAUDE.md «Tag it»); опечатка или самодельный тег валит линт.
      "playwright/valid-test-tags": [
        "error",
        { allowedTags: ["@smoke", "@critical", "@regression", "@flaky", "@skip", "@slow"] },
      ],
      // Каждый тест обязан нести тег (в заголовке или на describe).
      "playwright/require-tags": "error",
      // Закомментированный тест = тихо выключенное покрытие; выключать через test.skip(cond, reason).
      "playwright/no-commented-out-tests": "error",
      // waitForSelector → web-first expect(locator)/locator.waitFor().
      "playwright/no-wait-for-selector": "error",
      // (2.11+) ассерт, который проходит всегда; одинаковые заголовки; annotation без причины.
      "playwright/no-unnecessary-assertions": "error",
      "playwright/no-identical-title": "error",
      "playwright/require-annotation-reason": "error",
    },
  },

  // seed.spec.ts — не тест, а стартовая страница для Playwright Test Agents (проект `agents`):
  // тег ему не нужен и не должен затягивать его в --grep-прогоны.
  {
    files: ["tests/seed.spec.ts"],
    rules: { "playwright/require-tags": "off" },
  },

  // ── Playwright-правила для Page Objects / Components ─────────────
  // Раньше playwright-правила висели только на tests/**, и hard-rule «no waitForTimeout
  // в pages/components/tests» держался лишь grep'ом в qa-gate.mjs. Навешиваем линтер и
  // сюда: правило-текст агент трактует, упавший линт он чинит (статья «Clean Architecture
  // и AI», 18-Jun). pages — 0 нарушений; components — 2 санкц. settle в CookieBanner
  // (помечены eslint-disable). prefer-web-first/no-conditional-expect = error (0 нарушений, 16-Oct-2026).
  {
    files: ["pages/**/*.ts", "components/**/*.ts"],
    plugins: { playwright },
    rules: {
      "playwright/no-wait-for-timeout": "error",
      "playwright/prefer-web-first-assertions": "error",
      "playwright/no-conditional-expect": "error",
    },
  },

  // ── Исключения для no-restricted-syntax (raw-locators) ───────────
  // valid.links — задокументированный краулер (ходит по сырым ссылкам/локаторам);
  // *.helpers.ts — тест-хелперы, а не тело спека. Сырой локатор тут легитимен.
  {
    files: ["tests/general/valid.links.spec.ts", "tests/**/*.helpers.ts"],
    rules: { "no-restricted-syntax": "off" },
  },

  // ── Legacy-fence ────────────────────────────────────────────────
  // Старые vps/funnel-спеки с техдолгом waitForTimeout/networkidle. Тут эти правила
  // ПОНИЖЕНЫ до warn, чтобы lint был зелёным сразу, — а новый код во всех остальных
  // файлах по-прежнему ловится error'ом. Долг чистится отдельной задачей (требует
  // прогона stateful vps-тестов). НЕ добавлять сюда новые файлы — это «забор» вокруг
  // существующего легаси, а не разрешение писать так дальше.
  {
    files: [
      "tests/funnels/funnel.seed.spec.ts",
      "tests/funnels/funnel.with.credit.check.spec.ts",
      "tests/modded/funnel.modded.spec.ts",
    ],
    rules: {
      "playwright/no-wait-for-timeout": "warn",
      "playwright/no-networkidle": "warn",
      "playwright/no-unused-locators": "warn",
    },
  },
);
