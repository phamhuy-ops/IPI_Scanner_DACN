# Tuần 01 — Việc đã làm

[Nguồn: `tuan-01.md`](<../../../../kế hoạch - nhật ký tuần/tuan-01.md>)

1. **Rule phát hiện IPI.** Bổ sung `indirect-prompt-injection` để nhận diện dấu hiệu chỉ dẫn được cài vào nội dung AI đọc, chẳng hạn yêu cầu AI bỏ qua chỉ dẫn ban đầu. Bổ sung tệp kiểm thử các tình huống phát hiện. [Ảnh các file rule](<../../../../kế hoạch - nhật ký tuần/ảnh/tuan-01-bo-sung-rule-IPI.png>)

2. **Quét và trích xuất.** Bổ sung bộ quét tài liệu và tiện ích lấy văn bản từ tệp. Phần trích xuất lấy toàn bộ văn bản tài liệu để phục vụ phân tích. [Ảnh quét tài liệu và thư mục](<../../../../kế hoạch - nhật ký tuần/ảnh/tuan-01-quet-tai-lieu.png>)

3. **Agent hỗ trợ xử lý tệp.** Bổ sung các bước kiểm tra, sửa và tạo nội dung tệp đã làm sạch, cùng luồng điều phối giữa các bước. Client và danh mục model giúp ứng dụng tổ chức các lần gọi AI.

4. **Giao diện Co-Pilot.** Tạo `IpiAgentForm` và `IpiAgentPanel` để người dùng thao tác với tính năng IPI và xem thông tin xử lý. Cập nhật bố cục, hiệu ứng, nơi lưu trạng thái và kiểu dữ liệu dùng chung. [Ảnh giao diện](<../../../../kế hoạch - nhật ký tuần/ảnh/tuan-01-giao-dien-tinh-gon.png>)

5. **Tích hợp Electron.** Cập nhật `main`, `preload` và các gói phụ thuộc liên quan để giao diện dùng được các tính năng mới trong ứng dụng desktop. [Ảnh hợp nhất Electron](<../../../../kế hoạch - nhật ký tuần/ảnh/tuan-01-hop-nhat-electron.png>)

Nhật ký gắn năm hạng mục với commit [`1285bf87`](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/1285bf87). Commit [`673519e2`](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/673519e2) là mốc hợp nhất PR #1. Nhật ký cũng ghi một số thành phần Agent được tổ chức lại hoặc loại bỏ ở tuần 02.
