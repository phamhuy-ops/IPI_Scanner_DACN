# Đối chứng alias tên file

**Đã loại và gỡ mã v2.** [Đo30 ca mỗi pha/120 request](../../results/agent-upgrade-30-6wkLl1/quality-audit.json): đúng11→9/30, lỗi4→7. Không mở96/holdout hoặc bật mặc định. Config bên cạnh chỉ ghi cấu hình lịch sử; chạy lại cần source snapshot của lượt đo. Giữ nguyên bản v1 trước thử và sửa chẩn đoán đã kiểm chứng.

Giả thuyết: tên file thật còn trong header và độ dài tên còn ảnh hưởng chia batch Verifier. Bản v2 chỉ dùng document-1, document-2 theo thứ tự tài liệu trong toàn phạm vi đã chọn; cùng formatter dùng để đóng gói và gửi model. State, nguyên văn (kể cả tên/đường dẫn có thật trong nội dung), schema, parser và quyết định giữ nguyên. Không loại risk score/selection hoặc đổi model.

Đo hai pha mới trên cùng code/input path: baseline cấu hình stable-alias-v1, candidate stable-alias-v2. Không so với điểm của một lần chạy khác đường dẫn. Sàng lọc đủ30 ca cũ trước, dừng nếu FP vượt toàn baseline; không loại ca lỗi/cần xem xét khỏi mẫu số. Qua cổng và kiểm tra hồi quy mới mở bộ96 đã khóa. Đây là dev đã dùng, chưa phải kiểm chứng độc lập.

Dùng runner chung với --baseline-config và --candidate-config, ghi hash/snapshot cả hai JSON, raw/model/template/seed/lệnh và hạn chế theo từng lượt. Ngân sách kế thừa policy length-aware-v1 đã khóa ở v1; không sửa cổng sau đo. Không bật Agent mặc định khi chưa đủ bằng chứng. Nếu giảm chất lượng hoặc sinh false clear/FP mới thì loại nhánh v2 và giữ hồ sơ đo.
