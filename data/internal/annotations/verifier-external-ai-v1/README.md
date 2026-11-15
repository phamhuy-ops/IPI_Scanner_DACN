# Batch nguồn ngoài do AI đánh giá

30 bản ghi/24 nguồn cha: 12 confirmed, 12 dismissed, 6 uncertain. Reviewer
là Codex (AI), không phải người dùng duyệt. Setup chỉ có văn bản nguồn;
6 uncertain không thay nhãn tấn công gốc của InjecAgent có ngữ cảnh công cụ.

- `mau-cho-duyet.jsonl` và `nhan-va-cua-so.jsonl`: hai biểu diễn lưu cùng
  30 bản, không cộng thành 60 nguồn.
- `ban-xem-truoc.json`: 60 input/target của hai chế độ, chưa xuất train.
- `danh-gia-ai.json`: thời điểm, hash và căn cứ đánh giá AI.
- `kiem-tra-va-nhom.json`: tái dựng 60/60, ánh xạ parent/nhóm, chưa chia tập.
- `manifest.json`: ảnh chụp lúc tạo, hash, nguồn và giới hạn.
- `van-ban/`: văn bản gốc nguyên vẹn cho từng bản ghi.

18 bản InjecAgent giữ chung một nhóm; 12 NotInject thành 12 nhóm khác.
Toàn bộ là dữ liệu chuẩn bị dev, không gọi là holdout độc lập. License/
revision nằm trong provenance; LICENCE InjecAgent giữ ở thư mục raw.
Xem [báo cáo](../../../../docs/reports/mo-rong-nguon-ngoai-va-chot-audit-verifier.md).
