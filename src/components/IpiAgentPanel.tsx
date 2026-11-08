import React, { useMemo, useState } from 'react';
import { DirectiveContext, IpiLoopEvent, IpiRunState, SemanticScanProfile } from '../types';
import { AppLocale, DEFAULT_LOCALE } from '../i18n/locale';
import { MessageKey, t } from '../i18n/messages';
import { ScanTarget, useStore } from '../store/useStore';
import { processingLabel, verdictLabel } from '../ai/agents/document/presentation';
import { reviewProgressCounts } from '../ai/agents/document/reviewProgress';
import { ScanActivity } from './ScanActivity';
import { ScanConclusion } from './ScanConclusion';
import { failureGuidance } from '../ai/agents/document/runtimeDiagnostics';

function phaseLabel(event: IpiLoopEvent) {
  switch (event.phase) {
    case 'detect': return 'PREFILTER';
    case 'fix': return 'DETECTOR';
    case 'check': return 'VERIFIER';
    case 'done': return 'RESULT';
    default: return 'SYSTEM';
  }
}

function suspicionStatus(status: string, locale: AppLocale) {
  if (status === 'confirmed') return t(locale, 'panel.statusConfirmed');
  if (status === 'dismissed') return t(locale, 'panel.statusDismissed');
  return t(locale, 'panel.statusUnresolved');
}

function stanceLabel(stance: string | undefined, locale: AppLocale) {
  if (stance === 'confirmed') return t(locale, 'panel.statusConfirmed');
  if (stance === 'dismissed') return t(locale, 'panel.statusDismissed');
  return t(locale, 'panel.statusUncertain');
}

function DirectiveContextEvidence({ value, locale }: { value: DirectiveContext; locale: AppLocale }) {
  const addresseeKey = `directive.addressee.${value.addressee}` as MessageKey;
  const framingKey = `directive.framing.${value.framing}` as MessageKey;
  const deviationKey = `directive.deviation.${value.deviation}` as MessageKey;
  return <details><summary>{t(locale, 'directive.summary')}</summary>
    <p>{t(locale, 'directive.addressee', { value: t(locale, addresseeKey) })} · {t(locale, 'directive.framing', { value: t(locale, framingKey) })} · {t(locale, 'directive.deviation', { value: t(locale, deviationKey) })}</p>
    <p>{t(locale, 'directive.source', { value: value.directive?.quote || t(locale, 'directive.missing') })}</p>
    <blockquote>{value.context.quote}</blockquote>
    <small>{value.context.fileName}:{value.context.startLine}–{value.context.endLine} · {t(locale, 'directive.citationNote')}</small>
  </details>;
}

export const IpiAgentPanel: React.FC = () => {
  const { ipiRun, ipiRunning, locale, scanTarget, scanProfile } = useStore();
  return <IpiAgentPanelView ipiRun={ipiRun} ipiRunning={ipiRunning} locale={locale} target={scanTarget} profile={scanProfile} />;
};

