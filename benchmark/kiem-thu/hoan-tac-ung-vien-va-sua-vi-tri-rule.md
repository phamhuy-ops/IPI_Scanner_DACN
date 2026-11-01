# Hoàn tác ứng viên giảm chất lượng và thử hướng khác

Theo yêu cầu người dùng, đã gỡ tích hợp `instruction-proposals-v1` khỏi pipeline và kiểu dữ liệu sản phẩm, thay vì chỉ để cờ tắt. Runner cũ dừng với thông báo ứng viên đã bị loại và không gọi model. Giữ nguyên raw, báo cáo và snapshot nghiên cứu.

Ứng viên bị gỡ từng giảm độ đúng từ 5/20 xuống 2/20 trong [lượt đo có đối chứng](../results/instruction-proposals-UGvspO/quality-audit.json). Các thử nghiệm đổi tên stance, đóng gói nguồn và giới hạn reason trước đó không được bật mặc định; không dùng điểm của chúng làm độ đúng của Agent hiện hành.

[Bản lưu trước hoàn tác](../experiments/instruction-proposals-retired-DxWnZL/quyet-dinh.json) giữ mã và hash. [Đối chiếu khôi phục](../experiments/instruction-proposals-retired-DxWnZL/rollback-verification.json) xác nhận `ipiPipeline.ts` và `src/types.ts` khớp byte/hash với baseline trước khi thêm kiến trúc. Không reset toàn working tree; các sửa xử lý đầu ra bị cắt, cổng bằng chứng và phân biệt vị trí đã được giữ.

## Hướng khác: gắn đúng vị trí của rule

Đã tái hiện năm lỗi trước sửa: hai rule cùng câu bị gắn về lần xuất hiện đầu; nhận định chép đúng quote của ID thứ hai vẫn bị đưa về dòng đầu; rule báo dòng không có câu vẫn lấy câu ở dòng khác; và chọn nhầm chunk đầu chứa cùng câu. Cả năm kiểm tra đều thất bại trước sửa.

Đã sửa `ruleSuspicions` dùng dòng do scanner cung cấp để tìm đúng lần xuất hiện trong đúng file/sourceView. Không có câu ở dòng được báo thì giữ `citation=null` và nghi vấn chưa giải quyết, không mượn bằng chứng ở dòng khác. Khi model chép nguyên quote của một ID đã gắn nguồn, parser giữ vị trí của ID đó và kiểm lại trên chunk. Không đổi prompt, model, stance, schema hoặc nới kiểm tra quote.

Sau sửa: năm kiểm tra trên đạt; bốn kiểm tra pipeline trích xuất TXT và chạy rule thật đạt, gồm tiếng Anh/Việt, hai ví dụ lành tính và ví dụ đi kèm lệnh thật. Hai vai trò dùng phản hồi cố định để kiểm chính sách gắn nguồn, không phải đo model. Không có cảnh báo IPI được xác nhận trên hai đối chứng lành tính.

[Replay](../results/consistency-replay-6MWNDZ/tong-hop.json) 30 ca/60 phản hồi cũ không đổi verdict hoặc processing; cổng tự mâu thuẫn và lỗi cắt đầu ra vẫn được giữ. Chưa có phép đo mới chứng minh tăng độ đúng trên toàn dev hoặc dữ liệu độc lập.

Lệnh tái hiện: `npx vitest run src/ai/agents/document/ruleCitationLocation.test.ts src/ai/agents/document/ruleCitationLocation.integration.test.ts`; `node scripts/replay-agent-consistency.cjs`.

Kiểm tra cuối lượt: 359 test, lint, typecheck và build đạt. Build còn hai cảnh báo Vite cũ (`customResolver`, `freeze`). Không gọi model mới trong lượt hoàn tác/sửa gắn nguồn; replay và phản hồi cố định không được dùng làm tỷ lệ nhận diện thực tế.

Giới hạn: sửa dựa trên vị trí `file:line` theo scanner hiện tại; chưa phân biệt hai lần giống nhau trên cùng dòng và chưa giải quyết mọi discovery chưa có ID/vị trí. Dữ liệu thiếu thông tin dòng vẫn giữ hành vi tương thích trước đây. Mục tiêu 90% và Ưu tiên 1 còn mở; không train hoặc đổi model.
