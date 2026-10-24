const fs = require('node:fs');
const path = require('node:path');
const { main: run } = require('./run-model-context-diagnostics.cjs');
const { assessCandidate } = require('./verifier-candidate.cjs');
async function main() {
  const output = await run({ planPath: 'benchmark/experiments/verifier-candidate-v1/ke-hoach.json', outputPrefix: 'verifier-candidate-' });
  const rows = JSON.parse(fs.readFileSync(path.join(output, 'model-calls.json'), 'utf8'));
  const plan = JSON.parse(fs.readFileSync(path.join(output, 'ke-hoach.json'), 'utf8'));
  const result = assessCandidate(rows, plan);
  fs.writeFileSync(path.join(output, 'candidate-gate.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
