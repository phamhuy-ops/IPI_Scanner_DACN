# Project-wide upgrade policy

Applies to the whole IPI Scanner project: rules, extraction, chunking, local
models, prompts, orchestration, reporting, UI and evaluation tooling.
Follow `CONTRIBUTING.md` for development checks and repository conventions.

## Evidence-led changes

- Follow: fix a demonstrated defect → add changes with benign controls →
  evaluate on independent data → measure the complete pipeline.
- Scope validation to the changed behavior. UI-only changes need relevant UI
  checks; changes affecting detection or input processing need detection and
  pipeline checks. Do not claim general security improvements from unit tests.
- Establish a reproducible baseline before detection changes. Change one
  coherent behavior at a time; retain before/after results and limitations.
- Every new detection behavior needs malicious examples, similar benign
  examples, and unseen wording/context/position variants. Use a name such as
  “Dan Evans” as a benign control for DAN persona detection.
- Explain what behavior a rule detects. Do not add rules for dataset IDs,
  provenance, labels, benchmark-specific strings or target scores. A dataset
  match alone is not evidence that the injected span was identified correctly.

## Data independence and realism

- Use dev for rule, prompt, threshold and model selection. Freeze the evaluated
  configuration before held-out testing. Test-informed changes require a fresh
  independent holdout for final claims; never silently treat it as untouched.
- Use multiple datasets AND realistic local fixtures before making broad
  effectiveness claims. Check provenance: BIPIA derivatives are not inherently
  independent of BIPIA. Preserve source/version/license and label uncertainty.
- Group shared documents, near duplicates and attack variants before splitting;
  document grouping heuristics, large components and remaining leakage risks.
- Include real clean documents, hard negatives, Vietnamese/multilingual content,
  long documents and supported file formats. Use public, synthetic or sanitized
  fixtures; never disclose private documents or secrets to create test data.
- Keep labels, source IDs, group IDs and answer keys out of model/scanner input.
  Provide user intent only in an explicitly documented context-aware setup.

## Evaluation and completion claims

- Report precision, recall, F1, false positive rate and confusion counts, with
  per-source/group results and undefined metrics represented explicitly.
- Measure extraction, chunk selection, prefilter, Detector and Verifier where
  relevant, then the full pipeline on comparable inputs. Include latency and
  resource use for model/pipeline changes; record failures and coverage limits.
- Preserve raw data and prior baselines. Record dataset/code/model/prompt
  versions, seed, decision policy and exact commands for reproducibility.
- Passing one dataset is preliminary evidence. If independent or end-to-end
  evaluation is unavailable, complete feasible local checks and explicitly
  state the remaining validation; do not invent results or claim completion of it.

## Ngôn ngữ tài liệu từ ngày 2026-10-24

Viết hướng dẫn, báo cáo, kế hoạch, ghi chú và chú thích mới bằng tiếng Việt.
Không tự dịch tài liệu cũ. Giữ nguyên định danh kỹ thuật và dữ liệu/trích dẫn gốc
khi cần đối chiếu. Chi tiết tại `.cursor/rules/tai-lieu-tieng-viet.mdc`.
