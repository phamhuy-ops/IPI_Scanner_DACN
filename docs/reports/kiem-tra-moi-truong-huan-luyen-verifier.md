# Kiểm tra môi trường chuẩn bị huấn luyện Verifier

Cập nhật sau cấu hình lưu trữ: Python 3.12.15/venv và cache/output đã tạo
trên E, ngân sách disk đã đạt; xem
[hướng dẫn và bằng chứng](../guides/luu-tru-huan-luyen-tren-o-e.md). Chưa cài
thư viện ML hoặc chạy backward. Phần bên dưới giữ inventory ban đầu trước
khi người dùng yêu cầu dùng E.

Ngày kiểm tra: 2026-10-24. **Máy chưa được xác minh đủ điều kiện train**;
đã hoàn tất inventory chỉ đọc, không cài đặt hoặc chạy model huấn luyện.

Nguồn snapshot:
`benchmark/results/training-readiness-35jqiktd/summary.json`, bản lưu trong
`benchmark/experiments/verifier-finetune-pilot-v1/kiem-tra-moi-truong.json`.

Đã quan sát Windows 11, GPU NVIDIA GeForce RTX 3050 Ti Laptop 4.096 MiB,
3.825 MiB VRAM trống tại thời điểm hỏi, driver 610.62. RAM vật lý khoảng
23,8 GiB, khả dụng khoảng 10 GiB; ổ chứa dự án còn 7.490.953.216 byte,
khoảng 6,98 GiB. Đây là ảnh chụp thời điểm kiểm tra, không phải peak khi train.

Python đang kiểm tra là `C:\Python314\python.exe`, phiên bản 3.14.2. Trong
môi trường này chưa tìm thấy torch, transformers, peft, trl, accelerate,
bitsandbytes, datasets, huggingface-hub, safetensors. Không kiểm kê toàn bộ
venv khác nên không khẳng định máy không có bất kỳ môi trường ML nào.

Lệnh liệt kê WSL khi bị giới hạn quyền trả Access denied. Đã kiểm tra lại
chỉ đọc với quyền phù hợp: returncode=0, không có tên distro trong stdout.
Không kết luận có một môi trường Linux sẵn sàng. Lần bị giới hạn quyền vẫn
được giữ trong `training-readiness-y4aprfuc`; không coi đó là lỗi model.

QLoRA là phương án đề xuất để thử trên tài nguyên này, chưa có bằng chứng
nạp model/backward vừa VRAM. CUDA driver hoặc khả năng chạy Ollama không
chứng minh torch/bitsandbytes train được. Tài liệu chính thức của
[bitsandbytes](https://huggingface.co/docs/bitsandbytes/main/en/installation)
có hỗ trợ Windows/NVIDIA, nhưng vẫn cần kiểm tra đúng bộ wheel, Python,
PyTorch/CUDA, import và forward/backward thực tế trước khi chọn phiên bản.
Chưa cài hoặc pin một bộ dependency chưa được thử.

Ngân sách dự án ban đầu là 12 GiB trống cho cache/output; hiện chưa đạt.
Đây là khoản dự phòng do dự án đặt, không phải kết quả benchmark dung lượng
tối thiểu. Phải tính lại theo đường cache, dependency, weights gốc và nhu
cầu merge/export; không tự xóa model đã tải hoặc file người dùng.

Lệnh tái kiểm tra: `npm run training:verifier:inspect`. Script chỉ dùng thư
viện chuẩn Python để đọc metadata package, disk, RAM và lệnh inventory GPU/
WSL; không import torch khởi tạo CUDA, không tải weights, train hoặc hỏi
model. Mỗi lần tạo báo cáo riêng, training_ready luôn false vì inventory
không thay thế smoke. Null ở CUDA/backward nghĩa là chưa đo, không phải lỗi.

Ba kiểm thử Python của đánh giá inventory đã qua, gồm đủ package vẫn chưa
chứng minh train được, giá trị thiếu giữ unknown và ngân sách ổ đĩa thấp.
Chưa có số đo training loss, peak VRAM/RAM, thời gian bước train hoặc kết
quả adapter; không suy ra các số đó từ metadata.

Phần tiếp theo: chuẩn bị venv riêng và đường lưu đủ dung lượng, khóa
dependency sau resolver/import, kiểm tra renderer/token mask và chạy smoke
10 bước với dữ liệu train mới đã duyệt. Chi tiết trong
[kế hoạch pilot](../planning/ke-hoach-thu-fine-tuning-verifier.md).
