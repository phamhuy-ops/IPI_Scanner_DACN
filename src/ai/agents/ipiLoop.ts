import { Finding, IpiLoopEvent, IpiPatch, IpiRunState, ScanResult } from '../../types';
import { runCheckAgent } from './checkAgent';
import { runFixAgent } from './fixAgent';

// Safety caps — người dùng không cấu hình, vòng lặp tự dừng khi hết lỗi.
// Các giá trị này chỉ ngăn vòng lặp vô hạn nếu có bug hoặc mô hình không hội tụ.
const SAFETY_FIX_CAP = 20;    // tối đa 20 lần fix liên tiếp
const SAFETY_CHECK_CAP = 5;   // tối đa 5 vòng check

function event(partial: Omit<IpiLoopEvent, 'ts'>): IpiLoopEvent {
  return { ts: Date.now(), ...partial };
}

function getWorkbench() {
  if (typeof window !== 'undefined' && window.owaspWorkbench) {
    return window.owaspWorkbench;
  }
  const g = globalThis as unknown as { owaspWorkbench?: Window['owaspWorkbench'] };
  if (g.owaspWorkbench) {
    return g.owaspWorkbench;
  }
  throw new Error('Cần chạy trong môi trường Electron (owaspWorkbench bridge không khả dụng).');
}

function lineFromLocation(location: string): number {
  const m = String(location || '').match(/:(\d+)(?::\d+)?$/);
  return m ? Number(m[1]) : 1;
}

async function scanIpi(folderPath: string): Promise<ScanResult> {
  const result = await getWorkbench().scanIpi(folderPath);
  return result;
}

async function snippetFor(folderPath: string, finding: Finding) {
  return getWorkbench().readIpiSnippet({
    folderPath,
    filePath: finding.target || finding.location,
    aroundLine: lineFromLocation(finding.location),
    radius: 45,
  });
}

