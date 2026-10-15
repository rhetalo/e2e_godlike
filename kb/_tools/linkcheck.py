"""KB link checker: relative md links -> file exists + anchor exists (GitHub slug rules).
Usage: python -I kb_linkcheck.py <repo_root>
"""
import os, re, sys, collections

root = sys.argv[1]
kb = os.path.join(root, 'kb')
LINK = re.compile(r'\[([^\]]*)\]\(([^)\s]+)\)')
HEAD = re.compile(r'^(#{1,6})\s+(.*?)\s*$')

def slug(text):
    t = text.strip().lower()
    t = re.sub(r'[`*_~\[\]()]', '', t) if False else t
    t = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', t)  # link text only
    t = t.replace('`', '')
    t = re.sub(r'[^\w\- ]', '', t, flags=re.UNICODE)
    return t.replace(' ', '-')

anchors_cache = {}
def anchors(path):
    if path not in anchors_cache:
        a, seen, infence = set(), collections.Counter(), False
        for line in open(path, encoding='utf-8'):
            if line.startswith('```'):
                infence = not infence
                continue
            if infence:
                continue
            m = HEAD.match(line)
            if m:
                s = slug(m.group(2))
                n = seen[s]; seen[s] += 1
                a.add(s if n == 0 else f'{s}-{n}')
        anchors_cache[path] = a
    return anchors_cache[path]

bad = collections.defaultdict(list)
missing_files = collections.Counter()
for dp, _, fs in os.walk(kb):
    for f in fs:
        if not f.endswith('.md'):
            continue
        p = os.path.join(dp, f)
        infence = False
        for i, line in enumerate(open(p, encoding='utf-8'), 1):
            if line.startswith('```'):
                infence = not infence
                continue
            if infence:
                continue
            for _, target in LINK.findall(line):
                if re.match(r'^[a-z]+:', target) or target.startswith('#') and False:
                    continue
                file_part, _, anchor = target.partition('#')
                tp = os.path.normpath(os.path.join(dp, file_part)) if file_part else p
                if not os.path.exists(tp):
                    rel = os.path.relpath(tp, root)
                    missing_files[rel] += 1
                    continue
                if anchor and tp.endswith('.md') and anchor.lower() not in anchors(tp):
                    bad[os.path.relpath(p, root)].append(f'L{i}: #{anchor} -> {os.path.relpath(tp, root)}')

print('== missing target files (count of links) ==')
for k, v in sorted(missing_files.items()):
    print(f'{v:3}  {k}')
print('== broken anchors ==')
for k, v in sorted(bad.items()):
    for x in v:
        print(f'{k} {x}')
