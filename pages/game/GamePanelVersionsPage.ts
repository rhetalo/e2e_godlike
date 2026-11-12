/**
 * GamePanelVersionsPage — раздел Versions сервера (/server/{uuid}/minecraft/versions).
 *
 * Редизайн 12-Nov-2026: карточка «Currently running <тип>» (чипы Minecraft / Build / Plugins|Mods) и
 * карточка «Change version» с тремя пикерами по порядку - Server type, Minecraft version, Build - и
 * кнопкой «Install <тип> <версия>». Каждый пикер открывает диалог `.version-picker-dialog`.
 * Работает offline.
 *
 * ⚠️ Install = деструктивный rebuild — методы только читают и открывают/закрывают диалоги, НЕ устанавливают.
 * Методы — действия/читатели; assert'ы в спеке. Подтверждено live recon 12-Nov-2026.
 */
import { type Locator, type Page } from "@playwright/test";
import { GamePanelBasePage } from "./GamePanelBasePage";
import { GAME_PANEL_VERSIONS } from "../../utils/selectors";

/** Порядок пикеров в карточке «Change version». */
export type VersionPicker = "type" | "version" | "build";
const PICKER_INDEX: Record<VersionPicker, number> = { type: 0, version: 1, build: 2 };

export class GamePanelVersionsPage extends GamePanelBasePage {
  constructor(page: Page, private readonly uuid: string) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.open(`/server/${this.uuid}/minecraft/versions`);
    await this.currentCard.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }

  // ─── текущая версия ─────────────────────────────────────────────────────────

  get currentCard(): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.currentCard).first();
  }
  get currentTitle(): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.currentTitle).first();
  }
  /** Чип текущей версии по подписи («Minecraft» / «Build»). */
  currentChip(label: string): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.currentChip, { hasText: label }).first();
  }

  // ─── смена версии ───────────────────────────────────────────────────────────

  get changeCard(): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.changeCard).first();
  }
  get pickers(): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.picker);
  }
  picker(which: VersionPicker): Locator {
    return this.pickers.nth(PICKER_INDEX[which]);
  }
  pickerTitle(which: VersionPicker): Locator {
    return this.picker(which).locator(GAME_PANEL_VERSIONS.pickerTitle);
  }
  /** ⚠️ Install - не жмём, только читаем текст/состояние. */
  get installButton(): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.installButton).first();
  }

  // ─── диалог пикера ──────────────────────────────────────────────────────────

  get dialog(): Locator {
    return this.page.locator(GAME_PANEL_VERSIONS.dialog).first();
  }
  get dialogTitle(): Locator {
    return this.dialog.locator(GAME_PANEL_VERSIONS.dialogTitle);
  }

  /** Открыть диалог пикера и дождаться его. */
  async openPicker(which: VersionPicker): Promise<void> {
    await this.picker(which).click();
    await this.dialog.waitFor({ state: "visible", timeout: 15_000 });
  }

  /** Закрыть диалог без выбора (Escape). */
  async closePicker(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await this.dialog.waitFor({ state: "hidden", timeout: 10_000 });
  }

  /** Тип-пикер: заголовки групп (VANILLA / MODS / PLUGINS). */
  get typeGroupTitles(): Locator {
    return this.dialog.locator(GAME_PANEL_VERSIONS.typeGroupTitle);
  }
  /** Тип-пикер: вариант по имени (Vanilla / Paper / NeoForge …). */
  typeOption(name: string): Locator {
    return this.dialog
      .locator(GAME_PANEL_VERSIONS.typeOption)
      // имя с хвостовым пробелом, у текущего типа внутри ещё метка «Installed» → матчим по началу
      .filter({ has: this.page.locator(GAME_PANEL_VERSIONS.typeOptionName, { hasText: new RegExp(`^\\s*${name}(\\s|$)`) }) })
      .first();
  }
  /** Версия-пикер: строки мажорных линий («Minecraft 1.21 / Java 21»). */
  get versionLines(): Locator {
    return this.dialog.locator(GAME_PANEL_VERSIONS.versionLine);
  }
  /** Плитки версий или билдов в открытом диалоге. */
  get tiles(): Locator {
    return this.dialog.locator(GAME_PANEL_VERSIONS.tile);
  }
  /** Активная (выбранная) плитка в открытом диалоге. */
  get activeTile(): Locator {
    return this.dialog.locator(`${GAME_PANEL_VERSIONS.tile}--active`).first();
  }
  get installedTag(): Locator {
    return this.dialog.locator(GAME_PANEL_VERSIONS.installedTag).first();
  }
  get latestTag(): Locator {
    return this.dialog.locator(GAME_PANEL_VERSIONS.latestTag).first();
  }
  get buildMore(): Locator {
    return this.dialog.locator(GAME_PANEL_VERSIONS.buildMore).first();
  }
}
