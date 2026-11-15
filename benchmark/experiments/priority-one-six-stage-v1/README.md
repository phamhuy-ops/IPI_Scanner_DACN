# Hồ sơ baseline 50 ca

- Manifest đã khóa trong thư mục kết quả `round-one-eval-RTE04X`.
- `git-commit.txt` và `workspace.patch` lưu mốc Git và diff tệp được theo dõi tại lúc bắt đầu. `evaluation-history.cjs` là bản sao dependency của runner chưa được Git theo dõi lúc khóa.
- Runner ghi digest model, hash mã và request thực tế. Giao thức một lượt giữ toàn bộ ca lỗi và timeout.
- Sau khi chạy, dùng `node benchmark/experiments/priority-one-six-stage-v1/phan-tich-baseline.cjs` để phân loại quan sát. Các dấu hiệu có thể cùng xuất hiện. Chưa xác nhận là kết luận của vai trò, không suy rằng vai trò đó chưa được gọi.

## Chẩn đoán riêng Detector và Verifier

Chạy `node benchmark/experiments/priority-one-six-stage-v1/chan-doan-agent.cjs` từ gốc repo với hai model Ollama đã khóa. Runner kiểm tra hash manifest, mã, tệp nguồn và digest model. Mỗi lần chạy tạo thư mục mới `benchmark/results/agent-isolation-*` với request, phản hồi, lỗi và thời gian từng lượt.

Mỗi ca dùng một chunk đầy đủ đã được hai Agent đọc trong baseline. Detector rà tự do, sau đó Detector và Verifier nhận riêng cùng một trích dẫn trung tính. Verifier không nhận kết luận của Detector. Ba đối chứng sạch gồm hai ví dụ huấn luyện tiếng Việt và một đoạn HTML trích dẫn ví dụ. Giữ prompt và model baseline. Nhãn, ID ca và nhóm dữ liệu nằm ngoài request. Kết quả chỉ dùng để chẩn đoán trên dev.
