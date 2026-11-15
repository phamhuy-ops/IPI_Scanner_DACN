const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { runIpiDocScan } = require('../../engine/scanner/ipi-doc-scan');
const { extractDocumentText } = require('../../engine/document/extractors/document-text-extractor');
const { summarize, chunkCoverage, repeatedAssessmentDiscoveries, checkCitations } = require('../metrics/round-one-metrics.cjs');
const { checkEvaluationHistory } = require('../metrics/evaluation-history.cjs');
const { makeBenchmarkDirectory } = require('../dev/check-engines.js');
const { resolveDataPath } = require('../data/data-paths.cjs');
const ROOT = path.resolve(__dirname, '..', '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fingerprintFiles = [
  'scripts/data/data-paths.cjs',
  'scripts/metrics/evaluation-history.cjs',
  'src/ai/agents/document/ipiPipeline.ts', 'src/ai/agents/document/reviewPolicy.ts', 'src/ai/agents/document/prompts.ts',
  'src/ai/agents/document/directiveContext.ts', 'src/ai/agents/document/structuredPrompts.ts', 'src/types.ts',
  'src/ai/agents/document/sourceReferences.ts', 'src/ai/agents/document/referencePrompts.ts',
  'src/ai/agents/document/compactVerifier.ts',
  'src/ai/agents/document/evidence.ts', 'src/ai/agents/document/detectorAgent.ts', 'src/ai/agents/document/verifierAgent.ts',
  'src/ai/agents/slmClient.ts', 'src/ai/agents/slmCatalog.ts', 'engine/scanner/ipi-doc-scan.js',
  'engine/prefilter/document-prefilter.js', 'engine/prefilter/rules/ipi-document-rules.js', 'engine/models/finding.js',
  'engine/prefilter/conversation-transfer.js',
  'src/ai/agents/document/actionAudit.ts',
  'src/ai/agents/document/summaryExampleContext.ts',
  'engine/document/extractors/document-text-extractor.js', 'engine/document/chunking/semantic-chunker.js',
  'engine/document/extractors/html-source.js',
  'engine/config/document-scan-config.js', 'scripts/benchmark/run-round-one-eval.cjs', 'scripts/metrics/round-one-metrics.cjs', 'scripts/dev/check-engines.js',
];
const fingerprints = () => Object.fromEntries(fingerprintFiles.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
async function localGet(endpoint) {
  const response = await fetch(`http://127.0.0.1:11434${endpoint}`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Ollama ${endpoint}: ${response.status}`);
  return response.json();
}

async function main() {
  const args = process.argv.slice(2);
  const desktop = args[0] === '--desktop';
  if (desktop) args.shift();
  const transferCandidates = args.includes('--transfer-candidates');
  const summaryOverrideCandidates = args.includes('--summary-override-candidates');
  if (summaryOverrideCandidates) args.splice(args.indexOf('--summary-override-candidates'), 1);
  if (transferCandidates) args.splice(args.indexOf('--transfer-candidates'), 1);
  const actionAudit = args.includes('--action-audit');
  const detectorCandidateActionAudit = args.includes('--detector-candidate-action-audit');
  if (detectorCandidateActionAudit) args.splice(args.indexOf('--detector-candidate-action-audit'), 1);
  const recoverDetectorTimeoutOnce = args.includes('--recover-detector-timeout-once');
  if (recoverDetectorTimeoutOnce) args.splice(args.indexOf('--recover-detector-timeout-once'), 1);
  const recoverVerifierTimeoutOnce = args.includes('--recover-verifier-timeout-once');
  if (recoverVerifierTimeoutOnce) args.splice(args.indexOf('--recover-verifier-timeout-once'), 1);
  if (actionAudit) args.splice(args.indexOf('--action-audit'), 1);
  const verifierTransferAudit = args.includes('--verifier-transfer-audit');
  if (verifierTransferAudit) args.splice(args.indexOf('--verifier-transfer-audit'), 1);
  const verifierSummaryAudit = args.includes('--verifier-summary-audit');
  const verifierEvidenceFirst = args.includes('--verifier-evidence-first');
  if (verifierEvidenceFirst) args.splice(args.indexOf('--verifier-evidence-first'), 1);
  const verifierEvidenceFirstSensitive = args.includes('--verifier-evidence-first-sensitive');
  if (verifierEvidenceFirstSensitive) args.splice(args.indexOf('--verifier-evidence-first-sensitive'), 1);
  const verifierEvidenceFirstOutputOverride = args.includes('--verifier-evidence-first-output-override');
  if (verifierEvidenceFirstOutputOverride) args.splice(args.indexOf('--verifier-evidence-first-output-override'), 1);
  if (verifierSummaryAudit) args.splice(args.indexOf('--verifier-summary-audit'), 1);
  if (verifierSummaryAudit && (!summaryOverrideCandidates || actionAudit)) {
    throw new Error('--verifier-summary-audit cần --summary-override-candidates và chạy riêng với --action-audit.');
  }
  const prioritizeTransferChunks = args.includes('--prioritize-transfer-chunks');
  if (prioritizeTransferChunks) args.splice(args.indexOf('--prioritize-transfer-chunks'), 1);
  const splitThreshold = args.indexOf('--transfer-split-min-characters');
  const transferSplitMinCharacters = splitThreshold < 0 ? undefined : Number(args.splice(splitThreshold, 2)[1]);
  if (transferSplitMinCharacters !== undefined && (!prioritizeTransferChunks ||
    !Number.isSafeInteger(transferSplitMinCharacters) || transferSplitMinCharacters < 1)) {
    throw new Error('--transfer-split-min-characters cần số nguyên dương và --prioritize-transfer-chunks.');
  }
  if (verifierTransferAudit && (!transferCandidates || actionAudit)) {
    throw new Error('--verifier-transfer-audit cần --transfer-candidates và chạy riêng với --action-audit.');
  }
  let manifestFile = 'data/manifests/round-one-eval.json', caseId, reviewContract = 'classic-v1', verifierOutput = 'standard';
  let chunkSelection = 'fixed', scanProfile = 'balanced', verifierModel;
  const seen = new Set();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!['--manifest', '--case', '--contract', '--verifier-output', '--chunk-selection', '--profile', '--verifier-model'].includes(flag) || !value || seen.has(flag)) throw new Error('Cách dùng: npm run benchmark:round-one -- [--desktop] [--manifest data/manifests/name.json] [--case ID] [--contract classic-v1|structured-v1|referenced-v1] [--verifier-output standard|compact-v1] [--chunk-selection fixed|adaptive] [--profile balanced|deep] [--verifier-model TAG]');
    seen.add(flag);
    if (flag === '--manifest') manifestFile = value;
    else if (flag === '--contract') reviewContract = value;
    else if (flag === '--verifier-output') verifierOutput = value;
    else if (flag === '--chunk-selection') chunkSelection = value;
    else if (flag === '--profile') scanProfile = value;
    else if (flag === '--verifier-model') verifierModel = value;
    else caseId = value;
  }
  if (!['fixed', 'adaptive'].includes(chunkSelection) || !['balanced', 'deep'].includes(scanProfile)) {
    throw new Error('Chế độ chọn chunk hoặc profile không hợp lệ.');
  }
  if (!['classic-v1', 'structured-v1', 'referenced-v1'].includes(reviewContract)) throw new Error('Hợp đồng nhận định không được hỗ trợ.');
  if (!['standard', 'compact-v1'].includes(verifierOutput) || (verifierOutput === 'compact-v1' && reviewContract !== 'referenced-v1')) throw new Error('Verifier rút gọn chỉ hỗ trợ referenced-v1.');
  const manifestPath = resolveDataPath(ROOT, manifestFile);
  const dataRoot = path.join(ROOT, 'data/manifests') + path.sep;
  if (!manifestPath.startsWith(dataRoot) || path.extname(manifestPath) !== '.json') throw new Error('Manifest must be a JSON file inside data/manifests');
  const manifestRaw = fs.readFileSync(manifestPath), manifest = JSON.parse(manifestRaw);
  const selectedCases = caseId ? manifest.cases.filter(item => item.id === caseId) : manifest.cases;
  if (!selectedCases.length) throw new Error('Unknown case ID');
  for (const source of Object.values(manifest.source_inputs)) {
    if (hash(fs.readFileSync(resolveDataPath(ROOT, source.file))) !== source.sha256) throw new Error('Manifest source hash changed');
  }
  const inputsFor = item => item.files ?? [item];
  if (manifest.history_sources !== undefined && (!Array.isArray(manifest.history_sources) ||
    !manifest.history_sources.length || manifest.history_sources.some(key => typeof key !== 'string' || !key.trim()))) {
    throw new Error('history_sources phải là danh sách khóa nguồn lịch sử đã khóa hash.');
  }
  for (const key of manifest.history_sources ?? []) {
    if (!Object.hasOwn(manifest.source_inputs, key)) throw new Error(`Thiếu nguồn lịch sử đã khóa hash: ${key}`);
    const source = manifest.source_inputs[key];
    checkEvaluationHistory(manifest.cases, JSON.parse(fs.readFileSync(resolveDataPath(ROOT, source.file))));
  }
  for (const item of manifest.cases.flatMap(inputsFor)) {
    if (item.text !== undefined && hash(Buffer.from(item.text)) !== item.input_sha256) throw new Error(`Case text hash differs: ${item.id}`);
    if (item.text === undefined && !item.source_file) throw new Error(`Missing input: ${item.id}`);
    if (item.source_file && hash(fs.readFileSync(resolveDataPath(ROOT, item.source_file))) !== item.input_sha256) throw new Error(`File fixture changed: ${item.id}`);
  }
  const models = await localGet('/api/tags');
  const codeHashes = fingerprints();
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, root: ROOT, server: { middlewareMode: true, watch: null }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  const catalog = await server.ssrLoadModule('/src/ai/agents/slmCatalog.ts');
  const fixModel = desktop ? catalog.DESKTOP_DETECTOR_MODEL : 'gemma3:1b';
  const checkModel = verifierModel ?? (desktop ? catalog.DESKTOP_VERIFIER_MODEL : 'qwen2.5-coder:1.5b');
  try {
    catalog.endpointsForRole('check', 'ollama', checkModel);
  } catch (error) {
    await server.close();
    throw error;
  }
  const analysisTimeoutMs = desktop ? 300_000 : 180_000;
  const requestTimeoutMs = desktop ? 90_000 : 45_000;
  for (const name of [fixModel, checkModel]) {
    if (!models.models?.some(model => model.name === name)) {
      await server.close();
      throw new Error(`Missing local model: ${name}`);
    }
  }
  const output = makeBenchmarkDirectory('round-one-eval-');
  fs.writeFileSync(path.join(output, 'manifest.json'), manifestRaw);
  const records = [], calls = [];
  let currentCase = '', currentRole = 'detector';
  let maxHarnessRss = process.memoryUsage().rss;
  const memoryTimer = setInterval(() => { maxHarnessRss = Math.max(maxHarnessRss, process.memoryUsage().rss); }, 100);
  let completed = false;
  globalThis.owaspWorkbench = {
    scanIpiDoc: (filePaths, profile) => runIpiDocScan(filePaths, { scanProfile: profile, adaptiveChunkSelection: chunkSelection === 'adaptive',
      includeTransferCandidates: transferCandidates, includeSummaryOverrideCandidates: summaryOverrideCandidates }),
    aiFetch: async payload => {
      if (new URL(payload.url).origin !== 'http://127.0.0.1:11434') throw new Error('Only local Ollama is allowed');
      const chat = payload.url.includes('/chat/completions');
      const call = { case_id: currentCase, role: currentRole, request: chat ? JSON.parse(payload.body) : null };
      const started = performance.now();
      try {
        const response = await fetch(payload.url, { method: payload.method || 'POST', headers: payload.headers,
          body: payload.body, signal: AbortSignal.timeout(payload.timeoutMs || 45_000) });
        const body = await response.text();
        if (chat) {
          Object.assign(call, { http_status: response.status, seconds: (performance.now() - started) / 1000, response: body });
          try { call.resource_snapshot = await localGet('/api/ps'); } catch { call.resource_snapshot = null; }
          calls.push(call);
        }
        return { ok: response.ok, status: response.status, body };
      } catch (error) {
        if (chat) calls.push({ ...call, http_status: 0, seconds: (performance.now() - started) / 1000, transport_error: error.message });
        return { ok: false, status: 0, body: '', error: error.message };
      }
    },
  };
  const baseReport = { scope: caseId ? 'targeted_development_regression' : manifest.evaluation_role,
    manifest_file: path.relative(ROOT, manifestPath),
    selected_case_ids: selectedCases.map(item => item.id), manifest_sha256: hash(manifestRaw), code_sha256: codeHashes,
    models, node_version: process.version, configuration: { detector: fixModel, verifier: checkModel, rounds: 1,
      review_contract: reviewContract, verifier_output: verifierOutput, profile: scanProfile, chunk_selection: chunkSelection, case_timeout_ms: analysisTimeoutMs,
      request_timeout_ms: requestTimeoutMs, verify_model_handoff: desktop, recover_detector_citations: desktop,
      ...(recoverDetectorTimeoutOnce ? { recover_detector_timeout_once: true } : {}),
      ...(recoverVerifierTimeoutOnce ? { recover_verifier_timeout_once: true } : {}),
      transfer_candidates: transferCandidates, summary_override_candidates: summaryOverrideCandidates, action_audit: actionAudit,
      ...(detectorCandidateActionAudit ? { detector_candidate_action_audit: true } : {}),
      verifier_transfer_audit: verifierTransferAudit, verifier_summary_audit: verifierSummaryAudit,
      ...(verifierEvidenceFirst ? { verifier_evidence_first: true, verifier_evidence_first_scope: 'transfer-only' } : {}),
      ...(verifierEvidenceFirstSensitive ? { verifier_evidence_first_sensitive: true } : {}),
      ...(verifierEvidenceFirstOutputOverride ? { verifier_evidence_first_output_override: true } : {}),
      prioritize_transfer_chunks: prioritizeTransferChunks, transfer_split_min_characters: transferSplitMinCharacters ?? null },
    limitations: ['Development diagnostics, not a representative or held-out benchmark.',
      'Headless bridge uses product core; Electron IPC and interactive UI are not exercised.',
      'Authored fixtures are not an independent real-world collection.',
      'Exact source citations and gold-span overlap do not establish semantically correct reasoning.',
      'Gold spans may be incomplete; source labels remain unverified for dataset cases.',
      'RSS is the harness process, not total RAM of Ollama. Ollama resource snapshots are not peak VRAM measurements.',
      'Review-needed is abstention, never silently scored as clean or detected. MAlmasabi test is not evaluated.'] };
  try {
    const { runIpiDocumentPipeline } = await server.ssrLoadModule('/src/ai/agents/document/ipiPipeline.ts');
    const { parseReviewJson } = await server.ssrLoadModule('/src/ai/agents/document/reviewPolicy.ts');
    const { parseCompactVerifierJson } = await server.ssrLoadModule('/src/ai/agents/document/compactVerifier.ts');
    for (const item of selectedCases) {
      if (JSON.stringify(fingerprints()) !== JSON.stringify(codeHashes)) throw new Error('Code changed during frozen evaluation');
      currentCase = item.id; currentRole = 'detector';
      const filePaths = inputsFor(item).map((input, index) => {
        const suffix = item.files ? `-${index + 1}` : '';
        const file = path.join(output, item.id + suffix + input.format);
        if (input.text === undefined) fs.copyFileSync(resolveDataPath(ROOT, input.source_file), file);
        else fs.writeFileSync(file, input.text);
        if (hash(fs.readFileSync(file)) !== input.input_sha256) throw new Error(`Input changed: ${item.id}`);
        return file;
      });
      const extracted = await Promise.all(filePaths.map(extractDocumentText));
      console.log(`Case ${records.length + 1}/${selectedCases.length}: ${item.id} (${item.source})`);
      const start = performance.now();
      const state = await runIpiDocumentPipeline({ filePaths, analysisTimeoutMs, requestTimeoutMs, reviewContract, verifierOutput,
        fixModel, checkModel, scanProfile, verifyModelHandoff: desktop, recoverDetectorCitations: desktop, actionAudit, detectorCandidateActionAudit, verifierTransferAudit, prioritizeTransferChunks,
        transferSplitMinCharacters, verifierSummaryAudit, recoverDetectorTimeoutOnce, recoverVerifierTimeoutOnce,
        verifierEvidenceFirst, verifierEvidenceFirstSensitive, verifierEvidenceFirstOutputOverride,
        onEvent: event => {
          if (event.phase === 'fix') currentRole = 'detector';
          if (event.phase === 'check') currentRole = 'verifier';
          console.log(`${item.id}: ${event.phase} - ${event.message}`);
        } });
      const seconds = (performance.now() - start) / 1000;
      const chunks = (state.scanResult?.metadata?.semanticChunks || []).map((chunk, i) => ({ ...chunk, sourceChunkId: chunk.chunkId, chunkId: `chunk-${i + 1}` }));
      for (const call of calls.filter(call => call.case_id === item.id)) {
        call.runtime_schema_valid = false;
        try {
          const envelope = JSON.parse(call.response);
          const content = envelope.choices[0].message.content;
          call.finish_reason = envelope.choices[0].finish_reason;
          const schema = call.request.response_format.json_schema.schema;
          const expectedIds = (schema.properties.assessments.items.anyOf || []).map(variant => variant.properties.id.enum[0]);
          const expected = expectedIds.map(id => state.suspicions.find(row => row.id === id));
          if (expected.some(row => !row)) throw new Error('Expected suspicion absent in final state');
          let chunkIds;
          if (reviewContract === 'referenced-v1') {
            const message = call.request.messages.find(row => row.role === 'user').content;
            const table = JSON.parse(message.slice(message.indexOf('\n{') + 1, message.indexOf('\n\nOriginal document evidence:')));
            chunkIds = new Set(table.spans.map(ref => ref.chunkId));
          } else chunkIds = new Set(schema.properties.discoveries.items.properties.chunkId.enum);
          const batch = chunks.filter(chunk => chunkIds.has(chunk.chunkId));
          const parsed = call.role === 'verifier' && verifierOutput === 'compact-v1'
            ? parseCompactVerifierJson(content, batch, expected)
            : parseReviewJson(content, batch, expected, reviewContract);
          call.repeated_assessment_discoveries = repeatedAssessmentDiscoveries(parsed, batch);
          call.runtime_schema_valid = true;
        } catch (error) { call.validation_error = error.message; }
      }
      const citations = checkCitations(state, item.gold_spans);
      const record = { id: item.id, source: item.source, group_id: item.group_id ?? null, label: item.expected_label,
        format: item.format, file_count: filePaths.length, page_count: item.page_count ?? null, extraction_ok: extracted.every(input => input.ok),
        extracted_characters: extracted.every(input => input.ok) ? extracted.reduce((sum, input) => sum + input.text.length, 0) : null,
        verdict: state.check?.verdict || 'needs_review', processing: state.processingStatus, seconds,
        seconds_per_page: item.page_count > 0 ? seconds / item.page_count : null,
        chunk_coverage: chunkCoverage(state),
        rule_prediction: state.scanResult?.findings.length ? 'malicious' : 'benign',
        gold_spans: item.gold_spans.map(span => ({ text: span, survives_extraction: extracted.some(input => input.ok && input.text.includes(span)),
          in_selected_chunks: chunks.some(chunk => chunk.text.includes(span)) })),
        citations, state };
      records.push(record);
      fs.writeFileSync(path.join(output, 'cases.json'), JSON.stringify(records, null, 2));
      fs.writeFileSync(path.join(output, 'model-calls.json'), JSON.stringify(calls, null, 2));
      fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify({ ...baseReport, status: 'running', cases_completed: records.length,
        metrics: summarize(records), max_harness_rss_bytes: maxHarnessRss }, null, 2));
      console.log(`Saved ${item.id}: ${record.verdict}; ${record.processing}; ${seconds.toFixed(1)}s`);
    }
    if (JSON.stringify(fingerprints()) !== JSON.stringify(codeHashes)) throw new Error('Code changed during evaluation');
    const sources = [...new Set(records.map(row => row.source))];
    const summary = { ...baseReport, status: 'complete', cases_completed: records.length, metrics: summarize(records),
      by_source: Object.fromEntries(sources.map(source => [source, summarize(records.filter(row => row.source === source))])),
      by_group: Object.fromEntries([...new Set(records.map(row => row.group_id).filter(id => id != null))]
        .map(id => [id, summarize(records.filter(row => row.group_id === id))])),
      attacks_without_prefilter_signal: summarize(records.filter(row => row.label === 'malicious' && row.rule_prediction === 'benign')),
      with_prefilter_signal: summarize(records.filter(row => row.rule_prediction === 'malicious')),
      model_calls: { total: calls.length, runtime_schema_valid: calls.filter(call => call.runtime_schema_valid).length,
        invalid_or_failed: calls.filter(call => !call.runtime_schema_valid).length,
        with_conflicting_repeated_evidence: calls.filter(call => call.repeated_assessment_discoveries
          ?.some(pair => pair.conflicting_stances)).length },
      citations: { total: records.reduce((n, r) => n + r.citations.citations, 0),
        structured_total: records.reduce((n, r) => n + r.citations.structured_citations, 0),
        structured_source_matches: records.reduce((n, r) => n + r.citations.structured_source_matches, 0),
        exact_source_matches: records.reduce((n, r) => n + r.citations.exact_source_matches, 0),
        bad_source_references: records.reduce((n, r) => n + r.citations.bad_source_references, 0) },
      max_harness_rss_bytes: maxHarnessRss };
    fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
    completed = true;
    console.log(JSON.stringify({ output: path.relative(ROOT, output), metrics: summary.metrics, model_calls: summary.model_calls }, null, 2));
  } finally {
    clearInterval(memoryTimer); delete globalThis.owaspWorkbench; await server.close();
    if (!completed) fs.writeFileSync(path.join(output, 'FAILED.txt'), 'Evaluation incomplete; use only completed case records and retain partial-run status.\n');
  }
}
if (require.main === module) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
