"""Матрица покрытия KB <-> автотесты: сверка ссылок, сироты, сводная таблица kb/coverage.md.

Usage:
  python -I kb/_tools/coverage.py <repo_root>            # отчёт в консоль, exit 1 при битых ссылках
  python -I kb/_tools/coverage.py <repo_root> --write    # + пересобрать kb/coverage.md
  python -I kb/_tools/coverage.py <repo_root> --check    # + exit 1, если kb/coverage.md устарел

Что сверяет (страницы type: feature / product-overview в kb/products/):
- ОШИБКА: путь из `tests:` в шапке не существует (глобы раскрываются);
- ОШИБКА: ID кейса из строки таблицы «## Покрытие» не найден среди закоммиченных tests/ (протух
  после рефакторинга). Проза и строки с ❓ (известное неподтверждённое) не проверяются.
  В таблицах ID короткие (CFG-001), в коде полные (TC-GP-CFG-001): префикс берётся по продукту
  страницы (PRODUCT_PREFIXES), ключи тикетов (DEV-, PROD-, ...) не считаются;
- СИРОТЫ (информативно): спеки, на которые не ссылается ни одна страница, и TC-ID из кода,
  которых KB не упоминает нигде - покрытие, о котором дока не знает.
Парсер шапки упрощённый, как в frontmatter_check.py. Правило репо: только дефис «-», не «—».
"""
import glob, os, re, subprocess, sys, collections

# Продукт KB -> префиксы TC-ID в коде (kb/_meta/id-scheme.md: в спеках пока старое TC-GP-* = UP).
PRODUCT_PREFIXES = {"UP": ["GP", "UP"], "VPS": ["VPS"], "WPGL": ["GAMES", "LOC"]}
TICKET_PREFIXES = {"DEV", "PROD", "GROWTH", "B2B", "TASK", "OLDP", "ADM", "BIL", "PFH", "WPGL", "UP", "VPS"}
TC_ID = re.compile(r"\bTC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}\b")
# ID из шаблонной строки в цикле: `TC-GP-BKP-SCOPE-00${i + 1}` - статически известен только префикс.
TC_TPL = re.compile(r"\bTC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{0,2}(?=\$\{)")
SHORT_ID = re.compile(r"\b[A-Z][A-Z0-9]{1,6}(?:-[A-Z0-9]+)*-\d{3}\b")
TEST_CALL = re.compile(r"^\s*test(?:\.(?:only|fixme|fail|slow))?\(\s*[`\"']", re.M)
OUT = "kb/coverage.md"


def parse_fm(text):
    m = re.match(r"---\r?\n(.*?)\r?\n---\r?\n", text, re.S)
    if not m:
        return None
    fm, key = {}, None
    for line in m.group(1).splitlines():
        if re.match(r"^\S[^:]*:", line):
            key, _, val = line.partition(":")
            key, val = key.strip(), re.sub(r"\s+#.*$", "", val).strip()
            if val.startswith("[") and val.endswith("]"):
                fm[key] = [v.strip() for v in val[1:-1].split(",") if v.strip()]
            else:
                fm[key] = val
        elif key and re.match(r"^\s+-\s", line):
            fm.setdefault(key, []) if isinstance(fm.get(key), list) else fm.__setitem__(key, [])
            fm[key].append(line.split("-", 1)[1].strip())
    return fm


RANGE = re.compile(r"\b([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*?)-(\d{3})\.\.(?:\1-)?(\d{3})\b")


def expand_ranges(text):
    """`LOGIN-001..006` -> `LOGIN-001 LOGIN-002 ... LOGIN-006` (в KB кейсы часто пишут диапазоном)."""
    def repl(m):
        lo, hi = int(m.group(2)), int(m.group(3))
        if hi < lo or hi - lo > 50:
            return m.group(0)
        return " ".join(f"{m.group(1)}-{n:03d}" for n in range(lo, hi + 1))
    text = RANGE.sub(repl, text)
    # `FILE-001, 002, 004` -> `FILE-001, FILE-002, FILE-004` (список хвостов к одному префиксу)
    return LIST.sub(lambda m: m.group(1) + "-" + m.group(2) + "".join(
        f", {m.group(1)}-{n}" for n in re.findall(r"\d{3}", m.group(3))), text)


LIST = re.compile(r"\b([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*?)-(\d{3})((?:,\s*\d{3}\b)+)")


def section(text, title):
    """Тело раздела `## <title>` до следующего `## `."""
    m = re.search(rf"^## {re.escape(title)}\s*$(.*?)(?=^## |\Z)", text, re.S | re.M)
    return m.group(1) if m else ""


