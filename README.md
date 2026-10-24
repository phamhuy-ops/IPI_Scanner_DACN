# SENTINEL — Local TinyLLM IPI Scanner

SENTINEL là ứng dụng desktop (Electron + React) dùng để phát hiện **Indirect Prompt Injection (IPI)** trong tài liệu và thư mục tài liệu trước khi nội dung được đưa vào pipeline LLM hoặc RAG. Toàn bộ bước phân tích bằng AI chạy **local** qua Ollama; tài liệu và API key không được gửi lên cloud.

## Luồng xử lý

1. Chọn một hoặc nhiều tài liệu, hoặc quét cả thư mục.
2. Trích xuất văn bản và chạy **rule-based prefilter**: instruction override, giả mạo system prompt, jailbreak, delimiter smuggling, Base64, ký tự zero-width và exfiltration.
3. **Detector Agent** (`gemma3:1b`) đọc các chunk được chọn và đánh giá ý đồ ngữ nghĩa.
4. **Verifier Agent** (`qwen2.5-coder:1.5b`) đối chiếu nguyên văn; ở vòng đầu không nhìn nhận định của Detector.
5. Tổng hợp **Phát hiện IPI / Chưa phát hiện IPI / Cần xem xét**, hiển thị hồ sơ bằng chứng và trạng thái xử lý riêng.

Rule chỉ đưa ra nghi vấn; không có cơ chế “có finding là fail”. Chỉ đóng một
nghi vấn khi hai model đồng thuận có bằng chứng hợp lệ. Bất đồng hoặc thiếu
coverage chuyển sang **Cần xem xét**. Model lỗi/quá thời hạn/sai schema được
hiển thị riêng, không biến thành kết luận sạch hoặc tấn công. Không có fallback
cloud hay kết quả giả lập. Xem [chinh-sach-phan-tich-mot-vong.md](docs/reports/chinh-sach-phan-tich-mot-vong.md).

Đo vòng một trên bộ chẩn đoán nhỏ nhiều nguồn và file đối chứng bằng
`npm run benchmark:round-one` (cần Ollama). Phạm vi, cách đọc ba trạng thái và
giới hạn phép đo được ghi trong [danh-gia-luong-xu-ly-mot-vong.md](docs/reports/danh-gia-luong-xu-ly-mot-vong.md).

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

Bộ đối chứng nhiều nguồn cho Rule Prefilter chạy bằng `npm run benchmark:controls`.

Lệnh đo riêng NotInject (339 mẫu sạch), realistic IPI kèm đối chứng sạch
(7 IPI + 7 sạch), và 3 ca direct/mixed bổ sung. Đây là dữ liệu phát triển đã
được kiểm tra nội dung, không phải holdout độc lập chưa từng xem. Kết quả từng
lần chạy nằm trong `benchmark/results/prefilter-controls-*/suite-summary.json`.
Chỉ text được đưa vào scanner; lệnh không chấm test MAlmasabi hoặc chạy model.
Chi tiết schema, nguồn và giới hạn có trong `benchmark/data/README.md`.

Đo riêng nhận diện IPI và stance/ngữ cảnh từng model bằng
`npm run benchmark:model-context` (Ollama cục bộ). Phạm vi và kết quả ở
[báo cáo từng model](docs/reports/do-nhan-dien-ipi-va-gan-ngu-canh-tung-model.md).
Đây là phép đo dev chẩn đoán, chưa thay thế benchmark toàn pipeline.

Thử riêng định nghĩa stance và đối chứng thứ tự enum bằng
`npm run benchmark:stance`; cần giữ log baseline nêu trong
[báo cáo stance](docs/reports/thu-nghiem-lam-ro-nghia-stance.md).
Ứng viên hiện không đạt cổng, không được đưa vào cấu hình ứng dụng.

Đối chiếu model ứng viên thay Verifier bằng `npm run benchmark:verifier`;
thông số, digest model cần tải và kết quả ở
[báo cáo model Verifier](docs/reports/danh-gia-model-thay-the-verifier.md).
Lệnh chỉ đo chẩn đoán, không đổi model mặc định của ứng dụng.

