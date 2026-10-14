import React, { useState } from 'react';
import { runIpiDocMultiAgentLoop } from '../ai/agents/ipiDocAgent';
import { useStore } from '../store/useStore';

type ScanMode = 'folder' | 'file';

const SUPPORTED_EXTS = '.txt, .md, .pdf, .docx, .doc, .csv, .json, .xml, .html';

export const IpiAgentForm: React.FC = () => {
  const {
    selectedFolder, setSelectedFolder, runIpiLoop, ipiRunning, isLoading,
    resetIpiRun,
    ipiProviderMode, setIpiProviderMode, ollamaStatus, checkOllamaStatus,
    ipiFixModel, ipiCheckModel,
  } = useStore();

  const [scanMode, setScanMode] = useState<ScanMode>('folder');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [docScanning, setDocScanning] = useState(false);
  const [docResult, setDocResult] = useState<{ findings: number; files: number } | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const handleBrowseFolder = async () => {
    const result = await window.owaspWorkbench?.pickFolder?.();
    if (result?.ok && result.folderPath) setSelectedFolder(result.folderPath);
  };

  const handleBrowseFiles = async () => {
    const result = await window.owaspWorkbench?.pickFiles?.();
    if (result?.ok && result.filePaths?.length) {
      setSelectedFiles(result.filePaths);
      setDocResult(null);
      setDocError(null);
    }
  };

  const handleScanDoc = async () => {
    if (!selectedFiles.length) return;
    setDocScanning(true);
    setDocResult(null);
    setDocError(null);
    try {
      const finalState = await runIpiDocMultiAgentLoop({
        filePaths: selectedFiles,
        providerMode: ipiProviderMode,
        fixModel: ipiFixModel || undefined,
        checkModel: ipiCheckModel || undefined,
        onEvent: (_ev, current) => {
          useStore.setState({ ipiRun: { ...current, events: [...current.events] } });
        },
      });

      const count = finalState.scanResult?.findings?.length ?? 0;
      setDocResult({ findings: count, files: selectedFiles.length });
      useStore.setState({ ipiRun: finalState });
      if (finalState.error) {
        setDocError(finalState.error);
      }
    } catch (e) {
      setDocError((e as Error).message || 'Lỗi không xác định');
    } finally {
      setDocScanning(false);
    }
  };

  const busy = ipiRunning || isLoading || docScanning;

  return (
    <>
      <div className="onboarding-tip">
        <strong>IPI Security Co-Pilot:</strong> Tự động check lỗi Indirect Prompt Injection,
        đưa ra lời giải thích chi tiết, áp dụng bản vá (SLM 1), kiểm định lại độc lập (SLM 2),
        và cho phép tải file sạch về máy.
      </div>

      {/* ── Mode selector ── */}
      <div className="section">
        <div className="section-label">Chế độ quét</div>
        <div className="ipi-mode-tabs">
          <button
            type="button"
            className={`ipi-mode-tab ${scanMode === 'folder' ? 'active' : ''}`}
            onClick={() => setScanMode('folder')}
            disabled={busy}
          >
            Thư mục mã nguồn
          </button>
          <button
            type="button"
            className={`ipi-mode-tab ${scanMode === 'file' ? 'active' : ''}`}
            onClick={() => setScanMode('file')}
            disabled={busy}
          >
            File tài liệu
          </button>
        </div>
      </div>

      {/* ── Folder mode ── */}
      {scanMode === 'folder' && (
        <div className="section">
          <div className="section-label">Thư mục mã nguồn</div>
          <div className="field">
            <label className="field-label" htmlFor="ipi-folder-path">Đường dẫn thư mục</label>
            <div className="folder-select-row">
              <div className="input-clear-row">
                <input
                  id="ipi-folder-path"
                  type="text"
                  value={selectedFolder || ''}
                  readOnly
                  placeholder="Chưa chọn thư mục nào"
                />
                {selectedFolder && (
                  <button
                    type="button"
                    className="btn-clear"
                    title="Xoá thư mục đã chọn"
                    disabled={busy}
                    onClick={() => setSelectedFolder('')}
                  >✕</button>
                )}
              </div>
              <button className="btn-browse" onClick={handleBrowseFolder} disabled={busy} type="button">
                Chọn thư mục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── File mode ── */}
      {scanMode === 'file' && (
        <div className="section">
          <div className="section-label">File tài liệu</div>
          <div className="ipi-auto-loop-info" style={{ marginBottom: 10 }}>
            Quét IPI trực tiếp trong nội dung file: phát hiện câu lệnh ẩn kiểu
            &ldquo;Ignore previous instructions&rdquo;, system prompt override, jailbreak, v.v.
            <div style={{ marginTop: 4, fontFamily: 'var(--mono)', fontSize: '10.5px' }}>
              Hỗ trợ: {SUPPORTED_EXTS}
            </div>
          </div>

          <div className="field">
            <label className="field-label">File đã chọn ({selectedFiles.length})</label>
            {selectedFiles.length > 0 ? (
              <div className="ipi-file-list">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="ipi-file-item">
                    <span className="ipi-file-ext">{f.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                    <span className="ipi-file-name" title={f}>{f.split(/[/\\]/).pop()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="ipi-file-empty"
                onClick={handleBrowseFiles}
                role="button"
                tabIndex={0}
                title="Nhấp để duyệt file từ máy tính"
              >
                Nhấp để chọn file tài liệu (.pdf, .docx, .txt, .md, ...)
              </div>
            )}
          </div>

          <div className="folder-select-row" style={{ marginTop: 8 }}>
            <button
              className="btn-browse"
              onClick={handleBrowseFiles}
              disabled={busy}
              type="button"
              style={{ flex: 1 }}
            >
              Chọn file
            </button>
            {selectedFiles.length > 0 && (
              <button
                type="button"
                className="btn-clear"
                title="Xóa tất cả file đã chọn"
                disabled={busy}
                onClick={() => { setSelectedFiles([]); setDocResult(null); setDocError(null); }}
              >✕</button>
            )}
          </div>

          {/* Doc scan result inline */}
          {docError && (
            <div className="error-bar" role="alert" style={{ marginTop: 8 }}>{docError}</div>
          )}
          {docResult && (
            <div className={`ipi-doc-result ${docResult.findings > 0 ? 'result-warn' : 'result-ok'}`}>
              <span className="ipi-doc-result-label">
                {docResult.findings > 0 ? 'Phát hiện IPI' : 'Không phát hiện IPI'}
              </span>
              <span className="ipi-doc-result-detail">
                {docResult.findings} finding(s) trong {docResult.files} file
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Provider section ── */}
      <div className="section">
        <div className="section-label">Mô hình &amp; Provider (Chỉ SLM)</div>
        <div className="field">
          <label className="field-label" htmlFor="ipi-provider-mode">Nguồn thực thi SLM</label>
          <select
            id="ipi-provider-mode"
            className="input-base"
            value={ipiProviderMode}
            disabled={busy}
            onChange={(e) => {
              const mode = e.target.value as 'auto' | 'ollama' | 'cloud';
              setIpiProviderMode(mode);
              if (mode === 'ollama') void checkOllamaStatus();
            }}
          >
            <option value="auto">Tự động (Ưu tiên Groq / OpenRouter)</option>
            <option value="ollama">Ollama Local (Offline trên máy - 127.0.0.1:11434)</option>
            <option value="cloud">Cloud API (Groq / OpenRouter / Together)</option>
          </select>
        </div>

        {ipiProviderMode === 'ollama' && (
          <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: 'var(--surface-sunken, #1e222b)', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <strong>Trạng thái Ollama:</strong>
              <button
                type="button"
                className="btn-header"
                style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                onClick={() => void checkOllamaStatus()}
                disabled={busy}
              >
                Kiểm tra lại
              </button>
            </div>
            {ollamaStatus.checked ? (
              ollamaStatus.available ? (
                <div style={{ color: '#4ade80' }}>
                  Đã kết nối — 127.0.0.1:11434
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                    Models: {ollamaStatus.models.slice(0, 4).join(', ') || 'Chưa tải model nào'}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#f87171' }}>
                  Lỗi: {ollamaStatus.error || 'Chưa bật Ollama'}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                    Chạy lệnh: <code>ollama run llama3.1:8b</code>
                  </div>
                </div>
              )
            ) : (
              <div style={{ color: 'var(--text-muted, #94a3b8)' }}>Chưa kiểm tra (nhấn Kiểm tra lại)</div>
            )}
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-label">Vòng lặp Agent</div>
        <div className="ipi-auto-loop-info">
          Vòng lặp tự động chạy liên tục cho đến khi Detector không còn phát hiện IPI,
          sau đó Check Agent (SLM) xác minh độc lập. Không cần cấu hình thủ công.
        </div>
        <ul className="scope-list">
          <li className="scope-item">
            <span className="scope-bullet" />
            <strong>Fix Agent:</strong> {ipiProviderMode === 'ollama' ? 'llama3.1:8b (Local)' : 'Llama 3.1 8B (SLM)'}
          </li>
          <li className="scope-item">
            <span className="scope-bullet" />
            <strong>Check Agent:</strong> {ipiProviderMode === 'ollama' ? 'gemma2:9b (Local)' : 'Gemma 2 9B (SLM)'}
          </li>
          <li className="scope-item"><span className="scope-bullet" />Chỉ dùng mô hình &le; 9B parameters</li>
        </ul>
      </div>

      <div className="left-panel-cta">
        {scanMode === 'folder' ? (
          <>
            <button
              className="btn-primary"
              onClick={() => void runIpiLoop()}
              disabled={busy || !selectedFolder}
            >
              {ipiRunning ? (
                <><span className="spinner-sm" style={{ borderColor: 'rgba(42,54,59,.2)', borderTopColor: 'var(--text)' }} /> Co-Pilot đang xử lý…</>
              ) : (
                <>Bắt đầu Co-Pilot (Check &rarr; Sửa &rarr; Xác minh)</>
              )}
            </button>
            <button className="btn-header" type="button" disabled={busy} onClick={resetIpiRun} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
              Làm mới phiên Co-Pilot
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-primary"
              onClick={handleScanDoc}
              disabled={busy || selectedFiles.length === 0}
            >
              {docScanning ? (
                <><span className="spinner-sm" style={{ borderColor: 'rgba(42,54,59,.2)', borderTopColor: 'var(--text)' }} /> Co-Pilot đang phân tích &amp; xử lý…</>
              ) : (
                <>Bắt đầu Co-Pilot (Check, Giải thích &amp; Tạo file sạch)</>
              )}
            </button>
            <button className="btn-header" type="button" disabled={busy} onClick={resetIpiRun} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
              Làm mới phiên Co-Pilot
            </button>
          </>
        )}
      </div>
    </>
  );
};
