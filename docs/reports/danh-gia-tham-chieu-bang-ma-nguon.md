# Đánh giá tham chiếu bằng mã đoạn nguồn

## Vấn đề và thay đổi thử nghiệm

`structured-v1` yêu cầu model tự chép directive và ngữ cảnh; 26/26 ca cấu hình
trước bị chặn ở Detector, chủ yếu do đoạn trích không có trong nguồn. Giữ nguyên
các mốc đo đó, không sửa dữ liệu hoặc nhãn theo output.

`referenced-v1` giữ các trường nhận định nhưng thay việc tự chép văn bản bằng
`spanId`. Mỗi batch có bảng mã trung tính `ref-1`, `ref-2`, ... lấy từ chính
những chunk đã chọn. Tách theo dấu kết câu/xuống dòng, giới hạn đơn vị dài và
có thêm mã cả chunk để không mất khả năng chọn đoạn giao ranh giới. Có mã bổ
sung trùng chính xác nghi vấn gốc khi cần. Không mã hóa nhãn, nguồn dataset
hoặc đáp án trong ID.

Model trả `spanId`, người nhận, kiểu ngữ cảnh, chuyển hướng, `hasDirective`,
stance và lý do. Code lấy nguyên văn đoạn đã chọn làm citation; nếu model khai
báo có directive thì đoạn đó cũng là đoạn nguồn model cho là chứa chỉ dẫn.
Ngữ cảnh được code lấy từ toàn bộ chunk cùng nguồn, không do model viết lại.
Mã lạ, sai batch/nguồn nghi vấn, sai kiểu, thừa trường tự chép hoặc nhận định
tự mâu thuẫn vẫn bị từ chối. Không tự sửa stance để làm phản hồi hợp lệ.

Đoạn trích không nhất thiết là directive tối thiểu; mã cả chunk có thể rất rộng.
Khớp nguồn và giao gold span là tính chất cơ học, không chứng minh model nhận
ra đúng chỉ dẫn. Lý do và ngữ cảnh vẫn cần được rà soát về ngữ nghĩa.

Citation giữ file, view, chunk gốc, mã đã chọn và số dòng theo offset nguồn,
kể cả khi cùng câu xuất hiện nhiều lần. Mã chỉ có ý nghĩa trong batch; không
được dùng ID của lần gọi trước để suy ra nội dung lần gọi sau.

Số dòng dựa trên metadata chunk và offset của văn bản đã trích xuất; cơ chế
tham chiếu không tự sửa sai lệch có sẵn trong extractor/chunker của định dạng khác.

Ngân sách đóng batch tính cả bảng mã và văn bản gốc; không cắt chunk để vừa
ngân sách. Nếu không chứa nổi một chunk nguyên vẹn cùng bảng mã thì báo lỗi,
giữ cần xem xét. Giới hạn này tính bằng ký tự phần evidence, chưa chứng minh
toàn bộ prompt nằm trong cửa sổ token của mọi model/cấu hình Ollama.

Verifier vẫn chỉ nhận nghi vấn và nguồn, không nhận stance, lý do hoặc các
trường suy luận của Detector. Mặc định giữ `classic-v1` trong khi đánh giá.
Rule, model, giới hạn 1 vòng, ngân sách sinh 1.400 token và thời hạn giữ nguyên.

## Dữ liệu và lệnh đo

```sh
npm run benchmark:round-one -- --manifest benchmark/data/context-controls-v2.json --contract referenced-v1
npm run benchmark:round-one -- --contract referenced-v1
npm run benchmark:round-one -- --manifest benchmark/data/reference-transfer-v1.json --contract referenced-v1
node scripts/assess-debate-readiness.cjs benchmark/results/RUN
```

