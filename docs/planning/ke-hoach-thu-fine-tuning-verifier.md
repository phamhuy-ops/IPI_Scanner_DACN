# Kế hoạch thử fine-tuning một Verifier

Cập nhật 2026-10-27. **Đã train hai ứng viên nội bộ, chưa đạt để triển khai. Không mở thêm lượt train trong đợt này.**

Hiện tạm dừng mở rộng dữ liệu. Đã quay lại đo Verifier Ollama thực trên
16 nguồn dev ngoài pool train và bốn pipeline TXT ngắn; không dùng 48 mẫu
nháp làm bộ chọn model. Instruct chưa đạt hơn Coder, mặc định giữ nguyên.
Đã sửa lỗi routing model chọn rõ trong mã nguồn; đây là sửa luồng, không
phải nâng cấp nhận diện đã được chứng minh. Hướng kiểm chứng tiếp là cách
giao đoạn kiểm tra khi chưa có finding, không mở thêm fine-tuning lúc này.

## Đợt tiếp: kiểm tra nhất quán trước khi xuất JSON

Đã khóa và đo một ứng viên prompt: nối một bước kiểm tra cuối vào
system hiện có. Model phải đối chiếu bằng chứng, người nhận, ngữ cảnh và
chuyển hướng với stance; giải thích bằng một câu ngắn, nhắm 40–180 ký tự
trong giới hạn gốc 20–240. Không đổi schema/parser, không cắt reason hoặc
tự sửa stance sau model. Mâu thuẫn vẫn đi theo chính sách cần xem xét.

Baseline và ứng viên đều dùng candidate-02 adapter bật, cùng HF NF4/model
instance/seed 42/max_new_tokens 256. Đây không phải đổi Verifier Ollama
mặc định. Ngân sách: **1 ứng viên prompt, 0 lượt train, 0 thử lại tự động**.

Đối chứng gồm 28 nguồn mới, 14 Việt/14 Anh: lệnh AI, việc cho người,
trích dẫn, thiếu người nhận, nguồn tự nhận phê duyệt, nhắc AI nhưng giao
việc cho người và mô tả sạch. Bốn bối cảnh có chung khuôn nên audit gom
thành hai nhóm từ vựng 14 mẫu; không coi là bốn nhóm độc lập. Nhãn AI đã
rà nội bộ, chưa có duyệt người; chỉ dùng dev chọn prompt, tuyệt đối không
nhập train hoặc gọi là holdout. Hai mode × hai prompt tạo 112 bản xem
trước; span/parser/token/mask/collator đều đạt, tối đa 1455 token.

Khi runner được triển khai, đo 12 biểu diễn dev cũ + 56 biểu diễn mới cho
mỗi prompt, tổng 136 lượt. Cổng đạt phải đồng thời có: mọi phản hồi hợp lệ;
stance đúng tăng trên đối chứng mới; không thêm FP/false-clear, không làm
ca đúng thành lỗi/uncertain, không xác nhận nhầm gold uncertain; không
hồi quy theo ngôn ngữ hoặc nhóm. TP mới phải đúng span và các trường ngữ
cảnh. p95 latency tối đa 1,2 lần, VRAM allocated tối đa 1,1 lần baseline.
Các ngưỡng là cổng chọn dev bảo thủ, không phải chuẩn an toàn tổng quát.

Trượt bất kỳ cổng nào thì chốt thất bại đợt này, giữ Agent. Đạt mới xem
xét full dev; vẫn cần dữ liệu độc lập mới, tài liệu dài/đa định dạng và
toàn pipeline trước triển khai. **Runner đã viết và đợt đã đóng do trượt
cổng bắt buộc.** Đã chạy 48/136 lượt: 24 baseline và 24 candidate cùng ca.
Candidate có 15 lỗi hợp đồng, nên không thể đạt cổng mọi phản hồi hợp lệ;
đã dừng sớm, giữ raw, không tự thử lại. Trên subset: stance đúng 7→3/24,
hợp lệ 12→9/24, FP 1→2; không suy chỉ số này cho đủ 68 ca mỗi prompt.
Phần đối chứng mới mới chạy sáu nguồn đầu trong một bối cảnh tiếng Việt.
Các cổng tổng hợp trên toàn bộ chưa được đánh giá đầy đủ; vi phạm từng ca
đã đủ loại ứng viên. Không đổi Agent, parser hoặc adapter, không train.

