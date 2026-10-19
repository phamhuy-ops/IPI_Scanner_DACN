import React, { useState } from 'react';
import { runIpiDocMultiAgentLoop } from '../ai/agents/ipiDocAgent';
import { useStore } from '../store/useStore';
import { SemanticScanProfile } from '../types';

type ScanMode = 'folder' | 'files';

const SUPPORTED_EXTS = '.txt, .md, .pdf, .docx, .doc, .csv, .json, .xml, .html';
const DETECTOR_MODEL = 'gemma3:1b';
const VERIFIER_MODEL = 'qwen2.5-coder:1.5b';
const MODEL_CHOICES = [DETECTOR_MODEL, VERIFIER_MODEL];

export const IpiAgentForm: React.FC = () => {
  const {
    selectedFolder, setSelectedFolder, resetIpiRun,
    ollamaStatus, checkOllamaStatus,
    ipiFixModel, setIpiFixModel, ipiCheckModel, setIpiCheckModel,
  } = useStore();
  const [scanMode, setScanMode] = useState<ScanMode>('folder');
  const [scanProfile, setScanProfile] = useState<SemanticScanProfile>('balanced');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ findings: number; files: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detectorModel = ipiFixModel || DETECTOR_MODEL;
  const verifierModel = ipiCheckModel || VERIFIER_MODEL;

  const handleBrowseFolder = async () => {
    const picked = await window.owaspWorkbench?.pickFolder?.();
    if (picked?.ok && picked.folderPath) {
      setSelectedFolder(picked.folderPath);
      setResult(null);
      setError(null);
    }
  };

  const handleBrowseFiles = async () => {
    const picked = await window.owaspWorkbench?.pickFiles?.();
    if (picked?.ok && picked.filePaths?.length) {
      setSelectedFiles(picked.filePaths);
      setResult(null);
      setError(null);
    }
  };

  const runScan = async () => {
    const hasTarget = scanMode === 'folder' ? Boolean(selectedFolder) : selectedFiles.length > 0;
    if (!hasTarget) return;

    setScanning(true);
    setResult(null);
    setError(null);
    useStore.setState({ ipiRunning: true, ipiRun: { ...useStore.getState().ipiRun, status: 'running', error: null } });
    try {
      const connection = await window.owaspWorkbench?.checkOllama?.();
      if (!connection?.ok) throw new Error(connection?.error || 'Không kết nối được Ollama local.');

      const installed = connection.models || [];
      const missing = [detectorModel, verifierModel].filter((model) => !installed.includes(model));
      if (missing.length) {
        throw new Error(`Chưa có model local: ${missing.join(', ')}. Chạy: ${missing.map((model) => `ollama pull ${model}`).join(' && ')}`);
      }
      await checkOllamaStatus();

      const finalState = await runIpiDocMultiAgentLoop({
        filePaths: scanMode === 'files' ? selectedFiles : [],
        folderPath: scanMode === 'folder' ? selectedFolder || undefined : undefined,
        scanProfile,
        providerMode: 'ollama',
        fixModel: detectorModel,
        checkModel: verifierModel,
        onEvent: (_event, current) => {
          useStore.setState({ ipiRun: { ...current, events: [...current.events] } });
        },
      });

      useStore.setState({ ipiRun: finalState });
      if (finalState.error) throw new Error(finalState.error);
      setResult({
        findings: finalState.scanResult?.findings.length || 0,
        files: Number(finalState.scanResult?.metadata?.scannedFiles || selectedFiles.length),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Lỗi không xác định khi quét IPI.');
    } finally {
      setScanning(false);
      useStore.setState({ ipiRunning: false });
    }
  };

  const busy = scanning;
  const hasTarget = scanMode === 'folder' ? Boolean(selectedFolder) : selectedFiles.length > 0;

  return (
    <>
      <div className="onboarding-tip">
        <strong>Local TinyLLM IPI Scanner:</strong> Phát hiện Indirect Prompt Injection trong tài liệu bằng rule-based prefilter, Detector Agent và Verifier Agent chạy hoàn toàn qua Ollama trên máy.
      </div>

      <div className="section">
        <div className="section-label">Nguồn tài liệu</div>
        <div className="ipi-mode-tabs">
          <button type="button" className={`ipi-mode-tab ${scanMode === 'folder' ? 'active' : ''}`} onClick={() => setScanMode('folder')} disabled={busy}>Thư mục tài liệu</button>
          <button type="button" className={`ipi-mode-tab ${scanMode === 'files' ? 'active' : ''}`} onClick={() => setScanMode('files')} disabled={busy}>Chọn file</button>
        </div>

        {scanMode === 'folder' ? (
          <div className="field" style={{ marginTop: 10 }}>
            <label className="field-label" htmlFor="ipi-folder-path">Thư mục cần quét</label>
            <div className="folder-select-row">
              <input id="ipi-folder-path" type="text" value={selectedFolder || ''} readOnly placeholder="Chưa chọn thư mục nào" />
              <button className="btn-browse" onClick={handleBrowseFolder} disabled={busy} type="button">Chọn thư mục</button>
            </div>
            <div className="field-hint">Quét đệ quy tối đa 300 tài liệu, bỏ qua `.git`, `node_modules` và thư mục build.</div>
          </div>
        ) : (
          <div className="field" style={{ marginTop: 10 }}>
            <label className="field-label">Tài liệu đã chọn ({selectedFiles.length})</label>
            {selectedFiles.length ? (
              <div className="ipi-file-list">
                {selectedFiles.map((filePath) => <div key={filePath} className="ipi-file-item"><span className="ipi-file-name" title={filePath}>{filePath.split(/[/\\]/).pop()}</span></div>)}
              </div>
            ) : <div className="ipi-file-empty" role="button" tabIndex={0} onClick={handleBrowseFiles}>Nhấp để chọn tài liệu</div>}
            <div className="folder-select-row" style={{ marginTop: 8 }}>
              <button className="btn-browse" onClick={handleBrowseFiles} disabled={busy} type="button">Chọn file</button>
              {selectedFiles.length > 0 && <button className="btn-clear" type="button" disabled={busy} onClick={() => setSelectedFiles([])} title="Bỏ các file đã chọn">X</button>}
            </div>
          </div>
        )}
        <div className="field-hint">Hỗ trợ: {SUPPORTED_EXTS}</div>
      </div>

      <div className="section">
        <div className="section-label">Phạm vi Semantic Scan</div>
        <div className="ipi-mode-tabs" role="group" aria-label="Chế độ quét semantic">
          <button type="button" className={`ipi-mode-tab ${scanProfile === 'balanced' ? 'active' : ''}`} onClick={() => setScanProfile('balanced')} disabled={busy}>Balanced</button>
          <button type="button" className={`ipi-mode-tab ${scanProfile === 'deep' ? 'active' : ''}`} onClick={() => setScanProfile('deep')} disabled={busy}>Deep Scan</button>
        </div>
        <div className="ipi-auto-loop-info" style={{ marginTop: 8 }}>
          {scanProfile === 'deep'
            ? 'Deep Scan: TinyLLM review tối đa 24 chunk và Verifier nhận evidence nhiều hơn. Độ phủ cao hơn, thời gian xử lý sẽ tăng.'
            : 'Balanced: TinyLLM review tối đa 12 chunk theo ưu tiên rủi ro và các mốc phủ tài liệu, phù hợp quét thường ngày.'}
        </div>
      </div>

      <div className="section">
        <div className="section-label">Hai TinyLLM local</div>
        <div className="field">
          <label className="field-label" htmlFor="ipi-detector-model">Detector Agent</label>
          <select id="ipi-detector-model" className="input-base" value={detectorModel} disabled={busy} onChange={(event) => setIpiFixModel(event.target.value)}>
            {MODEL_CHOICES.map((model) => <option key={model} value={model}>{model}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ipi-verifier-model">Verifier Agent</label>
          <select id="ipi-verifier-model" className="input-base" value={verifierModel} disabled={busy} onChange={(event) => setIpiCheckModel(event.target.value)}>
            {MODEL_CHOICES.map((model) => <option key={model} value={model}>{model}</option>)}
          </select>
        </div>
        <div className="ipi-auto-loop-info" style={{ marginTop: 8 }}>
          Baseline siêu nhẹ: `gemma3:1b` đọc ý đồ, `qwen2.5-coder:1.5b` phản biện độc lập. Không có fallback cloud.
        </div>
        <button type="button" className="btn-header" style={{ marginTop: 8 }} onClick={() => void checkOllamaStatus()} disabled={busy}>Kiểm tra Ollama local</button>
        {ollamaStatus.checked && <div className={ollamaStatus.available ? 'success-bar' : 'error-bar'} style={{ marginTop: 8 }}>
          {ollamaStatus.available ? `Đã kết nối. Model hiện có: ${ollamaStatus.models.join(', ') || 'chưa tải model'}` : ollamaStatus.error}
        </div>}
      </div>

      {error && <div className="error-bar" role="alert">{error}</div>}
      {result && <div className={`ipi-doc-result ${result.findings ? 'result-warn' : 'result-ok'}`}>
        {result.findings ? `Phát hiện ${result.findings} dấu hiệu IPI trong ${result.files} tài liệu.` : `Không phát hiện IPI trong ${result.files} tài liệu.`}
      </div>}

      <div className="left-panel-cta">
        <button className="btn-primary" onClick={() => void runScan()} disabled={busy || !hasTarget}>{busy ? 'Đang phân tích tài liệu...' : scanProfile === 'deep' ? 'Deep Scan IPI bằng TinyLLM local' : 'Quét IPI bằng TinyLLM local'}</button>
        <button className="btn-header" type="button" disabled={busy} onClick={resetIpiRun} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>Làm mới kết quả</button>
      </div>
    </>
  );
};
