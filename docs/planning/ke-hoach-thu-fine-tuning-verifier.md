# Kế hoạch pilot fine-tuning Verifier

Ngày chốt: 2026-10-24. Trạng thái: **đã có kế hoạch, chưa huấn luyện**.
Sau yêu cầu dùng ổ E, đã tạo Python 3.12.15/venv và đường cache/output riêng;
xem [cấu hình lưu trữ](../guides/luu-tru-huan-luyen-tren-o-e.md). Mục tiêu
model/dữ liệu/cổng không đổi. Các số inventory ban đầu trong mục kiểm tra
máy bên dưới là mốc lịch sử; hiện disk trên E đạt ngân sách, thư viện ML và
smoke GPU vẫn chưa được chuẩn bị/chạy. Snapshot kế hoạch trước thay đổi và
inventory mới được lưu riêng trong thư mục thí nghiệm.

Ứng viên duy nhất là Qwen2.5-1.5B-Instruct. Mục tiêu là kiểm chứng nghi vấn
IPI bằng nguồn và ngữ cảnh, trả kết luận có bằng chứng và nhất quán. Kế hoạch
máy đọc tại [ke-hoach.json](../../benchmark/experiments/verifier-finetune-pilot-v1/ke-hoach.json).

## Phạm vi và mốc so sánh

Chỉ huấn luyện một Verifier. Giữ Detector, Rule Prefilter, extraction,
chunking và chính sách kết luận làm mốc khi đo pipeline. Chưa thay mặc định,
allowlist hoặc thêm vòng phản biện. Sửa chúng trong một thí nghiệm khác nếu
có lỗi riêng được chứng minh, không trộn vào kết quả fine-tuning.

Bản Qwen instruct nhận diện trực tiếp 4/5 tấn công nhưng context chỉ 4/12
nhất quán, có false clear; xem [phép đo ứng viên](../reports/danh-gia-model-thay-the-verifier.md).
Đó là căn cứ chọn vấn đề để học, chưa chứng minh model sẽ học thành công.

Khóa base HF `Qwen/Qwen2.5-1.5B-Instruct`, commit
`989aa7980e4cf806f80c7fef2b1adb7bc71aa306`, license khai báo Apache-2.0.
Đã đọc metadata công khai để xác nhận commit, chưa tải weights huấn luyện.
[Metadata lưu](../../benchmark/experiments/verifier-finetune-pilot-v1/phien-ban-model-goc.json).
Model GGUF trong Ollama hiện có tiếp tục làm mốc inference; lộ trình pilot
đề xuất dùng weights/tokenizer HF tương ứng với PEFT/QLoRA, không coi file
GGUF đang chạy là checkpoint huấn luyện Transformers.

## Verifier cần học gì

Giữ hợp đồng thử nghiệm hiện có `referenced-v1` + `compact-v1`, chưa đưa vào
mặc định. Đầu vào gồm system prompt Verifier được khóa, bảng mã đoạn nguồn,
các ID nghi vấn nếu có và toàn bộ chunk nguồn trong batch. Vòng đầu không
nhìn stance, reason hoặc confidence của Detector.

Chỉ các ID tham chiếu phục vụ ràng buộc inference được phép xuất hiện, như
`suspicion-1`, `ref-1`, `chunk-1`; chúng không mang nhãn. ID dataset/ca/nhóm,
provenance, source_label, đáp án và ghi chú người duyệt chỉ nằm ngoài input.
Không cung cấp user_intent trong setup này; không suy task mismatch dựa vào
nhiệm vụ chỉ có trong metadata.

Tên file được ánh xạ trung tính, không mang ID ca/nhãn dataset. Header risk
score, số finding và lý do chọn chunk hiện có trong formatter phải lấy từ
scanner/selector đã khóa, không được dựng từ đáp án. Ghi lại nguồn các giá
trị này và có đối chứng finding sai/nguồn sạch để model không học rằng có
finding hoặc risk cao tự đồng nghĩa tấn công. Không cung cấp Detector
confidence qua một trường metadata thay thế.

