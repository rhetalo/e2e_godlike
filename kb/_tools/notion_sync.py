"""Зеркало KB в Notion: git - источник, Notion - витрина для людей. Пилот: UP (Фичи + Тикеты + Флаги).

Usage: python -I kb/_tools/notion_sync.py <repo_root> [--dry-run] [--force]
Env (.env в корне репо или окружение): NOTION_TOKEN (обязателен), NOTION_KB_ROOT (id корневой страницы, есть дефолт).

Как работает:
- под корневой страницей ищет (или создаёт) три базы: «Фичи UP», «Тикеты», «Флаги»; связи Фичи <-> Тикеты,
  Фичи <-> Флаги, Флаги <-> Тикеты двусторонние, поэтому в Notion всё кликабельно в обе стороны;
- строка базы находится по свойству «KB ID», поэтому повторный запуск обновляет, а не плодит дубли;
- проход 1 создаёт недостающие строки, проход 2 пишет свойства, связи и тело страницы
  (ссылки на другие страницы KB становятся ссылками на их Notion-страницы, остальное - на GitLab);
- тело перезаписывается только если поменялся хэш исходника (свойство «sync_hash»), --force - всегда.
Правки в Notion перезатираются следующим синком: править надо markdown в kb/.
"""
import hashlib, json, os, re, sys, time, urllib.error, urllib.request

sys.dont_write_bytecode = True  # импорт соседнего скрипта не должен оставлять __pycache__ в kb/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from frontmatter_check import as_list, parse  # noqa: E402

API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
DEFAULT_ROOT = "4061d168df3f80da83b8c46b559b5ef5"  # «godlike KB» в личном workspace владельца
GITLAB_BLOB = "https://git.godlike.ovh/e2e/godlike-tests/-/blob/main/"
PRODUCT = "up"
DB_FEATURES, DB_TICKETS, DB_FLAGS = "Фичи UP", "Тикеты", "Флаги"
RT_LIMIT = 1900  # лимит Notion 2000 символов на кусок rich_text
CODE_LANGS = {"ts": "typescript", "typescript": "typescript", "js": "javascript", "javascript": "javascript",
              "json": "json", "bash": "bash", "sh": "shell", "shell": "shell", "python": "python", "py": "python",
              "sql": "sql", "yaml": "yaml", "yml": "yaml", "html": "html", "css": "css", "php": "php",
              "markdown": "markdown", "md": "markdown", "http": "plain text"}


# ---------- Notion API ----------

