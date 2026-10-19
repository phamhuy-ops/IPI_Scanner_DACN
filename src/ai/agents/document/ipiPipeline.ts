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
    throw new Error('Bridge scanIpiDoc không khả dụng trong môi trường này.');
  }

  try {
    emit(event({ phase: 'detect', message: options.folderPath ? 'Bắt đầu tìm và trích xuất tài liệu trong thư mục...' : `Bắt đầu trích xuất nội dung từ ${options.filePaths.length} tài liệu...`, findingCount: 0, iteration: 1 }));
    await delay(600);
    const scanResult: ScanResult = options.folderPath
      ? await bridge.scanIpiDocFolder(options.folderPath, options.scanProfile)
      : await bridge.scanIpiDoc(options.filePaths, options.scanProfile);
    if (!scanResult.ok) throw new Error(scanResult.error || 'Không thể quét tài liệu.');

    state.scanResult = scanResult;
    const initialFindings = scanResult.findings || [];
    const semanticChunks = (scanResult.metadata.semanticChunks as SemanticChunk[]) || [];
    if (!semanticChunks.length) throw new Error('Không trích xuất được chunk văn bản để phân tích ngữ nghĩa.');
    const coverage = scanResult.metadata.coverage;

    emit(event({ phase: 'detect', message: `Knowledge Base Scanner: Phát hiện ${initialFindings.length} dấu hiệu nguy cơ IPI (qua 35+ luật kiểm thử chuyên sâu).`, findingCount: initialFindings.length, iteration: 1 }));
    await delay(800);
    emit(event({ phase: 'fix', message: `Detector Agent (${state.fixModel}) đang đọc và phân tích ngữ nghĩa chuyên sâu (Semantic Intent & Context reasoning)...`, findingCount: initialFindings.length, iteration: 1 }));

    const plannedBatchCount = Math.ceil(semanticChunks.length / (coverage?.detectorBatchSize || 3));
    emit(event({ phase: 'fix', message: `${coverage?.scanProfile === 'deep' ? 'Deep Scan' : 'Balanced Scan'}: Detector sẽ xem ${semanticChunks.length}/${coverage?.totalChunks || semanticChunks.length} chunk qua ${plannedBatchCount} batch nhỏ.`, findingCount: initialFindings.length, iteration: 1 }));
    const detectorReview = await runDetectorAgent({ chunks: semanticChunks, coverage, initialFindingCount: initialFindings.length, model: state.fixModel });
    state.fixModel = detectorReview.model;
    emit(event({ phase: 'fix', message: `Detector Agent (${state.fixModel}): đã hoàn tất ${detectorReview.batchCount} batch; ${detectorReview.suspiciousBatchCount} batch nghi ngờ IPI. ${detectorReview.semanticAnalysis.slice(0, 120)}...`, findingCount: initialFindings.length, iteration: 1 }));

    await releaseSlmModel(state.fixModel || 'gemma3:1b');
    await delay(800);
    emit(event({ phase: 'check', message: `Check Agent (${state.checkModel}) đang thẩm định độc lập và phản biện chéo kết quả...`, findingCount: initialFindings.length, iteration: 1 }));
    const checkVerdict = await runVerifierAgent({ chunks: semanticChunks, coverage, detectorReview, initialFindingCount: initialFindings.length, model: state.checkModel });
    state.checkModel = checkVerdict.modelUsed;
    state.check = checkVerdict;
    state.status = checkVerdict.verdict === 'pass' ? 'passed' : 'failed';

    emit(event({ phase: 'check', message: `Check Agent (${checkVerdict.modelUsed || 'SLM'}): Đã thẩm định xong — Phán quyết [${checkVerdict.verdict.toUpperCase()}].`, findingCount: initialFindings.length, iteration: 1 }));
    await delay(500);
    emit(event({ phase: 'done', message: checkVerdict.verdict === 'pass' ? 'Tài liệu sạch: Check Agent xác nhận không có nguy cơ Indirect Prompt Injection.' : `Cảnh báo an toàn: Phát hiện ${initialFindings.length} nguy cơ IPI độc hại trong tài liệu đã chọn.`, findingCount: initialFindings.length, iteration: 1 }));
    return state;
  } catch (err: unknown) {
    const errorMessage = (err instanceof Error ? err.message : String(err)) || 'Lỗi quét tài liệu Multi-Agent';
    state.status = 'failed';
    state.error = errorMessage;
    emit(event({ phase: 'error', message: `Lỗi pipeline: ${errorMessage}` }));
    return state;
  } finally {
    await releaseSlmModel(state.fixModel || 'gemma3:1b');
    await releaseSlmModel(state.checkModel || 'qwen2.5-coder:1.5b');
  }
}
