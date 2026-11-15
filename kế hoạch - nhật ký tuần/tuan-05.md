# Tuần 05 — Cải thiện và kiểm tra luồng quét IPI

**Thời gian** 09/11/2026 – 15/11/2026

**Trạng thái** Đạt mục tiêu trên bộ phát triển (dev) 100 ca. Tuần sau chuẩn bị bộ kiểm thử độc lập.

| STT | Công việc đã thực hiện | Commit chính | Kết quả | Ghi chú |
|:---:|---|---|---|---|
| 1 | Đo kết quả quét ban đầu. | Chưa commit | Phát hiện 1/3 ca IPI. | 4/8 ca sạch cần xem xét. |
| 2 | Ưu tiên đọc các đoạn nghi vấn. | Chưa commit | Thời gian quét trung bình giảm từ khoảng 28 xuống 20 giây. | Kết quả quét giữ nguyên trên 11 ca. |
| 3 | Sửa lỗi đọc PDF. | Chưa commit | Đã kiểm tra lại tệp TXT, PDF và DOCX. | Hiển thị **Cần xem xét** nếu còn phần chưa đọc. |
| 4 | Rà nguồn và nhãn dữ liệu. | Chưa commit | Đối chiếu 48 ca và rà nhãn 18 email. | |
| 5 | Cải thiện nhận diện trên bộ dev 50 ca. | Chưa commit | Phát hiện 25/25 ca IPI, báo nhầm 0/25 ca sạch. | 3 ca sạch cần xem xét. |
| 6 | Chạy lại toàn bộ luồng quét trên bộ dev 100 ca. | Chưa commit | Recall 90% (45/50), FPR 0% (0/50). | 8 ca cần xem xét. |

## Chi tiết nội dung công việc

- **Đo kết quả ban đầu.** Trên 11 ca thử, cấu hình mặc định phát hiện 1/3 ca có IPI. Trong 8 ca sạch, 4 ca cần xem xét thêm.

- **Cải thiện cách chọn đoạn.** Ưu tiên các đoạn nghi vấn để đọc trước. Trên cùng 11 ca, thời gian quét trung bình giảm từ khoảng 28 xuống 20 giây và kết quả quét giữ nguyên.

- **Sửa lỗi đọc PDF.** Đã kiểm tra lại PDF 63 trang, DOCX tiếng Việt và TXT dài. Ứng dụng hiển thị **Cần xem xét** khi vẫn còn phần chưa đọc.

- **Rà dữ liệu.** Đối chiếu với nguồn và kiểm tra các ca đã dùng trước đó để chuẩn bị bộ kiểm tra mới.

- **Đo lại trên bộ dev 50 ca.** Số ca IPI được phát hiện tăng từ **21/25 lên 25/25**. Trong 25 ca sạch, không có ca báo nhầm và 3 ca cần xem xét. [Kết quả 50 ca](../benchmark/results/round-one-eval-peDwwd/summary.json)

- **Đo lại toàn bộ luồng quét trên bộ dev 100 ca.** Chạy từ bước đọc tài liệu, tìm đoạn nghi vấn đến kiểm tra bằng hai Agent. Phát hiện **45/50 ca IPI (Recall 90%)** và báo nhầm **0/50 ca sạch (FPR 0%)**. Có **8 ca cần xem xét** gồm 5 ca IPI và 3 ca sạch. Precision đạt **100%**, F1 đạt **94,7%**. Thời gian quét trung bình khoảng **26 giây/ca**. [Kết quả 100 ca](../lab/results/runs/round-one-eval-5DGW26/summary.json)

## Khó khăn chưa giải quyết được

- Một số tài liệu dài còn phần chưa đọc nên cần kiểm tra thêm.

- Cả hai lượt đo dùng dữ liệu phát triển. Cần kiểm tra lại trên tài liệu mới để biết hệ thống có giữ được kết quả này hay không.

## Công việc tiếp theo

- Tuần sau, chuẩn bị bộ kiểm thử độc lập gồm tài liệu mới có IPI và tài liệu sạch. Rà nhãn trước khi chạy.

- Giữ nguyên cấu hình khi đo trên bộ mới để kiểm tra mục tiêu **Recall ít nhất 90% và FPR không quá 5%**.
