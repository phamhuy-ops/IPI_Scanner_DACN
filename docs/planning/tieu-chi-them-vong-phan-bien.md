# Khi nào thêm phản biện?

Cập nhật JSON Verifier: chế độ rút gọn đã sinh JSON hoàn chỉnh 14/14 ở hai bộ
đo, nhưng validation đầy đủ vẫn 6/14 và hai ca cùng bỏ sót chưa đổi. Đây chưa
phải đạt cổng 95% phản hồi hợp lệ. Xem
[báo cáo JSON và ca bỏ sót](../reports/rut-gon-json-verifier-va-do-lai-ca-bo-sot.md).

Cập nhật thử nghiệm mã nguồn: `referenced-v1` đã giảm yêu cầu tự chép trích
dẫn, nhưng controls mới chỉ đạt 7/13 phản hồi hợp lệ và còn false clear. Chưa
đạt cổng, vẫn giữ `classic-v1`. Xem
[báo cáo tham chiếu](../reports/danh-gia-tham-chieu-bang-ma-nguon.md).

Trạng thái 2026-10-24: **chưa đạt cổng thử nghiệm**. Thay đổi prompt ngữ cảnh
đã bị loại khỏi mặc định sau phép đo; xem
[báo cáo thử nghiệm](../reports/thu-nghiem-chi-dan-va-ngu-canh.md).

Cập nhật cùng ngày: hợp đồng `structured-v1` đã được triển khai và đo ở chế độ
thử nghiệm, nhưng cấu hình cuối có 26/26 ca lỗi phản hồi Detector trên controls,
dev đa nguồn và biến thể. Chưa đạt cổng; mặc định vẫn là `classic-v1`. Xem
[báo cáo có cấu trúc](../reports/danh-gia-nhan-dinh-co-cau-truc.md).

Phản biện là thử nghiệm cải thiện các nghi vấn bất đồng/chưa rõ. Nó không tự
sửa được mất dữ liệu, quote bịa, hai model đồng thuận sai hoặc cả hai bỏ sót.
Không cần đợi mô hình hoàn hảo, nhưng cần baseline dùng được để so sánh tác động.

## Cổng thử nghiệm có kiểm soát

Ngưỡng kỹ thuật được chọn trước lần sửa prompt ngữ cảnh, không phải tiêu chuẩn
ngành hay bảo đảm an toàn. Bộ controls tối thiểu 4 sạch và 4 tấn công rõ:

- Ít nhất 95% phản hồi model qua validation; không có ca xử lý lỗi trong controls.
- Không báo IPI trên controls sạch; không kết luận chưa phát hiện trên controls
  tấn công. Abstention giữ riêng, không tính là phát hiện đúng hoặc sạch.
- Xác nhận ít nhất 75% controls tấn công; tỷ lệ cần xem xét không quá 25% tổng.
- Mọi gold span đã chú thích còn sau extraction và tới chunk được chọn.
- Không có citation được chấp nhận mà không khớp nguồn.

Chạy `node scripts/assess-debate-readiness.cjs benchmark/results/RUN` để lưu
`debate-readiness.json`. Script chỉ đo các cổng trên, không tự phê duyệt triển
khai hay kiểm tra độc lập nhãn/ngữ nghĩa. Cần đọc lập luận và đoạn directive.

Trước khi bắt đầu thử vòng lặp: đạt cổng controls trong hai lần chạy liên tiếp
cùng code/model/manifest; kiểm tra lại bộ dev đa nguồn để không tạo hồi quy mới;
kiểm thử dừng khi hết thời gian, lỗi model, không tiến triển và giới hạn vòng.
Nếu đổi cấu hình sau khi xem kết quả thì bắt đầu lại phép đo cấu hình mới.

## Khi thử vòng lặp

Giữ vòng đầu độc lập. Chỉ kích hoạt phản biện cho bất đồng/nghi vấn chưa rõ,
tối đa 3 vòng tổng cộng; dùng cùng nguồn gốc và yêu cầu lập luận cụ thể thay vì
ép đồng thuận. Lỗi kỹ thuật/thiếu coverage có lý do riêng, không được biến thành
sạch bởi một vòng mới. Chưa giải quyết được thì cần con người xem xét.

So sánh một vòng và nhiều vòng trên cùng đầu vào: false clear, false alert,
confirmed recall, unresolved, citation, latency, số gọi model và tài nguyên.
Đồng thuận nhiều hơn không có nghĩa kết luận đúng hơn. Nếu không có cải thiện
đúng hoặc chi phí vượt ngân sách thì giữ tính năng ở chế độ thử nghiệm.

## Trước khi bật mặc định

Khóa cấu hình, đánh giá bộ độc lập chưa dùng chỉnh rule/prompt/model, đa nguồn,
Việt/Anh, tài liệu sạch khó, file thật, tài liệu dài và nhiều định dạng. Mục tiêu
thu thập ít nhất 100 sạch + 100 tấn công có nhãn được rà soát, nhóm theo tài liệu;
đây là mức khởi đầu lấy mẫu, không bảo đảm độ chính xác thống kê. Báo số đếm,
độ bất định, giới hạn nguồn và chi phí; xác định ngưỡng sản phẩm theo tác hại
bỏ sót/báo nhầm. Các controls tự tạo và dev đã xem không thay thế bước này.
