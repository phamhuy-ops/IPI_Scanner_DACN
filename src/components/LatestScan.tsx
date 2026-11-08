import { AppLocale } from '../i18n/locale';
import { verdictLabel } from '../ai/agents/document/presentation';
import { IpiRunState } from '../types';
import type { ScanTarget } from '../store/useStore';

function formatTokens(tokens: number, number: Intl.NumberFormat): string {
  if (tokens >= 1e12) return `${number.format(tokens / 1e12)}T`;
  if (tokens >= 1e9) return `${number.format(tokens / 1e9)}B`;
  if (tokens >= 1e6) return `${number.format(tokens / 1e6)}M`;
  return number.format(tokens);
}

function AgentTile({ role, run, locale }: { role: 'detector' | 'verifier'; run: IpiRunState; locale: AppLocale }) {
  const vi = locale === 'vi';
  const metrics = run.status === 'idle' ? undefined : run.agentMetrics?.[role];
  const model = run.status === 'idle' ? undefined : metrics?.model ?? (role === 'detector' ? run.fixModel : run.checkModel);
  const number = new Intl.NumberFormat(vi ? 'vi-VN' : 'en-US', { maximumFractionDigits: 1 });
  return <div className={`latest-scan-tile latest-scan-agent-tile latest-scan-${role}-tile`}>
    <div className="latest-scan-agent-heading">
      <span className="latest-scan-tile-label">{role === 'detector' ? 'Detector' : 'Verifier'}</span>
      <strong className="latest-scan-agent-model" title={model}>{model || '—'}</strong>
    </div>
    <dl className="latest-scan-agent-details">
      <div><dt>{vi ? 'Thời gian xử lý' : 'Processing time'}</dt><dd>{metrics ? `${number.format(metrics.durationMs / 1000)}s` : '—'}</dd></div>
      <div><dt>{vi ? 'Token đã dùng' : 'Tokens used'}</dt><dd title={vi ? 'Tổng token đầu vào và đầu ra; chỉ hiển thị khi mọi lượt gọi đều có số liệu.' : 'Input and output tokens; available only when every request reports usage.'}>{metrics && !metrics.missingTokenRequests ? formatTokens(metrics.totalTokens, number) : '—'}</dd></div>
    </dl>
  </div>;
}

function shortError(run: IpiRunState, vi: boolean): string {
  const error = run.error || '';
  if (run.processingStatus === 'timeout' || /timeout|timed out|deadline/i.test(error)) return vi ? 'Quá thời gian xử lý' : 'Processing timed out';
  if (/ECONNREFUSED|fetch failed|failed to fetch|connection|kết nối/i.test(error)) return vi ? 'Lỗi kết nối model' : 'Model connection failed';
  if (run.processingStatus === 'invalid_response') return vi ? 'Phản hồi không hợp lệ' : 'Invalid response';
  if (run.processingStatus === 'scan_error') return vi ? 'Không đọc được tài liệu' : 'Document read failed';
  if (/missing|chưa cài|thiếu|not found/i.test(error)) return vi ? 'Thiếu model xử lý' : 'Required model missing';
  return vi ? 'Lỗi xử lý model' : 'Model processing failed';
}

export function LatestScan({ run, locale, target }: { run: IpiRunState; locale: AppLocale; target?: ScanTarget | null }) {
  const vi = locale === 'vi';
  const idle = run.status === 'idle';
  const running = run.status === 'running';
  const failed = run.status === 'error';
  const verdict = run.check?.verdict ?? 'needs_review';
  const label = idle ? (vi ? 'Project chưa có kết quả' : 'No scan results yet')
    : running ? (vi ? 'Đang phân tích tài liệu' : 'Analyzing documents')
      : failed ? shortError(run, vi) : verdictLabel(verdict, locale);
  const tone = idle ? 'idle' : running ? 'running' : failed ? 'error' : verdict;
  const paths = target?.folderPath ? [target.folderPath] : target?.filePaths?.length ? target.filePaths
    : run.scanResult?.target ? [run.scanResult.target] : run.scanResult?.metadata.fileResults?.map(file => file.filePath) ?? [];
  const firstName = paths[0]?.replace(/[\\/]+$/, '').split(/[\\/]/).pop();
  const sourceName = idle ? '—' : firstName ? `${firstName}${paths.length > 1 ? ` (+${paths.length - 1})` : ''}` : '—';
  const confirmed = idle || running || !run.check ? undefined : run.suspicions.filter(item => item.status === 'confirmed').length;
  const metadata = idle ? undefined : run.scanResult?.metadata;
  const files = metadata?.fileResults?.filter(file => file.ok).length ?? metadata?.scannedFiles;
  const failedFiles = metadata?.fileResults?.filter(file => !file.ok).length;
  const resultTarget = run.check || failed ? '#scan-conclusion' : '#scan-activity';
  const timestamp = idle ? undefined : run.events.at(-1)?.ts;
  const scanTime = timestamp ? new Date(timestamp) : undefined;
  return <section className="section latest-scan" aria-labelledby="latest-scan-title">
    <header className="latest-scan-heading">
      <h3 id="latest-scan-title" className="section-label">{vi ? 'Lần quét gần nhất' : 'Latest scan'}</h3>
      {scanTime && Number.isFinite(scanTime.getTime()) && <time dateTime={scanTime.toISOString()}>
        {new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-GB', {
          hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false,
        }).format(scanTime)}
      </time>}
    </header>
    <div className="latest-scan-grid">
      <div className={`latest-scan-tile latest-scan-verdict-tile latest-scan-${tone}`}>
        <strong className="latest-scan-source-name" title={idle ? undefined : paths.join('\n')}>{sourceName}</strong>
        <div className="latest-scan-summary-details">
          <span>{vi ? 'Tệp đã xử lý:' : 'Files processed:'} <strong>{files ?? '—'}</strong></span>
          <div className="latest-scan-status latest-scan-status-row" role="status" title={failed ? run.error || label : label}>
            <span>{vi ? 'Trạng thái:' : 'Status:'}</span><strong>{label}</strong>
          </div>
          <span>{vi ? 'Tệp lỗi:' : 'Failed files:'} <strong>{failedFiles ?? '—'}</strong></span>
          <span>{vi ? 'Số IPI xác nhận:' : 'Confirmed IPI:'} <strong>{confirmed ?? '—'}</strong></span>
        </div>
        {!idle && !running && <>
          <a className="latest-scan-link" href={resultTarget}>{vi ? 'Xem kết quả' : 'View results'} <span aria-hidden="true">↗</span></a>
        </>}
      </div>
      <AgentTile role="detector" run={run} locale={locale} />
      <AgentTile role="verifier" run={run} locale={locale} />
    </div>
  </section>;
}
