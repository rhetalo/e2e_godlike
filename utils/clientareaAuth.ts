/**
 * clientareaAuth.ts — авторизация в сторфронт-клиентаре godlike.host
 * (`/clientarea/login`, WHMCS) и персист сессии в указанный storageState-файл.
 *
 * Третий аналог к `utils/auth.ts` (VirtFusion vf-panel) и `utils/gameAuth.ts`
 * (ultra.panel game-панель): один и тот же login-флоу воронок был скопирован
 * инлайном в 7 спеков (`page.fill("#inputEmail")` + `page.click("#login")` на
 * сырых селекторах). Вынесен сюда — убирает дублирование и `prefer-locator`-шум.
 *
 * Подтверждено live (исходные beforeAll всех воронок, идентичны):
 *  - страница: `/clientarea/login`
 *  - email:    `#inputEmail`
 *  - password: `#inputPassword`
 *  - submit:   `#login`
 *  - после успеха WHMCS уводит на `/clientarea/clientarea.php`
 *
 * Креды передаёт вызывающий: воронки используют РАЗНЫЕ аккаунты (стандартный с
 * активными сервисами vs свежий «free» для промо-кейсов), а унификация env-нейминга
 * (`CLIENTAREA_*` / `CLIENTAREA_FREE_*`) — отдельная задача (см. AGENT_HANDOFF §5).
 */
import { type Browser } from "@playwright/test";
import { BASE_URL } from "../fixtures/test-data";

export interface ClientareaLoginOptions {
  email: string;
  password: string;
  /** Куда сохранить storageState — свой файл на каждую воронку. */
  statePath: string;
}

/**
 * Логин в клиентару и сохранение сессии в `statePath`.
 * Бросает, если форма/редирект не отработали (beforeAll падает явно — не молча).
 */
export async function loginClientareaAndSaveSession(
  browser: Browser,
  { email, password, statePath }: ClientareaLoginOptions,
): Promise<void> {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE_URL}/clientarea/login`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.locator("#inputEmail").fill(email);
    await page.locator("#inputPassword").fill(password);
    await Promise.all([
      page.waitForURL("**/clientarea/clientarea.php", { timeout: 60_000 }),
      // timeout 60с (не дефолтный actionTimeout 15с): click авто-ждёт пост-клик навигацию
      // (редирект логина WHMCS), а он под нагрузкой бывает > 15с → транзиентный таймаут клика
      // в beforeAll воронок (тест падал на 1-й попытке, проходил на ретрае). Равняем на
      // waitForURL-бюджет. (23-Jul-2026)
      page.locator("#login").click({ timeout: 60_000 }),
    ]);
    await page.context().storageState({ path: statePath });
    console.log(`[INFO] Clientarea login OK → ${statePath}`);
  } finally {
    await page.close();
  }
}