def main(root, mode):
    root = os.path.abspath(root)
    rel = lambda p: os.path.relpath(p, root).replace(os.sep, "/")

    # ── код: спеки, число тестов, TC-ID ──
    # Только файлы под git: незакоммиченный чужой WIP не должен менять матрицу (иначе --check в CI
    # и локальная генерация разойдутся). Вне git-репо - фолбэк на glob.
    try:
        out = subprocess.run(["git", "-C", root, "ls-files", "tests"], capture_output=True, text=True, check=True).stdout
        specs = sorted(p for p in out.splitlines() if p.endswith(".spec.ts"))
    except (OSError, subprocess.CalledProcessError):
        specs = sorted(rel(p) for p in glob.glob(os.path.join(root, "tests", "**", "*.spec.ts"), recursive=True))
    tests_in, ids_in, tpl_in = {}, collections.defaultdict(set), collections.defaultdict(set)
    for s in specs:
        src = open(os.path.join(root, s), encoding="utf-8").read()
        tests_in[s] = len(TEST_CALL.findall(src))
        for tc in TC_ID.findall(src):
            ids_in[tc].add(s)
        for px in TC_TPL.findall(src):
            tpl_in[px].add(s)

    # ── KB: страницы фич и обзоров ──
    pages = []
    all_kb_text = ""
    for p in sorted(glob.glob(os.path.join(root, "kb", "**", "*.md"), recursive=True)):
        text = expand_ranges(open(p, encoding="utf-8").read())
        if rel(p) != OUT:
            all_kb_text += text
        fm = parse_fm(text)
        if fm and fm.get("type") in ("feature", "product-overview") and rel(p).startswith("kb/products/"):
            pages.append((rel(p), fm, text))

    errors, referenced = [], set()
    rows = collections.defaultdict(list)
    for path, fm, text in pages:
        prod = fm.get("product", "?")
        files = set()
        tracked = set(specs)
        for entry in fm.get("tests") or []:
            entry = entry.strip("`'\" ")
            hits = [rel(h) for h in glob.glob(os.path.join(root, entry), recursive=True)]
            # Спеки сверяем с git, а не с диском: глоб не должен подхватывать чужой незакоммиченный WIP.
            spec_hits = [h for h in hits if h.endswith(".spec.ts") and h in tracked]
            if not hits:
                errors.append(f"{path}: tests: '{entry}' - файла нет")
            elif not spec_hits and all(h.endswith(".spec.ts") for h in hits):
                errors.append(f"{path}: tests: '{entry}' - нет в git (не закоммичен)")
            files.update(spec_hits)
        referenced |= files

        cov = section(text, "Покрытие")
        # Заявка на покрытие = ID в СТРОКЕ ТАБЛИЦЫ. Проза («TC-GP-DB-001 запаркован») - не заявка,
        # строка с ❓ - известная неподтверждённая (напр. «не закоммичен»), её тоже не проверяем.
        table = "\n".join(l for l in cov.splitlines() if l.startswith("|") and "❓" not in l)
        stale, found = [], 0
        for short in sorted(set(SHORT_ID.findall(table))):
            if short.startswith("TC-"):
                full = [short]
            elif short.split("-")[0] in TICKET_PREFIXES:
                continue
            else:
                full = [f"TC-{px}-{short}" for px in PRODUCT_PREFIXES.get(prod, [])] + [f"TC-{short}"]
            if any(f in ids_in or any(f.startswith(px) and f[len(px):].isdigit() for px in tpl_in) for f in full):
                found += 1
            else:
                stale.append(short)
        for s in stale:
            errors.append(f"{path}: «Покрытие» ссылается на {s} - в tests/ такого TC-ID нет")

        lines = [l for l in cov.splitlines() if l.startswith("|") and not re.match(r"^\|\s*(Что|-+)", l)]
        manual = sum(1 for l in lines if re.search(r"руками|ручн", l, re.I))
        ok = sum(1 for l in lines if "✅" in l)
        bad = sum(1 for l in lines if "❌" in l)
        rows[prod].append({
            "path": path, "title": fm.get("title", path), "status": fm.get("status", "?"),
            "overview": fm.get("type") == "product-overview",
            "files": sorted(files), "tests": sum(tests_in.get(f, 0) for f in files),
            "ok": ok, "manual": manual, "bad": bad, "ids": found,
        })

    orphan_specs = [s for s in specs if s not in referenced and s != "tests/seed.spec.ts"]
    orphan_ids = sorted(tc for tc in ids_in if tc not in all_kb_text and tc.split("-", 2)[2] not in all_kb_text)

    print(f"страниц: {len(pages)}, спеков: {len(specs)}, TC-ID в коде: {len(ids_in)}")
    print(f"ОШИБОК: {len(errors)}")
    for e in errors:
        print("  ERR", e)
    print(f"спеков без страницы KB: {len(orphan_specs)}")
    for s in orphan_specs:
        print("  ORPHAN", s)
    print(f"TC-ID, которых KB не знает: {len(orphan_ids)}")

    md = render(rows, orphan_specs, orphan_ids, ids_in, tests_in)
    out = os.path.join(root, OUT)
    if mode == "--write":
        open(out, "w", encoding="utf-8", newline="\n").write(md)
        print(f"записан {OUT}")
    if mode == "--check":
        cur = open(out, encoding="utf-8").read() if os.path.exists(out) else ""
        strip = lambda t: re.sub(r"^updated: .*$", "", t, flags=re.M)
        if strip(cur) != strip(md):
            print(f"УСТАРЕЛ {OUT}: пересобери `python -I kb/_tools/coverage.py . --write`")
            return 1
    return 1 if errors else 0


