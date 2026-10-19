# SENTINEL IPI Refocus Manifest

## Muc tieu

Chuyen SENTINEL thanh ung dung desktop local-first, dung hai TinyLLM qua
Ollama de phat hien va xac minh Indirect Prompt Injection (IPI) trong mot
tai lieu hoac mot thu muc tai lieu. Pham vi nay khong con bao gom OWASP Top
10, quet website, quet source code tong quat, hay chatbot AI dung cloud API.

## Giu lai

- `electron/main.js` va `electron/preload.js`: bridge Electron, IPC, chon
  file/thu muc va ket noi Ollama local-only.
- `engine/utils/ipi-doc-extract.js`: doc text tu `txt`, `md`, `csv`, `json`,
  `xml`, `html`, `pdf`, `doc`, va `docx`.
- `engine/scanner/ipi-doc-scan.js`: bo loc rule-based cho tai lieu.
- `src/ai/agents/ipiDocAgent.ts`: Detector va Verifier cho tai lieu.
- `src/ai/agents/slmClient.ts` va `src/ai/agents/slmCatalog.ts`: lop goi
  TinyLLM Ollama-only voi `gemma3:1b` va `qwen2.5-coder:1.5b`.
- `src/components/IpiAgentForm.tsx`, `src/components/IpiAgentPanel.tsx`:
  giao dien IPI hien co, se doi ten va don gian hoa.
- `src/store/useStore.ts`, `src/types.ts`, `src/index.css`, asset icon va
  cau hinh build Electron/React can thiet.
- Test IPI: `engine/scanner/ipi-doc-scan.test.js` va test catalog TinyLLM.

## Chuyen doi

- `src/App.tsx`: chi con man hinh quet IPI document/folder va ket qua.
- `electron/main.js` va `electron/preload.js`: chi giu IPC IPI document,
  trang thai Ollama, chon document/folder, va xuat bao cao IPI.
- `src/store/useStore.ts` va `src/types.ts`: bo state cua URL/project scan,
  checklist va lich su OWASP; giu state cua IPI run va metric benchmark.
- `README.md` va `.env.example`: da viet lai theo de tai IPI local-first.
  File `.env` dang la file may cuc bo, khong sua hay xoa.

## Da xoa

- Quet website va OWASP source scan:
  `engine/rules/a01` den `engine/rules/a10`, `engine/rules/generic`,
  `engine/rules/source-enhanced`, `engine/collectors/blackbox`,
  `engine/collectors/source`, `engine/collectors/checklist`,
  `engine/scanner/scan-engine.js`, `rule-engine.js`, `payload-engine.js`,
  `fuzzer.js`, `analyzer.js`, `verifier.js`, `route-probing.test.js`, va
  test tuong ung.
- UI/AI cu: `UrlScanForm`, `ProjectScanForm`, `ChecklistPanel`,
  `ChecklistRightPanel`, `ResultsPanel`, `FindingsList`, `RiskDashboard`,
  `ScanProgress`, `AIChatWidget`, `HistoryPanel`, `ReportExportButton`,
  `src/ai/llm/*` (ngoai phan can duoc xac nhan IPI dang dung),
  `src/ai/aiRouter.ts`, `contextRetriever.ts`, `faqData.ts`, va
  `src/utils/owasp.ts`, `remediationPlan.ts`.
- Tai lieu/tap tin sinh ra cua do an cu:
  `scratch/` (~41.6 MB: PowerPoint, DOC/DOCX, anh render, file extract),
  `CODEBASE_ANALYSIS.md`, `eslint_report.json`, `eslint-output.json`.
  `dist-electron/` la output build (~2.8 MB), co the tao lai bang build nen
  se xoa o lan clean output cuoi cung.

## Khong dong vao khi clean

- `package-lock.json` dang co thay doi tu truoc; giu nguyen cho den khi da
  kiem tra nguon goc thay doi.
- `.env` co the chua khoa API tren may; khong commit, khong sua, khong xoa.
- `build/` va `public/app-icon.png` duoc giu de tranh mat icon dong goi.

## Viec tiep theo

Tao bo benchmark IPI co nhan va ghi metric: precision, recall, F1, false
positive, ty le hai agent dong y, thoi gian/file va RAM/VRAM su dung.

## Tieu chi hoan thanh

- App khong hien thi OWASP Top 10, quet website, quet project source, hay API key cloud.
- Nguoi dung chon mot document hoac folder document va nhan bao cao IPI co evidence.
- Detector va Verifier chay local qua Ollama; neu Ollama/model khong san sang,
  app bao loi ro rang va khong fallback sang cloud.
- Co the lap lai benchmark tren cung dataset va model configuration.
