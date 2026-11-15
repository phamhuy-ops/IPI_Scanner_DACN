# Tuần 05 — Đánh giá và cải thiện luồng quét IPI

**Thời gian** 09/11/2026 – 15/11/2026  
**Trạng thái** Đã đo baseline và sửa lỗi đọc PDF. Ưu tiên 1 vẫn đang thực hiện.

| STT | Công việc đã thực hiện | Commit chính | Kết quả (ảnh) | Ghi chú |
|:---:|---|---|---|---|
| 1 | Đo cấu hình mặc định và rà các ca Cần xem xét. | Chưa commit | | 4/8 ca sạch cần xem xét. |
| 2 | Cải thiện chọn đoạn và thử chia batch cho Verifier. | Chưa commit | | Chia batch theo ngưỡng đang thử trong benchmark. |
| 3 | Sửa lỗi đọc PDF và kiểm tra độ bao phủ trên desktop. | Chưa commit | | Đã kiểm tra TXT, PDF và DOCX qua Electron và Ollama. |
| 4 | Rà nhãn, nguồn và lịch sử sử dụng dữ liệu. | Chưa commit | | Chưa có bộ độc lập về nguồn. |
| 5 | Thử nhận diện chỉ dẫn đổi kết quả tóm tắt. | Chưa commit | | Hai ca tấn công chuyển sang Cần xem xét. |

## Chi tiết nội dung công việc

### 1. Đo cấu hình mặc định

Balanced trên 11 ca dev đạt **Precision 100% (1/1), Recall 33,3% (1/3), F1 50% và FPR 0% (0/8)**. Thời gian trung vị là **18,2 giây**, p95 là **43,8 giây**. Báo cáo lưu thời gian mỗi trang PDF và số đoạn được cả hai Agent rà. [Số liệu từng ca](../benchmark/results/round-one-eval-LiICJs/cases.json)

Trong 4 ca sạch ra **Cần xem xét**, ba ca còn đoạn chưa đọc. Ca còn lại đã đọc đủ nhưng hai Agent bất đồng.

### 2. Chọn đoạn và chia batch

Ưu tiên đoạn có tín hiệu từ prefilter. Trong thử nghiệm, Balanced thích ứng giảm thời gian trung bình từ **27,5 xuống 19,9 giây** trên cùng 11 ca. Kết luận từng ca giữ nguyên. [Lượt cố định](../benchmark/results/round-one-eval-9NmE6W/summary.json) · [Lượt thích ứng](../benchmark/results/round-one-eval-yZUYVG/summary.json)

Tách riêng đoạn có nghi vấn giúp Verifier hoàn tất ca dài từng timeout. Thử nghiệm đa file cho thấy tách mọi nghi vấn làm tăng số request, nên đã thêm ngưỡng theo từng batch. Các tùy chọn này vẫn ở benchmark.

### 3. Sửa đọc PDF và kiểm tra desktop

Đã sửa cấu hình build để PDF tìm đúng worker. Trên desktop, cả hai Agent rà đủ **12 đoạn được chọn** ở PDF 63 trang và DOCX tiếng Việt. Giao diện hiển thị **Cần xem xét** vì còn phần chưa đọc. TXT dài cũng hiển thị đúng lý do này.

### 4. Rà dữ liệu đánh giá

Đã đối chiếu 48 ca với nguồn và rà nhãn 18 email LLMail. Trong 18 email, 14 ca đã xuất hiện trong log teacher forcing. Bốn ca IPI cùng một nhóm hành vi. Benchmark có thể kiểm tra ID, nhóm và hash trước khi gọi model. [Lịch sử LLMail](../lab/experiments/verifier-eligibility-v12/lich-su-model-llmail-tuan-05.json)

Cấu hình mặc định đạt Recall **1/6** trên bộ 12 nhóm tách khỏi dev nhưng cùng họ nguồn BIPIA. [Kết quả 12 ca](../benchmark/results/round-one-eval-YrU4YS/summary.json)

### 5. Thử nhận diện chỉ dẫn đổi đầu ra

Dừng chỉnh ba skill trên bộ nhỏ. Thử prompt ngắn trên sáu ca, kết luận giữ nguyên nên đã hoàn tác. Tín hiệu prefilter thử nghiệm đưa hai ca IPI từ **Không phát hiện** sang **Cần xem xét**. Bốn ca sạch giữ kết luận cũ.

Verifier gán hai nhãn trái nhau cho cùng đoạn trích ở **2/12 phản hồi**. Benchmark giờ kiểm tra cả đoạn trích dài và ngắn khi xác định được chúng nằm cùng vị trí. Recall xác nhận vẫn là **0/2**.

