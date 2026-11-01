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
cloud hay kết quả giả lập. Xem [chinh-sach-phan-tich-mot-vong.md — tổng hợp](docs/reports/tong-hop-hien-trang.md).

Đo vòng một trên bộ chẩn đoán nhỏ nhiều nguồn và file đối chứng bằng
`npm run benchmark:round-one` (cần Ollama). Phạm vi, cách đọc ba trạng thái và
giới hạn phép đo được ghi trong [danh-gia-luong-xu-ly-mot-vong.md — tổng hợp](docs/reports/tong-hop-hien-trang.md).

## Yêu cầu hệ thống

- Node.js 22.19 trở lên và npm 10 trở lên
- Ollama đang chạy tại `http://127.0.0.1:11434`
- Hai model baseline nhẹ:

```powershell
ollama pull gemma3:1b
ollama pull qwen2.5-coder:1.5b
```

Trên cấu hình laptop có GPU 4 GB VRAM và RAM 24 GB, cặp Gemma 3 1B + Qwen Coder 1.5B là baseline nhẹ phù hợp để đo độ chính xác trước khi fine-tune. Hai agent được gọi **tuần tự** để tránh nạp đồng thời hai model vào VRAM.

Khi chọn rõ model, ứng dụng gọi đúng model đã đăng ký; tên không hỗ trợ
hoặc model lỗi sẽ được báo thay vì âm thầm chuyển sang model khác.
`qwen2.5:1.5b-instruct` được hỗ trợ khi chọn thủ công và đã cài trên Ollama;
đây là lựa chọn thử nghiệm, chưa thay hai model mặc định hoặc được chứng
minh nhận diện tốt hơn. Khi caller không chỉ định model, thứ tự tự chọn cũ vẫn giữ.

Theo phép đối chứng của người dùng, core cũng nhận rõ `qwen3:4b-instruct-2507-q4_K_M` đã có trên máy ở vai trò Detector. Model này không vào fallback, Verifier mặc định hoặc Agent mặc định. Runner chung hỗ trợ `--detector-model` cho đúng model được phép và bắt buộc paired; không tự tải model. [Đối chứng30 ca](benchmark/results/agent-upgrade-30-whLK8a/quality-audit.json) tăng ca sạch đúng nhưng báo sạch sai tăng, nên chưa được chọn làm cấu hình vận hành.

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

## Benchmark và dữ liệu

Công cụ còn duy trì có một đầu vào `scripts/benchmark.cjs`:

```powershell
npm run benchmark -- --help
npm run benchmark:agent
npm run test:benchmark
```

`benchmark:agent` chạy core pipeline trên đúng 30 ca dev/fixture đã khóa trong baseline lịch sử, cần Ollama local. Alias `benchmark:ipi` dùng cùng phép đo này; không còn chạy cặp prompt rời trong script cũ. Lệnh không tải/train/đổi model và không đại diện cho toàn bộ dataset Hugging Face hoặc holdout độc lập.

Có thể truyền `--manifest` cho bộ dev khác: bộ mới cần `--paired yes`; phép so lịch sử chỉ được chạy khi toàn bộ nội dung, nhãn, annotation, grouping và model chính khớp baseline. Input được giữ theo thư mục số trung tính riêng cho từng ca, không ghi đè tài liệu ca trước. So lịch sử không phải A/B đồng thời và không đủ để kết luận nguyên nhân thay đổi latency.

Nhánh compact có đối chứng [rà phụ thuộc ngữ cảnh](benchmark/experiments/source-review-v1/context-dependency-pipeline.json), bật rõ `contextDependencyModel` bằng Qwen3 4B đã được cho phép ở lượt xác minh bổ sung. Lượt này dùng nguyên nguồn và source references, chưa đưa giả thuyết vào hai vai trò chính; chỉ hợp nhất bất định sau khi Verifier chính hoàn tất. Phải có trích dẫn ngữ cảnh bổ sung, không lấy chính câu lệnh làm chứng cứ nó thiếu ngữ cảnh. Nguồn vượt ngân sách/không đầy đủ được báo coverage hạn chế, không coi là uncertain đúng. Không đổi model hoặc cấu hình Agent mặc định; vẫn chờ đánh giá đủ bộ và kiểm chứng độc lập.

[Đối chứng tách source view](benchmark/experiments/source-review-v1/view-isolated-pipeline.json) dùng `verifierEvidenceMode: "split-views-multiple-targets-v1"`: khi một batch có từ hai mục tiêu đã neo nguồn, Verifier xử lý HTML gốc và text-projection riêng. Batch có không hoặc một mục tiêu giữ nguyên; mọi chunk vẫn phải được rà. Không đổi model/prompt/validator/chính sách đồng thuận. [Báo cáo thử nghiệm](benchmark/experiments/source-review-v1/ket-qua-tach-source-view.md) ghi cả hồi quy của bản tách mọi view đã loại, kết quả bản thu hẹp và hạn chế latency/độc lập; tùy chọn này chưa được bật mặc định.

`benchmark:round-one` giữ bộ thực thi core theo manifest tương thích; `benchmark:prefilter` và `benchmark:controls` chỉ chấm rule. Các chế độ `report` và `replay` dùng kết quả schema baseline/candidate 30 ca đã lưu; replay không đo năng lực model hiện tại. Chỉ số gồm precision/recall/F1/FPR, confusion, abstention, lỗi/coverage và latency; needs_review/lỗi trên ca nhị phân không được tính đúng.