Đầu ra có đúng hai mảng `assessments` và `discoveries`:

- Assessment: id, spanId, addressee, framing, deviation, hasDirective, stance,
  reason. Mỗi nghi vấn đầu vào được trả đúng một lần. spanId phải khớp mã
  ràng buộc nghi vấn; phần này học kiểm chứng, không được đổi span tùy ý.
- Discovery: cùng các trường, bỏ id, chọn spanId từ nguồn cho chỉ dẫn tấn
  công mới. Các ràng buộc discovery của validator hiện tại vẫn giữ nguyên.
- Không có nghi vấn thì assessments rỗng, nhưng vẫn phải tìm trên toàn bộ
  nguồn để trả discoveries phù hợp. Không có tấn công thì discoveries rỗng.
- Reason 20–240 ký tự, nêu bằng chứng/ngữ cảnh ngắn gọn. Không có analysis tự
  do, quote do model tự viết hoặc yêu cầu model sinh chuỗi suy luận dài.

Confirmed xác nhận có IPI đang hoạt động; dismissed bác bỏ nghi vấn trong
ngữ cảnh; uncertain là thiếu bằng chứng thực sự. Phân biệt người nhận trong
câu trích và hiệu lực của câu đó. Học bác bỏ finding sai, nhận ra lệnh thật,
tìm thêm lệnh bị bỏ qua và không lạm dụng uncertain để né kết luận.

Trích dẫn thật được ứng dụng truy hồi từ ID. Khớp nguồn không chứng minh
hiểu đúng: cần kiểm tra cả lý do và ngữ cảnh, như ca mô tả đúng lệnh gửi
hội thoại nhưng gán quoted_example/dismissed. Xem ontology trong
[hướng dẫn gán nhãn](../guides/huong-dan-gan-nhan-ngu-canh.md).

## Mở rộng dữ liệu theo nhóm nguồn

Hai mươi mẫu vừa duyệt là **bộ tham chiếu cách gán nhãn và regression dev
cũ**. Không dùng chúng làm bài học train hoặc holdout. Quyết định ann-004
đã sửa phải lấy từ final_annotation; không lấy lại nhãn nháp assistant.
Quá trình rà soát có xem đề xuất AI, không phải gán nhãn độc lập/mù.

Mục tiêu thu thập pilot: **300 lượt kiểm chứng từ ít nhất 100 nhóm nguồn**,
dự kiến 180 train, 60 dev, 60 probe biến thể để mở sau khi chọn ứng viên.
Đây là ngân sách khởi đầu, chưa có số mẫu này trong repo và không bảo đảm
đủ để học. Chia theo nhóm trước; chấp nhận lệch số hàng, không phá nhóm để
đạt tỷ lệ đẹp. Probe tự soạn vẫn là chẩn đoán chuyển ngữ cảnh, không phải
tập kiểm chứng độc lập cuối.

Định hướng nội dung:

- Khoảng 40% confirmed, 40% dismissed, 20% uncertain có căn cứ thiếu ngữ
  cảnh; tiếng Việt và Anh mỗi ngôn ngữ ít nhất 40%. Đây là mục tiêu lấy mẫu,
  không phải tần suất IPI tự nhiên hay cơ sở hiệu chỉnh xác suất thực tế.
- Khoảng 60% có nghi vấn được cung cấp và 40% không có nghi vấn. Có cả
  batch không finding nhưng chứa tấn công, và batch sạch không finding.
- Có finding báo nhầm từ rule/Detector, ví dụ đào tạo, hướng dẫn cho người,
  tên Dan Evans; lệnh chủ động đổi nhiệm vụ/đáp án, tiết lộ dữ liệu, dùng
  công cụ sai; nhiều nghi vấn đúng/sai trong cùng tài liệu.
