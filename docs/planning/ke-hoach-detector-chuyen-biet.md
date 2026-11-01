# Thiết kế Detector chuyên biệt

**Đã tải và đo PIGuard English-only theo yêu cầu, đóng ở calibration vì không đạt.** Weights 738 MB trên E; dùng kiến trúc local đã rà, không chạy custom code upstream, không train. 32 nguồn/32 forward hợp lệ; không ngưỡng nào trong 19 ngưỡng đã khóa đạt recall ≥80% và FPR ≤5%. Tham chiếu 0,5 (không phải ngưỡng được chọn): TP 5, FP 12, TN 11, FN 2; precision 29,4%, recall 71,4%, F1 41,7%, FPR 52,2%. Hai mẫu uncertain báo riêng, không tính nhị phân. Giữ nguyên 20 reserved chưa đo. CPU 4 threads, RAM peak working set khoảng 1,31 GiB, p95 nguồn 0,28 giây sau nạp; nạp model 3,75 giây. Không bật vào ứng dụng, không chứng minh tiếng Việt/pipeline/độc lập; giữ weights để đối chiếu.

Phạm vi tiếng Việt được người dùng cho phép để ngoài đợt PIGuard; không xóa yêu cầu tiếng Việt của toàn dự án. Đợt Meta và PIGuard có manifest riêng. Quyết định mới nhất là đóng PIGuard, không tiếp tục sửa nhỏ; các mục dưới giữ bối cảnh thiết kế/đợt Meta trước đó.


Cập nhật 2026-10-27. **Đã hoàn tất worker và cohort offline, chưa tải model/tokenizer, gọi suy luận thật hoặc train. Ưu tiên 1 vẫn mở.**
Người dùng đã cho phép tải duy nhất model/commit đã đề xuất về E và đo, không train. Đang chờ đăng nhập/quyền Hugging Face; chưa tải được file model. Đợt candidate-only-v1 đã đóng và bị loại, không sửa tiếp prompt đó.

## Quyết định kiến trúc

Tách bộ tìm ứng viên khỏi bộ nhận định. Mục tiêu: trích xuất có nguồn → Rule + classifier → hợp nhất cửa sổ ứng viên → hai model hiện tại đối chiếu độc lập → chính sách ba kết luận.

Classifier là bộ phân loại chuyên dụng, không chat và không tự sinh trích dẫn. Điểm số chỉ ưu tiên ứng viên; không có phép chuyển score cao thành confirmed hoặc score thấp thành tài liệu an toàn. Rule vẫn là nghi vấn. Hai model hiện tại giữ vai trò nhận định đối chiếu; nếu triển khai đích, model từng làm Detector nhận ứng viên để đánh giá, không kiêm tìm discovery. Điều này chưa được đo, không suy thành công từ thiết kế. Không bật lại candidate-only-v1.

Bước đầu chỉ chạy classifier ở chế độ đo song song, không thay luồng sản phẩm. Chỉ khi đạt cổng tìm ứng viên mới xây bản pipeline đích có feature flag; giữ chính sách bất đồng/lỗi/coverage. Không đưa classifier vào SLM allowlist: đây là runtime khác, không phải model chat Ollama.

## Model đề xuất và điều kiện dùng

