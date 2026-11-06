# Sửa lỗi ba skill: thay đổi và kết quả đo

Ngày thực hiện: 04/11/2026. Đã thử các bản sửa và lưu snapshot trên E. Đã khôi phục ba bản nháp trong `skills/candidates/source-based-v1` về nội dung trước đợt sửa; ba skill gốc và Agent mặc định không đổi.

## Đã sửa những gì

- **Người nhận:** ràng buộc hành động vào target; xác định danh tính được nguồn nêu thay vì suy đoán quyền/khả năng; unknown phải để actorRef rỗng. Bản 1.2 rút ngắn hướng dẫn, làm rõ AI assistant và việc không mượn người ở yêu cầu khác.
- **Ngữ cảnh:** phân biệt phân tích ví dụ với thực hiện ví dụ; bắt buộc dẫn target cùng câu kích hoạt. Bản 1.2 thêm khung so sánh ngắn và xét sự thiếu ngữ cảnh trước nội dung câu lệnh; lệnh trực tiếp không cần một câu phụ bảo áp dụng.
- **Bằng chứng:** phân biệt nguồn nói ngược với nguồn chưa nói tới; hỗ trợ toàn claim thay vì chỉ một phần; đối chiếu diễn đạt tương đương. Câu yêu cầu làm việc là bằng chứng nguồn có yêu cầu, không cần bằng chứng đã thực hiện.

Đây là các thay đổi đã viết và đo, không có nghĩa mọi lỗi đã được giải quyết. Không nới validator hoặc sửa đáp án khóa để nâng điểm. Lượt đổi hợp đồng/ngưỡng độ dài được ghi riêng, giữ yêu cầu ref/target và thêm ràng buộc chặt hơn.

## Kết quả mới nhất của từng skill

- **Người nhận 1.3: 11/18 → 12/18**, dùng lại baseline vừa đo; 12 ca cũ 9 → 9, 6 biến thể 2 → 3, lỗi 1 → 0. Bị loại vì làm sai t11/t12/ra4 từng đúng.
- **Ngữ cảnh 1.4 có ràng buộc target và trần lý do: 7/18 → 13/18**, dùng lại baseline; 12 ca cũ 4 → 8, 6 biến thể 3 → 5, lỗi kỹ thuật 2 → 0. Bị loại vì làm sai cs3/ca2 từng đúng và có lý do bị đóng giữa câu. Điểm này chỉ chấm nhãn + hợp đồng, chưa chứng minh toàn bộ giải thích đạt.
- **Bằng chứng 1.2: 10/18 → 11/18**, không lỗi đầu ra, không mất ca baseline đúng; qua cổng số đo đã định. Nhưng cả 6 ca insufficient vẫn bị trả contradicted (recall 0/6), nên chưa đủ chất lượng chọn để áp dụng. 12 ca cũ giữ 7/12, chưa tăng.

Không so trực tiếp bản sửa trên 18 ca với điểm 12 ca cũ. Đối chứng người nhận là 0.6.0; ngữ cảnh/bằng chứng là 0.1.0, mỗi lượt đo lại cùng model local. Mọi ca, kể cả lỗi, ở mẫu số.

## Lịch sử thử và quyết định

### Người nhận chỉ dẫn — 1.1.0-repair-candidate

Đủ 36 request: 11/18 → 13/18. Ca sửa được so với đối chứng: t04, t07, ra2, ra5, ra6. Ca bị làm sai mới: t08, t11, t12. Ca baseline lịch sử đúng nhưng bản sửa làm sai: t08, t11, t12.

Prompt token: 7574 → 8600; output token 2812 → 1750. p50 9.164 → 6.100 giây; p95 27.994 → 8.547 giây. Điều kiện chưa đạt: oldNotWorse, noRegressions, preservesHistoricalBaseline, promptNotIncreased.

Minh chứng: [raw](../../results/skill-recipient-sourced-4LJlNS/raw.jsonl), [protocol/hash/lệnh](../../results/skill-recipient-sourced-4LJlNS/protocol.json), [metrics/confusion/nhóm/ngôn ngữ](../../results/skill-recipient-sourced-4LJlNS/audited-metrics.json), [dữ liệu khóa](../../results/skill-recipient-sourced-4LJlNS/cases.json).

