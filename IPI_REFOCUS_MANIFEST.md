# SENTINEL IPI Refocus Manifest

## Objective

Refocus SENTINEL as a local-first desktop application that uses two TinyLLMs
through Ollama to detect and verify Indirect Prompt Injection (IPI) in a
document or document folder. This scope no longer includes OWASP Top 10
scanning, website scanning, general source-code scanning, or cloud AI chat.

## Retained Components

- `electron/main.js` and `electron/preload.js`: Electron bridge, IPC, file or
  folder selection, and local-only Ollama access.
- `engine/document/extractors/document-text-extractor.js`: text extraction for
  `txt`, `md`, `csv`, `json`, `xml`, `html`, `pdf`, `doc`, and `docx` files.
- `engine/scanner/ipi-doc-scan.js`: document-level rule prefilter coordinator.
- `src/ai/agents/document/`: Detector, Verifier, prompts, evidence handling,
  and the document-agent pipeline.
- `src/ai/agents/slmClient.ts` and `src/ai/agents/slmCatalog.ts`: Ollama-only
  TinyLLM client and allowlist for `gemma3:1b` and `qwen2.5-coder:1.5b`.
- `src/components/IpiAgentForm.tsx` and `src/components/IpiAgentPanel.tsx`:
  the active IPI scanning interface.
- `src/store/useStore.ts`, `src/types.ts`, `src/index.css`, the application
  icon, and necessary Electron/React build configuration.
- IPI tests: document scanner tests, TinyLLM catalog tests, and agent evidence
  tests.

## Refactored Scope

- `src/App.tsx`: only the document or folder IPI scan screen and its results.
- `electron/main.js` and `electron/preload.js`: only document scan IPC, Ollama
  status, document or folder selection, and IPI report output.
- `src/store/useStore.ts` and `src/types.ts`: remove URL/project scanning,
  checklists, and OWASP history state; retain IPI run state and benchmark data.
- `README.md` and `.env.example`: rewritten for the local-first IPI project.
  The local `.env` file is not modified or removed.

## Removed Components

- Website scanning and OWASP source scanning: `engine/rules/a01` through
  `engine/rules/a10`, `engine/rules/generic`, `engine/rules/source-enhanced`,
  `engine/collectors/blackbox`, `engine/collectors/source`,
  `engine/collectors/checklist`, `engine/scanner/scan-engine.js`,
  `rule-engine.js`, `payload-engine.js`, `fuzzer.js`, `analyzer.js`,
  `verifier.js`, `route-probing.test.js`, and related tests.
- Previous UI and AI modules: `UrlScanForm`, `ProjectScanForm`,
  `ChecklistPanel`, `ChecklistRightPanel`, `ResultsPanel`, `FindingsList`,
  `RiskDashboard`, `ScanProgress`, `AIChatWidget`, `HistoryPanel`,
  `ReportExportButton`, legacy `src/ai/llm/*` modules, `src/ai/aiRouter.ts`,
  `contextRetriever.ts`, `faqData.ts`, `src/utils/owasp.ts`, and
  `remediationPlan.ts`.
- Generated files from the previous project: `scratch/` (about 41.6 MB of
  PowerPoint, DOC/DOCX, rendered images, and extracted files),
  `CODEBASE_ANALYSIS.md`, `eslint_report.json`, and `eslint-output.json`.
  `dist-electron/` is build output and can be recreated during the final clean.

## Files to Preserve During Cleanup

- Keep existing `package-lock.json` changes until their source is verified.
- `.env` may contain local API credentials. Do not commit, edit, or remove it.
- Keep `build/` and `public/app-icon.png` to preserve the packaged icon.

## Next Work

Create a labeled IPI benchmark set and record precision, recall, F1, false
positive rate, Detector/Verifier agreement, time per file, and RAM/VRAM use.

## Completion Criteria

- The app does not expose OWASP Top 10, website scanning, source-code scanning,
  or cloud API-key workflows.
- A user can select a document or document folder and receive an IPI report
  with evidence.
- Detector and Verifier run locally through Ollama. If Ollama or a required
  model is unavailable, the app returns a clear error and does not use cloud
  fallback.
- The benchmark can be repeated with the same dataset and model configuration.
