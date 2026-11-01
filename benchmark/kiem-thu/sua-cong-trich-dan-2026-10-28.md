# Sửa cổng trích dẫn chỉ chứa ký hiệu

Đã áp dụng vào `parseAgentBatch`: trích dẫn model phải khớp nguồn và có ít nhất một ký tự chữ hoặc số Unicode. Dấu phân cách đơn thuần như `---`, `***`, hàng rào mã hoặc mũi tên không đủ làm bằng chứng. Không suy ra stance từ từ khóa; có chữ/số vẫn không chứng minh nhận định đúng về ngữ nghĩa.

Trước sửa, bốn đối chứng mới đều thất bại vì parser chấp nhận ký hiệu làm bằng chứng. Sau sửa, bốn trường hợp bị từ chối; năm đối chứng tiếng Việt, Anh, Trung, mã nguồn và tên người giữ nguyên trích dẫn. Hai kiểm tra pipeline đọc TXT thật, dùng phản hồi model cố định, xác nhận lỗi `invalid_citation`, kết luận `needs_review`, không có nghi vấn được xác nhận. Không dùng các kiểm tra này để tuyên bố tăng độ chính xác.

Phát lại [30 ca và 60 phản hồi đã lưu](../results/consistency-replay-JPx9XZ/tong-hop.json) không đổi verdict hoặc trạng thái xử lý. Không gọi model mới; không phải holdout độc lập. Raw và baseline cũ được giữ nguyên. Lệnh tái hiện: `node scripts/replay-agent-consistency.cjs`.

Kiểm tra mã: `npm test`, `npm run lint`, `npm run build` (bao gồm typecheck). Build còn cảnh báo cấu hình Vite `customResolver` và `freeze` đã có trước.

Thử nghiệm ba câu hỏi đã hoàn tất ở [kết quả gốc](../results/factual-source-TJvH0M/tong-hop.json): kết hợp đúng 7/16 ca dev (43,75%), không đạt nên không áp dụng. Cổng trích dẫn vừa sửa không khắc phục năng lực hiểu ngữ cảnh của model. Mục tiêu 90% và kiểm chứng độc lập/toàn pipeline bằng model thật vẫn chưa hoàn thành. Không train, tải hoặc đổi model.
