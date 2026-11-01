// Một đầu vào cho công cụ đo đang duy trì; giữ các bộ thực thi đã có để không đổi phép đo.
const path = require('node:path');
require('./check-engines.js');
const { spawnSync } = require('node:child_process');
const commands = {
  agent: 'benchmark-agent-upgrade-30.cjs',
  'round-one': 'run-round-one-eval.cjs',
  report: 'report-agent-quality.cjs',
  replay: 'replay-agent-consistency.cjs',
  prefilter: 'run-prefilter-benchmark.cjs',
  controls: 'run-prefilter-controls.cjs',
};
const [command, ...args] = process.argv.slice(2);
if (!command || command === '--help' || command === 'help') {
  console.log([
    'Benchmark IPI Scanner — đầu vào công cụ dùng chung',
    'agent [--baseline thư-mục] [--paired yes] [--manifest JSON] [--baseline-config JSON] [--candidate-config JSON]  Mặc định30 ca; bộ mới dùng paired, so lịch sử phải khớp nguyên manifest/model.',
    '--latency-policy JSON  Ngân sách theo nhóm ngắn/dài đã khóa; không đổi deadline thực thi.',
    '--detector-model qwen3:4b-instruct-2507-q4_K_M  Đối chứng được cho phép, paired, không tải/đổi mặc định.',
    '--baseline-detector-model qwen3:4b-instruct-2507-q4_K_M  Giữ Detector Qwen3 đã cho phép; paired hoặc baseline lịch sử có cùng manifest/model.',
    '--stop-on-new-fp yes    Khóa trước đo việc loại sớm nếu FP vượt toàn baseline; không coi phần chưa chạy là đạt.',
    '--stop-on-proven-latency yes  Dừng giữa các ca nếu p95 chắc chắn vượt policy dù các ca còn lại mất0 giây; cần paired/policy.',
    'round-one [tùy chọn]   Đo core pipeline theo --manifest, --case, --contract, --verifier-output.',
    'report <thư mục> [audit uncertain]  Chấm schema baseline/candidate của bộ 30 ca.',
    'replay                Phát lại raw baseline; không đo chất lượng model mới.',
    'prefilter / controls  Đo rule, không thay thế kết quả Agent.',
    'Không truyền lệnh chỉ hiện trợ giúp, không gọi model. agent/round-one cần Ollama local.',
    'Công cụ lịch sử: benchmark/archives/don-dep-2026-10-28/.',
  ].join('\n'));
} else if (!Object.hasOwn(commands, command)) {
  console.error(`Lệnh không hỗ trợ: ${command}. Xem --help.`);
  process.exitCode = 1;
} else if (['replay', 'prefilter', 'controls'].includes(command) && args.length) {
  console.error(`Lệnh ${command} không nhận tùy chọn; không bỏ qua đối số để chạy nhầm phép đo.`);
  process.exitCode = 1;
} else if (command === 'report' && (args.length < 1 || args.length > 2)) {
  console.error('Cần report <thư mục kết quả> [file audit uncertain].');
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, [path.join(__dirname, commands[command]), ...args], {
    cwd: path.resolve(__dirname, '..'), stdio: 'inherit',
  });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
}
