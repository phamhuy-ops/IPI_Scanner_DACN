# Hồ sơ đã rời thư mục làm việc

Ngày 28/10/2026, dọn các công cụ thử nghiệm đã kết thúc, không sửa thuật toán Agent.

- [ZIP lịch sử](ho-so-cu.zip): 275 script cũ, 20 phiên bản audit overlap cũ (giữ v21 đang mới nhất), 17 thư mục snapshot mã trùng lặp của các lượt đã kết thúc; tổng 1.080 file.
- [Danh mục/hash](danh-muc.json): đường dẫn gốc từng file, byte, SHA-256, script còn duy trì, hash ZIP và kết quả đối chiếu. Mọi thành viên ZIP được đọc lại và xác minh hash trước khi bỏ bản rời.
- Giữ nguyên raw request/response, giao thức và báo cáo của các lượt đo. Giữ nguyên ba mốc `agent-flow-nv9OXO`, `agent-upgrade-30-bMiNNH`, `agent-prompt-ab-SNzk1y`, dataset, nhãn, fixture và source sản phẩm.
- 92 junction kết quả trỏ sang E không bị đi theo, xóa hoặc đổi đích. Không đụng weights, adapter, cache model, môi trường Python hoặc node_modules.

Đường dẫn script/snapshot hoặc audit overlap phiên bản cũ trong hồ sơ lịch sử được tra trong `danh-muc.json`; file không biến mất khỏi bằng chứng mà nằm trong ZIP theo đúng đường dẫn gốc. Chạy lại lệnh cũ cần khôi phục đúng thành viên tương ứng cùng các dependency trong ZIP; không xem đó là lệnh được hỗ trợ hiện tại.

Để khôi phục, giải nén vào một thư mục tạm ngoài workspace, đối chiếu SHA-256 trong danh mục, rồi chép riêng các file cần về đường dẫn gốc. Không giải nén đè toàn workspace vì có thể ghi đè mã đã được sửa sau ngày dọn. Các thử nghiệm cũ có đường dẫn/hợp đồng cố định; khôi phục script không bảo đảm môi trường hiện tại tái hiện nguyên văn model.

Đầu vào công cụ còn duy trì là `scripts/benchmark.cjs`; alias `benchmark:ipi` nay dùng core pipeline 30 ca đã khóa, không còn prompt rời cũ. Các alias `benchmark:model-context`, `benchmark:stance`, `benchmark:verifier` đã nghỉ dùng. Bộ thực thi và metrics còn dùng được tái sử dụng, chưa gộp tất cả schema kết quả lịch sử thành một schema mới.

Cache Python nhỏ trong `scripts/__pycache__` được giữ lại vì thao tác xóa bị bộ kiểm duyệt tự động chặn; Git đã bỏ qua `__pycache__`/`.pyc`. Không báo phần cache này đã được xóa.

Kiểm tra sau dọn: 367 test sản phẩm/34 file, 19 test công cụ benchmark, typecheck, lint, build và trợ giúp CLI đều đạt. Build còn cảnh báo Vite về `customResolver` và tùy chọn `freeze`; không sửa cấu hình build ngoài phạm vi dọn. Không gọi model/train để chấm lại chất lượng trong lượt dọn này.
