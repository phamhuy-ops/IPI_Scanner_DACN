# Kiểm tra chất lượng hai nguồn mới

## NotInject

- Đã đọc thực tế 3 file Parquet chính, mỗi file 113 mẫu: tổng 339 mẫu.
- Đủ `prompt`, `word_list`, `category`; không null/sai kiểu hoặc văn bản rỗng.
- Số trigger tương ứng one/two/three là 1/2/3 ở toàn bộ mẫu.
- Không trùng nội dung sau khi bỏ khoảng trắng đầu/cuối, cả trong và giữa 3 phần.
- `train`, `validation`, `test` là bản sao byte-identical của one/two/three;
  không được cộng thêm hoặc xem là các tập train/test độc lập.
- Không có trường label từng mẫu. README nguồn mô tả toàn bộ là benign;
  chưa có bước người kiểm chứng lại nhãn ngữ nghĩa trên từng mẫu.

## Realistic prompt injections

- JSONL có 17 mẫu, 10 nhãn injection và 7 benign; JSON hợp lệ.
- Đủ trường, không null/sai kiểu, không text/ID rỗng, không nhãn lạ.
- Không trùng ID hoặc nội dung sau khi trim.
- CSV có cùng 17 mẫu và khớp toàn bộ trường sau khi chuyển kiểu.
- Rà soát phạm vi 10 ca injection: 7 IPI, 2 direct, 1 mixed.
- Direct: INJ-004 yêu cầu developer mode trực tiếp; INJ-009 yêu cầu ghi nhớ
  chỉ dẫn trực tiếp. Cả hai không có ranh giới nội dung ngoài trong mẫu được cung cấp.
- Mixed: INJ-005 có injection trong comment webpage và yêu cầu trực tiếp tiết
  lộ thông tin ngoài phần webpage. Nên báo cáo riêng nếu đánh giá IPI nghiêm ngặt.
- Không thay nhãn gốc; phân loại phạm vi là nhận định cục bộ được ghi kèm lý do.

## Kết luận và giới hạn

Hai nguồn đọc được và đủ điều kiện chuyển sang bước chuẩn hóa. Giữ từng nguồn
riêng; không tính các định dạng/bản sao thành mẫu bổ sung. Đây chưa phải kết
quả benchmark. Không gọi realistic là holdout chưa từng xem vì đã kiểm tra nội
dung trong quá trình phát triển.

MIT được khai báo trong README của hai nguồn; không thấy file license riêng.
Không suy ra tính độc lập ngữ nghĩa với BIPIA chỉ từ tên nguồn khác nhau.
Kiểm tra ở bước chất lượng ban đầu là nội bộ từng nguồn. Kiểm tra cross-source
đã được thực hiện ở bước sau, xem phần bổ sung bên dưới; gần trùng ngữ nghĩa
chưa được xác minh. NotInject là prompt ngắn, không đại diện cho mọi tài liệu
sạch thực tế; realistic chỉ có 17 mẫu. Cần bổ sung tài liệu thực tế về sau.

Toàn bộ raw được giữ nguyên và có SHA-256 trong hai báo cáo JSON bên cạnh.
Thư viện pyarrow 26.0.0 được cài riêng trong thư mục kết quả bị gitignore,
không thêm vào dependency ứng dụng. Chưa chuẩn hóa, chia tập hoặc chạy scanner.

## Bổ sung sau chuẩn hóa: kiểm tra giữa các nguồn

Đã so sánh cả ba cặp nguồn trên dữ liệu chuẩn hóa: 339 NotInject, 17 realistic
và 65.948 MAlmasabi clean. Không tìm thấy cặp trùng nguyên văn, bằng nhau sau
chuẩn hóa định dạng/token, gần trùng theo Jaccard cụm 3 token >= 0,8, hoặc dùng
chung đoạn 12 token liên tiếp. Mọi vị trí bắt đầu đều được kiểm tra ở phép so
đoạn văn; phép gần trùng chỉ áp dụng khi cả hai văn bản có ít nhất 6 token.

Chi tiết, ngưỡng và hash đầu vào nằm ở `cross-source-overlap.json`. Ba kiểm thử
đối chứng đạt: biến thể Unicode/whitespace, đoạn chung ở vị trí lệch và đối
chiếu thuật toán lập chỉ mục với tính toán vét cạn trên bộ mẫu nhỏ.

Kết quả bằng 0 chỉ áp dụng cho các tiêu chí lexical trên. Chưa đánh giá diễn
đạt khác cùng ý, không chứng minh nguồn độc lập hay độ chính xác ngoài thực
tế. Không xóa mẫu hoặc đổi nhãn; không chạy benchmark hay thay đổi rule.
