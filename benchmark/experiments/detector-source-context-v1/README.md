# Detector tìm nguồn rồi xét ngữ cảnh

Nhánh thử đã bị loại sau đo pipeline; chưa áp dụng mặc định. Chỉ dùng Qwen3 4B ở Detector theo phép người dùng; Verifier Coder1,5B giữ classic-v1 và tìm kiếm trên đầy đủ phạm vi cũ. Không tải/train, không bỏ đồng thuận hoặc phần chưa được rà.

Detector đọc toàn batch để tìm đề xuất. Với batch chưa có rule candidate, phần mô tả suspicion rỗng được bỏ khỏi đầu vào của bước tìm; nguồn và schema vẫn đầy đủ. Đề xuất cùng các rule candidate được đưa sang bước ngữ cảnh bằng ID/quote/citation và nguyên nguồn, không có stance/reason/analysis trước. Bước sau dùng structured-v1, directive khóa vào quote proposal hoặc null, contextQuote khóa vào toàn chunk nguồn. Parser độc lập vẫn kiểm tra và bác phần ngoài khóa; không chữa câu hoặc suy stance theo nhãn. Chỉ kết quả cuối qua parser được cập nhật vào state; lỗi bước ngữ cảnh không được coi là hoàn tất Detector. Đề xuất bị bác không thành discovery. Verifier không nhận lý do hay trường ngữ cảnh của Detector.

Đã chẩn đoán trên dev đã dùng: hai bước không khóa nguồn giảm5→4/6 ca Detector; khóa nguồn với proposal model thật cố định giúp bước ngữ cảnh4→6/6, không thêm báo nhầm trong6 ca. Lượt này chỉ gọi mới bước ngữ cảnh8 request, hai ca không có proposal dùng lại bước tìm; không phải accuracy hoặc latency toàn pipeline, chưa phải holdout.

[Đã dừng lượt pipeline](../../results/agent-upgrade-30-PiMptf/quyet-dinh.json) với baseline đủ30 và candidate15/30;15 ca còn lại chưa đo. Cận dưới p95 của toàn30 dù gán mọi ca chưa chạy0 giây vẫn69,90 giây, vượt ngưỡng32,76 giây đã khóa. Trạng thái rejected_incomplete, không báo tỷ lệ candidate như đã đo đủ30. Giữ99 raw call đã lưu và ghi rõ có thể còn1 request đang chạy chưa ghi khi dừng. Không mở96/holdout hoặc áp dụng cấu hình này. Snapshot giữ phiên bản code/prompt/schema lúc đo.

Lượt rút gọn thuộc tính context sau đó giảm6→4/8 ca; thêm giải thích ngắn giảm4→3/8, có báo nhầm mới ở ví dụ trích dẫn và4 timeout. Đây là chẩn đoán context với proposal cố định và2 ca replay, không phải kết quả toàn Agent. Xem nhật ký tuần3 để đối chiếu raw và các giới hạn.
