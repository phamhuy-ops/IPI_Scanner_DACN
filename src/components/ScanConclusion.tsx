import { AppLocale } from '../i18n/locale';
import { IpiRunState } from '../types';
import { verdictLabel } from '../ai/agents/document/presentation';

export function ScanConclusion({ run, locale }: { run: IpiRunState; locale: AppLocale }) {
  if (run.status === 'idle' || run.status === 'running' || (!run.check && run.status !== 'error')) return null;
  const vi = locale === 'vi';
  const verdict = run.check?.verdict ?? 'needs_review';
  const tone = run.status === 'error' ? 'error' : verdict;
  const confirmed = run.suspicions.filter(item => item.status === 'confirmed').length;
  const unresolved = run.suspicions.filter(item => item.status === 'unresolved').length;
  return <section id="scan-conclusion" tabIndex={-1} className={`scan-conclusion conclusion-${tone}`} aria-label={vi ? 'Kết luận lượt quét' : 'Scan conclusion'}>
    <span className="conclusion-symbol" aria-hidden="true">{tone === 'not_detected' ? '✓' : '!'}</span>
    <div>
      <span className="conclusion-label">{vi ? 'Kết luận' : 'Conclusion'}</span>
      <h2>{run.status === 'error' ? (vi ? 'Xử lý chưa hoàn tất' : 'Processing incomplete') : verdictLabel(verdict, locale)}</h2>
      <p>{run.status === 'error'
        ? (vi ? 'Có lỗi xử lý. Kiểm tra chẩn đoán và phần dữ liệu chưa được xác minh.' : 'Processing encountered an error. Review diagnostics and unverified data.')
        : verdict === 'not_detected'
          ? (vi ? 'Chưa phát hiện IPI trong phạm vi đã kiểm tra. Xem giới hạn và độ bao phủ bên dưới.' : 'No IPI detected within the reviewed scope. Check coverage and limitations below.')
          : run.check?.reasons[0]}</p>
      <small>{vi ? `${confirmed} nghi vấn xác nhận · ${unresolved} cần đối chiếu` : `${confirmed} confirmed suspicions · ${unresolved} requiring review`}</small>
    </div>
  </section>;
}
