"""Build public/reference/v9/comparison.json from the official V9 tables.

python3 scripts/build-reference.py --table1-dir ../originDoc \
  --table2-dir ../docs/research/scopus-export-2026-10-29/reference --out public/reference/v9/comparison.json

Table 2 gives c-score percentiles over all authors (>= 5 papers) per field and subfield.
Table 1 (the published list) gives each listed author's rank within the primary subfield and the
subfield author count, from which the 2% inclusion line is derived. No author rows are written.
"""
import argparse, hashlib, json, math
from pathlib import Path
import openpyxl

SCOPES = {'career': 'career', 'single-year': 'singleyr'}
PCTS = ['25', '50', '75', '90', '95', '99']
TAIL = '2025_pubs_since_1788_wopp_extracted_202608.xlsx'


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


def lines(path):
    """Lowest listed c with subfield rank <= 2% of subfield authors, and the global rank-100k c."""
    two = {}, {}
    top = [math.inf, math.inf]
    for r in rows(path, 'Data'):
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
    return two, top


def build(table1_dir, table2_dir):
    out = {'version': 'v9', 'citationYear': 2025, 'snapshot': '2026-08-01',
           'license': 'CC BY-NC 3.0', 'dataset': 'https://doi.org/10.17632/btchxktzyw.9',
           'sources': [], 'scopes': {}}
    for scope, tag in SCOPES.items():
        t1 = Path(table1_dir) / f'Table_1_Authors_{tag}_{TAIL}'
        t2 = Path(table2_dir) / f'Table_2_field_subfield_thresholds_{tag}_{TAIL}'
        out['sources'] += [{'file': p.name, 'sha256': sha256(p)} for p in (t1, t2)]
        fields, subfields = thresholds(t2)
        (two_inc, two_exc), (top_inc, top_exc) = lines(t1)
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
    args = a.parse_args()
    data = build(args.table1_dir, args.table2_dir)
    Path(args.out).write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n')
    for scope, s in data['scopes'].items():
        print(scope, len(s['fields']), 'fields', len(s['subfields']), 'subfields', s['top100k'])
