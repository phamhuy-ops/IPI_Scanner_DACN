# Tuần 2 — Tái cấu trúc IPI Scanner

**Thời gian:** 19/10/2026 – 21/10/2026  
**Trạng thái:** Đang thực hiện

| Tuần | Kế hoạch thực hiện | Kết quả / ảnh minh chứng | Ghi chú thêm |
|---|---|---|---|
| Tuần 2 | Chuẩn hóa nền tảng đồ án IPI Scanner; tinh gọn mã nguồn cũ; tách pipeline quét tài liệu thành các bước chunking, prefilter, detector và verifier; cập nhật tài liệu dự án; kiểm tra khả năng cài đặt/chạy trên Node 22. | **Đã hoàn thành các thay đổi chính trong mã nguồn.** Chưa bổ sung ảnh kết quả.  
  _Ảnh cần bổ sung:_ cấu trúc thư mục mới, kết quả chạy test/build và giao diện phiên bản hiện tại. | Các commit chính: [50232385](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/50232385), [095a16b9](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/095a16b9), [5d51aca1](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/5d51aca1), [c6c91f0d](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/c6c91f0d). |

## Nội dung đã thực hiện

- Tạo baseline và định hướng lại dự án theo đồ án chuyên ngành IPI Scanner.
- Tinh gọn phạm vi mã nguồn, loại bỏ nhiều module quét cũ không còn thuộc hướng triển khai hiện tại.
- Tách phần xử lý tài liệu thành các lớp semantic chunking, document extraction và document prefilter.
- Tổ chức lại các rule IPI trong `engine/prefilter/rules/` và bổ sung pipeline phía `src/ai/agents/document/` gồm detector, verifier, evidence và prompt.
- Cập nhật `README.md`, manifest và các luồng Electron/React để phù hợp với cấu trúc mới.
- Đồng bộ `package-lock.json` để tương thích Node 22 qua commit sửa CI.
- Chuyển các nội dung giao diện và hướng dẫn trong mã nguồn sang tiếng Anh ở commit `c6c91f0d`.

## Kế hoạch tiếp theo

- Chạy và ghi nhận kết quả test/build trên môi trường chuẩn.
- Bổ sung ảnh minh chứng vào cột **Ảnh kết quả**.
- Kiểm tra thêm các trường hợp tài liệu có prompt injection phức tạp và hoàn thiện báo cáo đồ án.
