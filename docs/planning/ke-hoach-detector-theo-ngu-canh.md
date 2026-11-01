# Detector theo ngữ cảnh: đặc tả và một pilot

Cập nhật 2026-10-27. **Đã chốt thiết kế và audit nguồn; chưa tạo tập train, chưa train/gọi model/tải thêm. Ưu tiên 1 vẫn mở.**

## Quyết định

Thử một classifier đọc cặp nhiệm vụ của Agent đích và tài liệu không tin cậy. Không dùng yêu cầu “scan file tìm IPI” của scanner làm nhiệm vụ đích thay thế. Không thể khẳng định thiếu task là nguyên nhân duy nhất của những lượt thất bại trước.

Đầu vào model chỉ có trustedTask.text và document window, encode bằng API pair của tokenizer. Nguồn/nhóm/nhãn/finding/lời giải ở ngoài model. Task đến từ người dùng trong kênh tin cậy hoặc trường dataset đã đối chiếu snapshot. Marker origin không tự xác thực được nguồn; khi tích hợp, main/UI phải sở hữu ranh giới này.

Thiếu task → needs_context trước inference, không thành benign hoặc nhãn loss uncertain. Lời “người dùng đã đồng ý” bên trong document không tạo quyền. Lệch chủ đề không đủ chứng minh IPI; task có vẻ hợp với source cũng chưa chứng minh an toàn hoặc được phép vượt system/developer policy.

## Đầu ra và giới hạn

Ba lớp: benign (không thấy IPI hoạt động), ipi (directive đang tác động vào AI và yêu cầu deviation), uncertain (đã có task nhưng nguồn chưa đủ người nhận/bao khung/tham chiếu). Tách uncertainty ngữ nghĩa khỏi task thiếu, lỗi, coverage và abstention do margin thấp. IPI chỉ tạo ứng viên, không tự thành verdict cuối.

Chưa triển khai worker protocol ba lớp hoặc UI task. Mặc định hiện tại không đổi; protocol classifier v1 hai lớp phải được giữ tương thích, không tự sửa model cũ. Cần phiên bản v2 riêng nếu pilot đủ điều kiện.

## Phép thử duy nhất

Tái sử dụng weights PIGuard đã có trên E, commit dd78b24e330193a22d2293ac66922dd4f982f563; không tìm/tải model khác. Encoder frozen/eval/no gradients. Chỉ học Linear 768→3 (2.307 tham số), warm-start benign/IPI từ head gốc, hàng uncertain zero-init, seed42. Đây là linear probe của biểu diễn paired, không phải bằng chứng backbone học được kỹ năng mới.

Một run, CPU4 threads; tối đa5 epoch/100 optimizer steps, batch16, AdamW lr0.001/weight_decay0.01, clip1. Chỉ checkpoint cuối; không sweep, chọn lại epoch, mở backbone/LoRA hoặc retry để cứu kết quả. Trần15 phút/3GiB RAM; quá trần hoặc NaN/lỗi/leakage thì dừng. Cache features/checkpoint/safetensors trên E. **Các thông số là kế hoạch, chưa có lượt train.**

So sánh trên cùng doc windows: A checkpoint binary source-only; B checkpoint binary paired không train; C encoder paired + head3 sau đúng một run. A/B không có lớp uncertain, phải ghi không hỗ trợ thay vì giả accuracy. C đổi head và học thêm nên không thể quy mọi khác biệt riêng cho việc thêm task.

Task giữ nguyên tối đa128 token; pair tối đa512 gồm special tokens. Chia document theo ngân sách còn lại, overlap32 và tối đa16 windows/nguồn; vượt thì báo coverage, không truncation ngầm. Dev/probe chọn windows không dựa gold. Nhãn IPI của cả nguồn không được copy sang mọi cửa sổ train: directive và bao khung từng cửa sổ phải được rà.

## Dữ liệu và cổng trước train

Trần192 train +48 dev +48 probe, không ép đủ trần. Tối thiểu train96 cặp/32 mỗi lớp/16 nhóm, dev và probe mỗi phần36 cặp/12 mỗi lớp/8 nhóm. Đơn vị là paired example/window đã duyệt, giữ parent/group nguồn. Mọi biến thể cùng tài liệu, task/template và near duplicates phải giữ chung nhóm, rà với toàn kho cũ. Tập probe mới không tự thành final holdout độc lập nếu cùng người thiết kế/nguồn hoặc đã được xem để sửa.

