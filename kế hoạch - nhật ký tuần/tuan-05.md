# Tuần 05 — Cải thiện và kiểm tra luồng quét IPI

**Thời gian** 09/11/2026 – 15/11/2026

**Trạng thái** Đã đạt mục tiêu trên bộ thử 50 ca. Ưu tiên 1 còn chờ kiểm tra trên bộ dữ liệu mới.

| STT | Công việc đã thực hiện | Commit chính | Kết quả (ảnh) | Ghi chú |
|:---:|---|---|---|---|
| 1 | Đo kết quả quét ban đầu. | Chưa commit | | Phát hiện 1/3 ca có IPI. |
| 2 | Ưu tiên đọc các đoạn nghi vấn. | Chưa commit | | Thời gian quét trung bình giảm trên bộ 11 ca. |
| 3 | Sửa lỗi đọc PDF. | Chưa commit | | Đã kiểm tra tệp TXT, PDF và DOCX. |
| 4 | Rà nguồn và nhãn dữ liệu. | Chưa commit | | Đối chiếu 48 ca, rà nhãn 18 email. |
| 5 | Cải thiện nhận diện và chạy lại 50 ca. | Chưa commit | | Phát hiện 25/25 ca IPI, báo nhầm 0/25 ca sạch. |

## Chi tiết nội dung công việc

- **Đo kết quả ban đầu.** Trên 11 ca thử, cấu hình mặc định phát hiện 1/3 ca có IPI. Trong 8 ca sạch, 4 ca cần xem xét thêm.
- **Cải thiện cách chọn đoạn.** Ưu tiên các đoạn nghi vấn để đọc trước. Trên cùng 11 ca, thời gian quét trung bình giảm từ khoảng 28 xuống 20 giây và kết quả quét giữ nguyên.
- **Sửa lỗi đọc PDF.** Đã kiểm tra lại PDF 63 trang, DOCX tiếng Việt và TXT dài. Ứng dụng hiển thị **Cần xem xét** khi vẫn còn phần chưa đọc.
- **Rà dữ liệu.** Đối chiếu với nguồn và kiểm tra các ca đã dùng trước đó để chuẩn bị bộ kiểm tra mới.
- **Đo lại trên 50 ca.** Sau khi điều chỉnh bước tìm đoạn nghi vấn và cách hai Agent kiểm tra, số ca IPI được phát hiện tăng từ **21/25 lên 25/25 (Recall 100%)**. Trong 25 ca sạch, **không có ca báo nhầm (FPR 0%)** và **3 ca cần xem xét**. [Kết quả 50 ca](../benchmark/results/round-one-eval-peDwwd/summary.json)

## Khó khăn chưa giải quyết được

- Một số tài liệu dài còn phần chưa đọc nên cần kiểm tra thêm.
- Kết quả 50 ca được đo trên bộ đã dùng để cải thiện hệ thống. Hiệu quả trên tài liệu mới vẫn cần kiểm tra.

## Công việc tiếp theo

- Chuẩn bị bộ tài liệu mới có cả ca IPI và ca sạch đã kiểm tra nhãn.
- Chạy lại cấu hình đã lưu để kiểm tra mục tiêu **phát hiện ít nhất 90% ca IPI và báo nhầm không quá 5% ca sạch** trước khi áp dụng mặc định.