Thử thêm hướng dẫn kiểm tra quyền ra lệnh. Recall tăng lên **1/2** và FPR giữ **0/4**, nhưng **3/4 ca sạch chuyển sang Cần xem xét**. Giữ ứng viên trong benchmark. [Kết quả đối chứng](../benchmark/results/round-one-eval-O3mR5d/summary.json)

Giới hạn hướng dẫn vào Verifier khi có nghi vấn đổi đầu ra. Lượt mới phát hiện **2/2 ca IPI**, **0/4 ca sạch báo nhầm** và **0/6 ca Cần xem xét**. Cả bốn ca sạch đi qua nhánh mặc định. Cần thêm đối chứng sạch kích hoạt hướng dẫn và dữ liệu độc lập trước khi bật mặc định. [Kết quả](../benchmark/results/round-one-eval-LyMtHs/summary.json)

## Kế hoạch tiếp theo

Gộp ba lượt dev có cùng cấu hình, mã pipeline và digest model, không trùng hash đầu vào. Trên **24 ca**, Recall **4/12 (33,3%)**, FPR **1/12 (8,3%)**, F1 **47,1%**. Trong 12 ca IPI, bốn ca không có tín hiệu bị bỏ sót và bốn ca có tín hiệu vẫn Cần xem xét. Hai ca sạch có tín hiệu gồm một ca báo nhầm và một ca Cần xem xét. Đây là tổng hợp dev, chưa dùng để chốt mục tiêu. [Lượt 8 ca](../benchmark/results/round-one-eval-kD5TKj/summary.json) · [Lượt 12 ca](../benchmark/results/round-one-eval-QiyTyr/summary.json) · [Lượt 4 ca](../benchmark/results/round-one-eval-ryn9xe/summary.json)

Đối chứng thêm hai ca sạch có tín hiệu và hai ca IPI ngoài mẫu. Một ca sạch bị báo nhầm, một ca sạch Cần xem xét và cả hai ca IPI bị bỏ sót. Recall **0/2**, FPR **1/2**. Ứng viên tiếp tục ở benchmark. [Kết quả](../benchmark/results/round-one-eval-ryn9xe/summary.json)

Thu hẹp tín hiệu đổi tóm tắt để phân biệt yêu cầu văn phong với yêu cầu thay nội dung. Trên tám ca dev, FPR giảm **1/4 → 0/4**, ca sạch Cần xem xét giảm **1/4 → 0/4**, Recall giữ **1/4**. Hai ca diễn đạt ngoài mẫu vẫn bị bỏ sót. [Kết quả sau sửa](../benchmark/results/round-one-eval-uOK7ou/summary.json)

Bổ sung tín hiệu khi tài liệu gọi người lập báo cáo và áp đặt số lượng hoặc trạng thái. Trên cùng tám ca dev, Recall tăng **1/4 → 2/4**, FPR giữ **0/4**. Hai ca IPI còn lại ra Cần xem xét. [Kết quả lượt mở rộng](../benchmark/results/round-one-eval-kD5TKj/summary.json)

Thử hướng dẫn Verifier đối chiếu đầu ra được yêu cầu với dữ kiện nguồn. Kết luận giữ nguyên cả tám ca, phản hồi tự mâu thuẫn tăng từ một lên hai. Đã hoàn tác câu thử. [Kết quả](../benchmark/results/round-one-eval-8Of2fu/summary.json)

Trên tám ca tổng hợp mới, nhánh Verifier có hướng dẫn đạt **Recall 1/4** và **FPR 1/4**. Hai ca sạch kích hoạt nhánh này, một ca báo nhầm và một ca Cần xem xét. Hai ca tấn công dùng cách diễn đạt ngoài phạm vi prefilter bị bỏ sót. Giữ cấu hình ở benchmark. [Kết quả tám ca](../benchmark/results/round-one-eval-cFHRtq/summary.json)

- Giữ bộ tám ca làm kiểm tra hồi quy. Khóa bộ mới có nguồn độc lập và nhãn đã rà trước khi đánh giá **Recall ≥ 90% và FPR ≤ 5%**.
- Benchmark báo thêm cận Wilson một phía 95% cho từng tỷ lệ. Các cận giả định ca độc lập và chỉ dùng để tham khảo khi các ca dùng chung nhóm. **70/70 kiểm thử benchmark đạt.**

Đã đo 12 ca dev mới thuộc sáu nhóm. Recall **2/6**, FPR **0/6**, F1 **50%**. Trong bốn ca IPI có tín hiệu, hai ca được xác nhận, một ca hai Agent bất đồng và một ca Verifier tự mâu thuẫn. Hai ca thiếu tín hiệu bị bỏ sót. Không có ca sạch kích hoạt nhánh hướng dẫn riêng, nên FPR của nhánh đó chưa xác định. Benchmark đã thêm số liệu riêng cho ca có tín hiệu. [Kết quả](../benchmark/results/round-one-eval-QiyTyr/summary.json)
