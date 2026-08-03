import { Reporter, TestCase, TestResult, FullConfig, Suite } from '@playwright/test/reporter';
import * as https from 'https';
import * as path from 'path';
import { describeFailure, failureHeadline } from './reporterFailure';

/**
 * Slack-репортер зі ЗВЕДЕННЯМ ПО ФУНКЦІОНАЛЬНИХ БЛОКАХ.
 *
 * Замість списку всіх 600+ тестів (або 60 окремих повідомлень по файлах) шле ОДНЕ
 * повідомлення в кінці прогону (onEnd): загальна шапка (Всього/Пройдено/Впало) +
 * рядок-статус по кожному блоку + список упалих тестів лише під блоками з падіннями.
 *
 * Блоки визначаються по ШЛЯХУ spec-файлу (див. BLOCKS). Порядок у масиві = порядок
 * виводу у звіті. Файл, що не підпав під жоден патерн, потрапляє в «Інше».
 *
 * ⚠️ webhookUrl береться лише з env (SLACK_WEBHOOK_URL) — без хардкоду секрета.
 *    Без webhook репортер МОВЧИТЬ (не падає).
 *
 * (Історична назва файлу — PerFileSlackReporter; залишена, щоб не чіпати
 *  playwright.config.ts. Логіка тепер блокова, не пофайлова.)
 */

