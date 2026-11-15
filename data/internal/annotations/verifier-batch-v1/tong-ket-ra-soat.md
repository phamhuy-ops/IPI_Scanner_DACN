# Tổng kết rà soát batch Verifier đầu tiên

Đã duyệt 30/30 mẫu trong cuộc trò chuyện: 26 chấp nhận bản nháp, 4 duyệt
có sửa đổi, không còn mẫu chờ. Nhãn cuối gồm 12 malicious/confirmed,
12 benign/dismissed và 6 uncertain; 15 mẫu tiếng Việt, 15 tiếng Anh,
thuộc 10 nhóm tình huống. Đây là rà soát có hướng dẫn của AI bởi một
người dùng, chưa phải đánh giá đồng thuận nhiều người gán nhãn.

Các sửa đổi đã được người dùng chấp nhận:

- vf-011, vf-013, vf-016: dòng giữ biên nhận có chỉ dẫn cho con người.
  Assessment vẫn dismissed nhưng đổi sang human/active/none/hasDirective=true.
- vf-012: lý do phải thừa nhận nguồn đã nêu nhóm kiểm toán; thông tin
  thiếu là người thực hiện, phạm vi bản ghi và quyền chuyển.

vf-006 từng được mở lại theo yêu cầu người dùng và sau đó chốt lại
confirmed. Lịch sử được giữ trong `review_history`, không xóa quyết định cũ.

Nguồn, nhãn nháp, input và JSON nháp giữ nguyên. Đọc quyết định trong
`ket-qua-ra-soat.json`: accept dùng bản nháp; revise dùng `final_annotation`
và `final_response`. Không dùng riêng nháp làm đáp án cuối. `manifest.json`
và trường validation trong hàng nháp phản ánh thời điểm tạo nháp; trạng
thái sau duyệt nằm ở `tong-ket-ra-soat.json`.

Đã kiểm tra hash, ID, thông tin duyệt, span nguồn, tính nhất quán nhãn và
parser sản phẩm: 30/30 đáp án cuối hợp lệ, không có lỗi. Tái kiểm tra:

```powershell
node scripts/audit-reviewed-verifier-batch.cjs
```

Không dùng lệnh prepare để ghi đè phiếu đã duyệt. Lệnh kiểm tra tái lập
nháp cũ sẽ nhận ra thay đổi có chủ đích ở phiếu/thẻ duyệt, không thay thế
audit sau duyệt ở trên.

Chưa huấn luyện hoặc xuất tập train. Bộ này chỉ gồm mẫu ngắn tự soạn,
candidate mô phỏng, không phải nguồn độc lập hoặc holdout. Còn cần mở
rộng dữ liệu có quyền sử dụng, rà gần trùng toàn kho, chia theo nhóm và
kiểm tra tokenizer/completion mask. Hai mươi mẫu tham chiếu cũ vẫn giữ
riêng; chưa đổi rule, model, prompt hoặc chính sách mặc định của ứng dụng.
