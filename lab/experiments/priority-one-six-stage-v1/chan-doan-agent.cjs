const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../../..');
const baseline = path.join(root, 'benchmark/results/round-one-eval-RTE04X');
const manifest = require(path.join(baseline, 'manifest.json'));
const observations = require(path.join(baseline, 'cases.json'));
const lock = require('./khoa-baseline.json');
const config = lock.configuration;
const positiveIds = ['doc-01', 'doc-06', 'doc-23', 'doc-24', 'doc-25'];
const controls = {
  'doc-36': text => text.match(/<blockquote>(.*?)<\/blockquote>/)?.[1],
  'doc-39': text => text.split('\n').find(line => line.startsWith('Ví dụ')),
  'doc-40': text => text.split('\n').find(line => line.startsWith('Ví dụ')),
};
const hashFile = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const origin = 'http://127.0.0.1:11434';

async function main() {
  assert.equal(hashFile(path.join(baseline, 'manifest.json')), lock.manifest_sha256);
  for (const [file, hash] of Object.entries(lock.code_sha256)) {
    assert.equal(hashFile(path.join(root, file)), hash, file);
  }
  const response = await fetch(origin + '/api/tags', { signal: AbortSignal.timeout(5000) });
  assert(response.ok);
  const { models } = await response.json();
  for (const [name, digest] of Object.entries(lock.model_digests)) {
    assert.equal(models.find(model => model.name === name)?.digest, digest, name);
  }
  const report = { baseline: path.basename(baseline), configuration: config,
    code_sha256: lock.code_sha256, model_digests: lock.model_digests,
    design: 'Một chunk nguồn mỗi ca, ba lượt độc lập, nhãn chỉ dùng ngoài model.', cases: [] };
  const output = fs.mkdtempSync(path.join(root, 'benchmark/results/agent-isolation-'));
  const { createServer } = await import('vite');
  const server = await createServer({ root, configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { runDetectorAgent } = await server.ssrLoadModule('/src/ai/agents/document/detectorAgent.ts');
    const { runVerifierAgent } = await server.ssrLoadModule('/src/ai/agents/document/verifierAgent.ts');
    const { citationFor } = await server.ssrLoadModule('/src/ai/agents/document/reviewPolicy.ts');
    for (const id of [...positiveIds, ...Object.keys(controls)]) {
      const item = manifest.cases.find(row => row.id === id);
      assert.equal(hashFile(path.join(baseline, id + item.format)), item.input_sha256, id);
      const { scanResult, reviewProgress } = observations.find(row => row.id === id).state;
      const selectQuote = controls[id] ?? (() => item.gold_spans[0]);
      const chunk = scanResult.metadata.semanticChunks.find(c => selectQuote(c.text) && c.text.includes(selectQuote(c.text))
        && reviewProgress.detectorReviewedChunkIds.includes(c.chunkId)
        && reviewProgress.verifierReviewedChunkIds.includes(c.chunkId));
      assert(chunk, id);
      const chunks = [{ ...chunk, chunkId: 'chunk-1', fileName: 'document' + item.format, filePath: 'document' + item.format }];
      const quote = selectQuote(chunk.text);
      const citation = citationFor('chunk-1', quote, chunks);
      const record = { id, label: item.expected_label, source_chunk_id: chunk.chunkId, trials: [] };
      report.cases.push(record);
      for (const [role, supplied] of [['detector', false], ['detector', true], ['verifier', true]]) {
        const trial = { role, supplied, calls: [], failed_batches: [] };
        record.trials.push(trial);
        const suspicions = supplied ? [{ id: 'excerpt-1', source: 'rule', location: citation.fileName,
          originalQuote: quote, citation, detector: null, verifier: null, status: 'unresolved' }] : [];
        globalThis.owaspWorkbench = { aiFetch: async payload => {
          assert.equal(new URL(payload.url).origin, origin);
          const started = performance.now();
          const call = { request: JSON.parse(payload.body) };
          trial.calls.push(call);
          try {
            const result = await fetch(payload.url, { method: payload.method, headers: payload.headers,
              body: payload.body, signal: AbortSignal.timeout(payload.timeoutMs) });
            const body = await result.text();
            Object.assign(call, { status: result.status, response: body });
            return { ok: result.ok, status: result.status, body };
          } catch (error) {
            call.error = error.message;
            return { ok: false, status: 0, body: '', error: error.message };
          } finally {
            call.duration_ms = Math.round(performance.now() - started);
          }
        } };
        const options = { chunks, suspicions, model: config[role], deadline: Date.now() + config.case_timeout_ms,
          requestTimeoutMs: config.request_timeout_ms, reviewContract: config.review_contract,
          onBatchFailed: batch => trial.failed_batches.push(batch.error.message) };
        try {
          trial.result = role === 'detector'
            ? await runDetectorAgent({ ...options, recoverCitations: config.recover_detector_citations })
            : await runVerifierAgent({ ...options, outputFormat: config.verifier_output,
              detectorReview: { model: config.detector, reviewedChunkIds: [], batchCount: 0, suspiciousBatchCount: 0, semanticAnalysis: '' } });
        } catch (error) {
          trial.error = error.message;
        }
        trial.assessments = suspicions.map(row => ({ id: row.id, assessment: row[role], conflicts: row.conflicts }));
        fs.writeFileSync(path.join(output, 'cases.json'), JSON.stringify(report, null, 2));
        console.log(id, role, supplied, trial.result?.reviewedChunkIds.length ?? 0,
          trial.assessments.map(row => row.assessment?.stance), trial.failed_batches, trial.error ?? '');
      }
    }
    console.log(output);
  } finally {
    delete globalThis.owaspWorkbench;
    await server.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