// ── Мапа функціональних блоків (укр. назви). Порядок = порядок у звіті. ──
const BLOCKS: { name: string; match: (f: string) => boolean }[] = [
  { name: 'Реєстрація / авторизація', match: (f) => /general\/(registration-flow|login\.validation)/.test(f) },
  {
    name: 'Воронка продажу (Minecraft)',
    match: (f) => /tests\/funnels\//.test(f) || /modded\/(cart\.modded-new|funnel\.modded)/.test(f),
  },
  { name: 'Каталог, слайдери, промокоди', match: (f) => /tests\/modded\//.test(f) },
  { name: 'Купівля VPS', match: (f) => /vps\/funnel\//.test(f) },
  { name: 'Розгортання / переустановка VPS', match: (f) => /vps\/panel\/rebuild/.test(f) },
  { name: 'Керування VPS-панеллю', match: (f) => /vps\/panel\//.test(f) },
  { name: 'Ігрова панель (керування сервером)', match: (f) => /game\/panel\//.test(f) },
  { name: 'Сайт / загальні перевірки', match: (f) => /tests\/general\//.test(f) },
];
const OTHER_BLOCK = 'Інше';

/** Назва блоку для spec-файлу (перший збіг у BLOCKS, інакше «Інше»). */
function blockForFile(file: string): string {
  const f = file.replace(/\\/g, '/');
  for (const b of BLOCKS) if (b.match(f)) return b.name;
  return OTHER_BLOCK;
}

/** Для флоки-теста: на якій спробі він позеленів, напр. «2/3». */
function passingAttempt(test: TestCase): string {
  const total = (test.retries ?? 0) + 1;
  const passed = test.results.find((r) => r.status === 'passed');
  const at = passed ? passed.retry + 1 : total;
  return `${at}/${total}`;
}

interface Failure {
  title: string;
  file: string;
  error: string;
  headline: string; // содержательная шапка: шаг · локация · попытка · таймаут
}

interface FlakyItem {
  title: string;
  file: string;
  attempt: string; // на какой попытке позеленел, напр. «2/3»
}

interface BlockResult {
  passed: number; // финальный исход expected|flaky (флоки тоже прошёл — входит в passed)
  failed: number; // только реально красные (упали ВСЕ ретраи)
  skipped: number;
  flaky: number; // подмножество passed: упал и прошёл на ретрае
  failures: Failure[];
  flakies: FlakyItem[];
}

/** Slack Block Kit-блок: структура довільна, типізуємо як об'єкт (не any). */
type SlackBlock = Record<string, unknown>;

class PerFileSlackReporter implements Reporter {
  private rootSuite: Suite | undefined;
  private totalDurationMs = 0;
  private webhookUrl: string;
  private meta: { key: string; value: string }[];

  constructor(options: { webhookUrl: string; meta?: { key: string; value: string }[] }) {
    this.webhookUrl = options.webhookUrl;
    this.meta = options.meta || [];
  }

  onBegin(_config: FullConfig, suite: Suite) {
    this.rootSuite = suite;
  }

  // Считаем/классифицируем НЕ здесь: onTestEnd зовётся на КАЖДУЮ попытку (ретрай = отдельный
  // результат), поэтому по-попыточный подсчёт раздувал «Впало» и метил флоки как «стабільне
  // падіння» (isFlaky вычислялся до ретрая). Итоги строим в onEnd по ФИНАЛЬНОМУ исходу теста
  // (test.outcome()). Здесь — только суммарная длительность.
  onTestEnd(_test: TestCase, result: TestResult) {
    this.totalDurationMs += result.duration;
  }

  /** Итоги по блокам из дерева тестов, классификация по финальному test.outcome(). */
  private collectBlocks(): Map<string, BlockResult> {
    const blocks = new Map<string, BlockResult>();
    const ensure = (name: string): BlockResult => {
      let r = blocks.get(name);
      if (!r) {
        r = { passed: 0, failed: 0, skipped: 0, flaky: 0, failures: [], flakies: [] };
        blocks.set(name, r);
      }
      return r;
    };

    for (const test of this.rootSuite?.allTests() ?? []) {
      const r = ensure(blockForFile(test.location.file));
      const file = path.basename(test.location.file);
      const outcome = test.outcome(); // 'skipped'|'expected'|'unexpected'|'flaky' — финальный

      if (outcome === 'skipped') {
        r.skipped++;
      } else if (outcome === 'expected') {
        r.passed++;
      } else if (outcome === 'flaky') {
        r.passed++; // флоки в итоге ПРОШЁЛ — не «Впало»
        r.flaky++;
        r.flakies.push({ title: test.title, file, attempt: passingAttempt(test) });
      } else {
        // 'unexpected' — упали ВСЕ ретраи
        r.failed++;
        const last = test.results[test.results.length - 1];
        let headline = '';
        let reason = last?.errors?.[0]?.message || 'Unknown error';
        try {
          if (last) {
            const info = describeFailure(test, last);
            headline = failureHeadline(info);
            reason = info.reason || reason;
          }
        } catch {
          /* обогащение best-effort — падение репортёра недопустимо */
        }
        r.failures.push({ title: test.title, file, error: reason, headline });
      }
    }
    return blocks;
  }

  async onEnd() {
    if (!this.webhookUrl) return;
    const blocks = this.collectBlocks();
    if (blocks.size === 0) return;

    // Загальні підсумки (за фінальним исходом тесту; flaky входить у passed, не в failed)
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalFlaky = 0;
    for (const r of blocks.values()) {
      totalPassed += r.passed;
      totalFailed += r.failed;
      totalSkipped += r.skipped;
      totalFlaky += r.flaky;
    }
    const totalAll = totalPassed + totalFailed + totalSkipped;

    const branch = this.meta.find((m) => m.key === 'Branch')?.value || 'local';
    const jobUrl = this.meta.find((m) => m.key === 'Job URL')?.value;
    // Червоно лише при реальних падіннях; жовто, якщо чисто, але були флоки; інакше зелено.
    const headEmoji = totalFailed > 0 ? '❌' : totalFlaky > 0 ? '⚠️' : '✅';
    const durMin = Math.floor(this.totalDurationMs / 60000);
    const durSec = Math.floor((this.totalDurationMs % 60000) / 1000);

    const summaryLine =
      `*Всього:* ${totalAll}   ✅ *Пройдено:* ${totalPassed}   ❌ *Впало:* ${totalFailed}` +
      (totalFlaky ? `   ⚠️ *Флоки:* ${totalFlaky}` : '') +
      (totalSkipped ? `   ⏭️ *Пропущено:* ${totalSkipped}` : '');

    const allBlocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${headEmoji} Autotests report`, emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [summaryLine, `*Гілка:* ${branch}   *Час:* ${durMin}m ${durSec}s`].join('\n'),
        },
      },
      { type: 'divider' },
    ];

    // Статус по блоках — у порядку BLOCKS, потім «Інше». Лише наявні в прогоні.
    const orderedNames = [...BLOCKS.map((b) => b.name), OTHER_BLOCK];
    const statusLines: string[] = [];
    for (const name of orderedNames) {
      const r = blocks.get(name);
      if (!r) continue;
      const total = r.passed + r.failed + r.skipped;
      const emoji = r.failed === 0 ? '✅' : '❌';
      const skipNote = r.skipped ? ` (⏭️ ${r.skipped})` : '';
      const flakyNote = r.flaky ? ` (⚠️ ${r.flaky} флоки)` : '';
      statusLines.push(`${emoji} *${name}* — пройдено ${r.passed} з ${total}${skipNote}${flakyNote}`);
    }
    this.chunkTextToBlocks('', statusLines).forEach((b) => allBlocks.push(b));

    // Деталі впалих — лише під блоками з падіннями (повний стектрейс, як раніше).
    for (const name of orderedNames) {
      const r = blocks.get(name);
      if (!r || r.failures.length === 0) continue;
      const failLines = r.failures.map((f) => {
        const cleanError = f.error ? f.error.split('\n').slice(0, 12).join('\n') : 'Unknown error';
        const link = jobUrl ? ` <${jobUrl}/artifacts/file/playwright-report/index.html|лог>` : '';
        const head = f.headline ? `\n${f.headline}` : '';
        return `*❌ ${f.file} › ${f.title}*${link}${head}\n\`\`\`${cleanError}\`\`\``;
      });
      allBlocks.push({ type: 'divider' });
      this.chunkTextToBlocks(`*🐞 ${name} — баги:*`, failLines, '\n\n').forEach((b) => allBlocks.push(b));
    }

    // Флоки — окремою секцією (пройшли на ретраї; НЕ падіння, але варті уваги). Без стектрейсу.
    const flakyLines: string[] = [];
    for (const name of orderedNames) {
      const r = blocks.get(name);
      if (!r || r.flakies.length === 0) continue;
      for (const fl of r.flakies) {
        flakyLines.push(`• *${fl.file} › ${fl.title}* — пройшов на спробі ${fl.attempt} _(${name})_`);
      }
    }
    if (flakyLines.length) {
      allBlocks.push({ type: 'divider' });
      this.chunkTextToBlocks('*⚠️ Флоки (пройшли на ретраї):*', flakyLines).forEach((b) => allBlocks.push(b));
    }

    await this.sendBlocksInChunks(allBlocks);
  }

  /** Розбиває масив рядків на Slack-секції з урахуванням ліміту 3000 символів. */
  private chunkTextToBlocks(header: string, lines: string[], separator: string = '\n'): SlackBlock[] {
    const blocks: SlackBlock[] = [];
    const prefix = header ? header + '\n' : '';
    let currentText = prefix;

    for (const line of lines) {
      if ((currentText + separator + line).length > 2800) {
        if (currentText.trim()) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: currentText } });
        currentText = line;
      } else {
        currentText += currentText === prefix ? line : separator + line;
      }
    }
    if (currentText.trim()) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: currentText } });
    return blocks;
  }

  /** Шле блоки кількома повідомленнями, якщо їх більше ліміту Slack (max 50). */
  private async sendBlocksInChunks(blocks: SlackBlock[]) {
    const MAX_BLOCKS_PER_MESSAGE = 40;
    for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_MESSAGE) {
      await this.postToSlack({ blocks: blocks.slice(i, i + MAX_BLOCKS_PER_MESSAGE) });
    }
  }

  private async postToSlack(payload: { blocks: SlackBlock[] }) {
    if (!this.webhookUrl) return;
    const data = JSON.stringify(payload);

    return new Promise((resolve) => {
      try {
        const url = new URL(this.webhookUrl);
        const req = https.request(
          {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            timeout: 15000,
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
          },
          (res) => {
            console.log(`[SlackReporter] Status: ${res.statusCode}`);
            res.on('data', () => {});
            res.on('end', () => resolve(true));
          },
        );
        req.on('timeout', () => {
          req.destroy();
          console.error('[SlackReporter] Request timed out');
          resolve(false);
        });
        req.on('error', (e) => {
          console.error(`[SlackReporter] Error sending to Slack: ${e.message}`);
          resolve(false);
        });
        req.write(data);
        req.end();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[SlackReporter] Invalid Webhook URL: ${msg}`);
        resolve(false);
      }
    });
  }
}

export default PerFileSlackReporter;