export async function runIpiMultiAgentLoop(options: {
  folderPath: string;
  providerMode?: 'auto' | 'ollama' | 'cloud';
  fixModel?: string;
  checkModel?: string;
  onEvent?: (ev: IpiLoopEvent, state: IpiRunState) => void;
}): Promise<IpiRunState> {
  // Tự động lặp đến khi sạch lỗi — không cần người dùng đặt giới hạn.
  const maxFix = SAFETY_FIX_CAP;
  const state: IpiRunState = {
    status: 'running',
    events: [],
    scanResult: null,
    lastPatches: [],
    check: null,
    error: null,
  };

  const emit = (ev: IpiLoopEvent) => {
    state.events = [...state.events, ev];
    options.onEvent?.(ev, { ...state });
  };

  try {
    let reviewerNotes = '';
    let fixModel = '';
    let checkModel = '';

    for (let checkRound = 1; checkRound <= SAFETY_CHECK_CAP; checkRound += 1) {
      let scan = await scanIpi(options.folderPath);
      state.scanResult = scan;
      emit(event({
        phase: 'detect',
        message: `Detector: ${scan.findings?.length || 0} IPI finding(s)`,
        findingCount: scan.findings?.length || 0,
        iteration: checkRound,
      }));

      let iter = 0;
      // Lặp liên tục cho đến khi hết finding hoặc chạm safety cap
      while ((scan.findings?.length || 0) > 0 && iter < maxFix) {
        iter += 1;
        const finding = scan.findings[0];
        emit(event({
          phase: 'fix',
          message: `Fix Agent xử lý ${finding.location || finding.target}`,
          iteration: iter,
          findingCount: scan.findings.length,
        }));

        const snip = await snippetFor(options.folderPath, finding);
        if (!snip.ok || !snip.snippet) {
          throw new Error(snip.error || 'Không đọc được snippet để vá.');
        }

        const fix = await runFixAgent({
          finding,
          snippet: snip.snippet,
          filePath: finding.target,
          reviewerNotes: reviewerNotes || undefined,
          providerMode: options.providerMode,
          preferModel: options.fixModel,
        });
        fixModel = fix.modelUsed;
        state.fixModel = fixModel;
        state.lastPatches = fix.patches;

        if (!fix.patches.length) {
          emit(event({ phase: 'fix', message: 'Fix Agent không tạo được patch khớp snippet — dừng vòng lặp fix', iteration: iter }));
          break;
        }

        // Kiểm tra safety cap
        if (iter >= maxFix) {
          emit(event({ phase: 'fix', message: `Safety cap đạt ${maxFix} vòng fix — mã nguồn có thể cần sửa thủ công`, iteration: iter }));
          break;
        }

        const applied = await getWorkbench().applyIpiPatches({
          folderPath: options.folderPath,
          patches: fix.patches,
        });
        const okCount = (applied.results || []).filter((r: { ok: boolean }) => r.ok).length;
        emit(event({
          phase: 'apply',
          message: `Áp dụng ${okCount}/${fix.patches.length} patch. ${fix.summary}`,
          iteration: iter,
        }));
        if (!okCount) break;

        scan = await scanIpi(options.folderPath);
        state.scanResult = scan;
        emit(event({
          phase: 're-scan',
          message: `Quét lại: còn ${scan.findings?.length || 0} IPI`,
          iteration: iter,
          findingCount: scan.findings?.length || 0,
        }));
      }

      if ((scan.findings?.length || 0) > 0) {
        state.status = 'failed';
        state.error = 'Detector vẫn còn IPI sau vòng Fix. Chưa chuyển Check Agent.';
        emit(event({ phase: 'done', message: state.error, findingCount: scan.findings.length }));
        return state;
      }

      emit(event({ phase: 'check', message: `Check Agent rà soát độc lập (round ${checkRound})` }));

      const sampleFindings = (state.lastPatches.length
        ? state.lastPatches
        : [{ filePath: options.folderPath, search: '', replace: '' } as IpiPatch]
      ).slice(0, 4);

      const snippets = [];
      for (const patch of sampleFindings) {
        if (!patch.filePath) continue;
        const read = await getWorkbench().readIpiSnippet({
          folderPath: options.folderPath,
          filePath: patch.filePath,
          aroundLine: 1,
          radius: 80,
        });
        if (read.ok && read.snippet) snippets.push({ filePath: patch.filePath, snippet: read.snippet });
      }

      const check = await runCheckAgent({
        findingsAfterFix: scan.findings || [],
        patches: state.lastPatches,
        snippets,
        providerMode: options.providerMode,
        preferModel: options.checkModel,
      });
      checkModel = check.modelUsed || checkModel;
      state.check = check;
      state.checkModel = checkModel;

      if (check.verdict === 'pass') {
        state.status = 'passed';
        emit(event({
          phase: 'done',
          message: `OK — Detector sạch và Check Agent pass (${check.modelUsed || 'SLM'})`,
          findingCount: 0,
        }));
        return state;
      }

      reviewerNotes = [...(check.reasons || []), ...(check.residualRisks || [])].join('\n');
      emit(event({
        phase: 'check',
        message: `Check Agent fail: ${reviewerNotes.slice(0, 240) || 'còn rủi ro IPI'}`,
      }));

      // Nếu Check Agent từ chối và còn vòng, yêu cầu Fix Agent sửa theo phản biện
      if (checkRound < SAFETY_CHECK_CAP) {
        const targetPath = state.lastPatches[0]?.filePath || options.folderPath;
        emit(event({
          phase: 'fix',
          message: `Fix Agent tiếp nhận phản biện từ Check Agent: sửa lại ${targetPath}`,
          iteration: checkRound,
        }));

        const readSnip = await getWorkbench().readIpiSnippet({
          folderPath: options.folderPath,
          filePath: targetPath,
          aroundLine: 1,
          radius: 80,
        });

        if (readSnip.ok && readSnip.snippet) {
          const syntheticFinding: Finding = {
            ruleId: 'IPI-CHECK-FEEDBACK',
            owaspCategory: 'LLM01',
            title: 'Phản biện từ Check Agent: Còn rủi ro Indirect Prompt Injection',
            severity: 'high',
            confidence: 'high',
            target: targetPath,
            location: `${targetPath}:1`,
            evidence: check.reasons || [],
            remediation: reviewerNotes,
            references: [],
            collector: 'source',
          };

          const followUpFix = await runFixAgent({
            finding: syntheticFinding,
            snippet: readSnip.snippet,
            filePath: targetPath,
            reviewerNotes,
            providerMode: options.providerMode,
            preferModel: options.fixModel,
          });

          if (followUpFix.patches.length) {
            state.lastPatches = followUpFix.patches;
            const applied = await getWorkbench().applyIpiPatches({
              folderPath: options.folderPath,
              patches: followUpFix.patches,
            });
            const okCount = (applied.results || []).filter((r: { ok: boolean }) => r.ok).length;
            emit(event({
              phase: 'apply',
              message: `Fix Agent đã vá theo phản biện (${okCount}/${followUpFix.patches.length} patch)`,
              iteration: checkRound,
            }));
          }
        }
      }
    }

    state.status = 'failed';
    state.error = 'Check Agent chưa pass sau các vòng xác minh.';
    emit(event({ phase: 'done', message: state.error }));
    return state;
  } catch (err) {
    state.status = 'failed';
    state.error = err instanceof Error ? err.message : String(err);
    emit(event({ phase: 'error', message: state.error }));
    return state;
  }
}
