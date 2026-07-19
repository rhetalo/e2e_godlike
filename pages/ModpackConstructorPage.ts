/**
 * ModpackConstructorPage — конструктор модпаков (/custom-minecraft-modpacks-constructor/).
 *
 * ⚠️ Web-component на Shadow DOM (build:embed). ДВЕ гочи, из-за которых наивный тест мёртв:
 *   1. ЛЕНИВАЯ гидрация — приложение монтируется в #modpack-constructor.shadowRoot только
 *      после пользовательского взаимодействия (mouse move/wheel). См. waitReady().
 *   2. Поиск модов фильтрует по нажатию ENTER, а не по вводу. См. searchMod().
 * Playwright сам пробивает open shadow DOM для css/text/role-локаторов, поэтому внутрь
 * целимся от host-id + текст/роль (Tailwind-классы нестабильны — не опираемся на них).
 *
 * Методы — действия/ридеры; assert'ы живут в спеке. Confirmed live recon 10-Jul-2026.
 *
 * Live-prod safety: install/search/compile/dry-run — обратимы. "Proceed with test run" и
 * "Start 3-hour Demo" ПОДНИМАЮТ РЕАЛЬНЫЙ демо-сервер (3ч, сам истекает) и уводят в воронку —
 * дёргать осознанно.
 */
import type { Locator, Response } from "@playwright/test";
import { BasePage } from "./BasePage";
import { MODPACK_CONSTRUCTOR as SEL } from "../utils/selectors";

export class ModpackConstructorPage extends BasePage {
  private static readonly PATH = "/custom-minecraft-modpacks-constructor/";

  host(): Locator {
    return this.page.locator(SEL.host);
  }
  searchInput(): Locator {
    return this.page.locator(SEL.searchInput);
  }
  /** Кнопка конструктора по её видимому тексту (getByRole пробивает shadow DOM). */
  button(name: RegExp): Locator {
    return this.host().getByRole("button", { name });
  }
  downloadButton(): Locator {
    return this.button(/Download Client Mods/i);
  }

  /** Открыть страницу и дождаться гидрации (с mouse-нуджем). */
  async open(): Promise<void> {
    await this.goto(ModpackConstructorPage.PATH);
    await this.waitReady();
  }

  /** Пнуть ленивую гидрацию и дождаться смонтированного приложения (поле поиска). */
  async waitReady(timeoutMs = 20_000): Promise<void> {
    await this.page.mouse.move(600, 400);
    await this.page.mouse.wheel(0, 300);
    await this.page.mouse.wheel(0, -200);
    await this.searchInput().waitFor({ state: "visible", timeout: timeoutMs });
  }

  /** Ввести запрос и применить фильтр (⚠️ именно Enter, иначе каталог не фильтруется). */
  async searchMod(query: string): Promise<void> {
    const input = this.searchInput();
    await input.click();
    await input.fill(query);
    await input.press("Enter");
  }

  async clearSearch(): Promise<void> {
    const input = this.searchInput();
    await input.fill("");
    await input.press("Enter");
  }

  /** Снять фильтр "Hide incompatible" (он прячет моды, несовместимые с конфигом). */
  async setHideIncompatible(on: boolean): Promise<void> {
    const cb = this.host()
      .locator("label")
      .filter({ hasText: /Hide incompatible/i })
      .locator("input[type='checkbox']");
    if ((await cb.isChecked()) !== on) await cb.click();
  }

  /** Карточка каталога/установленного по имени мода (ближайший предок с кнопкой). */
  private card(name: string): Locator {
    return this.host()
      .getByText(name, { exact: true })
      .locator("xpath=ancestor::*[.//button][1]");
  }

  /** Установить мод по точному имени (после searchMod). */
  async installMod(name: string): Promise<void> {
    await this.card(name).getByRole("button", { name: /^Install$/i }).click();
  }

  async clearAll(): Promise<void> {
    await this.button(/^Clear All$/i).click();
  }

  /** Секция, в которую лёг установленный мод: 'client' | 'server' | null. */
  async installedSection(name: string): Promise<"client" | "server" | null> {
    return this.host().evaluate((hostEl, modName) => {
      const root = (hostEl as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot ?? hostEl;
      const flat = [...root.querySelectorAll("*")]
        .filter((e) => e.children.length === 0)
        .map((e) => (e.textContent ?? "").trim());
      let section: "client" | "server" | null = null;
      for (const t of flat) {
        if (/^client side$/i.test(t)) section = "client";
        else if (/^server side$/i.test(t)) section = "server";
        else if (t === modName) return section;
      }
      return null;
    }, name);
  }

  async isDownloadEnabled(): Promise<boolean> {
    return !(await this.downloadButton().isDisabled());
  }

  /**
   * Нажать Download Client Mods и вернуть ответ бэкенда:
   *   { status: 200, isZip: true }        — сборка клиентского zip удалась
   *   { status: 400, isZip: false, body } — "No client-side mods to download..." (баг совместимости)
   */
  async downloadClientMods(): Promise<{ status: number; isZip: boolean; body: string | null }> {
    const [resp] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes(SEL.apiClientMods)),
      this.downloadButton().click(),
    ]);
    const ct = resp.headers()["content-type"] ?? "";
    const isZip = /zip|octet-stream/i.test(ct);
    const body = isZip ? null : await resp.text().catch(() => null);
    return { status: resp.status(), isZip, body };
  }

  // ── Конфигурация окружения ──────────────────────────────────────
  /** Сменить loader / версию игры / java. Undefined-поля не трогаем. */
  async changeConfig(cfg: { loader?: RegExp; gameVersion?: string; javaVersion?: string }): Promise<void> {
    await this.button(/Change Configuration/i).click();
    if (cfg.loader) await this.button(cfg.loader).click();
    if (cfg.gameVersion) {
      // кастомный combobox: клик по текущему значению → выбрать опцию "Minecraft X"
      await this.host().getByText(/^Minecraft \d/, { exact: false }).last().click();
      await this.host().getByText(cfg.gameVersion, { exact: true }).first().click();
    }
    await this.button(/Save & Continue/i).click();
    await this.searchInput().waitFor({ state: "visible" });
  }

  // ── Компиляция / демо ───────────────────────────────────────────
  /** Открыть модалку проверки совместимости (Dry-Run). Заказ/сервер не создаёт. */
  async compileDryRun(): Promise<void> {
    await this.button(/Compilation/i).click();
  }

  /** ⚠️ Поднимает реальный демо-сервер. Возвращает Response POST /test-sessions. */
  async proceedWithTestRun(): Promise<Response> {
    const [resp] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes(SEL.apiTestSessions) && r.request().method() === "POST",
      ),
      this.button(/Proceed with test run/i).click(),
    ]);
    return resp;
  }

  /** ⚠️ "Start 3-hour Demo" — уводит в воронку /cart-modpack-constructor/. */
  async startDemo(): Promise<void> {
    await this.button(/Start 3-hour Demo/i).click();
    await this.waitForUrl(/\/cart-modpack-constructor/);
  }
}
