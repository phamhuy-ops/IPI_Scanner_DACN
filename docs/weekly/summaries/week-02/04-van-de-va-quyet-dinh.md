# Tuần 02 — Vấn đề và quyết định

[Nguồn: `tuan-02.md`](<../../../../kế hoạch - nhật ký tuần/tuan-02.md>)

- **Lựa chọn mặc định.** Giữ `classic-v1` vì các prompt/schema thử còn lỗi JSON, báo nhầm hoặc bỏ sót. Vòng phản biện chưa được bật.

- **Bằng chứng và bao phủ.** Word demo trả Cần xem xét vì trích dẫn Detector lệch nguồn và luồng dừng trước Verifier. Ứng viên rút gọn giải thích còn lỗi Deep Scan và có lỗi ở đối chứng nên chưa áp dụng mặc định.

- **Phân loại kết quả.** Rule tạo nghi vấn. Hai model cùng xác nhận bằng chứng thì báo Phát hiện IPI. Bất đồng, thiếu bằng chứng, lỗi hoặc thiếu bao phủ dẫn tới Cần xem xét.

- **Giới hạn minh chứng.** Nhật ký ghi nguồn đối chứng đã dùng trong lúc chỉnh rule. Kết quả CI của lần đồng bộ lockfile và số đo tác động của việc đổi ngôn ngữ prompt **không có trong nhật ký**.
