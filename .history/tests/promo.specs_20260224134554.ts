import { test, expect } from '../fixtures/auth.fixture';
import { GamesPage } from '../pages/GamesPage';
import { TariffPage } from '../pages/TariffPage';
import { CartPage } from '../pages/CartPage';

const gamesToTest = ['Hytale'];

test.describe('Promocode validation flow', () => {

  for (const gameName of gamesToTest) {

    test(`Validate promocode for ${gameName}`, async ({ loggedInPage }) => {

      const gamesPage = new GamesPage(loggedInPage);
      const tariffPage = new TariffPage(loggedInPage);
      const cartPage = new CartPage(loggedInPage);

      await test.step('Open games page', async () => {
        await gamesPage.goto();
      });

      await test.step(`Open game: ${gameName}`, async () => {
        await gamesPage.openGame(gameName);
      });

      const count = await tariffPage.getTariffCount();

      for (let i = 0; i < count; i++) {

        await test.step(`Click tariff #${i + 1}`, async () => {
          await tariffPage.clickTariff(i);
        });

        await test.step('Validate promocode', async () => {
          await cartPage.validatePromocode();
        });

        await loggedInPage.goBack();
      }

    });

  }

});