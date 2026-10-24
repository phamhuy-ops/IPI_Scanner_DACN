# Ánh xạ citation về văn bản gốc

## Lỗi và phạm vi sửa

Baseline model thật có quote tiếng Việt gộp các dòng nên không còn là substring
nguyên văn. Validator trước đây từ chối cả khác biệt về trình bày này. Nay ưu
tiên khớp exact; nếu không khớp, chỉ thu gọn space/tab/CR/LF để tìm một vị trí
duy nhất trong đúng chunk model chỉ ra, rồi lấy lại nguyên văn từ nguồn.

Citation lưu đoạn nguồn, số dòng nguồn, `alignment: layout_whitespace` và
`modelQuote` để truy vết khi có ánh xạ. Không thay stance hay lý do model.
Không sửa chữ, dấu tiếng Việt, dấu câu, Unicode, dấu ba chấm, lời giải thích
thêm vào quote, hoặc ghép nội dung nhiều chunk. Khớp mơ hồ bị từ chối.
Prompt, model, rule và chính sách kết luận giữ nguyên trong lần sửa này.

Đây chỉ là phục hồi khác biệt layout, không kiểm chứng lý luận hay ý đồ.
Quote bịa/thêm nội dung của case-09 và lỗi suy luận đồng thuận vẫn cần xử lý
riêng. Phản hồi không hợp lệ vẫn dẫn tới cần xem xét.

## Kiểm chứng tự động

120 test qua trong 8 file; lint và build/typecheck qua. Có đối chứng Việt/Anh,
văn bản sạch, CRLF, ánh xạ số dòng, thay từ/dấu/thêm lời giải thích, trùng vị trí
và trích dẫn vượt chunk. Vitest được chạy ngoài sandbox sau lỗi EPERM ghi cache
tạm; lần chạy đó hoàn tất. Build còn cảnh báo Vite đã ghi nhận trước đây.

Các test chứng minh ràng buộc ánh xạ, không chứng minh cải thiện recall hay
chất lượng nhận định. Dữ liệu test/holdout không được dùng để chỉnh sửa.

## Replay và model thật

Replay đúng phản hồi Detector baseline `round-one-eval-JarPHE` bằng validator
mới: case-08 chỉ khác layout được chấp nhận với 1 citation ánh xạ; case-09 thêm
lời giải thích vẫn bị từ chối. Lưu ở
`benchmark/results/round-one-eval-2Bj3lQ/citation-replay.json`. Đây là đối chiếu
trực tiếp tác động validator, không phải kết luận ngữ nghĩa của model.

Đo lại bộ 10 ca bằng `npm run benchmark:round-one`, run `round-one-eval-2Bj3lQ`:

- 6 benign: 1 chưa phát hiện, 2 báo IPI nhầm, 3 cần xem xét.
- 4 malicious: 0 được xác nhận, 2 chưa phát hiện, 2 cần xem xét.
- 8 ca hoàn tất; 2 invalid_response (case-09 quote sai; case-10 JSON không hợp lệ).
- 16/18 phản hồi qua validation; trung bình 10,37 giây/ca.
- Precision alert 0/2, confirmed recall 0/4, F1=0, FPR 2/6; review tách riêng.
  Kết quả từng nguồn, log, model/code hash và tài nguyên ở summary của run.

Case-08 nay hoàn tất nhưng vẫn cần xem xét: ánh xạ citation không tự giải quyết
nghi vấn ngữ nghĩa. Các số tổng không chứng minh tăng hiệu quả; HTML extraction
đã thay đổi so với baseline cũ và model có biến động giữa các lần chạy. Không
quy mọi khác biệt kết luận cho thay đổi citation. Chưa chạy holdout độc lập.

Bước tiếp ưu tiên nhận định sai trên tài liệu sạch và bỏ sót exfiltration, với
đối chứng đa nguồn và directive/context rõ ràng; chưa thêm phản biện ngay.
