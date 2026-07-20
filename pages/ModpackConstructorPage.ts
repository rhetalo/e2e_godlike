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
    return this.host().getByRole("button", { name }).first();
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

  /**
   * Снять/поставить фильтр "Hide incompatible" (прячет моды, несовместимые с конфигом).
   * Чекбокс — sr-only внутри <label>, поэтому переключаем кликом по видимому label.
   */
  async setHideIncompatible(on: boolean): Promise<void> {
    const checked = await this.host().evaluate((hostEl) => {
      const root = (hostEl as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot ?? hostEl;
      const cb = [...root.querySelectorAll<HTMLInputElement>("input[type=checkbox]")].find((c) =>
        /incompat/i.test(c.closest("label")?.textContent ?? ""),
      );
      return cb ? cb.checked : null;
    });
    if (checked !== null && checked !== on) {
      await this.host().getByText("Hide incompatible", { exact: false }).first().click();
    }
  }

  /** Кол-во установленных модов (из лейбла "Installed (N)"). */
  async installedCount(): Promise<number> {
    return this.host().evaluate((hostEl) => {
      const root = (hostEl as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot ?? hostEl;
      const m = (root.textContent ?? "").match(/Installed\s*\((\d+)\)/i);
      return m ? Number(m[1]) : 0;
    });
  }

  /**
   * Установить мод по точному имени (после searchMod). Клик по Install в карточке с этим
   * заголовком (Shadow DOM + Tailwind → выбор карточки через evaluate надёжнее xpath/классов),
   * затем ждём роста счётчика Installed — детерминированно, без waitForTimeout.
   */
  async installMod(name: string): Promise<void> {
    const before = await this.installedCount();
    // Дождаться, пока отфильтрованные результаты поиска отрендерят карточку мода.
    await this.page.waitForFunction(
      (modName) => {
        const host = document.querySelector("#modpack-constructor") as
          | (HTMLElement & { shadowRoot: ShadowRoot })
          | null;
        const root = host?.shadowRoot;
        if (!root) return false;
        return [...root.querySelectorAll("*")].some(
          (e) => e.children.length === 0 && (e.textContent ?? "").trim() === modName,
        );
      },
      name,
      { timeout: 15_000 },
    );
    const clicked = await this.host().evaluate((hostEl, modName) => {
      const root = (hostEl as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot ?? hostEl;
      const title = [...root.querySelectorAll("*")].find(
        (e) => e.children.length === 0 && (e.textContent ?? "").trim() === modName,
      );
      let card: Element | null = title ?? null;
      for (let i = 0; i < 6 && card; i++) {
        const btn = [...card.querySelectorAll("button")].find((b) =>
          /^install$/i.test((b.textContent ?? "").trim()),
        );
        if (btn) {
          btn.click();
          return true;
        }
        card = card.parentElement;
      }
      return false;
    }, name);
    if (!clicked) throw new Error(`installMod: карточка мода "${name}" с кнопкой Install не найдена`);
    await this.page.waitForFunction(
      (prev) => {
        const host = document.querySelector("#modpack-constructor") as
          | (HTMLElement & { shadowRoot: ShadowRoot })
          | null;
        const root = host?.shadowRoot;
        if (!root) return false;
        const m = (root.textContent ?? "").match(/Installed\s*\((\d+)\)/i);
        return !!m && Number(m[1]) > prev;
      },
      before,
      { timeout: 15_000 },
    );
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

  /** Текст блока Setup Status в панели Estimation: напр. "GOOD" | "WARNING". */
  async setupStatus(): Promise<string> {
    return this.host().evaluate((hostEl) => {
      const root = (hostEl as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot ?? hostEl;
      const m = (root.textContent ?? "").match(/Setup Status\s*([A-Za-z]+)/i);
      return m ? m[1].trim() : "";
    });
  }

  /** Помечен ли установленный мод бейджем "Incompatible" (несовместим с выбранной версией). */
  async isInstalledModIncompatible(name: string): Promise<boolean> {
    return this.host().evaluate((hostEl, modName) => {
      const root = (hostEl as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot ?? hostEl;
      const nameNode = [...root.querySelectorAll("*")].find(
        (e) => e.children.length === 0 && (e.textContent ?? "").trim() === modName,
      );
      if (!nameNode) return false;
      // подняться до строки установленного мода и поискать бейдж
      let row: Element | null = nameNode;
      for (let i = 0; i < 4 && row; i++) {
        if (/incompatible/i.test(row.textContent ?? "")) return true;
        row = row.parentElement;
      }
      return false;
    }, name);
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

  /**
   * Дождаться готовности демо-сервера (компиляция ~2-5 мин): в модалке появляется "Server ready".
   * Дефолтный таймаут 6 мин с запасом. Успех = сборка модпака скомпилировалась и сервер поднялся.
   */
  async waitForServerReady(timeoutMs = 360_000): Promise<void> {
    await this.host()
      .getByText(/Server ready/i)
      .first()
      .waitFor({ state: "visible", timeout: timeoutMs });
  }

  /** Закрыть модалку (Compatibility Check / Server ready). */
  async closeModal(): Promise<void> {
    await this.button(/^Close$/i).click();
  }

  /** ⚠️ "Start 3-hour Demo" — уводит в воронку /cart-modpack-constructor/. */
  async startDemo(): Promise<void> {
    await this.button(/Start 3-hour Demo/i).click();
    await this.waitForUrl(/\/cart-modpack-constructor/);
  }
}
