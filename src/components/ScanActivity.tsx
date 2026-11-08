import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { t } from '../i18n/messages';
import type { ScanTarget } from '../store/useStore';
import { AppLocale } from '../i18n/locale';
import { IpiRunState, SemanticScanProfile } from '../types';
import { reviewProgressCounts } from '../ai/agents/document/reviewProgress';

type StepState = 'pending' | 'running' | 'completed' | 'failed' | 'incomplete';
const phases = ['detect', 'fix', 'check', 'done'] as const;

function ProgressRing({ percent, status, runStatus, preparing, vi }: { percent: number | null; status: string; runStatus: IpiRunState['status']; preparing: boolean; vi: boolean }) {
  const reducedMotion = useReducedMotion();
  const current = useRef(percent ?? 0);
  const [display, setDisplay] = useState(current.current);
  useEffect(() => {
    const target = percent ?? 0;
    if (reducedMotion || percent === null) {
      current.current = target;
      setDisplay(target);
      return;
    }
    const animation = animate(current.current, target, {
      duration: Math.min(1.6, Math.max(0.45, Math.abs(target - current.current) * 0.045)),
      ease: 'easeOut',
      onUpdate: value => {
        current.current = value;
        setDisplay(value);
      },
    });
    return () => animation.stop();
  }, [percent, reducedMotion]);

  const tone = runStatus === 'error' ? 'failed' : runStatus === 'completed' && percent === 100 ? 'completed' : 'active';
  return <div className={`scan-ring scan-ring-${tone} ${preparing ? 'is-indeterminate' : ''}`} role="progressbar"
    aria-label={vi ? 'Lượt xử lý đoạn đã chọn của hai model' : 'Selected chunk reviews across both models'}
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined}>
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle className="scan-ring-track" cx="60" cy="60" r="50" />
      <circle className="scan-ring-value" cx="60" cy="60" r="50" pathLength="100" strokeDasharray="100"
        strokeDashoffset={preparing ? 75 : 100 - (percent === null ? 0 : display)} />
    </svg>
    <span className="scan-ring-label">
      <strong aria-hidden="true">{percent === null ? '—' : `${Math.round(display)}%`}</strong>
      <small>{status}</small>
    </span>
  </div>;
}

