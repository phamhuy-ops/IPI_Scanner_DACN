# Tuần 02 — Việc đã làm

[Nguồn: `tuan-02.md`](<../../../../kế hoạch - nhật ký tuần/tuan-02.md>)

1. **Tái cấu trúc.** Tách trình đọc tài liệu, semantic chunker, prefilter, rule và cấu hình. Tạo các thành phần Detector, Verifier, pipeline và evidence. Đồng bộ lockfile cho CI trên Node 22.

2. **Phạm vi quét.** Ưu tiên chunk đáng ngờ, thêm đoạn lân cận và lấy mẫu ở nhiều vị trí. Trình đọc HTML giữ bản thô gồm comment và thêm bản text phụ. Giao diện cảnh báo khi phần gốc chưa được đọc đủ.

3. **Rule và kết luận.** Sửa rule DAN để tránh bắt tên người chỉ có chữ “Dan”; thêm rule tiếng Việt và tín hiệu thao túng câu trả lời. Detector và Verifier rà nghi vấn theo chính sách ba kết luận. Giao diện hiện riêng lỗi model, timeout và phản hồi sai.

4. **Dữ liệu và luồng Agent.** Bổ sung NotInject và realistic IPI để đối chứng, rà nhãn ngữ cảnh và chuẩn bị các mẫu nháp Verifier. Cập nhật ngày 28/10 bổ sung phục hồi batch bị cắt, phân loại lý do Cần xem xét và đếm riêng `verifierOnlyCount`.

5. **Giao diện và tài liệu.** Cập nhật ứng dụng React, Electron, README và manifest. Nhật ký ghi việc chuyển một số nội dung sang tiếng Anh để thử nghiệm, rồi quy định tài liệu và chú thích mới dùng tiếng Việt từ 24/10/2026.
