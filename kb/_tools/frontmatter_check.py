"""KB front matter checker: обязательные поля шапки по типу страницы + связи + стиль.

Usage: python -I kb/_tools/frontmatter_check.py <repo_root>
Exit 1, если есть ошибки (предупреждения не валят).

Правила (контракт kb/README.md и kb/_meta/templates.md):
- у каждой страницы: id, title, updated (YYYY-MM-DD); id уникальны;
- feature / product-overview: type, product, status (draft|verified|stale), verified_on, tickets, flags, tests, sources;
- ticket: type, product, features, status (done|in-qa|blocked|partial|n/a), qa_verdict, verified_on, jira, sources;
  id = имя файла;
- feature в products/<prod>/<slug>.md: id = <PROD>/<slug>;
- tickets: [...] фичи и обзора ссылаются на существующие kb/tickets/<KEY>.md (TASK-*/DEV-* и т.п.);
- предупреждение: em-dash «—» в тексте (в KB пишем только дефис).
Парсер упрощённый: строки `key: value` верхнего уровня, списки в [..] или строками `  - `.
"""
import os, re, sys, collections

DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
REQUIRED = {
    "*": ["id", "title", "updated"],
    "feature": ["type", "product", "status", "verified_on", "tickets", "flags", "tests", "sources"],
    "product-overview": ["type", "product", "status", "verified_on", "tickets", "flags", "tests", "sources"],
    "ticket": ["type", "product", "features", "status", "qa_verdict", "verified_on", "jira", "sources"],
}
ALLOWED = {
    ("feature", "status"): {"draft", "verified", "stale"},
    ("product-overview", "status"): {"draft", "verified", "stale"},
    ("ticket", "status"): {"done", "in-qa", "blocked", "partial", "n/a"},
    ("ticket", "qa_verdict"): {"PASS", "PASS-with-issues", "FAIL", "-"},
}


def parse(text):
    m = re.match(r"---\r?\n(.*?)\r?\n---\r?\n", text, re.S)
    if not m:
        return None
    fm, key = {}, None
    for line in m.group(1).splitlines():
        km = re.match(r"^([a-z_]+):\s*(.*)$", line)
        if km:
            key, val = km.group(1), km.group(2).split(" #")[0].strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                val = val[1:-1]  # YAML-строка в кавычках: "-" == -
            fm[key] = val
        elif key and re.match(r"^\s+- ", line):
            fm[key] = (fm[key] + "\n" if fm[key] else "") + line.strip()[2:]
    return fm


def as_list(val):
    val = (val or "").strip()
    if val.startswith("["):
        return [x.strip() for x in val.strip("[]").split(",") if x.strip()]
    return [x.strip() for x in val.splitlines() if x.strip()]


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    kb = os.path.join(root, "kb")
    tickets_dir = os.path.join(kb, "tickets")
    ticket_ids = {f[:-3] for f in os.listdir(tickets_dir) if f.endswith(".md") and f != "README.md"}
    errors, warns, ids = [], [], collections.defaultdict(list)

    for dp, _, fs in os.walk(kb):
        for f in sorted(fs):
            if not f.endswith(".md"):
                continue
            p = os.path.join(dp, f)
            rel = os.path.relpath(p, root).replace("\\", "/")
            text = open(p, encoding="utf-8").read()
            if "—" in text:
                warns.append(f"{rel}: em-dash «—» ({text.count('—')} шт.), в KB только дефис")
            fm = parse(text)
            if fm is None:
                errors.append(f"{rel}: нет front matter")
                continue
            ptype = fm.get("type", "")
            for k in REQUIRED["*"] + REQUIRED.get(ptype, []):
                if k not in fm:
                    errors.append(f"{rel}: нет поля `{k}` (type: {ptype or '-'})")
            if "updated" in fm and not DATE.match(fm["updated"]):
                errors.append(f"{rel}: updated не YYYY-MM-DD: {fm['updated']!r}")
            vo = fm.get("verified_on")
            if vo not in (None, "", "null", "-") and not DATE.match(vo):
                errors.append(f"{rel}: verified_on не YYYY-MM-DD/null: {vo!r}")
            for (t, k), allowed in ALLOWED.items():
                if ptype == t and k in fm and fm[k] not in allowed:
                    errors.append(f"{rel}: {k}={fm[k]!r}, допустимо {sorted(allowed)}")
            if "id" in fm:
                ids[fm["id"]].append(rel)
            stem = f[:-3]
            if ptype == "ticket" and fm.get("id") != stem:
                errors.append(f"{rel}: id {fm.get('id')!r} не совпадает с именем файла {stem!r}")
            parts = rel.split("/")
            if ptype == "feature" and len(parts) == 4 and parts[1] == "products":
                expect = f"{parts[2].upper()}/{stem}"
                if fm.get("id") != expect:
                    errors.append(f"{rel}: id {fm.get('id')!r}, ожидается {expect!r}")
            if ptype in ("feature", "product-overview"):
                for t in as_list(fm.get("tickets")):
                    if t not in ticket_ids:
                        errors.append(f"{rel}: tickets ссылается на {t!r}, карточки kb/tickets/{t}.md нет")

    for i, where in ids.items():
        if len(where) > 1:
            errors.append(f"id {i!r} не уникален: {', '.join(where)}")

    print("== errors ==")
    for e in errors:
        print(e)
    print("== warnings ==")
    for w in warns:
        print(w)
    print(f"pages checked, errors: {len(errors)}, warnings: {len(warns)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
