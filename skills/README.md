# Bộ skill cho IPI Scanner

**Mốc mới nhất 05/11:** giữ skill bằng chứng bản lý do ngắn: 15/18, lỗi đầu ra 1 → 0, không mất ca đúng. Đã áp dụng vào caller thử nghiệm, Agent mặc định chưa bật. Ba ca sai ngữ nghĩa vẫn còn; chưa đạt 90% hoặc hoàn thành Ưu tiên 1. Các kết quả bên dưới là lịch sử.

**Cập nhật 05/11:** checkpoint bằng chứng tăng 14/18 → 15/18, giữ làm mốc phát triển. Sáu biến thể mới: cả hai bản 5/6; bản mới có một lỗi cắt đầu ra, chưa chứng minh cải thiện ngoài dev. Người nhận/ngữ cảnh giữ 13/18. Chưa bật Agent, Ưu tiên 1 vẫn mở. Chi tiết trong báo cáo checkpoint ngày 05/11 và selected-profiles.json; các mốc bên dưới là lịch sử.

Ngày soạn: 04/11/2026. Phiên bản: `0.1.0-draft`.

Từ 05/11, ba skill thuộc Ưu tiên 1. Theo yêu cầu mới, đã áp dụng các mốc phát triển cao nhất cùng bộ đo: **người nhận 13/18, ngữ cảnh 13/18, bằng chứng 14/18**. [Manifest đang giữ](selected-profiles.json) ghi prompt/contract/hash và raw; [kết quả sửa tiếp từ mốc tốt nhất](../benchmark/experiments/skills-v1/checkpoint-tot-nhat-2026-11-05.md). Không đưa checkpoint thấp hơn lên thay; Agent mặc định chưa bật skill.

**Đợt 04/11:** đã thử 1.1–1.4 trên 18 ca mỗi nhiệm vụ, ghi riêng lượt dừng; các bản tăng tổng điểm vẫn có regression hoặc lỗi bằng chứng/giải thích. Đã khôi phục ba bản nháp trước đợt sửa, chưa đổi Agent. [Thay đổi, kết quả và lỗi còn lại](../benchmark/experiments/skills-v1/sua-loi-ba-skill.md).

**Gói tham khảo nguồn ngoài mới:** [source-based-v1 — nguồn, phạm vi và ba bản nháp](candidates/source-based-v1/nguon-va-pham-vi.md). Tổng hợp OWASP, Microsoft, NVIDIA NeMo và đặc tả Agent Skills; ghi riêng phần do dự án tự thiết kế. Đã đo đủ A/B ba skill: người nhận 9/12 → 1/12, ngữ cảnh 4/12 → 3/12, bằng chứng 7/12 → 7/12. Cả ba bản mới không đạt điều kiện giữ. [Tổng hợp lỗi và việc sửa tiếp](../benchmark/experiments/skills-v1/tong-hop-loi-source-based-v1.md). Chưa thay các bản dưới đây hoặc cấu hình Agent; không chuyển uy tín của nguồn thành kết luận đã đạt chất lượng. [Kết quả skill bằng chứng](../benchmark/experiments/skills-v1/evidence-sourced-ket-qua.md).

Ba skill này dành cho Agent của sản phẩm, chưa được nạp vào luồng ứng dụng mặc định và không phải skill cài cho công cụ lập trình. Đã chạy kiểm thử thành phần lần đầu: chưa skill nào đủ bằng chứng để tích hợp; xem [kết quả và lỗi từng ca](../benchmark/experiments/skills-v1/ket-qua.md). Chưa khẳng định hiệu quả pipeline hoặc đạt mục tiêu 90%.

Đã thử rút gọn riêng skill người nhận trong hai lượt A/B: điểm tăng 5/14 → 10/14 nhưng làm sai hai ca trước đó đúng nên loại cả hai bản và khôi phục 0.1.0. Xem [đối chứng và quyết định quay lại](../benchmark/experiments/skills-v1/recipient-ket-qua.md). Hai skill còn lại giữ nguyên.

Đã thử tiếp đầu ra tách người thực hiện/hành động, sau đó đối chứng ngôn ngữ hướng dẫn. Bản cấu trúc Việt đạt 5/14; bản Anh đạt 9/14 nhưng có lỗi mới trên tài liệu dài, nên chưa chọn thay bản hiện tại. Xem [báo cáo cấu trúc bằng chứng](../benchmark/experiments/skills-v1/recipient-structured-ket-qua.md). Các ứng viên và raw vẫn được giữ riêng để đối chiếu.

Lượt chọn tham chiếu nguồn đạt 11/14 so với 8/14 ở đối chứng mới, không còn lỗi định dạng/tham chiếu, nhưng tăng 34,6% prompt token nên chưa qua điều kiện giữ. Có một ca từng đúng trong lịch sử bản Anh vẫn sai; chưa chứng minh ổn định. Kết quả được gộp tiếp trong báo cáo trên, skill hiện tại chưa đổi.

Đã giữ chế độ thử nghiệm `--recipient-refs-compact`: gộp đoạn chỉ có khoảng trắng vào đoạn kề, giữ đủ nguồn và offset. A/B 28 request giữ 11/14, giảm 14,2% prompt token so với tham chiếu cũ, không mất ca đúng. Đây là tối ưu đóng gói trong harness; chưa đổi skill/runtime, chưa đạt 90% hoặc kiểm chứng độc lập. Kết quả lượt 4 được gộp trong cùng báo cáo.

Đã mở rộng lên 22 ca để thử hiểu vai trò: bản sửa 15/22 đúng nhãn, nhưng chỉ 14/22 qua rà lý do và làm mất hai ca cũ đúng, nên bị loại. Lượt đo có gián đoạn dài, không dùng chốt latency. Giữ nền compact 0.4.0; xem [kết quả và hạn chế của lượt hiểu vai trò](../benchmark/experiments/skills-v1/recipient-role-ket-qua.md). Tám ca mới vẫn là dev; chưa đủ bằng chứng tăng độ tin cậy để triển khai.

