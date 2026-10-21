# Tuần 1 — Tích hợp IPI Security Co-Pilot

**Thời gian:** 14/10/2026 – 18/10/2026  
**Trạng thái:** Hoàn thành

| Tuần | Công việc đã thực hiện | Commit chính | Kết quả (ảnh) | Ghi chú |
|:---:|---|---|---|---|
| Tuần&nbsp;1 | **1.** Bổ sung rule phát hiện IPI. | [1285bf87](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/1285bf87) | Chờ ảnh kết quả phát hiện. | Có tệp kiểm thử rule. |
| Tuần&nbsp;1 | **2.** Xây dựng chức năng quét, trích xuất và vá tài liệu. | [1285bf87](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/1285bf87) | Chờ ảnh quét và vá tài liệu. | Có test cho bộ quét và tiện ích vá. |
| Tuần&nbsp;1 | **3.** Tích hợp các agent AI hỗ trợ kiểm tra và làm sạch tệp. | [1285bf87](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/1285bf87) | Chờ ảnh luồng xử lý AI. | Bổ sung client và danh mục mô hình. |
| Tuần&nbsp;1 | **4.** Tạo giao diện IPI Security Co-Pilot, tinh gọn bố cục và hiệu ứng. | [1285bf87](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/1285bf87) | Chờ ảnh giao diện Co-Pilot. | Cập nhật trạng thái và kiểu dữ liệu. |
| Tuần&nbsp;1 | **5.** Kết nối tính năng với Electron và hợp nhất vào dự án. | [1285bf87](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/1285bf87)<br>[673519e2](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/673519e2) | Chờ ảnh chạy ứng dụng. | Commit thứ hai là merge PR #1. |

## Chi tiết nội dung công việc

### 1. Bổ sung rule phát hiện IPI

IPI là việc cài chỉ dẫn độc hại vào nội dung mà AI đọc, chẳng hạn yêu cầu AI bỏ qua chỉ dẫn ban đầu. Dự án bổ sung rule `indirect-prompt-injection` để nhận diện dấu hiệu này, kèm tệp kiểm thử các tình huống phát hiện. Việc có test trong commit chưa chứng minh toàn bộ test đã chạy thành công.

### 2. Quét, trích xuất và vá tài liệu

Bổ sung bộ quét tài liệu và tiện ích lấy văn bản từ tệp để nội dung có thể được phân tích. Tiện ích vá hỗ trợ xử lý nội dung bị đánh dấu. Các tệp test đi kèm phục vụ kiểm tra bộ quét và thao tác vá; cần bổ sung ảnh thực tế để minh họa đầu vào và kết quả xử lý.

### 3. Các agent AI hỗ trợ xử lý tệp

Bổ sung các thành phần AI phụ trách kiểm tra, sửa và tạo nội dung tệp đã làm sạch, cùng luồng điều phối giữa các bước. Client và danh mục mô hình giúp ứng dụng tổ chức việc gọi mô hình AI. Đây là các chức năng được thêm ở mốc tuần 1; một số thành phần được tổ chức lại hoặc loại bỏ ở tuần 2.

### 4. Giao diện IPI Security Co-Pilot

Tạo `IpiAgentForm` và `IpiAgentPanel` để người dùng thao tác với tính năng IPI và xem thông tin xử lý. Đồng thời cập nhật bố cục, hiệu ứng, nơi lưu trạng thái và kiểu dữ liệu để các thành phần giao diện sử dụng thống nhất.

### 5. Kết nối Electron và hợp nhất mã nguồn

Cập nhật phần `main` và `preload` của Electron để giao diện có thể sử dụng các tính năng mới của ứng dụng desktop. Các gói phụ thuộc liên quan cũng được cập nhật. Commit `673519e2` ghi nhận việc hợp nhất PR #1, không được tính là một lần triển khai riêng các chức năng trên.
