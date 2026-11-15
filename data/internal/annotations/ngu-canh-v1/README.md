# Bộ tập gán nhãn chỉ dẫn và ngữ cảnh v1

Đây là 20 mẫu ban đầu do AI chuẩn bị; **đã hoàn tất lượt rà soát với người
dùng**: 19 chấp nhận, 1 sửa, không còn pending. Xem
[tổng kết rà soát](tong-ket-ra-soat.md). Mục đích là thống nhất cách hiểu nhãn
trước khi chuẩn bị dữ liệu fine-tuning. Chưa có model được huấn luyện, chưa
có train/test hoặc đánh giá chất lượng nhận diện từ bộ này.

Bắt đầu tại [phiếu đọc từng mẫu](phieu-ra-soat.md) và
[hướng dẫn rà soát](../../../../docs/guides/huong-dan-gan-nhan-ngu-canh.md).

- `mau-cho-duyet.jsonl`: văn bản đầy đủ, provenance, nhóm và nhãn đề xuất.
- `van-ban/`: bản đọc riêng từng nguồn, tên trung tính ann-001…ann-020.
- `ket-qua-ra-soat.json`: nơi người rà soát ghi chấp nhận/sửa/bác bỏ; ban đầu
  tất cả pending, reviewer/thời gian/quyết định đều null.
- `manifest.json`: mã băm, số lượng, quy ước vị trí và giới hạn.
- `phieu-ra-soat.md`: bản đọc dễ xem; hiển thị nhãn **nháp**, không tự cập
  nhật theo phiếu JSON khi một người đã duyệt.

Phân bố nháp: 10 benign, 9 malicious, 1 uncertain; 12 tiếng Anh và 8 tiếng
Việt. 12 ca lấy nguyên từ manifest dev đã đo; 8 ca mới tự soạn theo 4 cặp
tấn công/đối chứng. Có HTML, tên người Dan Evans, ví dụ đào tạo, thao túng
câu trả lời và cặp tài liệu dài hơn 8.000 ký tự với lệnh ở cuối.

Có 12 group_id thủ công, giữ cặp dùng chung nguồn/câu chỉ dẫn và bản dịch
cùng nhóm. Chưa chia tập và chưa chứng minh hết tương đồng ngữ nghĩa. Tám
ca mới chưa chạy model benchmark nhưng là dữ liệu tự soạn theo lỗi đã biết,
không phải holdout độc lập.

Kiểm tra bằng `npm run data:annotations:check`. Lệnh tạo báo cáo riêng dưới
`benchmark/results/annotation-audit-*`, không sửa nhãn hoặc trạng thái duyệt.
Không có lỗi cấu trúc không có nghĩa nhãn đã đúng ngữ nghĩa. Báo cáo sẽ giữ
`fine_tuning_ready=false` vì phiên bản này chỉ là bộ tập gán nhãn.

Lệnh tạo `npm run data:annotations:prepare` từ chối khi thư mục v1 đã có,
tránh ghi đè công sức rà soát. Không xóa v1 để chạy lại. Muốn đổi văn bản hoặc
quy tắc gán nhãn phải tạo phiên bản mới, giữ mã băm và bản cũ để đối chiếu.

Nguồn/license được giữ theo từng mẫu; không gộp thành một license mới. MIT
của NotInject/realistic là khai báo từ card cục bộ; MAlmasabi khai báo
CC-BY-SA-4.0. Tài liệu dự án và mẫu tự soạn chưa xác nhận giấy phép phát hành
tập huấn luyện. Đây là trạng thái provenance, chưa xác nhận quyền sử dụng cho
mọi mục đích hoặc điều kiện của model sau fine-tuning.
