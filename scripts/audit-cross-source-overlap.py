"""Structural cross-source audit. No predictions, test split reads or edits.

Uses standard-library lexical checks, not semantic embeddings. Source texts
remain unchanged; matches are evidence for review, not automatic deletions.
"""
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'benchmark/data'


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def load(file):
    records = [json.loads(line) for line in file.read_text(encoding='utf-8-sig').splitlines() if line.strip()]
    if len({r['id'] for r in records}) != len(records):
        raise ValueError('Duplicate IDs: ' + str(file))
    for r in records:
        if not isinstance(r.get('text'), str) or not r['text'].strip():
            raise ValueError('Invalid text: ' + r['id'])
    return records


def normalize(text):
    return ' '.join(unicodedata.normalize('NFKC', text).casefold().split())


def tokenize(text):
    return re.findall(r'[^\W_]+', normalize(text), flags=re.UNICODE)


def shingles(tokens, n):
    return {tuple(tokens[i:i+n]) for i in range(len(tokens)-n+1)}


def compare(left_rows, right_rows, left_name, right_name):
    """Index the small source; all eligible right-source windows are checked."""
    exact, normalized, tokenized = defaultdict(set), defaultdict(set), defaultdict(set)
    tri_index, passage_index = defaultdict(set), defaultdict(set)
    left_tokens, left_tri = [], []
    for i, row in enumerate(left_rows):
        tokens = tokenize(row['text'])
        tri = shingles(tokens, 3)
        left_tokens.append(tokens); left_tri.append(tri)
        exact[row['text'].strip()].add(i)
        normalized[normalize(row['text'])].add(i)
        if tokens:
            tokenized[tuple(tokens)].add(i)
        if len(tokens) >= 6:
            for key in tri:
                tri_index[key].add(i)
        for key in shingles(tokens, 12):
            passage_index[key].add(i)
    matches = []
    kind_counts = Counter()
    for right in right_rows:
        text = right['text']
        tokens = tokenize(text)
        exact_ids = exact.get(text.strip(), set())
        norm_ids = normalized.get(normalize(text), set())
        token_ids = tokenized.get(tuple(tokens), set()) if tokens else set()
        overlap = Counter()
        tri = shingles(tokens, 3)
        if len(tokens) >= 6:
            for key in tri:
                for i in tri_index.get(key, ()):
                    overlap[i] += 1
        near = {i: count / (len(left_tri[i]) + len(tri) - count)
                for i, count in overlap.items()
                if count / (len(left_tri[i]) + len(tri) - count) >= 0.8}
        passages = {}
        if passage_index:
            for start in range(len(tokens) - 12 + 1):
                key = tuple(tokens[start:start+12])
                for i in passage_index.get(key, ()):
                    if i not in passages:
                        passages[i] = ' '.join(key)
        for i in sorted(exact_ids | norm_ids | token_ids | set(near) | set(passages)):
            kinds = []
            if i in exact_ids: kinds.append('exact_trimmed_text')
            if i in norm_ids: kinds.append('normalized_text_equal')
            if i in token_ids: kinds.append('token_sequence_equal')
            if i in near: kinds.append('token_trigram_jaccard_at_least_0.8')
            if i in passages: kinds.append('shared_12_token_passage')
            kind_counts.update(kinds)
            matches.append({'left_id': left_rows[i]['id'], 'right_id': right['id'],
                            'left_label': left_rows[i]['label'], 'right_label': right['label'],
                            'label_disagreement': left_rows[i]['label'] != right['label'],
                            'match_types': kinds, 'trigram_jaccard': near.get(i),
                            'shared_normalized_passage': passages.get(i)})
    return {'left': left_name, 'right': right_name, 'left_rows': len(left_rows), 'right_rows': len(right_rows),
            'matched_pairs': len(matches), 'match_counts_nonexclusive': dict(kind_counts),
            'unique_left_records_matched': len({r['left_id'] for r in matches}),
            'unique_right_records_matched': len({r['right_id'] for r in matches}),
            'matches': matches}


def main():
    files = {'malmasabi': BASE / 'processed/ipi-clean.jsonl',
             'notinject': BASE / 'processed/notinject/notinject.jsonl',
             'realistic': BASE / 'processed/realistic-prompt-injections/realistic-prompt-injections.jsonl'}
    hashes = {name: sha(file) for name, file in files.items()}
    # The first source's older validation records its raw hash, not output hash;
    # its grouped split report records the exact clean-file hash.
    split_ref = json.loads((BASE / 'splits/ipi-split-report.json').read_text())
    if hashes['malmasabi'] != split_ref['input_sha256']:
        raise ValueError('MAlmasabi clean file differs from the split baseline')
    for name in ['notinject', 'realistic']:
        ref = json.loads((files[name].parent / 'normalization-report.json').read_text())
        if hashes[name] != ref['output_sha256']:
            raise ValueError('Normalized input hash differs: ' + name)
    records = {name: load(file) for name, file in files.items()}
    pairs = []
    for left, right in [('notinject', 'malmasabi'), ('realistic', 'malmasabi'), ('notinject', 'realistic')]:
        pair = compare(records[left], records[right], left, right)
        pairs.append(pair)
        print(json.dumps({k: v for k, v in pair.items() if k != 'matches'}), flush=True)
    if hashes != {name: sha(file) for name, file in files.items()}:
        raise ValueError('Input changed during audit')
    report = {'scope': 'Structural checks across three normalized sources; no split files read for sample content, no scanner/model calls.',
              'input_files': {name: {'file': file.relative_to(ROOT).as_posix(), 'sha256': hashes[name],
                                    'rows': len(records[name])} for name, file in files.items()},
              'methods': {'exact': 'Text after trimming only.',
                          'normalized': 'Unicode NFKC + casefold + collapsed whitespace.',
                          'token_sequence': 'Ordered Unicode alphanumeric tokens; punctuation/underscores ignored.',
                          'near_duplicate': 'Set Jaccard of all token trigrams >= 0.8, both texts at least 6 tokens.',
                          'shared_passage': 'At least 12 consecutive normalized tokens shared, checking all start positions.'},
              'limitations': ['No embedding-based or manual semantic equivalence assessment.',
                              'Common phrasing and attack instructions can match without common document provenance.',
                              'No matches does not establish independence, safety or real-world generalization.',
                              'Source labels retained; disagreement in a partial match does not prove a labeling error.',
                              'Checks cover canonical normalized data only; quarantined/raw-only records are outside scope.',
                              'New sources remain development probes, not untouched holdouts.'],
              'pairs': pairs, 'inputs_unchanged': True,
              'action': 'Record matches for review; do not delete or relabel records automatically.'}
    output = BASE / 'audits/cross-source-overlap.json'
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Saved ' + output.relative_to(ROOT).as_posix())


if __name__ == '__main__':
    main()
