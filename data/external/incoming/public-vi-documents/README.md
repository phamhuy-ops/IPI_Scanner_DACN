# Nơi nhận tài liệu tiếng Việt công khai

Thư mục này là vùng nhận **chưa duyệt**, không phải tập train/dev/holdout.
Đã tải hai PDF và hai DOCX vào các đợt `nguon-vi-v1` và
`nguon-vi-bo-sung-v1`; cả bốn trích xuất được chữ nhưng còn chờ rà quyền sử
dụng và nội dung. Không cần người dùng tải lại bốn file này. Không tự dùng file từ Downloads hoặc
tài liệu riêng trong cuộc trò chuyện trước làm dữ liệu huấn luyện.

## Đợt bổ sung đề nghị

Mốc 4 tài liệu/2 PDF/2 DOCX đã có trong vùng incoming, chưa phải dữ liệu
đã duyệt. Xem [nguồn và trạng thái](../../../../docs/reports/nguon-tai-lieu-viet-pdf-docx-da-tim.md).

Bắt đầu với 4–6 tài liệu gốc tiếng Việt, có ít nhất hai PDF đọc được chữ và
hai DOCX. Ưu tiên hướng dẫn thao tác/quy trình, thông báo, biên bản mẫu hoặc
tài liệu kỹ thuật có chỉ dẫn cho người thực hiện. Có ít nhất hai đơn vị
nguồn và một tài liệu dài hơn khoảng 8.000 ký tự để kiểm tra phạm vi.

Đây là đợt kiểm tra khoảng trống, **không đủ thay mục tiêu pilot hoặc holdout**.
Nếu cùng nội dung có bản PDF/DOCX, giữ chung một parent/group; không đếm
chuyển định dạng hoặc xuất từ text tổng hợp là nguồn độc lập mới.

## Cần kèm theo

- URL tải gốc, đơn vị/tác giả, ngày hoặc phiên bản tài liệu.
- License hoặc bằng chứng quyền sử dụng lại; truy cập công khai không tự
  có nghĩa được phép đưa vào tập dữ liệu.
- Xác nhận không chứa bí mật/thông tin riêng; chỉ dùng dữ liệu công khai,
  tổng hợp hoặc đã khử thông tin riêng trước khi đưa vào đây.
- Mô tả thay đổi nếu đã khử thông tin riêng hoặc chỉnh sửa. Không cần tự
  cài model, công cụ hay chèn câu tấn công vào file gốc.

Sao chép `nguon-tai-lieu.mau.json` thành file metadata của từng tài liệu và
điền thông tin có thật. Để null nếu chưa biết, không tự đánh dấu đã xác minh.
Khi nhận file sẽ hash, kiểm tra quyền/định dạng, extraction và nhóm trước
khi gán nhãn. Vai trò tập chỉ được quyết định sau đó; không tự gọi là holdout.

Nếu chưa có tài liệu phù hợp, có thể cung cấp URL nguồn công khai để tải và
kiểm tra tự động. Hiện không yêu cầu cài đặt phần mềm thủ công.
