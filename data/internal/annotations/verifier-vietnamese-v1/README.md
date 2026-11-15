# Batch bổ sung tiếng Việt V3

Đã duyệt đủ 15/15 mẫu. Xem [tổng kết cuối](tong-ket-ra-soat.md) và
`tong-ket-ra-soat.json`; các mô tả pending dưới đây là lịch sử chuẩn bị.
Kiểm tra đáp án cuối bằng
`node scripts/audit-reviewed-verifier-batch.cjs benchmark/data/annotations/verifier-vietnamese-v1`.

15 mẫu nháp tự soạn thuộc 5 family: lịch phòng họp, kết quả tra cứu quy
định, tồn kho, hỗ trợ đăng nhập và phiếu hỗ trợ. Mỗi family có mẫu tấn
công, đối chứng sạch và mảnh nguồn thiếu ngữ cảnh. Tổng cộng 5 confirmed,
5 dismissed, 5 uncertain theo nhãn nháp; chưa có người dùng duyệt.

Candidate mô phỏng chọn dòng không rỗng thứ hai hoặc không có candidate;
không chọn theo gold. Vị trí chỉ dẫn phụ thuộc family, không nhãn. Risk và
rule count lấy từ scanner hiện tại. Không gọi model, chưa có finding
Detector thực tế hoặc phép đo pipeline. Schema/parser thực xác nhận
15/15 đáp án nháp hợp lệ; điều đó không chứng minh nhãn đúng.

Đã kiểm tra nguyên vẹn tài sản và so trùng với 406 văn bản tham chiếu/
hàng chờ: chưa thấy cạnh trùng chuẩn hóa hoặc trigram Jaccard>=0.8 giữa
mẫu mới và mẫu cũ. Giữ các biến thể cùng family chung nhóm trước chia.
Chưa rà toàn bộ BIPIA/dev/test/fixture hoặc tương đồng ngữ nghĩa/bản dịch;
không được coi là bảo đảm không rò rỉ hoặc nguồn độc lập.

Nguồn và nháp ở `mau-cho-duyet.jsonl`, phiếu ở `ket-qua-ra-soat.json`.
`van-ban/` chứa nguyên văn; `dau-vao/` chỉ prompt/schema/nguồn trung tính;
`dap-an-nhap/` là target dự kiến. Không đưa metadata hoặc gold vào input.
Nếu sửa khi duyệt, giữ nháp gốc và lưu final_annotation/final_response
trong phiếu. Không chạy prepare để ghi đè dữ liệu đã tạo.

Đọc `manifest.json` và `kiem-tra-trung-va-nhom.json` để xem hash, phạm vi
kiểm tra và giới hạn. Python dùng môi trường E qua wrapper:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/python-verifier.ps1 scripts/audit-vietnamese-verifier-batch.py
```

Audit Python kiểm tra nguồn/nhóm; audit Node kiểm tra đáp án sau duyệt.
Không reset phiếu. Chưa chia train/dev, chưa tokenizer/mask
audit, chưa train và chưa có tài liệu dài/PDF/DOCX. Các ca uncertain thiếu
người nhận hoặc quan hệ tham chiếu thực sự; vẫn cần người duyệt xem
chúng có đủ căn cứ uncertain thay vì công việc thông thường không.
