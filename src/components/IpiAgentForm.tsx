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
      if (!connection?.ok) throw new Error(connection?.error || 'Cannot connect to local Ollama.');

      const installed = connection.models || [];
      const missing = [detectorModel, verifierModel].filter((model) => !installed.includes(model));
      if (missing.length) {
        throw new Error(`Missing local models: ${missing.join(', ')}. Run: ${missing.map((model) => `ollama pull ${model}`).join(' && ')}`);
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
      setError(cause instanceof Error ? cause.message : 'Unknown error during IPI scan.');
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
        <strong>Local TinyLLM IPI Scanner:</strong> Find Indirect Prompt Injection in documents using a rule prefilter, Detector Agent, and Verifier Agent — all via Ollama on your machine.
      </div>

      <div className="section">
        <div className="section-label">Document source</div>
        <div className="ipi-mode-tabs">
          <button type="button" className={`ipi-mode-tab ${scanMode === 'folder' ? 'active' : ''}`} onClick={() => setScanMode('folder')} disabled={busy}>Document folder</button>
          <button type="button" className={`ipi-mode-tab ${scanMode === 'files' ? 'active' : ''}`} onClick={() => setScanMode('files')} disabled={busy}>Pick files</button>
        </div>

        {scanMode === 'folder' ? (
          <div className="field" style={{ marginTop: 10 }}>
            <label className="field-label" htmlFor="ipi-folder-path">Folder to scan</label>
            <div className="folder-select-row">
              <input id="ipi-folder-path" type="text" value={selectedFolder || ''} readOnly placeholder="No folder selected" />
              <button className="btn-browse" onClick={handleBrowseFolder} disabled={busy} type="button">Browse folder</button>
            </div>
            <div className="field-hint">Scans up to 300 documents recursively; skips `.git`, `node_modules`, and build folders.</div>
          </div>
        ) : (
          <div className="field" style={{ marginTop: 10 }}>
            <label className="field-label">Selected files ({selectedFiles.length})</label>
            {selectedFiles.length ? (
              <div className="ipi-file-list">
                {selectedFiles.map((filePath) => <div key={filePath} className="ipi-file-item"><span className="ipi-file-name" title={filePath}>{filePath.split(/[/\\]/).pop()}</span></div>)}
              </div>
            ) : <div className="ipi-file-empty" role="button" tabIndex={0} onClick={handleBrowseFiles}>Click to pick documents</div>}
            <div className="folder-select-row" style={{ marginTop: 8 }}>
              <button className="btn-browse" onClick={handleBrowseFiles} disabled={busy} type="button">Pick files</button>
              {selectedFiles.length > 0 && <button className="btn-clear" type="button" disabled={busy} onClick={() => setSelectedFiles([])} title="Clear selected files">X</button>}
            </div>
          </div>
        )}
        <div className="field-hint">Supported: {SUPPORTED_EXTS}</div>
      </div>

      <div className="section">
        <div className="section-label">Semantic scan scope</div>
        <div className="ipi-mode-tabs" role="group" aria-label="Semantic scan mode">
          <button type="button" className={`ipi-mode-tab ${scanProfile === 'balanced' ? 'active' : ''}`} onClick={() => setScanProfile('balanced')} disabled={busy}>Balanced</button>
          <button type="button" className={`ipi-mode-tab ${scanProfile === 'deep' ? 'active' : ''}`} onClick={() => setScanProfile('deep')} disabled={busy}>Deep Scan</button>
        </div>
        <div className="ipi-auto-loop-info" style={{ marginTop: 8 }}>
          {scanProfile === 'deep'
            ? 'Deep Scan: TinyLLM reviews up to 24 chunks and the Verifier gets more evidence. Higher coverage, longer runtime.'
            : 'Balanced: TinyLLM reviews up to 12 chunks by risk priority and document coverage — good for everyday scans.'}
        </div>
      </div>

      <div className="section">
        <div className="section-label">Two local TinyLLMs</div>
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
          Light baseline: `gemma3:1b` for intent, `qwen2.5-coder:1.5b` for independent review. No cloud fallback.
        </div>
        <button type="button" className="btn-header" style={{ marginTop: 8 }} onClick={() => void checkOllamaStatus()} disabled={busy}>Check local Ollama</button>
        {ollamaStatus.checked && <div className={ollamaStatus.available ? 'success-bar' : 'error-bar'} style={{ marginTop: 8 }}>
          {ollamaStatus.available ? `Connected. Installed models: ${ollamaStatus.models.join(', ') || 'none pulled yet'}` : ollamaStatus.error}
        </div>}
      </div>

      {error && <div className="error-bar" role="alert">{error}</div>}
      {result && <div className={`ipi-doc-result ${result.findings ? 'result-warn' : 'result-ok'}`}>
        {result.findings ? `Found ${result.findings} IPI signal(s) across ${result.files} document(s).` : `No IPI detected in ${result.files} document(s).`}
      </div>}

      <div className="left-panel-cta">
        <button className="btn-primary" onClick={() => void runScan()} disabled={busy || !hasTarget}>{busy ? 'Analyzing documents...' : scanProfile === 'deep' ? 'Deep Scan IPI with local TinyLLM' : 'Scan IPI with local TinyLLM'}</button>
        <button className="btn-header" type="button" disabled={busy} onClick={resetIpiRun} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>Clear results</button>
      </div>
    </>
  );
};
