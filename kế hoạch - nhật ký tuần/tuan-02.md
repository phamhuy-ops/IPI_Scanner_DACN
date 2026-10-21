# Tuần 2 — Tái cấu trúc IPI Scanner

**Thời gian:** 19/10/2026 – 21/10/2026
**Trạng thái:** Đang thực hiện

| STT | Công việc đã thực hiện | Commit chính | Kết quả (ảnh) | Ghi chú |
|:---:|---|---|---|---|
| 1 | Định hướng lại đồ án IPI Scanner và tinh gọn mã nguồn. | [50232385](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/50232385) | ![Cấu trúc dự án mới](./ảnh/tuan-02-cau-truc-du-an-moi.png) | Loại bỏ cấu trúc sườn cũ từ dự án ban đầu, thay thế bằng cấu trúc mới tinh gọn hơn |
| 2 | Tách khâu đọc tài liệu, chia đoạn và lọc sơ bộ. | [095a16b9](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/095a16b9) | ![Tách các khâu xử lý thành các file riêng biệt](./ảnh/tuan-02-tach-engine-xu-ly.png) | Tách cấu hình, engine xử lý và rule IPI. |
| 3 | Tổ chức luồng AI phát hiện, xác minh và quản lý bằng chứng. | [095a16b9](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/095a16b9) | ![Kết quả trả về](./ảnh/tuan-02-ket-qua-test.png) | Sử dụng 2 model SLM để phân tích và kiểm tra kết quả tài liệu có IPI. |
| 4 | Đồng bộ lockfile phục vụ CI trên Node 22. | [5d51aca1](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/5d51aca1) | Không có ảnh. | Không có ghi chú |
| 5 | Cập nhật tài liệu, giao diện và nội dung tiếng Anh. | [50232385](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/50232385)<br>[c6c91f0d](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/c6c91f0d) | Không có ảnh. | Cập nhật tài liệu, prompt bằng tiếng anh để các mô hình SLM hiểu rõ ngữ cảnh hơn. |
| 6 | Tăng độ bao phủ các đoạn tài liệu (chunk) được AI phân tích. | [50232385](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/50232385) | ![Tăng độ bao phủ và lấy mẫu từ nhiều vị trí](./ảnh/tuan-02-tang-do-bao-phu-chunk.png) | Ưu tiên chunk đáng ngờ, bổ sung các đoạn lân cận và lấy mẫu ở nhiều vị trí; hỗ trợ chế độ balanced và deep. |

## Chi tiết nội dung công việc

### 1. Định hướng lại đồ án và tinh gọn mã nguồn

Chuyển trọng tâm từ ứng dụng quét lỗ hổng tổng quát sang IPI Scanner, tập trung vào phát hiện chỉ dẫn độc hại trong tài liệu. Loại bỏ nhiều module quét cũ, điều chỉnh giao diện và bổ sung manifest mô tả hướng triển khai. Thêm bộ dữ liệu baseline cùng script benchmark làm cơ sở đánh giá; nhật ký chưa kết luận về độ chính xác từ các thay đổi này.

### 2. Tách các bước xử lý tài liệu

Phần đọc văn bản từ tài liệu được đưa vào module riêng. Semantic chunker chia văn bản thành các đoạn để thuận tiện phân tích; prefilter dùng các rule để lọc sơ bộ dấu hiệu đáng ngờ. Cấu hình quét và rule được tách riêng, giúp việc chỉnh cách quét hoặc bổ sung rule dễ theo dõi hơn.

### 3. Tổ chức luồng AI và bằng chứng

Tạo cấu trúc `src/ai/agents/document/` với thành phần phát hiện (detector), xác minh (verifier), prompt và kiểu dữ liệu dùng chung. Pipeline điều phối các bước này, còn phần evidence hỗ trợ quản lý bằng chứng liên quan đến kết quả phát hiện. Có bổ sung test cho evidence; cần kết quả chạy thực tế trước khi xác nhận chất lượng của cả luồng.

### 4. Đồng bộ môi trường Node 22

Cập nhật `package-lock.json` trong commit sửa CI để đồng bộ thông tin các gói phụ thuộc cho môi trường Node 22. Thay đổi này phục vụ quá trình cài đặt nhất quán. Chưa có ảnh hoặc kết quả CI được ghi vào nhật ký, nên mục kiểm tra cài đặt và build vẫn cần bổ sung minh chứng.

### 5. Cập nhật tài liệu và nội dung tiếng Anh

Điều chỉnh `README.md`, manifest, giao diện React và phần kết nối Electron theo phạm vi IPI Scanner. Commit `c6c91f0d` chuyển nhiều nội dung giao diện, hướng dẫn, thông báo và prompt sang tiếng Anh để cách diễn đạt trong ứng dụng thống nhất hơn và cũng đồng thời tạo điều kiện cho mô hình SLM hiểu rõ ngữ cảnh hơn.

### 6. Tăng độ bao phủ các đoạn tài liệu (chunk) được AI phân tích.

Điều chỉnh cơ chế lựa chọn chunk để AI phân tích được nhiều đoạn nội dung hơn trong tài liệu, đồng thời ưu tiên những đoạn có dấu hiệu đáng ngờ. Thay đổi giúp giảm số đoạn chưa được AI kiểm tra và hạn chế bỏ sót nội dung có nguy cơ chứa prompt injection.

## Kế hoạch tiếp theo

- Bổ sung và xây dựng thêm cho bộ Rule Prefilter của dự án hiện tại khá đơn giản.
- Tìm hiểu thêm các data chứa môi trường test đa dạng.
- Thêm vòng lặp phản biện giữa 2 mô hình SLM để nâng cao chất lượng đầu ra.

