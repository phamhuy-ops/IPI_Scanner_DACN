# Tuần 05 — Thí nghiệm và số liệu

[Nguồn: `tuan-05.md`](<../../../../kế hoạch - nhật ký tuần/tuan-05.md>)

- **Balanced mặc định, 11 ca dev.** Precision **100% (1/1)**, Recall **33,3% (1/3)**, F1 **50%**, FPR **0% (0/8)**. Trung vị **18,2 giây**, p95 **43,8 giây**. Trong **4/8 ca sạch** Cần xem xét, ba ca còn đoạn chưa đọc và một ca hai Agent bất đồng.

- **Chọn đoạn và đọc tệp.** Balanced thích ứng giảm trung bình từ **27,5 xuống 19,9 giây** trên cùng **11 ca**, kết luận giữ nguyên. Hai Agent rà đủ **12 đoạn được chọn** ở PDF **63 trang** và DOCX tiếng Việt. Kết luận vẫn Cần xem xét vì còn phần chưa đọc.

- **Nhóm tách khỏi dev nhưng cùng họ BIPIA.** Cấu hình mặc định đạt Recall **1/6** trên **12 ca**.

- **Đối chứng đổi tóm tắt trên sáu ca.** Tín hiệu prefilter chuyển **hai ca IPI** sang Cần xem xét; **bốn ca sạch** giữ kết luận. Verifier tự mâu thuẫn ở **2/12 phản hồi**, Recall xác nhận **0/2**. Hướng dẫn kiểm tra quyền đưa Recall lên **1/2**, FPR **0/4**, nhưng **3/4 ca sạch** Cần xem xét. Lượt giới hạn hướng dẫn theo nghi vấn đạt **2/2 IPI**, **0/4 ca sạch báo nhầm** và **0/6 ca Cần xem xét**.

- **Tổng hợp ba lượt dev, 24 ca.** Recall **4/12 (33,3%)**, FPR **1/12 (8,3%)**, F1 **47,1%**. Đối chứng thêm bốn ca có Recall **0/2** và FPR **1/2**.

- **Tám ca dev và tám ca tổng hợp mới.** Thu hẹp tín hiệu giảm FPR **1/4 → 0/4** và ca sạch Cần xem xét **1/4 → 0/4**, Recall giữ **1/4**. Mở rộng tín hiệu trên cùng dev tăng Recall **1/4 → 2/4**, FPR giữ **0/4**. Trên **tám ca tổng hợp mới**, nhánh có hướng dẫn đạt Recall **1/4** và FPR **1/4**.

- **Mười hai ca dev mới, sáu nhóm.** Recall **2/6**, FPR **0/6**, F1 **50%**. Trong bốn ca IPI có tín hiệu, hai được xác nhận, một bất đồng và một Verifier tự mâu thuẫn. Hai ca thiếu tín hiệu bị bỏ sót. Không có ca sạch kích hoạt nhánh riêng, nên FPR nhánh này chưa xác định. Nhật ký cũng ghi **70/70** kiểm thử benchmark đạt.
