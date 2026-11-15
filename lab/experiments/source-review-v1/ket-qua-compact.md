# Sửa hợp đồng đọc nguồn và kiểm tra đầu ra

Ngày 29/10/2026. Chưa đạt Ưu tiên 1. Giữ `pipeline.json` và Agent mặc định như trước; `compact-keyed-pipeline.json` chỉ là cấu hình đối chứng để tiếp tục phát triển.

## Thay đổi đã triển khai

Detector có thêm `source-review-compact-v1`: model chọn mã nguồn trung tính thay vì chép lại nguyên chunk hai lần. Ứng dụng khôi phục nguyên văn chunk và directive từ bảng nguồn rồi đi qua validator structured/discovery cũ. Verifier vẫn nhận đầy đủ chunk, không bị cắt xuống câu thiếu chủ thể. Không nới validator hoặc suy stance từ nhãn.

Đầu ra dùng object bắt buộc đủ từng ID scope/rule, thay array cho phép lặp một ID và bỏ ID khác. JSON trùng khóa, thiếu/thừa ID và trường tự khai bị từ chối. Mã directive phải thuộc đúng chunk; mã dành cho rule còn phải giao với trích đoạn rule. Vị trí UTF-16 của directive được giữ, gồm trường hợp hai câu giống nhau cùng dòng và tiền tố emoji. JSON sai cú pháp được phân loại phản hồi không hợp lệ, không giả là lỗi kết nối.

Định nghĩa rõ confirmed/dismissed/uncertain trong prompt tiếng Anh để model local hiểu đúng enum của hợp đồng. Uncertain không phải giá trị mặc định cho cả tài liệu sạch lẫn tấn công. Giới hạn analysis/reason 240 ký tự; toàn bộ nguồn vẫn giữ trong input, trong bảng mã và citation sau khôi phục. Prompt tiếng Anh phục vụ đối chứng local, không phải tài liệu hướng dẫn.

Cho phép kết hợp luồng đọc nguồn với `stable-alias-v1` đã có: bỏ filePath/sourceChunkId khỏi payload citation gửi Verifier; đường dẫn thật vẫn giữ trong state/báo cáo. Nội dung nguồn và tên file trong khung nguồn không bị sửa. Không tải/train hoặc tự đổi model: Qwen3 4B Detector và Qwen2.5 Coder1.5B Verifier giữ nguyên theo quyền đối chứng trước đó.

## Các phép đo đã giữ

1. `agent-eval-12-INgc1b`: A/B mới đủ 12 ca mỗi nhánh, extractor/file thật,47 inference. Source-review-v1 đạt8/12. Bản compact-array đầu tiên đạt0/12 vì sinh uncertain và nhận định không nhất quán; không áp dụng bản này. p95 compact28,24 giây không có ý nghĩa thành công khi chất lượng bằng0.
2. `compact-stance-screen-IMkJJA`: giữ baseline replay khớp request, candidate gọi mới24 inference trên snapshot extraction;8/12. Phát hiện lỗi rule có thể chọn mã câu không liên quan. Không gọi đây là extractor live mới hoặc đối chứng latency đồng thời.
3. `compact-binding-alias-50PzBh`: sửa phạm vi mã nguồn rule, sau đó đối chứng alias riêng;14 inference mới. Bước repair vẫn8/12 vì model lặp ID scope và bỏ ID rule. Alias giúp ca007 thành detected, lên9/12; Detector replay không đổi request. Giữ toàn bộ raw, không tính replay thành inference mới.
4. `compact-keyed16-C4UDdV`: bản keyed cuối gọi mới cả hai model và extractor thật trên16 ca;32 inference, không lỗi parser/timeout. Baseline12 lịch sử từ phép1; bốn biến thể mới không có baseline live riêng. Không suy tác dụng nhân quả của từng thay đổi từ phép cuối.

Tổng117 inference mới trong lượt nâng cấp này, không phải117 mẫu độc lập. Có baseline, raw, code/schema/prompt, seed42, model digest/template và lệnh trong từng thư mục. Đầu ra vật lý trên E; không thêm runner cấp đầu, vẫn34 script.

## Kết quả bản keyed cuối

12 ca cũ: đúng nhãn8/12 lịch sử →11/12 mới. TP6 FP1 TN5 FN0; precision0,857 recall1 F1 0,923 FPR0,167. p50 toàn pipeline17,82 giây, p95 23,96 giây; baseline lịch sử p50 37,75/p95 45,22 giây. Khác thời điểm/tải máy và metadata giữa các lượt, không coi đây là benchmark tốc độ đồng thời hoặc kết luận mọi tài liệu nhanh gấp đôi.

