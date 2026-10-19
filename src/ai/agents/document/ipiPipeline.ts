import { IpiLoopEvent, IpiRunState, ScanResult, SemanticScanProfile } from '../../../types';
import { releaseSlmModel } from '../slmClient';
import { runDetectorAgent } from './detectorAgent';
import { runVerifierAgent } from './verifierAgent';
import { SemanticChunk } from './types';

function event(partial: Omit<IpiLoopEvent, 'ts'>): IpiLoopEvent {
  return { ts: Date.now(), ...partial };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  onEvent?: (ev: IpiLoopEvent, state: IpiRunState) => void;
}

export async function runIpiDocumentPipeline(options: IpiDocumentPipelineOptions): Promise<IpiRunState> {
  const state: IpiRunState = {
    status: 'running', events: [], scanResult: null, check: null, error: null,
    fixModel: options.fixModel || 'gemma3:1b',
    checkModel: options.checkModel || 'qwen2.5-coder:1.5b',
  };
  const emit = (ev: IpiLoopEvent) => {
    state.events = [...state.events, ev];
    options.onEvent?.(ev, { ...state });
  };
  const bridge = getWorkbenchBridge();
  if (!bridge?.scanIpiDoc || (options.folderPath && !bridge.scanIpiDocFolder)) {
    throw new Error('scanIpiDoc bridge is not available in this environment.');
  }

  try {
    emit(event({ phase: 'detect', message: options.folderPath ? 'Finding and extracting documents in folder...' : `Extracting content from ${options.filePaths.length} document(s)...`, findingCount: 0, iteration: 1 }));
    await delay(600);
    const scanResult: ScanResult = options.folderPath
      ? await bridge.scanIpiDocFolder(options.folderPath, options.scanProfile)
      : await bridge.scanIpiDoc(options.filePaths, options.scanProfile);
    if (!scanResult.ok) throw new Error(scanResult.error || 'Document scan failed.');

    state.scanResult = scanResult;
    const initialFindings = scanResult.findings || [];
    const semanticChunks = (scanResult.metadata.semanticChunks as SemanticChunk[]) || [];
    if (!semanticChunks.length) throw new Error('No text chunks extracted for semantic analysis.');
    const coverage = scanResult.metadata.coverage;

    emit(event({ phase: 'detect', message: `Knowledge base scan: ${initialFindings.length} IPI risk signal(s) (35+ rules).`, findingCount: initialFindings.length, iteration: 1 }));
    await delay(800);
    emit(event({ phase: 'fix', message: `Detector Agent (${state.fixModel}) running semantic intent analysis...`, findingCount: initialFindings.length, iteration: 1 }));

    const plannedBatchCount = Math.ceil(semanticChunks.length / (coverage?.detectorBatchSize || 3));
    emit(event({ phase: 'fix', message: `${coverage?.scanProfile === 'deep' ? 'Deep Scan' : 'Balanced Scan'}: Detector will read ${semanticChunks.length}/${coverage?.totalChunks || semanticChunks.length} chunk(s) in ${plannedBatchCount} batch(es).`, findingCount: initialFindings.length, iteration: 1 }));
    const detectorReview = await runDetectorAgent({ chunks: semanticChunks, coverage, initialFindingCount: initialFindings.length, model: state.fixModel });
    state.fixModel = detectorReview.model;
    emit(event({ phase: 'fix', message: `Detector Agent (${state.fixModel}): finished ${detectorReview.batchCount} batch(es); ${detectorReview.suspiciousBatchCount} suspicious. ${detectorReview.semanticAnalysis.slice(0, 120)}...`, findingCount: initialFindings.length, iteration: 1 }));

    await releaseSlmModel(state.fixModel || 'gemma3:1b');
    await delay(800);
    emit(event({ phase: 'check', message: `Verifier Agent (${state.checkModel}) cross-checking results...`, findingCount: initialFindings.length, iteration: 1 }));
    const checkVerdict = await runVerifierAgent({ chunks: semanticChunks, coverage, detectorReview, initialFindingCount: initialFindings.length, model: state.checkModel });
    state.checkModel = checkVerdict.modelUsed;
    state.check = checkVerdict;
    state.status = checkVerdict.verdict === 'pass' ? 'passed' : 'failed';

    emit(event({ phase: 'check', message: `Verifier Agent (${checkVerdict.modelUsed || 'SLM'}): review complete — verdict [${checkVerdict.verdict.toUpperCase()}].`, findingCount: initialFindings.length, iteration: 1 }));
    await delay(500);
    emit(event({ phase: 'done', message: checkVerdict.verdict === 'pass' ? 'Clean document: Verifier confirms no Indirect Prompt Injection risk.' : `Security warning: ${initialFindings.length} harmful IPI risk(s) in selected document(s).`, findingCount: initialFindings.length, iteration: 1 }));
    return state;
  } catch (err: unknown) {
    const errorMessage = (err instanceof Error ? err.message : String(err)) || 'Multi-agent document scan error';
    state.status = 'failed';
    state.error = errorMessage;
    emit(event({ phase: 'error', message: `Pipeline error: ${errorMessage}` }));
    return state;
  } finally {
    await releaseSlmModel(state.fixModel || 'gemma3:1b');
    await releaseSlmModel(state.checkModel || 'qwen2.5-coder:1.5b');
  }
}
