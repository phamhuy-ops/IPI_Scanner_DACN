# Cửa sổ tiếng Việt trên nền bài dài

30 bản ghi từ sáu bài Wikipedia tiếng Việt có revision/hash/ghi công.
25 phiên bản dài trên 8.000 UTF-16, không lặp nền để bù độ dài.
Nhãn cửa sổ: 6 confirmed, 18 dismissed, 6 uncertain; reviewer Codex (AI).

Đây là nền bài thật cộng biến thể tự soạn, không phải tấn công tìm thấy
trên Wikipedia. Tất cả bản cùng bài phải chung parent/nhóm khi chia tập.

- `mau-cho-duyet.jsonl`: text toàn tài liệu, annotation **chỉ cho cửa sổ**.
- `ban-xem-truoc.json`: 60 input/target chỉ chứa văn bản cửa sổ.
- `danh-gia-ai.json`: nhật ký/hash đánh giá; canonical rows giữ trạng thái
  lúc tạo nháp, không giả danh người dùng duyệt.
- `kiem-tra-va-nhom.json`: tái dựng/nhóm và đo selection trước AI trên sáu ca active.
- `GHI-CONG-VA-GIAY-PHEP.md`: attribution, CC BY-SA 4.0 và phần sửa đổi.
- `van-ban/`: phiên bản đầy đủ để đối chiếu, **chưa có gold negative toàn bài**.

Không dùng `annotation.label` cùng `text` dài để chấm benign toàn tài liệu.
Khi chuẩn bị bài học phải dùng `selected_window.text` và `window_annotation`.
Hiện mọi bản training_eligible=false, chưa chia train/dev/holdout.
Đọc [báo cáo](../../../../docs/reports/bo-sung-tieng-viet-tai-lieu-dai-va-do-coverage.md).
