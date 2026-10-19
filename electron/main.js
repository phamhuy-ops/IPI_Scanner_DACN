const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { spawn } = require('child_process');
const { runIpiDocScan, SUPPORTED_DOC_EXTENSIONS } = require('../engine/scanner/ipi-doc-scan');
const { DOCUMENT_COLLECTION_CONFIG } = require('../engine/config/document-scan-config');

const OLLAMA_TAGS_URL = 'http://127.0.0.1:11434/api/tags';
let currentScanAbort = null;
let ollamaLaunchAttempt = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getOllamaModels(timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(OLLAMA_TAGS_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`Ollama trả về HTTP ${response.status}.`);
    const data = await response.json();
    return Array.isArray(data?.models)
      ? data.models.map((model) => model.name || model.model).filter(Boolean)
      : [];
  } finally {
    clearTimeout(timer);
  }
}

async function ensureOllamaReady() {
  try {
    return { models: await getOllamaModels(), started: false };
  } catch (initialError) {
    if (!ollamaLaunchAttempt) {
      ollamaLaunchAttempt = new Promise((resolve, reject) => {
        const child = spawn('ollama', ['serve'], { detached: true, stdio: 'ignore', windowsHide: true });
        child.once('error', reject);
        child.once('spawn', () => {
          child.unref();
          resolve();
        });
      }).finally(() => { ollamaLaunchAttempt = null; });
    }

    try {
      await ollamaLaunchAttempt;
    } catch {
      throw new Error('Ollama chưa chạy và ứng dụng không tìm thấy lệnh "ollama". Hãy mở Ollama hoặc cài Ollama rồi thử lại.');
    }

    for (let attempt = 0; attempt < 16; attempt += 1) {
      await sleep(500);
      try {
        return { models: await getOllamaModels(1000), started: true };
      } catch {
        // Ollama may need a few seconds to initialize after launch.
      }
    }

    const detail = initialError instanceof Error ? initialError.message : 'Không rõ nguyên nhân';
    throw new Error(`Đã thử khởi động Ollama nhưng chưa kết nối được (${detail}).`);
  }
}

function getWindowIconPath() {
  return app.isPackaged
    ? path.join(__dirname, 'renderer', 'app-icon.png')
    : path.join(__dirname, '..', 'build', 'icon.png');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: 'SENTINEL - Local TinyLLM IPI Defense',
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

async function collectDocumentFiles(folderPath, abortSignal) {
  const files = [];
  async function walk(currentPath) {
    if (abortSignal.aborted) throw new Error('Scan đã bị hủy.');
    if (files.length >= DOCUMENT_COLLECTION_CONFIG.maxDocumentsPerScan) return;
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (abortSignal.aborted) throw new Error('Scan đã bị hủy.');
      if (files.length >= DOCUMENT_COLLECTION_CONFIG.maxDocumentsPerScan) return;
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory() && !DOCUMENT_COLLECTION_CONFIG.skippedFolders.has(entry.name)) await walk(entryPath);
      if (entry.isFile() && SUPPORTED_DOC_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(entryPath);
    }
  }
  await walk(folderPath);
  return files;
}

async function runDocumentScan(event, filePaths, folderPath, scanProfile) {
  currentScanAbort?.abort('New scan started');
  const abortController = new AbortController();
  currentScanAbort = abortController;
  try {
    const onProgress = (message) => {
      try { event.sender.send('scan:progress', message); } catch {}
    };
    return await runIpiDocScan(filePaths, { onProgress, folderPath, scanProfile });
  } catch (error) {
    return {
      ok: false,
      mode: 'ipi-doc-scan',
      findings: [],
      error: error?.message || 'Không thể quét tài liệu.',
      metadata: { summary: { total: 0, byCategory: {}, bySeverity: {} } },
    };
  } finally {
    if (currentScanAbort === abortController) currentScanAbort = null;
  }
}

ipcMain.handle('dialog:pickFolder', async () => {
  const result = await dialog.showOpenDialog({ title: 'Chọn thư mục tài liệu', properties: ['openDirectory'] });
  return result.canceled || !result.filePaths.length ? { ok: false } : { ok: true, folderPath: result.filePaths[0] };
});

