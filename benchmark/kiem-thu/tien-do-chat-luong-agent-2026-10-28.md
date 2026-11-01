# Tiến độ nâng cấp chất lượng Agent

Mục tiêu vẫn là tối thiểu 90% trên toàn bộ ca đã chọn, sau đó kiểm chứng độc lập và pipeline/coverage. Chưa hoàn thành Ưu tiên 1. Không train, tải hoặc đổi model mặc định.

## Đối chứng tên stance: không áp dụng

[Lượt A/B](../results/semantic-stance-pnQaA3/giao-thuc.json) đã khóa 20 ca mỗi nhánh: 16 ca dev đa nguồn cũ và 4 đối chứng mới tiếng Việt/Anh, gồm tấn công, ví dụ trích dẫn và công việc của người. Đây là dev; các đối chứng do AI soạn không là holdout độc lập.

Chỉ đổi tên enum stance ở system/schema, ánh xạ một một về stance cũ trước parser; không sửa nguồn, reason, quote hoặc chính sách. Sau [rà lý do bất định](../results/semantic-stance-pnQaA3/uncertainty-audit.json), tỷ lệ đúng là baseline 6/20 và ứng viên 10/20. Báo nhầm tăng từ 1 lên 3 trên 8 ca benign. Không áp dụng dù tổng số đúng tăng. Xem [chỉ số chặt chẽ theo nguồn/nhóm/ngôn ngữ/tầng](../results/semantic-stance-pnQaA3/quality-audit.json) và [raw request/response](../results/semantic-stance-pnQaA3/model-calls.json).

Hai ca baseline có stance uncertain nhưng lý do không giải thích sự thiếu ngữ cảnh. Không tính những ca này đúng chỉ vì verdict needs_review. Tổng hợp tự động gốc còn được giữ để đối chiếu; báo cáo quality-audit dùng chính sách chặt hơn và có giải thích từng ca.

## Đối chứng đóng gói nguồn

Bản thử đưa nguồn nguyên văn lên đầu và chỉ giữ ID/chunk trong danh sách ứng viên, tránh lặp lại câu tấn công ngoài bao khung nguồn. Không ghép với ứng viên đổi tên stance.

[Lượt đầu](../results/source-once-8lLDko/khong-du-dieu-kien-cham.json) đã dừng khi kiểm tra mới tái hiện tài liệu giả tiêu đề làm helper chọn nhầm vùng điều khiển. Raw được giữ, không dùng để chấm. Đã sửa helper chỉ nhận tiêu đề ở vị trí do ứng dụng tạo, không tìm toàn tài liệu. [Lượt thay thế](../results/source-once-6WeGvs/giao-thuc.json) dùng cấu hình khóa mới, đo lại cả hai nhánh từ đầu.

Lượt thay thế đã hoàn tất 40 pipeline, 80 request. Sau audit, baseline đúng 5/20 và ứng viên 3/20; false clear tăng 4. Không áp dụng. Xem [chỉ số và giới hạn](../results/source-once-6WeGvs/quality-audit.json). Những baseline giữa các lượt không có điểm hoàn toàn giống nhau; mỗi lượt chỉ so A/B trong cùng giao thức, không chọn baseline thuận lợi để tuyên bố tiến bộ.

## Bản sửa đã áp dụng: đầu ra bị cắt

Raw của lượt 30 ca cũ có hai phản hồi Gemma dừng ở 1.400 token với `finish_reason=length` (case-022, case-026). Trước sửa, client bỏ qua metadata này. Đối chứng TXT mới còn tái hiện trường hợp JSON trông hoàn chỉnh nhưng metadata báo bị cắt: pipeline trả not_detected. Hai kiểm tra tương ứng thất bại trước sửa và đạt sau sửa.

Đã thêm `SlmOutputTruncatedError`, bảo toàn loại lỗi qua client mà không fallback, gắn `output_truncated` cho batch và hướng xử lý Việt/Anh trong UI. Batch bị cắt không được tính đã rà; những batch sau và vai trò còn lại vẫn tiếp tục trong deadline cũ. Không tăng token, không retry hoặc nhận JSON thiếu. Phát hiện khác đã được hai vai trò xác minh vẫn được giữ kèm trạng thái lỗi/phần chưa đọc.

[Replay sau sửa](../results/consistency-replay-YMIdfh/tong-hop.json) phát lại 30 ca/60 phản hồi cũ, không gọi model: nhận đúng hai ca output_truncated, không đổi verdict hoặc trạng thái xử lý; 4 lỗi trích dẫn vẫn được giữ. Đây là bằng chứng sửa phân loại lỗi và chính sách, không chứng minh tăng recall hay độ đúng nhận diện. Có kiểm tra UI và pipeline trích xuất TXT thật bằng phản hồi cố định, gồm cô lập lỗi nhiều batch.

## Giới hạn phần giải thích: không áp dụng

[Lượt A/B thứ ba](../results/bounded-review-2p7r8U/giao-thuc.json) dùng core sau sửa output_truncated, chỉ thêm maxLength=240 cho analysis và maxLength=320 cho reason. Không cắt quote, không giới hạn số bằng chứng hoặc đổi ngữ nghĩa stance. Đã hoàn tất 40 pipeline/80 request. Sau audit, baseline và ứng viên đều đúng 5/20, precision 50%, recall 12,5%, F1 20%, FPR 12,5%; runtime hợp lệ cùng 17/20. P95 11,07 → 11,46 giây. Không có cải thiện để bật mặc định. Xem [chỉ số đầy đủ](../results/bounded-review-2p7r8U/quality-audit.json).