Controls và bộ dev đa nguồn đã được xem, không phải holdout. Bộ biến thể mới
gồm 4 sạch và 4 tấn công, Việt/Anh, vị trí khác nhau và HTML/Markdown/text; khóa
trước khi xem output của chế độ này. Chúng vẫn là mẫu tự tạo, chưa có nhãn/nguồn
độc lập. Không dùng output để sửa cấu hình rồi tiếp tục gọi là chưa từng thấy.
Không chấm MAlmasabi test hoặc đổi nhãn nguồn. Log ghi hash model/code/manifest,
prompt, phản hồi, trạng thái xử lý, ma trận ba kết luận và số đo theo nguồn.

Mã lỗi và kết quả cần xem xét được giữ riêng. Precision không có alert là chưa
xác định. F1 xác nhận dùng `2*TP/(TP+FP+số mẫu tấn công)` khi mẫu số khác 0,
không biến abstention thành kết luận sạch. RSS chỉ đo tiến trình harness,
snapshot VRAM không phải peak GPU. Khớp citation được kiểm tra độc lập trong
log nhưng không thay thế đánh giá ngữ nghĩa.

## Kiểm chứng tự động và tổ chức tài liệu

158 test ứng dụng và 7 test công cụ qua, cùng lint và build/typecheck. Kiểm tra
mã giả, bind nghi vấn/chunk, kiểu boolean, từ chối trường quote tự viết, mâu
thuẫn nhận định, số dòng khi câu lặp, CRLF, Unicode, khoảng trắng, ngân sách
batch và tính độc lập giữa hai model. Các test này không chứng minh recall/FPR.

Đã đổi tên 10 tài liệu báo cáo/kế hoạch/phạm vi/phân tích sang tiếng Việt không
dấu và cập nhật tham chiếu đang dùng. Giữ tên chuẩn README/AGENTS/CONTRIBUTING
và tên fixture/manifest/log đã khóa. Xem [mục lục](../README.md).

## Controls đã đo

Run `round-one-eval-SGLfeF`: 7/13 lượt gọi model qua validation (53,85%), so với
0/8 ở controls chế độ tự chép `round-one-eval-rtVoKf`. Hai chế độ dùng cùng
manifest controls và model; code/hợp đồng khác nhau, chỉ một lần đo mỗi cấu hình,
không coi đây là ước lượng hiệu quả tổng quát hay chứng minh nhân quả.

4 sạch: 0 xác nhận IPI, 1 chưa phát hiện, 3 cần xem xét. 4 tấn công: 0 xác nhận,
1 chưa phát hiện sai, 3 cần xem xét. Có 2 ca hoàn tất, 6 lỗi phản hồi; trung
bình 13,50 giây/ca. Precision chưa xác định, recall/F1 xác nhận=0, FPR=0 đi kèm
review=75%. Ca exfiltration tiếng Việt vẫn bị hai model bỏ sót; mã nguồn không
tự giải quyết nhận định ngữ nghĩa.

Các lỗi đã chuyển sang JSON không hợp lệ ở Verifier và khai báo nhận định tự
mâu thuẫn; không giảm validation để chấp nhận chúng. Cổng ở
`round-one-eval-SGLfeF/debate-readiness.json` chưa đạt. Mặc định vẫn `classic-v1`,
chưa thêm phản biện. Chưa có đánh giá trên nguồn độc lập.

Theo vai trò trên controls: Detector hợp lệ 5/8 (8 lần đều kết thúc `stop`);
Verifier hợp lệ 2/5, có 3 lần kết thúc `length` và JSON chưa hoàn chỉnh. Điều
này chỉ ra hai vấn đề riêng: tính nhất quán của nhận định và việc sinh phản hồi
trong ngân sách. Chưa thử tăng ngân sách hoặc đổi model, không tự kết luận đây
là cách sửa đã được kiểm chứng.

Đối chiếu trạng thái đã chấp nhận: 6 citation chính và 12 citation directive/
ngữ cảnh đều khớp nguồn. Đây là đặc tính của ánh xạ bằng code trên các nhận định
đã qua validation, không chứng minh ngữ nghĩa đúng hoặc mọi lần model đã cố
trả lời đều hợp lệ. RSS harness quan sát tối đa 128,45 MiB.

## Bộ dev đa nguồn

