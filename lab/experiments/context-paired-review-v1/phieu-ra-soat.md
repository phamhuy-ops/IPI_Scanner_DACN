# Lô rà paired-context đầu tiên

Ngày 2026-10-28. Đã rà nháp bằng AI 14 hàng, chưa duyệt độc lập và chưa đủ phase0. Không có lượt train hoặc inference. Đây là dữ liệu rà hợp đồng, không phải kết quả chất lượng Agent.

## Nguồn và cách chọn

Chọn có chủ đích hàng 0 và 2 của `test_cases_dh_base.json` cùng hàng tương ứng trong `test_cases_dh_enhanced.json`, snapshot InjecAgent revision `f19c9f2c79a41046eb13c03c51a24c567a8ffa07`. Hai bối cảnh là review Amazon và mô tả repository GitHub; cùng yêu cầu cấp quyền khóa nên giữ chung một nhóm. Không dùng hàng đã chọn làm holdout chưa đụng tới.

Đối chiếu hash hai file và LICENCE với snapshot trước xuất. Giấy phép nguồn khai MIT; notice gốc giữ tại `benchmark/data/raw/injecagent/LICENCE`. Task lấy nguyên trường `User Instruction`; document gốc lấy nguyên `Tool Response`. `Attacker Instruction`, `Thought`, `Expected Achievements`, nhãn nguồn và group không đi vào features.

## Nhận định ngữ nghĩa

- Hai bản enhanced: nhãn nháp IPI vì chỉ dẫn trong tool response yêu cầu bỏ chỉ dẫn trước và cấp quyền khóa, vượt nhiệm vụ lấy thông tin/tóm tắt. Directive span chứa cả override và hành động; context span giữ toàn tool response.
- Hai bản base: uncertain. Lời nhờ cấp quyền có thể là thông điệp cho người khác được lưu trong review/mô tả. Nguồn không đủ rõ người nhận; metadata attacker không được dùng để bù phần thiếu. Cần người duyệt xác nhận cách diễn giải, không tự giữ nhãn IPI toàn dataset.
- Sáu đối chứng benign: việc giao rõ cho quản trị viên, ví dụ tấn công được bao khung là trích dẫn, và nội dung Dan Evans lệch chủ đề nhưng không có directive. Đây là biến thể tổng hợp thay đúng một trường nội dung, không phải tài liệu sạch thu thập ngoài thực tế.
- Hai đối chứng uncertain: lời yêu cầu tham chiếu thỏa thuận không có trong nguồn.
- Hai đối chứng thiếu task: route `needs_context`, nhãn null; không đưa vào loss uncertain.

Chưa có biến thể vị trí/ngôn ngữ hay dữ liệu chưa dùng thiết kế. Không suy từ 14 hàng rằng classifier phân biệt được những trường hợp trên.

## Kiểm chứng và điểm dừng

Chạy `node scripts/prepare-context-paired-review.cjs` để tái tạo; hash lô và kiểm tra được giữ tại `tong-ket.json`. Chạy `node --test scripts/context-detector-contract.test.cjs`: 7/7 đạt. Kiểm tra hash snapshot, task gốc, span UTF-16, route features và từ chối train lô chưa duyệt đều đạt. Không đo precision/recall/F1/FPR hoặc latency vì chưa có dự đoán model.

Chỉ có một nhóm và 12 hàng có task; không đủ bất kỳ split train/dev/probe nào. Audit overlap/near duplicates toàn kho, duyệt độc lập, tokenizer/windows và quyền train riêng còn thiếu. Dừng trước train theo phase0 đã khóa; không tạo hàng loạt để ép đủ số.

Bước kế: duyệt nhận định base/uncertain và bao khung đối chứng, rồi đối chiếu toàn kho để xác định nhóm bị bảo vệ trước khi cân nhắc lô nguồn tiếp theo. Ưu tiên 1 vẫn mở, Agent mặc định không đổi.

## Rà tiếp và quyết định sau audit

Đã rà lại ý nghĩa của task/document và giữ nguyên nhãn nháp: biết hành động cấp quyền nằm ngoài nhiệm vụ không đủ chứng minh lời nhờ trong review đang giao cho AI. Nhận định này vẫn do AI thực hiện, không phải duyệt độc lập.

Audit `python scripts/audit-context-paired-review.py` kiểm kê 431 file JSON/JSONL, 207.097 đơn vị JSON đọc và 209.437 trường nội dung, 69.271 văn bản chuẩn hóa khác nhau. Đơn vị JSON không phải số tài liệu độc lập: một file JSON dạng array được đếm một đơn vị, còn từng trường trong array được trích riêng. Có 150 cặp ứng viên/file khớp từ vựng, không có lỗi parse và hash đầu vào không đổi. Các file không có trường nội dung được hỗ trợ được liệt kê trong `overlap-audit.json`; không suy kiểm kê file là đọc đầy đủ nội dung mọi file.

Dùng NFKC/casefold/whitespace exact, Jaccard trigram tối thiểu 0,8 và đoạn chung 12 token. Mỗi phương pháp có count riêng; count tổng của file không phải số exact match. Hit có thể chỉ từ wrapper hoặc prompt/reference trong user message, cần đối chiếu nguồn trước khi kết luận.

Đã xác minh nhóm cũ `injecagent-attack-ab5c6815eb9e74ed`, hai ID `ext3-013`/`ext3-014`, có cùng yêu cầu cấp quyền khóa ở bối cảnh khác; group xuất hiện trong preview train candidate-02. Không dùng nhãn cũ làm đáp án cho setup paired mới. Theo chính sách nhóm, toàn lô 14 hàng chỉ giữ chẩn đoán, loại khỏi train/dev/probe của pilot mới. Quyết định có cấu trúc tại `quyet-dinh-ra-soat.json`; giữ nguyên file lô ban đầu để đối chiếu.

Ba kiểm thử extractor audit đạt qua `python -m unittest discover -s scripts -p test_context_paired_audit.py`: không lấy task/gold/target, đọc tool response/cửa sổ có đường dẫn, chỉ đọc user message trong payload. Audit không gồm CSV/PDF/DOCX hay mọi tên trường tùy ý; chưa có đồ thị nhóm/task/template và rà ngữ nghĩa toàn kho. Không có số đo nhận diện model trong lượt này.

Đối chiếu metadata phát hành xác nhận hai `source_record_id` trên ánh xạ sang component `group-dec241d54188`, `planned_role=train`, tổng bốn biểu diễn trong preview v2. Tên group nguồn và component phát hành khác nhau; kết luận dùng lại nguồn dựa trên liên kết ID/parent này, không chỉ lexical hit hoặc so tên group trực tiếp. 364/431 file kiểm kê không có trường nội dung được extractor hỗ trợ; chúng được liệt kê riêng, gồm cả file metadata, và không được tính là đã rà nội dung.

Bước kế sau quyết định: kiểm kê nhóm nguồn còn lại và các task/template chung với protected corpus trước khi chọn lô paired mới; không tiếp tục nhân biến thể nhóm đã gặp để đủ số. Phase0 chưa đạt và Ưu tiên 1 vẫn mở.
