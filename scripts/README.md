# Công cụ dự án

- `benchmark/` chứa dispatcher và runner kiểm tra Agent, prefilter và pipeline. Dùng `npm run benchmark -- --help` để xem lệnh được hỗ trợ.
- `benchmark/run-ipi-policy-smoke.cjs` là lệnh kiểm tra nhanh policy scan. Chạy `node scripts/benchmark/run-ipi-policy-smoke.cjs` từ gốc repo.
- `metrics/` chứa hàm tính chỉ số, kiểm tra lịch sử và công cụ tổng hợp báo cáo.
- `data/` chứa công cụ chuẩn bị manifest, rà nhãn và kiểm tra cấu hình lưu trữ dữ liệu huấn luyện.
- `dev/` kiểm tra phiên bản Node/npm và cấu hình vùng lưu tạm.
- [`organize-benchmark.cjs`](../archive/scripts-passed/organize-benchmark.cjs) đã được lưu trữ để đối chiếu cây benchmark cũ.

Regression cho các công cụ nằm ở `tests/tooling/`. Dùng `npm run test:benchmark` cho test Node CJS và `npm test` cho Vitest.
