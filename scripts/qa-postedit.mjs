#!/usr/bin/env node
/**
 * qa-postedit — быстрый ESLint-фидбэк ПОСЛЕ правки файла (PostToolUse-хук на Edit/Write).
 *
 * Зачем (идея из статьи «Год с Claude Code» — PostToolUse autorun): ловить ошибку
 * сразу при редактировании, а не только на коммит-гейте (qa-gate.mjs). Линтит ТОЛЬКО
 * один изменённый файл — это быстро (~1с), в отличие от полного `eslint .`.
 *
 * Хук получает JSON на stdin: { tool_name, tool_input: { file_path } }.
 * Реагирует только на .ts/.tsx в исходных директориях; для прочих файлов — no-op.
 *
 * Коды выхода:
 *   0 — ок / не релевантно / только warnings (не нагружаем агента шумом);
 *   2 — ESLint нашёл ОШИБКИ → stderr возвращается агенту как фидбэк (правку не отменяет,
 *       но даёт немедленный сигнал «почини»).
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Линтим только исходники теста/PO/компонентов/утилит — там, где живут hard-rules.
const SOURCE_DIRS = ["tests/", "pages/", "components/", "utils/", "fixtures/"];

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  let payload = {};
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    process.exit(0); // не распарсили — не мешаем
  }

  const file = payload?.tool_input?.file_path ?? "";
  const norm = file.replace(/\\/g, "/");

  if (!/\.(ts|tsx)$/.test(norm)) process.exit(0); // не TS — пропускаем
  if (!SOURCE_DIRS.some((d) => norm.includes("/" + d) || norm.startsWith(d))) process.exit(0);

  const lint = spawnSync("npx", ["eslint", file], { shell: true, encoding: "utf8" });

  // eslint exit=1 только при ERROR; warnings → exit=0 (их не показываем, чтобы не шуметь).
  if (lint.status && lint.status !== 0) {
    console.error("[qa-postedit] ❌ ESLint-ошибки в только что изменённом файле — почини:\n");
    console.error((lint.stdout || "") + (lint.stderr || ""));
    process.exit(2);
  }

  process.exit(0);
}

main();
