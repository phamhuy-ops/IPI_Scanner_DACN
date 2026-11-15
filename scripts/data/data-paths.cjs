const path = require('node:path');

const legacyPaths = new Map([
  ['benchmark/ipi-baseline.json', 'data/manifests/ipi-baseline.json'],
  ['benchmark/data/splits/ipi-dev.jsonl', 'data/internal/dev/splits/ipi-dev.jsonl'],
  ['benchmark/data/skills-group-heldout-v1.json', 'data/internal/reserved/skills-group-heldout-v1.json'],
  ['benchmark/data/skills-independent-llmail-v1.json', 'data/internal/reserved/skills-independent-llmail-v1.json'],
]);
const legacyDirectories = [
  ['benchmark/data/splits/', 'data/internal/reserved/splits/'],
  ['benchmark/data/context-short-prompt-v1/', 'data/internal/dev/context-short-prompt-v1/'],
  ['benchmark/data/annotations/', 'data/internal/annotations/'],
  ['benchmark/data/processed/', 'data/external/processed/'],
  ['benchmark/data/incoming/', 'data/external/incoming/'],
  ['benchmark/data/audits/', 'data/external/audits/'],
  ['benchmark/fixtures/', 'data/fixtures/'],
  ['benchmark/kiem-thu/', 'data/fixtures/legacy/'],
  ['benchmark/experiments/', 'lab/experiments/'],
  ['benchmark/data/', 'data/manifests/'],
];

// Dùng đường dẫn hiện tại khi đọc manifest và hồ sơ khóa hash từ trước đợt di chuyển.
function resolveDataPath(root, file) {
  const relative = path.relative(root, path.resolve(root, file)).replaceAll('\\', '/');
  const movedFile = legacyPaths.get(relative);
  if (movedFile) return path.resolve(root, movedFile);

  const raw = /^benchmark\/data\/raw\/([^/]+)\/(.+)$/.exec(relative);
  if (raw) return path.resolve(root, 'data/external', raw[1], 'raw', raw[2]);

  const preview = /^benchmark\/experiments\/(verifier-local-release-v[12])\/(train|dev)\.preview\.jsonl$/.exec(relative);
  if (preview) return path.resolve(root, 'data/internal', preview[2], preview[1], `${preview[2]}.preview.jsonl`);

  const movedDirectory = legacyDirectories.find(([old]) => relative.startsWith(old));
  if (movedDirectory) {
    const [old, current] = movedDirectory;
    return path.resolve(root, current, relative.slice(old.length));
  }
  return path.resolve(root, file);
}

module.exports = { resolveDataPath };
