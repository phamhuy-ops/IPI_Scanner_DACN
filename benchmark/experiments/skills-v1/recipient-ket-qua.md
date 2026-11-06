# Rút gọn skill xác định người nhận — 04/11/2026

## Phạm vi và cách đo

Chỉ chỉnh skill `ipi-instruction-recipient`; không đổi model, task/schema đánh giá, validator, hai skill Verifier hoặc luồng sản phẩm. Mục tiêu là tách người thực hiện khỏi bên nhận dữ liệu và tránh suy diễn quyền/công cụ thực hiện.

Giữ [baseline 0.1.0](recipient-baseline.md). Bộ đo gồm sáu ca người nhận cũ và [tám biến thể mới](recipient-variants.json), tổng 14 ca. Tất cả tự soạn, chỉ là dev; lượt sau dùng lại ca để sửa lỗi nên không có tuyên bố độc lập. Nhãn, nhóm, anchor và ID không gửi vào model. Các cặp bao gồm chỉ dẫn hướng tới AI/con người, HTML comment, cách gọi theo vai trò, nội dung ở cuối đoạn dài và thiếu người thực hiện. Có yêu cầu AI tóm tắt hợp lệ để phân biệt nhiệm vụ xác định người nhận với kết luận tấn công.

Lệnh chung: `node benchmark/experiments/skills-v1/evaluate.cjs --recipient-ab`. Dùng lại một runner, không thêm script top-level. Mỗi ca chạy baseline/candidate mới hoàn toàn, đảo thứ tự theo ca. Qwen3 4B local, temperature 0, seed 42, context 4096, tối đa 350 token đầu ra, timeout 45 giây, không retry. Kết quả thực trên E qua junction trong `benchmark/results`.

Điều kiện giữ ứng viên được ghi trước mỗi lượt trong protocol: tăng số đúng, không mất ca baseline đúng, không lỗi mới, prompt token không tăng, p95 tối đa 1,25 lần baseline. Qua điều kiện thành phần cũng chưa được tích hợp mặc định; còn đánh giá riêng ngữ nghĩa lý do, biến thể độc lập và pipeline.

## Lượt 1 — bản 0.2.0 bị loại

Phần chỉ dẫn giảm từ 1.251 xuống 818 ký tự, khoảng 35%. Đúng 5/14 → 10/14; sửa được bảy ca nhưng làm mất hai ca thiếu người thực hiện: r5 tự chọn AI, rv7 tự chọn con người. Cả hai không có bằng chứng cho lựa chọn đó. Vì vậy không giữ bản này dù tổng điểm cao hơn.

Cả hai nhánh có một lỗi quote rỗng ở rv5. Các ca r6/rv5 gọi bên thực hiện theo vai trò ở cuối đoạn vẫn sai. Không loại ca khó khỏi mẫu số và không sửa nhãn sau đo.

Prompt token tổng 9.604 → 8.106 (giảm khoảng 15,6%). Token đầu ra 2.399 → 1.608. Latency p50 9,55 → 6,23 giây; p95 16,17 → 11,56 giây. Chưa đủ mẫu để khẳng định mức tăng tốc ổn định; latency có tải model và biến động máy.

[Protocol/hash](../../results/skill-recipient-ab-z9fsNZ/protocol.json), [raw 28 request](../../results/skill-recipient-ab-z9fsNZ/raw.jsonl), [tổng hợp](../../results/skill-recipient-ab-z9fsNZ/summary.json), [metric từng lớp/nhóm/ngôn ngữ và gate](../../results/skill-recipient-ab-z9fsNZ/task-metrics.json). Snapshot bản bị loại vẫn nằm trong thư mục kết quả.

## Lượt 2 — bản 0.2.1

Bổ sung duy nhất yêu cầu có bằng chứng về người thực hiện: nếu nguồn không nêu bên/vai trò thì unknown, không suy ra người nhận chỉ từ động từ mệnh lệnh hoặc việc AI đang đọc tài liệu. Không thêm ví dụ theo chuỗi riêng của benchmark.

