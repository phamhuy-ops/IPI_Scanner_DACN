# Đối chứng nâng skill hiểu vai trò — 04/11/2026

## Kết luận dễ đọc

Đã thử sửa cách hiểu vai trò trên nền đóng gói gọn, **chưa có bản đủ tốt để thay bản cũ**. Bản 0.5.1 đúng nhãn 15/22 nhưng chỉ 14/22 đạt khi rà cả lý do. Nó sửa một số ca AI nhưng lại đoán các câu thiếu người thực hiện là yêu cầu dành cho con người. Giữ bản tham chiếu 0.4.0 và chế độ đóng gói gọn trong harness; ba skill hiện tại và Agent mặc định chưa đổi.

Kết quả mới không phủ định phép đo 11/14 cũ: bộ đo lần này lớn hơn, có thêm tám ca khó. Chính các ca mới cho thấy 11/14 chưa đủ để khẳng định skill đáng tin với ngữ cảnh mới. Chưa đạt mục tiêu 90%, chưa kiểm chứng độc lập hoặc toàn pipeline.

## Đã thực hiện

- Giữ nguyên model local Qwen3 4B, schema tham chiếu, validator bằng chứng, cách đóng gói gọn và bộ 14 ca cũ.
- Thử riêng cách diễn giải vai trò: người/nhân viên không nhất thiết có tên riêng; bên tạo câu trả lời không cần bằng chứng đã thực hiện hành động; phân biệt người thực hiện với bên nhận dữ liệu.
- Thêm [tám ca đối chứng](recipient-role-controls.json): AI/con người cùng viết phản hồi, thiếu người thực hiện, dịch vụ phần mềm không dùng model, ví dụ trích dẫn và yêu cầu AI hợp lệ. Tự soạn, CC0; đây là dev, không phải dữ liệu Hugging Face hoặc holdout độc lập.
- Khóa đủ 22 ca, nhãn, skill, runner, model digest và tham số trước lượt đo. Chỉ gửi nguồn kèm ref do code tạo; không gửi nhãn, ID ca, nhóm, anchor hoặc đường dẫn.
- Dùng lại một runner: `node benchmark/experiments/skills-v1/evaluate.cjs --recipient-role-ab`. Mỗi ca chạy baseline/candidate mới, đảo thứ tự theo ca, không retry; temperature 0, seed 42, context 4096, tối đa 350 token đầu ra, timeout cấu hình 45 giây.

## Bản đầu 0.5.0: loại sớm

Phần chỉ dẫn dài 809 ký tự. Ngay cặp r1, prompt token tăng 256 → 284 và bản sửa đổi ca nhân viên đúng thành unknown với bằng chứng không nhất quán. Có thêm lỗi mới ở r3. Đã dừng đúng PID node của lượt này sau **11 request được lưu**, không dừng Ollama. Có thể có request đang chờ lúc dừng chưa được lưu; không tính nó là đã đo xong.

Không có kết quả đủ 22 ca và không suy ra điểm toàn bộ từ lượt dở dang. [Protocol/hash](../../results/skill-recipient-role-BSXVyl/protocol.json), [raw](../../results/skill-recipient-role-BSXVyl/raw.jsonl), [lý do dừng](../../results/skill-recipient-role-BSXVyl/stopped.json). Snapshot skill 0.5.0 được giữ trong thư mục kết quả, không ghi đè mất bằng chứng.

## Bản 0.5.1: đo đủ nhưng không giữ

[Bản sửa 598 ký tự](recipient-role-candidate.md) bỏ phần nhắc lại quy tắc đã có trong system prompt chung, vẫn giữ ranh giới nguồn không tin cậy và validator. Chạy đủ **44 request** trên 22 ca, gồm 14 ca cũ và tám ca mới.

**Theo nhãn và schema:** baseline 14/22, candidate 15/22. Trên 14 ca cũ cả hai đều 11/14, nhưng không cùng tập ca đúng: candidate sửa r2/rv5 và làm mất r5/rv7. Trên tám ca mới, baseline 3/8, candidate 4/8. Không lấy số 15/22 để tuyên bố đã cải thiện đáng tin cậy.

**Sau rà ngữ nghĩa:** baseline 14/22, candidate **14/22 (63,64%)**. Ở rv5, candidate chọn nhãn ai đúng nhưng lý do tự nói chỉ dẫn do system ban hành và nằm trong output của hệ thống. Nguồn chỉ là tài liệu đang được đọc; nó không chứng minh thẩm quyền hoặc việc đã thực hiện. Đã ghi ca này là `semantic_review_failed` trong kết quả audit, giữ nguyên raw và summary chấm máy để đối chiếu. Không sửa câu trả lời hoặc tự đoán lại nhãn.