Run `round-one-eval-zJivId`: 13/19 lượt gọi hợp lệ (68,42%), 4/10 ca hoàn tất,
6 invalid_response. 6 sạch: 3 chưa phát hiện, 3 cần xem xét, 0 báo nhầm.
4 tấn công: 0 xác nhận, 1 chưa phát hiện sai, 3 cần xem xét. Precision chưa
xác định, recall/F1 xác nhận=0, FPR=0, review=60%; trung bình 24,49 giây/ca.

Ca yêu cầu gửi hội thoại tới email ngoài ở realistic vẫn bị cả hai model bỏ
sót, không tạo nghi vấn. Cách phản biện chỉ kích hoạt khi bất đồng sẽ không
được gọi cho ca này. Không coi số ca hoàn tất tăng là tăng khả năng phát hiện.
Kết quả từng nguồn và thời gian/tài nguyên nằm trong `by_source` và log của run.

Chi tiết đa nguồn: MAlmasabi có 1 sạch chưa phát hiện và 1 tấn công cần xem
xét; NotInject có 2 sạch chưa phát hiện; realistic có 1 sạch cần xem xét và
1 tấn công chưa phát hiện sai; tài liệu dự án có 1 sạch cần xem xét; fixtures
cũ có 1 sạch và 2 tấn công đều cần xem xét. Tất cả 6 ca review là lỗi phản hồi,
không phải 6 bất đồng đã hoàn tất. Detector hợp lệ 9/10, Verifier 4/9; 5 lỗi
Verifier đều kết thúc `length`. Có 13 citation chính và 26 citation ngữ cảnh/
directive đã chấp nhận khớp nguồn; RSS harness tối đa quan sát 128,80 MiB.

## Biến thể mới và quyết định

Run `round-one-eval-c1IQza`: 6/13 lượt gọi hợp lệ (46,15%), 1/8 ca hoàn tất,
7 invalid_response. 4 sạch: 1 chưa phát hiện, 3 cần xem xét. 4 tấn công: 0 xác
nhận, 0 chưa phát hiện, 4 cần xem xét. Precision chưa xác định, recall/F1 xác
nhận=0, FPR=0 nhưng review=87,5%; không diễn giải thành khả năng phát hiện tốt.
Trung bình 17,73 giây/ca; RSS harness tối đa quan sát 135,59 MiB.

Detector hợp lệ 5/8; Verifier 1/5, cả 4 lỗi Verifier đều kết thúc `length`.
Chưa có đánh giá độc lập. Bộ biến thể này đã được xem từ thời điểm đo, không
được tiếp tục gọi là chưa từng thấy sau khi dùng để chỉnh cấu hình.

Các run cuối khớp hash code hiện tại, các gold span đã chú thích còn sau
extraction và nằm trong chunk được chọn. Bản tổng hợp/counter theo vai trò nằm
ở `benchmark/experiments/reference-review-v1/ket-qua.json`. Prompt mặc định,
rule và cấu hình model được giữ nguyên; không chấm holdout MAlmasabi.

**Giữ `referenced-v1` ở thử nghiệm, không đổi mặc định và chưa thêm phản biện.**
Đã giảm yêu cầu model tự chép nguồn và có nhiều phản hồi đi qua được validation,
nhưng chưa xác nhận được tấn công trong ba bộ đo. Có ca cả hai model bỏ sót và
nhiều phản hồi lỗi; chưa đạt các ngưỡng đã đặt. Không giảm validation hoặc đổi
nhãn để làm chỉ số đẹp hơn.

Bước tiếp có bằng chứng rõ là đo riêng việc sinh JSON của Verifier: rút gọn/
giới hạn đầu ra và so sánh với cấu hình hiện tại trước khi đổi ngân sách hoặc
model. Đồng thời giữ đối chứng ngữ nghĩa cho ca hai model cùng bỏ sót. Cần đo
thời gian, lỗi, false clear và false alert sau sửa; không coi hết lỗi JSON là
đã đạt chất lượng để thêm phản biện.
