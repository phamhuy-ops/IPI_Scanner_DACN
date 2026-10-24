// Exploratory dev-only analysis. Diagnostic patterns are NOT production rules
// or independently verified attack labels. Never reads the held-out test.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const dir = path.resolve(root, process.argv[2] || 'benchmark/results/prefilter-dev-247eA5');
const read = file => fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const summary = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json')));
if (summary.split !== 'dev') throw new Error('Analysis is restricted to dev');
const dataset = path.resolve(root, summary.dataset);
if (hash(dataset) !== summary.dataset_sha256) throw new Error('Dataset version mismatch');
const samples = read(dataset);
const predictions = new Map(read(path.join(dir, 'predictions.jsonl')).map(r => [r.id, r]));
if (predictions.size !== samples.length) throw new Error('Missing predictions');
const definitions = [
  ['response_corruption', /(?:\b(?:anagram\w*|scrambl\w*|rot13|leet\w*)\b|(?:replace|convert|swap|substitute|group|reverse)[^\n.!?]{0,110}(?:vowels?|letters?|characters?|words?|numbers?|symbols?)|(?:typos?|misspellings?)[^\n.!?]{0,60}(?:response|answer)|(?:response|answer)[^\n.!?]{0,60}(?:typos?|misspellings?))/i],
  ['promotion_or_response_addition', /(?:add|include|insert|integrate|incorporate|mention|promote|recommend)[^\n]{0,200}(?:your\s+(?:response|reply|answer)|in\s+(?:the|your)\s+(?:response|reply|answer))|(?:your\s+(?:response|reply|answer))[^\n]{0,100}(?:https?:|www\.)/i],
  ['translation_diversion', /(?:how\s+do\s+you\s+say|what(?:'s|\s+is)\s+[^\n?]{0,80}\s+in\s+(?:french|spanish|german|japanese|russian|italian|chinese)|(?:translate|equivalent)[^\n.!?]{0,100}(?:french|spanish|german|japanese|russian|italian|chinese))/i],
  ['code_insertion_or_network_operations', /(?:embed|integrat|incorporat|includ|employ|meld)[^\n]{0,100}(?:code\s+(?:snippet|section|excerpt)|following\s+code)|(?:requests|httpx)\.(?:post|get)\s*\(|smtplib|sendall\s*\(/i],
  ['off_task_question_candidates', /(?:what\s+(?:are|is|were)\s+(?:the\s+)?(?:main|primary|key|capital|causes|differences)|(?:explain|describe)\s+(?:the\s+)?(?:concept|process|history|importance|difference))/i],
];
const categories = definitions.map(([name, re]) => ({ name, re, outcomes: { TP: 0, FP: 0, TN: 0, FN: 0 }, examples: [] }));
const uncovered = [];
const fnByTask = {};
const danTokens = {};
const counters = { TP: 0, FP: 0, TN: 0, FN: 0 };
let coveredFn = 0;
const assignmentFd = fs.openSync(path.join(dir, 'dev-diagnostic-tags.jsonl'), 'w');
try {
  for (const sample of samples) {
    const prediction = predictions.get(sample.id);
    if (!prediction || prediction.label !== sample.label) throw new Error('Prediction alignment mismatch');
    counters[prediction.outcome]++;
    const tags = [];
    for (const category of categories) {
      const match = category.re.exec(sample.text);
      if (!match) continue;
      tags.push(category.name); category.outcomes[prediction.outcome]++;
      if (prediction.outcome === 'FN' && category.examples.length < 4) {
        category.examples.push({ id: sample.id, user_intent: sample.user_intent,
          excerpt: sample.text.slice(Math.max(0, match.index - 50), Math.min(sample.text.length, match.index + match[0].length + 100)) });
      }
    }
    if (prediction.matched_rule_ids.includes('IPI-DOC-DAN-JAILBREAK')) {
      for (const match of sample.text.matchAll(/\bDAN\b|\bDo\s+Anything\s+Now\b|\bAIM\s+mode\b|\bMaximum\s+jailbreak\b/gi)) {
        danTokens[match[0]] = (danTokens[match[0]] || 0) + 1;
      }
    }
    if (prediction.outcome === 'FN') {
      if (tags.length) coveredFn++;
      else uncovered.push(sample);
      const intent = sample.user_intent || '';
      const task = /^Summarize the following text\.?$/i.test(intent.trim()) ? 'summarization' :
        /^Q:\s*Find the \$ value/i.test(intent) ? 'email_payment_qa' :
          /(?:^|\n)(?:import |from |def |class )/.test(intent) ? 'code_like_intent' : 'other_qa_or_unknown';
      fnByTask[task] = (fnByTask[task] || 0) + 1;
    }
    fs.writeSync(assignmentFd, JSON.stringify({ id: sample.id, outcome: prediction.outcome, diagnostic_tags: tags }) + '\n');
  }
} finally { fs.closeSync(assignmentFd); }
for (const [key, value] of Object.entries(counters)) if (summary.metrics[key.toLowerCase()] !== value) throw new Error('Counts differ from baseline');
const report = {
  scope: 'Dev-only exploratory error analysis; no production rule changes, no test evaluation.',
  input_sha256: summary.dataset_sha256, baseline: path.relative(root, dir), confusion_matrix: counters,
  only_firing_rule: Object.keys(summary.by_rule), dan_pattern_surface_matches: danTokens,
  categories: categories.map(({ re, ...category }) => ({ ...category, diagnostic_regex: re.source,
    fn_fraction: category.outcomes.FN / counters.FN,
    benign_matches: category.outcomes.FP + category.outcomes.TN })),
  fn_with_at_least_one_diagnostic_tag: coveredFn, fn_without_diagnostic_tags: uncovered.length,
  fn_by_inferred_user_task: fnByTask,
  uncovered_examples: Array.from({ length: Math.min(12, uncovered.length) }, (_, i) => {
    const sample = uncovered[Math.floor(i * (uncovered.length - 1) / Math.max(1, Math.min(12, uncovered.length) - 1))];
    return { id: sample.id, user_intent: sample.user_intent, text: sample.text };
  }),
  limitations: [
    'Tags overlap; counts must not be added. They are exploratory lexical indicators, not verified category annotations.',
    'Tag matches on benign samples demonstrate why these expressions must not be copied directly into production rules.',
    'Task categories are inferred from user_intent, not original BIPIA task metadata.',
    'Dataset labels were not manually revalidated; malicious labels and a matching rule do not prove the rule identified the actual injected span.',
    'Generated benign and BIPIA malicious samples have different provenance, confounding source and class.',
  ],
};
fs.writeFileSync(path.join(dir, 'dev-miss-analysis.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, categories: report.categories.map(({ examples, diagnostic_regex, ...r }) => r), uncovered_examples: report.uncovered_examples.map(r => ({ id: r.id, text: r.text.slice(0, 100) })) }, null, 2));
