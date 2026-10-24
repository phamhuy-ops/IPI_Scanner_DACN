# IPI dataset preparation

## Bộ tập gán nhãn ngữ cảnh

Đã tạo 20 đề xuất nhãn chỉ dẫn/ngữ cảnh tại
[annotations/ngu-canh-v1](annotations/ngu-canh-v1/README.md). Đã hoàn tất lượt
rà soát cùng người dùng: 19 chấp nhận, 1 sửa; chưa dùng fine-tuning hoặc làm
holdout. Đọc
[hướng dẫn tiếng Việt](../../docs/guides/huong-dan-gan-nhan-ngu-canh.md), kiểm
tra bằng `npm run data:annotations:check`. Dữ liệu raw và các split cũ được
giữ nguyên.

The original download stays in `raw/malmasabi-bipia-gpt/dataset_for_huggingface.jsonl`.
Historical reports may reference its previous location directly under `raw/`;
the moved file has the same SHA-256, so those reports remain valid.

Additional raw sources:

- `raw/notinject/`: README declares three subsets of 113 records each.
  `NotInject_one`, `NotInject_two`, `NotInject_three` Parquet files are present.
  The extra `train`, `validation`, `test` Parquet files have identical byte hashes
  to one, two, three respectively: do not count them as additional independent
  splits. All canonical rows have now been read and audited using pyarrow 26.0.0:
  113 per subset, 339 total, no missing/null fields, empty prompts or exact
  trimmed-prompt duplicates. All are benign per the source card, not per-row labels.
- `raw/realistic-prompt-injections/`: both `probes.csv` and `probes.jsonl`
  contain the same 17 IDs, texts and labels (10 injection, 7 benign); use one
  representation, not both as extra samples. JSONL has no empty text or duplicate
  IDs. README declares MIT; NotInject README also declares MIT. No standalone
  license file was found in these local downloads.

## Additional-source quality audit

`scripts/audit-additional-datasets.py` reads the two new sources without
normalizing, splitting, scoring or modifying them. Reports are
`audits/notinject-audit.json` and `audits/realistic-prompt-injections-audit.json`.
Raw file hashes are checked before and after the audit and recorded per report.

Run with Python 3.12 and pyarrow 26.0.0. The script also discovers a local
dependency installation in `benchmark/results/audit-python-deps` (gitignored).
To recreate that installation without changing project application dependencies:

```powershell
python -m pip install --target benchmark/results/audit-python-deps --only-binary=:all: pyarrow==26.0.0
python scripts/audit-additional-datasets.py
```

Use the same Python interpreter for installation and execution.

Realistic's CSV and JSONL match in all fields after type conversion. Its 10
source-labeled injections were reviewed locally for scope: seven IPI, two direct
(`INJ-004`, `INJ-009`), and one mixed (`INJ-005`, embedded webpage injection plus
an external direct request). The seven benign controls remain separate. This
scope review does not overwrite source labels. These are inspected development
probes, not an untouched independent holdout. See `audits/README.md` for the
quality-check conclusions and the next section for normalization outputs.

## Additional-source normalization

The two sources have now been normalized independently; the audit section above
describes the earlier quality-check stage. No new split or benchmark has run.

```powershell
python scripts/prepare-additional-datasets.py
```

Use Python 3.12 with pyarrow 26.0.0 (the same local dependency discovery as the
audit script). Preparation checks raw hashes against audit reports first and
refuses a changed source until it has been audited again.

Outputs:

- `processed/notinject/notinject.jsonl`: 339 benign controls, canonical subsets
  one/two/three only. The aliases named train/validation/test are not new samples.
- `processed/realistic-prompt-injections/realistic-prompt-injections.jsonl`:
  all 17 probes, including seven IPI, two direct, one mixed and seven benign.
- Each source directory contains `normalization-report.json` with provenance,
  counts, output hash and policy, and `normalization-validation.json` with
  independent full source-to-output validation results and the checked hash.

Common fields are `schema_version`, `id`, `text`, `label`, `source`, `category`,
`attack_scope`, `source_file`, `source_row`, `source_file_sha256`,
`context_sha256`, `evaluation_role`, and `metadata`. These extend the existing
`id/text/label/source` benchmark contract, without changing MAlmasabi outputs.
Source text is copied exactly. Trimmed hashes support exact duplicate checks;
they are not verified original-document IDs. No grouping or split is inferred.

`metadata.source_fields` preserves original non-text fields, including trigger
words, severity, source IDs, source labels, NLI scores and original pattern
outputs where available. NotInject's `original_label` is null: benign is based
on its source card. Realistic maps injection to malicious and retains its source
label; direct/mixed probes remain malicious, not relabeled benign.

