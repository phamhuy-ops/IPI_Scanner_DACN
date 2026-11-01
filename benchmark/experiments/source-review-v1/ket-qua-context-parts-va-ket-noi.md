# Đối chứng cách trình bày ngữ cảnh và sửa chẩn đoán mất kết nối

Ngày 29/10/2026. Ưu tiên 1 vẫn mở; chưa có bằng chứng đạt 90% hoặc kiểm chứng độc lập.

## Kết quả áp dụng

Đã bổ sung lỗi có kiểu `SlmConnectionError` từ phản hồi vận chuyển status0 của bridge khi có dấu hiệu kết nối rõ. Pipeline giữ code `connection_error`; giao diện Việt/Anh chỉ rõ phần chưa rà và hướng kiểm tra Ollama/cổng local trước khi chạy lại file bị ảnh hưởng. Không tự gọi lại, đổi model hoặc gán benign. HTTP404/model thiếu, HTTP503, timeout và cắt đầu ra vẫn là các loại riêng; không dò dấu hiệu mất kết nối trong nội dung tài liệu/model trả về.

Đây là nâng cấp chẩn đoán và xử lý lỗi vận hành, **không phải tăng accuracy nhận diện**. `processingStatus` vẫn là `model_error` để giữ tương thích; `batchFailures.code` và hướng xử lý giờ cụ thể hơn. Nhánh kết nối có kiểu trả lỗi ngay, không thử endpoint khác. Mặc định model và chính sách bằng chứng/đồng thuận không đổi.

## Đối chứng nhận diện đã loại

Giả thuyết: Verifier có thể nhìn rõ cách nguồn sử dụng câu lệnh khi `sourceContext` tách thành `before/quote/after` thay vì một chuỗi toàn chunk. Toàn văn ở Original document evidence được giữ nguyên. Không thêm nhãn ngữ nghĩa hoặc metadata dataset; schema/system/model giữ nguyên. Dùng cùng Detector và snapshot extraction đã lưu, gọi mới Verifier; baseline lịch sử là `verifier-source-use16-u80bCj` (13/16 về nhãn).

[Lượt đầu](../../results/verifier-context-parts16-0qXA4p/quyet-dinh.json) ngắt ở 6/16: năm phản hồi model hoàn tất, ca aq-054 lỗi fetch. Kiểm tra ngay sau đó cổng11434 ECONNREFUSED và không có tiến trình Ollama. Chưa xác định nguyên nhân backend dừng; không coi lỗi này là bằng chứng cách trình bày làm giảm nhận diện. Đã khởi động lại backend local ở chế độ ẩn, xác nhận model vẫn trên E, không dừng dịch vụ đang chạy hoặc tải/train model.

[Lượt đo lại](../../results/verifier-context-parts16-z7un74/quyet-dinh.json) dừng theo cổng hồi quy ở 15/16, một ca chưa chạy. Có 11 ca đúng nhãn trong15 quan sát. Tính nghiêm trên toàn16 đã chọn là11/16 (68,75%), **không phải kết quả hoàn tất16**. TP6 FP2 TN5 FN2; một malicious needs_review, một malicious lỗi cắt đầu ra và một benign chưa chạy. Precision/recall/F1 đều0,75; FPR0,25 trên toàn benign đã chọn; abstention1/16. Không loại lỗi hoặc ca chưa chạy khỏi mẫu số. Định nghĩa FN bao gồm abstention/lỗi; benign chưa chạy báo riêng, không thành TN.

- Hai FP ví dụ Anh/Việt vẫn còn.
- Ca HTML active từ baseline đúng chuyển needs_review, kích hoạt dừng.
- Ca fresh-en-active thêm lỗi cắt đầu ra ở1400 tokens; không nới validator hoặc nhận JSON thiếu.

Đã kiểm chứng15 request chỉ khác cách trình bày sourceContext; nối before+quote+after khôi phục đúng toàn nguồn. [Đối chiếu request](../../results/verifier-context-parts16-z7un74/doi-chieu-request.json), [phân nhóm](../../results/verifier-context-parts16-z7un74/ket-qua-phan-nhom.json) và raw giữ trên E. Hai lượt có21 request attempts,20 phản hồi model hoàn tất, một lỗi kết nối; không phải21 mẫu độc lập. Đây là dev đã dùng phát triển, không phải holdout. p95 khoảng27,26 giây ở lượt đo lại chỉ gồm Verifier/overhead replay trên15 ca quan sát, không phải latency mới toàn Agent. Resource /api/ps từng call và digest sau đo được lưu; không đo CPU/GPU utilization đầy đủ. Model digest cuối khớp đầu lượt.

Không áp dụng cách tách ngữ cảnh; mã gửi bằng chứng cũ được giữ nguyên. Việc thử qua adapter chỉ diễn ra trong driver kết quả, không thêm runner cấp đầu hoặc tùy chọn thử lỗi vào Agent.

## Kiểm chứng thay đổi vận hành

- [Tái hiện TCP thật qua pipeline](../../results/connection-failure-pipeline-ZbRveK/tong-hop.json): hai file TXT tự soạn (sạch với tên Dan Evans và lệnh thật), extractor/pipeline thật. Bridge gọi cổng loopback đã đóng rồi trả status0/error giống Electron. Cả hai giữ needs_review, code connection_error, coverage chưa hoàn tất; không inference và không dừng backend đang chạy. Đây là kiểm tra lỗi có kiểm soát, không chứng minh model nhận diện hai tài liệu.
- [Replay mặc định](../../results/connection-default-regression-CCxTSC/tong-hop.json):192 pipeline/382 raw cũ, không inference, không thay request/verdict/processing/suspicion.
- [Replay compact giữ lại](../../results/connection-compact-regression16-COPS0q/tong-hop.json): extractor thật16 file TXT/MD/HTML,32 phản hồi cũ, không đổi request/verdict. Vẫn13/16 về nhãn; đây là kết quả replay khớp lịch sử, không phải lượt model live mới.
- 424 test sản phẩm/35 file và31 test benchmark đạt; lint/typecheck/build đạt. Build còn warning customResolver/freeze đã có. Test mới có đối chứng HTTP lỗi, model thiếu, timeout và pipeline sạch/độc khi mất kết nối, cùng UI Việt/Anh.

Raw/snapshot/lệnh/seed/model/dataset và baseline được giữ qua alias trong benchmark/results, dữ liệu nặng trên E. Không có đánh giá mới tài liệu dài PDF/DOCX hoặc kiểm chứng độc lập. Mục tiêu nhận diện chưa tiến thêm: bản giữ lại13/16; lần này chỉ chốt được cải thiện chẩn đoán vận hành. Hướng tiếp theo cần xử lý sự phân biệt dùng/nhắc lại câu lệnh ở cả hai vai trò, vì hai FP hiện không chỉ do Verifier; không tiếp tục coi đổi cách chép ngữ cảnh là giải pháp đã hiệu quả.
