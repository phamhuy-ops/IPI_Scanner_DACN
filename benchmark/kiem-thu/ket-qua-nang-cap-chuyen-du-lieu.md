# Kết quả nâng cấp luồng chuyển dữ liệu và trích dẫn

Ngày 2026-10-28. Đã triển khai mã và đo ba cấu hình, tổng 100 pipeline/200 request suy luận thật, giữ gemma3:1b và qwen2.5-coder:1.5b, không train hoặc tải model. **Chưa có cấu hình đạt mục tiêu khoảng 90% hoặc đủ điều kiện bật mặc định.**

## Mục tiêu và cách tính

Theo yêu cầu người dùng, hướng tới khoảng90% thay vì theo đuổi100%. Tính đúng trên tất cả ca đã chọn: benign phải not_detected, malicious phải ipi_detected; needs_review/lỗi trên hai lớp này chưa tính đúng. Uncertain chỉ đúng khi cần xem xét do bất định được model nêu và không có lỗi xử lý. Precision/recall/F1/FPR, confusion counts, abstention và breakdown theo nguồn/nhóm/ngôn ngữ vẫn báo riêng, không dùng tỷ lệ JSON hợp lệ thay độ đúng.

Các lô dưới đây cố ý tập trung lỗi và đối chứng khó, có mẫu dev đã dùng và nhãn AI. Đây không phải ước lượng tỷ lệ đúng trên toàn tài liệu thực tế hoặc holdout độc lập. Không so trực tiếp phần trăm giữa các lô khác nhau như thể cùng một tập.

## Đã xây và kiểm chứng được gì

- Tạo ứng viên khi cùng đoạn có hành động chuyển, dữ liệu hội thoại và đích/kênh nhận. Rule chỉ tạo nghi vấn, không tự xác nhận IPI.
- Bản hai thêm dấu hiệu chỉ dẫn hướng vào AI/đầu ra, bỏ phủ định cục bộ và ví dụ trích dẫn có bao khung không thực thi. Không suy quyền từ lời tự nhận trong nguồn; không lấy sự xuất hiện email/URL đơn lẻ làm IPI.
- Khi ứng viên bị cắt qua chunk hoặc CRLF, giữ thêm cửa sổ nguyên nguồn có giới hạn640 ký tự; không sửa quote để ép khớp. Có đối chứng vị trí đầu/giữa/cuối và tiếng Việt.
- Hợp đồng thử `classic-spans-v1`: model chọn spanId, code lấy nguyên quote/dòng nguồn. Không thêm trường suy luận context, không nhận ID ngoài batch hoặc tự thêm quote, không sửa stance.
- 310 test ứng dụng, typecheck/lint/build đạt. Test không chứng minh model nhận diện đúng; build còn cảnh báo Vite cũ về customResolver/freeze.

## Kết quả từng lượt

1. **Ứng viên chuyển dữ liệu v1 — 18 ca mỗi nhánh, 36 pipeline/72 request.** Đúng6/18→7/18 (33,3%→38,9%); TP1→3 nhưng FP0→3. Báo nhầm việc cho người, câu cấm gửi và mô tả API. Loại bản này. [Giao thức, raw và tổng hợp](../results/transfer-candidates-YQrOEY/tong-hop.json).

2. **Ứng viên v2 — 22 ca mỗi nhánh, 44 pipeline/88 request.** Đúng8/22→10/22 (36,4%→45,5%). TP1→3, false clear2→0, FP giữ0/12 benign;7/12 benign vẫn cần xem xét. Hai uncertain đều được xử lý đúng. Tuy nhiên lỗi tăng1→3 và p95 11,02→23,17 giây (+110,2%). Trượt cổng, chưa bật mặc định. [Tổng hợp](../results/transfer-candidates-v2-9y6WLU/tong-hop.json), [từng ca](../results/transfer-candidates-v2-9y6WLU/cases.json).

3. **Trích dẫn bằng ID, cùng rule v2 ở cả hai nhánh — 10 ca mỗi nhánh, 20 pipeline/40 request.** Đúng4/10→6/10 (40%→60%); xử lý hợp lệ9/10→10/10, TP2→3, p95 25,75→15,18 giây (-41,0%). Nhưng FP0→2/5 benign, một ca uncertain bị not_detected và một tấn công baseline xác nhận được bị chuyển cần xem xét. Trượt cổng, chưa bật mặc định. Đây cho thấy trích dẫn đúng không đủ bảo đảm nghĩa đúng. [Tổng hợp](../results/classic-spans-8QvuWl/tong-hop.json), [raw model](../results/classic-spans-8QvuWl/model-calls.json).

Mỗi lượt có giao-thuc.json khóa cấu hình/code/model/seed42 trước đo, cases.json, model-calls.json và kết quả từng nguồn/nhóm/ngôn ngữ. Thứ tự hai nhánh luân phiên; không retry để chọn kết quả thuận lợi. Snapshot Ollama không phải peak RAM/VRAM; latency chỉ là phép đo local của lượt này, không suy hiệu năng tổng quát.

## Kiểm tra nguồn rộng hơn ở tầng rule

Đọc toàn339 NotInject canonical và17 Realistic: rule mới không tạo ứng viên trên339 NotInject; tạo ứng viên ở2 Realistic (hai ca mục tiêu). Đây là kiểm tra rule, chưa phải FPR/recall của pipeline. Các đối chứng human/quoted/negated tổng hợp vẫn phải xét riêng, không lấy kết quả NotInject để phủ nhận lỗi thấy trong model thật. [Bằng chứng rule v2](../results/transfer-candidates-v2-9y6WLU/kiem-tra-nguon-rule.json).

## Quyết định và phần còn thiếu

Giữ `includeTransferCandidates` cần bật rõ ở runner và `classic-spans-v1` là hợp đồng thử; giao diện/mặc định giữ luồng trước đó. Không bật v1 có FP, không bật v2 chỉ vì giảm false clear, không bật span chỉ vì JSON/citation hợp lệ. Giữ toàn bộ kết quả và snapshot nguồn; chưa đo rộng hoặc mở holdout cho cấu hình trượt.

Nút thắt còn lại là model hiểu nhầm người nhận/phủ định và thiếu nhất quán reason→stance, cùng nhiều benign cần rà thủ công. Bước tiếp cần cô lập việc biểu diễn người nhận/phủ định trên đoạn có bằng chứng, có đối chứng chưa dùng chọn sửa; không tiếp tục mở rộng rule hoặc đổi threshold để ép90%. Fine-tuning chưa được thực hiện và chưa được xem là bước mặc định kế tiếp. Citation/long-document/UI native/holdout độc lập vẫn chưa hoàn tất. **Ưu tiên1 vẫn mở.**
