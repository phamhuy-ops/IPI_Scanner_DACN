# Cổng hoàn thành Ưu tiên 1: chính sách kết luận và độ bao phủ

Ưu tiên 1 chưa hoàn thành. Đây là điểm theo dõi chính; không thay mục tiêu
bằng việc đủ số mẫu, JSON hợp lệ hoặc thêm vòng phản biện. Mỗi lần làm
xong cần ghi phần hoàn tất, phần chưa đạt, kết quả đối chiếu và bước kế.

Mục tiêu người dùng bổ sung ngày2026-10-28: hướng tới tỷ lệ đúng khoảng90%, không cần tối ưu tới100%. Tỷ lệ này dùng tất cả ca đã chọn: lỗi và needs_review ở lớp benign/malicious không bị loại khỏi mẫu số; uncertain chỉ tính đúng khi có bất định được nêu và không lỗi xử lý. Vẫn báo riêng precision/recall/F1/FPR, confusion counts và abstention; không biến tỷ lệ JSON hợp lệ thành độ đúng. Các ngưỡng thành phần/baseline bên dưới được giữ để đối chiếu lịch sử, không sửa kết quả cũ hoặc bỏ cổng thiếu coverage nhằm đạt90%.

Cập nhật ngân sách theo ý kiến người dùng ngày2026-10-28: chấp nhận khoảng30–45 giây cho một tài liệu nhiều trang nếu chất lượng tốt hơn. Với các lượt đo dài tiếp theo, đặt mục tiêu khoảng30 giây và cổng hiệu năng p95≤45 giây/tài liệu; không loại chỉ vì vượt1,25 lần baseline nếu vẫn trong ngân sách này. Trước đo phải khóa cách phân nhóm ngắn/dài bằng số trang khi có hoặc proxy ký tự/chunk được công bố, báo riêng từng nhóm và vẫn báo mức tăng so baseline. Không áp dụng ngân sách dài cho mọi mẫu TXT ngắn hoặc tự coi tài liệu hàng trăm trang đã được đọc đủ trong45 giây.

Đây là tiêu chí hiệu năng cho giao thức mới, không phải đổi timeout thực thi: request45 giây và deadline phân tích180 giây hiện tại giữ nguyên cho tới khi có thay đổi riêng được đo. Báo cáo/cổng1,25 lần đã chạy giữ nguyên; hàm chấm cũ không được tự dùng lại như thể đã hỗ trợ phân nhóm mới. Không hồi sinh ứng viên có false clear/FP mới; thời gian chấp nhận được không thay thế bằng chứng đúng và đủ coverage.

## A. Chính sách và lỗi xử lý

Từ 05/11/2026, xây và kiểm chứng ba skill được gộp vào Ưu tiên 1: người nhận, cách dùng chỉ dẫn và đối chiếu bằng chứng. Viết đủ file hoặc vượt bộ thử thành phần không đóng ưu tiên này. Chỉ nối skill vào bước tương ứng sau kiểm tra hồi quy và dữ liệu mới, rồi đo toàn pipeline có/không có skill; giữ các cổng độc lập, coverage và mục tiêu toàn bộ ca ở trên. Lỗi kỹ thuật, hai nhận định mâu thuẫn hoặc thiếu lượt xử lý không được tự đổi thành uncertain hợp lệ.

Đã triển khai ba kết luận, rule chỉ tạo nghi vấn, Verifier vòng đầu không
đọc lập luận Detector, kiểm tra schema/trích dẫn và tách lỗi kỹ thuật.
Cổng bắt buộc: không trả not_detected khi còn lỗi xử lý, nghi vấn chưa
giải quyết, phần nguồn chưa được đọc hoặc extraction không bảo đảm.
Nếu đã có IPI được hai vai trò xác nhận có bằng chứng, vẫn có thể giữ
ipi_detected kèm trạng thái lỗi/phần chưa đọc; không có nghĩa đã rà hết
tài liệu. Không nới validator hoặc giấu lỗi để đạt cổng.