export const IpiAgentPanelView: React.FC<{ ipiRun: IpiRunState; ipiRunning: boolean; locale?: AppLocale; target?: ScanTarget | null; profile?: SemanticScanProfile }> = ({
  ipiRun, ipiRunning, locale = DEFAULT_LOCALE, target, profile,
}) => {
  const [showTimeline, setShowTimeline] = useState(false);
  const findings = useMemo(() => ipiRun.scanResult?.findings || [], [ipiRun.scanResult]);
  const coverage = ipiRun.scanResult?.metadata?.coverage;
  const progress = ipiRun.reviewProgress ? reviewProgressCounts(ipiRun.reviewProgress) : null;

  return (
    <div className="ipi-panel copilot-container">
      {ipiRun.status !== 'idle' && <ScanActivity run={ipiRun} locale={locale} target={target} profile={profile} />}
      <ScanConclusion run={ipiRun} locale={locale} />

      {ipiRun.status !== 'idle' && <p className="processing-caption" role="status">{t(locale, 'panel.processing', { status: processingLabel(ipiRun.processingStatus, locale) })}{t(locale, 'panel.roundOne')}</p>}

      {(progress || ipiRun.scanResult) && <details className="ipi-coverage-summary ipi-review-progress" aria-label={t(locale, 'panel.progressTitle')}>
        <summary>{t(locale, 'panel.progressTitle')}</summary>
        {progress ? <>
          <dl aria-live="polite">
            <dt>{t(locale, 'panel.progressTotal')}</dt><dd>{progress.total ?? t(locale, 'panel.progressUnknown')}</dd>
            <dt>{t(locale, 'panel.progressSelected')}</dt><dd>{progress.selected}</dd>
            <dt>{t(locale, 'panel.progressDetector')}</dt><dd>{progress.detector}/{progress.selected}</dd>
            <dt>{t(locale, 'panel.progressVerifier')}</dt><dd>{progress.verifier}/{progress.selected}</dd>
            <dt>{t(locale, 'panel.progressBoth')}</dt><dd>{progress.completed}/{progress.total ?? t(locale, 'panel.progressUnknown')}</dd>
            <dt>{t(locale, 'panel.progressRemaining')}</dt><dd>{progress.remaining ?? t(locale, 'panel.progressUnknown')}</dd>
          </dl>
          <small>{t(locale, 'panel.progressNote')}</small>
          {!!ipiRun.reviewProgress?.batchReviews?.length && <details>
            <summary>{locale === 'vi' ? 'Chi tiết các lượt AI' : 'AI review details'}</summary>
            <p>{locale === 'vi'
              ? 'Chỉ ghi phản hồi đã qua kiểm tra JSON và trích dẫn; không chứng minh nhận định đúng. Các lượt lỗi nằm trong phần chẩn đoán bên dưới.'
              : 'Only responses that passed JSON and citation checks are recorded; this does not prove the interpretation correct. Failed attempts appear in diagnostics below.'}</p>
            <ul>{ipiRun.reviewProgress.batchReviews.map((batch, index) => <li key={index}>
              <strong>{batch.role === 'detector' ? 'Detector' : 'Verifier'} · {batch.model}</strong>
              <p>{batch.sourceChunkIds.length} {locale === 'vi' ? 'đoạn nguồn được giao' : 'assigned source chunks'} · {locale === 'vi' ? 'Nghi vấn đầu vào' : 'Supplied suspicions'}: {batch.suppliedSuspicionCount}</p>
              <p>{locale === 'vi' ? 'Đánh giá' : 'Assessments'}: {batch.responseAssessmentCount} · {locale === 'vi' ? 'Phát hiện mới' : 'Discoveries'}: {batch.responseDiscoveryCount}</p>
              <p>{locale === 'vi' ? 'Nhận định xác nhận' : 'Confirmed assessments'}: {batch.stanceCounts.confirmed} · {locale === 'vi' ? 'Bác bỏ' : 'Dismissed'}: {batch.stanceCounts.dismissed} · {locale === 'vi' ? 'Bất định' : 'Uncertain'}: {batch.stanceCounts.uncertain}</p>
            </li>)}</ul>
          </details>}
        </> : <p>{t(locale, 'panel.progressLegacy')}</p>}
      </details>}

      {ipiRun.error && !ipiRunning && <div className="error-bar" role="alert">{ipiRun.error}</div>}

      {!!ipiRun.batchFailures?.length && <section className="ipi-coverage-summary" aria-label={locale === 'vi' ? 'Chẩn đoán lỗi xử lý' : 'Processing diagnostics'}>
        <h3>{locale === 'vi' ? 'Đoạn xử lý lỗi và hướng khắc phục' : 'Failed chunks and recovery guidance'}</h3>
        <p>{locale === 'vi' ? 'Lịch sử lỗi được giữ lại. Chỉ lỗi ghi Đã phục hồi mới có đủ đoạn được xử lý lại hợp lệ; lỗi còn lại không được tính vào phần đã hoàn tất.' : 'Failure history is retained. Only entries marked Recovered have every affected chunk reviewed successfully; unresolved failures do not count as complete.'}</p>
        <ul>{ipiRun.batchFailures.map((failure, index) => <li key={index}>
          <strong>{failure.role === 'detector' ? 'Detector' : 'Verifier'} · {failure.model} · {failure.code}</strong>
          <p>{failure.recovery === 'recovered'
            ? (failure.code === 'output_truncated'
              ? (locale === 'vi' ? 'Đã phục hồi: mọi đoạn của batch này đã được xử lý hợp lệ trong các batch con. Đầu ra bị cắt ban đầu không được sử dụng.' : 'Recovered: all affected chunks passed review in smaller batches. The original truncated output was not used.')
              : (locale === 'vi' ? 'Đã phục hồi: mọi đoạn của batch này đã được xử lý hợp lệ trong lượt sau. Phản hồi chưa hoàn tất ban đầu không được sử dụng.' : 'Recovered: all affected chunks passed review in a subsequent attempt. The original incomplete response was not used.'))
            : failureGuidance(failure.code, locale)}</p>
          <ul>{failure.chunks.map(chunk => <li key={chunk.chunkId}>{chunk.filePath || chunk.fileName}:{chunk.startLine}–{chunk.endLine} · {chunk.chunkId}</li>)}</ul>
          <details><summary>{locale === 'vi' ? 'Chi tiết lỗi' : 'Error details'} · {failure.durationMs} ms</summary><p>{failure.message}</p></details>
        </li>)}</ul>
      </section>}

      {ipiRun.events.length === 0 && !ipiRunning ? (
        <div className="copilot-hero">
          <div className="ready-orbit" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg></div>
          <h2 className="copilot-hero-title">{locale === 'vi' ? 'Sẵn sàng kiểm tra tài liệu' : 'Ready to review your documents'}</h2>
          <p className="copilot-hero-desc">{locale === 'vi' ? 'Thêm tệp ở bên trái. Kết quả và các nội dung cần xem xét sẽ xuất hiện tại đây.' : 'Add files on the left. Results and items to review will appear here.'}</p>
          <span className="ready-note">{locale === 'vi' ? 'Tự động quét · Xử lý trên máy của bạn' : 'Automatic scanning · Processed on your device'}</span>
        </div>
      ) : (
        <>
          <section className="copilot-step-card card-active">
            <div className="copilot-card-head">
              <div>
                <span className="copilot-card-step-badge badge-detect">{t(locale, 'panel.step1Badge')}</span>
                <h3 className="copilot-card-title" style={{ marginTop: 4 }}>{t(locale, 'panel.step1Title')}</h3>
              </div>
              <div className="copilot-card-agent-tag">{t(locale, 'panel.findingCount', { count: findings.length })}</div>
            </div>
            {findings.length === 0 ? (
              <p className="empty-state-tip" style={{ color: 'var(--low)', fontWeight: 600 }}>{t(locale, 'panel.noFindings')}</p>
            ) : (
              <ul className="ipi-finding-list">
                {findings.map((finding, index) => (
                  <li key={`${finding.ruleId}-${finding.location}-${index}`} className={`ipi-finding-item severity-${finding.severity}`}>
                    <div className="ipi-finding-header"><span className="ipi-severity">{finding.severity}</span><span className="ipi-finding-rule">{finding.ruleId}</span><strong className="ipi-finding-title">{finding.title}</strong></div>
                    <div className="ipi-finding-loc">{finding.location}</div>
                    <details><summary>{locale === 'vi' ? 'Chi tiết phát hiện' : 'Finding details'}</summary>
                    {finding.evidence.map((evidence, evidenceIndex) => <div key={evidenceIndex} className="ipi-finding-ev">{evidence}</div>)}
                    <p>{finding.remediation}</p></details>
                  </li>
                ))}
              </ul>
            )}
            {coverage && (
              <div className="ipi-coverage-summary">
                <strong>{coverage.scanProfile === 'deep' ? t(locale, 'panel.coverageDeep') : t(locale, 'panel.coverageBalanced')}</strong> {t(locale, 'panel.coverageBody', { total: coverage.totalChunks, selected: ipiRun.scanResult?.metadata.semanticChunks?.length ?? coverage.aiReviewedChunks })}
                {coverage.coverageLimited && t(locale, 'panel.coverageLimited')}
              </div>
            )}
            {ipiRun.scanResult?.metadata.fileResults?.filter(file => file.extraction).map(file => <div key={file.filePath} className="ipi-coverage-summary">
              <strong>{t(locale, 'panel.htmlSource', { path: file.filePath })}</strong>
              <p>{t(locale, 'panel.htmlBody', { selected: file.extraction?.selectedRawChunks ?? 0, total: file.extraction?.rawChunks ?? 0 })}</p>
              {file.extraction?.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
              <small>{t(locale, 'panel.htmlNote')}</small>
            </div>)}
          </section>

          <section className="copilot-step-card card-active">
            <div className="copilot-card-head">
              <div>
                <span className="copilot-card-step-badge badge-fix">{t(locale, 'panel.step2Badge')}</span>
                <h3 className="copilot-card-title" style={{ marginTop: 4 }}>{t(locale, 'panel.step2Title', { model: ipiRun.fixModel || 'gemma3:1b' })}</h3>
              </div>
            </div>
            <div className="copilot-explain-box">{t(locale, 'panel.step2Body')}</div>
          </section>

          {ipiRun.check && (
            <section className={`copilot-step-card ${ipiRun.check.verdict === 'not_detected' ? 'card-pass' : ipiRun.check.verdict === 'ipi_detected' ? 'card-fail' : 'card-review'}`}>
              <div className="copilot-card-head">
                <div>
                  <span className="copilot-card-step-badge badge-check">{t(locale, 'panel.step3Badge')}</span>
                  <h3 className="copilot-card-title" style={{ marginTop: 4 }}>{t(locale, 'panel.step3Title')}</h3>
                </div>
                <span className={`ipi-verdict-badge ${ipiRun.check.verdict === 'not_detected' ? 'verdict-badge-pass' : ipiRun.check.verdict === 'ipi_detected' ? 'verdict-badge-fail' : 'verdict-badge-review'}`}>{verdictLabel(ipiRun.check.verdict, locale)}</span>
              </div>
              <div className="ipi-verdict-body">
                <div className="ipi-verdict-block"><div className="ipi-verdict-block-title">{t(locale, 'panel.reviewBasis')}</div><ul className="ipi-verdict-list">{ipiRun.check.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></div>
                {ipiRun.check.residualRisks.length > 0 && <div className="ipi-verdict-block ipi-verdict-block-risk"><div className="ipi-verdict-block-title risk">{t(locale, 'panel.remainingRisks')}</div><ul className="ipi-verdict-list risk">{ipiRun.check.residualRisks.map((risk, index) => <li key={index}>{risk}</li>)}</ul></div>}
                <p>{t(locale, 'panel.notRagPermission')}</p>
              </div>
            </section>
          )}

          {ipiRun.suspicions.length > 0 && <section className="copilot-step-card">
            <h3>{t(locale, 'panel.evidenceTitle', { count: ipiRun.suspicions.length })}</h3>
            <ul className="ipi-finding-list">{ipiRun.suspicions.map(item => <li key={item.id} className={`ipi-finding-item suspicion-${item.status}`}>
              <details className="suspicion-detail">
              <summary><strong>{item.id} · {item.source}</strong><span className={`assessment-status assessment-${item.status}`}>{suspicionStatus(item.status, locale)}</span><span className="suspicion-location">{item.location}</span></summary>
              <p>{item.location}</p>
              <blockquote>{item.originalQuote || t(locale, 'panel.noOriginalQuote')}</blockquote>
              {item.conflicts?.map(conflict => <details key={conflict.role} open>
                <summary>{locale === 'vi' ? 'Nhận định tự mâu thuẫn — cần đối chiếu' : 'Conflicting assessments — review required'} · {conflict.role === 'detector' ? 'Detector' : 'Verifier'}</summary>
                <p>{locale === 'vi' ? 'Các nhận định dưới đây dùng bằng chứng chồng nhau nhưng kết luận khác nhau. Hệ thống giữ cả hai và chưa chốt nghi vấn này.' : 'These assessments use overlapping evidence with different stances. Both are retained and this suspicion remains unresolved.'}</p>
                {conflict.assessments.map((assessment, index) => <div key={index}>
                  <strong>{stanceLabel(assessment.stance, locale)}</strong><p>{assessment.reason}</p>
                  <blockquote>{assessment.citation.quote}</blockquote>
                  <small>{assessment.citation.filePath || assessment.citation.fileName}:{assessment.citation.startLine}–{assessment.citation.endLine}</small>
                </div>)}
              </details>)}
              <div className="agent-comparison">{(['detector', 'verifier'] as const).map(role => <div key={role} className="ipi-verdict-block">
                <strong>{role === 'detector' ? 'Detector' : 'Verifier'}</strong>
                {item[role] ? <>
                  <p>{stanceLabel(item[role]?.stance, locale)}: {item[role]?.reason}</p>
                  <blockquote>{item[role]?.citation.quote}</blockquote>
                  {item[role]?.directiveContext && <DirectiveContextEvidence value={item[role]!.directiveContext!} locale={locale} />}
                  <small>{item[role]?.citation.filePath || item[role]?.citation.fileName}:{item[role]?.citation.startLine}–{item[role]?.citation.endLine}</small>
                  {item[role]?.citation.sourceView && <small> · {item[role]?.citation.sourceView} · {item[role]?.citation.lineBasis === 'source' ? t(locale, 'panel.lineInRawHtml') : t(locale, 'panel.lineInProjection')}</small>}
                </> : <p>{t(locale, 'panel.noRoleAssessment')}</p>}
              </div>)}</div>
              </details>
            </li>)}</ul>
          </section>}

          <section className="ipi-section" style={{ marginTop: 8 }}>
            <div className="ipi-section-head">
              <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>{t(locale, 'panel.pipelineLog', { count: ipiRun.events.length })}</h4>
              <button type="button" className="ipi-toggle-btn" onClick={() => setShowTimeline(!showTimeline)}>{showTimeline ? t(locale, 'panel.collapse') : t(locale, 'panel.expand')}</button>
            </div>
            {showTimeline && <div className="ipi-timeline-feed" style={{ marginTop: 10 }}>
              {ipiRun.events.map((event, index) => <div key={`${event.ts}-${index}`} className="ipi-tl-item phase-info"><div className="ipi-tl-left"><span className="phase-tag phase-info">{phaseLabel(event)}</span><span className="ipi-tl-time">{new Date(event.ts).toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', { hour12: false })}</span></div><div className="ipi-tl-body"><div className="ipi-tl-msg">{event.message}</div></div></div>)}
            </div>}
          </section>
        </>
      )}
    </div>
  );
};
