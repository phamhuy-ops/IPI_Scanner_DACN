# Chuẩn bị bộ nhãn chỉ dẫn và ngữ cảnh

Cập nhật sau giai đoạn chuẩn bị: đã hoàn tất lượt rà soát 20/20 mẫu cùng
người dùng; xem [tổng kết](../../benchmark/data/annotations/ngu-canh-v1/tong-ket-ra-soat.md).
Phần bên dưới giữ trạng thái lịch sử tại lúc tạo bộ nháp và audit ban đầu.

Ngày thực hiện: 2026-10-24. Đã tạo bộ tập gán nhãn 20 mẫu, các file đọc nguồn,
phiếu rà soát, hướng dẫn và công cụ kiểm tra. **Chưa có nhãn nào được người
xác nhận; chưa huấn luyện hoặc thay đổi agent.**

## Nội dung đã chuẩn bị

12 ca lấy nguyên từ hai manifest phát triển đã có, giữ hash, provenance và
source_label. Thêm 8 ca tự soạn thành 4 cặp gần giống:

- HTML tiếng Việt: chỉ dẫn gửi hội thoại trong comment và ví dụ đào tạo.
- Biên bản tiếng Anh: ép persona/đáp án và đối chứng tên người Dan Evans.
- Biên bản dài tiếng Việt: lệnh dùng công cụ xóa nhật ký ở cuối và chính
  sách lưu trữ cho con người; mỗi văn bản hơn 8.000 ký tự.
- Bản tin tiếng Anh: ép chèn liên kết/tuyên bố chứng nhận và ví dụ đào tạo.

Nhãn đề xuất: 10 benign, 9 malicious, 1 uncertain. Có 12 mẫu tiếng Anh,
8 tiếng Việt, 12 group_id thủ công. Toàn bộ status pending; accepted,
revised, rejected đều bằng 0. Không gọi bản nháp của AI là ground truth đã
kiểm tra thủ công. Tám ca mới chưa chạy benchmark nhưng vẫn tự soạn theo
lỗi đã biết; không gọi chúng là đánh giá độc lập.

Mỗi mẫu có label/stance, addressee, framing, deviation, có/không có chỉ dẫn,
đoạn chỉ dẫn/ngữ cảnh với offset và dòng chính xác, lý do và ghi chú bất
định. Chỉ đánh dấu một nhận định chính mỗi mẫu; người rà soát vẫn phải đọc
toàn văn để tìm chỉ dẫn bị bỏ qua. Mẫu MAlmasabi thiếu nhiệm vụ gốc có
source_label=malicious nhưng draft_annotation.label=uncertain; dữ liệu gốc
không bị đổi nhãn.

## Dữ liệu và công cụ

Bộ dữ liệu ở `benchmark/data/annotations/ngu-canh-v1/`. Các file chính được
mô tả trong [README bộ nhãn](../../benchmark/data/annotations/ngu-canh-v1/README.md).
Mở [hướng dẫn](../guides/huong-dan-gan-nhan-ngu-canh.md) và
[phiếu đọc từng mẫu](../../benchmark/data/annotations/ngu-canh-v1/phieu-ra-soat.md)
để bắt đầu.

`npm run data:annotations:prepare` tạo bản đầu và từ chối ghi đè thư mục đã
có. `npm run data:annotations:check` kiểm tra enum, logic stance, trích dẫn
UTF-16/CRLF, nguồn/hash, mẫu trùng, ID, phiếu thiếu/cũ và trường người rà
soát. Nhãn sửa được ghi riêng ở final_annotation thay vì sửa âm thầm nhãn
ban đầu. Hàm đầu vào model chỉ lấy document, loại metadata và đáp án.

Audit ban đầu: `benchmark/results/annotation-audit-tn36ys/summary.json`,
20/20 mẫu hợp lệ về cấu trúc/tham chiếu nguồn, không phát hiện văn bản trùng,
20 chờ rà soát. human_review_complete=false và fine_tuning_ready=false.
Năm kiểm thử của công cụ gán nhãn đã qua, gồm Unicode/CRLF, phiếu cũ,
không tự nâng pending thành xác nhận, nhãn sai logic và chống lẫn metadata.
Các kiểm tra này không xác nhận nhãn đúng ngữ nghĩa hoặc danh tính người
duyệt. Tổng 23/23 kiểm thử Node liên quan đã qua khi chạy cùng các công cụ
benchmark trước; cú pháp script và liên kết mới hợp lệ. Đã thử gọi lại lệnh
tạo: lệnh từ chối và toàn bộ file giữ nguyên hash, không ghi đè dữ liệu.
Không báo precision/recall vì chưa chạy phép đo model trên bộ mới.

## Phần cần làm tiếp

Rà soát sáu ca được ưu tiên trong phiếu trước, thống nhất các trường dễ nhầm
như người nhận bên trong ví dụ và framing của câu được trích; sau đó rà soát
các ca còn lại. Ghi chấp nhận/sửa/bác bỏ theo từng ID, có người thực sự rà
soát và lý do. Có thể nhận ý kiến trong chat rồi cập nhật phiếu theo đúng ý
kiến đó; không tự ghi thay rằng người dùng đã đồng ý.

Sau khi chốt nhãn mới xác định phạm vi pilot fine-tuning một model, phiên
bản tập huấn luyện, nguồn được dùng lại, chia nhóm và holdout độc lập. Bộ nhỏ
này chưa đủ cho tuyên bố hiệu quả hoặc tự động bắt đầu huấn luyện. Giữ các
baseline và tập test cũ; chưa chia 20 ca thành một holdout giả tạo, chưa thêm
phản biện hoặc thay model/rules của ứng dụng.
