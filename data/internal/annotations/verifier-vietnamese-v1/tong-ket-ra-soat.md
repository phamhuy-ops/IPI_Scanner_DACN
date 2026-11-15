# Tổng kết rà soát batch tiếng Việt V3

Đã duyệt đủ 15/15 mẫu theo ba lượt, mỗi lượt 5 mẫu. Có 14 quyết định
accept và 1 revise; không còn pending. Nhãn cuối gồm 5 confirmed,
5 dismissed và 5 uncertain, thuộc 5 family. V3-003 sửa lý do theo nội
dung đã trình bày: chưa có số từ bản trước, người thực hiện và nhiệm vụ
gốc; không nói hoàn toàn không biết ô được nhắc tới. Nhãn vẫn uncertain.

Nguồn và nháp giữ nguyên. Accept dùng annotation/response nháp; revise
dùng final_annotation/final_response trong `ket-qua-ra-soat.json`. Phiếu
giữ hash nguồn, hash nháp, xác nhận và thời điểm ghi nhận quyết định.
Manifest gốc mô tả thời điểm trước duyệt; trạng thái cuối ở
`tong-ket-ra-soat.json`. Đây là một người dùng rà soát có hướng dẫn của AI,
chưa phải đánh giá đồng thuận nhiều người.

Đã kiểm tra nguyên vẹn tài sản, ID, thông tin duyệt, nhãn/span, tính nhất
quán và parser sản phẩm: 15/15 đáp án cuối hợp lệ, không có lỗi. Audit
từ vựng không thấy trùng/gần trùng vượt ngưỡng với kho 406 mẫu đã chuẩn
bị; chưa rà toàn bộ BIPIA/dev/test/fixture hoặc tương đồng ngữ nghĩa.
Các biến thể dùng chung family phải ở cùng nhóm trước khi chia tập.

Cộng ba đợt có 72 mẫu ngữ cảnh trong phạm vi: 22 confirmed, 39 dismissed,
11 uncertain; 30 tiếng Việt, 38 tiếng Anh và 4 tiếng Trung. Hai mẫu direct,
một mẫu mixed của lượt 02 và 20 mẫu tham chiếu cũ vẫn giữ riêng. Đây là
thống kê nhãn đã duyệt, không phải tập train được xuất hoặc bộ kiểm chứng
độc lập. Chưa đạt kế hoạch 300 mẫu, chưa bảo đảm số nhóm tài liệu đủ lớn.

Chưa train, chưa thay runtime. Bước tiếp là chuẩn hóa bằng chứng/span và
hợp đồng đầu ra cho 27 mẫu nguồn ngoài đã duyệt, kiểm tra toàn kho và các
nhóm trước khi chốt split; tiếp tục mở rộng nguồn độc lập, tài liệu dài và
biến thể thực tế. Không được nâng một bucket dev đã dùng thành holdout.

Lệnh tại gốc dự án:

```powershell
node scripts/audit-reviewed-verifier-batch.cjs benchmark/data/annotations/verifier-vietnamese-v1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/python-verifier.ps1 scripts/audit-vietnamese-verifier-batch.py
```
