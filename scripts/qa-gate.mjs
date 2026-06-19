#!/usr/bin/env node
/**
 * qa-gate — статический гейт качества перед git commit/push (PreToolUse-хук).
 *
 * Делает ТОЛЬКО быстрые статические проверки (никаких live-прогонов спеков — они
 * бьют по проду и идут минутами):
 *   - npx tsc --noEmit  → БЛОКИРУЕТ коммит/пуш при ошибках типов (exit 2);
 *   - npx eslint .      → БЛОКИРУЕТ при ESLint-ОШИБКАХ (hard-rules); warnings пропускает;
 *   - grep антипаттерна waitForTimeout в pages/components/tests → ПРЕДУПРЕЖДАЕТ (не блокирует).
 *
 * Хук получает JSON на stdin: { tool_name, tool_input: { command } }. Гейт реагирует
 * только на команды git commit / git push, иначе сразу пропускает.
 *
 * Коды выхода: 0 — ок/не релевантно; 2 — блокировать инструмент (stderr вернётся агенту).
 */
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

// Файлы, где waitForTimeout санкционирован (документирован) — не флагать.
// CookieBanner.ts — settle(150) после force-close транзиентных баннеров (2 места,
// помечены eslint-disable); теперь авторитет — ESLint (no-wait-for-timeout на pages/components).
const WAIT_ALLOWED = ["fixtures/base.ts", "valid.links.spec.ts", "components/CookieBanner.ts"];
const SCAN_DIRS = ["pages", "components", "tests"];

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function isGitCommitOrPush(cmd) {
  return /\bgit\b[^\n]*\b(commit|push)\b/.test(cmd || "");
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if ([".ts", ".tsx"].includes(extname(p))) out.push(p);
  }
  return out;
}

function findWaitForTimeout() {
  const hits = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walk(dir)) {
      if (WAIT_ALLOWED.some((a) => file.replace(/\\/g, "/").includes(a))) continue;
      let text;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      text.split("\n").forEach((line, i) => {
        if (line.includes("waitForTimeout")) hits.push(`${file.replace(/\\/g, "/")}:${i + 1}`);
      });
    }
  }
  return hits;
}

function main() {
  let payload = {};
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    process.exit(0); // не смогли распарсить — не мешаем
  }
  const cmd = payload?.tool_input?.command ?? "";
  if (!isGitCommitOrPush(cmd)) process.exit(0);

  // 1) tsc — жёсткий блок
  const tsc = spawnSync("npx", ["tsc", "--noEmit"], { shell: true, encoding: "utf8" });
  if (tsc.status !== 0) {
    console.error("[qa-gate] ❌ tsc --noEmit с ошибками — коммит/пуш заблокирован. Почини типы:\n");
    console.error((tsc.stdout || "") + (tsc.stderr || ""));
    process.exit(2);
  }

  // 2) eslint — жёсткий блок на ERROR (hard-rules репо: no-wait-for-timeout,
  // expect-expect, no-focused-test, no-standalone-expect и т.д.). Warnings не блокируют
  // (eslint exit=1 только при errors), поэтому «мягкий слой» (any/unused/web-first) не мешает.
  const lint = spawnSync("npx", ["eslint", "."], { shell: true, encoding: "utf8" });
  if (lint.status !== 0) {
    console.error("[qa-gate] ❌ eslint нашёл ОШИБКИ — коммит/пуш заблокирован. Почини правила:\n");
    console.error((lint.stdout || "") + (lint.stderr || ""));
    process.exit(2);
  }

  // 3) waitForTimeout — предупреждение (не блокирует). Дополняет eslint: ловит
  // waitForTimeout в pages/components, куда playwright-правило (tests/**) не достаёт.
  const waits = findWaitForTimeout();
  if (waits.length) {
    console.error("[qa-gate] ⚠️ waitForTimeout вне разрешённых файлов (антипаттерн, см. CLAUDE.md):");
    waits.forEach((h) => console.error("  - " + h));
    console.error("  (предупреждение, не блокирует — но замени на web-first ожидания)");
  }

  console.error("[qa-gate] ✅ tsc + eslint чисты.");
  process.exit(0);
}

main();
