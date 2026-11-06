import { AppLocale } from '../i18n/locale';
import { IpiRunState } from '../types';
import { reviewProgressCounts } from '../ai/agents/document/reviewProgress';

type StepState = 'pending' | 'running' | 'completed' | 'failed';
const phases = ['detect', 'fix', 'check', 'done'] as const;

export function ScanActivity({ run, locale, onClearResults, clearDisabled }: { run: IpiRunState; locale: AppLocale; onClearResults?: () => void; clearDisabled?: boolean }) {
  const vi = locale === 'vi';
  const labels = vi ? ['Chờ xử lý', 'Đang chạy', 'Hoàn tất', 'Lỗi'] : ['Pending', 'Running', 'Completed', 'Failed'];
  const stateLabel = (state: StepState) => labels[['pending', 'running', 'completed', 'failed'].indexOf(state)];
  const latest = [...run.events].reverse().find(event => event.phase !== 'error');
  const active = latest ? phases.indexOf(latest.phase as typeof phases[number]) : 0;
  const counts = run.reviewProgress ? reviewProgressCounts(run.reviewProgress) : null;
  const required = run.reviewProgress?.verifierRequiredChunkIds;
  const verifierTotal = required ? new Set(required).size : counts?.selected ?? 0;
  const verifierDone = required ? new Set(required.filter(id => run.reviewProgress?.verifierReviewedChunkIds.includes(id))).size : counts?.verifier ?? 0;
  const total = (counts?.selected ?? 0) + verifierTotal;
  const done = (counts?.detector ?? 0) + verifierDone;
  const percent = total ? Math.round(done / total * 100) : null;
  const extracted = counts?.total ?? run.scanResult?.metadata.coverage?.totalChunks ?? null;
  const selected = counts?.selected ?? run.scanResult?.metadata.semanticChunks?.length ?? null;
  const selectionPercent = extracted && selected !== null ? Math.round(selected / extracted * 100) : null;
  const files = run.scanResult?.metadata.fileResults ?? [];
  const stepState = (index: number): StepState => {
    if (run.status === 'idle') return 'pending';
    if (index === 0 && run.scanResult) return run.scanResult.ok ? 'completed' : 'failed';
    if (index === 1 && counts && counts.detector === counts.selected && counts.selected > 0) return 'completed';
    if (index === 2 && counts && verifierDone === verifierTotal && run.check) return 'completed';
    if (index === 3) return run.status === 'completed' ? 'completed' : run.status === 'error' ? 'failed' : 'pending';
    if (index === 1 && counts && active > 1 && counts.detector < counts.selected) return 'failed';
    if (run.status === 'completed' && counts && (index === 1 || index === 2)) return 'failed';
    if (index < active && !counts) return 'completed';
    if (index === active) return run.status === 'error' ? 'failed' : run.status === 'running' ? 'running' : 'pending';
    return index < active && run.status === 'running' ? 'completed' : 'pending';
  };
  return <section className="scan-activity" aria-label={vi ? 'Tiến trình quét' : 'Scan activity'}>
    <div className="scan-activity-heading"><strong>{vi ? 'Tiến trình phân tích' : 'Analysis activity'}</strong><span>{run.status === 'idle' ? (vi ? 'Sẵn sàng' : 'Ready') : percent === null ? (run.status === 'running' ? (vi ? 'Đang chuẩn bị' : 'Preparing') : (vi ? 'Không có số liệu' : 'No progress data')) : `${done}/${total}`}</span>{onClearResults && <button className="btn-header scan-clear-results" type="button" onClick={onClearResults} disabled={clearDisabled || run.status === 'running'}>{vi ? 'Xóa kết quả' : 'Clear results'}</button>}</div>
    <div className="scan-metrics-grid"><div>
    <div className="scan-metric-label"><span>{vi ? 'Tiến độ xử lý' : 'Processing progress'}</span><strong>{percent === null ? (vi ? 'Chưa có số liệu' : 'Not available') : `${percent}%`}</strong></div>
    <div className={`scan-ring ${percent === null && run.status === 'running' ? 'is-indeterminate' : ''}`} role="progressbar" aria-label={vi ? 'Lượt xử lý đoạn đã chọn của hai model' : 'Selected chunk reviews across both models'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined} aria-valuetext={percent === null ? (vi ? 'Chưa có số liệu tiến độ' : 'Progress not available') : `${percent}%`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="scan-ring-track" cx="60" cy="60" r="50" />
        <circle className="scan-ring-value" cx="60" cy="60" r="50" pathLength="100" strokeDasharray="100" strokeDashoffset={percent === null ? (run.status === 'running' ? 75 : 100) : 100 - percent} />
      </svg>
      <span className="scan-ring-label" aria-hidden="true"><strong>{percent === null ? '—' : `${percent}%`}</strong><small>{percent === null ? (run.status === 'running' ? (vi ? 'Chuẩn bị' : 'Preparing') : (vi ? 'Chưa có dữ liệu' : 'No data')) : (vi ? 'Đã xử lý' : 'Processed')}</small></span>
    </div>
    <small>{vi ? 'Tiến độ lượt xử lý đoạn đã chọn, không phải tỷ lệ an toàn hay độ bao phủ toàn tài liệu.' : 'Progress of selected chunk reviews, not a safety score or whole-document coverage.'}</small>
    </div><div className="scan-coverage">
      <div className="scan-metric-label"><span>{vi ? 'Phạm vi được chọn' : 'Selected scope'}</span><strong>{selectionPercent === null ? (vi ? 'Chưa có số liệu' : 'Not available') : `${selectionPercent}%`}</strong></div>
      <div className="scan-progress" aria-hidden="true"><div className="scan-progress-fill" style={{ width: `${selectionPercent ?? 0}%` }} /></div>
      <small>{selected !== null && extracted !== null
        ? (vi ? `${selected}/${extracted} đoạn trích xuất được chọn cho AI.` : `${selected}/${extracted} extracted chunks selected for AI.`)
        : (vi ? 'Chờ dữ liệu trích xuất và chọn đoạn.' : 'Waiting for extraction and chunk selection data.')}</small>
      {counts && <small>{vi ? `Cả hai model đã xử lý: ${counts.completed}/${counts.total ?? '?'} đoạn.` : `Reviewed by both models: ${counts.completed}/${counts.total ?? '?'} chunks.`}</small>}
    </div></div>
    <ol className="agent-flow">{['Prefilter', 'Detector', 'Verifier', vi ? 'Kết quả' : 'Result'].map((name, index) => {
      const state = stepState(index);
      return <li key={name} className={`agent-node is-${state}`} aria-current={state === 'running' ? 'step' : undefined}><span className="agent-node-mark" aria-hidden="true">{state === 'completed' ? '✓' : state === 'failed' ? '!' : String(index + 1).padStart(2, '0')}</span><strong>{name}</strong><span>{stateLabel(state)}</span></li>;
    })}</ol>
    <div className="agent-summary">{(['detector', 'verifier'] as const).map(role => <div key={role}>
      <span className="agent-initial" aria-hidden="true">{role === 'detector' ? 'D' : 'V'}</span>
      <strong>{role === 'detector' ? 'Detector' : 'Verifier'}</strong>
      <code>{role === 'detector' ? run.fixModel || 'gemma3:1b' : run.checkModel || 'qwen2.5-coder:1.5b'}</code>
      <small>{counts ? `${role === 'detector' ? counts.detector : verifierDone}/${role === 'detector' ? counts.selected : verifierTotal} ${vi ? 'đoạn xử lý hợp lệ' : 'valid chunk reviews'}` : (vi ? 'Chưa có số liệu xử lý' : 'Review data not available')}</small>
    </div>)}</div>
    {files.length > 0 && <details className="scan-documents" open={run.status === 'running'}><summary>{vi ? 'Tài liệu trong lượt quét' : 'Documents in this scan'} · {files.length}</summary><ul>{files.map(file => <li key={file.filePath}>{file.filePath}<span>{file.ok ? (vi ? 'Đã trích xuất' : 'Extracted') : (vi ? 'Lỗi trích xuất' : 'Extraction failed')}</span></li>)}</ul><small>{vi ? 'Chưa có tín hiệu xác định file model đang đọc tại từng thời điểm.' : 'Per-file live model activity is not available.'}</small></details>}
  </section>;
}
