"""Đối chiếu từ vựng bộ nhãn với kho benchmark; không dự đoán hoặc đọc đáp án test."""
import csv
import hashlib
import importlib.util
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
NAME = sys.argv[1] if len(sys.argv) > 1 else 'verifier-corpus-overlap-v1'
if not NAME.startswith('verifier-corpus-overlap-') or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in NAME):
    raise ValueError('Tên phiên bản audit không hợp lệ.')
OUT = ROOT / 'benchmark/experiments' / NAME


def helper(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file))
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


lex = helper('lexical', 'audit-cross-source-overlap.py')


def is_development_fixture(file):
    # JSON raw cũng là nguồn dữ liệu, không tự biến thành fixture dev vì đuôi .json.
    return file in {
        'benchmark/experiments/citation-context-controls-v1/mau-da-khoa.json',
        'benchmark/experiments/agent-contrast-v1/ke-hoach.json',
        'benchmark/experiments/agent-contrast-v2/ke-hoach.json',
    } or file.startswith('benchmark/fixtures/') or (
        file.startswith('benchmark/data/') and '/raw/' not in file and file.endswith('.json'))


class Index:
    def __init__(self, records):
        self.exact, self.tri, self.passages = defaultdict(set), defaultdict(set), defaultdict(set)
        self.sizes = []
        for i, row in enumerate(records):
            tokens = lex.tokenize(row['text']); grams = lex.shingles(tokens, 3)
            self.exact[lex.normalize(row['text'])].add(i); self.sizes.append(len(grams))
            if len(tokens) >= 6:
                for gram in grams:
                    self.tri[gram].add(i)
            for gram in lex.shingles(tokens, 12):
                self.passages[gram].add(i)

    def match(self, text):
        normalized = lex.normalize(text)
        result = {i: {'normalized_exact'} for i in self.exact.get(normalized, ())}
        tokens = lex.tokenize(text); grams = lex.shingles(tokens, 3); overlap = Counter()
        if len(tokens) >= 6:
            for gram in grams:
                overlap.update(self.tri.get(gram, ()))
            for i, count in overlap.items():
                if count / (len(grams) + self.sizes[i] - count) >= 0.8:
                    result.setdefault(i, set()).add('trigram_jaccard_0.8')
        for gram in lex.shingles(tokens, 12):
            for i in self.passages.get(gram, ()):
                result.setdefault(i, set()).add('shared_12_token_passage')
        return result


