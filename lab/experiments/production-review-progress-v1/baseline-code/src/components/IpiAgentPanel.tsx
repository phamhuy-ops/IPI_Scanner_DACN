import React, { useMemo, useState } from 'react';
import { DirectiveContext, IpiLoopEvent, IpiRunState } from '../types';
import { AppLocale, DEFAULT_LOCALE } from '../i18n/locale';
import { MessageKey, t } from '../i18n/messages';
import { useStore } from '../store/useStore';
import { processingLabel, verdictLabel } from '../ai/agents/document/presentation';

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
  const { ipiRun, ipiRunning, locale } = useStore();
  return <IpiAgentPanelView ipiRun={ipiRun} ipiRunning={ipiRunning} locale={locale} />;
};

export const IpiAgentPanelView: React.FC<{ ipiRun: IpiRunState; ipiRunning: boolean; locale?: AppLocale }> = ({
  ipiRun, ipiRunning, locale = DEFAULT_LOCALE,
}) => {
  const [showTimeline, setShowTimeline] = useState(false);
  const findings = useMemo(() => ipiRun.scanResult?.findings || [], [ipiRun.scanResult]);
  const coverage = ipiRun.scanResult?.metadata?.coverage;

  const statusLabel = ipiRun.status === 'running' ? t(locale, 'panel.analyzing')
    : ipiRun.check ? verdictLabel(ipiRun.check.verdict, locale) : ipiRun.status === 'error' ? verdictLabel('needs_review', locale) : t(locale, 'panel.ready');

  return (
    <div className="ipi-panel copilot-container">
      <div className="ipi-status-bar">
        <span className={`ipi-badge ipi-badge-${ipiRun.check?.verdict || ipiRun.status}`}>{statusLabel}</span>
        <div className="ipi-meta-tags">
          <span className="ipi-meta-tag"><span className="ipi-meta-label">Detector</span><span className="ipi-meta-value">{ipiRun.fixModel || 'gemma3:1b'}</span></span>
          <span className="ipi-meta-tag"><span className="ipi-meta-label">Verifier</span><span className="ipi-meta-value">{ipiRun.checkModel || 'qwen2.5-coder:1.5b'}</span></span>
          <span className="ipi-meta-tag"><span className="ipi-meta-label">{t(locale, 'panel.runtime')}</span><span className="ipi-meta-value">Ollama local</span></span>
        </div>
      </div>

      <p role="status">{t(locale, 'panel.processing', { status: processingLabel(ipiRun.processingStatus, locale) })}{ipiRun.status !== 'idle' && t(locale, 'panel.roundOne')}</p>

      {ipiRun.error && !ipiRunning && <div className="error-bar" role="alert">{ipiRun.error}</div>}

      {ipiRun.events.length === 0 && !ipiRunning ? (
        <div className="copilot-hero">
          <div className="copilot-hero-badge">{t(locale, 'panel.heroBadge')}</div>
          <h2 className="copilot-hero-title">{t(locale, 'panel.heroTitle')}</h2>
          <p className="copilot-hero-desc">{t(locale, 'panel.heroDesc')}</p>
          <div className="copilot-steps-grid">
            <div className="copilot-step-tile"><div className="copilot-tile-num">01</div><div className="copilot-tile-title">{t(locale, 'panel.stepPrefilterTitle')}</div><div className="copilot-tile-desc">{t(locale, 'panel.stepPrefilterDesc')}</div></div>
            <div className="copilot-step-tile"><div className="copilot-tile-num">02</div><div className="copilot-tile-title">{t(locale, 'panel.stepDetectorTitle')}</div><div className="copilot-tile-desc">{t(locale, 'panel.stepDetectorDesc')}</div></div>
            <div className="copilot-step-tile"><div className="copilot-tile-num">03</div><div className="copilot-tile-title">{t(locale, 'panel.stepVerifierTitle')}</div><div className="copilot-tile-desc">{t(locale, 'panel.stepVerifierDesc')}</div></div>
          </div>
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
                  <li key={`${finding.ruleId}-${finding.location}-${index}`} className="ipi-finding-item">
                    <div className="ipi-finding-header"><span className="ipi-finding-rule">{finding.ruleId}</span><strong className="ipi-finding-title">{finding.title}</strong></div>
                    <div className="ipi-finding-loc">{finding.location}</div>
                    {finding.evidence.slice(0, 3).map((evidence, evidenceIndex) => <div key={evidenceIndex} className="ipi-finding-ev">{evidence}</div>)}
                  </li>
                ))}
              </ul>
            )}
            {coverage && (
              <div className="ipi-coverage-summary">
                <strong>{coverage.scanProfile === 'deep' ? t(locale, 'panel.coverageDeep') : t(locale, 'panel.coverageBalanced')}</strong> {t(locale, 'panel.coverageBody', { total: coverage.totalChunks, selected: coverage.aiReviewedChunks })}
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
            <ul className="ipi-finding-list">{ipiRun.suspicions.map(item => <li key={item.id} className="ipi-finding-item">
              <strong>{item.id} · {item.source} · {suspicionStatus(item.status, locale)}</strong>
              <p>{item.location}</p>
              <blockquote>{item.originalQuote || t(locale, 'panel.noOriginalQuote')}</blockquote>
              {(['detector', 'verifier'] as const).map(role => <div key={role} className="ipi-verdict-block">
                <strong>{role === 'detector' ? 'Detector' : 'Verifier'}</strong>
                {item[role] ? <>
                  <p>{stanceLabel(item[role]?.stance, locale)}: {item[role]?.reason}</p>
                  <blockquote>{item[role]?.citation.quote}</blockquote>
                  {item[role]?.directiveContext && <DirectiveContextEvidence value={item[role]!.directiveContext!} locale={locale} />}
                  <small>{item[role]?.citation.filePath || item[role]?.citation.fileName}:{item[role]?.citation.startLine}–{item[role]?.citation.endLine}</small>
                  {item[role]?.citation.sourceView && <small> · {item[role]?.citation.sourceView} · {item[role]?.citation.lineBasis === 'source' ? t(locale, 'panel.lineInRawHtml') : t(locale, 'panel.lineInProjection')}</small>}
                </> : <p>{t(locale, 'panel.noRoleAssessment')}</p>}
              </div>)}
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
