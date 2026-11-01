# Không gộp câu giống nhau ở hai vị trí khác nhau

Đã áp dụng sửa hậu xử lý trong `applyBatch`. Trước đây, cùng chunk và câu trích chứa nhau là đủ để gộp nghi vấn hoặc đánh dấu tự mâu thuẫn. Một câu xuất hiện trong ví dụ không thực hiện ở dòng 2 và được dùng làm lệnh thật ở dòng 5 có thể bị gộp sai, khiến bằng chứng tấn công hợp lệ bị chặn.

Hiện cần thêm điều kiện hai vùng dòng giao nhau khi vị trí đã biết. Vùng tách biệt được giữ thành hai bằng chứng. Vị trí trùng hoặc không biết vẫn giữ cổng mâu thuẫn bảo thủ. Không đổi stance, trích dẫn, schema, model hoặc điều kiện hai vai trò xác nhận. Bản sửa áp dụng cả luồng mặc định, không phụ thuộc bản thử liệt kê chỉ dẫn.

## Bằng chứng

Hai ca tái hiện ban đầu (tiếng Anh/Việt) thất bại trước sửa: câu trích và lệnh ở vị trí khác nhau bị đánh dấu tự mâu thuẫn. Sau sửa, bốn biến thể tiếng Anh/Việt, gồm đảo thứ tự ví dụ/lệnh, đạt. Hai đối chứng cùng vị trí hoặc vị trí không biết vẫn cần xem xét.

Ba kiểm tra pipeline đọc TXT thật đạt, dùng phản hồi model cố định: hai ca tham chiếu span tiếng Anh/Việt và một ca `classic-v1` mặc định với trích dẫn dài hơn bao đúng lệnh thật. Bằng chứng tại vị trí tấn công được hai vai trò xác nhận vẫn được chốt; nghi vấn của ví dụ chưa thống nhất vẫn được giữ unresolved, không biến thành sạch. Đây là kiểm chính sách và luồng xử lý, không phải đo năng lực model.

[Replay](../results/consistency-replay-820RRc/tong-hop.json) phát lại 30 ca/60 phản hồi cũ, không gọi model: không đổi verdict hoặc trạng thái xử lý. Ca tự mâu thuẫn thật case-006 vẫn bị chặn; hai ca output_truncated và bốn lỗi citation vẫn được giữ.

Lệnh kiểm tra: `npx vitest run src/ai/agents/document/evidencePosition.test.ts src/ai/agents/document/evidencePosition.integration.test.ts`; `node scripts/replay-agent-consistency.cjs`. Kiểm tra cuối lượt: 354 test, lint, typecheck và build đạt. Build giữ cảnh báo Vite `customResolver`/`freeze` đã có trước.

## Giới hạn

Chỉ phân biệt được các vùng dòng đã định vị. Chưa phân biệt hai lần xuất hiện trên cùng một dòng nếu chỉ có quote/line; `classic-v1` không tự giải quyết mọi quote lặp mơ hồ. Không sửa lại raw hoặc kết quả cũ. Chưa có bằng chứng tăng tỷ lệ nhận diện trên dữ liệu độc lập hoặc toàn dev96. Mục tiêu 90% và Ưu tiên 1 vẫn chưa hoàn thành.
