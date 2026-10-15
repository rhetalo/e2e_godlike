"""Интерактивная майндкарта KB: kb/map.md (раздел «Карта ссылками») -> kb/map.html через markmap.

В Mermaid-картинке из map.md ссылки не кликаются; здесь каждый узел - живая ссылка, ветки сворачиваются,
карта масштабируется. Ничего не публикует, файл открывается локально в браузере.

Usage:
  python -I kb/_tools/build_map.py <repo_root> [--base-url URL] [--offline]

  --base-url URL  переписать относительные ссылки на URL (например просмотр файлов в GitLab:
                  https://git.godlike.ovh/e2e/godlike-tests/-/blob/main/kb/). По умолчанию ссылки
                  остаются относительными - работают, если открыть kb/map.html из папки репо.
  --offline       встроить скрипты markmap в HTML (файл больше, но работает без интернета).

Нужен Node (npx). Версия markmap-cli зафиксирована ниже.
"""
import os, re, subprocess, sys, tempfile

MARKMAP_CLI = "markmap-cli@0.18.12"
SECTION = "## Карта ссылками"
LINK = re.compile(r"\]\((?![a-z]+:|#)([^)\s]+)\)")


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    root = args[0]
    base_url = args[args.index("--base-url") + 1] if "--base-url" in args else None
    offline = "--offline" in args

    kb = os.path.join(root, "kb")
    src = open(os.path.join(kb, "map.md"), encoding="utf-8").read()
    if SECTION not in src:
        print(f"В kb/map.md нет раздела «{SECTION}»")
        return 1
    body = src.split(SECTION, 1)[1]
    body = body.split("\n## ", 1)[0]  # до следующего раздела второго уровня

    # Корень карты = H1; продукты (###) поднимаем на уровень H2, чтобы стали ветками от корня.
    body = re.sub(r"^### ", "## ", body, flags=re.M)
    if base_url:
        body = LINK.sub(lambda m: "](" + base_url.rstrip("/") + "/" + m.group(1) + ")", body)
    md = "---\nmarkmap:\n  initialExpandLevel: 2\n  maxWidth: 360\n---\n\n# godlike - карта KB\n" + body

    out = os.path.join(kb, "map.html")
    with tempfile.TemporaryDirectory() as tmp:
        tmp_md = os.path.join(tmp, "map-src.md")
        with open(tmp_md, "w", encoding="utf-8") as f:
            f.write(md)
        cmd = ["npx", "-y", MARKMAP_CLI, tmp_md, "-o", out, "--no-open"]
        if offline:
            cmd.append("--offline")
        res = subprocess.run(cmd, shell=(os.name == "nt"), capture_output=True, text=True, encoding="utf-8")
        if res.returncode != 0:
            print(res.stdout, res.stderr)
            return res.returncode
    html = open(out, encoding="utf-8").read().replace("<title>Markmap</title>", "<title>godlike - карта KB</title>", 1)
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"OK: {os.path.relpath(out, root)} ({os.path.getsize(out) // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