- Có nguồn sạch thực tế công khai/đã khử dữ liệu riêng tư, email, trang web,
  tài liệu công việc, nhiều vị trí đầu/giữa/cuối và độ dài. HTML comment và
  định dạng nguồn gốc được giữ để đo extraction/pipeline sau này.

Nghi vấn đầu vào phải đến từ snapshot rule/Detector được khóa, hoặc cách
chọn câu độc lập với nhãn được định nghĩa trước. Không chỉ lấy đúng gold
attack span làm candidate rồi coi đó là khả năng tự tìm IPI. Bảng mã phải
bao phủ nguồn theo cách runtime làm; không đánh dấu span đáp án vào input.
Đáp án discovery chọn span từ bảng là supervision ở output, được kiểm tra
bằng validator sản phẩm khi triển khai renderer/exporter.

Giữ source/version/license và mức chắc chắn từng mẫu. Nhãn nhị phân của
dataset không tự chuyển thành stance/ngữ cảnh. Người rà soát phải đọc nguồn,
xử lý bất đồng; bất đồng chưa giải quyết được cách ly, không tự gán uncertain
để đủ tỷ lệ. Uncertain chỉ là đáp án khi chính bài toán thiếu bằng chứng.
Với tập đánh giá, người gán nhãn không được xem output model để chọn đáp án;
ưu tiên có người thứ hai rà soát ca khó và ghi rõ phương pháp thực tế.

Nguồn BIPIA/MAlmasabi, NotInject và realistic đã dùng dev không được đổi tên
thành nguồn độc lập. Kiểm tra quyền dùng lại trước khi đưa vào bản train;
giữ attribution và điều kiện từng nguồn, không gộp license tùy tiện.

## Giữ tính độc lập

Gom trước khi chia: tài liệu gốc, bản trích, phiên bản định dạng, cặp gần
giống, bản dịch và biến thể tấn công thuộc cùng family. Kiểm tra hash, text
chuẩn hóa, near duplicate và provenance; rà soát nhóm lớn, lưu seed và bản
đồ group. Không gom toàn bộ một loại hành vi thành một nhóm hoặc nhầm tên
dataset khác nhau với độc lập nguồn. Chưa bảo đảm hết tương đồng ngữ nghĩa.

Khóa train/dev/probe sau khi có dữ liệu thực tế. Chỉ dev được dùng chọn
learning rate/checkpoint/prompt. Probe dùng sau khi chọn ứng viên; nếu sửa
theo lỗi probe thì nó thành dev và phải thay probe cho kiểm tra chuyển tiếp.

Tập kiểm chứng độc lập cuối **chưa được thu thập**. Mục tiêu 200 mẫu từ ít
nhất hai family nguồn độc lập với toàn bộ dữ liệu phát triển: khoảng 80 tấn
công, 80 sạch và 40 thiếu ngữ cảnh có chủ đích. Cần dữ liệu nhiều môi trường
và kiểm tra overlap cả với bộ dev cũ. Nhãn được chốt trước khi xem output.
Không mặc định NVIDIA hoặc dataset mới nào độc lập chỉ từ tên nhà phát hành.

Trước lần chạy cuối, khóa model/adapter, tokenizer, prompt, parser, template,
quy tắc chunking, quantizer và policy. Không chọn checkpoint trên holdout.
Nếu sửa theo kết quả holdout, ghi rõ nó đã thành dữ liệu phát triển và lấy
holdout mới cho claim cuối. Không chấm tập MAlmasabi test để điều chỉnh pilot.

## Cách huấn luyện dự kiến

Đề xuất QLoRA: base 4-bit NF4, double quantization và LoRA cho q_proj/v_proj;
không cập nhật toàn bộ base. Cấu hình khởi đầu: r=8, alpha=16, dropout=0,05,
micro-batch=1, gradient accumulation=8, gradient checkpointing, packing=false,
sequence tối đa ban đầu 1.024 token, seed=42. Chọn tối đa hai ứng viên
learning rate 1e-4 hoặc 5e-5, tối đa hai epoch; chọn bằng dev có kiểm tra
false clear/báo nhầm/abstention, không chỉ loss.

