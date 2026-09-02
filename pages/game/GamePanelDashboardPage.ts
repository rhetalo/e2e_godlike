/**
 * GamePanelDashboardPage — дэшборд «My Servers» (/?page=1).
 *
 * Серверы рендерятся как кликабельные div'ы (.dashboard__servers .server),
 * не ссылки. Заголовок содержит счётчик: «My Servers (N)».
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_DASHBOARD, GAME_PANEL_HEADER } from "../../utils/selectors";

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

  /** Карточка сервера по имени (имя в span.main1 внутри .server). */
  serverByName(name: string): Locator {
    return this.servers.filter({ hasText: name }).first();
  }

  /** Виден ли сервер с данным именем в списке «My Servers». */
  async hasServer(name: string): Promise<boolean> {
    return this.serverByName(name).isVisible({ timeout: 5_000 }).catch(() => false);
  }

  /** Ссылка глобального сайдбара по названию (Billing, Support Tickets, ...). */
  sidebarLink(name: string): Locator {
    return this.page.getByRole("link", { name, exact: false }).first();
  }

  // --- view-режим (list/grid) + адрес/Copy сервера ---

  get serversContainer(): Locator {
    return this.page.locator(GAME_PANEL_DASHBOARD.serversContainer).first();
  }
  get viewToggleButtons(): Locator {
    return this.page.locator(GAME_PANEL_DASHBOARD.viewToggle);
  }
  /** Переключить вид списка серверов: nth(0)=list, nth(1)=grid. */
  async setView(mode: "list" | "grid"): Promise<void> {
    // ⚠️ 20-Aug-2026: на дашборде всплыл новый онбординг-диалог «Choose how to start your server /
    // SERVER SETUP GUIDE» (Vuetify v-dialog, `v-overlay--active`), его `.v-overlay__scrim`
    // перехватывает клик по view-toggle. Это НЕ giveaway → neutralizeOverlays() его не гасит.
    // Гасим скрим (Escape) и кликаем через dispatchEvent — он идёт мимо hit-test оверлея
    // (тот же приём, что openAccountMenu ниже). Класс раскладки переключается Vue-хендлером и так.
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.page.locator(".v-overlay__scrim").first().waitFor({ state: "hidden", timeout: 3_000 }).catch(() => {});
    const btn = this.viewToggleButtons.nth(mode === "grid" ? 1 : 0);
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.dispatchEvent("click");
  }
  /** Адреса серверов «srv*.godlike.club:PORT» в карточках. */
  get serverAddresses(): Locator {
    return this.page.locator(GAME_PANEL_DASHBOARD.serverAddress);
  }
  /** Кнопки Copy IP рядом с адресами. */
  get serverCopyButtons(): Locator {
    return this.page.locator(GAME_PANEL_DASHBOARD.serverCopyBtn);
  }

  // --- Аккаунт-меню / Logout (хедер-глобал) ---

  get accountButton(): Locator {
    return this.page.locator(GAME_PANEL_HEADER.accountButton).first();
  }
  get logoutLink(): Locator {
    return this.page.locator(GAME_PANEL_HEADER.logoutLink).first();
  }

  /** Открыть аккаунт-меню (Knowledgebase / Edit Account / Log Out). */
  async openAccountMenu(): Promise<void> {
    // На странице может висеть открытый Vuetify-оверлей (`.v-overlay__scrim`), перехватывающий клик
    // по аккаунт-кнопке (флок auth.logout на VPS). Гасим его (Escape) и кликаем через dispatchEvent —
    // он идёт мимо hit-test оверлея (тот же приём, что Boot Order radio в vf-panel).
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.page.locator(".v-overlay__scrim").first().waitFor({ state: "hidden", timeout: 3_000 }).catch(() => {});
    await this.accountButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.accountButton.dispatchEvent("click");
    await this.logoutLink.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Выйти: аккаунт-меню → Log Out → дождаться редиректа на /login. */
  async logout(): Promise<void> {
    await this.openAccountMenu();
    await this.logoutLink.click();
    await this.page.waitForURL(/\/login/, { timeout: 20_000 });
  }
}
