# SENTINEL IPI

Ứng dụng desktop phát hiện **Indirect Prompt Injection (IPI)** trong tài liệu trước khi đưa vào LLM hoặc RAG. Phân tích bằng hai model chạy **local qua Ollama**: tài liệu không rời khỏi máy, không có fallback cloud.

## Cách hoạt động

```
Chọn file/thư mục → Trích xuất + chia đoạn → Rule prefilter → Detector → Verifier → Kết luận
```

1. **Chọn đầu vào:** một file, nhiều file hoặc cả thư mục (tối đa 300 tài liệu, bỏ qua `.git`, `node_modules`, `dist`).
2. **Trích xuất và chia đoạn:** đoạn 900 ký tự, chồng lấn 120 ký tự, giữ vị trí để đối chiếu bằng chứng.
3. **Prefilter (rule):** tìm dấu hiệu như ghi đè chỉ dẫn, giả mạo system prompt, Base64, ký tự zero-width, yêu cầu chuyển dữ liệu. Rule chỉ nêu nghi vấn, không tự kết luận.
4. **Detector:** đọc các đoạn được chọn và đánh giá ý đồ.
5. **Verifier:** rà nguyên văn độc lập, không nhận nhận định của Detector. Hai agent chạy tuần tự để không nạp hai model cùng lúc vào VRAM.
6. **Kết luận:** chỉ đóng nghi vấn khi hai model đồng thuận có bằng chứng hợp lệ.

| Kết quả | Ý nghĩa |
|---|---|
| Phát hiện IPI | Hai model đồng thuận, có trích dẫn đúng nguồn |
| Chưa phát hiện IPI | Hai model đồng thuận không thấy tấn công |
| Cần xem xét | Hai model bất đồng, hoặc chưa rà hết tài liệu (Balanced rà tối đa 12 đoạn, Deep Scan 24 đoạn) |

Lỗi model, quá thời hạn hoặc sai schema được hiển thị riêng, không bị tính thành kết luận sạch hay tấn công.

## Cài đặt

**Yêu cầu:** Node.js 22.19+, npm 10+, [Ollama](https://ollama.com) đang chạy tại `http://127.0.0.1:11434`.

```bash
ollama pull qwen3:4b-instruct-2507-q4_K_M    # Detector mặc định
ollama pull qwen2.5:3b-instruct-q4_K_M       # Verifier mặc định

npm install
npm run dev
```

## Sử dụng và cấu hình agent

Trong ứng dụng:

1. Chọn **Document folder** hoặc **Pick files**.
2. Bấm **Check local Ollama** để xác nhận hai model đã sẵn sàng.
3. Chọn **Detector** và **Verifier** (đã gợi ý sẵn). Model nào không được hỗ trợ hoặc bị lỗi sẽ báo rõ, không âm thầm đổi sang model khác.
4. Chọn **Balanced** (nhanh) hoặc **Deep Scan** (rà nhiều đoạn hơn), rồi bấm **Scan IPI with local TinyLM**.

Danh mục model được hỗ trợ: `src/ai/agents/slmCatalog.ts`. Định dạng tài liệu: txt, md, csv, log, rst, json, xml, html, htm, pdf, docx, doc.

> Máy 4 GB VRAM: giữ hai model mặc định nhỏ ở trên. `qwen2.5:1.5b-instruct` dùng được khi chọn thủ công nhưng chỉ là thử nghiệm.

## Lệnh thường dùng

| Lệnh | Việc làm |
|---|---|
| `npm run dev` | Chạy ứng dụng |
| `npm run typecheck` | Kiểm tra kiểu |
| `npm test` | Chạy test |
| `npm run build` | Build |
| `npm run dist` | Đóng gói Windows portable vào `dist/` |
| `npm run benchmark -- --help` | Xem các chế độ benchmark |
| `npm run benchmark:agent` | Đo pipeline trên 30 ca dev đã khóa (cần Ollama) |
| `npm run benchmark:round-one` | Đo vòng một trên bộ chẩn đoán nhỏ (cần Ollama) |

Benchmark không tải, train hay đổi model. Cách đọc chỉ số (precision, recall, FPR, tỷ lệ "Cần xem xét") và giới hạn của phép đo: xem `docs/`.

## Cấu trúc thư mục

| Thư mục | Chứa gì |
|---|---|
| `electron/`, `engine/`, `src/` | Mã chạy thật: desktop, xử lý tài liệu và rule, giao diện + điều phối agent |
| `skills/` | Hồ sơ hướng dẫn agent và thư viện nạp, runner và test dùng trực tiếp |
| `data/internal/train/` | Dữ liệu phục vụ fine-tune Verifier (bản xem trước) |
| `data/internal/dev/` | Tập dùng để chỉnh luật và prompt |
| `data/internal/reserved/` | Tập để dành, không dùng chỉnh prompt hay luật |
| `data/internal/heldout/` | Tập đánh giá độc lập: **chưa có** |
| `data/internal/annotations/` | Nhãn và bản duyệt nhãn |
| `data/external/` | Nguồn ngoài (raw, đã xử lý, audit); nguồn, giấy phép ghi trong `SOURCES.md` |
| `data/fixtures/` | Tài liệu mẫu dùng cho test |
| `data/manifests/` | Danh mục các bộ dữ liệu |
| `lab/experiments/` | Hồ sơ từng thí nghiệm; bảng tổng hợp ở `registry.md` |
| `lab/prototypes/` | Code thử nghiệm chưa đưa vào sản phẩm |
| `lab/results/` | Baseline và kết quả các lượt đo |
| `scripts/` | Công cụ theo mục đích: `benchmark/`, `metrics/`, `data/`, `dev/` |
| `tests/` | Test hồi quy của công cụ |
| `docs/` | Kiến trúc, hướng dẫn, kế hoạch, báo cáo, tóm tắt tuần |
| `kế hoạch - nhật ký tuần/` | Nhật ký tuần gốc (tài liệu nộp giảng viên) |
| `archive/` | Hồ sơ và script cũ, đã đóng gói |

Quy tắc dữ liệu: nhãn, ID, nguồn và đáp án **không** được đưa vào scanner hay model. Các bản sao hoặc biến thể không được cộng thành nguồn độc lập. Dữ liệu train hiện chỉ là bản xem trước; kế hoạch hiện tại chưa train hay tải model mới.

## Tài liệu

- Tóm tắt tuần 01–05: `docs/weekly/README.md` (có link về nhật ký gốc)
- Kiến trúc và phạm vi: `docs/architecture/`
- Hiện trạng và việc cần làm: `docs/reports/`, `docs/planning/`
- Quy tắc cho agent làm việc trong repo: `AGENTS.md`

## Lưu ý trạng thái

Mục tiêu chất lượng (Recall ≥ 90%, FPR ≤ 5%) vẫn chờ đánh giá trên dữ liệu độc lập. Test/build đạt **không** có nghĩa nhận diện đạt mục tiêu.
