# Lưu dữ liệu huấn luyện trên ổ E

Đã cấu hình theo yêu cầu: dự án/code và benchmark hiện có giữ trên C; Python
riêng, cache, weights và output huấn luyện mới đặt ở `E:\IPI-Training`.
Kho Ollama hiện dùng `E:\Ollama\models`.

## Cách dùng từ thư mục dự án trên C

```powershell
npm run training:storage:check
npm run training:verifier:inspect:e
```

Lệnh đầu kiểm tra Python gốc/venv, cache, temp và thử ghi/đọc file tạm do
chính nó tạo trong các thư mục đích. Lệnh sau kiểm kê môi trường huấn luyện,
đo dung lượng ổ E riêng với ổ C chứa code. Không chạy training.

Muốn chạy một file Python bằng môi trường này:

```powershell
npm run training:python -- scripts/inspect-verifier-training.py
```

Hoặc nạp môi trường vào PowerShell hiện tại:

```powershell
. .\scripts\use-training-storage.ps1
python --version
python -m pip cache dir
```

Sau khi nạp, Python là venv 3.12 trên E. Khi đóng shell, các thay đổi
PATH/cache/temp chỉ của shell kết thúc. Không tự đổi Python mặc định của
Windows; `python` hoặc `pip` chạy ngoài launcher/shell này vẫn có thể dùng
môi trường và cache cũ trên C. File `.env` của Vite không tự nạp môi trường
huấn luyện Python. Các script `.ps1` được lưu UTF-8 có BOM để Windows
PowerShell 5.1 đọc đúng tiếng Việt; đã thử bằng launcher thực tế.

## Các nơi lưu đã tạo

- `E:\IPI-Training\python`: CPython 3.12.15 managed, không đăng ký làm Python
  hệ thống. Bản Python 3.14 trên C được giữ nguyên.
- `E:\IPI-Training\venvs\verifier`: venv riêng, có pip; chưa cài thư viện ML.
- `E:\IPI-Training\cache`: Hugging Face hub/datasets/assets/xet, pip, uv,
  torch, torch extensions, triton và pycache.
- `E:\IPI-Training\weights`: weights riêng/weights sau merge khi triển khai.
  Model tải qua Hugging Face mặc định đi vào cache hub trên E.
- `E:\IPI-Training\adapters` và `checkpoints`: nơi lưu adapter và checkpoint.
- `E:\IPI-Training\logs`, `results`, `tmp`: log/output nặng và file tạm.
- `E:\IPI-Training\tools\uv-0.13.5`: uv đã đối chiếu SHA256 với asset chính
  thức trước khi chạy; bản tải và metadata ở downloads/logs trên E.

Các biến `IPI_WEIGHTS_DIR`, `IPI_ADAPTERS_DIR`, `IPI_CHECKPOINTS_DIR` là cấu
hình dự án, **không tự thay output_dir của mọi thư viện**. Khi viết trainer/
exporter phải truyền rõ các đường này. Kế hoạch pilot đã chỉ định
`E:\IPI-Training\checkpoints\verifier-pilot-v1` cho Trainer và thư mục tương
ứng dưới adapters cho adapter. Chưa có trainer hoặc adapter được tạo.

Chỉ thêm `IPI_TRAINING_ROOT=E:\IPI-Training` ở biến môi trường cấp User để
ghi nhớ root. Các biến Hugging Face/pip/uv/torch/TEMP/TMP/PATH được nạp theo
shell huấn luyện; không thay TEMP, PATH hoặc cache toàn hệ thống. Bản lưu giá
trị trước ở `E:\IPI-Training\logs\storage-before.json`. Có thể truyền Root
khác cho script cấu hình, nhưng phải kiểm tra môi trường/venv ở đích mới,
không di chuyển venv đã tạo bằng cách kéo thả.

Cơ sở cách cấu hình cache: [Hugging Face](https://huggingface.co/docs/huggingface_hub/en/package_reference/environment_variables)
và [uv storage](https://docs.astral.sh/uv/reference/storage/). Python managed
được uv lấy từ [python-build-standalone](https://docs.astral.sh/uv/guides/install-python/),
không phải cài đè interpreter trên C. Chưa nâng cấp thư viện ML hoặc thực
hiện phép thử GPU/backward trong tác vụ lưu trữ này.

## Ollama và bản cũ trên C

Lúc bắt đầu kiểm tra, User OLLAMA_MODELS đã là `E:\Ollama\models`, kho model
trên E khoảng 2,78 GB và `C:\Users\Admin\.ollama\models` không tồn tại.
Không có thao tác sao chép/xóa model hoặc giải phóng thêm C từ tác vụ này.
Không xóa thư mục `.ollama` chung vì nó có thể chứa cấu hình/khóa khác.

Đã kiểm tra FROM do server trả về cho ba model đều trỏ vào blob trên E,
16 blob khớp SHA256 theo tên file, cả ba model nạp và trả lời thử thành công.
User OLLAMA_MODELS được giữ nguyên; không cần restart server đang phục vụ
đúng kho. Theo [Ollama](https://docs.ollama.com/faq), nếu đổi biến sau này thì
cần restart ứng dụng để server nhận môi trường mới, không chỉ sửa biến ở
shell gọi client.

Báo cáo kiểm tra ở `E:\IPI-Training\logs\ollama-storage-check.json` và
`training-storage-check.json`; bản lưu trong dự án tại
`benchmark/experiments/storage-drive-e-v1/ket-qua.json`.

## Kết quả và giới hạn

19 nơi lưu đã thử ghi/đọc, Python gốc và venv/tempfile đều nằm trong root E;
working directory vẫn là dự án trên C. Inventory qua launcher thấy ổ E còn
khoảng 183 GiB và đã đạt ngân sách disk 12 GiB của kế hoạch. Các báo cáo nhỏ
và tài liệu dự án vẫn có thể ghi trên C theo thiết kế.

Việc cấu hình lưu trữ không chứng minh train vừa GPU 4 GB. Venv hiện chưa
có torch/transformers/PEFT/TRL/bitsandbytes; vẫn phải chuẩn bị dependency và
thử forward/backward trước pilot. Dữ liệu gốc, model baseline, 20 nhãn đã
duyệt và cấu hình agent được giữ nguyên.
