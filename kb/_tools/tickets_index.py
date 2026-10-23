"""Build kb/tickets/README.md from ticket front matter. Usage: python -I tickets_index.py <kb/tickets>"""
import datetime, os, re, sys
d = sys.argv[1]
rows = []
for f in sorted(os.listdir(d)):
    if not f.endswith('.md') or f == 'README.md':
        continue
    s = open(os.path.join(d, f), encoding='utf-8').read()
    fm = s.split('---')[1]
    get = lambda k: (re.search(rf'^{k}:\s*(.*)$', fm, re.M) or [None, ''])[1].split(' #')[0].strip().strip('"')
    rows.append((get('id'), get('title'), get('product').strip('[]'), get('status'), get('qa_verdict'), get('verified_on'), get('regression') or '-', f))

def key(r):
    m = re.match(r'([A-Z]+)-(\d+)', r[0])
    return (0, m.group(1), int(m.group(2))) if m else (1, r[0], 0)
rows.sort(key=key)

out = ['---', 'id: KB-TICKETS', 'title: Тикеты и задачи', 'type: index', f'updated: {datetime.date.today().isoformat()}', '---', '',
       '# Тикеты и задачи', '',
       '> **В двух словах.** Карточка на каждую задачу, которую проходил QA: что поменяли, чем',
       '> закончилось, какие находки и с чем связано. Задачи без Jira-ключа называются `TASK-<slug>`.',
       '> Индекс собирается скриптом из front matter карточек, руками не правится.', '',
       '| ID | Суть | Продукт | Статус | QA | Регресс | Сверено |', '|---|---|---|---|---|---|---|']
for i, t, p, st, v, ver, rg, f in rows:
    out.append(f'| [{i}]({f}) | {t} | {p} | {st} | {v} | {rg} | {ver} |')
out += ['', '**Статусы:**',
        '- `done` - QA закрыт;',
        '- `partial` - есть открытые хвосты;',
        '- `blocked` - блокер;',
        '- `in-qa` - в работе;',
        '- `n/a` - QA не участвовал.',
        '',
        '**Регресс** (решение при закрытии задачи, skill `qa-close`, D-025):',
        '- `candidate` - покрыть автотестом, спека ещё нет;',
        '- `covered` - автотест есть (в разделе «Регресс» карточки);',
        '- `blocked` - покрыть позже: фича ещё не на проде, временный флаг или нужен стенд;',
        '- `no` - в e2e не идёт, причина в карточке;',
        '- `-` - карточка старше правила, решения нет.',
        '',
        '## Бэклог автотестов', '',
        '> Собирается из `regression:` карточек. Порядок и детали - в разделе «Регресс» каждой карточки.', '',
        *[f'- **{rg}**: [{i}]({f}) - {t}' for rg_want in ('candidate', 'blocked') for i, t, p, st, v, ver, rg, f in rows if rg == rg_want],
        '',
        'Только упоминаются, карточек нет: DEV-145 (ARK settings), DEV-275, DEV-315 (конструктор модпаков), DEV-321, DEV-441, DEV-523, PROD-126, GROWTH-95.', '']
open(os.path.join(d, 'README.md'), 'w', encoding='utf-8').write('\n'.join(out))
print(len(rows), 'rows')
