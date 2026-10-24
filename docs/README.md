# Mục lục tài liệu dự án

- [Việc cần làm](planning/cong-viec-can-lam.md): ưu tiên, tồn đọng và bước tiếp.
- [Tiêu chí thêm vòng phản biện](planning/tieu-chi-them-vong-phan-bien.md).
- [Kế hoạch pilot fine-tuning Verifier](planning/ke-hoach-thu-fine-tuning-verifier.md).
- [Hướng dẫn rà soát nhãn chỉ dẫn/ngữ cảnh](guides/huong-dan-gan-nhan-ngu-canh.md).
- [Lưu trữ huấn luyện trên ổ E](guides/luu-tru-huan-luyen-tren-o-e.md).
- [Báo cáo](reports/): triển khai, phép đo và các giới hạn đã ghi nhận.
  - [Chính sách phân tích một vòng](reports/chinh-sach-phan-tich-mot-vong.md)
  - [Mốc đo ban đầu với model thật](reports/danh-gia-luong-xu-ly-mot-vong.md)
  - [Kiểm chứng trích xuất HTML](reports/kiem-chung-trich-xuat-html.md)
  - [Ánh xạ trích dẫn về nguồn](reports/anh-xa-trich-dan-ve-nguon.md)
  - [Thử nghiệm directive và ngữ cảnh](reports/thu-nghiem-chi-dan-va-ngu-canh.md)
  - [Đo nhận định có cấu trúc](reports/danh-gia-nhan-dinh-co-cau-truc.md)
  - [Đánh giá tham chiếu bằng mã nguồn](reports/danh-gia-tham-chieu-bang-ma-nguon.md)
  - [Rút gọn JSON Verifier và đo lại ca bỏ sót](reports/rut-gon-json-verifier-va-do-lai-ca-bo-sot.md)
  - [Đo nhận diện IPI và gán ngữ cảnh từng model](reports/do-nhan-dien-ipi-va-gan-ngu-canh-tung-model.md)
  - [Thử làm rõ nghĩa stance](reports/thu-nghiem-lam-ro-nghia-stance.md)
  - [Đánh giá model thay thế Verifier](reports/danh-gia-model-thay-the-verifier.md)
  - [Chuẩn bị bộ nhãn chỉ dẫn và ngữ cảnh](reports/chuan-bi-bo-nhan-chi-dan-va-ngu-canh.md)
  - [Kiểm tra môi trường huấn luyện Verifier](reports/kiem-tra-moi-truong-huan-luyen-verifier.md)
  - [Phân tích bộ lọc trên tập phát triển](../benchmark/data/phan-tich-bo-loc-tren-tap-phat-trien.md)
- [Kiến trúc và phạm vi](architecture/pham-vi-va-kien-truc-du-an.md).
- [Kế hoạch và nhật ký tuần](../kế%20hoạch%20-%20nhật%20ký%20tuần/README.md).
- [Dữ liệu benchmark](../benchmark/data/README.md): nguồn, chuẩn hóa và chia tập.
- Kết quả chạy máy và log: `benchmark/results/` (giữ nguyên để bảo toàn baseline).

README, CONTRIBUTING và AGENTS ở gốc là các điểm vào sử dụng/phát triển dự án.
Đặt báo cáo mới trong `reports/`, kế hoạch trong `planning/`, mô tả thiết kế
trong `architecture/`, rồi cập nhật mục lục này. Các báo cáo cũ là lịch sử đo,
không tự thay số liệu khi code mới thay đổi.
