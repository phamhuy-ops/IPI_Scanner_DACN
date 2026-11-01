# Bản chuẩn hóa dữ liệu bổ sung Verifier

15 nguồn, giữ nguyên nhãn đã duyệt; 251 cửa sổ và 30 bản xem trước qua parser. Chưa chia tập, chưa dùng train.

- `nhan-va-cua-so.jsonl`: văn bản gốc, offset UTF-16 và các cửa sổ; 236 cửa sổ chưa có nhãn.
- `ban-xem-truoc.json`: 30 hợp đồng input/target; metadata ngoài messages, không phải 30 nguồn.
- `doi-chieu-cua-so.md`: phiếu duyệt riêng span/ngữ cảnh cửa sổ mới.
- `tong-ket-nhom.json`: 15 nguồn quy về 3 nhóm bảo thủ; mọi cửa sổ cùng nguồn giữ chung nhóm.
- `manifest.json` và `kiem-tra-chuan-hoa.json`: hash, phương pháp và kết quả tái dựng.

Nguồn gốc và các lượt người dùng duyệt được giữ ở `../verifier-gap-v1/`. Không tự xác nhận phần span mới thay người dùng. Xem [báo cáo](../../../../docs/reports/chuan-hoa-cua-so-va-ra-trung-du-lieu-bo-sung-verifier.md).