Đối chứng chọn cấu hình dùng `agent --paired yes --candidate-config <JSON>` để hai pha cùng code và đường dẫn input; config được whitelist, không được đổi model/backend/input. So với raw lịch sử ở thư mục khác chỉ là chẩn đoán vì path trong citation có thể làm đổi request model. Kết quả sàng lọc nhỏ còn cần ca hồi quy, dữ liệu độc lập và pipeline thực tế trước khi áp dụng.

Có thể khóa riêng pha baseline bằng `--baseline-config <JSON>` với cùng whitelist và lưu snapshot/hash cả hai pha. Quyền đối chứng model được chỉ định riêng qua cờ nêu trên; không mở quyền đổi model từ JSON. Reporter giữ mẫu số toàn bộ ca đã chọn, chỉ số từng nguồn/nhóm/ngôn ngữ/tầng và phần đối chiếu annotation của citation; quote đúng nguyên văn chưa chứng minh trích đúng chỉ dẫn hoặc giải thích đúng.

Runner kiểm tra enum, kiểu dữ liệu và tổ hợp cấu hình trước khi gọi backend/tạo hồ sơ đo. Cấu hình thí nghiệm đã gỡ như stable-alias-v2 bị từ chối ngay; không chấm lỗi cấu hình thành lỗi năng lực model. Snapshot lịch sử là nguồn để tái lập bản thử đã nghỉ dùng.

File mẫu, nhãn và nguồn dữ liệu nằm tại [kho kiểm thử](benchmark/kiem-thu/README.md). Giữ dữ liệu canonical trong `benchmark/data/`; nhãn/ID/nguồn/đáp án không đi vào scanner/model. Các bản sao hoặc biến thể không được cộng thành nguồn độc lập.

Đã dọn 275 script thử nghiệm chỉ dùng trong các đợt cũ. Alias `benchmark:model-context`, `benchmark:stance`, `benchmark:verifier` đã nghỉ dùng; không dùng lệnh lịch sử để vận hành hiện tại. [ZIP, danh mục hash và cách khôi phục](benchmark/archives/don-dep-2026-10-28/README.md) giữ công cụ cũ, các audit overlap cũ và snapshot trùng lặp. Raw, baseline và dataset được giữ nguyên. Các mô tả classifier/adapter/prompt thử nghiệm trong hồ sơ cũ không có nghĩa chúng đã tích hợp vào Agent.

## Cấu trúc chính

- `src/ai/agents/`: điều phối Detector/Verifier, prompt và bằng chứng.
- `engine/`: trích xuất, chunking, rule và báo cáo.
- `electron/`: tiến trình desktop và cầu nối local.
- `scripts/`: công cụ kiểm tra/benchmark đang duy trì, dùng lại thay vì tạo runner cho từng lượt.
- `benchmark/`: dataset, mẫu, raw kết quả, chỉ mục và hồ sơ lưu trữ.

## Tiến độ và tài liệu

[Tuần 3](<kế hoạch - nhật ký tuần/tuan-03.md>) ghi phần đã dọn và đề xuất chia công việc thành chất lượng Agent, demo/pipeline thực tế và báo cáo/bàn giao. Ưu tiên 1 vẫn mở theo [cổng hoàn thành](docs/planning/cong-hoan-thanh-uu-tien-1.md); không coi test/build đạt là nhận diện đạt90%.

Xem [hiện trạng](docs/reports/tong-hop-hien-trang.md), [việc cần làm](docs/planning/cong-viec-can-lam.md) và [mục lục tài liệu](docs/README.md). Không train hoặc tự tải/đổi model trong kế hoạch hiện tại; fine-tuning chỉ là hướng cuối khi các cải thiện luồng có đối chứng không đáp ứng.

Các lệnh dữ liệu và kiểm tra lưu trữ còn giữ trong `package.json`; chúng không tự cho phép mở lại huấn luyện. Hướng dẫn môi trường riêng tại [lưu trữ trên E](docs/guides/luu-tru-huan-luyen-tren-o-e.md).

Benchmark chung hỗ trợ dừng sớm khi p95 chắc chắn không thể đạt policy đã khóa qua `--stop-on-proven-latency yes` với paired/latency-policy. Lượt dừng sớm giữ ca chưa chạy trong mẫu số và trạng thái rejected_incomplete; Reporter bổ sung audit các request lặp; runner giữ raw/digest và so snapshot model theo giá trị tham số để tránh lỗi do thứ tự trình bày. Xem [quy định benchmark](benchmark/README.md).

Trong phần tiến độ Agent, mục **Chi tiết các lượt AI** ghi số nghi vấn đầu vào và số nhận định của từng lượt phản hồi qua parser/citation. Reporter benchmark tự phân nhóm lỗi bằng failure_taxonomy; các số này phục vụ chẩn đoán, không chứng minh nhận diện đúng hoặc thay đổi cổng kết luận.

Lưu trữ trên máy Windows hiện tại: node_modules và cache npm/Electron đã chuyển sang E qua junction; kết quả benchmark mới và tệp tạm test/build ghi dưới E:\IPI-Workspace\IPI_Scanner. Giữ đường dẫn dự án/baseline cũ; benchmark cũ trên C chưa được chuyển. Xem [trạng thái lưu trữ trên E](docs/guides/luu-tru-huan-luyen-tren-o-e.md).
