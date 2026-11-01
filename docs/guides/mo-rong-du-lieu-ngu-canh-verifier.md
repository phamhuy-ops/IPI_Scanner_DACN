# Mở rộng dữ liệu ngữ cảnh cho Verifier

Lưu ý cập nhật 2026-10-26: số lượng và trạng thái môi trường bên dưới thuộc
snapshot mở rộng đầu tiên. Dùng tài liệu này cho quy trình/lệnh; xem
[bảng hiện trạng](../reports/tong-hop-hien-trang.md) cho trạng thái mới nhất.
Không suy mẫu còn pending hoặc máy chưa có thư viện từ mô tả lịch sử.

Lượt 02 đã duyệt xong 30 mẫu; xem
[tổng kết quyết định](../../benchmark/data/annotations/verifier-expansion-v1/tong-ket-luot-duyet-02.md).
Audit hỗ trợ cả phiếu pending và phiếu đã duyệt, giữ kiểm tra hash đề xuất
và cách ly direct/mixed. Các số lượng pending bên dưới mô tả snapshot
lúc chuẩn bị, không thay thế quyết định cuối trong phiếu.

Sau khi duyệt batch 30 mẫu tự soạn, đã chuẩn bị hàng chờ gồm 356 mẫu từ
hai nguồn có sẵn: 339 NotInject và 17 realistic prompt injections. Đây
là mẫu mới cho công việc gán nhãn ngữ cảnh, không phải nguồn mới đối với
dự án. Cả hai nguồn đã dùng làm dev nên không được gọi là holdout độc lập.
Giữ riêng 20 mẫu tham chiếu cũ và 30 mẫu pilot vừa duyệt.

Tất cả mẫu bổ sung vẫn `pending`: `source_label` chỉ là nhãn của nguồn,
không tự suy thành confirmed/dismissed hoặc các trường ngữ cảnh. Annotation
để null, chưa có completion huấn luyện. Phải đọc nguồn đầy đủ, xác định
chỉ dẫn đang có hiệu lực, người nhận, ranh giới trích dẫn, hành vi lệch
nhiệm vụ và điều thiếu thật sự trước khi chốt nhãn. Dữ liệu realistic có
thể có scope khác IPI; giữ attack_scope để người duyệt xem xét, không
ép nhãn nguồn thành nhãn bài toán.

## Kiểm tra trùng và bản chia dự kiến

Đã kiểm tra 406 văn bản: 356 ứng viên và 50 mẫu tham chiếu/pilot. Gom
các family đã biết trước, sau đó so trùng chuẩn hóa Unicode NFKC/casefold/
khoảng trắng và Jaccard của tập token trigram từ 0.8. Không gom chỉ vì
cùng từ khóa hoặc cùng loại hành vi.

Có 2 ứng viên trùng chuẩn hóa với ann-009 và ann-010 của bộ tham chiếu.
Nhóm chứa chúng được đánh dấu reference_only, không đưa sang train/dev/
probe mới và không nằm trong lượt duyệt mới. Không xóa nguồn hoặc bản
ghi trùng; giữ để truy vết. Toàn bộ 406 văn bản thuộc 376 nhóm theo heuristic
này. Bốn kiểm thử gom nhóm và audit snapshot đều đạt, không có xung đột
role trong cùng nhóm.

Hash nhóm với seed=42 cho ra phân bổ dự kiến 207 train_candidate,
73 dev_candidate, 74 transfer_probe_candidate; 2 reference_only. Đây
chỉ là tên các bucket để kiểm tra ranh giới nhóm, chưa xuất train/dev.
transfer_probe_candidate không có nghĩa là sealed hoặc độc lập: nguồn đã
được xem ở giai đoạn dev. Chưa rà gần trùng toàn bộ BIPIA/dev/test/fixture,
chưa dùng embedding hoặc xác minh hết bản dịch và nguồn tài liệu gốc.
Chưa được coi là chia tập hoàn chỉnh hoặc bảo đảm không rò rỉ ngữ nghĩa.

## Lượt duyệt tiếp theo

Trong `benchmark/data/annotations/verifier-expansion-v1/`:

- `hang-cho-gan-nhan.jsonl`: nguồn nguyên vẹn, provenance, nhãn nguồn,
  nhóm và trạng thái chờ; không phải input đưa thẳng vào model.
- `luot-duyet-02.json`: 30 mẫu chờ duyệt, mỗi nguồn 15 mẫu, không có nhãn
  ngữ cảnh tự động. Chọn bằng hash và luân phiên nguồn, không dựa score.
- `anh-xa-luot-duyet-02.json`: ánh xạ phiếu sang file văn bản trung tính.
- `van-ban/`: nội dung nguồn thuần, không chèn ID/nhãn/provenance vào text.
- `nhom-va-chia-du-kien.json`: thành viên nhóm, cạnh gom và role dự kiến.
- `bao-cao-chuan-bi.json`, `kiem-tra-hang-cho.json`: hash nguồn/raw,
  license khai báo trong card cục bộ, số lượng, kết quả kiểm tra và giới hạn.

Chưa được dùng bản chia dự kiến để lựa chọn model hoặc huấn luyện trước
khi duyệt, bổ sung provenance còn thiếu và rà toàn kho. Nếu thay nội dung,
thêm bản dịch/biến thể hoặc chốt nhãn, phải gom nhóm và kiểm tra lại; không
phá nhóm để giữ tỷ lệ đẹp. Các bản raw và baseline cũ không thay đổi.

## Phần còn thiếu trước pilot

Theo nhãn nguồn có 346 benign và 10 malicious; đây là mất cân bằng đáng
kể, không phải đã đạt mục tiêu 300 mẫu hữu ích. Ngôn ngữ mới chưa duyệt,
chưa đáp ứng tỷ lệ tiếng Việt, chưa có nhãn uncertain ngữ cảnh được xác
minh trên các ứng viên, chưa bổ sung đủ tài liệu dài/định dạng thực tế.

Cần bổ sung mẫu tấn công, ví dụ trích dẫn, mẫu thiếu ngữ cảnh thực sự và
tiếng Việt từ nhiều tình huống; không nhân bản đổi tên để đủ số lượng.
Holdout độc lập vẫn chưa thu thập, cần ít nhất hai family nguồn thực sự
độc lập sau khi kiểm tra provenance và overlap với mọi tập đã dùng. Một
dataset khác tên hoặc một bucket hash mới không chứng minh tính độc lập.
Chỉ khóa train/dev và bộ kiểm chứng sau khi đủ nhãn, cân bằng cần thiết và
rà soát nhóm. Chưa cài thư viện ML, tải thêm weights hoặc fine-tune.

## Lệnh kiểm tra

Python vẫn dùng môi trường trên E, code và dữ liệu gán nhãn nhỏ ở C:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/python-verifier.ps1 scripts/audit-verifier-expansion.py
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/python-verifier.ps1 -m unittest scripts.test_verifier_expansion -v
```

Lệnh tạo là `scripts/prepare-verifier-expansion.py` qua cùng wrapper. Script
từ chối ghi đè thư mục đã có, tránh mất phiếu. Audit hiện dành cho snapshot
và phiếu đã duyệt; không reset phiếu về pending để vượt kiểm tra.
