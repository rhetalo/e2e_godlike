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
    },
  },

  // ── Legacy-fence ────────────────────────────────────────────────
  // Старые vps/funnel-спеки с техдолгом waitForTimeout/networkidle. Тут эти правила
  // ПОНИЖЕНЫ до warn, чтобы lint был зелёным сразу, — а новый код во всех остальных
  // файлах по-прежнему ловится error'ом. Долг чистится отдельной задачей (требует
  // прогона stateful vps-тестов). НЕ добавлять сюда новые файлы — это «забор» вокруг
  // существующего легаси, а не разрешение писать так дальше.
  {
    files: [
      "tests/vps/funnel/vps.funnel.spec.ts",
      "tests/vps/panel/vps.panel.login.spec.ts",
      "tests/vps/panel/vps.panel.power.actions.spec.ts",
      "tests/vps/panel/vps.panel.rebuild.spec.ts",
      "tests/vps/panel/vps.panel.server.spec.ts",
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
