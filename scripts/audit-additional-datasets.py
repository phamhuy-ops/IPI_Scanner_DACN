"""Audit raw sources only; never normalize, split, score, or modify them.

Python 3.12 + pyarrow==26.0.0. Optional local install is detected below.
"""
import csv
import hashlib
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL_DEPS = ROOT / 'benchmark/results/audit-python-deps'
if LOCAL_DEPS.exists():
    sys.path.insert(0, str(LOCAL_DEPS))
import pyarrow
import pyarrow.parquet as pq

RAW = ROOT / 'benchmark/data/raw'
OUT = ROOT / 'benchmark/data/audits'


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def inventory(directory):
    return {p.relative_to(ROOT).as_posix(): sha(p) for p in sorted(directory.rglob('*')) if p.is_file()}


def duplicates(rows, text_key, id_key):
    groups = defaultdict(list)
    for row in rows:
        text = row.get(text_key)
        if isinstance(text, str) and text.strip():
            groups[text.strip()].append(row[id_key])
    repeated = [ids for ids in groups.values() if len(ids) > 1]
    return {'policy': 'Exact text after trimming leading/trailing whitespace only; not semantic similarity.',
            'unique_nonempty_texts': len(groups), 'duplicate_groups': len(repeated),
            'extra_duplicate_records': sum(len(ids) - 1 for ids in repeated),
            'duplicate_record_ids': repeated}


def fields(rows, required):
    return {'missing_fields': {key: sum(key not in r for r in rows) for key in required},
            'null_fields': {key: sum(key in r and r[key] is None for r in rows) for key in required}}


def audit_notinject():
    directory = RAW / 'notinject'
    subsets = {}
    all_rows = []
    aliases = []
    required = ['prompt', 'word_list', 'category']
    for name, alias in [('one', 'train'), ('two', 'validation'), ('three', 'test')]:
        file = directory / f'data/NotInject_{name}-00000-of-00001.parquet'
        table = pq.read_table(file)
        rows = table.to_pylist()
        invalid = [i + 1 for i, r in enumerate(rows) if
                   not isinstance(r.get('prompt'), str) or not isinstance(r.get('category'), str) or
                   not isinstance(r.get('word_list'), list) or
                   any(not isinstance(w, str) for w in r.get('word_list', []))]
        identified = [dict(r, audit_id=f'NotInject_{name}:{i+1}', subset=name) for i, r in enumerate(rows)]
        all_rows.extend(identified)
        subsets[name] = {'file': file.relative_to(ROOT).as_posix(), 'rows': len(rows),
                         'expected_rows_per_local_card': 113, 'matches_card_count': len(rows) == 113,
                         'schema': str(table.schema), **fields(rows, required),
                         'invalid_type_rows': invalid,
                         'empty_text_fields': {key: sum(isinstance(r.get(key), str) and not r[key].strip() for r in rows)
                                               for key in ['prompt', 'category']},
                         'empty_word_lists': sum(r.get('word_list') == [] for r in rows),
                         'empty_trigger_strings': sum(not w.strip() for r in rows for w in r.get('word_list', []) if isinstance(w, str)),
                         'trigger_count_distribution': dict(Counter(len(r['word_list']) for r in rows)),
                         'categories': dict(Counter(r['category'] for r in rows)),
                         'duplicates': duplicates(identified, 'prompt', 'audit_id')}
        other = directory / f'data/{alias}-00000-of-00001.parquet'
        aliases.append({'file': other.relative_to(ROOT).as_posix(), 'alias_of': file.relative_to(ROOT).as_posix(),
                        'byte_identical': sha(other) == sha(file)})
    return {'source': 'leolee99/NotInject', 'status': 'audited', 'license_declared_in_local_card': 'MIT',
            'reader': {'python': sys.version.split()[0], 'pyarrow': pyarrow.__version__},
            'label_policy': 'All canonical rows are benign per local README; source has no per-row label field. This is not manual semantic relabeling.',
            'canonical_rows': len(all_rows), 'labels_per_source_card': {'benign': len(all_rows)},
            'subsets': subsets, 'duplicate_file_aliases_excluded_from_total': aliases,
            'cross_subset_and_within_subset_duplicates': duplicates(all_rows, 'prompt', 'audit_id'),
            'limitations': ['Short benign prompts, not a representative clean-document corpus.',
                            'one/two/three denote trigger-word counts, not independent training/validation/test partitions.',
                            'No standalone license file found; license is declared by the local README.',
                            'Do not claim recall or attack detection effectiveness from this all-benign source.']}


SCOPE = {
    'INJ-001': ('ipi', 'Override is embedded inside the customer ticket being summarized.'),
    'INJ-002': ('ipi', 'Secret request is embedded in a pull request description.'),
    'INJ-003': ('ipi', 'Unauthorized email instruction is embedded in company-page content.'),
    'INJ-004': ('direct', 'Bare developer-mode instruction; no external-content boundary in this row.'),
    'INJ-005': ('mixed', 'Webpage comment contains an injection, followed by an additional direct request for internal information outside the page.'),
    'INJ-006': ('ipi', 'Response/image instruction is embedded in the document being summarized.'),
    'INJ-007': ('ipi', 'Instruction to abandon translation is embedded in the text to translate.'),
    'INJ-008': ('ipi', 'Transfer instruction is embedded in an expense-report line.'),
    'INJ-009': ('direct', 'Bare persistent-preference instruction; no untrusted external wrapper in this row.'),
    'INJ-010': ('ipi', 'Scoring instruction is embedded in the resume being evaluated.'),
}