class Notion:
    def __init__(self, token):
        self.token = token

    def call(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        for attempt in range(6):
            req = urllib.request.Request(API + path, data=data, method=method, headers={
                "Authorization": "Bearer " + self.token, "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    time.sleep(0.34)  # лимит API ~3 запроса/с
                    return json.load(r)
            except urllib.error.HTTPError as e:
                if e.code in (409, 429, 500, 502, 503, 504) and attempt < 5:
                    time.sleep(float(e.headers.get("Retry-After") or 2 ** attempt))
                    continue
                raise RuntimeError(f"{method} {path}: {e.code} {e.read()[:500].decode(errors='replace')}")

    def paginate(self, method, path, body=None):
        cursor, out = None, []
        while True:
            if method == "GET":
                res = self.call("GET", path + ("&" if "?" in path else "?") + "page_size=100"
                                + (f"&start_cursor={cursor}" if cursor else ""))
            else:
                res = self.call("POST", path, dict(body or {}, page_size=100, **({"start_cursor": cursor} if cursor else {})))
            out += res["results"]
            if not res.get("has_more"):
                return out
            cursor = res["next_cursor"]


# ---------- markdown -> блоки Notion ----------

INLINE = re.compile(r"(\*\*.+?\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))")


def rich(text, resolve, bold=False):
    out = []
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**") and len(part) > 4:
            out += rich(part[2:-2], resolve, bold=True)
            continue
        ann, link = {"bold": bold}, None
        if part.startswith("`") and part.endswith("`") and len(part) > 2:
            part, ann["code"] = part[1:-1], True
        else:
            m = re.fullmatch(r"\[([^\]]+)\]\(([^)\s]+)\)", part)
            if m:
                part, link = m.group(1).replace("`", ""), resolve(m.group(2))
        for i in range(0, len(part), RT_LIMIT):
            t = {"content": part[i:i + RT_LIMIT]}
            if link:
                t["link"] = {"url": link}
            out.append({"type": "text", "text": t, "annotations": ann})
    return out


def block(kind, text, resolve, **extra):
    return {"object": "block", "type": kind, kind: dict({"rich_text": rich(text, resolve)}, **extra)}


def md_to_blocks(body, resolve):
    lines, blocks, i = body.splitlines(), [], 0
    para = []

    def flush():
        if para:
            blocks.append(block("paragraph", " ".join(s.strip() for s in para), resolve))
            para.clear()

    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if not s:
            flush(); i += 1; continue
        if s.startswith("```"):
            flush()
            lang = CODE_LANGS.get(s[3:].strip().lower(), "plain text")
            code, i = [], i + 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code.append(lines[i]); i += 1
            text = "\n".join(code)
            blocks.append({"object": "block", "type": "code", "code": {"language": lang, "rich_text": [
                {"type": "text", "text": {"content": text[j:j + RT_LIMIT]}} for j in range(0, max(len(text), 1), RT_LIMIT)]}})
            i += 1; continue
        m = re.match(r"^(#{1,6})\s+(.*)$", s)
        if m:
            flush()
            level = len(m.group(1))
            if level > 1:  # H1 = заголовок страницы, он уже в свойстве
                blocks.append(block("heading_2" if level == 2 else "heading_3", m.group(2), resolve))
            i += 1; continue
        if re.match(r"^(-{3,}|\*{3,})$", s):
            flush(); blocks.append({"object": "block", "type": "divider", "divider": {}}); i += 1; continue
        if s.startswith("|"):
            flush()
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [c.strip() for c in re.split(r"(?<!\\)\|", lines[i].strip().strip("|"))]
                if not all(re.fullmatch(r":?-{2,}:?", c) for c in cells if c):
                    rows.append(cells)
                i += 1
            width = max(len(r) for r in rows)
            blocks.append({"object": "block", "type": "table", "table": {
                "table_width": width, "has_column_header": True, "has_row_header": False,
                "children": [{"object": "block", "type": "table_row", "table_row": {"cells": [
                    rich(r[k] if k < len(r) else "", resolve) for k in range(width)]}} for r in rows[:100]]}})
            continue
        if s.startswith(">"):
            flush()
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip()[1:].strip()); i += 1
            text = " ".join(q for q in quote if q)
            if text.startswith("**В двух словах"):
                blocks.append(block("callout", text, resolve, icon={"type": "emoji", "emoji": "💡"}, color="blue_background"))
            else:
                blocks.append(block("quote", text, resolve))
            continue
        m = re.match(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$", line)
        if m:
            flush()
            top = len(m.group(1))
            while i < len(lines):
                m = re.match(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$", lines[i])
                if m:
                    kind = "numbered_list_item" if m.group(2)[0].isdigit() else "bulleted_list_item"
                    item = block(kind, m.group(3), resolve)
                    item["_text"] = m.group(3)
                    if len(m.group(1)) > top and blocks and blocks[-1]["type"].endswith("list_item"):
                        blocks[-1][blocks[-1]["type"]].setdefault("children", []).append(item)
                    else:
                        blocks.append(item)
                    i += 1
                elif lines[i].strip() and lines[i].startswith(" ") and blocks:  # продолжение пункта
                    last = blocks[-1][blocks[-1]["type"]]
                    target = last["children"][-1] if last.get("children") else blocks[-1]
                    target["_text"] += " " + lines[i].strip()
                    target[target["type"]]["rich_text"] = rich(target["_text"], resolve)
                    i += 1
                else:
                    break
            continue
        para.append(s); i += 1
    flush()
    for b in blocks:  # служебное поле не уходит в API
        b.pop("_text", None)
        for c in b.get(b["type"], {}).get("children", []) or []:
            c.pop("_text", None)
    return blocks


# ---------- источники ----------

def read_md(path):
    text = open(path, encoding="utf-8").read()
    fm = parse(text) or {}
    m = re.match(r"---\r?\n.*?\r?\n---\r?\n", text, re.S)
    return fm, text[m.end():] if m else text, hashlib.sha1(text.encode()).hexdigest()[:16]


def first_heading(body):
    m = re.search(r"^#\s+(.+)$", body, re.M)
    return m.group(1).strip() if m else ""


def load(root):
    kb = os.path.join(root, "kb")
    features, tickets, flags = {}, {}, {}
    pdir = os.path.join(kb, "products", PRODUCT)
    for dirpath, _, files in os.walk(pdir):
        for f in sorted(files):
            if f.endswith(".md"):
                path = os.path.join(dirpath, f)
                fm, body, h = read_md(path)
                features[fm["id"]] = dict(fm=fm, body=body, hash=h, path=path)
    wanted = {t for x in features.values() for t in as_list(x["fm"].get("tickets"))}
    for f in sorted(os.listdir(os.path.join(kb, "tickets"))):
        if not f.endswith(".md") or f == "README.md":
            continue
        path = os.path.join(kb, "tickets", f)
        fm, body, h = read_md(path)
        if PRODUCT.upper() in as_list(fm.get("product")) or fm.get("id") in wanted:
            tickets[fm["id"]] = dict(fm=fm, body=body, hash=h, path=path)
    # флаги: разделы «### name» реестра; флаги из фич без раздела - строки «нет в реестре»
    reg_path = os.path.join(kb, "registry", "flags.md")
    _, reg_body, _ = read_md(reg_path)
    for m in re.finditer(r"^###\s+(\S+)\s*\n(.*?)(?=^#{2,3}\s|\Z)", reg_body, re.M | re.S):
        name, section = m.group(1), m.group(2).strip()
        st = re.search(r"\*\*Состояние:\*\*\s*(.+)", section)
        flags[name] = dict(body=section, hash=hashlib.sha1(section.encode()).hexdigest()[:16], path=reg_path,
                           state=st.group(1).strip() if st else ("❓ " + section.splitlines()[0][:150] if section.startswith("❓") else ""),
                           tickets=sorted(set(re.findall(r"\(\.\./tickets/([A-Z]+-[\w-]+)\.md", section))), registered=True)
    for x in features.values():
        for name in as_list(x["fm"].get("flags")):
            flags.setdefault(name, dict(body="Флага нет в kb/registry/flags.md - описать там.", hash="unregistered",
                                        path=reg_path, state="", tickets=[], registered=False))
    return features, tickets, flags


# ---------- синк ----------

def rt(text):
    text = (text or "").strip()
    return [{"type": "text", "text": {"content": text[i:i + RT_LIMIT]}} for i in range(0, len(text), RT_LIMIT)][:20]


def date(val):
    m = re.match(r"\d{4}-\d{2}-\d{2}", (val or "").strip())
    return {"date": {"start": m.group(0)}} if m else {"date": None}


def select(val):
    val = (val or "").strip().replace(",", " ")
    return {"select": {"name": val}} if val and val != "-" else {"select": None}


def ensure_databases(api, root_id):
    existing = {b["child_database"]["title"]: b["id"] for b in api.paginate("GET", f"/blocks/{root_id}/children")
                if b["type"] == "child_database"}

    def create(title, emoji, props):
        if title in existing:
            return existing[title]
        res = api.call("POST", "/databases", {"parent": {"type": "page_id", "page_id": root_id}, "is_inline": False,
                                              "icon": {"type": "emoji", "emoji": emoji},
                                              "title": [{"type": "text", "text": {"content": title}}], "properties": props})
        print(f"  создана база «{title}»")
        return res["id"]

    common = {"KB ID": {"rich_text": {}}, "Исходник": {"url": {}}, "sync_hash": {"rich_text": {}}}
    tickets_db = create(DB_TICKETS, "🎫", dict(common, **{
        "Название": {"title": {}}, "Продукт": {"multi_select": {}}, "Статус": {"select": {}},
        "QA": {"select": {}}, "Регресс": {"select": {}}, "Сверено": {"date": {}}, "Обновлено": {"date": {}},
        "Jira": {"url": {}}, "Артефакт": {"url": {}}}))
    flags_db = create(DB_FLAGS, "🚩", dict(common, **{
        "Название": {"title": {}}, "Состояние": {"rich_text": {}}, "В реестре": {"checkbox": {}},
        "Тикеты": {"relation": {"database_id": tickets_db, "type": "dual_property", "dual_property": {}}}}))
    features_db = create(DB_FEATURES, "🎮", dict(common, **{
        "Название": {"title": {}}, "Тип": {"select": {}}, "Статус доки": {"select": {}},
        "Сверено": {"date": {}}, "Обновлено": {"date": {}}, "Тесты": {"rich_text": {}}, "Автотест": {"checkbox": {}},
        "Тикеты": {"relation": {"database_id": tickets_db, "type": "dual_property", "dual_property": {}}},
        "Флаги": {"relation": {"database_id": flags_db, "type": "dual_property", "dual_property": {}}}}))
    # обратные стороны связей Notion называет «Related to ...» - даём человеческие имена
    names = {features_db: "Фичи", flags_db: "Флаги"}
    for db_id in (tickets_db, flags_db):
        props = api.call("GET", f"/databases/{db_id}")["properties"]
        renames = {}
        for name, p in props.items():
            if p["type"] == "relation" and name.startswith("Related to"):
                new = names.get(p["relation"]["database_id"].replace("-", ""), names.get(p["relation"]["database_id"]))
                if new and new not in props:
                    renames[name] = {"name": new}
        if renames:
            api.call("PATCH", f"/databases/{db_id}", {"properties": renames})
    return features_db, tickets_db, flags_db


def rows_by_id(api, db_id):
    out = {}
    for p in api.paginate("POST", f"/databases/{db_id}/query"):
        kid = "".join(t["plain_text"] for t in p["properties"]["KB ID"]["rich_text"])
        h = "".join(t["plain_text"] for t in p["properties"]["sync_hash"]["rich_text"])
        if kid:
            out[kid] = dict(id=p["id"], hash=h)
    return out


def replace_body(api, page_id, blocks):
    for b in api.paginate("GET", f"/blocks/{page_id}/children"):
        api.call("DELETE", f"/blocks/{b['id']}")
    for k in range(0, len(blocks), 90):
        api.call("PATCH", f"/blocks/{page_id}/children", {"children": blocks[k:k + 90]})


def main(argv):
    root = argv[1] if len(argv) > 1 and not argv[1].startswith("--") else "."
    dry, force = "--dry-run" in argv, "--force" in argv
    env = {}
    env_path = os.path.join(root, ".env")
    if os.path.exists(env_path):
        for line in open(env_path, encoding="utf-8"):
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip("\"'")
    token = os.environ.get("NOTION_TOKEN") or env.get("NOTION_TOKEN")
    root_id = os.environ.get("NOTION_KB_ROOT") or env.get("NOTION_KB_ROOT") or DEFAULT_ROOT

    features, tickets, flags = load(root)
    print(f"KB: фич {len(features)}, тикетов {len(tickets)}, флагов {len(flags)}")
    by_path = {os.path.normpath(x["path"]): ("f", k) for k, x in features.items()}
    by_path.update({os.path.normpath(x["path"]): ("t", k) for k, x in tickets.items()})
    pages = {"f": {}, "t": {}, "g": {}}
    flags_reg = os.path.normpath(os.path.join(root, "kb", "registry", "flags.md"))

    def resolver(src_path):
        def resolve(href):
            if re.match(r"^[a-z]+:", href):
                return href
            target, _, anchor = href.partition("#")
            if not target:
                return GITLAB_BLOB + os.path.relpath(src_path, root).replace(os.sep, "/") + "#" + anchor
            full = os.path.normpath(os.path.join(os.path.dirname(src_path), target))
            hit = by_path.get(full)
            if hit and hit[1] in pages[hit[0]]:
                return "https://www.notion.so/" + pages[hit[0]][hit[1]]["id"].replace("-", "")
            if full == flags_reg and anchor in pages["g"]:
                return "https://www.notion.so/" + pages["g"][anchor]["id"].replace("-", "")
            return GITLAB_BLOB + os.path.relpath(full, root).replace(os.sep, "/") + ("#" + anchor if anchor else "")
        return resolve

    if dry:
        for k, x in list(features.items()) + list(tickets.items()):
            n = len(md_to_blocks(x["body"], resolver(x["path"])))
            print(f"  {k}: блоков {n}")
        return 0
    if not token:
        print("NOTION_TOKEN не задан (.env или окружение)")
        return 1

    api = Notion(token)
    fdb, tdb, gdb = ensure_databases(api, root_id)
    pages["f"], pages["t"], pages["g"] = rows_by_id(api, fdb), rows_by_id(api, tdb), rows_by_id(api, gdb)

    # проход 1: недостающие строки, чтобы у всех появился page id для ссылок и связей
    for kind, db, items, title in (("f", fdb, features, lambda k, x: x["fm"].get("title") or k),
                                   ("t", tdb, tickets, lambda k, x: f"{k} - {x['fm'].get('title', '')}"),
                                   ("g", gdb, flags, lambda k, x: k)):
        for k, x in items.items():
            if k not in pages[kind]:
                res = api.call("POST", "/pages", {"parent": {"database_id": db}, "properties": {
                    "Название": {"title": rt(title(k, x))}, "KB ID": {"rich_text": rt(k)}}})
                pages[kind][k] = dict(id=res["id"], hash="")
                print(f"  + {k}")

    def rel(kind, ids):
        return {"relation": [{"id": pages[kind][i]["id"]} for i in ids if i in pages[kind]]}

    def src(path):
        return {"url": GITLAB_BLOB + os.path.relpath(path, root).replace(os.sep, "/")}

    # проход 2: свойства и тело
    changed = 0
    for k, x in tickets.items():
        fm = x["fm"]
        artifacts = re.findall(r"https://claude\.ai/(?:code/)?artifact/\S+", fm.get("sources", ""))
        props = {"Название": {"title": rt(f"{k} - {fm.get('title', '')}")}, "KB ID": {"rich_text": rt(k)},
                 "Продукт": {"multi_select": [{"name": p} for p in as_list(fm.get("product"))]},
                 "Статус": select(fm.get("status")), "QA": select(fm.get("qa_verdict")),
                 "Регресс": select(fm.get("regression")), "Сверено": date(fm.get("verified_on")),
                 "Обновлено": date(fm.get("updated")), "Jira": {"url": fm.get("jira") or None},
                 "Артефакт": {"url": artifacts[-1].rstrip(").,") if artifacts else None}, "Исходник": src(x["path"])}
        changed += sync_page(api, pages["t"][k], props, x, resolver(x["path"]), force)
    for k, x in flags.items():
        props = {"Название": {"title": rt(k)}, "KB ID": {"rich_text": rt(k)}, "Состояние": {"rich_text": rt(x["state"])},
                 "В реестре": {"checkbox": x["registered"]}, "Тикеты": rel("t", x["tickets"]), "Исходник": src(x["path"])}
        changed += sync_page(api, pages["g"][k], props, x, resolver(x["path"]), force)
    for k, x in features.items():
        fm = x["fm"]
        tests = as_list(fm.get("tests"))
        props = {"Название": {"title": rt(fm.get("title") or k)}, "KB ID": {"rich_text": rt(k)},
                 "Тип": select(fm.get("type")), "Статус доки": select(fm.get("status")),
                 "Сверено": date(fm.get("verified_on")), "Обновлено": date(fm.get("updated")),
                 "Тесты": {"rich_text": rt("\n".join(tests))}, "Автотест": {"checkbox": bool(tests)},
                 "Тикеты": rel("t", as_list(fm.get("tickets"))), "Флаги": rel("g", as_list(fm.get("flags"))),
                 "Исходник": src(x["path"])}
        changed += sync_page(api, pages["f"][k], props, x, resolver(x["path"]), force)
    print(f"Готово: тел страниц перезаписано {changed}. Корень: https://www.notion.so/{root_id.replace('-', '')}")
    return 0


def sync_page(api, row, props, item, resolve, force):
    body_changed = force or row["hash"] != item["hash"]
    if body_changed:
        props = dict(props, sync_hash={"rich_text": rt(item["hash"])})
    api.call("PATCH", f"/pages/{row['id']}", {"properties": props})
    if body_changed:
        replace_body(api, row["id"], md_to_blocks(item["body"], resolve))
        row["hash"] = item["hash"]
    return int(body_changed)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # -I игнорирует PYTHONIOENCODING, а консоль Windows - cp1251
    sys.exit(main(sys.argv))
