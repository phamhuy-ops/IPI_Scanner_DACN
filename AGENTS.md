# Chính sách nâng cấp toàn dự án

Áp dụng cho toàn bộ IPI Scanner, gồm rule, trích xuất, chia chunk, model local,
prompt, điều phối, báo cáo, UI và công cụ đánh giá. Thực hiện các bước kiểm tra
phát triển và tuân theo quy ước kho mã trong `CONTRIBUTING.md`.

## Thay đổi dựa trên bằng chứng

- Thực hiện theo thứ tự: sửa lỗi đã có bằng chứng → bổ sung thay đổi kèm mẫu
  đối chứng lành tính → đánh giá trên dữ liệu độc lập → đo toàn pipeline.
- Giới hạn phạm vi kiểm chứng theo hành vi thay đổi. Thay đổi chỉ liên quan
  đến UI cần kiểm tra các phần UI tương ứng. Thay đổi ảnh hưởng đến phát hiện
  hoặc xử lý đầu vào cần kiểm tra khả năng phát hiện và pipeline. Không dùng
  kết quả unit test để tuyên bố cải thiện bảo mật trên diện rộng.
- Thiết lập baseline có thể tái lập trước khi thay đổi hành vi phát hiện.
  Mỗi lượt chỉ thay đổi một hành vi nhất quán. Lưu kết quả trước và sau cùng
  các giới hạn của phép kiểm chứng.
- Mỗi hành vi phát hiện mới cần có mẫu độc hại, mẫu lành tính tương tự và các
  biến thể chưa gặp về cách diễn đạt, ngữ cảnh và vị trí. Khi kiểm tra phát
  hiện persona DAN, dùng tên như “Dan Evans” làm mẫu đối chứng lành tính.
- Giải thích hành vi mà mỗi rule phát hiện. Không thêm rule dựa vào ID tập
  dữ liệu, nguồn gốc, nhãn, chuỗi riêng của benchmark hoặc điểm mục tiêu.
  Muốn xác nhận đã tìm đúng đoạn chỉ dẫn bị chèn, cần đối chiếu bằng chứng ở
  cấp đoạn. Kết quả khớp ở cấp mẫu dữ liệu chưa đủ.

## Tính độc lập và tính thực tế của dữ liệu

- Dùng tập dev để chọn rule, prompt, ngưỡng và model. Khóa cấu hình trước khi
  đánh giá trên tập held-out. Nếu đã dùng kết quả test để điều chỉnh, cần một
  tập held-out độc lập mới cho kết luận cuối. Ghi rõ tập test cũ đã được dùng
  để điều chỉnh.
- Dùng nhiều tập dữ liệu cùng với fixture thực tế tại dự án trước khi đưa ra
  kết luận rộng về hiệu quả. Rà nguồn gốc. Chỉ xem một tập dẫn xuất từ BIPIA
  là độc lập với BIPIA khi có bằng chứng xác nhận. Lưu nguồn, phiên bản, giấy
  phép và mức độ bất định của nhãn.
- Gom nhóm tài liệu dùng chung, bản gần trùng và biến thể của cùng cuộc tấn
  công trước khi chia tập. Ghi tiêu chí gom nhóm, các nhóm liên kết lớn và
  nguy cơ rò rỉ giữa các tập còn lại.
- Đưa vào tài liệu sạch thực tế, mẫu âm tính khó, nội dung tiếng Việt và đa
  ngôn ngữ, tài liệu dài và các định dạng được hỗ trợ. Dùng fixture công khai,
  tổng hợp hoặc đã loại bỏ thông tin nhạy cảm. Cấm tiết lộ tài liệu riêng hoặc
  bí mật để tạo dữ liệu kiểm thử.
- Giữ nhãn, ID nguồn, ID nhóm và đáp án ngoài đầu vào của model và scanner.
  Chỉ đưa ý định người dùng vào khi cấu hình đánh giá có xét ngữ cảnh và cách
  cung cấp ý định đã được ghi rõ.

## Đánh giá và kết luận hoàn thành

