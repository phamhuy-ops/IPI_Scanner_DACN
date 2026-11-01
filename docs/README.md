# Tài liệu dự án

Điểm vào ngắn gọn, cập nhật 2026-10-26.

File mẫu và dataset hiện có được tập hợp tại [kho kiểm thử](../benchmark/kiem-thu/README.md), gồm danh mục file CSV và nhãn/nguồn riêng cho báo cáo.

Tiến độ mới: [tuần 3 — dọn công cụ và chia nhánh công việc](../kế%20hoạch%20-%20nhật%20ký%20tuần/tuan-03.md). Công cụ hiện hành qua `scripts/benchmark.cjs`; [script thử nghiệm đã nghỉ dùng và hash](../benchmark/archives/don-dep-2026-10-28/README.md) nằm trong ZIP, không còn là lệnh chạy trực tiếp trong workspace.

| Cần xem gì? | Tài liệu |
| --- | --- |
| Dự án làm gì, cách chạy | [README dự án](../README.md) |
| Luồng và thành phần kỹ thuật | [Phạm vi và kiến trúc](architecture/pham-vi-va-kien-truc-du-an.md) — tài liệu cũ giữ nguyên ngôn ngữ |
| Kết quả quan trọng, trạng thái và giới hạn | [Bảng tổng hợp hiện trạng](reports/tong-hop-hien-trang.md) |
| Làm gì tiếp theo | [Việc cần làm](planning/cong-viec-can-lam.md) |
| Ưu tiên 1 đã xong chưa | [Tiến độ](planning/tien-do-uu-tien-1.md), [tiêu chí đã khóa](planning/cong-hoan-thanh-uu-tien-1.md) |
| Chuẩn bị học một Verifier | [Kế hoạch pilot](planning/ke-hoach-thu-fine-tuning-verifier.md) |
| Khi nào thêm phản biện | [Điều kiện](planning/tieu-chi-them-vong-phan-bien.md) |
| Cách gán nhãn, mở rộng và AI rà dữ liệu | [Gán nhãn](guides/huong-dan-gan-nhan-ngu-canh.md), [mở rộng](guides/mo-rong-du-lieu-ngu-canh-verifier.md), [AI tự rà](guides/tu-danh-gia-du-lieu-verifier.md) |
| Python/cache/model trên ổ E | [Hướng dẫn lưu trữ](guides/luu-tru-huan-luyen-tren-o-e.md) |

## Quy ước tài liệu từ bây giờ

- Chỉ duy trì giới thiệu, hướng dẫn, việc cần làm và báo cáo quan trọng dạng tóm tắt bằng tiếng Việt.
- Cập nhật bảng tổng hợp và việc cần làm khi trạng thái đổi; không tạo một báo cáo/kế hoạch mới cho từng lượt chạy.
- Báo cáo ngắn ghi kết quả, giới hạn và đường dẫn bằng chứng; số liệu chi tiết, hash, lệnh và log nằm trong `benchmark/experiments/` hoặc `benchmark/results/`.
- Tách việc đã triển khai với thử nghiệm; không tính test kỹ thuật là cải thiện bảo mật.
- Chỉ tạo tài liệu riêng khi có quy trình mới cần dùng lại hoặc thay đổi kiến trúc quan trọng.

## Lịch sử đã thu gọn

Báo cáo trung gian và kế hoạch thử cũ đã rời thư mục docs. Snapshot trước
dọn nằm trong [ZIP lịch sử](../benchmark/archives/docs-truoc-rut-gon-2026-10-26.zip),
kèm [danh mục/hash](../benchmark/archives/docs-truoc-rut-gon-2026-10-26.json).
Đường dẫn docs cũ trong artifact bất biến được tra qua danh mục này; không
viết lại kết quả lịch sử. Dữ liệu và baseline không bị xóa.
