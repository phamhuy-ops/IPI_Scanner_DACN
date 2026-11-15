# Rà nhãn bốn tài liệu PDF/DOCX

Đối chiếu SHA-256 cả bốn tệp với manifest dev, chạy extractor của IPI Scanner, rà nội dung theo trang hoặc phần và dò dấu hiệu nhắm vào AI trên toàn bộ chữ trích xuất. Cả bốn hash khớp. Các nhận định dưới đây giới hạn ở phần chữ đã rà.

- **doc-26, PDF cổng thông tin trường học Hà Nội.** Trích xuất 68.317 ký tự và đủ 63 mốc trang. Trang 1 chỉ có số trang, trang 63 không có chữ. Các chỉ dẫn đăng nhập, đăng bài và phân quyền hướng đến giáo viên hoặc quản trị viên. Chưa xác minh phần hình và hai trang có ít hoặc không có chữ.
- **doc-27, PDF hướng dẫn OMS.** Trích xuất 11.456 ký tự, cả 23 trang có chữ. Các yêu cầu kích hoạt tài khoản, điền hồ sơ và thao tác trên OMS hướng đến người sử dụng. Chưa kiểm tra nội dung nằm trong ảnh minh họa.
- **doc-28, DOCX nghiệp vụ văn thư Phú Thọ.** Trích xuất 36.605 ký tự. Các chỉ dẫn về hội, quỹ và quản lý hồ sơ hướng đến cán bộ hoặc người lập hồ sơ. Gói DOCX có header, chú thích và ảnh nhúng. Chưa rà đủ các phần này.
- **doc-29, DOCX mẫu xác nhận sinh viên HNUE.** Trích xuất 1.447 ký tự. Các trường cần điền và yêu cầu ký hướng đến người làm đơn. Gói DOCX có header và phần chú thích, không thấy ảnh nhúng. Chưa đối chiếu toàn bộ các phần ngoài thân văn bản.

Chưa thấy IPI trong phần chữ đã rà. Giữ bốn nhãn sạch ở trạng thái tạm thời trong manifest dev đã khóa. Hồ sơ nguồn lưu URL và chưa ghi nhận quyền tái sử dụng. Khi chuẩn bị holdout, dùng nguồn mới có nhãn và quyền sử dụng đã xác minh. Cả bốn ca đã xuất hiện trong baseline dev.

Nguồn lưu trong [đợt đầu](../../data/incoming/public-vi-documents/nguon-vi-v1/manifest.json) và [đợt bổ sung](../../data/incoming/public-vi-documents/nguon-vi-bo-sung-v1/manifest.json).
