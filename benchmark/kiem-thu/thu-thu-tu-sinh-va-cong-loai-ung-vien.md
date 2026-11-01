# Đổi thứ tự sinh đầu ra và cổng loại ứng viên

Đã thử một thay đổi riêng: trong schema classic-v1, sinh chunkId, quote và reason trước stance. Không sửa prompt, nguồn, enum, model, giới hạn token hoặc parser/chính sách. Backend thực tế đã sinh trường theo đúng thứ tự thử; không chỉ kiểm tra bằng unit test.

## Kết quả và hoàn tác

[Lượt A/B](../results/evidence-first-HKzxNe/giao-thuc.json) hoàn tất 40 pipeline trên cùng 20 ca mỗi nhánh. Sau [audit bất định](../results/evidence-first-HKzxNe/uncertainty-audit.json), baseline đúng 5/20, ứng viên 6/20. Tuy vậy, mất ca đúng aq-001; lỗi tăng 3→5; p95 tăng 17,47→36,56 giây. Vì trượt cổng, điểm tăng nhẹ không đủ để áp dụng. Không coi việc báo ít FP hơn là tự động cải thiện toàn diện.

Đã [lưu mã thử riêng và loại ứng viên](../experiments/evidence-first-retired-0uf7zM/quyet-dinh.json). Kiểm hash 52 file core xác nhận pipeline sản phẩm không bị thay đổi bởi thử nghiệm này. Helper đã được gỡ khỏi src; runner cũ báo đã loại và không gọi model. Raw và snapshot cũ giữ nguyên.

## Thay đổi được giữ: cổng quyết định trong báo cáo

`candidateGate` trong `scripts/agent-quality-metrics.cjs` tự tính lại điều kiện trên toàn bộ tập đã chọn, dùng audit uncertain có giải thích, không loại lỗi hoặc ca chưa chạy khỏi mẫu số. Báo cáo `quality-audit.json` lưu cổng, ID bị mất và nguyên nhân loại. Cổng kiểm cả báo nhầm/báo sạch sai kèm lỗi để chúng không lẩn khỏi số đếm hợp lệ.

Điểm tăng nhưng mất ca đúng, tăng FP/false clear/lỗi hoặc vượt tỷ lệ p95 1,25 vẫn bị loại. Đã thử trên các kết quả semantic-stance và instruction-proposals cũ: đều bị loại đúng. Sáu test Node kiểm các tình huống mẫu số, audit, tăng điểm nhưng tăng FP, bộ chưa đủ và báo nhầm kèm lỗi. Cổng chỉ cho phép đo dev tiếp, không tự bật cấu hình hoặc chứng nhận90%/độc lập.

## Chẩn đoán nhận biết tối giản

[Phép đo 40 request](../results/minimal-recognition-IrJgNL/tong-hop.json) dùng đúng hai model hiện tại và 20 nguồn dev, chỉ yêu cầu nhãn. Không chạy extraction hoặc pipeline Agent, không có quote/reason để kiểm chứng. Cả hai model trả shape hợp lệ 20/20.

Gemma nhận 0/8 tấn công; Coder nhận 3/8. Trên 16 ca nhị phân, khớp nhãn lần lượt 1/16 và 11/16. Các nhãn uncertain không có bằng chứng nên không tính thành uncertain đúng của Agent. Kết quả cho thấy, trong thiết lập đã thử, lỗi không chỉ là đóng gói JSON; không chứng minh trần năng lực chung của model hoặc độ đúng pipeline.

## Phần chưa chạy

Đã chuẩn bị [giao thức đối chứng Verifier Instruct có sẵn](../experiments/local-instruct-comparison-pending/giao-thuc.json): 20 ca mỗi nhánh, giữ Detector Gemma, chỉ so Coder với `qwen2.5:1.5b-instruct` đã có trên máy. Tại thời điểm lập giao thức, chưa chạy vì ràng buộc không tự tải/đổi model. Sau đó người dùng đã cho phép và [đối chứng đã hoàn tất, bị loại](doi-chung-instruct-theo-vai-tro.md). Không train, tải model hoặc đổi Agent mặc định.

Kiểm tra mã sau khi loại ứng viên: 359 test, lint/typecheck/build đạt; sáu test cổng và hai test chẩn đoán đạt. Còn cảnh báo Vite cũ `customResolver`/`freeze`. Chưa có ứng viên nhận diện đạt90%, chưa chạy toàn dev96/holdout cho ứng viên mới. Ưu tiên 1 vẫn mở.
