const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const contracts = require('../../../skills/lib/contracts.cjs');
const bindings = require('../../../skills/lib/source-bindings.cjs');
const { createSkillReviewer, segmentsForTarget } = require('../../../skills/lib/runtime.cjs');

async function main() {
  const input = path.resolve(process.argv[2]);
  const bytes = fs.readFileSync(input);
  const baseline = JSON.parse(bytes);
  assert.equal(baseline.cases.length, 8);
  const { config, configurationHash } = createSkillReviewer();
  const profile = config.profiles['ipi-command-context'];
  const output = fs.mkdtempSync(path.join(path.dirname(input), '../context-isolation-'));
  const report = { input, input_sha256: createHash('sha256').update(bytes).digest('hex'),
    configurationHash, policy: 'Chỉ quan sát hoặc bác bỏ khi skill xác định khung mô tả có tham chiếu nguồn. Không nâng lên confirmed.', cases: [] };
  for (const item of baseline.cases) {
    const assessment = role => {
      const trial = item.trials.find(row => row.role === role && row.supplied);
      assert.equal(trial.result.reviewedChunkIds.length, 1);
      return trial.assessments.find(row => row.id === 'excerpt-1').assessment;
    };
    const detector = assessment('detector');
    const verifier = assessment('verifier');
    assert.equal(detector.citation.quote, verifier.citation.quote);
    const target = detector.citation.quote;
    const saved = require(path.resolve('benchmark/results/round-one-eval-RTE04X/cases.json'));
    const source = saved.find(row => row.id === item.id).state.scanResult.metadata.semanticChunks
      .find(chunk => chunk.chunkId === item.source_chunk_id).text;
    const off = detector.stance === verifier.stance && ['confirmed', 'dismissed'].includes(detector.stance)
      ? detector.stance : 'unresolved';
    const row = { id: item.id, label: item.label, off, on: off, calls: [] };
    report.cases.push(row);
    async function chat(request) {
      const started = performance.now();
      const call = { request };
      row.calls.push(call);
      try {
        const response = await fetch('http://127.0.0.1:11434/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request), signal: AbortSignal.timeout(90000),
        });
        call.response = await response.json();
        assert(response.ok && call.response.done_reason !== 'length');
        return JSON.parse(call.response.message.content);
      } finally {
        call.duration_ms = Math.round(performance.now() - started);
      }
    }
    try {
      const segments = segmentsForTarget(source, target);
      const targetRef = contracts.targetReference(source, segments, target);
      const bound = segments.some(segment => segment.integrationMerged) ? null : bindings.literalContext(source, target, segments);
      const request = contracts.transferTargetRequest(profile.request, segments, target, profile.body);
      request.format.properties.reason = structuredClone(profile.request.format.properties.reason);
      let parsed = bound?.parsed ?? await chat(request);
      if (!bound) {
        contracts.resolveBoundContext(parsed, segments, targetRef);
        if (!contracts.completeContextReason(parsed.reason)) {
          const repair = structuredClone(config.reasonRepairTemplate);
          repair.messages[1].content = JSON.stringify({ source: JSON.parse(request.messages[1].content), draftReason: parsed.reason });
          parsed = contracts.applyReasonRepair(parsed, await chat(repair), segments, targetRef).parsed;
        }
      }
      const refs = contracts.resolveBriefContext(parsed, segments, targetRef);
      row.context = { ...parsed, refs, origin: bound ? 'source-binding' : 'model' };
      if (parsed.decision === 'descriptive' && parsed.contextRefs.some(ref => ref !== targetRef)) row.on = 'dismissed';
    } catch (error) {
      row.error = error.message;
    }
    fs.writeFileSync(path.join(output, 'cases.json'), JSON.stringify(report, null, 2));
    console.log(row.id, row.off, row.context?.decision, row.on, row.error ?? '');
  }
  console.log(output);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
