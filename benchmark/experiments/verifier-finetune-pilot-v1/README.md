# Kế hoạch pilot fine-tuning một Verifier

- [Kế hoạch máy đọc](ke-hoach.json): mục tiêu, data roles, cấu hình đề xuất và cổng.
- [Kế hoạch tiếng Việt](../../../docs/planning/ke-hoach-thu-fine-tuning-verifier.md).
- [Metadata commit model gốc](phien-ban-model-goc.json): chỉ metadata, không weights.
- [Snapshot môi trường](kiem-tra-moi-truong.json).
- [Báo cáo kiểm tra máy](../../../docs/reports/kiem-tra-moi-truong-huan-luyen-verifier.md).

Trạng thái planned_not_started. Model gốc Qwen2.5-1.5B-Instruct được khóa
commit; dữ liệu train/dev/probe/holdout là kế hoạch thu thập, chưa được tạo.
20 mẫu đã duyệt chỉ là chuẩn ontology/regression dev, không train hoặc gọi
là holdout độc lập. Hợp đồng đầu ra đích là referenced-v1/compact-v1 hiện có;
renderer/exporter và training environment chưa triển khai/kiểm chứng.

Chưa tải thêm weights, cài thư viện, tạo adapter hoặc đổi agent. Tái kiểm
tra inventory bằng `npm run training:verifier:inspect`. Không có lệnh train
trong phiên bản này; muốn train phải qua điều kiện dữ liệu, môi trường,
smoke và snapshot cấu hình nêu trong kế hoạch, không suy readiness từ file này.