Fingerprint đầu lượt này chưa bao gồm dependency mới `slmResponse.ts`. Đã lưu [snapshot bổ sung và giới hạn](../results/bounded-review-2p7r8U/source-addendum.json) trong lúc chạy; không dùng lượt này để tuyên bố toàn bộ dependency đã được khóa trước đo. Lịch sử thao tác không sửa module này sau khi tạo. Harness tương lai đã được sửa để khóa toàn bộ `src/ai/agents`, `engine`, package manifest và lockfile. Các snapshot đầu lượt cũ được giữ nguyên.

## Quyết định hiện tại

Ba lượt A/B hoàn tất đo lại cùng 20 ca mỗi lượt, tổng 120 pipeline và 239 request; không phải 60 ca độc lập. Lượt bị dừng do lỗi helper không được gộp để tăng/giảm điểm. Cả ba ứng viên đều trượt cổng nên chưa chạy toàn bộ dev96, probe hoặc holdout để chọn ứng viên. Không tuyên bố đã đo đạt 90%.

Điểm nghẽn còn lại là hiểu người nhận chỉ dẫn, bao khung trích dẫn/phủ định và sự thống nhất stance với reason. Sửa chẩn đoán cắt đầu ra giúp xử lý lỗi thật rõ hơn, không giải quyết thay các lỗi hiểu ngữ cảnh này. Báo cáo giữ confusion, abstention, lỗi và phạm vi chưa kiểm chứng thay vì dùng đồng thuận hoặc JSON hợp lệ làm độ đúng.

Kiểm tra mã cuối lượt: 340 test Vitest và 11 test Node đạt; lint, typecheck và build đạt. Build còn cảnh báo Vite `customResolver` và `freeze` đã có trước. Không có tiến trình đo A/B còn chạy. Các kiểm tra này không thay thế đánh giá nhận diện bằng model thật hoặc kiểm chứng độc lập.

## Lượt tiếp: tách liệt kê chỉ dẫn khỏi kết luận IPI

[Bản thử instruction-proposals-v1](../results/instruction-proposals-UGvspO/giao-thuc.json) thêm một bước Gemma liệt kê câu chỉ dẫn, kể cả câu cho người và trong ví dụ; các đề xuất không có stance. Detector và Verifier vẫn đọc toàn nguồn và độc lập chấm theo classic-v1, không bỏ tìm discovery, không đổi điều kiện kết luận. Không train hoặc đổi model.

Đã đo 20 ca mỗi nhánh, 40 pipeline và 102 request. Sau audit uncertain: baseline đúng 5/20, ứng viên 2/20. TP 1→0, FP 1→2, TN 4→1; FN gồm abstention/lỗi 7→8. Precision 50%→0%, recall 12,5%→0%, F1 20%→0%, FPR 12,5%→25%. Runtime hợp lệ 17/20→14/20; p95 16,13→28,86 giây. Xem [báo cáo theo nguồn/nhóm/ngôn ngữ/tầng và tài nguyên](../results/instruction-proposals-UGvspO/quality-audit.json).

Bước liệt kê tạo 44 ứng viên trên 22 chunk, bao gồm câu mô tả. Số ứng viên tăng gây tải xác minh và ba lỗi output_truncated ở Detector; tổng có sáu ca invalid_response. Đây không phải bằng chứng tăng nhận diện. Cổng trượt nên không bật mặc định, không chạy toàn dev/holdout để chọn ứng viên. [Lượt khởi động trước](../results/instruction-proposals-GJ1Hq5/khong-du-dieu-kien-cham.json) đã dừng do chưa hoàn tất đọc typecheck fixture, không được dùng để chấm hoặc gộp với lượt hoàn tất.

Sau lượt A/B, đã sửa riêng [lỗi gộp bằng chứng khác vị trí](sua-gop-bang-chung-theo-vi-tri.md). Không gán kết quả A/B trước sửa cho bản sửa này. Kiểm tra cuối lượt mới: 354 test, lint/typecheck/build đạt; replay 30 ca/60 phản hồi không đổi verdict và vẫn giữ các cổng lỗi. Chưa có ứng viên nhận diện đạt90% hoặc kiểm chứng độc lập; Ưu tiên 1 còn mở.

Sau yêu cầu hoàn tác của người dùng: [đã gỡ hẳn instruction-proposals-v1 khỏi pipeline và lưu snapshot](hoan-tac-ung-vien-va-sua-vi-tri-rule.md), không chỉ giữ cờ tắt. Đã thử hướng gắn đúng vị trí rule thay cho đổi prompt/luồng model; phạm vi kiểm chứng và giới hạn ghi riêng, không gán điểm cũ cho bản sửa mới.

## Công cụ chấm

`scripts/agent-quality-metrics.cjs` lấy mẫu số từ manifest; giữ cả ca lỗi, thiếu coverage và chưa chạy. `scripts/report-agent-quality.cjs` báo precision, recall, F1, FPR, confusion, abstention, nguồn/nhóm/ngôn ngữ, latency và thống kê coverage/lỗi từng tầng. Uncertain cần audit có giải thích; nếu chưa audit thì báo riêng cận trên từ lời model, không gộp thành độ đúng đã kiểm chứng.

Các số lượng chunk/lỗi từng tầng chưa phải recall từng tầng theo gold span. Snapshot RSS/Ollama chưa phải peak toàn hệ thống. Không sửa nhãn, nới parser hoặc dùng test để chọn thay đổi. Các kết quả này chưa đủ điều kiện gọi holdout, UI/native IPC hoặc tài liệu dài đã đạt.
