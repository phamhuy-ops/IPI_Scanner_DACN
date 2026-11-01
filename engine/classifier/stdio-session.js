const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');

// Chỉ gọi từ main/Node với đường dẫn worker tin cậy, không nhận lệnh từ tài liệu.
// Chưa gắn IPC renderer và chưa có worker inference Python trong sản phẩm.
function openClassifierSession({ executable, scriptPath, cwd, env, maxResponseBytes = 8 * 1024 * 1024 }) {
  if (typeof executable !== 'string' || !executable || typeof scriptPath !== 'string' || !scriptPath ||
      !Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1) throw new Error('Cấu hình tiến trình classifier không hợp lệ.');
  const child = spawn(executable, [scriptPath], { cwd, env: env || process.env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let pending = null;
  let stopped = false;
  let failure = null;
  let bytes = 0;
  let used = false;
  let closed = false;
  const finish = (error, value) => {
    if (!pending) return;
    const current = pending; pending = null;
    current.signal.removeEventListener('abort', current.abort);
    if (error) current.reject(error); else current.resolve(value);
  };
  const terminate = () => {
    if (stopped) return;
    stopped = true;
    finish(new Error('Tiến trình classifier đã bị chấm dứt.'));
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    child.stdin.destroy();
  };
  child.stdout.on('data', data => {
    bytes += data.length;
    if (bytes > maxResponseBytes) {
      failure = new Error('Phản hồi classifier vượt giới hạn byte.'); finish(failure); terminate();
    }
  });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  lines.on('line', line => {
    if (!pending || stopped) return;
    try { finish(null, JSON.parse(line)); }
    catch { failure = new Error('Worker classifier không trả JSON một dòng.'); finish(failure); terminate(); }
  });
  // Luôn đọc stderr để tránh deadlock; không đưa nội dung nguồn vào thông báo lỗi.
  child.stderr.on('data', () => {});
  child.stdin.on('error', error => { failure = error; finish(error); terminate(); });
  child.on('error', error => { failure = error; finish(error); terminate(); });
  child.on('close', (code, signal) => {
    closed = true;
    failure = failure || new Error(`Worker classifier kết thúc trước phản hồi (${code ?? signal}).`);
    finish(failure); lines.close();
  });
  return {
    get pid() { return child.pid; },
    get exited() { return closed || child.exitCode !== null || child.signalCode !== null; },
    classify(request, signal) {
      if (used || pending || stopped || failure) return Promise.reject(failure || new Error('Session classifier chỉ nhận một batch.'));
      used = true;
      if (signal.aborted) { terminate(); return Promise.reject(new Error('Tác vụ classifier đã bị hủy.')); }
      return new Promise((resolve, reject) => {
        const abort = () => { finish(new Error('Tác vụ classifier đã bị hủy.')); terminate(); };
        pending = { resolve, reject, signal, abort };
        signal.addEventListener('abort', abort, { once: true });
        try { child.stdin.write(JSON.stringify(request) + '\n'); }
        catch (error) { finish(error); terminate(); }
      });
    },
    terminate,
  };
}
module.exports = { openClassifierSession };
