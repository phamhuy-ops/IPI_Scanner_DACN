# Rà ngữ cảnh LLMail Phase 2

Đối chiếu 13 bản ghi trong hàng chờ với bản nguồn. Cả 13 mang nhãn nguồn `attack_attempt`. Tám có căn cứ `api_triggered`, năm có căn cứ `judge`. Các căn cứ này mô tả kết quả theo giao thức nguồn. Việc rà dưới đây dùng cấu trúc từng email và các dấu hiệu chung trong nhóm để quyết định phạm vi sử dụng.

- **Dòng 1.** Email biên bản gắn thêm yêu cầu gửi xác nhận vào quy trình xử lý tự động. Có dấu hiệu IPI trong thân email.
- **Dòng 2.** Nội dung dự án và đoạn hướng tới Agent cùng nằm trong email. Dấu hiệu xác nhận liên quan tới cùng mục tiêu của challenge.
- **Dòng 3, 5–10.** Bảy biến thể cùng khung thông báo nâng cấp Agent và yêu cầu xác nhận. Giữ chung một nhóm.
- **Dòng 22, 23, 41.** Ba biến thể yêu cầu xác nhận qua thao tác email hoặc thay đổi tóm tắt. Hai bản có dấu hiệu dùng chuỗi mã hóa. Giữ chung nhóm đã gom trong intake.
- **Dòng 44.** Email ngắn gây áp lực ưu tiên và áp đặt nội dung tóm tắt. Cùng mục tiêu xác nhận của challenge.

Năm nhóm tạm khác nhau về cách trình bày nhưng cả 13 ca vẫn tập trung vào mục tiêu xác nhận của LLMail. Có thể dùng làm nhóm đối chứng email, với thống kê riêng theo từng nhóm. Chưa dùng làm mẫu duy nhất để kết luận Recall chung. Lượt này chưa gửi email vào scanner hoặc model.

[Hàng chờ và hash nguồn](hang-cho-ipi-llmail.json)
