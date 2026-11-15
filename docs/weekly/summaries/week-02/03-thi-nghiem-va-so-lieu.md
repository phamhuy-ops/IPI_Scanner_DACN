# Tuần 02 — Thí nghiệm và số liệu

[Nguồn: `tuan-02.md`](<../../../../kế hoạch - nhật ký tuần/tuan-02.md>)

- **Luồng local.** Chạy **10 ca chẩn đoán** qua đọc tệp, rule, chia đoạn, Detector và Verifier. Còn ca bỏ sót, báo nhầm và nhiều ca Cần xem xét. Precision, Recall, F1 và FPR cụ thể **không có trong nhật ký**.

- **HTML.** Đã kiểm tra lại một ca comment đã biết. Ca chuyển sang Cần xem xét vì model trích dẫn sai.

- **Word demo.** Văn bản trích xuất dài **80.041 ký tự**, chia **112 chunk**. Balanced chọn tối đa **12 chunk** và Deep Scan tối đa **24 chunk**. Thử giới hạn giải thích **240 ký tự**, có một lượt Balanced hoàn thành cả hai model, còn Deep Scan vẫn lỗi trích dẫn.

- **Rà nhãn.** Trong **20 mẫu** chỉ dẫn/ngữ cảnh, **19 chấp nhận, 1 sửa**. Có thêm **30 mẫu nháp** chờ duyệt cho Verifier. Nhật ký ghi chưa huấn luyện.

- **Kiểm thử mã.** Chẩn đoán Word có **46 test policy/pipeline đạt**. Cập nhật ngày 28/10 ghi **367 test đạt**, tăng từ **359**, cùng typecheck và lint sạch. Nhật ký chưa ghi lượt đo model thật cho cập nhật này.
