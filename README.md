# SENTINEL — Local TinyLLM IPI Scanner

SENTINEL là ứng dụng desktop (Electron + React) dùng để phát hiện **Indirect Prompt Injection (IPI)** trong tài liệu và thư mục tài liệu trước khi nội dung được đưa vào pipeline LLM hoặc RAG. Toàn bộ bước phân tích bằng AI chạy **local** qua Ollama; tài liệu và API key không được gửi lên cloud.

## Luồng xử lý

1. Chọn một hoặc nhiều tài liệu, hoặc quét cả thư mục.
2. Trích xuất văn bản và chạy **rule-based prefilter**: instruction override, giả mạo system prompt, jailbreak, delimiter smuggling, Base64, ký tự zero-width và exfiltration.
3. **Detector Agent** (`gemma3:1b`) đọc các chunk được chọn và đánh giá ý đồ ngữ nghĩa.
4. **Verifier Agent** (`qwen2.5-coder:1.5b`) thẩm định độc lập và kết luận pass/fail.
5. Hiển thị finding, evidence, nhận định của hai agent và (khi cần) bản nội dung đã trung hòa để tải về.

Detector và Verifier đều phải phản hồi thành công. Nếu Ollama chưa chạy, model chưa được tải, hoặc một agent lỗi, phiên quét sẽ **thất bại rõ ràng** — không có fallback cloud hay kết quả giả lập.

## Yêu cầu hệ thống

- Node.js 22.19 trở lên và npm 10 trở lên
- Ollama đang chạy tại `http://127.0.0.1:11434`
- Hai model baseline nhẹ:

```powershell
ollama pull gemma3:1b
ollama pull qwen2.5-coder:1.5b
```

Trên cấu hình laptop có GPU 4 GB VRAM và RAM 24 GB, cặp Gemma 3 1B + Qwen Coder 1.5B là baseline nhẹ phù hợp để đo độ chính xác trước khi fine-tune. Hai agent được gọi **tuần tự** để tránh nạp đồng thời hai model vào VRAM.

## Cài đặt và chạy

```powershell
npm install
npm run dev
```

Trong ứng dụng:

1. Chọn **Document folder** hoặc **Pick files**.
2. Bấm **Check local Ollama** để xác nhận hai model đã sẵn sàng.
3. Chọn Detector và Verifier (mặc định đã gợi ý sẵn).
4. Chọn **Balanced** hoặc **Deep Scan**, rồi bấm **Scan IPI with local TinyLLM**.

Định dạng tài liệu hỗ trợ: `txt`, `md`, `csv`, `log`, `rst`, `json`, `xml`, `html`, `htm`, `pdf`, `docx`, và `doc`. Khi quét thư mục, SENTINEL duyệt đệ quy tối đa **300** tài liệu và bỏ qua `.git`, `node_modules`, `dist`, `dist-electron`.

## Kiểm tra và build

```powershell
npm run typecheck
npm test
npm run build
npm run dist
```

Lệnh `npm run dist` tạo bản Windows portable trong thư mục `dist/`.

## Benchmark trước fine-tuning

Chạy baseline có nhãn với hai model local:

```powershell
npm run benchmark:ipi
```

Script dùng `benchmark/ipi-baseline.json`, chạy Detector rồi Verifier trên từng mẫu, và lưu kết quả có timestamp vào `benchmark/results/`. Các chỉ số gồm precision, recall, F1, false positive rate, agreement rate và thời gian xử lý trung bình mỗi tài liệu. Bộ mẫu ban đầu chỉ phục vụ smoke benchmark; trước khi viết báo cáo, cần mở rộng bằng tài liệu IPI và benign đã được gán nhãn độc lập.

## Cấu trúc thư mục chính

```text
electron/                    Main process Electron và preload bridge (local-only)
engine/scanner/ipi-doc-scan  Prefilter IPI theo rule cho tài liệu
engine/document/extractors/    Trích xuất văn bản từ file
src/ai/agents/               Orchestration Detector + Verifier
src/ai/agents/slmCatalog     Allowlist TinyLLM Ollama
src/components/              Giao diện quét IPI
```

## Gợi ý đánh giá khóa luận

Trước fine-tuning, nên dùng một dataset IPI có nhãn và ghi lại cho từng cấu hình model: precision, recall, F1, tỷ lệ false positive, mức đồng thuận Detector/Verifier, thời gian xử lý mỗi tài liệu, RAM và VRAM. Rule-based prefilter chỉ là tầng lọc sơ bộ; metric của Detector/Verifier cần được báo cáo riêng để đánh giá giá trị của pipeline multi-agent TinyLLM.
