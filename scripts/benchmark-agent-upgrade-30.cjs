// Đo gói nâng cấp hiện tại trên đúng 30 ca cũ; không sửa Agent trong phép đo.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { runIpiDocScan } = require('../engine/scanner/ipi-doc-scan');
const { checkCitations } = require('./round-one-metrics.cjs');
const { qualityMetrics, latencyAssessment, provenLatencyFailure, canonicalModelShow } = require('./agent-quality-metrics.cjs');
const { makeBenchmarkDirectory } = require('./check-engines.js');
const root = path.resolve(__dirname, '..'), sha = b => crypto.createHash('sha256').update(b).digest('hex');
// Chặn cấu hình sai/đã gỡ trước khi gọi backend hoặc tạo hồ sơ đo.
function validatePipelineConfig(config, label = 'Cấu hình') {
  const values = { reviewContract: ['classic-v1', 'classic-spans-v1', 'structured-v1', 'referenced-v1'],
    verifierOutput: ['standard', 'compact-v1'], reviewArchitecture: ['candidate-only-v1'], evidencePresentation: ['stable-alias-v1'], detectorFlow: ['source-review-v1', 'source-review-compact-v1'],
    sourceReferencePolicy: ['content-only-v1'], skillReview: ['frozen-skills-v1'], contextDependencyModel: ['qwen3:4b-instruct-2507-q4_K_M'], verifierEvidenceMode: ['split-views-multiple-targets-v1'] };
  const permitted = [...Object.keys(values), 'referenceBatchSize', 'actionAudit', 'analysisTimeoutMs'];
  if (!config || Array.isArray(config) || typeof config !== 'object' || Object.keys(config).some(key => !permitted.includes(key))) throw Error(label + ': trường không hỗ trợ hoặc đã gỡ; không đổi model/backend/input qua JSON.');
  for (const [key, allowed] of Object.entries(values)) if (Object.hasOwn(config, key) && !allowed.includes(config[key])) throw Error(label + ': giá trị không hỗ trợ hoặc đã gỡ: ' + key);
  if (Object.hasOwn(config, 'actionAudit') && typeof config.actionAudit !== 'boolean') throw Error(label + ': actionAudit phải là boolean.');
  if(config.analysisTimeoutMs!==undefined&&(!Number.isInteger(config.analysisTimeoutMs)||config.analysisTimeoutMs<1000||config.analysisTimeoutMs>180000))throw Error(label+': deadline không hợp lệ.');
  if(config.sourceReferencePolicy && config.detectorFlow!=='source-review-compact-v1')throw Error(label+': lọc mã yêu cầu source compact.');
  const classic = !config.reviewContract || config.reviewContract === 'classic-v1', standard = !config.verifierOutput || config.verifierOutput === 'standard';
  if (config.contextDependencyModel && config.detectorFlow !== 'source-review-compact-v1') throw Error(label + ': rà phụ thuộc ngữ cảnh yêu cầu luồng compact.');
  if (config.verifierEvidenceMode && config.detectorFlow !== 'source-review-compact-v1') throw Error(label + ': tách source view yêu cầu luồng compact.');
  if (config.detectorFlow && (!classic || !standard || config.actionAudit || config.reviewArchitecture)) throw Error(label + ': source-review-v1 yêu cầu classic-v1/standard, không ghép thí nghiệm khác.');
  if (config.evidencePresentation && (!classic || !standard || config.actionAudit || config.reviewArchitecture)) throw Error(label + ': evidence alias yêu cầu classic-v1/standard, không ghép actionAudit/candidate-only.');
  if (config.actionAudit && (!classic || !standard || config.reviewArchitecture)) throw Error(label + ': actionAudit yêu cầu classic-v1/standard.');
  if (config.reviewArchitecture && (!classic || !standard)) throw Error(label + ': candidate-only yêu cầu classic-v1/standard.');
  if (config.verifierOutput === 'compact-v1' && config.reviewContract !== 'referenced-v1') throw Error(label + ': compact-v1 yêu cầu referenced-v1.');
  if (Object.hasOwn(config, 'referenceBatchSize') && (!['referenced-v1', 'classic-spans-v1'].includes(config.reviewContract)
    || !Number.isSafeInteger(config.referenceBatchSize) || config.referenceBatchSize < 1)) throw Error(label + ': referenceBatchSize phải nguyên dương và dùng hợp đồng tham chiếu.');
}

