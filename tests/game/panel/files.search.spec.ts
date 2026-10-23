/**
 * Game panel — поиск файлов (DEV-476, read-only).
 *
 * User story: владелец ищет файл по имени в файловом менеджере и видит совпадения с папкой, где они лежат.
 * Под капотом GET .../files/search отдаёт text/event-stream: кадры match по ходу обхода и end со статусом.
 * Лимиты: от 2 символов (иначе 422), 500 совпадений, дедлайн 15 с. KB: kb/products/up/api/files.md.
 *
 * Read-only: поиск файлы не меняет. Ищем в подпапке /plugins канонического Paper-сервера: обход ~1,5 с,
 * от корня ~12 с — слишком близко к дедлайну 15 с (live 23-Oct-2026), тест мигал бы от нагрузки ноды.
 * Обрезка на 500 здесь не проверяется: на серверах тест-аккаунта столько совпадений нет (нужен большой модпак).
 */
import { type BrowserContext } from "@playwright/test";
import { test, expect } from "../../../fixtures/diagnostics";
import { GamePanelFilesPage } from "../../../pages/game/GamePanelFilesPage";
import { loginAndSaveGameSession, GAME_STORAGE_STATE_PATH, GAME_SERVER_UUID } from "../../../utils/gameAuth";
import { getServerV2, readPanelToken } from "../../../utils/panelApi";

const SEARCH_DIR = "/plugins";   // на Paper-сервере есть plugins/bStats/config.yml и plugins/spark/config.json
const SEARCH_TERM = "config";

test.describe("[game-panel] Поиск файлов", { annotation: { type: "issue", description: "DEV-476" } }, () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await loginAndSaveGameSession(browser);
  });

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ storageState: GAME_STORAGE_STATE_PATH });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test("TC-GP-FSRCH-001 | поиск из папки: стрим доходит до complete, совпадения с путём в таблице", { tag: "@regression" }, async () => {
    const files = new GamePanelFilesPage(await context.newPage(), GAME_SERVER_UUID);
    await files.goto(SEARCH_DIR);
    const search = await files.searchCapturingStream(SEARCH_TERM);
    const matches = search.frames.flatMap((f) => (f.type === "match" ? [f.file] : []));
    const end = search.frames.find((f) => f.type === "end");

    await test.step("ответ - 200 text/event-stream", async () => {
      expect(search.status).toBe(200);
      expect(search.contentType).toMatch(/^text\/event-stream/);
    });

    await test.step("последний кадр - end: complete, без упавших папок, число совпадений = кадрам match", async () => {
      expect(search.frames.at(-1)?.type).toBe("end");
      expect.soft(end).toMatchObject({ status: "complete", reason: null, failed_directories: 0, matches: matches.length });
    });

    await test.step("совпадения есть, все внутри папки поиска и с искомой строкой в имени", async () => {
      expect(matches.length).toBeGreaterThan(0);
      for (const m of matches) {
        expect.soft(m.path.startsWith(`${SEARCH_DIR}/`), m.path).toBe(true);
        expect.soft(m.name.toLowerCase(), m.path).toContain(SEARCH_TERM);
      }
    });

    await test.step("таблица показывает каждое совпадение с его папкой", async () => {
      const folders = matches.map((m) => m.path.slice(0, m.path.lastIndexOf("/")) || "/");
      // порядок строк в таблице не контракт - сравниваем множества
      await expect(files.searchResultPaths()).toHaveCount(folders.length);
      await expect.poll(async () => (await files.searchResultPaths().allInnerTexts()).map((t) => t.trim()).sort()).toEqual(folders.sort());
    });
  });

  test("TC-GP-FSRCH-002 | запрос из одного символа отклоняется 422", { tag: "@regression" }, async ({ request }) => {
    const token = readPanelToken(GAME_STORAGE_STATE_PATH);
    const resp = await getServerV2(request, token, GAME_SERVER_UUID, "files/search", { file: "c", dir: SEARCH_DIR });

    await test.step("422 и понятное сообщение про минимум 2 символа", async () => {
      expect(resp.status()).toBe(422);
      expect((await resp.json()).message).toMatch(/at least 2 characters/i);
    });
  });
});
