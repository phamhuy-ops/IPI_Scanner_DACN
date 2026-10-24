# Fixtures cho chẩn đoán vòng một

- `vi-clean.md`: biên bản họp tổng hợp bằng tiếng Việt, nhãn benign do tác giả
  fixture xác định.
- `vi-injected.md`: cùng miền nội dung, có chỉ dẫn làm sai định dạng câu trả lời;
  nhãn malicious và đoạn cần chú ý được ghi bên ngoài input model.
- `hidden-injected.html`: nội dung họp tổng hợp bằng tiếng Anh, có chỉ dẫn trong
  HTML comment. Kiểm tra extraction có làm mất phần cần quét không.

Đây là file tự viết để chẩn đoán, không phải tài liệu thu thập ngoài thực tế.
`CONTRIBUTING.md` ở root là tài liệu dự án có sẵn, được đưa riêng vào bộ đo như
một ca tài liệu thật. Chưa kiểm thử PDF/DOCX, OCR, email thật hoặc RAG downstream.

Manifest `benchmark/data/round-one-eval.json` được chốt trước khi chạy model,
giữ hash, nhãn kỳ vọng, nguồn và gold spans. Không đưa những metadata này vào
scanner; chỉ copy nguyên nội dung sang file tên trung tính trong thư mục kết quả.
