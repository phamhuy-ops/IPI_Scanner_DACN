# Tuần 05 — Việc đã làm

[Nguồn: `tuan-05.md`](<../../../../kế hoạch - nhật ký tuần/tuan-05.md>)

1. **Baseline và chọn đoạn.** Đo Balanced trên dev. Kiểm tra các ca sạch Cần xem xét, ưu tiên đoạn có tín hiệu prefilter và so cách chọn cố định với thích ứng.

2. **Chia batch Verifier.** Tách đoạn có nghi vấn để xử lý ca dài từng timeout. Bổ sung ngưỡng theo từng batch sau khi thử đa file cho thấy tách mọi nghi vấn làm tăng request.

3. **Đọc PDF và kiểm tra desktop.** Sửa cấu hình build để tìm đúng worker PDF. Kiểm tra TXT dài, PDF và DOCX bằng Electron và Ollama; giao diện ghi Cần xem xét khi chưa đọc đủ.

4. **Rà tập đánh giá.** Đối chiếu **48 ca** với nguồn và rà **18 email LLMail**. Có **14/18** email đã xuất hiện trong log teacher forcing; **bốn** ca IPI cùng nhóm hành vi. Benchmark kiểm tra được ID, nhóm và hash trước khi gọi model.

5. **Thử nhận diện chỉ dẫn đổi đầu ra.** Dừng chỉnh ba skill trên tập nhỏ. Thử prompt ngắn, tín hiệu prefilter và hướng dẫn Verifier có điều kiện. Bổ sung rà phản hồi tự mâu thuẫn khi hai trích dẫn cùng vị trí.
