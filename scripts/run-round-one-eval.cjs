const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { runIpiDocScan } = require('../engine/scanner/ipi-doc-scan');
const { extractDocumentText } = require('../engine/document/extractors/document-text-extractor');
const { summarize, checkCitations } = require('./round-one-metrics.cjs');
const ROOT = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fingerprintFiles = [
  'src/ai/agents/document/ipiPipeline.ts', 'src/ai/agents/document/reviewPolicy.ts', 'src/ai/agents/document/prompts.ts',
  'src/ai/agents/document/directiveContext.ts', 'src/ai/agents/document/structuredPrompts.ts', 'src/types.ts',
  'src/ai/agents/document/sourceReferences.ts', 'src/ai/agents/document/referencePrompts.ts',
  'src/ai/agents/document/compactVerifier.ts',
  'src/ai/agents/document/evidence.ts', 'src/ai/agents/document/detectorAgent.ts', 'src/ai/agents/document/verifierAgent.ts',
  'src/ai/agents/slmClient.ts', 'src/ai/agents/slmCatalog.ts', 'engine/scanner/ipi-doc-scan.js',
  'engine/prefilter/document-prefilter.js', 'engine/prefilter/rules/ipi-document-rules.js', 'engine/models/finding.js',
  'engine/document/extractors/document-text-extractor.js', 'engine/document/chunking/semantic-chunker.js',
  'engine/document/extractors/html-source.js',
  'engine/config/document-scan-config.js', 'scripts/run-round-one-eval.cjs', 'scripts/round-one-metrics.cjs',
];
const fingerprints = () => Object.fromEntries(fingerprintFiles.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
async function localGet(endpoint) {
  const response = await fetch(`http://127.0.0.1:11434${endpoint}`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Ollama ${endpoint}: ${response.status}`);
  return response.json();
}

async function main() {
  const args = process.argv.slice(2);
  let manifestFile = 'benchmark/data/round-one-eval.json', caseId, reviewContract = 'classic-v1', verifierOutput = 'standard';
  const seen = new Set();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!['--manifest', '--case', '--contract', '--verifier-output'].includes(flag) || !value || seen.has(flag)) throw new Error('Cách dùng: npm run benchmark:round-one [-- --manifest benchmark/data/name.json] [--case ID] [--contract classic-v1|structured-v1|referenced-v1] [--verifier-output standard|compact-v1]');
    seen.add(flag);
    if (flag === '--manifest') manifestFile = value;
    else if (flag === '--contract') reviewContract = value;
    else if (flag === '--verifier-output') verifierOutput = value;
    else caseId = value;
  }
  if (!['classic-v1', 'structured-v1', 'referenced-v1'].includes(reviewContract)) throw new Error('Hợp đồng nhận định không được hỗ trợ.');
  if (!['standard', 'compact-v1'].includes(verifierOutput) || (verifierOutput === 'compact-v1' && reviewContract !== 'referenced-v1')) throw new Error('Verifier rút gọn chỉ hỗ trợ referenced-v1.');
  const manifestPath = path.resolve(ROOT, manifestFile);
  const dataRoot = path.join(ROOT, 'benchmark/data') + path.sep;
  if (!manifestPath.startsWith(dataRoot) || path.extname(manifestPath) !== '.json') throw new Error('Manifest must be a JSON file inside benchmark/data');
  const manifestRaw = fs.readFileSync(manifestPath), manifest = JSON.parse(manifestRaw);
  const selectedCases = caseId ? manifest.cases.filter(item => item.id === caseId) : manifest.cases;
  if (!selectedCases.length) throw new Error('Unknown case ID');
  for (const source of Object.values(manifest.source_inputs)) {
    if (hash(fs.readFileSync(path.join(ROOT, source.file))) !== source.sha256) throw new Error('Manifest source hash changed');
  }
  for (const item of manifest.cases) {
    if (hash(Buffer.from(item.text)) !== item.input_sha256) throw new Error(`Case text hash differs: ${item.id}`);
    if (item.source_file && hash(fs.readFileSync(path.join(ROOT, item.source_file))) !== item.input_sha256) throw new Error(`File fixture changed: ${item.id}`);
  }
  const models = await localGet('/api/tags');
  for (const name of ['gemma3:1b', 'qwen2.5-coder:1.5b']) if (!models.models?.some(model => model.name === name)) throw new Error(`Missing local model: ${name}`);
  const codeHashes = fingerprints();
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, root: ROOT, server: { middlewareMode: true }, appType: 'custom' });
  fs.mkdirSync(path.join(ROOT, 'benchmark/results'), { recursive: true });
  const output = fs.mkdtempSync(path.join(ROOT, 'benchmark/results/round-one-eval-'));
  fs.writeFileSync(path.join(output, 'manifest.json'), manifestRaw);
  const records = [], calls = [];
  let currentCase = '', currentRole = 'detector';
  let maxHarnessRss = process.memoryUsage().rss;
  const memoryTimer = setInterval(() => { maxHarnessRss = Math.max(maxHarnessRss, process.memoryUsage().rss); }, 100);
  let completed = false;
  globalThis.owaspWorkbench = {
    scanIpiDoc: filePaths => runIpiDocScan(filePaths),
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
    models, node_version: process.version, configuration: { detector: 'gemma3:1b', verifier: 'qwen2.5-coder:1.5b', rounds: 1,
      review_contract: reviewContract, verifier_output: verifierOutput, profile: 'balanced', case_timeout_ms: 180000, request_timeout_ms: 45000, temperature: 0, max_tokens: 1400 },
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
      const file = path.join(output, item.id + item.format);
      fs.writeFileSync(file, item.text);
      const extracted = await extractDocumentText(file);
      console.log(`Case ${records.length + 1}/${selectedCases.length}: ${item.id} (${item.source})`);
      const start = performance.now();
      const state = await runIpiDocumentPipeline({ filePaths: [file], analysisTimeoutMs: 180000, reviewContract, verifierOutput,
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
          if (call.role === 'verifier' && verifierOutput === 'compact-v1') parseCompactVerifierJson(content, chunks.filter(chunk => chunkIds.has(chunk.chunkId)), expected);
          else parseReviewJson(content, chunks.filter(chunk => chunkIds.has(chunk.chunkId)), expected, reviewContract);
          call.runtime_schema_valid = true;
        } catch (error) { call.validation_error = error.message; }
      }
      const citations = checkCitations(state, item.gold_spans);
      const record = { id: item.id, source: item.source, label: item.expected_label,
        verdict: state.check?.verdict || 'needs_review', processing: state.processingStatus, seconds,
        rule_prediction: state.scanResult?.findings.length ? 'malicious' : 'benign',
        gold_spans: item.gold_spans.map(span => ({ text: span, survives_extraction: Boolean(extracted.ok && extracted.text.includes(span)),
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
      model_calls: { total: calls.length, runtime_schema_valid: calls.filter(call => call.runtime_schema_valid).length,
        invalid_or_failed: calls.filter(call => !call.runtime_schema_valid).length },
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
