# Nhận định directive có cấu trúc

## Vấn đề đã quan sát

Model có thể trả stance xác nhận nhưng lý do nói nội dung lành tính, hoặc coi
kế hoạch của con người/ví dụ đào tạo là yêu cầu đang điều khiển AI. Trích dẫn
khớp nguồn không chứng minh cách hiểu của model đúng. Lần sửa prompt ngữ cảnh
trước đã bị loại vì tăng báo nhầm; giữ nguyên baseline và số liệu cũ.

## Hợp đồng thử nghiệm

`classic-v1` vẫn là mặc định. `structured-v1` bổ sung `directiveContext` cho
mỗi nhận định của Detector và Verifier, gồm:

- `addressee`: người nhận chỉ dẫn là AI, con người, không có hoặc chưa rõ.
- `framing`: chỉ dẫn đang có hiệu lực, ví dụ được trích dẫn, mô tả hoặc chưa rõ.
- `deviation`: thao túng câu trả lời, đổi nhiệm vụ, tiết lộ dữ liệu, lạm dụng
  công cụ, không có hoặc chưa rõ.
- `directive`: đoạn chỉ dẫn nguyên văn hoặc null nếu không có.
- `contextQuote`: đoạn ngữ cảnh liên tục, chứa cả directive và đoạn nghi vấn.

Các đoạn đều phải khớp cùng chunk nguồn. Directive phải giao với đoạn nghi vấn;
ngữ cảnh phải chứa cả hai. Ánh xạ khác biệt khoảng trắng dùng cơ chế hiện có;
không sửa chữ/dấu/thêm lời giải thích. Lưu citation và số dòng riêng cho cả
directive và ngữ cảnh để đối chiếu.

Chỉ chấp nhận stance xác nhận khi model khai báo người nhận là AI, framing
active, chuyển hướng cụ thể và có directive. Không chấp nhận bác bỏ nhưng đồng
thời khai báo đầy đủ các điều kiện đó. Discovery không được là nội dung mô tả,
ví dụ được trích dẫn hoặc chỉ dẫn cho con người. Phản hồi thiếu/sai/mâu thuẫn
bị từ chối, giữ lỗi xử lý và cần xem xét; không tự đổi stance bằng regex.

Đây là kiểm tra nhất quán theo trường dữ liệu, **không phải bộ chứng minh ngữ
nghĩa**. Model vẫn có thể khai báo các enum nhất quán nhưng hiểu sai văn bản.
Không tự kết luận người dùng muốn nhiệm vụ gì nếu đầu vào không cung cấp intent.

Verifier vòng đầu chỉ nhận nghi vấn và nguồn, không nhận lý do/stance hoặc cấu
trúc suy luận của Detector. Chính sách ba kết luận, giới hạn thời gian, rule,
model, ngân sách sinh và số vòng giữ nguyên. Chưa thêm phản biện.

Giao diện có phần xem nhận định directive bằng tiếng Việt nếu kết quả có dữ
liệu này; hiển thị rõ khớp nguồn chưa chứng minh nhận định đúng. Chưa thêm nút
bật thử nghiệm cho luồng sử dụng thông thường.

## Cách đo

```sh
npm run benchmark:round-one -- --manifest benchmark/data/context-controls-v2.json --contract classic-v1
npm run benchmark:round-one -- --manifest benchmark/data/context-controls-v2.json --contract structured-v1
npm run benchmark:round-one -- --contract structured-v1
npm run benchmark:round-one -- --manifest benchmark/data/structured-transfer-v1.json --contract structured-v1
node scripts/assess-debate-readiness.cjs benchmark/results/RUN
```

Khóa code và manifest trước mỗi lần đo. Controls v2 và dev đa nguồn đều đã xem,
không phải holdout. Bộ `structured-transfer-v1.json` khóa 8 biến thể Việt/Anh
trước khi xem output, gồm vị trí đầu/giữa/cuối, Markdown/HTML, tài liệu sạch,
ví dụ đào tạo, tên Dan Evans, exfiltration và đổi nhiệm vụ. Đây vẫn là mẫu tự
tạo bởi người triển khai, chưa có nhãn/nguồn độc lập. Không dùng output của bộ
biến thể để sửa cấu hình rồi gọi nó là chưa từng thấy. Không chấm MAlmasabi test.