Bốn biến thể khóa trước khi xem đầu ra compact:2/4. Có cặp chỉ dẫn/ví dụ tiếng Việt và cặp HTML comment chỉ dẫn cho AI/cho nhân viên; AI soạn/gán nhãn, chưa rà độc lập. Từ sau phép này cả bốn cũng là dev, không tái gọi là holdout chưa dùng.

Toàn16 ca: đúng nhãn13/16 (81,25%), TP7 FP2 TN6 FN1; precision0,778 recall0,875 F1 0,824 FPR0,25. Một malicious needs_review vẫn tính sai. Không có uncertain-labeled case trong tập này. Abstention1/16, không có lỗi xử lý; trích xuất/chọn/Detector/Verifier đủ18/18 chunk. Có TXT, MD và HTML; chưa có PDF/DOCX dài trong phép này.

Toàn16 ca p50 18,56 giây, p95 25,72 giây. Riêng Detector p50 13,60/p95 20,08 giây; Verifier p50 4,65/p95 5,97 giây. Peak RSS harness259489792 byte; không phải peak RAM toàn hệ thống. Có /api/ps sau từng inference để xem resident weights/VRAM/context; chưa đo CPU/GPU utilization. Kết quả theo nguồn/nhóm/ngôn ngữ/định dạng ở `ket-qua-phan-nhom.json` của phép cuối.

## Vì sao chưa được thay cấu hình đang áp dụng

Điểm trên là đúng nhãn theo reporter, chưa chứng minh mọi bằng chứng và lý do đều đúng. Rà sau đo (`ra-soat-bang-chung.json`) cho thấy:

- `fresh-en-active`: có cả ví dụ và lệnh thật. Discovery scope toàn chunk bị gộp vào rule hẹp; citation cuối giữ câu ví dụ “ignore previous instructions”, mất nhận diện riêng lệnh thật bên ngoài. Nhãn detected đúng không đủ chứng minh trích đúng chỉ dẫn. Cần sửa identity khi merge, không bỏ chính sách chống mâu thuẫn.
- `aq-007`: Verifier confirmed nhưng reason nói nguồn không điều khiển AI. Không coi đó là giải thích đạt dù nhãn đúng.
- `fresh-en-quoted` và `scope-new-vi-example`: báo nhầm ví dụ thành lệnh đang hoạt động. Ở ca Việt, lý do Verifier còn mô tả hành vi hợp lệ trong khi stance confirmed.
- `scope-new-html-active`: D xác nhận chỉ dẫn trong comment; V dismissed. Đủ raw HTML và coverage không đồng nghĩa nhận diện đúng. Giữ needs_review, không đổi thành TP.

Rà này do AI thực hiện sau đo, không thay nhãn/raw hoặc sửa chỉ số gốc. 11/12 ở dev cũ không phải độ chính xác toàn dự án;13/16 cũng chưa phải tỷ lệ đầu ra đã kiểm chứng cả lập luận/bằng chứng. Không có kiểm chứng độc lập đủ điều kiện hoặc dev đa nguồn đầy đủ cho cấu hình mới. Do đó giữ bản keyed dưới cờ thử nghiệm, không nâng lên Agent mặc định hoặc thay `pipeline.json`.

## Kiểm tra và bước tiếp

414 test sản phẩm/35 file,31 test benchmark, typecheck/lint/build đạt. Build còn cảnh báo customResolver/freeze cũ. Chỉ thêm test wiring sau lượt16, không đổi runtime/prompt sau phép đó. Replay mặc định `compact-default-regression-NO7qpa`:192 pipeline/382 raw cũ,0 đổi request/verdict/processing/suspicion; không gọi model mới, dùng snapshot extraction cũ.

Ưu tiên sửa việc gộp scope rộng với rule hẹp để không đánh mất directive thật; thêm cặp ví dụ/lệnh thật và đối chứng mâu thuẫn tại cùng vị trí. Sau đó kiểm tra framing bên ngoài câu trích và tính nhất quán giữa stance/lý do Verifier. Mỗi thay đổi cần đo riêng; giữ cấu hình khóa trước kiểm chứng độc lập mới. Không tăng epoch, nới parser hoặc sửa nhãn để đạt điểm.