Không lấy 66/52 mẫu classifier, các dev/probe Verifier trước, mẫu never_use_for_training hay 9 reference mới làm train. Không tự biến raw test_cases thành train; phải duyệt provenance, quyền reuse và mất tính độc lập. Một đợt rà dữ liệu có giới hạn phải đạt phase0 trước khi xin train.

Audit hiện tại: 2.108 hàng InjecAgent qua4 file có User Instruction và Tool Response, nhiều biến thể chia sẻ nhiệm vụ; không phải 2.108 nguồn độc lập. LLMail có4 scenario với user_query; task là mục tiêu attacker, subset48 email chưa có mapping scenario được xác minh. Mẫu BIPIA-GPT đã kiểm có user_intent hỏi tay đua nhưng context PHP và nhãn benign; không được suy nhãn từ mismatch. 360 biểu diễn train Verifier cũ chưa có hợp đồng paired mới. **Chưa có tập nào được xác nhận train-ready.**

Cổng dev/probe: IPI recall≥80%, benign FPR≤5%, uncertain semantic recall≥75%, benign decision coverage≥75%; không ca benign đúng cũ thành báo nhầm hoặc IPI đúng cũ thành benign. Lỗi/coverage thiếu tách riêng; p95≤2× B, RAM≤3GiB. Margin abstention cố định0,1, không chọn lại threshold trên probe. Trượt dev không mở probe; trượt probe đóng pilot, không sửa rồi dùng lại probe đó như chưa đụng tới.

Qua pilot vẫn cần holdout độc lập và toàn pipeline dài/đa định dạng trước triển khai. Đợt thiết kế này English-first theo hướng hiện tại, không kết luận hỗ trợ tiếng Việt hoặc bỏ yêu cầu đa ngôn ngữ của toàn dự án.

## Phần đã xong và bước kế

Rà tiếp ngày 2026-10-28 đã phát hiện lô paired đầu tiên cùng nhóm `injecagent-attack-ab5c6815eb9e74ed` với dữ liệu train Verifier cũ. Quyết định giữ toàn lô chỉ cho chẩn đoán, không phát hành vào train/dev/probe pilot mới. Audit kiểm kê 431 file, trích 69.271 văn bản chuẩn hóa khác nhau; không lỗi parse, đầu vào không đổi. Đây là lexical audit có phạm vi, chưa chứng minh hết rò rỉ. Có ba test extractor audit đạt. Bước kế chuyển sang kiểm kê nhóm/task/template còn lại trước chọn lô mới; không train hoặc tăng biến thể lô đã loại. Xem [quyết định](../../benchmark/experiments/context-paired-review-v1/quyet-dinh-ra-soat.json).

Ngày 2026-10-28 đã thực hiện lô rà nhỏ đầu tiên: 14 hàng từ hai bối cảnh InjecAgent, giữ chung một nhóm attack/template; 2 IPI/6 benign/4 uncertain nhãn AI và 2 thiếu task. Hash nguồn/task/span và route thiếu ngữ cảnh đạt, 7 test hợp đồng đạt. Không đủ phase0: chưa duyệt độc lập, chưa audit overlap toàn kho hoặc đạt số nhóm/split. Không train/gọi model, không coi lô này là holdout. Chi tiết: [phiếu rà](../../benchmark/experiments/context-paired-review-v1/phieu-ra-soat.md). Bước kế là duyệt ngữ nghĩa và audit nhóm được bảo vệ, không tự tăng mẫu hoặc mở train.

Đã có contract validator, 7 test bảo vệ nguồn/task/split/span, audit nguồn và9 reference nhãn AI-draft, tất cả reference bị cấm train. Chi tiết tại benchmark/experiments/context-aware-detector-design-v1: kiem-ke-du-lieu.json, ke-hoach-pilot.json, mau-tham-chieu.jsonl.

Chưa có trainer v2, tập train đủ điều kiện hoặc quyền train. Bước kế là rà đúng một lô nhỏ cặp task/document/span theo hợp đồng, có sạch/human/quoted/irrelevant/thiếu bằng chứng, giữ nhóm gốc; không sinh dữ liệu hàng loạt để ép đạt số mẫu. Nếu không đạt phase0 thì báo thiếu cụ thể và dừng trước train. Không nối thêm thử prompt hoặc đổi model.