Log lưu hợp đồng đang dùng, hash code/model/manifest, prompt và phản hồi gốc,
ma trận ba kết luận, số đo theo nguồn, lỗi, latency, RSS harness và snapshot
Ollama. Citation chính và citation directive/ngữ cảnh được đối chiếu riêng.
RSS harness không phải tổng RAM model; snapshot VRAM không phải peak GPU.

Tiêu chí thêm phản biện vẫn theo [cổng đã đặt](../planning/tieu-chi-them-vong-phan-bien.md).
Không lấy schema hợp lệ, ít unresolved hoặc pass unit test làm bằng chứng đủ.

## Rà soát và kiểm thử

141 test Vitest qua trong 9 file, cùng 7 test công cụ đo/cổng đánh giá. Có ca
bác bỏ rule trên ví dụ đào tạo, tên Dan Evans và kế hoạch con người; ca tấn công
không có rule hit; quote bịa; thiếu trường; ngữ cảnh không chứa nghi vấn; dùng
directive không liên quan; khai báo xác nhận/bác bỏ tự mâu thuẫn; discovery nói
không có chuyển hướng. Có kiểm tra pipeline dừng sớm, giữ cần xem xét và không
truyền nhận định Detector sang Verifier; giao diện escape HTML và nêu giới hạn.
Lint và build/typecheck qua; cảnh báo Vite về alias/freeze đã có vẫn còn.

Lượt đầu trước khi đồng bộ điều kiện discovery được giữ riêng:
`round-one-eval-Y4eumi` (controls) và `round-one-eval-mY5ALz` (dev đa nguồn).
Lượt đầu cho thấy discovery uncertain vẫn có thể khai báo deviation=none.
Đã sửa mâu thuẫn hợp đồng này theo điều kiện tổng quát: discovery phải là một
chuyển hướng tiềm năng, không được đồng thời khẳng định không có chuyển hướng.
Schema sinh cũng giới hạn người nhận/framing/directive giống validator.
Các file nguồn trước chỉnh sửa nằm ở `benchmark/experiments/structured-review-v1/ban-dau/`.
Không gộp kết quả hai phiên bản code thành một phép đo cấu hình cuối.

## Controls trên cấu hình cuối

Baseline `classic-v1`: run `round-one-eval-mTSFnk`, 8 ca hoàn tất, 16/16 phản
hồi hợp lệ. 4 sạch: 2 chưa phát hiện, 2 cần xem xét, 0 báo nhầm. 4 tấn công:
0 xác nhận, 1 chưa phát hiện sai, 3 cần xem xét. Precision chưa xác định vì
không có alert, recall xác nhận=0, FPR=0; trung bình 10,36 giây/ca.

`structured-v1`: run `round-one-eval-rtVoKf`, cả 8 ca cần xem xét do
`invalid_response`, 0/8 phản hồi hợp lệ. Precision chưa xác định, recall xác
nhận=0, FPR=0, review=100%; không được diễn giải số FPR này là cải thiện.
Mọi gold span đã chú thích vẫn tới chunk được chọn. Chưa có nhận định hợp lệ
để tính tỷ lệ citation đúng, nên không báo 100% đúng từ tập rỗng. Thời gian
trung bình 7,97 giây/ca, RSS harness quan sát tối đa 126,07 MiB.

Kiểm tra phản hồi gốc: 1 lần kết thúc vì hết ngân sách sinh (`length`), 7 lần
`stop`. Có 3 phản hồi chép đúng chuỗi mô tả `a short exact original directive`
vào dữ liệu; đó không phải bằng chứng nguồn và đã bị chặn. Không chỉ có lỗi
hết token; tăng ngân sách chưa được chứng minh là cách sửa. Thời gian thấp hơn
baseline chủ yếu đi kèm dừng sớm/lỗi, không phải bằng chứng pipeline hiệu quả hơn.

