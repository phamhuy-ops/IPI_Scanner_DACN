# Tuần 04 — Việc đã làm

[Nguồn: `tuan-04.md`](<../../../../kế hoạch - nhật ký tuần/tuan-04.md>)

1. **Ba skill.** Xây và thử bộ hướng dẫn xác định người nhận chỉ dẫn, phân biệt lệnh thật với ví dụ, và rà bằng chứng. Đã thử tích hợp trong luồng quét.

2. **Quản lý dự án.** Thêm bộ chọn để tạo và chuyển dự án. Ứng dụng khôi phục dữ liệu làm việc đã lưu khi người dùng đổi dự án.

3. **Màn hình quét.** Cập nhật chọn tệp hoặc thư mục, thiết lập mô hình và kết luận. Ô kết quả lần quét gần nhất cho phép xem nhanh và mở chi tiết.

4. **Tiến độ và lỗi.** Hiện từng bước từ prefilter đến hai Agent; ghi tên model, thời gian, số lượt gọi và token khi có dữ liệu. Ô kết luận hiện nguồn và lý do ngắn khi quá thời gian hoặc thiếu model.

5. **Mô hình local.** Trên desktop, Detector chuyển từ Gemma 3 1B sang Qwen3 4B và Verifier từ Qwen2.5 Coder 1.5B sang Qwen2.5 Instruct 3B. Luồng kiểm tra Ollama đã giải phóng Detector trước khi nạp Verifier và thử lại khi Detector trả phản hồi bị cắt hoặc lặp.