def audit_realistic():
    directory = RAW / 'realistic-prompt-injections'
    rows, errors, invalid_records = [], [], []
    for i, line in enumerate((directory / 'probes.jsonl').read_text(encoding='utf-8-sig').splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
            if not isinstance(row, dict):
                invalid_records.append(i)
                continue
            rows.append(row)
        except json.JSONDecodeError:
            errors.append(i)
    required = ['id', 'label', 'category', 'severity', 'text', 'nli_injection',
                'nli_solicits_secrets', 'pattern_markers', 'caught_by_patterns', 'fail_hypothesis']
    invalid_types = []
    for i, r in enumerate(rows, 1):
        if (any(not isinstance(r.get(k), str) for k in ['id', 'label', 'category', 'severity', 'text', 'pattern_markers', 'fail_hypothesis'])
                or type(r.get('caught_by_patterns')) is not bool
                or any(type(r.get(k)) not in (int, float) for k in ['nli_injection', 'nli_solicits_secrets'])):
            invalid_types.append(i)
    with (directory / 'probes.csv').open(encoding='utf-8-sig', newline='') as stream:
        csv_rows = list(csv.DictReader(stream))
    csv_by_id = {r['id']: r for r in csv_rows}
    equality_errors = []
    for row in rows:
        csv_row = csv_by_id.get(row['id'])
        if csv_row is None:
            equality_errors.append(row['id'])
            continue
        for key, value in row.items():
            other = csv_row.get(key)
            equal = other == value
            if isinstance(value, bool):
                equal = str(other).lower() == str(value).lower()
            elif type(value) in (int, float):
                try:
                    equal = float(other) == value
                except (ValueError, TypeError):
                    equal = False
            if not equal:
                equality_errors.append(f'{row["id"]}:{key}')
    ids = Counter(r.get('id') for r in rows)
    review = [{'id': r['id'], 'source_category': r['category'], 'scope': SCOPE.get(r['id'], ('unreviewed', 'No review recorded'))[0],
               'reason': SCOPE.get(r['id'], ('unreviewed', 'No review recorded'))[1]}
              for r in rows if r['label'] == 'injection']
    return {'source': 'treycsa/realistic-prompt-injections', 'status': 'audited',
            'canonical_file': 'probes.jsonl', 'license_declared_in_local_card': 'MIT',
            'rows': len(rows), 'labels': dict(Counter(r.get('label') for r in rows)),
            'invalid_json_lines': errors, 'invalid_record_lines': invalid_records,
            **fields(rows, required), 'invalid_type_rows': invalid_types,
            'empty_text_rows': [i + 1 for i, r in enumerate(rows) if isinstance(r.get('text'), str) and not r['text'].strip()],
            'empty_id_rows': [i + 1 for i, r in enumerate(rows) if not r.get('id', '').strip()],
            'invalid_labels': [r.get('id') for r in rows if r.get('label') not in ('injection', 'benign')],
            'duplicate_ids': {k: v for k, v in ids.items() if v > 1},
            'duplicates': duplicates(rows, 'text', 'id'),
            'categories': dict(Counter(r.get('category') for r in rows)),
            'csv_comparison': {'rows': len(csv_rows), 'same_ids': set(csv_by_id) == set(ids),
                               'duplicate_ids': len(csv_by_id) != len(csv_rows),
                               'all_fields_equal_after_type_conversion': not equality_errors,
                               'mismatches': equality_errors},
            'scope_review': review, 'injection_scope_counts': dict(Counter(r['scope'] for r in review)),
            'limitations': ['Scope review is local interpretation of the supplied text, not an upstream label change.',
                            'Seven benign controls are retained separately from attack-scope counts.',
                            'Do not report direct or mixed probes as strict IPI results without separate disclosure.',
                            'Source-provided NLI scores and pattern results are metadata, not project measurements or scanner input.',
                            'This probe set has been inspected during development; do not describe it as untouched held-out evaluation.',
                            '17 samples cannot establish broad generalization or independence from other sources.',
                            'No standalone license file found; license is declared by the local README.']}


def main():
    before = {name: inventory(RAW / name) for name in ['notinject', 'realistic-prompt-injections']}
    reports = {'notinject': audit_notinject(), 'realistic-prompt-injections': audit_realistic()}
    for name, report in reports.items():
        if inventory(RAW / name) != before[name]:
            raise RuntimeError('Raw source changed during audit: ' + name)
        report['raw_file_sha256'] = before[name]
        report['raw_unchanged'] = True
    OUT.mkdir(parents=True, exist_ok=True)
    for name, report in reports.items():
        (OUT / f'{name}-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({name: {'report': f'benchmark/data/audits/{name}-audit.json',
                             'rows': report.get('canonical_rows', report.get('rows')),
                             'raw_unchanged': True} for name, report in reports.items()}, indent=2))


if __name__ == '__main__':
    main()