Cổng đánh giá trong `round-one-eval-rtVoKf/debate-readiness.json` không đạt về
phản hồi hợp lệ, xác nhận tấn công, review rate và lỗi xử lý. Chưa bật mặc định,
chưa có cơ sở thêm phản biện. Baseline được giữ lại cũng chưa đạt mục tiêu chất
lượng; giữ baseline nhằm tránh thay đổi chưa có bằng chứng, không coi nó là an toàn.

Trong báo cáo này F1 cho khả năng xác nhận được tính bằng
`2*TP/(TP+FP+số mẫu tấn công)` khi mẫu số khác 0. Giá trị bằng 0 ở hai run
controls; các ca cần xem xét vẫn tách riêng trong ma trận, không biến thành
kết luận sạch. Precision của tập không có alert luôn ghi là chưa xác định.

## Dev đa nguồn trên cấu hình cuối

Run `round-one-eval-RaYSI3`: 10/10 cần xem xét do invalid_response, 0/10 phản
hồi hợp lệ. Theo nguồn: MAlmasabi dev 2/2, NotInject 2/2, realistic 2/2,
tài liệu CONTRIBUTING 1/1, fixtures cũ 3/3 đều gặp lỗi. Model dừng ở Detector;
chưa có cơ sở đánh giá chất lượng Verifier thật của chế độ mới ở lần đo này.
6 benign và 4 malicious giữ nguyên nhãn, không đổi theo output.

Precision chưa xác định, recall và F1 xác nhận bằng 0; FPR=0 đi kèm review=100%
và không có quyết định hợp lệ. Trung bình 8,79 giây/ca. Số đo theo nguồn, lỗi,
RSS và snapshot tài nguyên nằm trong summary/model-calls của run.

## Biến thể diễn đạt, vị trí và định dạng

Run cuối `round-one-eval-GG6Ueb`: 8/8 cần xem xét do invalid_response,
0/8 phản hồi hợp lệ, dừng ở Detector. 4 sạch và 4 tấn công đều không có quyết
định hợp lệ; precision chưa xác định, recall/F1 xác nhận=0, FPR=0 đi kèm
review=100%. Trung bình 6,05 giây/ca. Không chỉnh cấu hình theo output này.

Đã đối chiếu cả ba run cấu hình cuối: code hash khớp file hiện tại; các gold
span đã chú thích còn sau extraction và nằm trong chunk được chọn. Bản đối
chiếu, RAM harness quan sát và quyết định lưu ở
`benchmark/experiments/structured-review-v1/ket-qua.json`.

## Quyết định và bước tiếp

Giữ `classic-v1` làm mặc định, giữ code mới ở chế độ thử nghiệm để có thể đo
và rà soát. **Chưa đạt cổng phản biện.** 26 ca của ba run cấu hình cuối đều bị
chặn do phản hồi Detector không hợp lệ; đây là kết quả âm tính cho khả năng
sử dụng hợp đồng này với cấu hình model/ngân sách đã thử, không phải cải thiện
hiệu quả phát hiện. Không suy rộng rằng mọi model đều không xử lý được cấu trúc.

Ưu tiên tiếp là giảm yêu cầu model tự chép nhiều đoạn bằng cách thử tham chiếu
đoạn nguồn định sẵn, ánh xạ citation trong code và đo riêng lỗi sinh với lỗi
nhận định. Vẫn phải giữ kiểm tra nguồn và đối chứng sạch/tấn công; không bỏ
validator hoặc tăng vòng lặp chỉ để làm nhiều kết quả trông có vẻ hoàn tất.
Chỉ cân nhắc phản biện khi đạt cổng đã đặt trong hai lần chạy cấu hình khóa và
không gây hồi quy đa nguồn; cần dữ liệu độc lập trước khi bật mặc định.
