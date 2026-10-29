"""Build public/reference/v9/comparison.json from the official V9 tables.

python3 scripts/build-reference.py --table1-dir ../originDoc \
  --table2-dir ../docs/research/scopus-export-2026-10-29/reference --out public/reference/v9/comparison.json

Table 2 gives c-score percentiles over all authors (>= 5 papers) per field and subfield.
Table 1 (the published list) gives each listed author's rank within the primary subfield and the
subfield author count, from which the 2% inclusion line is derived. With --peers-out, a rank-spaced
sample of listed authors per subfield is written for the radar comparison.
"""
import argparse, hashlib, json, math, re
from pathlib import Path
import openpyxl

SCOPES = {'career': 'career', 'single-year': 'singleyr'}
PCTS = ['25', '50', '75', '90', '95', '99']
TAIL = '2025_pubs_since_1788_wopp_extracted_202608.xlsx'
METRICS = ['nc{y}', 'h25', 'hm25', 'ncs', 'ncsf', 'ncsfl']
MODES = [('with-self', ''), ('without-self', ' (ns)')]
# ponytail: 100 rank-spaced authors per subfield and mode keeps the repo small; raise for finer drag steps.
PEER_SAMPLE = 100


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def rows(path, sheet):
    ws = openpyxl.load_workbook(path, read_only=True)[sheet]
    it = ws.iter_rows(values_only=True)
    head = next(it)
    for r in it:
        if r and r[0] is not None:
            yield dict(zip(head, r))


def thresholds(path):
    def entry(r):
        return {'authors': r['#Auth'], 'listed': r['#Auth in top-list'],
                'c': {p: r[f'c@{p}'] for p in PCTS}}
    fields = {r['Field']: {'domain': r['Domain'], **entry(r)} for r in rows(path, 'Field')}
    subfields = {r['Subfield']: {'field': r['Field'], **entry(r)} for r in rows(path, 'SubField')}
    return fields, subfields


def lines(path, year, maxlog):
    """Lowest listed c with subfield rank <= 2% of subfield authors, the global rank-100k c, and
    every listed author's subfield rank, c and six indicators per mode."""
    two = {}, {}
    top = [math.inf, math.inf]
    peers = {}
    for r in rows(path, 'Data'):
        sub = r['sm-subfield-1']
        for mode, tag in MODES:
            rank, c = r[f'rank sm-subfield-1{tag}'], r[f'c{tag}']
            values = [r[m.format(y=year) + tag] for m in METRICS]
            if sub and rank is not None and c is not None and None not in values:
                recomputed = sum(math.log1p(v) / d for v, d in zip(values, maxlog[mode]))
                assert abs(recomputed - c) < 1e-6, (r['authfull'], mode, recomputed, c)
                peers.setdefault(sub, {'count': r['sm-subfield-1 count']}).setdefault(mode, []).append(
                    [rank, round(c, 6), r['authfull'], r['inst_name'] or '',
                     *[round(v, 4) for v in values]])
        sub, count = r['sm-subfield-1'], r['sm-subfield-1 count']
        for i, (c, rank, global_rank) in enumerate([
            (r['c'], r['rank sm-subfield-1'], r['rank']),
            (r['c (ns)'], r['rank sm-subfield-1 (ns)'], r['rank (ns)']),
        ]):
            if c is None:
                continue
            if global_rank is not None and global_rank <= 100_000:
                top[i] = min(top[i], c)
            if sub and count and rank is not None and rank <= 0.02 * count:
                two[i][sub] = min(two[i].get(sub, math.inf), c)
    return two, top, peers


def sample(authors):
    authors.sort(key=lambda a: a[0])
    if len(authors) <= PEER_SAMPLE:
        return authors
    step = (len(authors) - 1) / (PEER_SAMPLE - 1)
    return [authors[round(i * step)] for i in range(PEER_SAMPLE)]


def build(table1_dir, table2_dir, maxlog_path, peers_out=None):
    raw = json.loads(Path(maxlog_path).read_text())['modes']
    out = {'version': 'v9', 'citationYear': 2025, 'snapshot': '2026-08-01',
           'license': 'CC BY-NC 3.0', 'dataset': 'https://doi.org/10.17632/btchxktzyw.9',
           'sources': [], 'scopes': {}}
    for scope, tag in SCOPES.items():
        t1 = Path(table1_dir) / f'Table_1_Authors_{tag}_{TAIL}'
        t2 = Path(table2_dir) / f'Table_2_field_subfield_thresholds_{tag}_{TAIL}'
        out['sources'] += [{'file': p.name, 'sha256': sha256(p)} for p in (t1, t2)]
        fields, subfields = thresholds(t2)
        maxlog = {mode: [raw[f"{tag}_{mode.replace('-', '_')}"]['denominators'][k]
                         for k in ['NC', 'H', 'Hm', 'NCS', 'NCSF', 'NCSFL']] for mode, _ in MODES}
        (two_inc, two_exc), (top_inc, top_exc), peers = lines(
            t1, '9625' if scope == 'career' else '2525', maxlog)
        if peers_out:
            folder = Path(peers_out) / scope
            folder.mkdir(parents=True, exist_ok=True)
            for name, modes in peers.items():
                body = {'count': modes['count'],
                        **{mode: sample(modes.get(mode, [])) for mode, _ in MODES}}
                (folder / f'{slug(name)}.json').write_text(
                    json.dumps(body, separators=(',', ':'), ensure_ascii=False))
        for name, s in subfields.items():
            s['top2'] = {'with-self': two_inc.get(name), 'without-self': two_exc.get(name)}
            line, c = s['top2']['with-self'], s['c']
            # The 2% line must lie between the 95th and 99th all-author percentiles.
            assert line is not None and c['95'] <= line <= c['99'], (scope, name, line, c)
        assert all(s['field'] in fields for s in subfields.values())
        out['scopes'][scope] = {
            'top100k': {'with-self': top_inc, 'without-self': top_exc},
            'fields': [{'name': k, **v} for k, v in sorted(fields.items())],
            'subfields': [{'name': k, **v} for k, v in sorted(subfields.items())],
        }
    return out


if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('--table1-dir', required=True)
    a.add_argument('--table2-dir', required=True)
    a.add_argument('--out', required=True)
    a.add_argument('--maxlog', default='public/reference/v9/maxlog.json')
    a.add_argument('--peers-out', help='folder for per-subfield author samples')
    args = a.parse_args()
    data = build(args.table1_dir, args.table2_dir, args.maxlog, args.peers_out)
    Path(args.out).write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n')
    for scope, s in data['scopes'].items():
        print(scope, len(s['fields']), 'fields', len(s['subfields']), 'subfields', s['top100k'])
