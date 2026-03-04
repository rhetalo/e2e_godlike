import { Page, expect } from '@playwright/test';

export class GamesPage {
    constructor(private page: Page) {}

    async goto() {
    await this.page.goto('/game-servers-en/');
    }

    async openGame(gameName: string) {
    const game = this.page.locator('a.game__title', { hasText: gameName });
    await expect(game).toBeVisible();
    await game.click();
    }
}