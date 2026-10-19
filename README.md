# SENTINEL - Local TinyLLM IPI Scanner

SENTINEL la ung dung desktop Electron + React phat hien **Indirect Prompt
Injection (IPI)** trong tai lieu va thu muc tai lieu. Toan bo phan tich AI
chay local qua Ollama, khong gui noi dung tai lieu hay API key len cloud.

## Pipeline

1. Chon mot hay nhieu tai lieu, hoac mot thu muc tai lieu.
2. Trich xuat text va quet nhanh bang rule-based prefilter: instruction
   override, system prompt spoofing, jailbreak, delimiter smuggling, Base64,
   zero-width characters va data exfiltration.
3. **Detector Agent** (`gemma3:1b`) phan tich ngu nghia va y do.
4. **Verifier Agent** (`qwen2.5-coder:1.5b`) phan bien doc lap va ket luan pass/fail.
5. Hien thi finding, evidence, nhan dinh cua hai agent va ban noi dung da
   duoc trung hoa de tai ve khi can.

Detector va Verifier deu phai tra loi thanh cong. Neu Ollama khong chay, model
chua duoc tai, hoac mot agent loi, phien quet that bai ro rang; khong co cloud
fallback hay ket qua gia lap.

## Yeu cau

- Node.js 22.19+ va npm 10+
- Ollama dang chay tai `http://127.0.0.1:11434`
- Hai model baseline nhe:

```powershell
ollama pull gemma3:1b
ollama pull qwen2.5-coder:1.5b
```

Voi RTX 3050 Ti Laptop GPU 4 GB va 24 GB RAM, cau hinh Gemma 3 1B + Qwen Coder
1.5B la baseline rat nhe de danh gia do chinh xac truoc khi fine-tune. Hai
agent duoc goi noi tiep, khong tai dong thoi hai model vao VRAM.

## Cai dat va chay

```powershell
npm install
npm run dev
```

Trong app:

1. Chon **Thu muc tai lieu** hoac **Chon file**.
2. Bam **Kiem tra Ollama local** de xac nhan hai model da san sang.
3. Chon Detector va Verifier.
4. Bam **Quet IPI bang TinyLLM local**.

Format tai lieu duoc ho tro: `txt`, `md`, `csv`, `log`, `rst`, `json`, `xml`,
`html`, `htm`, `pdf`, `docx`, va `doc`. Khi quet thu muc, Sentinel duyet de
quy toi da 300 tai lieu va bo qua `.git`, `node_modules`, `dist`,
`dist-electron`.

## Kiem tra va build

```powershell
npm run typecheck
npm test
npm run build
npm run dist
```

`npm run dist` tao ban Windows portable trong `dist/`.

## Benchmark truoc fine-tuning

Chay baseline co nhan bang hai model local:

```powershell
npm run benchmark:ipi
```

Script dung `benchmark/ipi-baseline.json`, chay Detector roi Verifier tren tung
mau, va luu ket qua timestamp vao `benchmark/results/`. Ket qua gom `precision`,
`recall`, `F1`, `falsePositiveRate`, `agreementRate` va thoi gian xu ly trung
binh moi tai lieu. Bo mau ban dau chi la smoke benchmark; truoc khi viet bao
cao, can mo rong bang tai lieu IPI va benign da duoc gan nhan doc lap.

## Thu muc quan trong

```text
electron/                    Electron main process va preload bridge local-only
engine/scanner/ipi-doc-scan  Rule-based IPI document prefilter
engine/document/extractors/document-text-extractor Document text extraction
src/ai/agents/ipiDocAgent    Detector + Verifier orchestration
src/ai/agents/slmCatalog     Ollama TinyLLM allowlist
src/components/              UI quet IPI
```

## Danh gia khoa luan

Truoc fine-tuning, dung mot dataset IPI co nhan va ghi lai cho tung cau hinh
model: precision, recall, F1, false-positive rate, ty le Detector/Verifier
dong y, thoi gian xu ly moi tai lieu, RAM va VRAM. Rule-based prefilter chi la
tang loc; metric cua Detector/Verifier phai duoc bao cao rieng de danh gia gia
tri cua multi-agent TinyLLM.