Only `text` is scanner input. All other fields are scoring/provenance metadata.
In particular, do not pass source-provided NLI scores, `caught_by_patterns`,
`fail_hypothesis`, trigger words or labels to the detector. User intent is not
invented for these sources, and realistic's task wrapper remains in its text.

For strict IPI binary evaluation, select realistic `attack_scope=ipi` plus its
seven `benign_control` records (14 probes); report the three direct/mixed probes
separately. The existing generic benchmark command does **not** filter scope:
running it directly on all 17 rows would measure the mixed prompt-injection
probe set. Future benchmark integration must disclose or apply the scope filter.
Both sources are development probes, not an untouched held-out test or proof
of independence from BIPIA. Lexical cross-source checks are complete as described
below; semantic overlap remains unverified.

## Cross-source overlap audit

Run `python scripts/audit-cross-source-overlap.py` (standard library only).
Results are saved in `audits/cross-source-overlap.json`; check the comparison
implementation with `python scripts/test_cross_source_overlap.py`.

Compared all three source pairs: NotInject (339) vs MAlmasabi clean (65,948),
realistic (17) vs MAlmasabi clean, and NotInject vs realistic. No matches were
found under any of the following explicit checks:

- Exact trimmed text; NFKC/casefold/whitespace-normalized equality.
- Full Unicode alphanumeric token sequence equality, ignoring punctuation.
- Token-trigram set Jaccard >= 0.8, for texts with at least six tokens.
- Shared contiguous 12-token passage, checking every possible starting position.

Hashes of normalized inputs were checked against earlier preparation/split
reports and verified unchanged after auditing. No sample content from the split
files was read; MAlmasabi clean content was used only for structural overlap
comparison, not prediction-based tuning. No records were removed or relabeled.
This does not check embedding/semantic similarity, prove independent provenance,
or cover quarantined/raw-only records. Keep the sources separate and retain
their development-probe status. No benchmark was run in this step.

## Multi-source prefilter controls

```powershell
npm run benchmark:controls
node --test scripts/prefilter-benchmark.test.cjs scripts/prefilter-controls.test.cjs
```

`control-suite.json` defines three disjoint views over the two normalized sources.
The suite verifies normalization hashes and expected label counts before
scanning, and records the manifest hash, source/code hashes and selected IDs in
a unique `benchmark/results/prefilter-controls-*/` directory. Input views are
saved there for reproducibility; no canonical dataset is changed or merged.

- NotInject: all 339 benign controls, with results also broken down by subset.
- Realistic strict IPI: seven IPI attacks and seven benign controls.
- Realistic supplemental: two direct and one mixed attack; scope results separate.

Each view calls the existing text-only production prefilter through the generic
benchmark runner. The suite saves `suite-summary.json`, per-view input JSONL and
individual run directories with predictions, errors and group/source/rule
details. In these ungrouped probe sets, the generic `(ungrouped)` bucket is not
a source-document group; use suite per-subset/scope results for interpretation.
There is no single pooled score across the three views. Recall for an all-benign
view is undefined (`null`); false-positive rate for an all-malicious view is
also undefined. The suite does not read or score MAlmasabi test, invoke local
models, or validate extraction/full-pipeline behavior.

Initial unchanged-rule baseline: `prefilter-controls-glGX1C`. NotInject: 0/339
false positives. Realistic strict: TP 1, FN 6, TN 7, FP 0; recall 14.29%, F1 25%.
Supplemental direct/mixed: TP 1, FN 2 (mixed caught, both direct missed).
These small development probes are not evidence of general real-world safety.

Run preparation from the project root with:

```powershell
node scripts/audit-ipi-dataset.cjs
node scripts/prepare-ipi-dataset.cjs
```

## Normalized records (step 3)

`processed/ipi-clean.jsonl` contains one JSON object per line, encoded as UTF-8.
The transformation preserves the original context text, including whitespace.

- `id`: dataset prefix plus original physical line number; stable for this source file version.
- `text`: original `context`, used as scanner input.
- `label`: `0` becomes `benign`; `1` becomes `malicious`. Ground truth for scoring only.
- `user_intent`: original legitimate user request, retained as metadata.
- `source`: original provenance, retained as metadata.
- `original_label`: original numeric label.
- `original_line`: one-based line number in the raw JSONL file.
- `context_sha256`: hash of trimmed context, used for exact duplicate grouping.

Only `text` should be passed into the current context-only scanner. Do not pass
the label, ID, provenance, or other scoring metadata into model prompts.
User intent is retained for future explicit context-aware evaluation.