### Lệnh thật và ví dụ — 1.1.0-repair-candidate

Đủ 36 request: 7/18 → 11/18. Ca sửa được so với đối chứng: c1, c2, c5, cs2, ca1. Ca bị làm sai mới: cs3. Ca baseline lịch sử đúng nhưng bản sửa làm sai: cs3.

Prompt token: 12100 → 9598; output token 2587 → 2261. p50 9.596 → 7.895 giây; p95 16.883 → 16.042 giây. Điều kiện chưa đạt: noRegressions, preservesHistoricalBaseline.

Minh chứng: [raw](../../results/skill-context-sourced-QQyyJA/raw.jsonl), [protocol/hash/lệnh](../../results/skill-context-sourced-QQyyJA/protocol.json), [metrics/confusion/nhóm/ngôn ngữ](../../results/skill-context-sourced-QQyyJA/audited-metrics.json), [dữ liệu khóa](../../results/skill-context-sourced-QQyyJA/cases.json).

### Kiểm tra bằng chứng — 1.1.0-repair-candidate

Đủ 36 request: 10/18 → 14/18. Ca sửa được so với đối chứng: e3, es2, ea1, ea6. Ca bị làm sai mới: không có. Ca baseline lịch sử đúng nhưng bản sửa làm sai: không có.

Prompt token: 11684 → 9020; output token 3159 → 2352. p50 10.950 → 7.392 giây; p95 18.632 → 23.172 giây. Điều kiện chưa đạt: noNewErrors.

Minh chứng: [raw](../../results/skill-evidence-sourced-WgO32e/raw.jsonl), [protocol/hash/lệnh](../../results/skill-evidence-sourced-WgO32e/protocol.json), [metrics/confusion/nhóm/ngôn ngữ](../../results/skill-evidence-sourced-WgO32e/audited-metrics.json), [dữ liệu khóa](../../results/skill-evidence-sourced-WgO32e/cases.json).

### Người nhận chỉ dẫn — 1.2.0-repair-candidate

Đủ 36 request: 11/18 → 7/18. Ca sửa được so với đối chứng: t04, ra2. Ca bị làm sai mới: t02, t08, t10, t11, t12, ra4. Ca baseline lịch sử đúng nhưng bản sửa làm sai: t02, t08, t10, t11, t12.

Prompt token: 7574 → 7790; output token 2805 → 1849. p50 9.163 → 6.496 giây; p95 28.745 → 10.246 giây. Điều kiện chưa đạt: improved, oldNotWorse, noRegressions, preservesHistoricalBaseline, noNewErrors, promptNotIncreased.

Minh chứng: [raw](../../results/skill-recipient-sourced-RJ0g2A/raw.jsonl), [protocol/hash/lệnh](../../results/skill-recipient-sourced-RJ0g2A/protocol.json), [metrics/confusion/nhóm/ngôn ngữ](../../results/skill-recipient-sourced-RJ0g2A/audited-metrics.json), [dữ liệu khóa](../../results/skill-recipient-sourced-RJ0g2A/cases.json).

### Lệnh thật và ví dụ — 1.2.0-repair-candidate

Đủ 36 request: 7/18 → 12/18. Ca sửa được so với đối chứng: c1, c2, c5, cs2, cs5, ca3. Ca bị làm sai mới: ca2. Ca baseline lịch sử đúng nhưng bản sửa làm sai: không có.

Prompt token: 12100 → 10102; output token 2587 → 2190. p50 9.469 → 8.047 giây; p95 16.625 → 13.409 giây. Điều kiện chưa đạt: noRegressions, noNewErrors.

Minh chứng: [raw](../../results/skill-context-sourced-yyjMGO/raw.jsonl), [protocol/hash/lệnh](../../results/skill-context-sourced-yyjMGO/protocol.json), [metrics/confusion/nhóm/ngôn ngữ](../../results/skill-context-sourced-yyjMGO/audited-metrics.json), [dữ liệu khóa](../../results/skill-context-sourced-yyjMGO/cases.json).

### Kiểm tra bằng chứng — 1.2.0-repair-candidate

