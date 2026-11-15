# Đánh giá ứng viên thay Verifier

- [Kế hoạch khóa trước run](ke-hoach.json).
- [Thông số model cục bộ](thong-so-model.json): digest, template, license, phiên bản.
- [Kết quả và kiểm tra đối chiếu](ket-qua.json).
- [Báo cáo tiếng Việt](../../../docs/reports/danh-gia-model-thay-the-verifier.md).

Tải ứng viên bằng `ollama pull qwen2.5:1.5b-instruct`.
Chạy `npm run benchmark:verifier` với baseline và ứng viên đúng digest trong
kế hoạch. Giữ log lịch sử được tham chiếu, không sửa kế hoạch để hợp thức hóa
phiên bản khác. Mỗi run tạo `benchmark/results/verifier-candidate-*`, giữ
request/response và `candidate-gate.json` riêng.

Chỉ thay model trong bài hỏi chẩn đoán, không đổi prompt/schema/validator.
Ứng viên nhận diện trực tiếp tốt hơn trong bộ nhỏ nhưng chưa qua cổng; chưa
được thêm vào allowlist hoặc chọn làm Verifier của ứng dụng. Đây là dev đã
xem, chưa phải holdout hoặc toàn pipeline.