Duplicate handling retains the first record per trimmed context. All records
from groups with conflicting labels go into `processed/ipi-conflicts.jsonl`
instead. Different user intents on duplicate contexts are preserved in the raw
file, not all retained in the clean context-only dataset. This is not a
near-duplicate or attack-template grouping process.

`processed/ipi-cleaning-report.json` records counts, policies and the original
file hash. `processed/ipi-data-audit.json` records raw data quality checks.
`processed/ipi-normalization-validation.json` records full source-to-output checks.

## Grouped dev/test split (step 4)

Run `node scripts/split-ipi-dataset.cjs` to reproduce the split with seed
`sentinel-ipi-split-v1-20261023`. Outputs are `splits/ipi-dev.jsonl`,
`splits/ipi-test.jsonl` and `splits/ipi-split-report.json`.

Dev contains 52,758 records (25,632 benign; 27,126 malicious). Test contains
13,190 records (6,408 benign; 6,782 malicious). Each record retains its normalized
fields and adds `document_group_id`, a heuristic group identifier, not a verified
original-document identifier. Do not send this field to the scanner/model.

Grouping uses Unicode NFKC, lowercase alphanumeric tokens, identical normalized
texts and shared 40-token passages sampled every 20 tokens. Connected records
stay together, including across labels. Groups are assigned deterministically
by size and seeded hash, targeting 20% of each label in test. Normalization is
only used for grouping; output text remains unchanged.

No IDs, groups or sampled matching passages cross the split. This heuristic
can merge unrelated documents sharing boilerplate, and may miss paraphrases,
shifted passage boundaries or attack-template similarities. The largest group
has 7,282 records. The split does not establish independence from BIPIA or
other datasets derived from it.

Use dev for rule/prompt changes; keep test for final evaluation after freezing
the configuration. Test has not been scored or inspected for tuning.

No benchmark execution has been performed. The existing
`scripts/run-ipi-benchmark.js` still reads `benchmark/ipi-baseline.json` (a JSON
array); it does not yet load this normalized JSONL dataset automatically.

## Structural group audit

Run `node scripts/audit-ipi-groups.cjs`; details are saved in
`splits/ipi-group-audit.json`. This audits the five largest groups without
running a scanner or tuning against prediction errors.

The 7,282-record group is in **test**, not dev. It contains 2,068 benign and
5,214 malicious records across 50 distinct user intents. Shared code-injection
payload passages link different programming tasks into one connected component;
it should not be interpreted as variants of a single original document. There
are 315 sampled passages shared across different intents in this component.
The next-largest component contains 1,430 records and seven user intents;
shared email notification boilerplate contributes to its connections.

The existing split is retained: breaking these components without a verified
source-document map would reintroduce shared sampled passages across splits.
This is a conservative passage-disjoint split, not a verified document-family
split. The largest component accounts for about 55.2% of test, so an aggregate
score will be heavily influenced by it. Report results by group and label as
well as in aggregate when implementing the benchmark. A future alternative
document-group split needs reliable source IDs or validated task/document
clustering and should be versioned separately; do not silently overwrite this
split or claim that the present test represents all real-world IPI domains.

## Rule Prefilter benchmark (step 5)

```powershell
npm run benchmark:prefilter
node --test scripts/prefilter-benchmark.test.cjs
```

The default command scans **dev only**, calling the same `scanTextForIpi`
function as the application. Any finding, regardless of severity, counts as a
malicious prediction. Text extraction, chunking and local models are outside
this benchmark. No labels or metadata are passed into the scanner.

Each run creates a unique directory under `benchmark/results/` containing:

- `summary.json`: confusion matrix, metrics, source/rule breakdowns, source-code
  and dataset hashes, runtime and decision policy. Metrics use fractions (0–1).
  Undefined metrics are `null` when the denominator is zero.
- `predictions.jsonl`: one prediction for every sample.
- `errors.jsonl`: full text and findings for FP/FN samples, for dev analysis.
- `by-group.json`: counts and metrics per heuristic group, plus an unweighted
  mean group accuracy in the summary to supplement the aggregate score.

Use `--dataset path/to/file.jsonl` for another normalized JSONL dataset. Only
after freezing rules and thresholds, explicitly evaluate the held-out test:
`npm run benchmark:prefilter -- --split test`. Do not tune against test errors.
Incomplete runs are marked `FAILED.txt` and must not be treated as complete.

First dev baseline (unchanged rules; 52,758 samples): TP 224, FP 136, TN 25,496,
FN 26,902. Precision 62.22%, recall 0.83%, F1 1.63%, false positive rate 0.53%.
The high number of false negatives means the current patterns cover little of
this dataset's malicious class; these are dataset-relative metrics, not a
measurement of universal real-world protection. Test has not been scored.