- Báo Precision, Recall, F1, FPR và số lượng TP, FP, TN, FN. Báo kết quả theo
  từng nguồn và nhóm, đồng thời ghi rõ các chỉ số không xác định được.
- Khi liên quan, đo từng bước trích xuất, chọn chunk, prefilter, Detector và
  Verifier, sau đó đo toàn pipeline trên các đầu vào có thể so sánh. Với thay
  đổi model hoặc pipeline, ghi độ trễ và mức dùng tài nguyên. Ghi cả lỗi và
  giới hạn độ bao phủ.
- Giữ dữ liệu thô và các baseline trước đó. Ghi phiên bản tập dữ liệu, mã,
  model và prompt, cùng seed, chính sách kết luận và lệnh chính xác để có thể
  tái lập.
- Kết quả đạt trên một tập dữ liệu chỉ là bằng chứng sơ bộ. Nếu chưa thể đánh
  giá độc lập hoặc đầu cuối, thực hiện các kiểm tra cục bộ khả thi và ghi rõ
  phần còn chờ kiểm chứng. Chỉ báo kết quả đã đo và chỉ xác nhận hoàn thành khi
  phần đánh giá tương ứng đã được thực hiện.

## Ngôn ngữ tài liệu từ ngày 2026-10-24

Viết tiêu đề và phần diễn giải của tài liệu mới bằng tiếng Việt. Áp dụng cho
README, hướng dẫn, báo cáo, kế hoạch, ghi chú và chú thích mới. Giữ nguyên thuật
ngữ chuyên môn và định danh kỹ thuật khi cần đối chiếu, như Detector, Verifier,
prefilter, Recall, FPR, tên API, lệnh và đường dẫn.

Giữ nguyên ngôn ngữ của dữ liệu thử nghiệm và trích dẫn gốc. Khi thử prompt
tiếng Anh cho model, ghi rõ mục đích bằng tiếng Việt. Không tự dịch tài liệu cũ.
Chi tiết tại `.cursor/rules/tai-lieu-tieng-viet.mdc`.

## CẤU TRÚC DỰ ÁN

- `electron/`, `engine/` và `src/` chứa tiến trình desktop, bộ xử lý tài
  liệu và giao diện. `public/` và `build/` chứa tài nguyên tĩnh và tài nguyên
  đóng gói.
- `data/` chứa dữ liệu nội bộ, nguồn ngoài, fixture và manifest. Dùng tập
  phát triển để điều chỉnh cấu hình. Chỉ dùng tập held-out độc lập sau khi
  khóa cấu hình. Giữ nguyên nguồn, nhãn, giấy phép và hash của hồ sơ đã khóa.
- `lab/experiments/` chứa hồ sơ thử nghiệm, tra theo họ trong
  `lab/experiments/registry.md`. `lab/prototypes/` chứa mẫu thử và test đi
  kèm. `lab/results/baselines/` giữ baseline, còn `lab/results/runs/` chứa
  lượt chạy mới. `benchmark/results/` giữ kết quả cục bộ lịch sử để các
  tham chiếu cũ còn dùng được. Khi kiểm kê hoặc di chuyển, kiểm tra reparse
  point và tránh đi theo junction.
- `scripts/` chia công cụ theo benchmark, chỉ số, dữ liệu và phát triển.
  `tests/tooling/` chứa test công cụ. Test của mã sản phẩm nằm cạnh mã mà
  chúng kiểm tra. `skills/` chứa hướng dẫn và cấu hình skill mà runner sử dụng.
- `docs/` chứa kiến trúc, hướng dẫn, kế hoạch, báo cáo và
  [tóm tắt theo tuần](docs/weekly/README.md). `archive/` chứa hồ sơ lịch sử
  cùng chỉ mục và hướng dẫn tra cứu.

Thư mục `kế hoạch - nhật ký tuần/` là tài liệu nộp giảng viên. Chỉ sửa khi
người dùng yêu cầu rõ. Đợt tổ chức lại ngày 2026-11-15 đã được cho phép sửa
các đích link. Giữ đường dẫn và ảnh của nhật ký, đặt bản tóm tắt mới trong
`docs/weekly/`.
