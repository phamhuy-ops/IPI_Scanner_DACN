# Đối chứng Instruct đã có sẵn theo vai trò

Người dùng đã trả lời “Cho phép đối chứng model có sẵn”. Đã đo Verifier, sau đó tiếp tục với cùng bản Instruct ở Detector để kiểm tra điểm nghẽn. Cả hai lượt giữ prompt/schema, seed42, Ollama0.40.4, dữ liệu và chính sách kết luận; mỗi lượt chỉ đổi một vai trò. Không train/tải hoặc đổi Agent mặc định.

Hai lượt cùng dùng 20 ca dev, tổng 80 pipeline và 160 request model thật; không phải 40 ca độc lập. Nhãn, group và source metadata không được đưa vào model input. Raw, snapshot mã, digest model, tài nguyên và thống kê theo nguồn/nhóm/ngôn ngữ/tầng nằm trong từng thư mục kết quả.

## Instruct ở Verifier: loại

Giữ Detector Gemma, đối chứng Coder với `qwen2.5:1.5b-instruct`. Sau audit bất định: baseline đúng5/20 (25%), ứng viên4/20 (20%). TP cùng1, FP cùng1; TN giảm4→3. Lỗi tăng3→5. Precision50%, recall12,5%, F1=20%, FPR12,5% ở cả hai nhánh; p95 11,19→11,09 giây. Nhanh hơn nhẹ không bù được mất ca đúng aq-028 và thêm lỗi.

Hai lỗi Verifier mới là analysis không đủ độ dài ở aq-028 và output_truncated ở control-03. Không nới schema để chấp nhận. Nhận định ban đầu trong chat về Detector khác nhau đã được đính chính: kiểm tra tự động xác nhận request và nội dung phản hồi Detector giống nhau ở20/20 ca; request Verifier cũng giống nhau khi bỏ duy nhất trường model. Không so UUID/thời điểm trong envelope.

- [Giao thức và snapshot](../results/local-instruct-comparison-GGzers/giao-thuc.json).
- [Ủy quyền và lệnh thực thi đầy đủ](../results/local-instruct-comparison-GGzers/uy-quyen-va-lenh.json).
- [Audit uncertain](../results/local-instruct-comparison-GGzers/uncertainty-audit.json).
- [Chỉ số, kiểm tra vai trò và cổng quyết định](../results/local-instruct-comparison-GGzers/quality-audit.json).
- [Bản thử đã lưu và quyết định loại](../experiments/local-verifier-instruct-retired-0RBrNE/quyet-dinh.json).

Trong baseline đã lưu, chỉ2/8 ca malicious có Detector confirmed; bốn ca uncertain, một ca không tạo nghi vấn và một ca lỗi citation. Với các phản hồi Detector này được giữ nguyên, Verifier không thể tự biến sáu ca còn lại thành hai vai trò cùng xác nhận. Đây là giới hạn của cấu hình/phản hồi đang đo, không phải trần năng lực chung của model.

## Instruct ở Detector: loại

Giữ Verifier Coder, chỉ đổi Detector sang Instruct. Sau audit: baseline đúng5/20, ứng viên8/20 (40%). Nhưng cả8 ca đúng của ứng viên đều là benign; TP=0, false clear tăng1→7 trên8 ca malicious, ca malicious còn lại lỗi. Cả bốn uncertain đều không được xử lý đúng.

Ứng viên có recall0%, FPR0%; precision/F1 không xác định vì không có cảnh báo được chấp nhận. Runtime hợp lệ tăng17/20→18/20, p95 giảm9,93→6,97 giây. Các điểm này không đủ để áp dụng vì giảm khả năng nhận diện tấn công và mất ca đúng aq-001. Không chọn theo tỷ lệ đúng tổng hoặc tốc độ đơn lẻ.

- [Giao thức](../results/local-detector-comparison-z9A9Qd/giao-thuc.json).
- [Audit uncertain](../results/local-detector-comparison-z9A9Qd/uncertainty-audit.json).
- [Chỉ số và cổng quyết định](../results/local-detector-comparison-z9A9Qd/quality-audit.json).
- [Bản lưu và quyết định loại](../experiments/local-detector-instruct-retired-GtLSHF/quyet-dinh.json).

Nhánh Detector thử dùng hai model cùng họ Qwen; không coi hai vai trò là hai nguồn kiến thức độc lập. Kết quả dev này không phải holdout hoặc chứng nhận tổng quát.

## Trạng thái sau đo

Đã chặn hai runner thử nghiệm để không tự chạy lại phương án trượt cổng. Không xóa model đã cài. Kiểm hash52 file core xác nhận mã Agent giữ nguyên; các sửa lỗi vị trí và cắt đầu ra từ trước vẫn được giữ. Thêm kiểm tra vai trò vào công cụ báo cáo, bảy test Node đã đạt.

Chưa có ứng viên đủ điều kiện đo toàn dev96 hoặc kiểm chứng độc lập. Mục tiêu90% và Ưu tiên1 còn mở. Không dùng điểm40% của bản bị loại làm độ đúng Agent hiện hành.
