import React, { useMemo, useState } from 'react';
import { IpiLoopEvent } from '../types';
import { useStore } from '../store/useStore';

function phaseLabel(event: IpiLoopEvent) {
  switch (event.phase) {
    case 'detect': return 'PREFILTER';
    case 'fix': return 'DETECTOR';
    case 'check': return 'VERIFIER';
    case 'done': return 'KẾT QUẢ';
    default: return 'HỆ THỐNG';
  }
}

export const IpiAgentPanel: React.FC = () => {
  const { ipiRun, ipiRunning } = useStore();
  const [showTimeline, setShowTimeline] = useState(false);
  const findings = useMemo(() => ipiRun.scanResult?.findings || [], [ipiRun.scanResult]);
  const coverage = ipiRun.scanResult?.metadata?.coverage;

  const statusLabel = ipiRun.status === 'passed'
    ? 'VERIFIER PASS - KHÔNG PHÁT HIỆN IPI'
    : ipiRun.status === 'failed'
      ? 'CẢNH BÁO - PHÁT HIỆN RỦI RO IPI'
      : ipiRun.status === 'running'
        ? 'ĐANG PHÂN TÍCH TÀI LIỆU'
        : 'SẴN SÀNG QUÉT IPI';

  return (
    <div className="ipi-panel copilot-container">
      <div className="ipi-status-bar">
        <span className={`ipi-badge ipi-badge-${ipiRun.status}`}>{statusLabel}</span>
        <div className="ipi-meta-tags">
          <span className="ipi-meta-tag"><span className="ipi-meta-label">Detector</span><span className="ipi-meta-value">{ipiRun.fixModel || 'gemma3:1b'}</span></span>
          <span className="ipi-meta-tag"><span className="ipi-meta-label">Verifier</span><span className="ipi-meta-value">{ipiRun.checkModel || 'qwen2.5-coder:1.5b'}</span></span>
          <span className="ipi-meta-tag"><span className="ipi-meta-label">Runtime</span><span className="ipi-meta-value">Ollama local</span></span>
        </div>
      </div>

      {ipiRun.error && !ipiRunning && <div className="error-bar" role="alert">{ipiRun.error}</div>}

      {ipiRun.events.length === 0 && !ipiRunning ? (
        <div className="copilot-hero">
          <div className="copilot-hero-badge">Local TinyLLM Multi-Agent</div>
          <h2 className="copilot-hero-title">SENTINEL IPI Document Scanner</h2>
          <p className="copilot-hero-desc">
            Phát hiện Indirect Prompt Injection trong tài liệu trước khi chúng được nạp vào LLM hoặc RAG.
            Nội dung chỉ được xử lý bởi Ollama local trên máy.
          </p>
          <div className="copilot-steps-grid">
            <div className="copilot-step-tile"><div className="copilot-tile-num">01</div><div className="copilot-tile-title">Rule Prefilter</div><div className="copilot-tile-desc">Tìm instruction override, jailbreak, Base64, delimiter smuggling và steganography.</div></div>
            <div className="copilot-step-tile"><div className="copilot-tile-num">02</div><div className="copilot-tile-title">Detector</div><div className="copilot-tile-desc">TinyLLM đọc ngữ nghĩa và xác định ý đồ thao túng LLM.</div></div>
            <div className="copilot-step-tile"><div className="copilot-tile-num">03</div><div className="copilot-tile-title">Verifier</div><div className="copilot-tile-desc">TinyLLM thứ hai phản biện độc lập và đưa ra phán quyết.</div></div>
          </div>
        </div>
      ) : (
        <>
          <section className="copilot-step-card card-active">
            <div className="copilot-card-head">
              <div>
                <span className="copilot-card-step-badge badge-detect">BƯỚC 01: RULE PREFILTER</span>
                <h3 className="copilot-card-title" style={{ marginTop: 4 }}>Evidence IPI trong tài liệu</h3>
              </div>
              <div className="copilot-card-agent-tag">{findings.length} finding</div>
            </div>
            {findings.length === 0 ? (
              <p className="empty-state-tip" style={{ color: 'var(--low)', fontWeight: 600 }}>Không có pattern IPI nào được rule prefilter phát hiện.</p>
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
                <strong>{coverage.scanProfile === 'deep' ? 'Deep Scan coverage:' : 'Semantic coverage:'}</strong> Rule Prefilter đã quét {coverage.totalChunks} chunk; TinyLLM đã review {coverage.aiReviewedChunks}/{coverage.totalChunks} chunk theo chiến lược ưu tiên, sentinel và sampling.
                {coverage.coverageLimited && ' Kết luận semantic có phạm vi giới hạn; dùng Deep Scan khi cần độ phủ cao hơn.'}
              </div>
            )}
          </section>

          <section className="copilot-step-card card-active">
            <div className="copilot-card-head">
              <div>
                <span className="copilot-card-step-badge badge-fix">BƯỚC 02: DETECTOR</span>
                <h3 className="copilot-card-title" style={{ marginTop: 4 }}>Phân tích ý đồ bằng {ipiRun.fixModel || 'gemma3:1b'}</h3>
              </div>
            </div>
            <div className="copilot-explain-box">
              Detector đọc các batch chunk được chọn theo mức rủi ro, các chunk kề finding, đầu/giữa/cuối tài liệu và mẫu phủ vùng im lặng; không còn chỉ nhận phần đầu của file.
            </div>
          </section>

          {ipiRun.check && (
            <section className={`copilot-step-card ${ipiRun.check.verdict === 'pass' ? 'card-pass' : 'card-fail'}`}>
              <div className="copilot-card-head">
                <div>
                  <span className="copilot-card-step-badge badge-check">BƯỚC 03: VERIFIER</span>
                  <h3 className="copilot-card-title" style={{ marginTop: 4 }}>Thẩm định độc lập bằng {ipiRun.check.modelUsed || ipiRun.checkModel || 'qwen2.5-coder:1.5b'}</h3>
                </div>
                <span className={`ipi-verdict-badge ${ipiRun.check.verdict === 'pass' ? 'verdict-badge-pass' : 'verdict-badge-fail'}`}>PHÁN QUYẾT: {ipiRun.check.verdict.toUpperCase()}</span>
              </div>
              <div className="ipi-verdict-body">
                <div className="ipi-verdict-block"><div className="ipi-verdict-block-title">Căn cứ thẩm định</div><ul className="ipi-verdict-list">{ipiRun.check.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></div>
                {ipiRun.check.residualRisks.length > 0 && <div className="ipi-verdict-block ipi-verdict-block-risk"><div className="ipi-verdict-block-title risk">Rủi ro còn lại</div><ul className="ipi-verdict-list risk">{ipiRun.check.residualRisks.map((risk, index) => <li key={index}>{risk}</li>)}</ul></div>}
              </div>
            </section>
          )}

          <section className="ipi-section" style={{ marginTop: 8 }}>
            <div className="ipi-section-head">
              <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>Nhật ký pipeline ({ipiRun.events.length} bước)</h4>
              <button type="button" className="ipi-toggle-btn" onClick={() => setShowTimeline(!showTimeline)}>{showTimeline ? 'Thu gọn' : 'Mở rộng'}</button>
            </div>
            {showTimeline && <div className="ipi-timeline-feed" style={{ marginTop: 10 }}>
              {ipiRun.events.map((event, index) => <div key={`${event.ts}-${index}`} className="ipi-tl-item phase-info"><div className="ipi-tl-left"><span className="phase-tag phase-info">{phaseLabel(event)}</span><span className="ipi-tl-time">{new Date(event.ts).toLocaleTimeString('vi-VN', { hour12: false })}</span></div><div className="ipi-tl-body"><div className="ipi-tl-msg">{event.message}</div></div></div>)}
            </div>}
          </section>
        </>
      )}
    </div>
  );
};
