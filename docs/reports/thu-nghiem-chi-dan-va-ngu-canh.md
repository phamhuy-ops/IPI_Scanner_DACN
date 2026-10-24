# Thử nghiệm phân biệt directive và ngữ cảnh

## Giả thuyết

Baseline `round-one-eval-2Bj3lQ` có hai model cùng báo IPI trên tài liệu sạch và
bỏ sót exfiltration. Thử một thay đổi: thêm hướng dẫn xét người nhận chỉ dẫn,
hành động được yêu cầu, active instruction so với ví dụ được mô tả, cùng lý do
về ngữ cảnh/deviation. Không thay rule, model, transport, schema, validator hay
chính sách kết luận. Không thêm vòng phản biện.

## Dữ liệu và phép đo

- Bộ dev 10 ca đa nguồn cũ giữ nguyên manifest; MAlmasabi test không được chấm.
- Controls mới: 4 sạch + 4 tấn công, Việt/Anh, gồm quy trình con người, ví dụ
  đào tạo, exfiltration và thay câu trả lời. Đây là fixtures tự tạo, không phải
  nhãn/nguồn độc lập hay mẫu đại diện cho thực tế.
- Hai lần thăm dò v1 (`round-one-eval-FaB3Sx`, `round-one-eval-t8G5ks`) có tên
  file mô tả loại ca. Loại khỏi kết luận về hiệu quả do nguy cơ gợi ý nhãn;
  giữ log, không xóa/ghi đè. Không dùng chúng để tuyên bố cải thiện trước/sau.
- `context-controls-v2.json` dùng ID trung tính; mô tả controls và nhãn chỉ ở
  metadata ngoài model input. Cùng văn bản nên vẫn là dev đã xem, không holdout.
- Tiêu chí đo được khai báo tại [kế hoạch phản biện](../planning/tieu-chi-them-vong-phan-bien.md).

Lệnh tái lập trên cấu hình được khóa:

```sh
npm run benchmark:round-one -- --manifest benchmark/data/context-controls-v2.json
npm run benchmark:round-one
node scripts/assess-debate-readiness.cjs benchmark/results/RUN
node --test scripts/assess-debate-readiness.test.cjs
```

Hash prompt/code/model, manifest, log lời gọi, citation và số đo tài nguyên nằm
trong mỗi thư mục run. RSS là tiến trình harness, snapshot VRAM không phải peak.
Đánh giá dùng core sản phẩm qua headless bridge, chưa kiểm thử tương tác Electron.

## Giới hạn quyết định

Một câu giải thích có vẻ thuyết phục không chứng minh directive tồn tại. Đã
quan sát trường hợp stance confirmed nhưng lý do nói không có ý đồ độc hại;
trường hợp khác coi kế hoạch của nhóm người là yêu cầu cho AI. Validator hiện
kiểm chứng cấu trúc/nguồn, chưa thể chứng minh ngữ nghĩa của suy luận này.
Không dùng regex sửa stance theo vài từ trong reason hoặc ép đồng thuận.

## Kết quả controls trung tính của prompt thử nghiệm

Run `round-one-eval-e6QZyA`: cả 8 ca hoàn tất, 16/16 phản hồi hợp lệ.
4 benign: 3 báo nhầm, 1 chưa phát hiện. 4 malicious: 1 xác nhận, 1 chưa phát
hiện sai, 2 cần xem xét. Precision 1/4=25%, recall xác nhận 1/4=25%, F1=25%,
FPR 3/4=75%. Review 2/8=25%, trung bình 11,45 giây/ca.

Không đạt các cổng: báo nhầm controls sạch, false clear tấn công rõ, recall
xác nhận thấp hơn 75%. Schema/citation hợp lệ không đủ để bắt đầu phản biện.
Chưa đủ điều kiện giữ prompt này làm nâng cấp mặc định. Bản prompt thử nghiệm
được lưu tại `benchmark/experiments/context-review-v1/prompts.ts.txt` để truy vết.

## Hồi quy đa nguồn và quyết định

Run candidate `round-one-eval-AfHfMu` trên 10 ca cũ: 6 benign có 4 báo nhầm,
2 chưa phát hiện; 4 malicious có 1 xác nhận, 1 chưa phát hiện, 2 cần xem xét.
9/10 hoàn tất; case-09 quote sai vẫn bị chặn. 18/19 phản hồi hợp lệ, trung bình
11,06 giây/ca. Precision 1/5=20%, recall xác nhận 1/4=25%, F1=22,22%, FPR
4/6=66,67%. Số liệu từng nguồn ở `by_source` trong summary của run.

Baseline cùng 10 đầu vào `round-one-eval-2Bj3lQ`: 2/6 báo nhầm, 0/4 xác nhận
tấn công, 2/4 false clear, 5/10 review. Candidate giảm abstention và xác nhận
được HTML, nhưng tăng báo nhầm; không thể coi giảm unresolved là thành công.
Đây là so sánh dev nhỏ, model biến động và chưa lặp đủ để ước lượng độ bất định.

**Loại candidate khỏi mặc định.** Khôi phục đúng hash prompt trước
`37341ac222a2243ffd8a2406a86be87ebaf4ee1c818b640f56759f6f2b032be6`.
Giữ lại bộ controls, harness nhận manifest, script cổng và log thử nghiệm.
Chưa thêm vòng phản biện. Không chỉnh nhãn theo kết quả, không dùng test để tune.

Kiểm chứng tự động: 120 test Vitest và 4 test cổng/manifest qua; lint,
build/typecheck qua (các cảnh báo Vite có sẵn vẫn còn).

## Kiểm tra cấu hình được giữ lại

Run `round-one-eval-UzF0PP` dùng prompt trước, cùng manifest controls trung tính:
4 benign có 0 báo nhầm, 2 chưa phát hiện, 2 cần xem xét; 4 malicious có 0 xác
nhận, 1 chưa phát hiện sai, 3 cần xem xét. 8/8 hoàn tất, 16/16 phản hồi hợp lệ,
trung bình 11,47 giây/ca. Precision chưa xác định vì không có alert; recall=0,
F1=0, FPR=0. Review 5/8=62,5%. Cấu hình này cũng chưa đạt cổng phản biện.

Hai run controls trung tính giữ cùng manifest/model và chỉ khác file prompt
trong các code hash đã ghi. Lưu đối chiếu cùng quyết định ở
`benchmark/experiments/context-review-v1/decision.json`. Trình tự chạy khác nhau
và chỉ một lần mỗi cấu hình; không diễn giải thành chứng minh nhân quả/tổng quát.

Hiện đã có cách đo và chặn việc nhận một thay đổi prompt không đạt đối chứng,
nhưng chưa đạt mục tiêu chất lượng nhận định. Bước tiếp là thử hợp đồng nhận định
có cấu trúc về addressee/directive/framing/deviation, có bằng chứng nguồn và
validation nhất quán; tiếp tục giữ nguyên baseline để so sánh. Không tự suy ra
stance từ từ khóa trong lý do. Cần phép đo độc lập trước khi tuyên bố hiệu quả.
