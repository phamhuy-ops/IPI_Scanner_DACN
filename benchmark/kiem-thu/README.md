# Kho kiểm thử tập trung

Cập nhật mới nhất: [chuẩn hóa evidence, đo đủ96 ca:29→31/96 đúng nhãn](../results/agent-eval-96-fLodSV/quality-audit.json). Báo nhầm2/58 và báo sạch sai7/27 không tăng; chưa đạt90%, chưa kiểm chứng độc lập, chưa bật cấu hình thử vào Agent. [Nhật ký tuần3, mục9](../../kế%20hoạch%20-%20nhật%20ký%20tuần/tuan-03.md) ghi kiểm tra đường dẫn, chất lượng citation và ngân sách thời gian mới.

Mới nhất: [v2 qua sàng lọc30 ca nhưng bị loại ở kiểm tra hồi quy HTML; code thử đã gỡ](../results/citation-scan-repro-juP9rL/quyet-dinh.json). [Đối chứng v2](../results/agent-upgrade-30-vGqcwT/quality-audit.json) đúng nhãn10→13/30 trên dev nhỏ, không phải độ đúng mặc định/holdout. Runner đã hỗ trợ hai pha cùng input path và config JSON; [nhật ký mục7](../../kế%20hoạch%20-%20nhật%20ký%20tuần/tuan-03.md) ghi hạn chế đường dẫn và dữ liệu trùng.

Mốc baseline sau hoàn tác prompt: [30 ca/60 request, đúng9/30; recall1/12, còn6 lỗi citation](../results/agent-upgrade-30-xbVu3V/quality-audit.json). Sửa phục hồi batch đã kiểm tra kỹ thuật; bản thử bắt buộc rà từng chunk [bị loại sớm ở11/30 và đã gỡ mã](../results/agent-upgrade-30-MIxicE/quyet-dinh.json). [Nhật ký tuần3](../../kế%20hoạch%20-%20nhật%20ký%20tuần/tuan-03.md) giải thích phạm vi và phần còn thiếu.

Sau dọn 28/10/2026: công cụ đang duy trì qua `scripts/benchmark.cjs`; [danh mục script/audit/snapshot đã nén](../archives/don-dep-2026-10-28/README.md). Các kết quả dưới đây là mốc lịch sử của đúng cấu hình đã đo, không tự đại diện cho mã sau hoàn tác prompt. [Tuần 3](../../kế%20hoạch%20-%20nhật%20ký%20tuần/tuan-03.md) ghi kế hoạch đo tiếp và các nhánh sản phẩm song song.

Đo mới sau nâng cấp người dùng: [30 ca/60 request thật, chất lượng tổng giảm 7/30 → 4/30](../results/agent-upgrade-30-bMiNNH/bao-cao.md). Recall tăng nhưng mất 5 ca sạch đúng; gói mới trượt cổng, chưa mở rộng coverage hoặc đạt90%. Có raw, audit uncertain và bằng chứng từng ca.

Đã hoàn tất: [đối chứng Instruct ở Verifier và Detector, cả hai trượt cổng](doi-chung-instruct-theo-vai-tro.md). Giữ Agent mặc định, lưu raw và mã thử riêng; chưa đạt90%.

Lượt trước: [đã loại thử đổi thứ tự sinh, thêm cổng quyết định và đo nhận biết tối giản](thu-thu-tu-sinh-va-cong-loai-ung-vien.md). Đối chứng Instruct sau đó đã được người dùng cho phép; kết quả ở liên kết đầu trang.

Cập nhật: [đã hoàn tác ứng viên giảm chất lượng, sửa gắn vị trí rule theo hướng khác](hoan-tac-ung-vien-va-sua-vi-tri-rule.md). Mã thử và raw được giữ riêng; không reset các sửa lỗi đã kiểm chứng.

Sửa mới đã áp dụng: [không gộp câu giống nhau ở hai vị trí khác nhau](sua-gop-bang-chung-theo-vi-tri.md), có kiểm tra pipeline mặc định và replay. Chưa chứng minh đạt90%.

Tiến độ hiện tại: [nâng chất lượng Agent, chấm chặt uncertain và sửa đầu ra bị cắt](tien-do-chat-luong-agent-2026-10-28.md). Mục tiêu90% chưa đạt; các ứng viên nhận diện trượt cổng chưa bật mặc định.

Sửa mới: [chặn trích dẫn chỉ có dấu phân cách](sua-cong-trich-dan-2026-10-28.md), đã kiểm tra parser, pipeline đọc tệp và phát lại phản hồi cũ. Chưa chứng minh tăng tỷ lệ nhận diện.

Kết quả mới nhất: [thử nâng cấp chuyển dữ liệu và trích dẫn, đánh giá mục tiêu90%](ket-qua-nang-cap-chuyen-du-lieu.md). Ba lượt đo đã hoàn tất; chưa có cấu hình đủ điều kiện bật mặc định.

Nâng cấp mới: [cổng mâu thuẫn đã áp dụng và kết quả đối chứng kiểm tra hành động](../results/action-audit-Q7bwE4/quyet-dinh.md). Bản thử hành động trượt cổng nên không bật mặc định; không train.

Kết quả mới: [kiểm tra luồng Agent bằng 30 ca/60 request model thật](../results/agent-flow-nv9OXO/sai-sot.md), gồm danh sách sai sót và giải thích. Chưa đo toàn dataset hoặc holdout độc lập.

Đầu mối để xem mẫu, đối chiếu nhãn và lấy số liệu báo cáo. Nguồn gốc và baseline giữ nguyên. Không cộng các bộ thành số nguồn độc lập.

- [Mẫu nhanh](01-mau-nhanh/files): 6 file TXT/MD/HTML; [nhãn và nguồn](01-mau-nhanh/doi-chieu.json).
- [Dev hồi quy](02-dev-72/files): 72 file nguyên văn từ manifest 72 nguồn; [nhãn/span/nguồn](02-dev-72/doi-chieu.json). Đã dùng phát triển, không phải holdout.
- [PDF/DOCX thật](03-pdf-docx/files): 4 bản sao nguyên byte; [trạng thái nguồn](03-pdf-docx/doi-chieu.json). Chưa duyệt nhãn/quyền/riêng tư, không dùng train.
- [Danh mục dataset](04-dataset/README.md): dữ liệu Hugging Face và nguồn ngoài, giữ đường dẫn canonical.
- [Danh mục file CSV](danh-muc-file.csv): đường dẫn, nguồn, nhãn kỳ vọng, vai trò và hash phục vụ báo cáo.
- [Tổng hợp và hash nguồn](tong-hop.json).

Tên file input trung tính; nhãn/đáp án nằm ngoài thư mục files. Không quét cả kho vì sẽ đưa metadata vào input. Bản tập hợp không thay đổi vai trò train/dev/test.