Đã chuẩn hóa [hợp đồng target-v1](../benchmark/experiments/skills-v1/recipient-target-contract.md) và khóa bộ chẩn đoán mới 12 ca/6 tài liệu. A/B đủ 24 request: sai target 5 → 0, đúng toàn nhiệm vụ 3/12 → 8/12, thêm 17 prompt token/request. Giữ ứng viên scope 0.6.0 trong harness để thử tiếp, chưa thay skill/runtime. [Kết quả target](../benchmark/experiments/skills-v1/recipient-target-ket-qua.md) chỉ đo phân loại khi target đã được cung cấp, không đo khả năng Agent tự tìm tấn công hoặc kiểm chứng độc lập.

Đã thử tiếp câu hỏi giả định (0.7.0), ví dụ ngắn (0.7.1) và basis trước nhãn (0.8.0). Hai lượt đủ đều 8/12 so với baseline mới 9/12; lượt ví dụ dừng sau 20 request vì regression. Cả ba bị loại; giữ 0.6.0 trong harness. Chi tiết, raw và biến động giữa các lượt được gộp trong báo cáo target trên; chưa có bản mới đủ bằng chứng để nối vào Agent.

Đối chứng cờ 0.9.0 đạt 5/12 so với 9/12 ở baseline, có 6 lỗi bằng chứng nên bị loại. Bản ràng buộc schema 0.9.1 dừng sau 10 request vì 4 đầu ra bị cắt ở giới hạn 350 token; không có điểm toàn lô. Giữ 0.6.0, không nới validator hoặc giới hạn để nâng điểm. Minh chứng và nguồn schema chính thức được gộp trong báo cáo target.

- [ipi-instruction-recipient](ipi-instruction-recipient/SKILL.md): xác định ai được yêu cầu làm gì; dự kiến dùng ở Detector.
- [ipi-command-context](ipi-command-context/SKILL.md): phân biệt lệnh đang có hiệu lực với nội dung trích dẫn; dự kiến dùng ở Verifier.
- [ipi-evidence-review](ipi-evidence-review/SKILL.md): kiểm tra mức hỗ trợ của bằng chứng; dự kiến dùng ở Verifier, kết hợp validator hiện có.

## Giới hạn và chi phí

Chỉ phần dưới tiêu đề `Chỉ dẫn` của skill được chọn mới là nội dung dự kiến gửi model. Không gửi README, nguồn tham khảo, metadata hoặc cả ba skill vào mọi lượt gọi. Mỗi phần chỉ dẫn có trần biên soạn 2.000 ký tự Unicode; đây không phải số token. Khi tích hợp phải đo token thực tế bằng tokenizer của model/backend, kể cả prompt nền, evidence và đầu ra.

Skill không cấp quyền công cụ, không truy cập mạng, không giải mã hoặc sửa tài liệu, không thay schema/validator, không kết luận thay chính sách gộp kết quả. Không nhận nhãn, đường dẫn, tên bộ benchmark hoặc đáp án. Thiếu ngữ cảnh không tự biến thành benign hoặc uncertain đúng; cần chỉ rõ thông tin thiếu có liên quan. Không truyền lý do/kết luận của Detector làm đáp án cho Verifier.

Đầu ra mô tả trong mỗi skill là thông tin cần có về mặt ngữ nghĩa, chưa phải schema mới. Khi tích hợp sẽ ánh xạ vào hợp đồng hiện có và kiểm thử tương thích, không tự thêm trường khiến parser lỗi. Bằng chứng nguyên văn và offset vẫn do code đối chiếu; model chỉ đánh giá ý nghĩa.

## Nguồn và cách sử dụng

Đã tham khảo trực tiếp các trang chính thức ngày 04/11/2026:

- [Agent Skills Specification](https://agentskills.io/specification): cấu trúc và nạp hướng dẫn theo nhu cầu.
- [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html): ranh giới chỉ dẫn/dữ liệu, indirect injection và kiểm tra nhiều lớp.
- [Anthropic Skills](https://github.com/anthropics/skills): cách tổ chức skill theo nhiệm vụ.

Các trang trên là nguồn tham khảo, không phải bằng chứng ba skill này đã được kiểm chứng. Nội dung được tự viết bằng tiếng Việt cho IPI Scanner, không chép nguyên bộ hoặc chạy script bên ngoài. Nguồn web đang thay đổi; mốc truy cập không phải commit cố định. Khi chốt bản đo cần lưu snapshot/hash nguồn cùng hash skill, code, prompt và model.

## Điều kiện trước khi nối vào Agent

Giữ baseline, chỉ thử một skill mỗi lần trên dev. Có cặp lệnh thật/ví dụ, AI/người đọc, thiếu ngữ cảnh/bằng chứng đầy đủ; thêm cách diễn đạt và vị trí chưa dùng để soạn skill. Kiểm tra tiếng Việt, tiếng Anh, HTML ẩn và tài liệu dài. Các ví dụ trong SKILL.md là minh họa đã biết, không phải holdout.

Đo toàn bộ ca đã chọn: độ đúng, precision/recall/F1/FPR, confusion counts, abstention, lỗi schema/citation, coverage, token và latency/tài nguyên. Lưu raw và trước–sau; giảm điểm thì quay lại bản trước. Sau chọn cấu hình mới khóa bản và đánh giá độc lập, rồi kiểm tra pipeline đầy đủ. Lượt đầu mới đo thành phần trên mẫu tự soạn, chưa thực hiện đánh giá độc lập hoặc pipeline với skill.