Bộ 20 mẫu nháp để rà soát chỉ dẫn/ngữ cảnh và chuẩn bị dữ liệu cho thử nghiệm
fine-tuning có [hướng dẫn riêng](docs/guides/huong-dan-gan-nhan-ngu-canh.md).
Chạy `npm run data:annotations:check` để kiểm tra nguồn/phiếu. Đã hoàn tất lượt
rà soát với người dùng (19 chấp nhận, 1 sửa); chưa xuất tập train hoặc thay
đổi model. Xem [tổng kết](benchmark/data/annotations/ngu-canh-v1/tong-ket-ra-soat.md).

[Kế hoạch pilot Verifier](docs/planning/ke-hoach-thu-fine-tuning-verifier.md)
đã có, chưa bắt đầu huấn luyện. Chạy `npm run training:verifier:inspect` để
kiểm tra chỉ đọc môi trường và tạo snapshot, không cài thư viện/tải weights.

Đã có [môi trường Python và lưu trữ huấn luyện trên E](docs/guides/luu-tru-huan-luyen-tren-o-e.md),
giữ code trên C. Dùng `npm run training:verifier:inspect:e` để đọc đúng môi
trường riêng và `npm run training:storage:check` để kiểm tra các đường lưu.

Rule có thêm tín hiệu thao túng ký tự câu trả lời và chèn liên kết, kèm đối
chứng sạch. Đây vẫn là heuristic; kết quả trên dev chưa chứng minh hiệu quả
ngoài thực tế. Danh sách việc quan trọng còn tồn đọng, bao gồm chính sách
Verifier, coverage và benchmark đúng pipeline, nằm trong [cong-viec-can-lam.md](docs/planning/cong-viec-can-lam.md).

Trước fine-tuning, nên dùng một dataset IPI có nhãn và ghi lại cho từng cấu hình model: precision, recall, F1, tỷ lệ false positive, mức đồng thuận Detector/Verifier, thời gian xử lý mỗi tài liệu, RAM và VRAM. Rule-based prefilter chỉ là tầng lọc sơ bộ; metric của Detector/Verifier cần được báo cáo riêng để đánh giá giá trị của pipeline multi-agent TinyLLM.

Tài liệu được phân nhóm tại [mục lục docs](docs/README.md).

Đo bộ đối chứng ngữ cảnh: `npm run benchmark:round-one -- --manifest benchmark/data/context-controls-v2.json`.
Đọc cổng thử nghiệm phản biện bằng `node scripts/assess-debate-readiness.cjs benchmark/results/RUN`;
xem [tiêu chí và giới hạn](docs/planning/tieu-chi-them-vong-phan-bien.md). Đây là phép đo dev,
không thay thế đánh giá độc lập. Test cổng: `node --test scripts/assess-debate-readiness.test.cjs`.

Thử nhận định directive có cấu trúc bằng cách thêm `--contract structured-v1`
vào lệnh benchmark. Mặc định là `classic-v1`; chế độ thử nghiệm dùng cùng core
pipeline, chưa bật trên luồng sử dụng thông thường. Xem
[hợp đồng, cách đo và giới hạn](docs/reports/danh-gia-nhan-dinh-co-cau-truc.md).

Chế độ tham chiếu bằng mã nguồn: `--contract referenced-v1`. Model chọn
`spanId`, code lấy nguyên văn và ngữ cảnh từ nguồn. Đây là chế độ thử nghiệm;
xem [phép đo và giới hạn](docs/reports/danh-gia-tham-chieu-bang-ma-nguon.md).

Thử JSON Verifier rút gọn: thêm `--verifier-output compact-v1` cùng
`--contract referenced-v1`. Chỉ bỏ analysis tự do và giới hạn reason, không
bỏ kiểm tra nguồn hay thay kết luận. Mặc định vẫn `standard`; xem
[phép đo JSON và ca bỏ sót](docs/reports/rut-gon-json-verifier-va-do-lai-ca-bo-sot.md).