def main():
    if OUT.exists():
        raise ValueError('Audit đã tồn tại; tạo phiên bản mới, không ghi đè baseline.')
    code_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    records = []
    for folder, role in [('ngu-canh-v1', 'legacy_reference_only'), ('verifier-batch-v1', 'reviewed_synthetic'), ('verifier-vietnamese-v1', 'reviewed_synthetic'), ('verifier-gap-v1', 'reviewed_stance_pending_span_review'), ('verifier-external-ai-v1', 'ai_reviewed_external_dev'), ('verifier-vietnamese-articles-v1', 'ai_reviewed_selected_windows_only'), ('verifier-addressee-context-v1', 'ai_reviewed_addressee_dev_not_training'), ('verifier-external-context-v1', 'ai_reviewed_external_context_dev'), ('verifier-recipient-contrast-v1', 'ai_reviewed_authored_candidate_not_model_evaluated'), ('verifier-llmail-v1', 'ai_reviewed_external_email_windows')]:
        path = ROOT / f'benchmark/data/annotations/{folder}/mau-cho-duyet.jsonl'
        for line in path.read_text(encoding='utf-8').splitlines():
            row = json.loads(line)
            records.append({'id': f'{folder}:{row["id"]}', 'text': row['text'], 'family': f'{folder}:{row["group_id"]}', 'role': role})
    external = ROOT / 'benchmark/data/annotations/verifier-external-normalized-v1/nhan-va-bang-chung.jsonl'
    for line in external.read_text(encoding='utf-8').splitlines():
        row = json.loads(line)
        records.append({'id': row['id'], 'text': row['text'], 'family': row['group_id'], 'role': 'reviewed_external'})
    index = Index(records); parents = list(range(len(records))); flags = defaultdict(set)

    def find(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]; i = parents[i]
        return i

    def union(a, b):
        a, b = find(a), find(b)
        if a != b:
            parents[max(a, b)] = min(a, b)

    family_anchor = {}
    for i, row in enumerate(records):
        if row['family'] in family_anchor:
            union(i, family_anchor[row['family']])
        else:
            family_anchor[row['family']] = i
    seen, hit_cache = set(), {}
    group_anchor = {}; matches = []; inventory = []; missing = []

    def consume(text, file, identifier, group=None, protected=False):
        if not isinstance(text, str) or not text.strip():
            return
        key = hashlib.sha256(lex.normalize(text).encode()).hexdigest()
        if key not in seen:
            found = index.match(text); seen.add(key)
            if found:
                hit_cache[key] = found
        found = hit_cache.get(key, {})
        hits = list(found)
        for i in hits[1:]:
            union(hits[0], i)
        if group and hits:
            if group in group_anchor:
                union(hits[0], group_anchor[group])
            else:
                group_anchor[group] = hits[0]
        for i, methods in found.items():
            if protected:
                flags[i].add('overlap_existing_bipia_test')
            if is_development_fixture(file):
                flags[i].add('overlap_dev_fixture_or_manifest')
            matches.append({'reference_id': records[i]['id'], 'file': file, 'record_id': identifier,
                            'document_group_id': group, 'methods': sorted(methods), 'protected_split': protected})

    def fingerprint(path, count, coverage):
        inventory.append({'file': path.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                          'rows_read': count, 'coverage': coverage})

    def scan_jsonl(path):
        count = 0; relative = path.relative_to(ROOT).as_posix()
        with path.open(encoding='utf-8-sig') as handle:
            for count, line in enumerate(handle, 1):
                if count == 1 and line.startswith('version https://git-lfs.github.com/spec/v1'):
                    raise ValueError(f'Chưa có nội dung LFS: {relative}')
                if not line.strip():
                    continue
                row = json.loads(line); text = row.get('text', row.get('context', row.get('prompt')))
                consume(text, relative, str(row.get('id', f'line-{count}')), row.get('document_group_id'), relative.endswith('ipi-test.jsonl'))
        fingerprint(path, count, 'text/context/prompt_only_no_gold')
        print(f'Đã đọc {relative}: {count}', flush=True)

    # Quét cả raw (kể cả các hàng bị loại), chuẩn hóa và split; cache tránh lặp tính từ vựng.
    jsonl = sorted((ROOT / 'benchmark/data').rglob('*.jsonl'), key=lambda p: ('/raw/' not in p.as_posix(), p.as_posix()))
    for path in jsonl:
        scan_jsonl(path)
        # Cửa sổ là cùng nguồn, không đếm là nguồn độc lập; đối chiếu riêng text của từng cửa sổ.
        if path.parent.name == 'verifier-gap-normalized-v1' and path.name == 'nhan-va-cua-so.jsonl':
            for line in path.read_text(encoding='utf-8').splitlines():
                row = json.loads(line)
                for window in row['windows']:
                    consume(window['text'], path.relative_to(ROOT).as_posix(), f'{row["id"]}:{window["id"]}',
                            f'verifier-gap-v1:{row["group_id"]}')
    # InjecAgent: chỉ so Tool Response, không dùng Thought/User Instruction/nhãn để chấm.
    for path in sorted((ROOT / 'benchmark/data/raw/injecagent/data').glob('test_cases_*.json')):
        source_rows = json.loads(path.read_text(encoding='utf-8'))
        for number, row in enumerate(source_rows, 1):
            attack_hash = hashlib.sha256(row['Attacker Instruction'].encode()).hexdigest()[:16]
            consume(row['Tool Response'], path.relative_to(ROOT).as_posix(), f'row-{number}',
                    f'injecagent-attack-{attack_hash}')
        fingerprint(path, len(source_rows), 'Tool Response only; Attacker Instruction hash for grouping only')
    # LLMail: text email nguyên bản; không dùng nhãn/judge answer hoặc system prompt.
    llmail_bank = ROOT / 'benchmark/data/raw/llmail-intake-v1/data/emails_for_fp_tests.json'
    if llmail_bank.exists():
        source_emails = json.loads(llmail_bank.read_text(encoding='utf-8'))
        for number, text in enumerate(source_emails, 1):
            consume(text, llmail_bank.relative_to(ROOT).as_posix(), f'email-{number}')
        fingerprint(llmail_bank, len(source_emails), 'original_email_text_only_no_labels')
    wiki = ROOT / 'benchmark/data/raw/vietnamese-wikipedia-v1'
    wiki_snapshot = json.loads((wiki / 'snapshot.json').read_text(encoding='utf-8'))
    for document in wiki_snapshot['documents']:
        path = wiki / document['text_file']
        consume(path.read_text(encoding='utf-8'), path.relative_to(ROOT).as_posix(), str(document['revision']),
                f'vi-wikipedia-page-{document["pageid"]}')
        fingerprint(path, 1, 'extracted_paragraph_text_only_not_full_HTML')
    fingerprint(wiki / 'snapshot.json', len(wiki_snapshot['documents']), 'revision/license/grouping_metadata_not_model_input')
    python_docs = ROOT / 'benchmark/data/raw/python-context-docs-v1'
    python_snapshot = json.loads((python_docs / 'snapshot.json').read_text(encoding='utf-8'))
    for relative in python_snapshot['assets']:
        path = python_docs / relative
        if path.suffix == '.rst':
            consume(path.read_text(encoding='utf-8'), path.relative_to(ROOT).as_posix(), relative,
                    f'cpython:{python_snapshot["revision"]}:{relative}')
        fingerprint(path, 1, 'raw_RST_source_text' if path.suffix == '.rst' else 'license_evidence_not_model_input')
    fingerprint(python_docs / 'snapshot.json', len(python_snapshot['assets']), 'pinned_source_license_metadata')
    deps = ROOT / 'benchmark/results/audit-python-deps'
    if deps.exists():
        sys.path.insert(0, str(deps))
    try:
        import pyarrow.parquet as pq
        for path in sorted((ROOT / 'benchmark/data/raw').rglob('*.parquet')):
            table = pq.read_table(path, columns=['prompt']); relative = path.relative_to(ROOT).as_posix()
            for i, text in enumerate(table.column('prompt').to_pylist(), 1):
                consume(text, relative, f'row-{i}')
            fingerprint(path, table.num_rows, 'prompt_only')
    except (ImportError, OSError) as error:
        missing.append({'scope': 'raw_parquet', 'error': str(error)})
    for path in sorted((ROOT / 'benchmark/data/raw').rglob('*.csv')):
        with path.open(encoding='utf-8-sig', newline='') as handle:
            source = list(csv.DictReader(handle))
        for i, row in enumerate(source, 1):
            consume(row.get('text'), path.relative_to(ROOT).as_posix(), f'row-{i}')
        fingerprint(path, len(source), 'text_only')
    case_manifests = list((ROOT / 'benchmark/data').glob('*.json')) + list((ROOT / 'benchmark/experiments').rglob('ke-hoach*.json'))
    case_manifests.append(ROOT / 'benchmark/experiments/citation-context-controls-v1/mau-da-khoa.json')
    for path in sorted(case_manifests):
        obj = json.loads(path.read_text(encoding='utf-8-sig'))
        cases = obj.get('cases', []) if isinstance(obj, dict) else []
        for i, row in enumerate(cases, 1):
            if isinstance(row, dict):
                consume(row.get('text'), path.relative_to(ROOT).as_posix(), str(row.get('id', i)))
                file = row.get('file') or row.get('file_path')
                if file and (ROOT / file).resolve().is_relative_to(ROOT) and (ROOT / file).is_file():
                    doc = ROOT / file
                    consume(doc.read_text(encoding='utf-8'), doc.relative_to(ROOT).as_posix(), 'manifest-document')
        if cases:
            fingerprint(path, len(cases), 'cases.text_and_referenced_files')
    for path in sorted((ROOT / 'benchmark/fixtures').rglob('*')):
        if path.is_file() and path.suffix in ['.txt', '.md', '.html'] and path.name != 'README.md':
            consume(path.read_text(encoding='utf-8-sig'), path.relative_to(ROOT).as_posix(), 'fixture')
            fingerprint(path, 1, 'raw_text_fixture')
    groups = defaultdict(list)
    for i, row in enumerate(records):
        groups[find(i)].append(i)
    components = []
    for members in groups.values():
        issues = sorted(set().union(*(flags[i] for i in members)))
        legacy = any(records[i]['role'] == 'legacy_reference_only' for i in members)
        components.append({'members': [records[i]['id'] for i in members], 'size': len(members), 'flags': issues,
                           'constraint': 'reference_only' if legacy else 'quarantine_existing_test_overlap' if 'overlap_existing_bipia_test' in issues
                           else 'development_exposed_keep_group_together', 'final_split': None})
    unchanged = all(hashlib.sha256((ROOT / item['file']).read_bytes()).hexdigest() == item['sha256'] for item in inventory)
    if hashlib.sha256(Path(__file__).read_bytes()).hexdigest() != code_hash:
        raise ValueError('Code audit đã đổi trong lượt chạy.')
    result = {'version': NAME, 'script_sha256': code_hash, 'reference_records': len(records), 'candidate_records': sum(r['role'] != 'legacy_reference_only' for r in records),
              'inventory': inventory, 'unique_normalized_texts_scanned': len(seen), 'matched_pairs_including_aliases': len(matches),
              'groups': sorted(components, key=lambda c: -c['size']), 'missing_coverage': missing, 'inputs_unchanged': unchanged,
              'training_ready': False, 'final_split_created': False, 'independent_holdout_collected': False,
              'limitations': ['Chỉ kiểm tra từ vựng, không embedding/ngữ nghĩa; shared 12-token có thể là boilerplate và cần rà soát.',
                             'Gom các mẫu tham chiếu qua cùng văn bản/cùng document_group_id khi có match; không tạo split mới.',
                             'Đọc text test chỉ để đối chiếu cấu trúc, không dùng nhãn/gold để chấm hoặc chỉnh detector.',
                             'Không quét câu trả lời model/metadata, lịch sử benchmark/results, code/prompt hoặc file riêng ngoài workspace.',
                             'Phạm vi toàn kho ở đây là các nguồn text benchmark/data + fixture đã liệt kê; xem missing_coverage, không tuyên bố hết rò rỉ.']}
    OUT.mkdir(parents=True)
    (OUT / 'ket-qua.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (OUT / 'matches.jsonl').write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in matches), encoding='utf-8')
    print(json.dumps({'output': OUT.relative_to(ROOT).as_posix(), 'files': len(inventory), 'unique_texts': len(seen),
                      'reference_groups': len(components), 'missing': missing, 'inputs_unchanged': unchanged}, ensure_ascii=False), flush=True)
    if missing or not unchanged:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
