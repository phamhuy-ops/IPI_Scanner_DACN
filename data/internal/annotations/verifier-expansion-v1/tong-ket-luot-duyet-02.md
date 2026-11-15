# Tổng kết lượt duyệt 02

Người dùng đã duyệt 30/30 mẫu theo sáu đợt, mỗi đợt năm mẫu; không còn
mẫu chờ trong lượt này. Mỗi đề xuất gắn hash nguồn, quyết định gắn hash
đề xuất đã trình bày. Ngày giờ ghi nhận và xác nhận nằm trong
`luot-duyet-02.json`; đề xuất gốc ở `de-xuat-luot-duyet-02.json`.

Kết quả là 27 mẫu chấp nhận nhãn ngữ cảnh: 22 dismissed và 5 confirmed.
Hai mẫu R2-002, R2-026 là yêu cầu trực tiếp, giữ làm direct-attack control,
không gán positive IPI. R2-010 có comment IPI nhưng toàn nguồn còn câu
hỏi trực tiếp về thông tin nội bộ, nên giữ ở mixed_scope_control_only,
không đưa vào train IPI thuần. Các mẫu khác không tự được phép train;
mọi phiếu vẫn có training_eligible=false.

Đã kiểm tra lại hash nguồn/raw, ánh xạ, hash đề xuất, người duyệt, logic
stance/ngữ cảnh, bằng chứng target_quote và cách ly direct/mixed; không
có lỗi. Đây là audit annotation, chưa tạo assessments/discoveries/spanId
đầu ra sản phẩm và chưa kiểm tra bằng parser JSON Verifier trên completion.
Đó là bước chuẩn bị exporter sau này, không được coi là đã hoàn thành.

Nguồn gốc và nhãn ban đầu không bị sửa. `hang-cho-gan-nhan.jsonl` và
`bao-cao-chuan-bi.json` là snapshot khi tạo hàng chờ; đọc quyết định cuối
từ phiếu duyệt. 326 mẫu còn lại trong hàng chờ chưa được duyệt ngữ cảnh;
không tính việc duyệt 30 mẫu là đã duyệt cả 356. Các bucket train/dev/probe
dự kiến chưa phải tập cuối và không ghi đè quyết định loại/cách ly.

Trong 27 mẫu được chấp nhận có tiếng Anh và tiếng Trung, chưa có tiếng
Việt hoặc uncertain. Cộng với batch tự soạn 30 mẫu đã duyệt trước, hiện
có 57 mẫu ngữ cảnh trong phạm vi: 17 confirmed, 34 dismissed, 6 uncertain.
Hai mươi mẫu tham chiếu cũ vẫn giữ riêng và không được cộng vào tập train.
Chưa đạt mục tiêu pilot về cân bằng/ngôn ngữ, chưa có holdout độc lập.

Phần cần bổ sung trước mắt là tiếng Việt, mẫu tấn công có đối chứng sạch,
mảnh nguồn thiếu ngữ cảnh thật sự, và tình huống/định dạng dài hơn. Không
đổi nhãn hoặc tạo biến thể lặp chỉ để đạt tỷ lệ. Tất cả nguồn hiện có đã
dùng làm dev, không dùng làm chứng cứ độc lập hoặc sealed holdout.

Lệnh audit sau duyệt tại gốc dự án:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/python-verifier.ps1 scripts/audit-verifier-expansion.py
```

Kết quả máy ở `kiem-tra-hang-cho.json`. Đây là rà soát có hướng dẫn của
AI bởi một người dùng; chưa đánh giá đồng thuận nhiều người. Chưa
fine-tune, chưa chốt split và chưa thay cấu hình mặc định của ứng dụng.