## B. Chất lượng vòng Agent đầu tiên

Baseline khóa: gemma3:1b Detector, qwen2.5-coder:1.5b Verifier,
classic-v1/standard, Balanced 12 chunk, tổng 180 giây/ca và request tối đa
45 giây, không retry ngữ nghĩa/phản biện/fine-tune. Digest model, hash code,
prompt và nguồn được lưu theo lượt. Chạy 72 mẫu đã duyệt qua core sản phẩm
với file tên trung tính và định dạng gốc khi có, không truyền nhãn/metadata.

Ngưỡng kỹ thuật đề xuất cho ứng viên sau baseline, kế thừa kế hoạch pilot:
JSON/runtime hợp lệ ít nhất 98%; ngữ cảnh đúng ít nhất 95% khi hợp đồng
có trường ngữ cảnh; confirmed recall ít nhất 90%; FPR tối đa 5%; coverage
quyết định nhị phân ít nhất 80%; ca thiếu ngữ cảnh được xử lý đúng ít
nhất 80%. Không tăng false clear/FP so baseline, không OOM; latency p95
không quá 1,25 lần baseline cùng backend. Đây không phải chứng nhận an toàn.

Baseline classic không sinh framing/deviation có cấu trúc, nên metric
từng trường là chưa có, không coi là 0 hoặc đã đạt. Không tính technical
needs_review là đúng uncertain. Phải báo TP/FP/TN/FN, abstention riêng,
undefined=null, theo nguồn/nhóm/ngôn ngữ và từng tầng. Hai vai trò cùng
kết luận sai vẫn là lỗi, không coi đồng thuận là đáp án đúng.

Đạt trên dev chỉ đủ để nghiên cứu tiếp. Cần dữ liệu nguồn độc lập sau khi
khóa ứng viên và cùng pipeline; hiện chưa thu thập. Nếu chọn/sửa theo test,
bộ đó thành dev, cần holdout mới. Không chấm độc lập bằng 72 mẫu đã dùng.

## C. Độ bao phủ và tài liệu dài

Đã có chọn chunk và cảnh báo thiếu bao phủ; chưa đủ để chốt. Cần đối
chứng sạch/tấn công ở đầu, giữa, cuối tài liệu, nhiều file và khi số chunk
vượt ngân sách; phân biệt số được chọn với số hai Agent xử lý thành công.
Đo extraction, vị trí bằng chứng sau chunking, selection, hai Agent và
kết luận. Cổng bắt buộc là không trả sạch toàn tài liệu khi còn phần chưa
đọc, đồng thời hiển thị số/phạm vi chưa đọc và lý do. Không yêu cầu đọc
vô hạn; giới hạn phải rõ và không bị diễn giải thành kiểm tra hoàn chỉnh.

## D. Điều kiện chốt và thông báo

Chỉ đánh dấu toàn Ưu tiên 1 hoàn thành khi A có kiểm thử phù hợp, B có
kết quả dev và kiểm chứng độc lập đạt, C có phép đo dài/đa file đúng
pipeline và UI thể hiện đúng phạm vi. Chưa đạt thì giữ trạng thái đang
thực hiện, không thêm phản biện như một cách che lỗi vòng đầu.

Tiến độ chạy máy: `benchmark/experiments/priority-one-progress-v1/tien-do.json`.
Manifest baseline: `benchmark/data/priority-one-dev-v2.json`. Các span
nhiều câu được thu hẹp cơ học ở ba nguồn có hành động rõ; phần lớn span
toàn nguồn còn lại là câu đơn ngắn. Giữ nhãn/ngữ cảnh gốc, gắn cờ phạm vi
span; không giả danh lần duyệt ranh giới mới của người dùng.

Sau baseline: chọn một lỗi đã đo, thêm đối chứng gần giống và biến thể
chưa dùng chọn cách sửa, so trước/sau, rồi mới kiểm chứng độc lập và đo
lại pipeline. Thông báo cuối lượt phải nhắc rõ Ưu tiên 1 còn mở hay đã đạt.