Thực thi: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/python-verifier.ps1 scripts/eval_verifier_consistency.py`;
chấm: `node scripts/score-verifier-consistency.cjs`. Các lệnh từ chối ghi đè
đợt hiện tại; không chạy lại để tìm kết quả tốt hơn. Xem
[kết luận dừng sớm](../../benchmark/experiments/verifier-consistency-eval-v1/ket-luan.json).

[Giao thức đã khóa](../../benchmark/experiments/verifier-consistency-candidate-v1/giao-thuc-da-khoa.json)
và [ứng viên cụ thể](../../benchmark/experiments/verifier-consistency-candidate-v1/ung-vien.json)
giữ suffix, cổng và hash. Kiểm tra bằng
`node scripts/freeze-verifier-consistency-candidate.cjs --check`.

## Chuẩn bị dữ liệu sau kiểm toán

Đã lập [ma trận bổ sung](../../benchmark/experiments/verifier-supervision-review-v1/ma-tran-bo-sung.json)
với 16 vị trí neo trên bốn nhóm train cha, hai ngôn ngữ. Bốn loại cần soạn:

- Yêu cầu AI thông thường, không có chứng cứ chuyển hướng trong setup text-only.
- AI là người nhận rõ nhưng chưa xác định được chuyển hướng cụ thể.
- Lệnh nhắm AI rõ nhưng chưa rõ đang có hiệu lực hay nằm trong câu trích.
- Hành động công cụ rõ nhưng chưa xác định người nhận là người hay AI.

Mỗi vị trí cần thêm đối chứng confirmed và human/quoted dismissed: dự kiến
48 biến thể. **Đã soạn đủ bốn batch: 48 mẫu, gồm 16 vị trí neo và 32 đối chứng.**
Batch đầu tập trung AI active/none trong
bốn bối cảnh train cha, có 6 Việt/6 Anh, 8 dismissed/4 confirmed.
24 biểu diễn qua parser/token/mask/collator, tối đa 1133 token; đối chiếu
376 nguồn split/dev không có match theo heuristic hoặc sai vai trò nhóm.
Đây chưa phải audit toàn raw hoặc độc lập ngữ nghĩa. Nhóm cha vẫn giữ dù
không có match từ vựng; nhãn text-only cần giữ đúng giới hạn áp dụng.
Batch hai có 4 uncertain/4 confirmed/4 dismissed, 6 Việt/6 Anh: người nhận
AI rõ nhưng thao tác tham chiếu nội dung không có trong phần nguồn.
24 preview đạt parser/token/mask/collator, max 1131 token. Đối chiếu 388
nguồn gồm split/dev và batch đầu không có match heuristic hoặc sai nhóm.
Batch ba giữ nguyên câu lệnh qua ba bao khung unclear/active/quoted, mỗi
nhãn bốn mẫu, 6 Việt/6 Anh. 24 preview đạt parser/token/mask/collator, max
1162 token; audit 400 nguồn split/dev/batch trước không có match heuristic
hoặc sai nhóm. Đây là TXT mô phỏng mất liên kết khối/cột, không phải kết
quả extractor PDF/DOCX. Batch bốn giữ cùng thao tác xóa lịch sử, chỉ phân
định người nhận; 24 preview đạt, max 1020 token.
Rà gộp đủ 48 mẫu/96 preview không thấy lỗi nhãn cấu trúc, span, mode,
metadata hoặc thiếu ô mục tiêu. Tổng 16 confirmed/20 dismissed/12 uncertain,
24 Việt/24 Anh; vẫn chỉ bốn nhóm train cha. Audit toàn kho v21 kiểm kê
102 file/68.730 văn bản chuẩn hóa khác nhau; nhóm mới chỉ nối đúng cha cũ,
chưa loại hết tương đồng ngữ nghĩa. Chưa duyệt độc lập hoặc ghép train.
Xem [tiến độ ma trận](../../benchmark/experiments/verifier-supervision-batch-audit-v4/tien-do-ma-tran.json)
và [bảng rà gộp](../../benchmark/experiments/verifier-supervision-pool-review-v1/ket-qua.json).
Đây là phạm vi soạn thử, không phải số lượng chứng minh đủ để train. Tất cả
giữ nhóm cha; không đưa dev đã đo vào train hoặc coi là nguồn độc lập mới.

Đã đọc và đề xuất reason cụ thể hơn cho 12 nguồn train, giữ stance/context;
24 biểu diễn thử qua parser, gồm 16 target có reason đề xuất và 8 target
rỗng giữ nguyên. [Đề xuất reason](../../benchmark/experiments/verifier-supervision-review-v1/de-xuat-ly-do.json)
ghi span bằng chứng và hash; chưa áp dụng, không chuyển duyệt người cũ sang
bản sửa. Bước tiếp rà ngữ nghĩa theo hàng chờ 48 mẫu, nhất là các ca
AI active/none và uncertain, rồi lập phương án phát hành/thay thế có kiểm
soát. Không tự nhập train, đổi split cũ hoặc mở thêm ngân sách model/train.
Không gọi model hoặc tự mở lượt train từ bước chuẩn bị này.

## Các mốc chuẩn bị pilot trước đây

Các gạch đầu dòng dưới là mốc trước khi mở pilot, không phải trạng thái
hiện tại; số liệu mới xem bảng hiện trạng. Giữ để đối chiếu lịch sử.

- Chỉ học một Verifier, không huấn luyện Rule Prefilter. Base HF: `Qwen/Qwen2.5-1.5B-Instruct`, revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`.
- Đích học: phân biệt người/AI, attack có hiệu lực/trích dẫn/không đủ ngữ cảnh; stance và bằng chứng đúng nguồn, JSON hợp lệ.
- Model Verifier Ollama mặc định là `qwen2.5-coder:1.5b`; không coi là cùng checkpoint với base HF. Không tự triển khai adapter smoke.
- Weights/tokenizer đã ở E; Trainer completion-only đã qua 8 kiểm thử CPU và smoke QLoRA 2048 token/accumulation 8, hai bước cập nhật và resume khớp hoàn toàn. Chỉ hỗ trợ một thiết bị/phiên bản thư viện đã khóa; GPU còn ít dư địa, chưa chứng minh đủ cho train dài hoặc mọi batch.
- Dữ liệu còn phải hoàn thiện quyền dùng, riêng tư, nhãn/span/context, trùng lặp và chia nhóm. 251 bản ứng viên không phải 251 bản đã đủ điều kiện train.
- Sau audit v14: 84 bản giữ dev, pool 167 ứng viên/64 nhóm chờ xét; mục tiêu train 180 + probe 60 còn thiếu ít nhất 73 ứng viên ngoài dev. Đã chuẩn hóa 23 email LLMail và 18 mẫu trên sáu đoạn Markdown tiếng Việt, không tự coi là holdout độc lập. Mốc 108 nhóm heuristic chưa chứng minh đủ độc lập hoặc chất lượng; rà tiếp khoảng thiếu và điều kiện dùng nguồn trước chia tập.
- Chỉ mở pilot sau khi khóa train/dev và tập kiểm chứng độc lập; giữ kiểm tra mask và ngân sách từng mẫu. Trainer/mask/gradient accumulation/checkpoint-resume đã qua smoke kỹ thuật, không thay thế điều kiện dữ liệu. Bộ tham chiếu và mẫu đã dùng chọn cấu hình không tự làm test cuối.
- Đo cùng base/backend trước và sau adapter; giữ các thành phần khác để so sánh. Báo cáo precision/recall/F1/FPR, confusion counts, abstention, lỗi, latency và RAM/VRAM; sau đó đo toàn pipeline.
- NF4 huấn luyện và GGUF quantization triển khai là hai bước khác nhau, cần đo tương ứng.

[Kế hoạch máy đọc](../../benchmark/experiments/verifier-finetune-pilot-v1/ke-hoach.json)
giữ chi tiết tái lập; [lưu trữ ổ E](../guides/luu-tru-huan-luyen-tren-o-e.md)
giữ lệnh sử dụng. Các mốc cũ được lưu trong ZIP lịch sử, không trộn vào
trạng thái hiện tại. Xem [việc cần làm](cong-viec-can-lam.md).
