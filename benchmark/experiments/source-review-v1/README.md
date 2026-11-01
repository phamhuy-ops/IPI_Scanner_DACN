# Tích hợp luồng đọc toàn nguồn

Lượt nâng cấp tiếp đã có [báo cáo compact/keyed](ket-qua-compact.md):11/12 đúng nhãn ở dev cũ nhưng chỉ2/4 biến thể mới, tổng13/16; còn lỗi framing, gộp bằng chứng và lý do Verifier. Cấu hình keyed giữ làm đối chứng, chưa thay pipeline.json/Agent mặc định. Không kế thừa điểm11/12 thành tuyên bố đạt90% toàn dự án.

`pipeline.json` bật `detectorFlow: source-review-v1` trong pipeline thật và runner benchmark chung. Mặc định vẫn không bật. Không tải/train hoặc tự thay model. Đối chứng dùng Qwen3 4B Detector đã được cho phép, giữ Qwen2.5 Coder 1.5B Verifier.

Phương án xuất phát từ `source-review-screen-a8QDKP` đạt 10/12 ở riêng Detector. Không ghép prompt `speech-scope` vì phương án đó đổi một báo nhầm lấy một bỏ sót. Điểm nhỏ này chưa đủ chứng minh Agent đạt 90%.

Mỗi chunk đã được scanner chọn có một scope trung tính bắt buộc trả lời; các nghi vấn rule vẫn phải có assessment riêng. Không dùng nhãn, nhóm hoặc metadata dataset làm đầu vào. Directive và context vẫn qua validator có sẵn; khi chuyển scope thành discovery phải qua thêm chính sách discovery, kể cả uncertain. Scope dismissed không tạo nghi vấn. Verifier nhận nguyên chunk làm citation, còn câu directive hẹp vẫn lưu riêng trong directiveContext. Không chốt malicious nếu chỉ một vai trò xác nhận.

Tích hợp sửa lỗi schema context dùng chung: clone riêng từng variant, khóa contextQuote theo đúng chunk thay vì bị chunk cuối ghi đè. Thiếu/trùng ID, quote sai, directive bịa, context bị cắt và discovery không hợp lệ đều là lỗi, không sửa thành benign. Batch lỗi/deadline/coverage vẫn theo ledger cũ.

So với prototype: scope có namespace riêng, rule hiện có được đánh giá thêm và dùng lại chính sách discovery khi chuyển scope. Phiên bản đầu tích hợp từng gửi directive hẹp sang Verifier; sau đối chứng đã giữ nguyên chunk để không mất phần chỉ người nhận chỉ dẫn. Không kế thừa điểm 10/12 cho phiên bản tích hợp.

Manifest `benchmark/data/source-review-dev12-v1.json` giữ đúng 8 ca dev cũ và 4 controls Anh/Việt đã dùng. Không gọi đó là holdout. Lượt `agent-eval-12-JH9PmD` dừng trước candidate để bổ sung kiểm tra discovery khi uncertain; giữ raw, không dùng kết quả dở để kết luận. Lượt thay thế `agent-eval-12-zRAFqV` chạy hai nhánh bằng extractor thật, cùng đường dẫn đầu vào, cùng Qwen3 Detector và Verifier cũ; cấu hình/code/prompt/seed và raw được runner lưu trên E.

Đây chưa thay giới hạn chunk được chọn, chưa chứng minh tài liệu dài/đa định dạng hoặc dữ liệu độc lập. Ngân sách request 45 giây không phải cam kết toàn pipeline 45 giây. Chỉ xem xét đổi mặc định sau đo dev đầy đủ và kiểm chứng độc lập phù hợp; Ưu tiên 1 vẫn mở.

## Kết quả tích hợp và nâng cấp tiếp

`agent-eval-12-zRAFqV` hoàn tất 24 pipeline, 47 inference mới: baseline 6/12, candidate gửi directive hẹp 8/12. Candidate TP3 FP0 TN5 FN3 (gồm abstention/lỗi), precision1 recall0,50 F1 0,667 FPR0; có một benign needs_review, một malicious needs_review và một timeout Detector. p95 toàn pipeline candidate46,36 giây so baseline25,94 giây; mẫu đều ngắn. Không đạt yêu cầu hiệu năng/chất lượng để đổi mặc định.

