import React, { useState } from 'react';
import { runIpiDocMultiAgentLoop } from '../ai/agents/ipiDocAgent';
import { useStore } from '../store/useStore';
import { SecurityVerdict, SemanticScanProfile } from '../types';
import { verdictLabel } from '../ai/agents/document/presentation';
import { t } from '../i18n/messages';
import { conclude } from '../ai/agents/document/reviewPolicy';

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
    locale,
  } = useStore();
  const [scanMode, setScanMode] = useState<ScanMode>('folder');
  const [scanProfile, setScanProfile] = useState<SemanticScanProfile>('balanced');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ verdict: SecurityVerdict; review: boolean; files: number } | null>(null);
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
    resetIpiRun();
    useStore.setState({ ipiRunning: true, ipiRun: { ...useStore.getState().ipiRun, status: 'running', processingStatus: 'running', error: null } });
    try {
      const connection = await window.owaspWorkbench?.checkOllama?.();
      if (!connection?.ok) throw new Error(connection?.error || t(locale, 'form.ollamaFail'));

      const installed = connection.models || [];
      const missing = [detectorModel, verifierModel].filter((model) => !installed.includes(model));
      if (missing.length) {
        throw new Error(t(locale, 'form.missingModels', {
          models: missing.join(', '),
          command: missing.map((model) => `ollama pull ${model}`).join(' && '),
        }));
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
        verdict: finalState.check?.verdict || 'needs_review',
        review: finalState.check?.verdict !== 'not_detected',
        files: Number(finalState.scanResult?.metadata?.scannedFiles || selectedFiles.length),
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t(locale, 'form.scanError');
      setError(message);
      if (useStore.getState().ipiRun.status === 'running') {
        useStore.setState({ ipiRun: { ...useStore.getState().ipiRun, status: 'error', processingStatus: 'model_error', error: message,
          check: conclude([], [t(locale, 'form.scanIncomplete')], message) } });
      }
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
        <strong>Local TinyLLM IPI Scanner:</strong> {t(locale, 'form.intro')}
      </div>

      <div className="section">
        <div className="section-label">{t(locale, 'form.source')}</div>
        <div className="ipi-mode-tabs">
          <button type="button" className={`ipi-mode-tab ${scanMode === 'folder' ? 'active' : ''}`} onClick={() => setScanMode('folder')} disabled={busy}>{t(locale, 'form.folderTab')}</button>
          <button type="button" className={`ipi-mode-tab ${scanMode === 'files' ? 'active' : ''}`} onClick={() => setScanMode('files')} disabled={busy}>{t(locale, 'form.filesTab')}</button>
        </div>

        {scanMode === 'folder' ? (
          <div className="field" style={{ marginTop: 10 }}>
            <label className="field-label" htmlFor="ipi-folder-path">{t(locale, 'form.folderLabel')}</label>
            <div className="folder-select-row">
              <input id="ipi-folder-path" type="text" value={selectedFolder || ''} readOnly placeholder={t(locale, 'form.folderPlaceholder')} />
              <button className="btn-browse" onClick={handleBrowseFolder} disabled={busy} type="button">{t(locale, 'form.browseFolder')}</button>
            </div>
            <div className="field-hint">{t(locale, 'form.folderHint')}</div>
          </div>
        ) : (
          <div className="field" style={{ marginTop: 10 }}>
            <label className="field-label">{t(locale, 'form.selectedFiles', { count: selectedFiles.length })}</label>
            {selectedFiles.length ? (
              <div className="ipi-file-list">
                {selectedFiles.map((filePath) => <div key={filePath} className="ipi-file-item"><span className="ipi-file-name" title={filePath}>{filePath.split(/[/\\]/).pop()}</span></div>)}
              </div>
            ) : <div className="ipi-file-empty" role="button" tabIndex={0} onClick={handleBrowseFiles}>{t(locale, 'form.pickHint')}</div>}
            <div className="folder-select-row" style={{ marginTop: 8 }}>
              <button className="btn-browse" onClick={handleBrowseFiles} disabled={busy} type="button">{t(locale, 'form.pickFiles')}</button>
              {selectedFiles.length > 0 && <button className="btn-clear" type="button" disabled={busy} onClick={() => setSelectedFiles([])} title={t(locale, 'form.clearFiles')}>X</button>}
            </div>
          </div>
        )}
        <div className="field-hint">{t(locale, 'form.supported', { exts: SUPPORTED_EXTS })}</div>
      </div>

      <div className="section">
        <div className="section-label">{t(locale, 'form.scope')}</div>
        <div className="ipi-mode-tabs" role="group" aria-label={t(locale, 'form.scopeGroup')}>
          <button type="button" className={`ipi-mode-tab ${scanProfile === 'balanced' ? 'active' : ''}`} onClick={() => setScanProfile('balanced')} disabled={busy}>{t(locale, 'form.balanced')}</button>
          <button type="button" className={`ipi-mode-tab ${scanProfile === 'deep' ? 'active' : ''}`} onClick={() => setScanProfile('deep')} disabled={busy}>{t(locale, 'form.deepScan')}</button>
        </div>
        <div className="ipi-auto-loop-info" style={{ marginTop: 8 }}>
          {scanProfile === 'deep' ? t(locale, 'form.deepHint') : t(locale, 'form.balancedHint')}
        </div>
      </div>

      <div className="section">
        <div className="section-label">{t(locale, 'form.models')}</div>
        <div className="field">
          <label className="field-label" htmlFor="ipi-detector-model">{t(locale, 'form.detector')}</label>
          <select id="ipi-detector-model" className="input-base" value={detectorModel} disabled={busy} onChange={(event) => setIpiFixModel(event.target.value)}>
            {MODEL_CHOICES.map((model) => <option key={model} value={model}>{model}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ipi-verifier-model">{t(locale, 'form.verifier')}</label>
          <select id="ipi-verifier-model" className="input-base" value={verifierModel} disabled={busy} onChange={(event) => setIpiCheckModel(event.target.value)}>
            {MODEL_CHOICES.map((model) => <option key={model} value={model}>{model}</option>)}
          </select>
        </div>
        <div className="ipi-auto-loop-info" style={{ marginTop: 8 }}>{t(locale, 'form.modelHint')}</div>
        <button type="button" className="btn-header" style={{ marginTop: 8 }} onClick={() => void checkOllamaStatus()} disabled={busy}>{t(locale, 'form.checkOllama')}</button>
        {ollamaStatus.checked && <div className={ollamaStatus.available ? 'success-bar' : 'error-bar'} style={{ marginTop: 8 }}>
          {ollamaStatus.available ? t(locale, 'form.ollamaOk', { models: ollamaStatus.models.join(', ') || t(locale, 'form.noModels') }) : ollamaStatus.error}
        </div>}
      </div>

      {error && <div className="error-bar" role="alert">{error}</div>}
      {result && <div className={`ipi-doc-result ${result.review ? 'result-warn' : 'result-ok'}`}>
        {t(locale, 'form.resultSummary', { label: verdictLabel(result.verdict, locale), files: result.files })}
      </div>}

      <div className="left-panel-cta">
        <button className="btn-primary" onClick={() => void runScan()} disabled={busy || !hasTarget}>{busy ? t(locale, 'form.scanning') : scanProfile === 'deep' ? t(locale, 'form.scanDeep') : t(locale, 'form.scanBalanced')}</button>
        <button className="btn-header" type="button" disabled={busy} onClick={resetIpiRun} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>{t(locale, 'form.clearResults')}</button>
      </div>
    </>
  );
};
