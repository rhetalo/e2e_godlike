/**
 * GamePanelSharingPage — раздел Sharing сервера (/server/{uuid}/sharing).
 *
 * Карточки: Invite User (форма + Send Invite), Pending Invites, Roles, Members,
 * Audit Log. Работает и offline. Управление доступом к серверу для других аккаунтов.
 *
 * ⚠️ В тестах НЕ отправляем инвайты (Send Invite шлёт реальный email) — проверяем
 * структуру и что уже приглашённый аккаунт виден в Members.
 *
 * Методы — действия и читатели состояния; assert'ы в спеке.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_SHARING } from "../../utils/selectors";

export class GamePanelSharingPage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.open(`/server/${this.uuid}/sharing`);
    await this.sendInviteButton.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
    await this.tour.dismissIfPresent(); // на Sharing может всплыть отдельный шаг тура
  }

  get inviteForm(): Locator {
    return this.page.locator(GAME_PANEL_SHARING.inviteForm).first();
  }
  get inviteEmail(): Locator {
    return this.page.locator(GAME_PANEL_SHARING.inviteEmail).first();
  }
  get sendInviteButton(): Locator {
    return this.page.locator(GAME_PANEL_SHARING.sendInviteButton).first();
  }

  /** Карточка-секция по заголовку (Invite User / Roles / Members / ...). */
  card(title: string): Locator {
    return this.page
      .locator(GAME_PANEL_SHARING.card)
      .filter({ has: this.page.locator(GAME_PANEL_SHARING.cardTitle, { hasText: title }) })
      .first();
  }

  /** Есть ли email в карточках Sharing (Members/Pending) — т.е. у аккаунта есть доступ/инвайт. */
  async hasUser(email: string): Promise<boolean> {
    return this.page
      .locator(GAME_PANEL_SHARING.card)
      .filter({ hasText: email })
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
  }

  /** v-select роли участника (есть только у не-owner; на тест-сервере — один, у invitee). */
  get memberRoleSelect(): Locator {
    return this.page.locator(GAME_PANEL_SHARING.memberRoleSelect).first();
  }

  /** Текущая роль участника. ⚠️ Читать ПОСЛЕ reload — in-place текст лагает после смены. */
  async getMemberRole(): Promise<string> {
    return (
      (await this.memberRoleSelect.locator(GAME_PANEL_SHARING.roleSelectionText).innerText().catch(() => "")) ?? ""
    ).trim();
  }

  /** Сменить роль участника через v-select. Автосейв; проверять через goto() + getMemberRole(). */
  async setMemberRole(role: string): Promise<void> {
    await this.page
      .locator(`${GAME_PANEL_SHARING.memberRoleSelect} .v-field, ${GAME_PANEL_SHARING.memberRoleSelect} [role="combobox"]`)
      .first()
      .click();
    const opt = this.page
      .locator(GAME_PANEL_SHARING.roleOption)
      .filter({ hasText: new RegExp(`^${role}$`, "i") })
      .first();
    await opt.waitFor({ state: "visible", timeout: 6_000 });
    await opt.click();
    await this.page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
  }

  // --- Audit Log (читатели; история действий участников) ---

  get auditList(): Locator {
    return this.page.locator(GAME_PANEL_SHARING.auditList).first();
  }
  auditRows(): Locator {
    return this.page.locator(GAME_PANEL_SHARING.auditRow);
  }
  /** Текст всей таблицы Audit Log (для проверки ключа действия/актора). ⚠️ обновляется через reload. */
  async getAuditText(): Promise<string> {
    return (await this.auditList.innerText().catch(() => "")) ?? "";
  }

  /**
   * Нормализованные строки Audit Log: каждая = «<actor email> <timestamp> <server:action.key>»
   * в одну строку (schema-agnostic, пробелы схлопнуты). Для структурной проверки формы записей
   * без завязки на конкретное действие/лаг индексации лога.
   */
  async getAuditEntries(): Promise<string[]> {
    const rows = await this.auditRows().allInnerTexts().catch(() => []);
    return rows.map((r) => r.replace(/\s+/g, " ").trim()).filter(Boolean);
  }
}
