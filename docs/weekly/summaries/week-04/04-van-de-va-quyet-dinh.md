# Tuần 04 — Vấn đề và quyết định

[Nguồn: `tuan-04.md`](<../../../../kế hoạch - nhật ký tuần/tuan-04.md>)

- **Ba skill tiếp tục ở chế độ thử.** Bản tích hợp có số ca đúng thấp hơn. Khi Detector bỏ sót đoạn, bước sau có thể thiếu nội dung; còn lỗi phản hồi, trích dẫn hoặc timeout.

- **Tài liệu dài chưa được xem hết.** Mô hình chỉ nhận các chunk đã chọn. Tăng số chunk có thể kéo dài thời gian quét.

- **Bất đồng giữa Agent.** Kết quả giữ Cần xem xét khi hai Agent trái nhận định hoặc không đủ bằng chứng. Người dùng cần đối chiếu lại đoạn gốc.
