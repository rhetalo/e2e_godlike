import {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import { describeFailure } from './reporterFailure';

class MarkdownLoggerReporter implements Reporter {
  private logContent: string[] = [];
  private testLogs = new Map<TestCase, string[]>();
  private globalLogs: string[] = [];
  private startTime: string;

  constructor() {
    const now = new Date();
    this.startTime = now.toLocaleString('ru-RU').replace(',', '');
  }

  onBegin(config: FullConfig, suite: Suite) {
    const branch = process.env.CI_COMMIT_REF_NAME || 'local';
    this.logContent.push(`# Результаты прогона теста: ${this.startTime}`);
    this.logContent.push(`## Информация о среде`);
    this.logContent.push(`- **Ветка:** ${branch}`);
    this.logContent.push(`- **Всего тестов:** ${suite.allTests().length}\n`);
    this.logContent.push(`---`);
  }

  onStdOut(chunk: string | Buffer, test?: TestCase) {
    const text = chunk.toString().trim();
    if (!text) return;

    // Выводим в консоль в реальном времени
    console.log(text);

    if (test) {
      const logs = this.testLogs.get(test) || [];
      logs.push(text);
      this.testLogs.set(test, logs);
    } else {
      this.globalLogs.push(text);
    }
  }

  onStdErr(chunk: string | Buffer, test?: TestCase) {
    const text = chunk.toString().trim();
    if (!text) return;

    // Выводим в консоль ошибок в реальном времени
    console.error(text);

    if (test) {
      const logs = this.testLogs.get(test) || [];
      logs.push(`[STDERR] ${text}`);
      this.testLogs.set(test, logs);
    } else {
      this.globalLogs.push(`[STDERR] ${text}`);
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const statusEmoji = result.status === 'passed' ? '✅' : '❌';
    this.logContent.push(`\n## ${statusEmoji} Тест: ${test.title}`);
    this.logContent.push(`- **Статус:** ${result.status.toUpperCase()}`);
    this.logContent.push(`- **Длительность:** ${(result.duration / 1000).toFixed(1)}s`);

    // Содержательный контекст падения: шаг / локация / попытка / таймаут / снимок страницы.
    if (result.status !== 'passed' && result.status !== 'skipped') {
      try {
        const info = describeFailure(test, result);
        if (info.failingStep) this.logContent.push(`- **Упал на шаге:** ${info.failingStep}`);
        if (info.location) this.logContent.push(`- **Локация:** ${info.location}`);
        this.logContent.push(
          `- **Попытка:** ${info.attempt}` +
            (info.isFlaky ? ' (флоки — прошёл на ретрае)' : '') +
            (info.timedOut ? ' · ⏱ таймаут' : ''),
        );
        if (info.pageSnapshot) {
          this.logContent.push(`\n**Состояние страницы на момент падения (ARIA-snapshot):**`);
          this.logContent.push('```\n' + info.pageSnapshot + '\n```');
        }
      } catch {
        /* обогащение best-effort — не роняем репортёр */
      }
    }

    const logs = this.testLogs.get(test) || [];
    if (logs.length > 0) {
      this.logContent.push(`\n**Логи выполнения:**`);
      this.logContent.push('```\n' + logs.join('\n') + '\n```');
    }

    if (result.errors.length > 0) {
      this.logContent.push(`\n**Ошибки:**`);
      result.errors.forEach((err) => {
        this.logContent.push('```\n' + err.message + '\n```');
      });
    }

    this.logContent.push(`\n---`);
  }

  async onEnd(result: FullResult) {
    if (this.globalLogs.length > 0) {
      this.logContent.splice(
        5,
        0,
        `\n## 🌐 Глобальные логи (Setup/Teardown)\n\`\`\`\n${this.globalLogs.join('\n')}\n\`\`\`\n---`,
      );
    }

    this.logContent.push(`\n# Итог прогона: ${result.status.toUpperCase()}`);

    const logsDir = path.resolve('test-logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

    const fileName =
      new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-') + '.md';
    fs.writeFileSync(path.join(logsDir, fileName), this.logContent.join('\n'), 'utf-8');

    console.log(`\n[INFO] Отчет сохранен: ${path.join(logsDir, fileName)}`);
  }
}

export default MarkdownLoggerReporter;