Đã đo đủ 28 request mới: baseline 5/14, ứng viên 10/14 (71,43%). Vẫn sửa được bảy ca và làm mất cùng hai ca r5/rv7. Model giải thích rằng hành động đọc/gửi “thường do con người thực hiện”, tức tự suy diễn ngoài nguồn dù skill đã yêu cầu không làm vậy. Vì thế **bản 0.2.1 cũng bị loại**. Không thử thêm prompt trong lượt này; đã khôi phục file skill đang dùng để phát triển về baseline 0.1.0, giữ các bản bị loại và raw để đối chiếu.

Không còn lỗi schema/trích dẫn ở nhánh ứng viên, nhưng rv5 chỉ chuyển từ quote rỗng thành unknown sai; không tính là ca được sửa đúng. Hai ca cuối đoạn r6/rv5 vẫn bỏ lỡ vai trò AI. Đã đọc lý do cả mười ca được chấm đúng; nhận định người thực hiện có căn cứ trong nguồn, dù một số lý do diễn đạt như hành động đã xảy ra thay vì chỉ là yêu cầu — cần sửa trước khi đưa ra giao diện.

Prompt token 9.604 → 8.806 (giảm khoảng 8,3%); token đầu ra 2.371 → 1.765. Latency p50 9,24 → 6,68 giây; p95 17,58 → 11,81 giây. Không timeout hoặc cắt đầu ra. Bản này qua điều kiện token, latency và không có lỗi mới, nhưng không qua điều kiện giữ các ca baseline đúng. Tổng hai lượt là 56 request thực tế trên cùng 14 ca, không phải 28 ca độc lập.

[Protocol/hash](../../results/skill-recipient-ab-MoaGun/protocol.json), [raw 28 request](../../results/skill-recipient-ab-MoaGun/raw.jsonl), [tổng hợp](../../results/skill-recipient-ab-MoaGun/summary.json), [metric từng lớp/nhóm/ngôn ngữ và gate](../../results/skill-recipient-ab-MoaGun/task-metrics.json).

Snapshot cuối lượt: runner RSS khoảng 55,5 MB, Qwen3 VRAM khoảng 2,34 GB theo Ollama; [snapshot GPU/RAM trong lượt](../../results/skill-recipient-ab-MoaGun/machine-snapshot.json) lưu riêng. Không phải peak. Cả hai baseline sử dụng request giống nhau và có cùng năm ca đúng; không thay baseline sau khi xem điểm.

## Kết luận và hướng tiếp

Hướng rút gọn có tín hiệu tốt cho các vai trò rõ, nhưng chưa bảo toàn được xử lý thiếu ngữ cảnh. Đã quay lại bản trước, chưa nối bất kỳ skill nào vào runtime. Không dùng điểm này thay kết quả nhận diện Agent hoặc tuyên bố đạt 90%.

Hướng thử tiếp hợp lý là tách bằng chứng xác định người thực hiện thành một bước đầu ra ngắn có cấu trúc, rồi kiểm tra bằng code trước khi ánh xạ nhãn; chỉ thử ở harness và có đối chứng, chưa thay validator sản phẩm. Đây là đề xuất chưa thực hiện, không đảm bảo giải quyết được lỗi suy diễn. Chưa có kiểm chứng độc lập để chọn cấu hình đưa vào Agent.

## Cách đọc kết quả

Đúng nhiệm vụ cần enum đúng, schema hợp lệ, quote nguyên văn không rỗng và reason có nội dung; lời giải thích phải được rà duyệt, nhất là unknown. Precision/recall/F1/FPR và confusion counts trong JSON là one-vs-rest cho nhãn người nhận, không phải độ chính xác phát hiện IPI. Lỗi tính sai trên toàn bộ ca; metric không xác định là null. Lỗi âm giữ riêng, không tính TN. Unknown ở nhiệm vụ không đồng nghĩa abstention của Agent.

Tất cả đều cùng nguồn tự soạn. Chưa chạy extraction, chunking hoặc PDF/DOCX/UI, chưa có phép đo pipeline/holdout độc lập. Cách gọi gián tiếp ở một số ca cũ có thể gây tranh luận nhãn; giữ nguyên nhãn và nêu hạn chế thay vì sửa đáp án theo model. Độ dài ký tự không phải token; dùng prompt_eval_count của backend để đo chi phí thực tế. Tài nguyên trong snapshot chỉ là thời điểm lấy mẫu, không phải peak toàn hệ thống.
