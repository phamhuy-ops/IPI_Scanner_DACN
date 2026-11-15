# Biểu diễn chuẩn hóa 27 mẫu nguồn ngoài

Đây là 27 nguồn đã duyệt với 54 biểu diễn input/target kiểm tra hợp đồng,
không phải 54 mẫu độc lập hoặc tập train đã xuất. Giữ source/group của
hai biến thể cùng nhau. Raw và quyết định duyệt không bị sửa.

`nhan-va-bang-chung.jsonl` chứa nhãn/span/provenance. `dau-vao/` chỉ chứa
input model; `dap-an/` chứa JSON đích. `bien-the-kiem-tra.json` ánh xạ hai
chế độ whole_source/none về nguồn. Không đưa metadata hàng nhãn vào input.

54/54 bản tái dựng đúng và qua parser; xem `kiem-tra-chuan-hoa.json` và
`manifest.json`. Chưa duyệt ranh giới span mới từng mẫu; nếu chưa có quote
riêng thì giữ cả nguồn thay vì đoán. Các bản này chưa có tokenizer/mask,
chưa chốt split và chưa sẵn sàng train.

Xem [báo cáo chuẩn hóa và audit kho](../../../../docs/reports/chuan-hoa-bang-chung-va-ra-trung-toan-kho.md).
Tái kiểm tra bằng `node scripts/audit-normalized-external.cjs` tại gốc
dự án. Không chạy prepare để ghi đè hoặc tự đưa direct/mixed trở lại.