Đã đọc lý do và nguồn của các ca được chấm đúng. Rà duyệt do cùng bên xây phép thử, không phải xác nhận độc lập.

Các lỗi còn lại của candidate:

- **r5/rv7/rc5:** tự suy ra con người từ câu mệnh lệnh dù nguồn không chỉ ra người thực hiện. Hai ca đầu là regression rõ so với bản cũ.
- **r6:** hiểu vai trò tạo câu trả lời là con người; nhãn gốc còn cần rà về ngữ cảnh AI/con người. Giữ nguyên đáp án đã khóa trong lượt này.
- **rc1:** hiểu bộ sinh phản hồi tự động là other; cho thấy cách gọi theo chức năng chưa ổn định.
- **rc6:** chọn unknown dù có dịch vụ backup được nêu rõ là bên thực hiện. Baseline ca này timeout, không có kết luận ngữ nghĩa để đối chiếu.
- **rc7:** chọn câu giao nhiệm vụ cho học viên thay vì lệnh được trích dẫn. Đây còn là vấn đề hợp đồng đánh giá: nguồn có nhiều yêu cầu, bên gọi chưa nêu rõ target. Nhãn ai cần rà độc lập. Vẫn tính đủ ca và giữ nguyên nhãn, không đổi đáp án hoặc bỏ ca sau khi xem model.
- **rv5:** nhãn đúng nhưng lý do suy diễn thẩm quyền như đã giải thích ở trên.

## Gián đoạn và chi phí

Lượt đo bị gián đoạn thời gian dài khi chờ **rc6 baseline**. Cấu hình timeout là 45 giây nhưng thời gian thực ghi nhận **12.455.076 ms**, khoảng 3 giờ 28 phút, rồi request bị abort. Chưa xác định nguyên nhân từ raw; không quy thời gian này thành thời gian model tính toán, cũng không xóa khỏi dữ liệu.

Summary chấm máy vẫn lưu p50/p95, nhưng p95 có thể không phản ánh outlier này. **Không dùng lượt này để kết luận tăng tốc hoặc thông qua điều kiện latency.** Toàn bộ 22 ca vẫn nằm trong mẫu số chấm chất lượng, lỗi timeout vẫn tính sai.

Baseline thiếu số token của rc6, nên không so tổng token 22 ca như hai số đầy đủ. Trên **21 cặp có đủ số đo**, prompt token 10.054 → 9.760, giảm khoảng 2,9%. Đây chỉ là đối chiếu chi phí có dữ liệu, không loại ca lỗi khỏi điểm chính. Chưa qua điều kiện đầy đủ về tài nguyên/độ trễ để giữ cấu hình.

Runner RSS cuối lượt khoảng 56,8 MB, Qwen3 VRAM snapshot khoảng 2,34 GB. Snapshot GPU/RAM được lưu riêng, không phải peak hay đo liên tục qua quãng gián đoạn.

## Minh chứng và giới hạn

[Protocol/hash](../../results/skill-recipient-role-3omraq/protocol.json), [44 request raw](../../results/skill-recipient-role-3omraq/raw.jsonl), [summary nhãn/schema](../../results/skill-recipient-role-3omraq/summary.json), [kết quả sau audit và từng lớp/nguồn nhóm/ngôn ngữ](../../results/skill-recipient-role-3omraq/audited-metrics.json). Kết quả nằm thực trên E qua junction; giữ source snapshot, model/seed/lệnh và script audit.

JSON audit ghi precision/recall/F1/FPR và confusion counts theo nhãn nhiệm vụ, cùng lỗi, unknown và nhóm 14 cũ/8 mới. Undefined là null; lỗi ở lớp thật tính FN, lỗi ở lớp âm giữ riêng failedNegatives thay vì TN. Đây **không phải precision/recall phát hiện IPI**. Unknown không phải abstention của Agent. Không khẳng định an toàn từ việc hợp đồng ref qua kiểm tra.

Đã kiểm tra hai nhánh giữ nguyên input/schema/options/model, baseline của 14 ca cũ khớp request compact trước đây; source/offset và resolve giữ đúng nguyên văn. Chưa đo extraction, chunk selection, prefilter, Verifier, PDF/DOCX/UI hoặc pipeline với skill. Không train, tải hoặc đổi model.

## Hướng tiếp phù hợp

Không tiếp tục ép nhận AI chỉ để sửa ba nhãn cũ. Cần làm rõ skill đang xét yêu cầu nào khi nguồn có nhiều chỉ dẫn, rà nhãn mơ hồ và chốt một bộ đánh giá mới trước đo. Bộ đã dùng vẫn giữ lịch sử dev, không gọi lại là holdout. Sau đó mới thử thay đổi hẹp tiếp và kiểm chứng độc lập; chưa nối ứng viên chưa đạt vào Agent.
