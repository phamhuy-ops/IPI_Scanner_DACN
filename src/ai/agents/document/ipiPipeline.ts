import { IpiLoopEvent, IpiRunState, ReviewContract, ScanResult, SemanticScanProfile, VerifierOutputFormat } from '../../../types';
import { releaseSlmModel, withTimeout } from '../slmClient';
import { runDetectorAgent } from './detectorAgent';
import { runVerifierAgent } from './verifierAgent';
import { conclude, coverageIssues, InvalidAgentResponse, ruleSuspicions } from './reviewPolicy';
import { SemanticChunk } from './types';

function getWorkbenchBridge() {
  if (typeof window !== 'undefined' && window.owaspWorkbench) return window.owaspWorkbench;
  return (globalThis as unknown as { owaspWorkbench?: Window['owaspWorkbench'] }).owaspWorkbench;
}

export interface IpiDocumentPipelineOptions {
  filePaths: string[];
  folderPath?: string;
  scanProfile?: SemanticScanProfile;
  providerMode?: 'ollama';
  fixModel?: string;
  checkModel?: string;
  analysisTimeoutMs?: number;
  reviewContract?: ReviewContract;
  verifierOutput?: VerifierOutputFormat;
  onEvent?: (ev: IpiLoopEvent, state: IpiRunState) => void;
}

/** One review round. Debate/retries are deliberately not implicit here. */
export async function runIpiDocumentPipeline(options: IpiDocumentPipelineOptions): Promise<IpiRunState> {
  const state: IpiRunState = {
    reviewContract: options.reviewContract || 'classic-v1',
    verifierOutput: options.verifierOutput || 'standard',
    status: 'running', processingStatus: 'running', suspicions: [],
    events: [], scanResult: null, check: null, error: null,
    fixModel: options.fixModel || 'gemma3:1b', checkModel: options.checkModel || 'qwen2.5-coder:1.5b',
  };
  const emit = (partial: Omit<IpiLoopEvent, 'ts'>) => {
    const event = { ...partial, ts: Date.now(), iteration: 1 };
    state.events = [...state.events, event];
    options.onEvent?.(event, { ...state, suspicions: state.suspicions.map(row => ({ ...row })) });
  };
  const deadline = Date.now() + (options.analysisTimeoutMs ?? 180_000);
  let stage: 'scan' | 'detector' | 'verifier' = 'scan';
  let issues: string[] = ['Document review has not completed.'];
  try {
    if (options.verifierOutput && !['standard', 'compact-v1'].includes(options.verifierOutput)) throw new Error('Định dạng Verifier không được hỗ trợ.');
    if (options.verifierOutput === 'compact-v1' && options.reviewContract !== 'referenced-v1') throw new Error('Verifier rút gọn yêu cầu referenced-v1.');
    if (options.reviewContract && !['classic-v1', 'structured-v1', 'referenced-v1'].includes(options.reviewContract)) throw new Error('Hợp đồng nhận định không được hỗ trợ.');
    if (!Number.isFinite(deadline) || deadline <= Date.now()) throw new Error('Analysis timeout: invalid or exhausted time budget');
    const bridge = getWorkbenchBridge();
    if (!bridge?.scanIpiDoc || (options.folderPath && !bridge.scanIpiDocFolder)) throw new Error('Document scanning bridge is unavailable.');
    emit({ phase: 'detect', message: 'Extracting documents and collecting rule suspicions.' });
    const scanResult: ScanResult = await withTimeout(options.folderPath
      ? bridge.scanIpiDocFolder(options.folderPath, options.scanProfile)
      : bridge.scanIpiDoc(options.filePaths, options.scanProfile), Math.min(60_000, deadline - Date.now()));
    state.scanResult = scanResult;
    if (!scanResult.ok) throw new Error(scanResult.error || 'Document scan failed.');
    // Compact aliases improve small-model citation fidelity; original chunk IDs
    // stay in scanResult, and citations retain source filename/line information.
    const chunks: SemanticChunk[] = (scanResult.metadata.semanticChunks || []).map((chunk, index) => ({ ...chunk, sourceChunkId: chunk.chunkId, chunkId: `chunk-${index + 1}` }));
    issues = coverageIssues(scanResult, chunks);
    state.suspicions = ruleSuspicions(scanResult.findings, chunks);
    if (!chunks.length) throw new Error('No text chunks available for review.');

    stage = 'detector';
    emit({ phase: 'fix', message: `Detector reviewing ${chunks.length} selected chunks and ${state.suspicions.length} rule suspicions.`, findingCount: state.suspicions.length });
    const detector = await runDetectorAgent({ chunks, suspicions: state.suspicions, coverage: scanResult.metadata.coverage,
      model: state.fixModel, deadline, reviewContract: state.reviewContract });
    state.fixModel = detector.model;
    await releaseSlmModel(detector.model);
    stage = 'verifier';
    emit({ phase: 'check', message: 'Verifier checking every grounded suspicion against complete source chunks.', findingCount: state.suspicions.length });
    const verifier = await runVerifierAgent({ chunks, suspicions: state.suspicions, coverage: scanResult.metadata.coverage,
      detectorReview: detector, model: state.checkModel, deadline, reviewContract: state.reviewContract, outputFormat: state.verifierOutput });
    state.checkModel = verifier.modelUsed;
    if (detector.model === verifier.modelUsed) issues.push('Both agent roles used the same model; independent model verification is limited.');
    const expectedIds = new Set(chunks.map(chunk => chunk.chunkId));
    if (detector.reviewedChunkIds.length !== expectedIds.size || verifier.reviewedChunkIds.length !== expectedIds.size ||
      [...expectedIds].some(id => !detector.reviewedChunkIds.includes(id) || !verifier.reviewedChunkIds.includes(id))) {
      issues.push('Some selected chunks were not reviewed by both agents.');
    }
    state.check = { ...conclude(state.suspicions, issues), modelUsed: verifier.modelUsed, providerUsed: verifier.providerUsed };
    state.status = 'completed'; state.processingStatus = 'completed';
    emit({ phase: 'done', message: `Review complete: ${state.check.verdict}. ${state.check.reasons.join(' ')}`, findingCount: state.suspicions.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    state.error = `${stage}: ${message}`;
    state.processingStatus = error instanceof InvalidAgentResponse ? 'invalid_response'
      : /timeout|timed out|deadline|abort/i.test(message) ? 'timeout'
        : stage === 'scan' ? 'scan_error' : 'model_error';
    state.status = 'error';
    state.check = conclude(state.suspicions, issues, state.error);
    emit({ phase: 'error', message: state.error, findingCount: state.suspicions.length });
  } finally {
    // Cleanup is bounded separately and never changes a security conclusion.
    await Promise.all([releaseSlmModel(state.fixModel || 'gemma3:1b'), releaseSlmModel(state.checkModel || 'qwen2.5-coder:1.5b')]);
  }
  return state;
}