Đủ 36 request: 10/18 → 11/18. Ca sửa được so với đối chứng: ea1. Ca bị làm sai mới: không có. Ca baseline lịch sử đúng nhưng bản sửa làm sai: không có.

Prompt token: 11684 → 9038; output token 3126 → 1812. p50 10.480 → 5.761 giây; p95 17.830 → 11.370 giây. Điều kiện chưa đạt: không có ở lớp số đo.

Minh chứng: [raw](../../results/skill-evidence-sourced-ToEB4F/raw.jsonl), [protocol/hash/lệnh](../../results/skill-evidence-sourced-ToEB4F/protocol.json), [metrics/confusion/nhóm/ngôn ngữ](../../results/skill-evidence-sourced-ToEB4F/audited-metrics.json), [dữ liệu khóa](../../results/skill-evidence-sourced-ToEB4F/cases.json).

## Phạm vi kiểm chứng

- Tổng 216 request mới hoàn tất ở các lượt được liệt kê. Mỗi lượt gồm 12 ca dev cũ và 6 biến thể tự soạn đã khóa trước lượt 1.1. Các lượt 1.2 dùng lại chúng để chỉnh skill, không phải dữ liệu độc lập.
- Có Việt/Anh, vai trò AI/người/dịch vụ, thiếu chủ thể, câu trích, yêu cầu áp dụng, HTML comment dạng text, nguồn dài có target ở cuối, claim đủ/thiếu/mâu thuẫn. Các target cùng tài liệu được giữ group; không tính là nguồn độc lập. Không dùng dataset Hugging Face ở lượt thành phần này.
- Trong sáu lượt A/B đầu, các nhánh giữ cùng Qwen3 4B local, schema, validator, input và tùy chọn: seed 42, temperature 0, num_ctx 4096, num_predict 350, timeout 45 giây, đảo thứ tự, không retry. Không train/tải/đổi model Agent. Snapshot code/prompt/model digest/dữ liệu/lệnh/raw lưu trên E qua junction benchmark/results.
- Input chỉ có segments/evidence với ref và text, targetRef hoặc claim; ID, nhóm, nhãn, control, labelReason và đường dẫn ở ngoài. Code kiểm tra ghép đủ ký tự, offset, ref và target; ref có thật không bảo đảm lý do đúng.
- Metrics có precision/recall/F1/FPR one-vs-rest và confusion, từng ngôn ngữ/nhóm/cohort, unknown/insufficient/lỗi. Undefined là null; lỗi âm giữ riêng, không tính TN. Unknown/insufficient là trạng thái nhiệm vụ, chưa phải abstention toàn Agent.
- p95 nearest-rank của 18 ca là giá trị lớn nhất, còn nhạy với tải và cold load. Tài nguyên chỉ chụp theo thời điểm, không đo peak. Không loại lỗi cắt đầu ra khỏi mẫu số.
- Python quick_validate của skill-creator không chạy được vì thiếu PyYAML; đã dùng js-yaml của dự án kiểm tra frontmatter/name/description và trần 1.000 ký tự, cùng kiểm tra hành vi bằng model. Cú pháp runner và git diff được kiểm tra riêng; không dùng kiểm tra định dạng thay bằng chứng hiệu quả.
- e3 (falsify), cs6/ca6 (câu trích đơn lẻ) còn cần người rà nhãn độc lập; không đổi nhãn sau khi thấy kết quả. Rà lý do hiện do người thực hiện phép thử, chưa độc lập.
- Chưa đánh giá extraction PDF/DOCX, tự tìm target, chunk selection, pipeline thực tế hoặc holdout đa nguồn. Chưa đủ căn cứ áp dụng Agent hoặc tuyên bố đạt 90%; Ưu tiên 1 vẫn mở.

## Quyết định cuối và các lượt bổ sung

**Không áp dụng các bản sửa vào Agent. Đã khôi phục nội dung ba bản nháp trước đợt sửa; giữ baseline 0.6.0 người nhận trong harness và ba skill gốc 0.1.0.** Các bản thử không bị xóa: snapshot/raw/protocol trên E cho phép xem lại. Không tuyên bố sửa xong ba skill.

### Người nhận 1.3 — baseline dùng lại