Đây là **cấu hình đề xuất chưa thử**, không phải khẳng định vừa 4 GB VRAM.
Ưu tiên thử compute fp16 sau khi kiểm tra hỗ trợ, không mặc định bf16.
Cần venv riêng, ưu tiên thử Python 3.12 và khóa chính xác dependency sau khi
resolver/wheel/import được kiểm tra; không có requirements đã xác nhận ở
bước này. Không cài toàn cục hoặc dùng bản fork không rõ nguồn để lách lỗi.

Theo [PEFT](https://huggingface.co/docs/peft/developer_guides/quantization),
QLoRA dùng base lượng tử hóa với adapter và cần chuẩn bị model cho k-bit
training. Theo [TRL](https://huggingface.co/docs/trl/sft_trainer), dữ liệu
prompt-completion cho phép tính loss ở completion; phải kiểm tra token mask
thực tế: system/user/source có label=-100, chỉ assistant JSON được học.
Không mặc định một chat template bất kỳ hỗ trợ assistant mask đúng.

Không cắt ngầm mẫu quá dài để vừa token budget. Tokenizer audit phải tính
cả prompt, bảng mã, nguồn và target; nếu vượt thì tạo window/batch có đủ
directive và ngữ cảnh, giữ group, hoặc loại khỏi lượt train và ghi coverage.
Không bỏ lời dẫn “ví dụ không thực thi” vì sẽ làm đổi nhãn. Đánh giá pipeline
vẫn đọc file gốc đầy đủ để đo extraction/chunk selection, không chỉ window
được chuẩn bị thuận lợi cho model.

## Kiểm tra máy trước khi train

Đã có [inventory thực tế](../reports/kiem-tra-moi-truong-huan-luyen-verifier.md):
GPU 4 GB, khoảng 23,8 GiB RAM; ổ chứa dự án còn khoảng 7 GB. Python hiện tại
3.14.2 chưa có torch/transformers/PEFT/TRL/bitsandbytes và các thư viện dữ
liệu cần kiểm tra. Chưa có import CUDA, nạp weights hoặc backward.

Đặt ngân sách làm việc ban đầu 12 GiB trống ở nơi đặt cache/output. Đây là
ngưỡng thực hành của dự án, chưa phải yêu cầu nhà cung cấp được chứng nhận;
cần ước lượng lại theo weights, dependency, checkpoint và bước merge/export
thực tế. Không tự xóa file để đủ chỗ, chưa tải thêm weights hoặc cài thư viện.

Sau khi chuẩn bị môi trường và dữ liệu train mới, chạy smoke 10 optimizer
steps: kiểm tra đúng commit và mask, forward/backward không OOM/NaN, đo peak
VRAM/RAM/thời gian, lưu và nạp lại adapter. Không dùng 20 mẫu tham chiếu,
probe hoặc holdout làm bài học smoke. Mục tiêu smoke là xác minh kỹ thuật,
không đo khả năng khái quát hóa. Nếu không vừa tài nguyên hoặc không giữ đủ
ngữ cảnh, báo kết quả và sửa kế hoạch tài nguyên/phạm vi, không âm thầm đổi
model hoặc cắt mất bằng chứng. Chưa thể kết luận máy chắc chắn train được.

## Đánh giá trước và sau

Đầu tiên so HF base NF4 và base + adapter trên cùng backend, tokenizer,
prompt/schema/seed/nguồn để tách tác động fine-tuning. Khi triển khai Ollama,
so base và fine-tune qua cùng converter, lượng tử hóa, template và phiên
bản runtime; giữ bản Ollama hiện tại như mốc lịch sử riêng. NF4 huấn luyện
không phải Q4_K_M inference, nên phải đo lại bản deploy sau chuyển đổi.
[Ollama](https://docs.ollama.com/import) hỗ trợ nhập weights/GGUF; đường merge,
converter và kiến trúc cụ thể phải được kiểm tra rồi mới nhập tag thử nghiệm
riêng, không ghi đè model hiện dùng hoặc công bố model ra ngoài.

Báo cáo cho từng stage, source/group/ngôn ngữ/định dạng/vị trí/độ dài:

- TP/FP/TN/FN, abstention, precision, recall, F1, FPR và coverage. Recall
  tính cả tấn công bị abstain trong mẫu số; undefined là null. Ca gold
  uncertain được đo riêng về trả uncertain đúng, không ép thành nhị phân.
- JSON/schema, nhất quán logic, độ đúng từng trường và độ đúng ngữ nghĩa
  tách riêng. Citation khớp nguồn và bằng chứng có đúng hành vi cần xét cũng
  tách riêng; lỗi JSON/citation/transport không biến thành kết luận sạch.
- So từng ca trước/sau, khoảng tin cậy 95% và bất định theo nhóm nguồn.
  Tập nhỏ không đủ cho claim bảo vệ tổng quát dù đạt điểm mục tiêu.
- Latency p50/p95, peak VRAM/RAM, disk, timeout, lỗi và nguồn không được bao
  phủ. Không coi giảm loss hoặc sinh JSON đủ là cải thiện bảo mật.

Các ngưỡng kỹ thuật đề xuất, phải giữ trước khi train/test: JSON/schema
>=98%, nhất quán ngữ cảnh >=95%, confirmed attack recall >=90%, FPR <=5%,
binary coverage >=80%, trả uncertain đúng trên ca thiếu ngữ cảnh >=80%.
Không có false clear mới trên các ca legacy đã nhận ra; p95 latency không
quá 1,25 lần baseline, không OOM. Khi đo pipeline paired, FP/false clear
không tăng và coverage không giảm. Đây là tiêu chí pilot, không phải chứng
nhận an toàn hoặc suy ra FPR thực tế từ một tập có tần suất nhân tạo.

Chỉ sau dev và probe đạt mới chạy độc lập với cấu hình khóa, rồi đo pipeline
paired trên cùng file gốc. Giữ Detector/rules/policy cố định và đo extraction,
chunk coverage, prefilter, Detector, Verifier, kết luận cuối. Verifier tốt
hơn vẫn không tự bảo đảm chữa mọi ca hai model cùng không tạo nghi vấn.
Chỉ cân nhắc thay mặc định sau các bước này, không dựa vào riêng điểm Verifier.

## Công việc tiếp theo đã xác định

1. Mở rộng batch dữ liệu đầu tiên theo ontology, có cả finding thật, báo
   nhầm và batch không finding; mục tiêu 30 mẫu mới từ ít nhất 10 nhóm nguồn,
   khoảng 12 confirmed, 12 dismissed và 6 thiếu ngữ cảnh có căn cứ. Đây là
   mục tiêu gán nhãn, chưa phải 30 đáp án đúng đã có. Kiểm tra nguồn, nhóm,
   renderer/schema và nhãn thủ công trước khi mở rộng tới 300 lượt.
2. Chọn đường cache/output đủ dung lượng, chuẩn bị môi trường riêng và
   khóa dependency. Xác minh renderer dùng đúng product schema/parser,
   tokenizer/mask, không lẫn metadata hoặc mất ngữ cảnh.
3. Chạy smoke phần cứng trên mẫu train mới sau khi đủ điều kiện. Nếu đạt,
   mới thực hiện pilot train và chuỗi đánh giá ở trên.

Bước hiện tại chỉ chốt kế hoạch và kiểm tra khả năng chuẩn bị môi trường.
Chưa thu đủ dữ liệu, xuất tập train, cài thư viện, chạy fine-tuning, tạo
adapter hoặc thay model. Những phần này là công việc tiếp nối, không được
đánh dấu đã hoàn tất từ một file kế hoạch.
