/**
 * utils/amplitude.ts
 * ──────────────────
 * Детерминированный пиннинг A/B-экспериментов Amplitude на storefront
 * (godlike.host). / Deterministic pinning of the storefront Amplitude A/B
 * experiments.
 *
 * ЗАЧЕМ / WHY:
 *   godlike.host гоняет Amplitude Experiment SDK. Вариант назначается по
 *   случайному device id на каждый свежий контекст, поэтому без пиннинга форма
 *   URL корзины и наличие flash-sale-баннера НЕДЕТЕРМИНИРОВАНЫ:
 *     - promotion_1-2usdgb = "2usdgb_month" → /cart-vps?...&step=1  (без слеша)
 *     - promotion_1-2usdgb = "1usdgb_month" → /cart-vps/?...        (со слешем)
 *   Это даёт плавающие падения воронки (Deploy Now / Next Step ассерты).
 *
 * КАК / HOW (подтверждено на live 03-Jun-2026):
 *   1. ОСНОВНОЕ — context.route() перехватывает запрос вариантов
 *      `…/sdk/v2/vardata` к api.lab.eu.amplitude.com и отдаёт ФИКСИРОВАННЫЙ
 *      ответ. SDK не может назначить случайный вариант → детерминизм даже при
 *      восстановленном storageState (где SDK иначе перезапрашивает варианты и
 *      перетирает любой пред-засев LS).
 *   2. СТРАХОВКА — addInitScript пред-засевает LS `amp-exp-$default_instance-*`
 *      теми же вариантами (на случай, если запрос не уходит / режется CORS),
 *      + cookie `amplitudeExpFetched=1` гасит повторный фетч сайтом.
 *
 * Применяется на уровне BrowserContext, потому что vps.funnel создаёт страницы
 * через browser.newContext(), а не через фикстурный `page` из fixtures/base.
 *
 * ⚠️  ГОНКА НА ЛЕНДИНГЕ: на /vps-hosting/ клик Deploy Now может произойти ДО
 *     резолва запроса vardata — тогда вариант ещё не применён и форма URL
 *     корзины (`/cart-vps?…&discount=20.00` vs `/cart-vps/?…&discount=20`)
 *     всё ещё может плавать. Поэтому ассерты воронки СОЗНАТЕЛЬНО variant-agnostic
 *     (регекс `/\/cart-vps/` ловит обе формы). Пиннинг гарантирует вариант на
 *     более медленных шагах (billing/configure) и детерминированно гасит
 *     навязчивую модалку flash-sale.
 *
 * ⚠️  Завязано на внутренний формат Amplitude. Если ответ vardata или LS-ключ
 *     сменятся — обновить FIXED_VARDATA / EXP_STORAGE_KEY (снять с DevTools →
 *     Network `vardata` и Application → Local Storage на /vps-hosting/).
 */
import type { BrowserContext } from "@playwright/test";

/** Endpoint, c которого Amplitude Experiment SDK тянет назначенные варианты. */
const VARDATA_URL_RE = /api\.lab\.eu\.amplitude\.com\/sdk\/v2\/vardata/;

/** LS-ключ, в котором Experiment SDK кэширует назначенные варианты. */
const EXP_STORAGE_KEY = "amp-exp-$default_instance-u6z6Wv";

/** Фиксированный device id — детерминированный, валидный UUID v4. */
const FIXED_DEVICE_ID = "00000000-0000-4000-8000-000000000001";

/**
 * Зафиксированные варианты (control-набор, снят с live 03-Jun-2026).
 * Структуру сохраняем как у реального ответа vardata, иначе SDK может счесть
 * данные невалидными.
 */
const FIXED_VARIANTS = {
  cancel_new_inpanel: {
    key: "old_with_hytale",
    value: "old_with_hytale",
    metadata: { experimentKey: "exp-1", segmentName: "All Other Users" },
  },
  onboarding_new_2: {
    key: "onboarding_old",
    value: "onboarding_old",
    metadata: { experimentKey: "exp-1", segmentName: "All Other Users" },
  },
  "promotion_1-2usdgb": {
    key: "2usdgb_month",
    value: "2usdgb_month",
    metadata: { experimentKey: "exp-1", segmentName: "Segment 1" },
  },
} as const;

const FIXED_VARDATA_BODY = JSON.stringify(FIXED_VARIANTS);
const FIXED_EXP_LS = JSON.stringify(FIXED_VARIANTS);

/**
 * Пиннит A/B-эксперименты Amplitude для всех страниц контекста.
 * Вызывать СРАЗУ после browser.newContext(), до создания страниц.
 */
export async function pinAmplitudeExperiments(
  context: BrowserContext,
): Promise<void> {
  // 1. ОСНОВНОЕ — перехват фетча вариантов, фиксированный ответ.
  await context.route(VARDATA_URL_RE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      // CORS-заголовок: запрос кросс-доменный (godlike.host → amplitude.com).
      headers: { "access-control-allow-origin": "*" },
      body: FIXED_VARDATA_BODY,
    });
  });

  // 2. СТРАХОВКА — гейт-cookie + фиксированный device id.
  await context.addCookies([
    {
      name: "amplitudeExpFetched",
      value: "1",
      domain: "godlike.host",
      path: "/",
    },
    {
      name: "amdDeviceId",
      value: FIXED_DEVICE_ID,
      domain: "godlike.host",
      path: "/",
    },
  ]);

  // 3. СТРАХОВКА — пред-засев LS до исполнения скриптов страницы.
  await context.addInitScript(
    ({ key, val }: { key: string; val: string }) => {
      try {
        localStorage.setItem(key, val);
      } catch {
        /* storage может быть недоступен — не критично */
      }
    },
    { key: EXP_STORAGE_KEY, val: FIXED_EXP_LS },
  );
}
