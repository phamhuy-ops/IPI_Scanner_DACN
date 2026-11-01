# Tự đánh giá dữ liệu Verifier theo tiêu chí đã thống nhất

Người dùng đã đồng ý để Codex tự đánh giá các mẫu tiếp theo. Chỉ đưa lại
người dùng ca cần thêm thông tin thực sự hoặc cần thay đổi cách hiểu nhãn;
không yêu cầu duyệt lại hàng loạt ca rõ ràng.

## Tiêu chí ngữ nghĩa

- `confirmed`: nguồn đang chỉ dẫn assistant và có lệch hành vi cụ thể như
  thay đáp án, bỏ nhiệm vụ, tiết lộ dữ liệu hoặc dùng công cụ ngoài thẩm quyền.
- `dismissed`: ngữ cảnh đủ rõ là ví dụ trích dẫn, mô tả hoặc hướng dẫn con
  người; phải giữ cả dấu hiệu bao khung, không chỉ nhìn từ nguy hiểm.
- `uncertain`: thiếu ngữ cảnh thật để xác định người nhận, hành vi hoặc quyền;
  không tự bổ sung ý định người dùng. Bất đồng gán nhãn chưa giải quyết là
  lý do cách ly, không tự chuyển thành uncertain.

Đánh giá nhãn nguồn, bảo toàn ngữ cảnh cửa sổ, độ đúng span và chất lượng
văn bản là các việc riêng. Nhãn hợp lý không làm lỗi nguồn tự biến mất.

## Ghi nhận và giới hạn sử dụng

Lưu reviewer là AI cho mọi quyết định Codex tự đưa ra. Giữ nguyên xác nhận
của người dùng cùng phạm vi và hash của phiên bản họ đã xem. Sửa text phải
có phiên bản mới; không chuyển xác nhận con người ở bản cũ thành xác nhận
cho bản sửa. Dùng hash nguồn/cửa sổ/nhãn để phát hiện quyết định đã cũ.

Đây là AI đánh giá trong cuộc trò chuyện, không phải một bộ phân loại tự
động đã được đo độ chính xác. Không dùng việc AI đồng ý nhãn mình soạn
để chứng minh chất lượng độc lập hoặc tự cấp quyền train/holdout.

Ca lỗi nguồn hoặc mất ngữ cảnh được cách ly. Sửa lỗi cơ học rõ ràng bằng
bản mới, bảo toàn câu trọng tâm và bao khung trích dẫn; so với đối chứng
confirmed/dismissed/uncertain, kiểm tra parser, token/mask và nhóm nguồn.
Ca sửa vẫn thuộc nguồn cha, không tăng số nguồn độc lập. Chưa có nhãn cho
cửa sổ nền thì không tự gán benign.

Các điều kiện train/dev/holdout, backend/collator và Ưu tiên 1 vẫn áp dụng.
Quy trình này không thay policy kết luận hoặc mặc định của ứng dụng.
