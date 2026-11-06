import { AppLocale } from '../i18n/locale';
import { verdictLabel } from '../ai/agents/document/presentation';
import { IpiRunState } from '../types';

export function LatestScan({ run, locale }: { run: IpiRunState; locale: AppLocale }) {
  const vi = locale === 'vi';
  const idle = run.status === 'idle';
  const running = run.status === 'running';
  const failed = run.status === 'error';
  const verdict = run.check?.verdict ?? 'needs_review';
  const label = idle ? (vi ? 'Project chưa có kết quả' : 'No scan results yet')
    : running ? (vi ? 'Đang phân tích tài liệu' : 'Analyzing documents')
      : failed ? (vi ? 'Xử lý chưa hoàn tất' : 'Processing incomplete') : verdictLabel(verdict, locale);
  const tone = idle ? 'idle' : running ? 'running' : failed ? 'error' : verdict;
  const timestamp = idle ? undefined : [...run.events].reverse().find(event => Number.isFinite(event.ts) && event.ts > 0 && Number.isFinite(new Date(event.ts).getTime()))?.ts;
  const files = idle ? undefined : run.scanResult?.metadata.scannedFiles ?? run.scanResult?.metadata.fileResults?.length;
  const resultTarget = run.check || failed ? '#scan-conclusion' : '#scan-activity';
  return <section className="section latest-scan" aria-labelledby="latest-scan-title">
    <h3 id="latest-scan-title" className="section-label">{vi ? 'Lần quét gần nhất' : 'Latest scan'}</h3>
    <div className="latest-scan-grid">
      <div className={`latest-scan-tile latest-scan-verdict-tile latest-scan-${tone}`}>
        <span className="latest-scan-tile-label">{vi ? 'Kết luận' : 'Conclusion'}</span>
        <div className="latest-scan-status" role="status">{label}</div>
        {!idle && !running && <>
          {!failed && <p className="latest-scan-note">{vi ? 'Kết quả trong phạm vi đã kiểm tra.' : 'Result applies to the reviewed scope.'}</p>}
          <a className="latest-scan-link" href={resultTarget}>{vi ? 'Xem kết quả' : 'View results'} <span aria-hidden="true">↗</span></a>
        </>}
      </div>
      <div className="latest-scan-tile latest-scan-files-tile" aria-label={typeof files === 'number' ? (vi ? `${files} tệp đã xử lý` : `${files} files processed`) : (vi ? 'Chưa có số liệu tệp' : 'File count unavailable')}>
        <span className="latest-scan-tile-label">{vi ? 'Tệp đã xử lý' : 'Files processed'}</span>
        <strong className="latest-scan-number">{typeof files === 'number' ? files : '—'}</strong>
      </div>
      <div className="latest-scan-tile latest-scan-time-tile">
        <span className="latest-scan-tile-label">{vi ? 'Thời điểm' : 'Updated'}</span>
        {timestamp ? <time dateTime={new Date(timestamp).toISOString()}>
          <strong>{new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp)}</strong>
          <span>{new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(timestamp)}</span>
        </time> : <strong className="latest-scan-time-empty" aria-label={vi ? 'Chưa có thời điểm' : 'Time unavailable'}>—</strong>}
      </div>
    </div>
  </section>;
}
