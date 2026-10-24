import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('overlap', Path(__file__).with_name('audit-cross-source-overlap.py'))
overlap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(overlap)


def row(name, text):
    return {'id': name, 'text': text, 'label': 'benign'}


class OverlapTests(unittest.TestCase):
    def test_normalization_does_not_require_identical_bytes(self):
        result = overlap.compare([row('a', 'ＡＢＣ  report')], [row('b', 'abc\nreport')], 'left', 'right')
        kinds = result['matches'][0]['match_types']
        self.assertNotIn('exact_trimmed_text', kinds)
        self.assertIn('normalized_text_equal', kinds)

    def test_shared_passage_detected_at_shifted_positions(self):
        text = ' '.join(f'word{i}' for i in range(12))
        result = overlap.compare([row('a', text)], [row('b', 'prefix ' + text + ' suffix')], 'left', 'right')
        self.assertIn('shared_12_token_passage', result['matches'][0]['match_types'])
        self.assertNotIn('token_sequence_equal', result['matches'][0]['match_types'])

    def test_candidate_index_agrees_with_brute_force(self):
        texts = [' '.join(f'word{i}' for i in range(30)),
                 ' '.join(f'word{i}' for i in range(29)) + ' replacement',
                 'unrelated short sentence', 'Hi there!', 'hi there', '!!!', '???']
        left = [row(f'l{i}', text) for i, text in enumerate(texts)]
        right = [row(f'r{i}', text) for i, text in enumerate(reversed(texts))]
        actual = {(r['left_id'], r['right_id']): set(r['match_types'])
                  for r in overlap.compare(left, right, 'left', 'right')['matches']}
        expected = {}
        for a in left:
            for b in right:
                ta, tb = overlap.tokenize(a['text']), overlap.tokenize(b['text'])
                sa, sb = overlap.shingles(ta, 3), overlap.shingles(tb, 3)
                kinds = set()
                if a['text'].strip() == b['text'].strip(): kinds.add('exact_trimmed_text')
                if overlap.normalize(a['text']) == overlap.normalize(b['text']): kinds.add('normalized_text_equal')
                if ta and ta == tb: kinds.add('token_sequence_equal')
                if min(len(ta), len(tb)) >= 6 and len(sa & sb) / len(sa | sb) >= 0.8:
                    kinds.add('token_trigram_jaccard_at_least_0.8')
                if overlap.shingles(ta, 12) & overlap.shingles(tb, 12): kinds.add('shared_12_token_passage')
                if kinds: expected[(a['id'], b['id'])] = kinds
        self.assertEqual(actual, expected)


if __name__ == '__main__':
    unittest.main()
