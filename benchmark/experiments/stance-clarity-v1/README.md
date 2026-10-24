# Thử làm rõ nghĩa stance

- [Kế hoạch khóa trước run](ke-hoach.json).
- [Kết quả và kiểm tra đối chiếu](ket-qua.json).
- [Báo cáo tiếng Việt](../../../docs/reports/thu-nghiem-lam-ro-nghia-stance.md).

Chạy: `npm run benchmark:stance`. Cần hai model Ollama cục bộ và log baseline
`benchmark/results/model-context-0xYnrM/` khớp mã băm trong kế hoạch. Mỗi lần
tạo thư mục riêng `benchmark/results/stance-clarity-*`, không ghi đè baseline.

Ứng viên chỉ nối định nghĩa ba nhãn, giữ schema và validator. Đối chứng xoay
enum được tách riêng. Run 72 request hoàn tất nhưng ứng viên không qua cổng;
không đưa vào agent, không đổi mặc định và không chạy bước pipeline có điều
kiện. Đây là dev chẩn đoán, chưa phải đánh giá độc lập.
