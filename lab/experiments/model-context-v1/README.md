# Đo nhận diện và gán ngữ cảnh từng model

Kế hoạch đã khóa trước 48 lượt hỏi: [ke-hoach.json](ke-hoach.json).
Kết quả và đối chiếu ca: [ket-qua.json](ket-qua.json).

Chạy lại: `npm run benchmark:model-context` (cần hai model Ollama cục bộ).
Mỗi lần tạo thư mục riêng dưới `benchmark/results/model-context-*`; không ghi
đè baseline. Model input chỉ chứa toàn văn; nhãn/ngữ cảnh kỳ vọng chỉ phục vụ
chấm ngoài model. Không sửa kế hoạch sau khi xem output để làm đẹp số đo.

Xem [báo cáo tiếng Việt](../../../docs/reports/do-nhan-dien-ipi-va-gan-ngu-canh-tung-model.md)
để đọc phạm vi, cách chấm abstention, lỗi cụ thể và giới hạn. Đây là dev đã
xem và bài phân loại toàn văn được yêu cầu trực tiếp; không phải holdout,
không đo pipeline và không đổi cấu hình ứng dụng.