Ưu tiên duy nhất: [meta-llama/Llama-Prompt-Guard-2-86M](https://huggingface.co/meta-llama/Llama-Prompt-Guard-2-86M), classifier đa ngôn ngữ, Transformers. Cần kiểm tra quyền truy cập và người dùng tự xử lý điều kiện cấp quyền của nhà cung cấp nếu được yêu cầu; không điền hoặc chấp nhận thay. Chưa có bằng chứng tiếng Việt đáp ứng dự án; kiểm tra tiếng Việt là cổng riêng. Số tham số nhỏ không chứng minh mức VRAM hoặc tốc độ, phải đo thực tế.

Dự phòng để cân nhắc nếu ứng viên chính không khả dụng: [leolee99/PIGuard](https://huggingface.co/leolee99/PIGuard), tên InjecGuard cũ được chuyển hướng. Model card ghi English, MIT và cần custom code; phải pin revision, đọc code trước khi chạy. NotInject cùng nhóm tác giả nên chỉ là phép đo tương thích, không dùng để chứng minh độc lập. Không tự tải dự phòng hoặc lần lượt thử nhiều model khi ứng viên đầu trượt.

Không ưu tiên [ProtectAI v2](https://huggingface.co/protectai/deberta-v3-base-prompt-injection-v2): model card nêu English, không xử lý non-English và dự án đã archived. Chưa chọn bản Việt cộng đồng khi chưa rà được nguồn dữ liệu, rò rỉ và phiên bản.

## Hợp đồng dữ liệu và thực thi

- Đầu vào runtime: văn bản trích xuất, nguồn/view, offset và ánh xạ dòng. Nhãn, group ID, gold span, source dataset ID không vào tensor hoặc prompt.
- Đầu ra mỗi cửa sổ: model/revision/tokenizer hash, logits và score theo id2label đã kiểm tra, window ID nội bộ, khoảng ký tự nguồn, số token, trạng thái xử lý. Không gọi score là xác suất đã hiệu chuẩn.
- Chia cửa sổ theo tokenizer thật và giới hạn model/config, tính cả special tokens. Không dùng truncation ngầm. Overlap xác định trước đo, bảo toàn offset và kiểm tra tái dựng nguồn; ngữ cảnh dài vượt cửa sổ là giới hạn phải báo. Chưa cố định 512 cho mọi model khi chưa đọc config/tokenizer.
- Vùng có điểm cao trở thành ứng viên toàn cửa sổ, trích trực tiếp từ nguồn. Đây không phải span payload do classifier tự định vị. Giữ cửa sổ kề để hai model đối chiếu; hợp nhất theo khoảng nguồn, không theo ý nghĩa suy đoán.
- Mức thấp/cao chỉ là ngưỡng định tuyến chọn trên dev. Vùng giữa chưa chắc chắn; vùng thấp không đủ để tự cấp nhãn benign. Không tự sinh uncertainty như nhãn thứ ba của classifier nhị phân.
- Quét catalog nguồn trích xuất thay vì chỉ phần đầu hoặc chỉ các chunk AI đã chọn. Nếu cần giới hạn tài nguyên, ghi số cửa sổ bỏ qua/nguồn lỗi và chuyển coverage chưa đủ vào policy. Điểm tối đa nhiều cửa sổ có thể tăng báo nhầm, phải đo ở mức tài liệu.
- Thiết kế runtime Python dạng worker stdio do Electron main quản lý, không mở dịch vụ ra mạng; PyTorch CPU trước để tránh tranh VRAM với Ollama, đo GPU sau nếu có lý do. Timeout/hủy phải dừng worker, lỗi không thành score 0. Đã có transport Node stdio và worker Python local-only; chỉ kiểm thử với backend giả, chưa nạp model thật.
- Python, cache, weights và kết quả nặng trên E; code trên C. Sau tải được cho phép, pin commit/hash và chạy local/offline. Không tải hoặc cài gì trong đợt thiết kế này.

## Phạm vi và điểm dừng của đợt tiếp

1. **Đã xong offline:** adapter, mapping nhãn, window/offset, không cắt nguồn, budget/coverage và lỗi/timeout. Worker fixture thật qua stdio được dừng khi hủy/timeout. Chưa gọi là tokenizer/model thật hoạt động tốt.
2. Sau khi được cho phép tải: chỉ một model/revision, không train. Khóa manifest đầu vào, budget, quy tắc chọn ngưỡng và cổng trước suy luận. Cache score một lần cho mỗi cửa sổ; thử ngưỡng offline có giới hạn, không thêm prompt hoặc model khác để cứu kết quả.
3. Đo tìm ứng viên độc lập với model nhận định. Cùng đầu vào so với candidate của Rule + Detector hiện tại; thống kê precision/recall/F1/FPR, số lượng cửa sổ ứng viên, tỷ lệ giữ đủ directive và bao khung. Quote toàn cửa sổ không được tính thành định vị chính xác payload.
4. Chỉ nếu bước 3 đạt mới triển khai/đo pipeline đích. So baseline toàn pipeline, đặc biệt số cảnh báo sai, bỏ sót, chuyển cần xem xét, lỗi, coverage và độ trễ. Nếu bước 3 hoặc 4 trượt: đóng ứng viên; không tự train, đổi model hoặc nối thử nhỏ vô hạn.

## Dữ liệu và cổng lựa chọn

Tận dụng kho đã có: 339 NotInject sạch khó, 17 realistic (10 malicious gồm direct/mixed và IPI, 7 benign), các ca Việt/Anh người nhận và tài liệu sạch dài/đa định dạng. Không gộp direct/mixed thành IPI thuần, không coi BIPIA derivative độc lập với BIPIA. Phần đã dùng chỉnh hoặc chẩn đoán vẫn là dev. Chưa mở tập test cuối của dự án hoặc ấn định nó là chưa từng dùng.

Trước đo cần manifest nhóm chống trùng và tách dev chọn ngưỡng khỏi tập kiểm chứng cấu hình đã khóa. Rà khả năng dữ liệu công khai trùng train của nhà cung cấp; không hứa kiểm chứng độc lập chỉ vì khác thư mục. Nếu thiếu holdout đủ căn cứ, chốt kết quả là sơ bộ, chưa triển khai mặc định.

Cổng phát hiện ứng viên phải có tăng recall/giữ đủ bằng chứng trên tấn công IPI, không thêm báo nhầm hoặc hồi quy ca đúng ở hard negatives/người nhận/ngôn ngữ. Không đạt chỉ vì tăng JSON hoặc gắn cờ mọi cửa sổ. Rà và khóa ngưỡng, counts và budget số cụ thể sau manifest, trước lượt model đầu; chưa có cổng số học cuối cùng trong bản thiết kế này. Phải đạt tiếng Việt riêng để tuyên bố hỗ trợ tiếng Việt; nếu chỉ đạt tiếng Anh chỉ được kết luận phạm vi tiếng Anh.

Cổng pipeline giữ chính sách đã khóa tại [cổng Ưu tiên 1](cong-hoan-thanh-uu-tien-1.md), không biến score classifier thành xác nhận của một model. Có thể ít ứng viên bỏ sót hơn nhưng Verifier vẫn bác bỏ sai; khi đó toàn hệ thống chưa đạt. Không tự đưa vào mặc định sau screen dev.

## Trạng thái hiện tại

**Đã hoàn tất worker Python local-only và khóa cohort sàng lọc.** 274 test ứng dụng, 10 test worker Python và 3 test chia nhóm/hash đạt; lint/typecheck/build đạt. Tích hợp qua hai tiến trình Python thật tạo 22 cửa sổ UTF-16 bằng backend giả, không gọi model thật. Cohort 66 nguồn/24 nhóm: 40 chọn ngưỡng, 26 đo sau khóa ngưỡng; giữ nhóm không giao nhau, vẫn là dev đã dùng chứ không phải holdout độc lập. Đã khóa phương pháp chọn ngưỡng và budget tối đa 512 cửa sổ/1 model, chưa chọn ngưỡng thực. Model đề xuất đã pin metadata commit a8ded8e697ce7c355e395a0df51f94adb4a2fd27; repo yêu cầu quyền truy cập thủ công, chưa kiểm quyền tài khoản hoặc tải weights/tokenizer. Không train hoặc đổi mặc định.

Worker nằm tại scripts/classifier_worker.py. Manifest bắt buộc có đường dẫn local trên E, commit, hash artifact và mapping nhãn. AutoConfig/Tokenizer/Model dùng local_files_only, trust_remote_code=False, weights safetensors, CPU; lỗi không trả score. Operation prepare dùng tokenizer để chia nguồn và chuyển code point Python sang UTF-16; adapter JS kiểm hash nguồn, offset/dòng và token trước classify. Operation classify đếm lại từng cửa sổ và không truncation. Thử nghiệm end-to-end tại benchmark/experiments/classifier-python-offline-v1, backend giả được ghi rõ. Chưa mở IPC/UI.

Cohort tại benchmark/experiments/specialized-detector-screen-v1: 45 dismissed/17 confirmed/4 uncertain; calibration 27/10/3, reserved 18/7/1. Ngoài các giới hạn rò rỉ đã nêu, chỉ một mẫu uncertain ở reserved nên không đủ suy chất lượng uncertain tổng quát. Threshold/budget đã ghi trong giao-thuc-du-lieu.json, chưa điều chỉnh theo output model.

Đề xuất model và commit ở de-xuat-model.json; gated=manual chỉ là trạng thái repo, chưa chứng minh tài khoản người dùng đã được cấp quyền. Nếu chưa có quyền, người dùng cần yêu cầu trên trang model Hugging Face; không gửi token trong chat. Bước kế cần người dùng cho phép tải duy nhất model đã đề xuất và quyền truy cập tương ứng. Sau đó pin artifact/tokenizer, chốt config token, chạy calibration đúng một lượt; không train. Chưa có bằng chứng cải thiện nhận diện, Ưu tiên 1 vẫn mở.


## Trở ngại truy cập hiện tại

Người dùng đã cho phép tải đúng Prompt Guard 2 86M về E và đo cohort 66 mẫu, không train. Kiểm tra thực tế: chưa có token Hugging Face ở cache E hoặc các vị trí đăng nhập cũ trên C; chưa tải file model/tokenizer và chưa suy luận. Repo gated=manual nên người dùng cần quyền tài khoản và hf auth login. Đã có downloader pin đúng commit, lưu trạng thái và không tự chấp nhận điều kiện hoặc đổi model. Ba test nhánh thiếu token/từ chối truy cập/bảo toàn thư mục cũ đạt. Không cần xác nhận lại quyền tải sau khi đăng nhập.

Nếu chưa có quyền, đăng nhập website Hugging Face và yêu cầu quyền ở https://huggingface.co/meta-llama/Llama-Prompt-Guard-2-86M. Không tự chấp nhận điều kiện thay người dùng. Sau đó trong PowerShell tại thư mục dự án:

```powershell
. .\scripts\use-training-storage.ps1
hf auth login
```

CLI lưu token tại HF_HOME trên E; không gửi token trong chat hoặc đặt vào câu lệnh có --token. Downloader là scripts/download_specialized_detector.py, chạy qua scripts/python-verifier.ps1. Không cần cài phần mềm mới; chưa gọi model hoặc mở reserved.