def render(rows, orphan_specs, orphan_ids, ids_in, tests_in):
    import datetime
    today = datetime.date.today().isoformat()
    link = lambda p: p.replace("kb/", "", 1)
    out = [
        "---", "id: KB-COVERAGE", "title: Матрица покрытия - фичи KB и автотесты", "type: index",
        "status: draft", f"updated: {today}",
        "verified_on: null              # генерируется из KB и tests/, с продуктом не сверяется",
        "sources:", "  - kb/products/**/*.md (шапка tests:, раздел «Покрытие»)", "  - tests/**/*.spec.ts", "---", "",
        "# Матрица покрытия - фичи KB и автотесты", "",
        "> **В двух словах.** Для каждой страницы фичи: какие спеки её покрывают, сколько в них тестов и что",
        "> сказано в её таблице «Покрытие» (✅ авто / руками / ❌ нет). Внизу - покрытие, о котором KB не знает.",
        "> **Файл генерируется** `python -I kb/_tools/coverage.py . --write` - руками не править.", "",
        "Легенда: **Тестов** - вызовы `test(` в спеках из шапки `tests:` (спек на несколько фич считается у каждой).",
        "**Покрытие** - строки таблицы на странице: ✅ / руками / ❌. Пусто в «Спеки» = автотестов нет.", "",
    ]
    names = {"UP": "UP - игровая панель", "VPS": "VPS - панель VirtFusion", "WPGL": "WPGL - витрина"}
    for prod in sorted(rows, key=lambda p: (p not in names, p)):
        items = rows[prod]
        out += [f"## {names.get(prod, prod)}", "",
                f"Страниц: {len(items)}, с автотестами: {sum(1 for r in items if r['files'])}, "
                f"тестов в их спеках: {sum(tests_in.get(f, 0) for f in sorted({f for r in items for f in r['files']}))}.", "",
                "| Фича | Статус | Спеки | Тестов | Покрытие ✅ / руками / ❌ |", "|---|---|---|---|---|"]
        for r in sorted(items, key=lambda r: (not r["files"], r["path"])):
            if r["overview"] and len(r["files"]) > 5:  # обзор продукта: все спеки - число, не список
                spec_cell = f"все спеки продукта ({len(r['files'])})"
            else:
                spec_cell = ", ".join(f"`{os.path.basename(f)}`" for f in r["files"]) or "-"
            out.append(f"| [{r['title']}]({link(r['path'])}) | {r['status']} | {spec_cell} | {r['tests'] or '-'} | "
                       f"{r['ok']} / {r['manual']} / {r['bad']} |")
        out.append("")
    out += ["## Покрытие, о котором KB не знает", "",
            f"**Спеки без страницы KB** ({len(orphan_specs)}) - ни одна страница не ссылается на них в `tests:`:", ""]
    out += [f"- `{s}` ({tests_in.get(s, 0)} тестов)" for s in orphan_specs] or ["- нет"]
    by_spec = collections.defaultdict(list)
    for tc in orphan_ids:
        for s in sorted(ids_in[tc]):
            by_spec[s].append(tc)
    out += ["", f"**TC-ID, которых KB не упоминает** ({len(orphan_ids)}) - по спекам:", ""]
    out += [f"- `{os.path.basename(s)}`: {', '.join(v)}" for s, v in sorted(by_spec.items())] or ["- нет"]
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else ""))