export function ScanActivity({ run, locale, target, profile }: { run: IpiRunState; locale: AppLocale; target?: ScanTarget | null; profile?: SemanticScanProfile }) {
  const vi = locale === 'vi';
  const labels = vi ? ['Chờ xử lý', 'Đang chạy', 'Hoàn tất', 'Lỗi', 'Chưa hoàn thành'] : ['Pending', 'Running', 'Completed', 'Failed', 'Incomplete'];
  const stateLabel = (state: StepState) => labels[['pending', 'running', 'completed', 'failed', 'incomplete'].indexOf(state)];
  const latest = [...run.events].reverse().find(event => event.phase !== 'error');
  const active = latest ? phases.indexOf(latest.phase as typeof phases[number]) : 0;
  const counts = run.reviewProgress ? reviewProgressCounts(run.reviewProgress) : null;
  const required = run.reviewProgress?.verifierRequiredChunkIds;
  const verifierTotal = required ? new Set(required).size : counts?.selected ?? 0;
  const verifierDone = required ? new Set(required.filter(id => run.reviewProgress?.verifierReviewedChunkIds.includes(id))).size : counts?.verifier ?? 0;
  const total = (counts?.selected ?? 0) + verifierTotal;
  const done = (counts?.detector ?? 0) + verifierDone;
  const prefilterDone = run.scanResult?.ok === true;
  // Prefilter chiếm 10%, các lượt rà đoạn đã chọn chiếm 90% còn lại.
  const prefilterWeight = prefilterDone ? 10 : 0;
  const percent = total
    ? Math.round(prefilterWeight + done / total * (100 - prefilterWeight))
    : prefilterDone ? prefilterWeight : null;
  const extracted = counts?.total ?? run.scanResult?.metadata.coverage?.totalChunks ?? null;
  const extractedCount = run.scanResult?.metadata.semanticChunkCatalog?.length ?? extracted;
  const highRiskChunks = run.scanResult?.metadata.coverage?.highRiskChunks;
  const modelProgress = [
    { name: 'Detector', done: counts?.detector ?? 0, total: counts?.selected ?? 0 },
    { name: 'Verifier', done: verifierDone, total: verifierTotal },
  ];
  const files = run.scanResult?.metadata.fileResults ?? [];
  const stepState = (index: number): StepState => {
    if (run.status === 'idle') return 'pending';
    if (index === 0 && run.scanResult) return run.scanResult.ok ? 'completed' : 'failed';
    if (index === 1 && counts && counts.detector === counts.selected && counts.selected > 0) return 'completed';
    if (index === 2 && run.status === 'error' && active < 2) return 'incomplete';
    if (index === 2 && counts && verifierDone === verifierTotal && run.check) return 'completed';
    if (index === 3) return run.status === 'completed' ? 'completed' : run.status === 'error' ? 'incomplete' : 'pending';
    if (index === 1 && counts && active > 1 && counts.detector < counts.selected) return 'failed';
    if (run.status === 'completed' && counts && (index === 1 || index === 2)) return 'failed';
    if (index < active && !counts) return 'completed';
    if (index === active) return run.status === 'error' ? 'failed' : run.status === 'running' ? 'running' : 'pending';
    return index < active && run.status === 'running' ? 'completed' : 'pending';
  };
  const paths = target?.folderPath ? [target.folderPath] : target?.filePaths?.length ? target.filePaths
    : files.length ? files.map(file => file.filePath) : run.scanResult?.target ? [run.scanResult.target] : [];
  const names = paths.map(path => path.split(/[/\\]/).filter(Boolean).pop() || path);
  const detectorModel = run.agentMetrics?.detector?.model ?? run.fixModel ?? 'gemma3:1b';
  const verifierModel = run.agentMetrics?.verifier?.model ?? run.checkModel ?? 'qwen2.5-coder:1.5b';
  const scope = run.scanResult?.metadata.coverage?.scanProfile ?? profile;
  const activeStatus = active === 1 ? (vi ? 'Detector đang phân tích' : 'Detector reviewing')
    : active === 2 ? (vi ? 'Verifier đang xác minh' : 'Verifier reviewing')
    : (vi ? 'Đang chuẩn bị' : 'Preparing');
  const status = run.status === 'running' ? activeStatus : stateLabel(run.status === 'error' ? 'failed' : run.status === 'completed' ? 'completed' : 'pending');
  return <section id="scan-activity" tabIndex={-1} className="scan-activity" aria-label={vi ? 'Tiến trình quét' : 'Scan activity'}>
    <div className="scan-metrics-grid">
      <div className="scan-overview-tile scan-overview-progress">
        <h2>{vi ? 'Tiến độ xử lý' : 'Processing progress'}</h2>
        <ProgressRing percent={percent} preparing={percent === null && run.status === 'running'} status={status} runStatus={run.status} vi={vi} />
        {total > 0 && <small>{done}/{total} {vi ? 'lượt xử lý đoạn' : 'chunk reviews'}</small>}
      </div>
      <div className="scan-overview-tile scan-steps">
        <h2>{vi ? 'Các bước xử lý' : 'Review steps'}</h2>
        <ol className="scan-step-list">
          {['Prefilter', 'Detector', 'Verifier', vi ? 'Kết quả' : 'Result'].map((name, index) => {
            const state = stepState(index);
            return <li key={name} className={`scan-step is-${state}`} aria-current={state === 'running' ? 'step' : undefined}>
              <span className="scan-step-mark" aria-hidden="true">
                <svg className="scan-step-completion-ring" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="15" pathLength="100" />
                </svg>
                {state === 'completed' || state === 'failed' ? <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={state === 'completed' ? 'M3.5 8l3 3 6-6' : 'm4.5 4.5 7 7m0-7-7 7'} />
                </svg> : state === 'incomplete' ? '!' : index + 1}
              </span>
              <strong>{name}</strong>
              <span className="scan-step-status">{stateLabel(state)}</span>
            </li>;
          })}
        </ol>
      </div>
      <div className="scan-overview-detail-column">
        <div className="scan-overview-tile scan-coverage">
          <div className="scan-overview-title-row">
            <h2>{vi ? 'Tài liệu và phạm vi' : 'Documents and scope'}</h2>
            {scope && <span className="scan-overview-scope">
              {t(locale, scope === 'deep' ? 'form.deepScan' : 'form.balanced')}
              <span className={`scan-mode-meter ${scope === 'deep' ? 'is-advanced' : ''}`} aria-hidden="true">
                {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
              </span>
            </span>}
          </div>
          <strong className="scan-overview-document" title={paths.join('\n')}>{names.length ? names.join(', ') : '—'}</strong>
          <dl className="scan-overview-models">
            <div><dt>Detector</dt><dd>{detectorModel}</dd></div>
            <div><dt>Verifier</dt><dd>{verifierModel}</dd></div>
          </dl>
        </div>
        <div className="scan-overview-tile scan-review-progress">
          <h2>{vi ? 'Tiến độ kiểm tra' : 'Review progress'}</h2>
          <div className="scan-extraction-summary">
            <small>{extractedCount !== null
              ? `${vi ? 'Tổng số đoạn trích xuất:' : 'Extracted chunks:'} ${extractedCount}/${extracted ?? '?'}`
              : (vi ? 'Chờ dữ liệu trích xuất và chọn đoạn.' : 'Waiting for extraction and chunk selection data.')}</small>
            {highRiskChunks !== undefined && <span className="scan-risk-callout"
              title={vi ? 'Số đoạn được Prefilter xếp rủi ro cao trước khi AI rà.' : 'Chunks rated high risk by Prefilter before AI review.'}>
              <span aria-hidden="true">⚠</span> {vi ? 'Đoạn đáng ngờ' : 'Suspicious chunks'} <strong>{highRiskChunks}</strong>
            </span>}
          </div>
          {counts && <div className="scan-document-progress">
            {modelProgress.map(model => <div className="scan-model-progress-row" key={model.name}>
              <span>{model.name}</span>
              <div className={`scan-progress ${run.status === 'running' ? 'is-running' : ''}`} role="progressbar"
                aria-label={vi ? `Đoạn đã rà bởi ${model.name}` : `Chunks reviewed by ${model.name}`}
                aria-valuemin={0} aria-valuemax={model.total || 1} aria-valuenow={model.done}>
                <div className="scan-progress-fill" style={{ width: `${model.total ? Math.min(100, model.done / model.total * 100) : 0}%` }} />
              </div>
              <strong>{model.done}/{model.total}</strong>
            </div>)}
          </div>}
        </div>
      </div>
    </div>
  </section>;
}
