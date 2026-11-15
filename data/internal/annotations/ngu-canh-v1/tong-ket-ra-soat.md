# Tổng kết lượt rà soát bộ nhãn v1

Hoàn tất ngày 2026-10-24: 20/20 mẫu đã được người dùng xác nhận qua trao đổi
trong chat, gồm 19 chấp nhận đề xuất và 1 sửa nhãn. Không còn mẫu pending.
Kết quả nằm trong [phiếu quyết định](ket-qua-ra-soat.json), bản tổng hợp máy
đọc ở [tong-ket-ra-soat.json](tong-ket-ra-soat.json).

Nhãn sau rà soát: 10 benign, 9 malicious, 1 uncertain. Giữ 12 nhóm thủ công,
12 mẫu tiếng Anh và 8 tiếng Việt. Không chia tập hoặc chạy huấn luyện.

Điều chỉnh được người dùng xác nhận: ann-004 giữ benign/dismissed và
quoted_example/data_disclosure, nhưng người nhận đổi từ assistant sang
unclear vì câu được trích không nêu rõ đích nhận. Đáp án sửa nằm ở
final_annotation; dữ liệu nháp và hash ban đầu không bị đổi. Khi đọc đáp án
cuối phải ưu tiên final_annotation cho decision=revise, không lấy nhãn nháp
thay cho quyết định được duyệt.

Ann-012 giữ uncertain vì thiếu nhiệm vụ gốc và ranh giới ngữ cảnh; source_label
malicious của dataset được giữ nguyên. Không dạy rằng chỉ hành vi gây hại
hoặc giấu việc gửi mới là IPI: chuyển hướng nhiệm vụ từ dữ liệu cũng có thể
là IPI, còn thông báo thao tác không tự tạo quyền thực hiện.

Đây là **rà soát có xem đề xuất và giải thích của AI**, không phải gán nhãn
độc lập/mù hay đánh giá mức đồng thuận giữa nhiều người. Một số ca chỉ được
trình bày đoạn chính cùng mô tả/link toàn văn. Không mặc định người dùng đã
đọc từng dòng của mọi tài liệu hoặc kiểm tra mọi offset. Phạm vi xác nhận
được ghi trong notes của từng mẫu; công cụ chỉ kiểm tra cấu trúc/nguồn.

Audit cuối: `benchmark/results/annotation-audit-5ltMFV/summary.json`, không
có lỗi, human_review_complete=true, fine_tuning_ready=false. Nhãn và văn bản
nháp giữ nguyên hash; chỉ phiếu quyết định thay đổi. Không có kết quả mới về
precision/recall hay cải thiện bảo mật từ việc hoàn tất rà soát.

Bước tiếp là chốt kế hoạch pilot cho một model: phạm vi nhãn/đáp án cần học,
nguồn được dùng lại, mở rộng dữ liệu và cách giữ nhóm/tập kiểm chứng độc lập.
Hai mươi mẫu này là bộ tham chiếu quy trình; chưa đủ để tự động fine-tune,
chưa xuất train, chưa chọn lại Verifier hoặc thêm phản biện.
