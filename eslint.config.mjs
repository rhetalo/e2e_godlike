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
      "playwright/expect-expect": "error", // каждый тест содержит хотя бы один expect
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
      // Пока warn: 4 существующих нарушения в live-prod-спеках (funnel.cart.paypal,
      // game/panel/dashboard, funnel.modded) — их фикс требует прогона по проду, вынесен
      // в backlog (test-docs/README.md). После чистки промоутим в error.
      "playwright/no-conditional-expect": "warn",
      // expect вне тела теста (в хелпере/верхнем уровне) — почти всегда ошибка структуры.
      "playwright/no-standalone-expect": "error",
      // web-first ассерты (await expect(loc).toBeVisible()) вместо expect(await loc.isVisible()).
      // Пока warn: ~12 мест в legacy + это hard-rule репо «web-first waits». Промоутим в
      // error после чистки (см. test-docs/README.md → backlog).
      "playwright/prefer-web-first-assertions": "warn",
      // force:true маскирует реальную проблему UI (анти-паттерн OTUS). Только warn —
      // в репо есть задокументированные легитимные случаи (скрытые custom-UI инпуты,
      // напр. VpsPanelMediaPage), их error сломал бы зря.
      "playwright/no-force-option": "warn",

      // ── Hard-rule «no raw-locators в теле спека» (CLAUDE.md) — пока warn ──
      // Спек драйвит UI через Page Object/Component; сырой page.locator()/getBy* прямо
      // в спеке — антипаттерн (селектор должен жить в utils/selectors.ts → PO).
      // Warn, а не error: ~25 легаси-нарушений (funnel.*, storefront.breadth,
      // login.validation). Промоут в error после чистки. valid.links (краулер) и
      // *.helpers.ts исключены ниже отдельным блоком.
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.object.name='page'][callee.property.name=/^(locator|frameLocator|getBy[A-Za-z]+)$/]",
          message:
            "Сырой локатор в теле спека — заведи его в Page Object/Component (селектор из utils/selectors.ts). Hard-rule CLAUDE.md: спек драйвит UI через PO.",
        },
      ],
    },
  },

  // ── Playwright-правила для Page Objects / Components ─────────────
  // Раньше playwright-правила висели только на tests/**, и hard-rule «no waitForTimeout
  // в pages/components/tests» держался лишь grep'ом в qa-gate.mjs. Навешиваем линтер и
  // сюда: правило-текст агент трактует, упавший линт он чинит (статья «Clean Architecture
  // и AI», 18-Jun). pages — 0 нарушений; components — 2 санкц. settle в CookieBanner
  // (помечены eslint-disable). prefer-web-first/no-conditional-expect = warn (ловят дрейф).
  {
    files: ["pages/**/*.ts", "components/**/*.ts"],
    plugins: { playwright },
    rules: {
      "playwright/no-wait-for-timeout": "error",
      "playwright/prefer-web-first-assertions": "warn",
      "playwright/no-conditional-expect": "warn",
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
