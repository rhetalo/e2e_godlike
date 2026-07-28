/**
 * reporterFailure.ts — общий обогатитель падений для репортёров (Slack + Markdown).
 *
 * Из `TestResult`/`TestCase` (без изменения тестов и флоу прогона) достаёт СОДЕРЖАТЕЛЬНЫЙ
 * контекст падения: на каком `test.step` упало, где именно (file:line), это таймаут или нет,
 * какая попытка / флоки ли, короткую причину (+ call-log) и снимок состояния страницы
 * (ARIA-snapshot из авто-вложения `error-context`, которое Playwright пишет сам).
 *
 * Всё defensive (optional chaining + try/catch внутри вызывающих): репортёр не должен ронять прогон.
 */
import type { TestCase, TestResult, TestStep } from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";

export interface FailureInfo {
  /** Путь упавших test.step («Start + EULA › дожидаемся Online»), или null. */
  failingStep: string | null;
  /** Локация ошибки `basename:line`, или null. */
  location: string | null;
  /** Человекочитаемая попытка, напр. «3/3». */
  attempt: string;
  /** Итог теста флоки (упал, но прошёл на ретрае). */
  isFlaky: boolean;
  /** Падение по таймауту (тест/шаг уперся в лимит). */
  timedOut: boolean;
  /** Короткая причина: первая строка ошибки + call-log (очищено от ANSI, обрезано). */
  reason: string;
  /** Обрезанный ARIA-snapshot страницы на момент падения (из error-context), или null. */
  pageSnapshot: string | null;
}

const ANSI = /\[[0-9;]*m/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI, "");
}

/** Собрать путь упавших `test.step` (DFS, только категория test.step с ошибкой). */
function erroredStepPath(steps: readonly TestStep[] | undefined, acc: string[]): string[] {
  for (const s of steps ?? []) {
    if (s.error && s.category === "test.step" && s.title) acc.push(s.title);
    if (s.steps?.length) erroredStepPath(s.steps, acc);
  }
  return acc;
}

/** Первый упавший шаг любой категории (fallback, если явных test.step нет). */
function anyErroredStep(steps: readonly TestStep[] | undefined): string | null {
  for (const s of steps ?? []) {
    if (s.error && s.title) return s.title;
    const nested = anyErroredStep(s.steps);
    if (nested) return nested;
  }
  return null;
}

/** Причина: 1-я значимая строка сообщения + блок «Call log» (до maxLines строк). */
function extractReason(message: string, maxLines = 14): string {
  const lines = stripAnsi(message).split("\n").map((l) => l.replace(/\s+$/, ""));
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  return nonEmpty.slice(0, maxLines).join("\n");
}

/** Прочитать и обрезать ARIA-snapshot из авто-вложения error-context (если есть). */
function readPageSnapshot(result: TestResult, maxLines = 40): string | null {
  try {
    const att = result.attachments?.find(
      (a) =>
        /error-context/i.test(a.name ?? "") ||
        a.contentType === "text/markdown" ||
        (a.path?.endsWith(".md") ?? false),
    );
    if (!att) return null;
    let raw = "";
    if (att.body) raw = att.body.toString("utf-8");
    else if (att.path && fs.existsSync(att.path)) raw = fs.readFileSync(att.path, "utf-8");
    if (!raw) return null;

    // error-context.md содержит секции; нам нужен снимок страницы, не инструкции/исходник теста.
    const snapMatch = raw.match(/#+\s*Page snapshot[\s\S]*?(?=\n#+\s|$)/i);
    const block = snapMatch ? snapMatch[0] : raw;
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    const trimmed = lines.slice(0, maxLines).join("\n");
    return lines.length > maxLines ? `${trimmed}\n… (+${lines.length - maxLines} строк)` : trimmed;
  } catch {
    return null;
  }
}

/** Достать содержательный контекст падения из результата теста. */
export function describeFailure(test: TestCase, result: TestResult): FailureInfo {
  const err = result.errors?.[0];
  const message = err?.message ?? result.error?.message ?? "Unknown error";

  const stepPath = erroredStepPath(result.steps, []);
  const failingStep = stepPath.length ? stepPath.join(" › ") : anyErroredStep(result.steps);

  const loc = err?.location;
  const location = loc ? `${path.basename(loc.file)}:${loc.line}` : null;

  const totalAttempts = ((test as unknown as { retries?: number }).retries ?? 0) + 1;
  const attempt = `${result.retry + 1}/${totalAttempts}`;

  let isFlaky = false;
  try {
    isFlaky = test.outcome() === "flaky";
  } catch {
    /* outcome может быть недоступен на промежуточной попытке */
  }

  const timedOut =
    result.status === "timedOut" || /Timeout.*(exceeded|ms)/i.test(stripAnsi(message));

  return {
    failingStep,
    location,
    attempt,
    isFlaky,
    timedOut,
    reason: extractReason(message),
    pageSnapshot: readPageSnapshot(result),
  };
}

/** Однострочная шапка падения (для Slack): «Крок … · 📍 file:line · спроба · таймаут». */
export function failureHeadline(info: FailureInfo): string {
  const parts: string[] = [];
  if (info.failingStep) parts.push(`*Крок:* «${info.failingStep}»`);
  const meta: string[] = [];
  if (info.location) meta.push(`📍 ${info.location}`);
  meta.push(`спроба ${info.attempt}`);
  if (info.isFlaky) meta.push("флоки (пройшов на ретраї)");
  else meta.push("стабільне падіння");
  if (info.timedOut) meta.push("⏱ таймаут");
  parts.push(meta.join(" · "));
  return parts.join("\n");
}
