import { Reporter, TestCase, TestResult, FullConfig, Suite } from '@playwright/test/reporter';
import * as https from 'https';
import * as path from 'path';

/**
 * Custom Playwright Reporter that sends Slack notifications for each test file individually.
 */
interface TestEntry {
  name: string;
  status: string;
  duration: number;
  error?: string;
}

interface FileResult {
  tests: TestEntry[];
  passed: number;
  failed: number;
  skipped: number;
}

/** Slack Block Kit-блок: структура произвольная, типизируем как объект (не any). */
type SlackBlock = Record<string, unknown>;

class PerFileSlackReporter implements Reporter {
  private fileResults = new Map<string, FileResult>();

  private testsRemaining = new Map<string, number>();
  private webhookUrl: string;
  private meta: { key: string; value: string }[];

  constructor(options: { webhookUrl: string; meta?: { key: string; value: string }[] }) {
    this.webhookUrl = options.webhookUrl;
    this.meta = options.meta || [];
  }

  onBegin(config: FullConfig, suite: Suite) {
    // Count total tests per file
    for (const test of suite.allTests()) {
      const filePath = test.location.file;
      this.testsRemaining.set(filePath, (this.testsRemaining.get(filePath) || 0) + 1);

      if (!this.fileResults.has(filePath)) {
        this.fileResults.set(filePath, {
          tests: [],
          passed: 0,
          failed: 0,
          skipped: 0,
        });
      }
    }
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    const filePath = test.location.file;
    const res = this.fileResults.get(filePath);
    if (!res) return;

    res.tests.push({
      name: test.title,
      status: result.status,
      duration: result.duration,
      error: result.errors.length > 0 ? result.errors[0].message : undefined,
    });

    if (result.status === 'passed') res.passed++;
    else if (result.status === 'skipped') res.skipped++;
    else res.failed++;

    const remaining = (this.testsRemaining.get(filePath) || 0) - 1;
    this.testsRemaining.set(filePath, remaining);

    // When all tests in this file are done, send report
    if (remaining === 0) {
      const fileName = path.basename(filePath);
      console.log(`[SlackReporter] Sending report for ${fileName}...`);
      await this.sendSlackReport(filePath, res);
    }
  }

  private async sendSlackReport(filePath: string, results: FileResult) {
    if (!this.webhookUrl) return;

    const fileName = path.basename(filePath);
    const branch = this.meta.find((m) => m.key === 'Branch')?.value || 'local';
    const jobUrl = this.meta.find((m) => m.key === 'Job URL')?.value;

    const status = results.failed === 0 ? 'passed' : 'failed';
    const statusEmoji = status === 'passed' ? '✅' : '❌';
    const statusText = status === 'passed' ? 'Regression passed' : 'Regression failed';

    // Calculate duration for this file
    let durationStr = 'unknown';
    if (results.tests.length > 0) {
      const durationMs = results.tests.reduce((acc: number, t: TestEntry) => acc + t.duration, 0);
      const durationMinutes = Math.floor(durationMs / 60000);
      const durationSeconds = Math.floor((durationMs % 60000) / 1000);
      durationStr = `${durationMinutes}m ${durationSeconds}s`;
    }

    const allBlocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} ${statusText} [${fileName}]`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `*Branch:* ${branch}`,
            `*Duration:* ${durationStr}`,
            `*Tests:* ✅ ${results.passed} | ❌ ${results.failed} | ⏭️ ${results.skipped}`,
          ].join('\n'),
        },
      },
    ];

    // 1. Show summary of ALL tests in this file
    if (results.tests.length > 0) {
      const testLines = results.tests.map((t: TestEntry) => {
        const emoji = t.status === 'passed' ? '✅' : t.status === 'skipped' ? '⏭️' : '❌';
        return `${emoji} *${t.name}* (${(t.duration / 1000).toFixed(1)}s)`;
      });

      this.chunkTextToBlocks('*Test Execution Summary:*', testLines).forEach((b) => allBlocks.push(b));
    }

    // 2. Failure Details (ALL failures)
    const failures = results.tests.filter((t: TestEntry) => t.status === 'failed' || t.status === 'timedOut');
    if (failures.length > 0) {
      const failureLines = failures.map((f: TestEntry) => {
        const cleanError = f.error ? f.error.split('\n').slice(0, 10).join('\n') : 'Unknown error';
        return `*❌ ${f.name}*\n\`\`\`${cleanError}\`\`\``;
      });

      this.chunkTextToBlocks('*Detailed Failures:*', failureLines, '\n\n').forEach((b) => allBlocks.push(b));
    }

    // 3. Artifacts
    const artifactLinks = [];
    if (jobUrl) {
      artifactLinks.push(`- <${jobUrl}/artifacts/file/playwright-report/index.html|HTML Report>`);
      artifactLinks.push(`- <${jobUrl}/artifacts/browse/test-results|Screenshots & Traces>`);
    }

    if (artifactLinks.length > 0) {
      allBlocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Artifacts:*\n' + artifactLinks.join('\n'),
        },
      });
    }

    await this.sendBlocksInChunks(allBlocks, fileName);
  }

  /**
   * Chunks an array of lines into Slack section blocks, respecting the 3000 character limit per block.
   */
  private chunkTextToBlocks(header: string, lines: string[], separator: string = '\n'): SlackBlock[] {
    const blocks: SlackBlock[] = [];
    let currentText = header + '\n';

    for (const line of lines) {
      // Slack limit is 3000, we use 2800 for safety
      if ((currentText + separator + line).length > 2800) {
        blocks.push({
          type: 'section',
          text: { type: 'mrkdwn', text: currentText },
        });
        currentText = line;
      } else {
        currentText += (currentText === header + '\n' ? '' : separator) + line;
      }
    }

    if (currentText.trim()) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: currentText },
      });
    }
    return blocks;
  }

  /**
   * Sends blocks in multiple messages if they exceed Slack's limits (max 50 blocks per message).
   */
  private async sendBlocksInChunks(blocks: SlackBlock[], fileName: string) {
    const MAX_BLOCKS_PER_MESSAGE = 40; // Slack limit is 50, but we use 40 to be safe
    for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_MESSAGE) {
      const chunk = blocks.slice(i, i + MAX_BLOCKS_PER_MESSAGE);
      await this.postToSlack({ blocks: chunk }, fileName);
    }
  }

  private async postToSlack(payload: { blocks: SlackBlock[] }, fileName: string) {
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
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
            },
          },
          (res) => {
            console.log(`[SlackReporter] Status: ${res.statusCode} for ${fileName}`);
            res.on('data', () => {});
            res.on('end', () => resolve(true));
          },
        );

        req.on('timeout', () => {
          req.destroy();
          console.error(`[SlackReporter] Request timed out for ${fileName}`);
          resolve(false);
        });

        req.on('error', (e) => {
          console.error(`[SlackReporter] Error sending to Slack for ${fileName}: ${e.message}`);
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