Đủ 18 request mới, dùng lại 18 response baseline; không tính thành 36 request mới. Đúng 11/18 → 12/18; lỗi 1 → 0. Prompt token 7574 → 7538; output 2805 → 1439. p50 9.163 → 5.150 giây; p95 28.745 → 10.002 giây, chỉ tham khảo vì khác thời điểm/tải. Mất ca: t11, t12, ra4.

[Raw](../../results/skill-recipient-repair-v13-GJZ2Sp/raw.jsonl), [protocol/hash/lệnh](../../results/skill-recipient-repair-v13-GJZ2Sp/protocol.json), [metrics/confusion](../../results/skill-recipient-repair-v13-GJZ2Sp/audited-metrics.json).

### Ngữ cảnh 1.4 — baseline dùng lại

Đủ 18 request mới, dùng lại 18 response baseline; không tính thành 36 request mới. Đúng 7/18 → 13/18; lỗi 2 → 0. Prompt token 12100 → 10480; output 2587 → 2330. p50 9.469 → 10.720 giây; p95 16.625 → 17.646 giây, chỉ tham khảo vì khác thời điểm/tải. Mất ca: cs3, ca2.

[Raw](../../results/skill-context-bound-capped-sKLRgL/raw.jsonl), [protocol/hash/lệnh](../../results/skill-context-bound-capped-sKLRgL/protocol.json), [metrics/confusion](../../results/skill-context-bound-capped-sKLRgL/audited-metrics.json).

### Lượt ràng buộc target không giới hạn lý do — dừng sớm

Đã lưu 9/18 ca, 6 lỗi cắt đầu ra. Dừng vì ràng buộc mới không dùng được; có thể có request đang dở khi dừng tiến trình. Không có điểm toàn bộ 18 ca, không dùng 9 ca làm điểm toàn mục tiêu. [Trạng thái và ca chưa hoàn tất](../../results/skill-context-bound-OXGPqX/stopped.json), [raw](../../results/skill-context-bound-OXGPqX/raw.jsonl).

### Các lỗi chưa giải quyết ổn định

- **Người nhận:** chưa có chủ thể vẫn đoán human; đọc sai danh tính ở tài liệu dài. Bản 1.3 sửa được nhầm AI/human ở một số ca, nhưng đổi lấy ca unknown trước đúng.
- **Ngữ cảnh:** còn nhầm yêu cầu trực tiếp thành mô tả, chưa ổn định ở đoạn trích thiếu khung. Bắt buộc target giúp đầu ra có tham chiếu nhưng không chứng minh model đã hiểu; trần maxLength giữ JSON đầy đủ song có thể làm lý do kết thúc giữa câu.
- **Bằng chứng:** chưa phân biệt ổn định không hỗ trợ với nói ngược; thêm hướng dẫn logic vẫn không khắc phục được insufficient. Không đổi nhãn hoặc gộp hai trạng thái để lấy điểm.

Các lượt đều trên dev tự soạn, không phải holdout hoặc pipeline. Không thêm prompt dài tiếp chỉ vì một ca sai. Hướng cần kiểm chứng sau là tách bước tìm chủ thể/ý nguồn khỏi bước chọn nhãn và kiểm tra bất đồng; đây là giả thuyết chưa đo, chưa áp dụng.

### Số lượng và kiểm tra

Đã lưu **261 bản ghi kết quả mới**: 216 ở sáu lượt A/B đủ, 18 người nhận 1.3, 18 ngữ cảnh 1.4 và 9 ở lượt dừng. Baseline dùng lại không đếm lần hai. Request có thể đang dở khi dừng không tính là kết quả hoàn tất. Không gộp các nhiệm vụ thành độ chính xác Agent.

Đã giữ seed/model/input/nhãn/validator, kiểm tra tái ghép nguồn và ref/target; riêng lượt đổi hợp đồng ghi rõ schema mới và trần lý do chặt hơn. Các audit được lưu cùng raw, dùng từ gốc repo. Raw/snapshot chứa phiên bản trước khôi phục; manifest lựa chọn ghi body hash đã khôi phục. Chưa có kiểm chứng độc lập hoặc pipeline; Ưu tiên 1 còn mở.