// Chỉ mở rộng phép so lịch sử khi chính bộ ca/model đã khóa khớp; không ghép hai bộ khác nhau.
function validateHistoricalManifest(cases, oldPlan, oldRows, models) {
  const canonical = value => {
    if (!value) return undefined;
    const { file: _materializedPath, ...data } = value;
    data.evaluation_group = data.evaluation_group || data.group_id;
    return JSON.stringify(data, (_key, row) => row && typeof row === 'object' && !Array.isArray(row)
      ? Object.fromEntries(Object.keys(row).sort().map(key => [key, row[key]])) : row);
  };
  const previous = new Map((oldPlan.cases || []).map(row => [row.id, row]));
  const observations = new Map(oldRows.map(row => [row.id, row]));
  if (!cases.length || previous.size !== cases.length || oldPlan.cases.length !== cases.length
    || observations.size !== cases.length || oldRows.length !== cases.length) throw Error('Baseline lịch sử không có cùng toàn bộ manifest.');
  const detector = oldPlan.configuration?.fixModel || oldPlan.configuration?.models?.[0];
  const verifier = oldPlan.configuration?.checkModel || oldPlan.configuration?.models?.[1];
  if (detector !== models[0] || verifier !== models[1]) throw Error('Model chính khác baseline lịch sử; cần paired.');
  for (const item of cases) {
    if (canonical(previous.get(item.id)) !== canonical(item) || observations.get(item.id)?.label !== item.label) {
      throw Error('Manifest khác baseline lịch sử: ' + item.id);
    }
  }
}
async function main() {
  const args = process.argv.slice(2), settings = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--baseline', '--baseline-arm', '--manifest', '--baseline-config', '--candidate-config', '--baseline-detector-model', '--detector-model', '--verifier-model', '--candidate-verifier-model', '--latency-policy', '--stop-on-new-fp', '--stop-on-proven-latency', '--paired'].includes(args[i]) || !args[i + 1] || settings[args[i]]) throw Error('Dùng --baseline <thư mục> [--manifest JSON] [--baseline-config JSON] [--candidate-config JSON] [--baseline-detector-model model-được-phép] [--detector-model model-được-phép] [--latency-policy JSON] [--stop-on-new-fp yes] [--stop-on-proven-latency yes] [--paired yes].');
    settings[args[i]] = args[i + 1];
  }
  const baseline = settings['--baseline'] || 'benchmark/results/agent-flow-nv9OXO';
  const candidateConfig = settings['--candidate-config'] && path.relative(root, path.resolve(root, settings['--candidate-config'])).replaceAll('\\', '/');
  if (candidateConfig && (!candidateConfig.startsWith('benchmark/') || !candidateConfig.endsWith('.json'))) throw Error('Cấu hình thử phải là JSON trong benchmark.');
  const pipelineOptions = candidateConfig ? JSON.parse(fs.readFileSync(path.join(root, candidateConfig), 'utf8')) : {};
  validatePipelineConfig(pipelineOptions, 'Cấu hình candidate');
  if (settings['--stop-on-new-fp'] && settings['--stop-on-new-fp'] !== 'yes') throw Error('Cờ dừng FP phải là yes.');
  if (settings['--paired'] && settings['--paired'] !== 'yes') throw Error('Cờ paired phải là yes.');
  const paired = settings['--paired'] === 'yes';
  const baselineConfig = settings['--baseline-config'] && path.relative(root, path.resolve(root, settings['--baseline-config'])).replaceAll('\\', '/');
  if (baselineConfig && (!paired || !baselineConfig.startsWith('benchmark/') || !baselineConfig.endsWith('.json'))) throw Error('Cấu hình baseline phải là JSON trong benchmark và dùng paired.');
  const baselinePipelineOptions = baselineConfig ? JSON.parse(fs.readFileSync(path.join(root, baselineConfig), 'utf8')) : {};
  validatePipelineConfig(baselinePipelineOptions, 'Cấu hình baseline');
  const verifierModel=settings['--verifier-model'];
  if(verifierModel&&(!paired||verifierModel!=='qwen3:4b-instruct-2507-q4_K_M'))throw Error('Đối chứng Verifier chỉ dùng Qwen3 4B đã cho phép và paired.');
  const selectedVerifier=verifierModel||'qwen2.5-coder:1.5b';
  const candidateVerifier=settings['--candidate-verifier-model'];
  if(candidateVerifier&&(!paired||candidateVerifier!=='qwen2.5:1.5b-instruct'))throw Error('Đối chứng Verifier Instruct chỉ dùng model có sẵn đã cho phép và paired.');
  const nextVerifier=candidateVerifier||selectedVerifier;
  const detectorModel = settings['--detector-model'];
  const baselineDetectorModel = settings['--baseline-detector-model'];
  if (baselineDetectorModel && ((!paired && !settings['--manifest']) || baselineDetectorModel !== 'qwen3:4b-instruct-2507-q4_K_M')) throw Error('Model Detector baseline chỉ hỗ trợ Qwen3 4B đã cho phép, paired hoặc manifest lịch sử khớp.');
  if (detectorModel && (!paired || detectorModel !== 'qwen3:4b-instruct-2507-q4_K_M')) throw Error('Chỉ hỗ trợ đối chứng Detector Qwen3 4B có sẵn đã được người dùng cho phép, bắt buộc paired.');
  const baseDetector = baselineDetectorModel || 'gemma3:1b', nextDetector = detectorModel || baseDetector;
  const exactRequestRequired = baseDetector === nextDetector && JSON.stringify(baselinePipelineOptions) === JSON.stringify(pipelineOptions);
  if (!path.resolve(root, baseline).startsWith(path.join(root, 'benchmark', 'results') + path.sep)) throw Error('Baseline phải ở benchmark/results.');
  const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const oldPlan = read(baseline + '/giao-thuc.json'), sourceRows = read(baseline + '/cases.json');
  const baselineArm=settings['--baseline-arm']||'candidate';
  if(!['baseline','candidate'].includes(baselineArm)||settings['--baseline-arm']&&paired)throw Error('baseline-arm chỉ dùng baseline/candidate cho so lịch sử.');
  const oldRows = sourceRows.some(row => row.arm) ? sourceRows.filter(row => row.arm === baselineArm) : sourceRows;
  if (settings['--baseline'] && read(baseline + '/tien-do.json').status !== 'complete') throw Error('Không dùng baseline chưa hoàn tất.');
  const manifestFile = settings['--manifest'] && path.relative(root, path.resolve(root, settings['--manifest'])).replaceAll('\\', '/');
  if (manifestFile && (!manifestFile.startsWith('benchmark/data/') || !manifestFile.endsWith('.json'))) throw Error('Manifest phải ở benchmark/data. Bộ mới cần paired; so lịch sử chỉ dùng chính bộ cũ.');
  const manifest = manifestFile ? read(manifestFile) : oldPlan;
  const cases = manifest.cases.map(item => ({ ...item, evaluation_group: item.evaluation_group || item.group_id }));
  if (manifestFile && !paired) validateHistoricalManifest(manifest.cases, oldPlan, oldRows, [baseDetector, selectedVerifier]);
  const latencyFile = settings['--latency-policy'] && path.relative(root, path.resolve(root, settings['--latency-policy'])).replaceAll('\\', '/');
  if (latencyFile && (!latencyFile.startsWith('benchmark/') || !latencyFile.endsWith('.json'))) throw Error('Policy latency phải ở benchmark.');
  const latencyPolicy = latencyFile ? read(latencyFile) : undefined;
  if (latencyPolicy) latencyAssessment(cases, [], [], latencyPolicy);
  if (settings['--stop-on-proven-latency'] && (settings['--stop-on-proven-latency'] !== 'yes' || !paired || !latencyPolicy)) throw Error('Dừng latency cần yes, paired và policy đã khóa.');
  if ((!manifestFile && (cases.length !== 30 || oldRows.length !== 30)) || !cases.length || new Set(cases.map(row => row.id)).size !== cases.length) throw Error('Bộ ca rỗng, trùng ID hoặc baseline không đủ30 ca.');
  qualityMetrics(cases, []);
  for (const item of cases) {
    if (sha(Buffer.from(item.text)) !== item.input_sha256 || (!manifestFile && oldRows.find(row => row.id === item.id)?.label !== item.label)) throw Error('Nội dung/nhãn khác manifest đã khóa: ' + item.id);
  }
  const maximumChatRequests = (pipelineOptions.skillReview?cases.length*12:0)+Math.max(140, cases.length * (3 + (pipelineOptions.contextDependencyModel ? 1 : 0)
    + (paired ? 3 + (baselinePipelineOptions.contextDependencyModel ? 1 : 0) : 0)));
  const models = [baseDetector, selectedVerifier];
  if(verifierModel&&models[1]!==verifierModel)throw Error('Verifier thực tế không khớp model đã yêu cầu.');
  const allModels = [...new Set([...models, nextVerifier, ...(detectorModel ? [detectorModel] : []),
    ...[pipelineOptions.contextDependencyModel, baselinePipelineOptions.contextDependencyModel,...(pipelineOptions.skillReview||baselinePipelineOptions.skillReview?['qwen3:4b-instruct-2507-q4_K_M']:[])].filter(Boolean)])];
  const api = async (endpoint, body) => {
    const r = await fetch('http://127.0.0.1:11434' + endpoint, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw Error('Ollama HTTP ' + r.status); return r.json();
  };
  const tags = await api('/api/tags'), version = await api('/api/version'), templates = {};
  if (version.version !== oldPlan.ollama.version) throw Error('Runtime khác baseline; không tự cập nhật.');
  for (const model of allModels) {
    if (tags.models.find(row => row.name === model)?.digest !== oldPlan.models.models.find(row => row.name === model)?.digest) throw Error('Model khác hoặc chưa có: ' + model);
    templates[model] = await api('/api/show', { model });
    canonicalModelShow(templates[model]);
    if (oldPlan.templates?.[model] && canonicalModelShow(templates[model]) !== canonicalModelShow(oldPlan.templates[model])) throw Error('Template khác baseline: ' + model);
  }
  const out = makeBenchmarkDirectory(manifestFile ? `agent-eval-${cases.length}-` : 'agent-upgrade-30-');
  const save = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2));
  const files = ['scripts/benchmark-agent-upgrade-30.cjs', 'scripts/check-engines.js', 'scripts/agent-quality-metrics.cjs', 'scripts/round-one-metrics.cjs', 'scripts/report-agent-quality.cjs',
    'src/types.ts', 'package.json', 'package-lock.json', baseline + '/giao-thuc.json', baseline + '/cases.json', baseline + '/model-calls.json'];
  if (candidateConfig) files.push(candidateConfig);
  if (baselineConfig) files.push(baselineConfig);
  if (latencyFile) files.push(latencyFile);
  if (manifestFile) files.push(manifestFile);
  for (const dir of ['src/ai/agents', 'engine']) for (const file of fs.readdirSync(path.join(root, dir), { recursive: true })) {
    if (/\.(?:ts|tsx|js)$/.test(file)) files.push(`${dir}/${file.replaceAll('\\', '/')}`);
  }
  const fingerprint = () => Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
  if(pipelineOptions.skillReview||baselinePipelineOptions.skillReview)files.push('skills/frozen/integration-v2.json','skills/lib/runtime.cjs','skills/lib/contracts.cjs','skills/lib/source-bindings.cjs');
  const before = fingerprint();
  for (const file of files) { const dest = path.join(out, 'source-snapshot', file + '.snapshot'); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, file), dest); }
  const limits = [paired ? 'Baseline và candidate gọi model mới trên cùng code/input path, hai pha tuần tự; tải máy và hiệu ứng thứ tự vẫn là giới hạn.' : 'So lịch sử, không phải A/B đồng thời; chưa thể quy hiệu quả cho từng thay đổi trong gói.',
    manifestFile ? 'Giữ nguyên toàn bộ manifest đã khóa; xem vai trò dữ liệu trong manifest và không mặc định là độc lập; giữ grouping/giới hạn của manifest, không phải holdout hoặc lấy mẫu ngẫu nhiên toàn bộ HF.' : 'Giữ nguyên 30 ca dev cũ, chưa phải holdout hoặc lấy mẫu ngẫu nhiên toàn bộ HF; nhóm theo baseline chưa phải audit gần trùng mới.',
    'Chạy core pipeline qua bridge Node với file thật và HTTP local; chưa UI/native IPC hoặc model toàn bộ PDF/DOCX dài.',
    oldPlan.templates ? 'Runtime, digest và template chính khớp hồ sơ baseline.' : 'Runtime và digest khớp; baseline không giữ template đầy đủ để đối chiếu lịch sử.',
    paired ? 'Cùng file input cho hai pha; nguồn phải giống hệt. Chỉ bắt buộc request giống khi cấu hình hai pha giống nhau; khác biệt được lưu. Nhãn/nguồn/đáp án không đưa vào input.' : 'Đường dẫn thư mục input mới khác baseline, tên file trung tính giữ như cũ; nhãn/ID/nguồn không được đưa vào input.',
    'Split recovery đo đúng code hiện tại; batch con còn >=2 có thể tách tiếp, không giả định chỉ một tầng.'];
  save('giao-thuc.json', { cases, baseline, baseline_arm:baselineArm, manifest_file: manifestFile, manifest_role:manifest.role||manifest.evaluation_role||'development', frozen_skills_sha256:(pipelineOptions.skillReview?sha(fs.readFileSync(path.join(root,'skills/frozen/integration-v2.json'))):undefined), manifest_provenance: manifestFile ? { source_sha256: manifest.source_sha256, grouping: manifest.grouping, limits: manifest.limits } : undefined,
    baseline_code_sha256: paired ? before : oldPlan.code_sha256, baseline_configuration: oldPlan.configuration,
    configuration: { models, seed: 42, temperature: 0, max_tokens: 1400, contract: 'classic-v1', profile: 'balanced', base_default_deadline_ms: 180000, effective_deadline_ms: { baseline: baselinePipelineOptions.analysisTimeoutMs||180000, candidate:pipelineOptions.analysisTimeoutMs||180000 } },
    ...(candidateVerifier ? {verifier_model_comparison:{baseline:models[1],candidate:nextVerifier,detector:baseDetector,authorization:'Đối chứng Qwen2.5 1.5B Instruct có sẵn, đã được người dùng cho phép; không đổi Agent mặc định.'}} : {}),
    models: tags, ollama: version, templates, node: process.version, code_sha256: before,
    model_pin_policy: 'digest-and-canonical-show-v1: khóa digest và mọi trường show trừ Modelfile sinh lại; chuẩn hóa thứ tự khóa parameters, giữ thứ tự giá trị cùng khóa. Raw show vẫn lưu.',
    baseline_pipeline_options: baselinePipelineOptions, candidate_pipeline_options: { ...pipelineOptions, ...(candidateVerifier ? {checkModel: nextVerifier} : {}), ...(detectorModel ? { fixModel: detectorModel } : {}) }, latency_policy: latencyPolicy,
    ...(detectorModel || baselineDetectorModel ? { detector_model_comparison: { baseline: models[0], candidate: nextDetector, verifier: models[1],
      authorization: 'Người dùng cho phép đối chứng Qwen3 4B có sẵn ở Detector; không tải/train/đổi Agent mặc định.',
      limitation: 'Đổi Detector có thể đổi bằng chứng đầu vào Verifier; giữ model/prompt/schema Verifier, không giả định phản hồi hoặc payload Verifier bất biến.' } } : {}),
    early_stop: settings['--stop-on-new-fp'] ? 'Dừng ngay khi số benign bị trả ipi_detected vượt toàn baseline; giữ bộ chọn30, không báo như chạy đủ.' : null,
    early_stop_latency: settings['--stop-on-proven-latency'] ? 'Dừng giữa các ca khi cận dưới p95 toàn cohort (ca chưa đo gán0) đã vượt policy đã khóa; không chấm như đủ bộ.' : null,
    command: ['node scripts/benchmark-agent-upgrade-30.cjs', ...args].join(' '),
    comparison_type: paired ? 'live_same_code_same_input_path_two_phases' : 'historical_same_frozen_cases', baseline_model_calls_replayed: false, budget: { maximum_chat_requests: maximumChatRequests, training: 0, downloads: 0 },
    decision: `Đủ ${cases.length} ca mỗi nhánh; so TP/FP/FN, precision/recall/F1/FPR, lỗi/abstention/coverage/latency. Audit uncertain trước khi tính đúng. Không sửa code/nhãn khi đo, không tuyên bố90% khi thiếu độc lập/pipeline.`, limits });
  const historical = oldRows.map(row => ({ ...row, arm: 'baseline', origin: 'historical_raw_preserved' }));
  const rows = [], calls = [];
  const frozenSkills=(pipelineOptions.skillReview||baselinePipelineOptions.skillReview)?require('../skills/lib/runtime.cjs').createSkillReviewer({transport:async(request,deadline)=>{if(calls.length>=maximumChatRequests||!allModels.includes(request.model))throw Error('Vượt budget hoặc model chưa khóa.');const r=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(Math.max(1,deadline-Date.now()))});if(!r.ok)throw Error('HTTP '+r.status);return r.json();},onCall:call=>{calls.push({id:active.id,case_id:active.id,arm,model:call.request.model,route:'/api/chat',...call});save('model-calls.json',calls);}}):null;
  let active, arm = 'candidate', rejection, peakRss = process.memoryUsage().rss;
  const baseRows = () => paired ? rows.filter(row => row.arm === 'baseline') : historical;
  const candidateRows = () => rows.filter(row => row.arm === 'candidate');
  const timer = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 100);
  const progress = status => {
    save('cases.json', [...(paired ? [] : historical), ...rows]); save('model-calls.json', calls);
    save('tien-do.json', { status, completed: rows.length, total: cases.length * (paired ? 2 : 1), baseline_completed: baseRows().length,
      candidate_completed: candidateRows().length, live_calls: calls.length, harness_peak_rss: peakRss });
    save('tong-hop.json', { status, selected: cases.length, completed: rows.length, calls: calls.length,
      baseline: qualityMetrics(cases, baseRows()), after: qualityMetrics(cases, candidateRows()),
      kind_counts: candidateRows().flatMap(row => row.state.suspicions).reduce((out, row) => { if (row.needsReviewKind) out[row.needsReviewKind] = (out[row.needsReviewKind] || 0) + 1; return out; }, {}),
      limits, default_changed_by_benchmark: false, priority_one_complete: false });
  };
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, root, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  try {
    const { runIpiDocumentPipeline } = await server.ssrLoadModule('/src/ai/agents/document/ipiPipeline.ts');
    globalThis.owaspWorkbench = { scanIpiDoc: (files, scanProfile) => runIpiDocScan(files, { scanProfile }), aiFetch: async payload => {
      if (new URL(payload.url).origin !== 'http://127.0.0.1:11434') throw Error('Chỉ local Ollama.');
      const body = JSON.parse(payload.body), chat = payload.url.endsWith('/chat/completions');
      if (chat) { if (calls.length >= maximumChatRequests || !allModels.includes(body.model)) throw Error('Vượt budget hoặc model đã khóa.'); body.seed = 42; }
      const start = performance.now();
      try {
        const response = await fetch(payload.url, { method: payload.method || 'POST', headers: payload.headers, body: JSON.stringify(body), signal: AbortSignal.timeout(payload.timeoutMs || 45000) });
        const raw = await response.text();
        if (chat) { calls.push({ id: active.id, case_id: active.id, arm, model: body.model, request: body, raw, response: raw,
          status: response.status, seconds: (performance.now() - start) / 1000, resources: await api('/api/ps').catch(() => null) }); save('model-calls.json', calls); }
        return { ok: response.ok, status: response.status, body: raw };
      } catch (error) {
        if (chat) { calls.push({ id: active.id, case_id: active.id, arm, model: body.model, request: body, error: error.message, seconds: (performance.now() - start) / 1000 }); save('model-calls.json', calls); }
        return { ok: false, status: 0, body: '', error: error.message };
      }
    } };
    fs.mkdirSync(path.join(out, 'input')); progress('running'); console.log(JSON.stringify({ out, cases: cases.length }));
    phases: for (const phase of paired ? ['baseline', 'candidate'] : ['candidate']) {
    arm = phase;
    for (const [caseIndex, item] of cases.entries()) {
      if ((await api('/api/version')).version !== version.version) throw Error('Runtime đổi trong lúc đo.');
      active = item;
      const inputDirectory = path.join(out, 'input', String(caseIndex + 1).padStart(3, '0'));
      fs.mkdirSync(inputDirectory, { recursive: true });
      const file = path.join(inputDirectory, 'document' + item.format); fs.writeFileSync(file, item.text);
      const start = performance.now();
      const phaseOptions=arm==='candidate'?pipelineOptions:baselinePipelineOptions;
      const {skillReview,...coreOptions}=phaseOptions;
      const skillAudit=skillReview?{version:'frozen-skills-v1',configurationHash:frozenSkills.configurationHash,reviewer:frozenSkills.reviewer}:undefined;
      const state = await runIpiDocumentPipeline({ filePaths: [file], fixModel: arm === 'candidate' && detectorModel ? detectorModel : models[0], checkModel: arm === 'candidate' ? nextVerifier : models[1], scanProfile: 'balanced', reviewContract: 'classic-v1', verifierOutput: 'standard', analysisTimeoutMs: 180000, ...coreOptions,...(skillAudit?{skillAudit}:{}) });
      const p = state.reviewProgress, complete = p && p.selectedChunkIds.every(id => p.detectorReviewedChunkIds.includes(id) && p.verifierReviewedChunkIds.includes(id));
      rows.push({ id: item.id, arm, source: item.source, group_id: item.group_id, language: item.language, label: item.label,
        verdict: state.check?.verdict, processing: state.processingStatus, coverage_limited: state.scanResult?.metadata.coverage?.coverageLimited !== false || !complete || state.contextDependencyReview?.coverageLimited === true || state.skillAudit?.coverageLimited === true,
        agent_uncertain: state.suspicions.some(row => row.detector?.stance === 'uncertain' || row.verifier?.stance === 'uncertain'),
        seconds: (performance.now() - start) / 1000, citations: checkCitations(state), state });
      progress('running'); console.log(JSON.stringify({ done: rows.length, total: cases.length * (paired ? 2 : 1), arm, id: item.id, verdict: state.check?.verdict, processing: state.processingStatus, failures: state.batchFailures?.length || 0 }));
      if (arm === 'candidate' && settings['--stop-on-new-fp'] && candidateRows().filter(row => row.label === 'benign' && row.verdict === 'ipi_detected').length > baseRows().filter(row => row.label === 'benign' && row.verdict === 'ipi_detected').length) {
        rejection = { reason: 'Số FP raw vượt toàn baseline; loại sớm, không tính phần chưa chạy là đúng.', trigger: item.id }; break phases;
      }
      if (arm === 'candidate' && settings['--stop-on-proven-latency']) {
        const proof = provenLatencyFailure(cases, baseRows(), candidateRows(), latencyPolicy);
        if (proof.proven_failure) { rejection = { reason: 'Không thể qua cổng latency đã khóa dù mọi ca còn lại mất0 giây; không chấm như đủ bộ.', trigger: item.id, latency_proof: proof }; break phases; }
      }
      if (rows.length >= 3 && rows.slice(-3).every(row => row.processing === 'model_error')) throw Error('Ba lỗi model liên tiếp; dừng, không chấm như đủ bộ.');
    }
    }
    const after = await api('/api/tags');
    const modelPinChecks = {};
    for (const model of allModels) {
      const currentShow = await api('/api/show', { model });
      const beforeHash = sha(canonicalModelShow(templates[model])), afterHash = sha(canonicalModelShow(currentShow));
      const digestMatch = after.models.find(row => row.name === model)?.digest === tags.models.find(row => row.name === model).digest;
      modelPinChecks[model] = { digest_match: digestMatch, canonical_before_sha256: beforeHash, canonical_after_sha256: afterHash,
        raw_show_equal: JSON.stringify(currentShow) === JSON.stringify(templates[model]), after_show: currentShow };
      save('model-lock-check.json', modelPinChecks);
      if (!digestMatch || beforeHash !== afterHash) throw Error('Model/template đổi khi đo.');
    }
    if (JSON.stringify(before) !== JSON.stringify(fingerprint())) throw Error('Mã/nguồn thay đổi trong lúc đo.');
    if (paired) {
      const isolation = candidateRows().map(item => {
        const initial = phase => calls.find(call => call.id === item.id && call.arm === phase && call.model === (phase === 'candidate' && detectorModel ? detectorModel : models[0]));
        const left = initial('baseline'), right = initial('candidate');
        const content = call => { try { return JSON.parse(call.raw).choices?.[0]?.message?.content; } catch { return undefined; } };
        const sourceContext = phase => {
          const record = rows.find(row => row.id === item.id && row.arm === phase);
          return record?.state.scanResult?.metadata.semanticChunks?.map(chunk => ({ chunkId: chunk.chunkId, text: chunk.text,
            filePath: chunk.filePath, startLine: chunk.startLine, endLine: chunk.endLine, sourceView: chunk.sourceView }));
        };
        return { id: item.id, initial_detector_request_equal: !!left && !!right && JSON.stringify(left.request) === JSON.stringify(right.request),
          initial_detector_request_equal_except_model: !!left && !!right && JSON.stringify({ ...left.request, model: 'same-model' }) === JSON.stringify({ ...right.request, model: 'same-model' }),
          initial_detector_contents_equal: typeof content(left) === 'string' && content(left) === content(right),
          source_context_equal: !!sourceContext('baseline') && JSON.stringify(sourceContext('baseline')) === JSON.stringify(sourceContext('candidate')) };
      });
      save('input-isolation.json', { rows: isolation, all_initial_detector_requests_equal: isolation.length > 0 && isolation.every(row => row.initial_detector_request_equal),
        all_initial_detector_contents_equal: isolation.length > 0 && isolation.every(row => row.initial_detector_contents_equal),
        all_source_contexts_equal: isolation.length > 0 && isolation.every(row => row.source_context_equal),
        exact_request_required: exactRequestRequired });
      // Config có thể chủ ý đổi prompt/schema; nguồn vẫn phải giống hệt hai pha.
      if (isolation.some(row => !row.source_context_equal || (exactRequestRequired && !row.initial_detector_request_equal)
        || (detectorModel && JSON.stringify(baselinePipelineOptions) === JSON.stringify(pipelineOptions) && !row.initial_detector_request_equal_except_model))) throw Error('Nguồn hoặc request bất biến không được cô lập giữa hai pha.');
    }
    progress(rejection ? 'rejected_incomplete' : 'complete');
    if (rejection) { save('quyet-dinh.json', { status: 'rejected_incomplete', ...rejection, observed: candidateRows().length, selected: cases.length, not_run: cases.length - candidateRows().length, code_hashes_unchanged_at_stop: true, independent: false, priority_one_complete: false }); process.exitCode = 2; }
    console.log(JSON.stringify({ complete: !rejection, rejection, out, live_calls: calls.length }));
  } catch (error) { progress('failed'); save('loi.json', { error: error.message }); throw error; }
  finally { clearInterval(timer); delete globalThis.owaspWorkbench; await server.close(); }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { validatePipelineConfig, validateHistoricalManifest };
