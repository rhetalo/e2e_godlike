import { Reporter, TestCase, TestResult, FullConfig, Suite } from '@playwright/test/reporter';
import * as https from 'https';
import * as path from 'path';
import { execSync } from 'child_process';
import { describeFailure, failureHeadline } from './reporterFailure';
import {
  analyze,
  appendRun,
  historyEnabled,
  historyFile,
  type HistoryReport,
  type HistoryRow,
  type HistoryStatus,
} from './runHistory';

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
 *
 * Історія (18-Oct-2026, RESEARCH F3): звітний прогін (є webhook, немає CI = cron на VPS) дописує
 * рядок на тест у test-logs/history/history.jsonl (утиліта utils/runHistory.ts) і додає у звіт
 * «нове падіння / падав X з N» біля кожного падіння + секції нестабільних і червоних поспіль.
 * SLACK_DRY_RUN=1 — друкує payload у консоль замість відправки (перевірка без Slack).
 */

/** Вікно метрик і скільки прогонів зберігати. */
const HISTORY_WINDOW = 14;
const HISTORY_KEEP = 30;
/** Мінімальна серія червоних прогонів, яку показуємо окремою секцією. */
const RED_STREAK_MIN = 3;
const TOP_UNSTABLE = 5;

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
  testId: string;
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
  private rootDir = process.cwd();
  private runId = new Date().toISOString();
  private totalDurationMs = 0;
  private webhookUrl: string;
  private meta: { key: string; value: string }[];

  constructor(options: { webhookUrl: string; meta?: { key: string; value: string }[] }) {
    this.webhookUrl = options.webhookUrl;
    this.meta = options.meta || [];
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.rootSuite = suite;
    this.rootDir = config.rootDir;
    this.runId = new Date().toISOString();
  }

  /** Стабільний між прогонами id: файл відносно кореня + describe… + назва (без проєкту). */
  private testId(test: TestCase): string {
    const rel = path.relative(this.rootDir, test.location.file).split(path.sep).join('/');
    return [rel, ...test.titlePath().slice(3)].join(' › ');
  }

  /** Записати поточний прогін в історію і порахувати метрики. Best-effort: збій історії не валить звіт. */
  private recordHistory(): HistoryReport | null {
    if (!historyEnabled(this.webhookUrl)) return null;
    try {
      let commit = process.env.CI_COMMIT_SHA?.slice(0, 8) || '';
      if (!commit) {
        try {
          commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        } catch {
          commit = 'unknown';
        }
      }
      const statusOf: Record<string, HistoryStatus> = {
        expected: 'passed',
        unexpected: 'failed',
        flaky: 'flaky',
        skipped: 'skipped',
      };
      const rows: HistoryRow[] = (this.rootSuite?.allTests() ?? []).map((test) => {
        const status = statusOf[test.outcome()] ?? 'failed';
        const last = test.results[test.results.length - 1];
        const row: HistoryRow = {
          runId: this.runId,
          commit,
          testId: this.testId(test),
          file: path.basename(test.location.file),
          title: test.title,
          status,
          durationMs: test.results.reduce((sum, r) => sum + r.duration, 0),
        };
        if (status === 'failed' || status === 'flaky') {
          row.error = (last?.errors?.[0]?.message ?? '').split('\n')[0].slice(0, 200);
        }
        return row;
      });
      const all = appendRun(historyFile(), rows, HISTORY_KEEP);
      return analyze(all, HISTORY_WINDOW);
    } catch (e) {
      console.error(`[SlackReporter] історія не записана: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
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
        r.failures.push({ testId: this.testId(test), title: test.title, file, error: reason, headline });
      }
    }
    return blocks;
  }

  async onEnd() {
    const history = this.recordHistory(); // пишемо навіть без webhook, якщо TEST_HISTORY=1
    const dryRun = process.env.SLACK_DRY_RUN === '1';
    if (!this.webhookUrl && !dryRun) return;
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
        const trend = history ? `\n${this.trendNote(history, f.testId)}` : '';
        return `*❌ ${f.file} › ${f.title}*${link}${head}${trend}\n\`\`\`${cleanError}\`\`\``;
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

    if (history) this.historyBlocks(history).forEach((b) => allBlocks.push(b));

    if (dryRun) {
      console.log(`[SlackReporter] DRY RUN, payload:\n${JSON.stringify({ blocks: allBlocks }, null, 2)}`);
      return;
    }
    await this.sendBlocksInChunks(allBlocks);
  }

  /** Позначка біля падіння: нове чи повторне (за вікном історії, включно з поточним прогоном). */
  private trendNote(h: HistoryReport, testId: string): string {
    const fails = h.failsInWindow.get(testId) ?? 1;
    const streak = h.redStreaks.find((s) => s.testId === testId)?.streak ?? 1;
    if (fails <= 1) return `🆕 нове падіння (вперше за ${h.windowRuns} прогонів)`;
    const streakNote = streak >= 2 ? `, червоний ${streak} прогони поспіль` : '';
    return `📊 падав ${fails} з ${h.windowRuns} останніх прогонів${streakNote}`;
  }

  /** Секції тренду: нестабільні (і зелені, і червоні у вікні) + червоні N прогонів поспіль. */
  private historyBlocks(h: HistoryReport): SlackBlock[] {
    const out: SlackBlock[] = [];
    if (h.windowRuns < 2) return out; // одного прогону для тренду замало
    // Хто вже в секції «стабільно червоні», у «нестабільних» не дублюємо.
    const inStreak = new Set(h.redStreaks.filter((s) => s.streak >= RED_STREAK_MIN).map((s) => s.testId));
    const unstable = h.unstable
      .filter((u) => !inStreak.has(u.testId))
      .slice(0, TOP_UNSTABLE)
      .map(
        (u) =>
          `• *${u.file} › ${u.title}* — падав ${u.fails} з ${u.runs} (${Math.round(u.failRate * 100)}%), змін статусу: ${u.flips}`,
      );
    const streaks = h.redStreaks
      .filter((s) => s.streak >= RED_STREAK_MIN)
      .map((s) => `• *${s.file} › ${s.title}* — червоний ${s.streak} прогонів поспіль`);
    if (unstable.length) {
      out.push({ type: 'divider' });
      out.push(...this.chunkTextToBlocks(`*📉 Нестабільні за ${h.windowRuns} прогонів (топ-${TOP_UNSTABLE}):*`, unstable));
    }
    if (streaks.length) {
      out.push({ type: 'divider' });
      out.push(...this.chunkTextToBlocks(`*🔴 Стабільно червоні (≥${RED_STREAK_MIN} прогонів поспіль):*`, streaks));
    }
    return out;
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
