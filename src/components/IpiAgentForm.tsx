import React, { useRef, useState } from 'react';
import { runIpiDocMultiAgentLoop } from '../ai/agents/ipiDocAgent';
import { ScanTarget, useStore } from '../store/useStore';
import { SecurityVerdict } from '../types';
import { verdictLabel } from '../ai/agents/document/presentation';
import { t } from '../i18n/messages';
import { conclude } from '../ai/agents/document/reviewPolicy';


const SUPPORTED_EXTS = '.txt, .md, .pdf, .docx, .doc, .csv, .json, .xml, .html';
const DETECTOR_MODEL = 'gemma3:1b';
const VERIFIER_MODEL = 'qwen2.5-coder:1.5b';
const MODEL_CHOICES = [DETECTOR_MODEL, VERIFIER_MODEL];

export const IpiAgentForm: React.FC = () => {
  const {
    resetIpiRun, ipiRunning, scanProfile, scanTarget: target, pickingSource: picking,
    ollamaStatus, checkOllamaStatus,
    ipiFixModel, setIpiFixModel, ipiCheckModel, setIpiCheckModel,
    locale,
  } = useStore();
  const setScanProfile = (scanProfile: 'balanced' | 'deep') => useStore.setState({ scanProfile });
  const setTarget = (scanTarget: ScanTarget | null) => useStore.setState({ scanTarget });
  const [dragging, setDragging] = useState(false);
  const setPicking = (pickingSource: boolean) => useStore.setState({ pickingSource });
  const pickerOpen = useRef(false);
  const [result, setResult] = useState<{ verdict: SecurityVerdict; review: boolean; files: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detectorModel = ipiFixModel || DETECTOR_MODEL;
  const verifierModel = ipiCheckModel || VERIFIER_MODEL;

  const runScan = async (nextTarget: ScanTarget) => {
    if (useStore.getState().ipiRunning) return;

    setTarget(nextTarget);
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
        filePaths: nextTarget.filePaths ?? [],
        folderPath: nextTarget.folderPath,
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
        files: Number(finalState.scanResult?.metadata?.scannedFiles ?? nextTarget.filePaths?.length ?? 0),
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t(locale, 'form.scanError');
      setError(message);
      if (useStore.getState().ipiRun.status === 'running') {
        useStore.setState({ ipiRun: { ...useStore.getState().ipiRun, status: 'error', processingStatus: 'model_error', error: message,
          check: conclude([], [t(locale, 'form.scanIncomplete')], message) } });
      }
    } finally {
      useStore.setState({ ipiRunning: false });
    }
  };

  const busy = ipiRunning || picking;

  const pickSource = async (kind: 'files' | 'folder') => {
    if (pickerOpen.current || useStore.getState().ipiRunning) return;
    pickerOpen.current = true;
    setPicking(true);
    try {
      if (kind === 'files') {
        const picked = await window.owaspWorkbench?.pickFiles();
        if (picked?.ok && picked.filePaths.length) void runScan({ filePaths: picked.filePaths });
      } else {
        const picked = await window.owaspWorkbench?.pickFolder();
        if (picked?.ok && picked.folderPath) void runScan({ folderPath: picked.folderPath });
      }
    } catch {
      setError(t(locale, 'form.sourceError'));
    } finally {
      pickerOpen.current = false;
      setPicking(false);
    }
  };

  const dropFiles = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (busy || pickerOpen.current || useStore.getState().ipiRunning) return;
    const files = Array.from(event.dataTransfer.files);
    if (!files.length) return;

    const extensions = SUPPORTED_EXTS.split(', ');
    const filePaths = files.map((file) => {
      const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      return extensions.includes(extension) ? window.owaspWorkbench?.getPathForFile?.(file) : undefined;
    });
    if (filePaths.some((path) => !path)) {
      setError(t(locale, 'form.dropError'));
      return;
    }

    void runScan({ filePaths: [...new Set(filePaths.filter((path): path is string => Boolean(path)))] });
  };

  return (
    <>
      <div className="config-scroll">
      <section className="section scan-source">
        <div className="section-label">{t(locale, 'form.source')}</div>
        <div
          className={`scan-drop-zone ${dragging ? 'is-dragging' : ''}`}
          aria-busy={ipiRunning}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes('Files')) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
            setDragging(!busy);
          }}
          onDragLeave={(event) => {
            if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
              setDragging(false);
            }
          }}
          onDrop={dropFiles}
        >
          <svg className="scan-upload-icon" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M12 16V4m-4 4 4-4 4 4M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <strong>{t(locale, 'form.dropTitle')}</strong>
          <p>{t(locale, 'form.autoStart')}</p>
          <button className="btn-primary" type="button" disabled={busy} onClick={() => void pickSource('files')}>{t(locale, 'form.pickFiles')}</button>
        </div>
        <div className="field-hint">{t(locale, 'form.supported', { exts: SUPPORTED_EXTS })}</div>
        <button className="btn-browse scan-folder-button" type="button" disabled={busy} onClick={() => void pickSource('folder')}>{t(locale, 'form.browseFolder')}</button>
        {target && (
          <ul className="ipi-file-list scan-source-list" aria-label={t(locale, 'form.source')}>
            {(target.filePaths ?? [target.folderPath]).map((path) => (
              <li key={path} className="ipi-file-item"><span className="ipi-file-name" title={path}>{path.split(/[/\\]/).filter(Boolean).pop() || path}</span></li>
            ))}
          </ul>
        )}
      </section>

      <div className="section">
        <div className="section-label">{t(locale, 'form.scope')}</div>
        <div className="scan-mode-grid" role="group" aria-label={t(locale, 'form.scopeGroup')}>
          <button type="button" className={`scan-mode-card scan-mode-balanced ${scanProfile === 'balanced' ? 'selected' : ''}`} aria-pressed={scanProfile === 'balanced'} onClick={() => setScanProfile('balanced')} disabled={busy}><span className="mode-radio" aria-hidden="true" /><strong>{t(locale, 'form.balanced')}</strong><small>{locale === 'vi' ? 'Ưu tiên đoạn có tín hiệu rủi ro' : 'Prioritize chunks with risk signals'}</small></button>
          <button type="button" className={`scan-mode-card scan-mode-deep ${scanProfile === 'deep' ? 'selected' : ''}`} aria-pressed={scanProfile === 'deep'} onClick={() => setScanProfile('deep')} disabled={busy}><span className="mode-radio" aria-hidden="true" /><strong>{t(locale, 'form.deepScan')}</strong><small>{locale === 'vi' ? 'Mở rộng phạm vi kiểm tra' : 'Review a broader document scope'}</small></button>
        </div>
        <div className="ipi-auto-loop-info" style={{ marginTop: 8 }}>
          {scanProfile === 'deep' ? t(locale, 'form.deepHint') : t(locale, 'form.balancedHint')}
        </div>
      </div>

      <details className="section model-settings">
        <summary><span className="section-label">{t(locale, 'form.models')}</span></summary>
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
      </details>

      {error && <div className="error-bar" role="alert">{error}</div>}
      {result && <div className={`ipi-doc-result ${result.review ? 'result-warn' : 'result-ok'}`}>
        {t(locale, 'form.resultSummary', { label: verdictLabel(result.verdict, locale), files: result.files })}
      </div>}
      </div>

      <div className="left-panel-cta">
        <div className="scan-auto-status" role="status">{t(locale, ipiRunning ? 'form.scanning' : 'form.autoReady')}</div>
        {target && <button className="btn-header" type="button" disabled={busy} onClick={() => {
          resetIpiRun();
          setTarget(null);
          setError(null);
          setResult(null);
        }}>{t(locale, 'form.clearResults')}</button>}
        <p className="local-processing-note">{locale === 'vi' ? 'Xử lý cục bộ qua Ollama' : 'Processed locally via Ollama'}</p>
      </div>
    </>
  );
};
