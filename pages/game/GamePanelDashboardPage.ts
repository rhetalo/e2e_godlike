/**
 * GamePanelDashboardPage — дэшборд «My Servers» (/?page=1).
 *
 * Серверы рендерятся как кликабельные div'ы (.dashboard__servers .server),
 * не ссылки. Заголовок содержит счётчик: «My Servers (N)».
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_DASHBOARD } from "../../utils/selectors";

export class GamePanelDashboardPage extends GamePanelBasePage {
  constructor(page: Page) {
    super(page);
  }

  get heading(): Locator {
    return this.page.locator(GAME_PANEL_DASHBOARD.heading).filter({ hasText: /My Servers/i }).first();
  }
  get servers(): Locator {
    return this.page.locator(GAME_PANEL_DASHBOARD.server);
  }
  get suspendedServers(): Locator {
    return this.page.locator(GAME_PANEL_DASHBOARD.serverSuspended);
  }
  get filterSuspended(): Locator {
    return this.page.locator(GAME_PANEL_DASHBOARD.filterSuspended).first();
  }
  get filterFree(): Locator {
    return this.page.locator(GAME_PANEL_DASHBOARD.filterFree).first();
  }

  async goto(): Promise<void> {
    await this.open("/?page=1");
    await this.heading.waitFor({ state: "visible", timeout: 20_000 });
  }

  async serverCount(): Promise<number> {
    return this.servers.count();
  }

  /** Счётчик из заголовка «My Servers (N)»; null, если его нет. */
  async headingCount(): Promise<number | null> {
    const text = (await this.heading.textContent().catch(() => "")) ?? "";
    const match = text.match(/\((\d+)\)/);
    return match ? Number(match[1]) : null;
  }

  /** Ссылка глобального сайдбара по названию (Billing, Support Tickets, ...). */
  sidebarLink(name: string): Locator {
    return this.page.getByRole("link", { name, exact: false }).first();
  }
}
