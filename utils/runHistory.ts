/**
 * Історія прогонів для TestPulse (agents.docs/RESEARCH_2026-10-16.md F3, 18-Oct-2026).
 *
 * Навіщо: кожен прогін перезаписує HTML-звіт, тож флакі не видно трендом. Тут — JSONL-архів
 * «рядок на тест на прогін» + метрики по вікну останніх прогонів. Без залежностей і без SaaS:
 * дані не залишають VPS (у звітах — внутрішні панелі живого проду).
 *
 * Хто пише: PerFileSlackReporter.onEnd, див. `historyEnabled()`. Чисті функції — без Playwright,
 * щоб метрики можна було перевірити на синтетичній історії.
 */
import * as fs from 'fs';
import * as path from 'path';

export type HistoryStatus = 'passed' | 'failed' | 'skipped' | 'flaky';

export interface HistoryRow {
  runId: string; // ISO-час старту прогону — сортується як рядок
  commit: string;
  testId: string; // `<файл відносно кореня> › <describe…> › <назва>` — стабільний між прогонами
  file: string; // basename для показу
  title: string;
  status: HistoryStatus;
  durationMs: number;
  error?: string; // шапка помилки для failed/flaky, обрізана
}

export interface UnstableTest {
  testId: string;
  file: string;
  title: string;
  runs: number; // прогонів у вікні, де тест не skipped
  fails: number; // failed + flaky
  failRate: number; // fails / runs
  flips: number; // скільки разів статус змінився між сусідніми прогонами
}

export interface HistoryReport {
  windowRuns: number; // скільки прогонів реально у вікні (≤ запитаного)
  unstable: UnstableTest[]; // є і зелені, і червоні прогони; за спаданням failRate, потім flips
  redStreaks: { testId: string; file: string; title: string; streak: number }[]; // червоні N прогонів поспіль, включно з поточним
  failsInWindow: Map<string, number>; // testId → скільки разів падав у вікні (для позначок біля поточних падінь)
}

/** Чи писати історію. Пишемо лише «звітний» прогін: є webhook і це не CI (= cron на VPS).
 *  Ручні локальні прогони й GitLab-джоб (CI=true) не змішуємо. TEST_HISTORY=1/0 — примусово. */
export function historyEnabled(webhookUrl: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.TEST_HISTORY === '1') return true;
  if (env.TEST_HISTORY === '0') return false;
  return Boolean(webhookUrl) && !env.CI;
}

/** Шлях до файлу історії. `test-logs/` уже в .gitignore і не стирається деплоєм (лише reset --hard). */
export function historyFile(env: NodeJS.ProcessEnv = process.env): string {
  return env.TEST_HISTORY_FILE || path.join(process.cwd(), 'test-logs', 'history', 'history.jsonl');
}

export function readHistory(file: string): HistoryRow[] {
  if (!fs.existsSync(file)) return [];
  const rows: HistoryRow[] = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line) as HistoryRow);
    } catch {
      /* битий рядок (обірваний запис) пропускаємо — історія не повинна валити звіт */
    }
  }
  return rows;
}

/** Дописати прогін і обрізати до останніх `keepRuns` прогонів. Повертає всю історію після запису. */
export function appendRun(file: string, run: HistoryRow[], keepRuns = 30): HistoryRow[] {
  const all = [...readHistory(file), ...run];
  const runIds = [...new Set(all.map((r) => r.runId))].sort();
  const keep = new Set(runIds.slice(-keepRuns));
  const kept = all.filter((r) => keep.has(r.runId));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, kept.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  return kept;
}

const isFail = (s: HistoryStatus) => s === 'failed' || s === 'flaky';

/** Метрики по останніх `windowRuns` прогонах (поточний прогін має бути вже в `rows`). */
export function analyze(rows: HistoryRow[], windowRuns = 14): HistoryReport {
  const runIds = [...new Set(rows.map((r) => r.runId))].sort().slice(-windowRuns);
  const inWindow = new Set(runIds);
  const byTest = new Map<string, HistoryRow[]>();
  for (const r of rows) {
    if (!inWindow.has(r.runId)) continue;
    const list = byTest.get(r.testId) ?? [];
    list.push(r);
    byTest.set(r.testId, list);
  }

  const unstable: UnstableTest[] = [];
  const redStreaks: HistoryReport['redStreaks'] = [];
  const failsInWindow = new Map<string, number>();
  const lastRun = runIds[runIds.length - 1];

  for (const [testId, list] of byTest) {
    const runs = list.filter((r) => r.status !== 'skipped').sort((a, b) => a.runId.localeCompare(b.runId));
    if (runs.length === 0) continue;
    const fails = runs.filter((r) => isFail(r.status)).length;
    failsInWindow.set(testId, fails);
    const { file, title } = runs[runs.length - 1];

    let flips = 0;
    for (let i = 1; i < runs.length; i++) if (isFail(runs[i].status) !== isFail(runs[i - 1].status)) flips++;

    // Нестабільний = у вікні є і зелені, і червоні прогони (стабільно червоний — окрема секція).
    if (fails > 0 && fails < runs.length) {
      unstable.push({ testId, file, title, runs: runs.length, fails, failRate: fails / runs.length, flips });
    }

    // Серія червоних з кінця, лише якщо тест упав і в поточному прогоні.
    if (runs[runs.length - 1].runId === lastRun && runs[runs.length - 1].status === 'failed') {
      let streak = 0;
      for (let i = runs.length - 1; i >= 0 && runs[i].status === 'failed'; i--) streak++;
      redStreaks.push({ testId, file, title, streak });
    }
  }

  unstable.sort((a, b) => b.failRate - a.failRate || b.flips - a.flips);
  redStreaks.sort((a, b) => b.streak - a.streak);
  return { windowRuns: runIds.length, unstable, redStreaks, failsInWindow };
}
