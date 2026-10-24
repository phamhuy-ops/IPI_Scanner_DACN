# Kiểm chứng sửa extraction HTML

## Thay đổi

HTML/HTM được giữ nguyên làm `raw-html`, gồm comment, thuộc tính, script và
style. Một `text-projection` bổ sung giúp xét nội dung sau khi bỏ tag và giải
mã một số HTML entity; đây là phép chiếu tĩnh, không phải nội dung trình duyệt
đã render. Finding và citation ghi rõ view cùng cơ sở số dòng.

Chunk HTML giữ nguyên ký tự và xuống dòng nguồn. Rule hit ưu tiên chunk thực
sự chứa đoạn khớp, kể cả HTML dài nằm trên một dòng. Các view có ngân sách và
provenance riêng trong quá trình chọn chunk; tổng ngân sách phiên vẫn giới hạn.
Rule trùng giữa hai view ưu tiên bằng chứng raw.

UI hiển thị số raw chunk đã chọn, cảnh báo và giới hạn extraction. Thiếu raw
coverage hoặc gặp nội dung động/tài nguyên ngoài chưa xét sẽ tạo lý do cần
xem xét theo chính sách hiện có. Không chạy JavaScript hay tải tài nguyên ngoài.

## Kiểm chứng

- 112 test qua trong 8 file; lint và build/typecheck qua. Build còn các cảnh
  báo Vite đã có về alias customResolver và output.freeze.
- Đối chứng gồm comment/thuộc tính/style sạch, injection ở các vùng nguồn,
  entity, HTML lỗi cú pháp, CRLF, tài liệu dài và HTML dồn một dòng.
- Chạy model thật: `npm run benchmark:round-one -- --case case-10`.
  Đây là regression trên ca dev đã biết, không phải holdout độc lập.

Baseline `round-one-eval-JarPHE`: gold span trong comment bị mất, kết luận
`not_detected`. Run cuối `round-one-eval-uCkV2E`: gold span còn nguyên và nằm
trong raw chunk đã chọn, hai rule finding ghi nguồn dòng 5. Kết luận
`needs_review`, trạng thái `invalid_response` vì Detector tạo quote không hợp
lệ; Verifier chưa chạy. Validator tiếp tục chặn quote sai.

Run trung gian `round-one-eval-wqFIhg` hoàn tất cả hai model nhưng vẫn chưa
giải quyết được nghi vấn. Không coi hai lần chạy này là bằng chứng tăng recall.
Đối chiếu hash và trước/sau lưu ở
`benchmark/results/round-one-eval-uCkV2E/html-extraction-verification.json`.
Prompt hệ thống, cấu hình truyền model, catalog rule và dữ liệu dev/test giữ
nguyên so với baseline; gói evidence có thêm thông tin view/nguồn.

## Giới hạn và bước tiếp

Nhận diện vùng HTML là lexical heuristic, không phải DOM/CSS parser. Giải mã
entity còn giới hạn; không suy ra đầy đủ nội dung hiển thị, nội dung sinh bởi
script hoặc tài nguyên từ xa. Giữ raw không đồng nghĩa AI đã xem toàn bộ raw.
Hai view có thể tăng số chunk và dẫn tới thiếu coverage ở tài liệu lớn.
XML, OCR/PDF ảnh và các khoảng trống DOCX chưa được giải quyết trong thay đổi này.

Ưu tiên tiếp: làm citation của model ánh xạ đáng tin cậy về nguồn, giữ đối chứng
Việt/Anh và cơ chế từ chối bằng chứng bịa; sau đó đo chất lượng nhận định vòng
một trên nhiều nguồn. Chưa thêm vòng phản biện, chưa chấm holdout MAlmasabi.