ipcMain.handle('dialog:pickFiles', async () => {
  const exts = [...SUPPORTED_DOC_EXTENSIONS].map((ext) => ext.slice(1));
  const result = await dialog.showOpenDialog({
    title: 'Chọn tài liệu để quét IPI',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Tài liệu hỗ trợ', extensions: exts }],
  });
  return result.canceled || !result.filePaths.length ? { ok: false, filePaths: [] } : { ok: true, filePaths: result.filePaths };
});

ipcMain.handle('ipi:scanDoc', (event, payload) => {
  const filePaths = Array.isArray(payload?.filePaths) ? payload.filePaths : [];
  if (!filePaths.length) {
    return { ok: false, mode: 'ipi-doc-scan', findings: [], error: 'Chưa chọn tài liệu.', metadata: { summary: { total: 0, byCategory: {}, bySeverity: {} } } };
  }
  return runDocumentScan(event, filePaths, path.dirname(filePaths[0]), payload?.scanProfile);
});

ipcMain.handle('ipi:scanDocFolder', async (event, payload) => {
  const folderPath = String(payload?.folderPath || '');
  try {
    const stat = await fs.stat(folderPath);
    if (!stat.isDirectory()) throw new Error('Thư mục tài liệu không hợp lệ.');
    const preparation = new AbortController();
    const filePaths = await collectDocumentFiles(folderPath, preparation.signal);
    if (!filePaths.length) throw new Error('Không tìm thấy tài liệu được hỗ trợ trong thư mục đã chọn.');
    const result = await runDocumentScan(event, filePaths, folderPath, payload?.scanProfile);
    return { ...result, metadata: { ...result.metadata, folderPath, documentLimitReached: filePaths.length >= DOCUMENT_COLLECTION_CONFIG.maxDocumentsPerScan } };
  } catch (error) {
    return { ok: false, mode: 'ipi-doc-scan', findings: [], error: error?.message || 'Không thể quét thư mục.', metadata: { summary: { total: 0, byCategory: {}, bySeverity: {} } } };
  }
});

ipcMain.handle('scan:stop', () => {
  if (!currentScanAbort) return { ok: false, error: 'Không có phiên quét đang chạy.' };
  currentScanAbort.abort('User cancelled');
  return { ok: true };
});

ipcMain.handle('ai:ollama:check', async () => {
  try {
    const { models, started } = await ensureOllamaReady();
    return { ok: true, models, started };
  } catch (error) {
    return { ok: false, error: error?.message || 'Không kết nối được Ollama tại 127.0.0.1:11434.' };
  }
});

ipcMain.handle('ai:fetch', async (_event, payload) => {
  try {
    if (payload?.providerId !== 'ollama') throw new Error('Chỉ Ollama local được hỗ trợ.');
    const url = new URL(String(payload?.url || ''));
    if (url.protocol !== 'http:' || !['127.0.0.1:11434', 'localhost:11434'].includes(url.host)) throw new Error('Chỉ cho phép Ollama local.');
    const controller = new AbortController();
    const timeoutMs = Math.min(Math.max(Number(payload?.timeoutMs || 45000), 1000), 60000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: String(payload?.body || ''),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { ok: response.ok, status: response.status, body: await response.text() };
  } catch (error) {
    return { ok: false, status: 0, body: '', error: error?.message || 'Gọi Ollama thất bại.' };
  }
});

ipcMain.handle('file:saveClean', async (_event, payload) => {
  try {
    const defaultFilename = String(payload?.defaultFilename || 'document_clean.txt');
    const saveResult = await dialog.showSaveDialog({ title: 'Lưu bản tài liệu đã trung hòa', defaultPath: defaultFilename });
    if (saveResult.canceled || !saveResult.filePath) return { ok: false, canceled: true };
    await fs.writeFile(saveResult.filePath, String(payload?.content || ''), 'utf8');
    return { ok: true, filePath: saveResult.filePath };
  } catch (error) {
    return { ok: false, error: error?.message || 'Không thể lưu file.' };
  }
});

app.whenReady().then(() => {
  app.setName('SENTINEL');
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
