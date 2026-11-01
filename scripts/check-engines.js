const fs = require('fs');
const path = require('path');

function parseVersion(input) {
  if (!input) return null;
  const cleaned = String(input).trim().replace(/^v/, '');
  const parts = cleaned.split('.').map((p) => parseInt(p, 10));
  return {
    major: Number.isFinite(parts[0]) ? parts[0] : 0,
    minor: Number.isFinite(parts[1]) ? parts[1] : 0,
    patch: Number.isFinite(parts[2]) ? parts[2] : 0,
  };
}

function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function checkComparator(version, comparator) {
  const m = String(comparator).trim().match(/^(>=|<=|>|<|=)?\s*(\d+(?:\.\d+){0,2})$/);
  if (!m) return true;

  const op = m[1] || '=';
  const target = parseVersion(m[2]);
  const cmp = compareVersions(version, target);

  if (op === '>=') return cmp >= 0;
  if (op === '<=') return cmp <= 0;
  if (op === '>') return cmp > 0;
  if (op === '<') return cmp < 0;
  return cmp === 0;
}

function checkRange(versionText, rangeText) {
  const version = parseVersion(versionText);
  if (!version || !rangeText) return true;
  const comparators = String(rangeText).split(/\s+/).filter(Boolean);
  return comparators.every((c) => checkComparator(version, c));
}

function readNpmVersionFromUserAgent() {
  const ua = process.env.npm_config_user_agent || '';
  const match = ua.match(/npm\/(\d+(?:\.\d+){0,2})/i);
  return match ? match[1] : null;
}

function main() {
  const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const requiredNode = pkg.engines && pkg.engines.node;
  const requiredNpm = pkg.engines && pkg.engines.npm;

  const currentNode = process.version.replace(/^v/, '');
  const currentNpm = readNpmVersionFromUserAgent() || process.env.npm_version || '';

  const nodeOk = requiredNode ? checkRange(currentNode, requiredNode) : true;
  const npmOk = requiredNpm ? checkRange(currentNpm, requiredNpm) : true;

  if (nodeOk && npmOk) {
    process.stdout.write('Engine check passed.\n');
    return;
  }

  const lines = ['Engine check failed.'];
  if (!nodeOk) {
    lines.push(`- node required: ${requiredNode}, current: ${currentNode}`);
  }
  if (!npmOk) {
    lines.push(`- npm required: ${requiredNpm}, current: ${currentNpm || 'unknown'}`);
  }
  process.stderr.write(`${lines.join('\n')}\n`);
  process.exit(1);
}

function configureProjectStorage() {
  const configured = process.env.IPI_RUNTIME_ROOT;
  if (process.platform !== 'win32' && !configured) return null;
  const root = path.resolve(configured || 'E:\\IPI-Workspace\\IPI_Scanner');
  if (!configured && !fs.existsSync(root)) return null;
  if (process.platform === 'win32' && path.parse(root).root.toUpperCase() !== 'E:\\') {
    throw new Error('IPI_RUNTIME_ROOT phải là thư mục riêng trên ổ E.');
  }
  if (root === path.parse(root).root) throw new Error('Không dùng gốc ổ đĩa làm thư mục runtime.');
  fs.mkdirSync(root, { recursive: true });
  if (process.platform === 'win32' && path.parse(fs.realpathSync(root)).root.toUpperCase() !== 'E:\\') {
    throw new Error('Đích runtime thực không nằm trên ổ E.');
  }
  const temporary = path.join(root, 'tmp');
  fs.mkdirSync(temporary, { recursive: true });
  if (process.platform === 'win32' && path.parse(fs.realpathSync(temporary)).root.toUpperCase() !== 'E:\\') {
    throw new Error('Thư mục tạm thực không nằm trên E.');
  }
  // Chỉ đổi tiến trình dự án và worker con, không đổi TEMP toàn Windows.
  process.env.TEMP = temporary;
  process.env.TMP = temporary;
  process.env.TMPDIR = temporary;
  return temporary;
}

configureProjectStorage();
if (require.main === module) main();

function makeBenchmarkDirectory(prefix, outputRoot = path.resolve(__dirname, '..', 'benchmark', 'results')) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*-$/.test(prefix)) throw new Error('Prefix kết quả không hợp lệ.');
  const localRoot = path.resolve(outputRoot);
  const canonicalRoot = path.resolve(__dirname, '..', 'benchmark', 'results');
  const samePath = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
  const temporary = configureProjectStorage();
  fs.mkdirSync(localRoot, { recursive: true });
  // Tôn trọng --output riêng; không di chuyển dữ liệu/kết quả đã tồn tại.
  if (!temporary || !samePath(localRoot, canonicalRoot)) return fs.mkdtempSync(path.join(localRoot, prefix));
  const physicalRoot = path.join(path.dirname(temporary), 'benchmark', 'results');
  fs.mkdirSync(physicalRoot, { recursive: true });
  if (process.platform === 'win32' && path.parse(fs.realpathSync(physicalRoot)).root.toUpperCase() !== 'E:\\') {
    throw new Error('Kết quả benchmark thực phải nằm trên E.');
  }
  if (samePath(fs.realpathSync(localRoot), fs.realpathSync(physicalRoot))) return fs.mkdtempSync(path.join(localRoot, prefix));
  const physical = fs.mkdtempSync(path.join(physicalRoot, prefix));
  const alias = path.join(localRoot, path.basename(physical));
  // Chỉ tạo junction cho lượt mới; giữ đường dẫn C để raw/baseline vẫn tương thích.
  fs.symlinkSync(physical, alias, 'junction');
  return alias;
}

module.exports = { configureProjectStorage, makeBenchmarkDirectory };