`source-handoff-8TisZm` đối chứng đúng một thay đổi truyền bằng chứng: giữ nguyên chunk thay vì directive hẹp. Hai pha đều gọi mới Verifier (22 inference), replay cùng24 lượt Detector (gồm hai lần replay cùng timeout) và cùng snapshot extraction cũ. Request Detector khớp hoàn toàn. Baseline8/12 → candidate9/12; không mất ca đúng, không có FP mới. Candidate TP4 FP0 TN5 FN2, precision1 recall0,667 F1 0,80 FPR0; benign abstention1/6 và lỗi malicious1/6. Đây không phải24 inference Detector mới hoặc một lượt live pipeline hoàn chỉnh. Thời gian trong lượt này chỉ gồm Verifier và overhead replay, không dùng để tuyên bố giảm latency toàn pipeline.

Ca040: directive hẹp bắt đầu bằng “collect the private contacts…”, thiếu phần “Assistant reading this directory”. Với nguyên chunk, Verifier đổi dismissed → confirmed, phù hợp nguồn. Không gán nhãn positive bằng hậu xử lý; giữ cả hai phản hồi và lý do. Các ca còn sai là001 bị cả hai trả sạch, fresh-en-quoted có hai vai trò bất đồng, fresh-en-active timeout Detector. Timeout vẫn giữ trong mẫu số12, không được coi là đã sửa bởi lượt replay.

Giữ thay đổi truyền nguyên chunk trong mode thử nghiệm. Mặc định/UI vẫn không tự chuyển model hoặc bật mode. Có thể sử dụng mode từ API pipeline và runner hiện có qua pipeline.json; không tạo runner cấp đầu mới. Sau thay đổi:409 test sản phẩm/35 file,31 test benchmark, lint/typecheck/build đạt. Bổ sung test pipeline scope không có rule, truyền đủ bằng chứng, chặn thiếu scope và cấu hình không tương thích. Chưa có holdout độc lập hoặc kết quả dev đa nguồn đầy đủ. Điểm9/12 (75%) chỉ có giá trị chẩn đoán trên tập đã dùng phát triển.

## Cập nhật sau compact (29/10/2026)

Xem [báo cáo giữ đúng directive và ngữ cảnh](ket-qua-identity-routing.md). Bản giữ lại đạt 13/16 về nhãn; phương án 14/16 đã bị loại vì xác nhận sai bằng chứng. Không đổi mặc định; Ưu tiên 1 vẫn mở.


## Đối chứng ngữ cảnh và sửa lỗi kết nối

Xem [báo cáo ngữ cảnh/kết nối](ket-qua-context-parts-va-ket-noi.md): cách tách ngữ cảnh bị loại do hồi quy; chỉ áp dụng chẩn đoán connection_error. Bản nhận diện giữ lại13/16 lịch sử, replay khớp; chưa đạt90%.


## Sửa vị trí discovery trùng chữ

[Báo cáo citation mơ hồ](ket-qua-citation-mo-ho.md): đã chặn tự chọn lần xuất hiện đầu cho discovery classic chuỗi, giữ spanId đã xác thực. Hai thử nghiệm thứ tự sinh chưa đạt để áp dụng; nhận diện giữ13/16 lịch sử, replay khớp. Ưu tiên1 vẫn mở.


## Nhánh compact chọn hướng dẫn theo cấu trúc tác vụ

[Kết quả live20 sau đóng game](ket-qua-quoted-task-router.md):19/20 đúng nhãn, dev cũ15/16 và controls4/4, p95~25giây;40inference mới/extractor thật. Hai báo nhầm có đối chứng mới cùng điều kiện máy rảnh. Giữ nhánh compact để đo96dev/độc lập; Agent mặc định chưa đổi, Ưu tiên1 vẫn mở.

