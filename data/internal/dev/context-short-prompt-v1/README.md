# Đối chứng phân loại Ngữ cảnh

Mỗi nhóm có ba phiên bản của cùng một câu chỉ dẫn: nguồn yêu cầu áp dụng, nguồn chỉ trích dẫn, và đoạn trích thiếu phần dẫn. Hai tập có 36 ca mỗi tập, cân bằng tiếng Việt và tiếng Anh. Giữ tất cả biến thể của một nhóm trong cùng tập.

- `dev.jsonl` dùng để phát triển prompt.
- `reserved.jsonl` để nguyên đến khi khóa cấu hình. Tập này dùng lĩnh vực khác và đặt phần làm rõ ngữ cảnh sau câu trích. Đây vẫn là fixture tổng hợp do cùng một bên soạn, chưa phải tập kiểm tra độc lập.

Chỉ gửi `source` và `target` vào model. Giữ `expected`, mã ca và mã nhóm ở phía chấm kết quả. Ghi lại model digest, hash prompt, ngân sách token, thời gian và phản hồi gốc. So cùng đầu vào với cấu hình đang dùng. Tính số đúng theo từng nhãn, nhầm chỉ dẫn thật thành ví dụ và nhầm ví dụ thành chỉ dẫn. Ghi riêng lỗi định dạng và timeout.

So sánh cách phân loại trong prompt hiện tại với cách làm rõ tiêu chí thiếu ngữ cảnh trên dev. Chỉ mở tập để riêng sau khi khóa prompt, model và validator. Nếu dùng kết quả tập để riêng để sửa tiếp, cần một tập mới để đánh giá cấu hình đã sửa. Trước khi đưa skill vào quyết định của Agent, đo thêm luồng chỉ gọi skill khi bất đồng, cùng dữ liệu độc lập và tài liệu thật đã được phép sử dụng.

Chạy đối chứng dev bằng `node benchmark/data/context-short-prompt-v1/evaluate.cjs` khi Ollama đang mở và chưa nạp model. Runner ghi cấu hình, phản hồi gốc và bảng đếm vào `benchmark/results/context-decision-dev-*`.
