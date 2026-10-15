"""Build kb/tickets/README.md from ticket front matter. Usage: python -I tickets_index.py <kb/tickets>"""
import os, re, sys
d = sys.argv[1]
rows = []
for f in sorted(os.listdir(d)):
    if not f.endswith('.md') or f == 'README.md':
        continue
    s = open(os.path.join(d, f), encoding='utf-8').read()
    fm = s.split('---')[1]
    get = lambda k: (re.search(rf'^{k}:\s*(.*)$', fm, re.M) or [None, ''])[1].split(' #')[0].strip().strip('"')
    rows.append((get('id'), get('title'), get('product').strip('[]'), get('status'), get('qa_verdict'), get('verified_on'), f))

def key(r):
    m = re.match(r'([A-Z]+)-(\d+)', r[0])
    return (0, m.group(1), int(m.group(2))) if m else (1, r[0], 0)
rows.sort(key=key)

out = ['---', 'id: KB-TICKETS', 'title: Тикеты и задачи', 'type: index', 'updated: 2026-10-15', '---', '',
       '# Тикеты и задачи', '',
       '> **В двух словах.** Карточка на каждую задачу, которую проходил QA: что поменяли, чем',
       '> закончилось, какие находки и с чем связано. Задачи без Jira-ключа называются `TASK-<slug>`.',
       '> Индекс собирается скриптом из front matter карточек, руками не правится.', '',
       '| ID | Суть | Продукт | Статус | QA | Сверено |', '|---|---|---|---|---|---|']
for i, t, p, st, v, ver, f in rows:
    out.append(f'| [{i}]({f}) | {t} | {p} | {st} | {v} | {ver} |')
out += ['', '**Статусы:**',
        '- `done` - QA закрыт;',
        '- `partial` - есть открытые хвосты;',
        '- `blocked` - блокер;',
        '- `in-qa` - в работе;',
        '- `n/a` - QA не участвовал.',
        '',
        'Только упоминаются, карточек нет: DEV-145 (ARK settings), DEV-275, DEV-315 (конструктор модпаков), DEV-321, DEV-441, DEV-523, PROD-126, GROWTH-95.', '']
open(os.path.join(d, 'README.md'), 'w', encoding='utf-8').write('\n'.join(out))
print(len(rows), 'rows')
