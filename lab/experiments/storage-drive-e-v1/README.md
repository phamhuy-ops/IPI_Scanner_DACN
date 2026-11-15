# Cấu hình và kiểm tra lưu trữ trên E

[Kết quả máy đọc](ket-qua.json) lưu snapshot đường dẫn, phiên bản Python,
uv/checksum, phép thử ghi/đọc và kiểm tra Ollama. Xem
[hướng dẫn](../../../docs/guides/luu-tru-huan-luyen-tren-o-e.md).

Đã tạo Python 3.12.15 và venv trên E; cache/temp/output cấu hình theo shell
huấn luyện. Code giữ trên C, Python hệ thống không đổi. Ollama đã dùng E từ
trước: xác minh 16 blob và nạp thử ba model, không có model cũ ở đường mặc
định C. Không xóa model hoặc dữ liệu có sẵn, không báo giải phóng C giả tạo.

Lệnh kiểm tra lại: `npm run training:storage:check` và
`npm run training:verifier:inspect:e`. Chưa cài thư viện ML, train, tạo
adapter/checkpoint thực tế hoặc thay model ứng dụng.
