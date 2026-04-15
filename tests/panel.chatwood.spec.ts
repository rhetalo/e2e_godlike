import { test, expect } from "@playwright/test";
import gamesData from "../fixtures/games.json";

// Список игр для проверки в Json файле
const gamesToTest: string[] = gamesData.games;

const BASE_URL = "https://ultra.panel.godlike.host";
const EMAIL = "test@testmail.com";
const PASSWORD = "test@testmail.com";
const storageStatePath = "storageState.json";


test('Login in incognito', async ({ browser }) => {
  const context = await browser.newContext(); // инкогнито-контекст
  const page = await context.newPage();
  // Заходим на страницу логина
  await page.goto('https://ultra.panel.godlike.host/login');

  // Нажимаем кнопку "Through login/password"
  await page.click('button.login-button:has-text("Through login/password")');

  // Вводим логин и пароль
  await page.fill('input[placeholder="Username or Email"]', 'test@testmail.com');
  await page.fill('input[placeholder="Password"]', 'test@testmail.com');

  // Нажимаем кнопку "Login"
  await page.click('button:has-text("Login")');

  // Проверяем, что загрузился элемент (чат-бабл)
  const chatBubble = page.locator('button.woot-widget-bubble[title="Open chat window"]');
  await expect(chatBubble).toBeVisible({ timeout: 10000 });

  // Ждем 30 секунд
  await page.waitForTimeout(30000);
});
