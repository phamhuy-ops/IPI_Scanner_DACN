"""Normalize audited sources; preserve raw data, source labels and probe scope.

No train/test split or detector execution. Python 3.12 + pyarrow==26.0.0.
"""
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL_DEPS = ROOT / 'benchmark/results/audit-python-deps'
if LOCAL_DEPS.exists():
    sys.path.insert(0, str(LOCAL_DEPS))
import pyarrow
import pyarrow.parquet as pq

BASE = ROOT / 'benchmark/data'


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def load_audit(name):
    file = BASE / f'audits/{name}-audit.json'
    audit = json.loads(file.read_text(encoding='utf-8'))
    for relative, expected in audit['raw_file_sha256'].items():
        if sha_bytes((ROOT / relative).read_bytes()) != expected:
            raise ValueError(f'Raw source changed; audit it again first: {relative}')
    return audit, {'file': file.relative_to(ROOT).as_posix(), 'sha256': sha_bytes(file.read_bytes())}


def base_record(source, local_id, text, label, category, scope, file, row, file_hash):
    return {'schema_version': 1, 'id': f'{source}:{local_id}', 'text': text, 'label': label,
            'source': source, 'category': category, 'attack_scope': scope,
            'source_file': file.relative_to(ROOT).as_posix(), 'source_row': row,
            'source_file_sha256': file_hash, 'context_sha256': sha_bytes(text.strip().encode('utf-8')),
            'evaluation_role': 'development_probe', 'metadata': {}}


def notinject(audit):
    result = []
    for subset in ['one', 'two', 'three']:
        file = BASE / f'raw/notinject/data/NotInject_{subset}-00000-of-00001.parquet'
        file_hash = sha_bytes(file.read_bytes())
        for index, original in enumerate(pq.read_table(file).to_pylist(), 1):
            if not isinstance(original['prompt'], str) or not original['prompt'].strip():
                raise ValueError(f'Invalid prompt: {subset}:{index}')
            row = base_record('leolee99/NotInject', f'{subset}:{index}', original['prompt'],
                              'benign', original['category'], 'benign_control', file, index, file_hash)
            row['metadata'] = {'source_subset': f'NotInject_{subset}', 'original_label': None,
                               'label_basis': 'All samples benign per source README; no per-row label in source.',
                               'source_fields': {k: v for k, v in original.items() if k != 'prompt'}}
            result.append(row)
    if len(result) != audit['canonical_rows']:
        raise ValueError('NotInject count differs from audit')
    return result


def realistic(audit):
    result = []
    reviews = {r['id']: r for r in audit['scope_review']}
    file = BASE / 'raw/realistic-prompt-injections/probes.jsonl'
    file_hash = sha_bytes(file.read_bytes())
    for index, line in enumerate(file.read_text(encoding='utf-8-sig').splitlines(), 1):
        if not line.strip():
            continue
        original = json.loads(line)
        if original['label'] not in ('injection', 'benign'):
            raise ValueError('Unknown realistic label')
        label = 'malicious' if original['label'] == 'injection' else 'benign'
        review = reviews[original['id']] if label == 'malicious' else None
        row = base_record('treycsa/realistic-prompt-injections', original['id'], original['text'],
                          label, original['category'], review['scope'] if review else 'benign_control', file, index, file_hash)
        row['metadata'] = {'original_id': original['id'], 'original_label': original['label'],
                           'label_basis': 'Source per-row label; injection maps to malicious.',
                           'scope_basis': review['reason'] if review else 'Source-labeled benign control.',
                           'scope_origin': 'local structural review' if review else 'source label',
                           'source_fields': {k: v for k, v in original.items() if k != 'text'}}
        result.append(row)
    if len(result) != audit['rows']:
        raise ValueError('Realistic count differs from audit')
    return result


def encode(rows):
    return (''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in rows)).encode('utf-8')


def main():
    prepared = []
    for name, builder in [('notinject', notinject), ('realistic-prompt-injections', realistic)]:
        audit, audit_ref = load_audit(name)
        rows = builder(audit)
        if len({r['id'] for r in rows}) != len(rows):
            raise ValueError('Duplicate normalized IDs')
        for row in rows:
            if row['label'] not in ('benign', 'malicious') or not row['text'].strip():
                raise ValueError('Invalid normalized row')
        body = encode(rows)
        if json.loads(body.splitlines()[0]) != rows[0]:
            raise ValueError('JSONL serialization failed')
        # Both sources are validated before any outputs are written.
        prepared.append((name, audit, audit_ref, rows, body))
    print_results = []
    for name, audit, audit_ref, rows, body in prepared:
        load_audit(name)  # Verify raw inputs are still unchanged.
        output = BASE / f'processed/{name}'
        output.mkdir(parents=True, exist_ok=True)
        file = output / f'{name}.jsonl'
        file.write_bytes(body)
        decoded = [json.loads(line) for line in file.read_text(encoding='utf-8').splitlines()]
        if decoded != rows:
            raise ValueError('Written JSONL differs from in-memory records')
        report = {'schema_version': 1, 'source': rows[0]['source'], 'input_audit': audit_ref,
                  'raw_file_sha256': audit['raw_file_sha256'],
                  'output': file.relative_to(ROOT).as_posix(), 'output_sha256': sha_bytes(body),
                  'rows': len(rows), 'labels': dict(Counter(r['label'] for r in rows)),
                  'attack_scopes': dict(Counter(r['attack_scope'] for r in rows)),
                  'reader': {'python': sys.version.split()[0], 'pyarrow': pyarrow.__version__},
                  'policy': ['Source text preserved exactly; no trimming or Unicode normalization of output text.',
                             'IDs are source-prefixed and traceable to original file/row; stable for this raw version.',
                             'Keep all canonical records; exclude duplicate file aliases and CSV representation.',
                             'Source fields including source scores are metadata, never model/scanner input.',
                             'All records are development probes; no untouched holdout claim.',
                             'Strict IPI attack metrics should select attack_scope=ipi; report direct/mixed separately.',
                             'For strict IPI binary probes include the seven realistic benign controls too.',
                             'NotInject is all-benign; its missing per-row source label is explicitly documented.'],
                  'validation': {'unique_ids': True, 'jsonl_roundtrip_matches': True,
                                 'all_audited_raw_hashes_match': True,
                                 'no_split_or_benchmark_performed': True}}
        (output / 'normalization-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print_results.append({'output': report['output'], 'rows': report['rows'],
                              'labels': report['labels'], 'attack_scopes': report['attack_scopes']})
    print(json.dumps(print_results, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
