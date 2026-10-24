# Chính sách kết luận một vòng

## Hành vi đã triển khai

- Rule chỉ tạo nghi vấn có ID, rule ID, đoạn khớp và vị trí. Không tự ép fail.
- Detector đọc toàn bộ chunk được chọn, đánh giá nghi vấn và tìm chỉ dẫn mới
  ngay cả khi rule không khớp.
- Verifier xem các đoạn nghi vấn và văn bản gốc; ở vòng đầu không được cung cấp
  stance/lập luận của Detector, để tránh chỉ sao chép sự đồng ý.
- Hai agent trả từng nhận định confirmed/dismissed/uncertain, lý do và trích dẫn.
  Lý do tối thiểu 20 ký tự là kiểm tra cấu trúc, không chứng minh lập luận đúng.
- JSON Schema ràng buộc trường, ID và bằng chứng của nghi vấn có sẵn ngay khi
  sinh phản hồi; ứng dụng tiếp tục kiểm tra schema và đối chiếu quote chính xác
  với chunk gốc. Không coi JSON đúng cú pháp là phản hồi hợp lệ.
- Citation dùng ID ngắn cho model; giữ source chunk ID, file path và dòng trong
  văn bản trích xuất để truy vết. Không suy ra vị trí gốc của PDF/ảnh từ các dòng
  văn bản này. Model không được tạo hoặc đổi ID của nghi vấn có sẵn.
- Verifier chia bằng chứng thành batch chứa nguyên chunk, không slice mất phần
  cuối rồi vẫn coi là đã đọc đủ. Lỗi ngân sách được hiển thị thay vì che giấu.

## Quy tắc tổng hợp

- Một nghi vấn chỉ confirmed khi cả hai agent xác nhận bằng chứng hợp lệ.
- Chỉ dismissed khi cả hai bác bỏ với lý do và citation hợp lệ.
- Bất đồng, uncertain, thiếu một nhận định hoặc thiếu đoạn gốc → unresolved.
- Phát hiện IPI: có ít nhất một nghi vấn confirmed; vẫn ghi thiếu coverage/lỗi
  ở phần còn lại nếu có. Đây là xác nhận của model, không phải nhãn người đã duyệt.
- Cần xem xét: chưa có confirmed và còn unresolved, thiếu coverage hoặc lỗi.
- Chưa phát hiện IPI: không confirmed/unresolved, cả hai review thành công và
  coverage đầy đủ trên văn bản được trích xuất. Không phải bảo đảm an toàn.
- Nghi vấn mới chỉ Verifier phát hiện cần được Detector xem lại; vòng một giữ
  unresolved. Chưa có vòng phản biện tự động.

## Coverage và lỗi

Không đủ coverage khi thiếu metadata, chỉ chọn một phần chunk, file trích xuất
lỗi/không có text được chọn hoặc chạm giới hạn file thư mục. Hai vai trò dùng
cùng model cũng được ghi nhận là hạn chế xác minh độc lập. Coverage không chứng
minh extraction giữ mọi nội dung như comment HTML, ảnh PDF hoặc OCR.

Lifecycle của phiên quét và processingStatus tách khỏi security verdict. UI hiển
thị completed/model_error/invalid_response/timeout/scan_error riêng. Preflight
Ollama lỗi không được để giao diện ở trạng thái đang chạy hoặc báo IPI.

Ngân sách mặc định một phiên là 180 giây, một request model tối đa 45 giây và
chia sẻ ngân sách khi đổi endpoint. Quét file chờ tối đa 60 giây trong ngân sách
còn lại. Cleanup unload model chờ tối đa 1,5 giây mỗi request. Timeout dừng chờ
kết quả và không sử dụng phản hồi muộn; không bảo đảm hủy tính toán bên trong
Ollama nếu bridge bỏ qua việc hủy. Chưa có vòng lặp để hiển thị “treo phản biện”.

## Kiểm chứng và giới hạn

Test bao phủ: rule bị bác bỏ, bất đồng, phát hiện AI không có rule, phát hiện
mới chỉ Verifier thấy, thiếu coverage/file lỗi, sai schema, quote giả, lỗi model,
timeout, cleanup treo và các nhãn UI. Test dùng phản hồi mô phỏng không đo độ
chính xác của Gemma/Qwen. Các smoke tổng hợp bằng model thật được lưu riêng
trong `benchmark/results/ipi-policy-smoke-*`, gồm phản hồi nguyên bản và kết quả;
các lần thất bại vẫn được giữ lại. Không dùng chúng làm holdout hay tự đổi đáp án.

Lệnh chạy:

```powershell
npm test
node scripts/run-ipi-policy-smoke.cjs
```

Smoke cần Ollama cùng gemma3:1b và qwen2.5-coder:1.5b. Nó gọi đúng core
extraction/prefilter/chunking/Detector/Verifier qua bridge headless; chưa kiểm
thử Electron IPC, giao diện tương tác hoặc toàn bộ định dạng tài liệu thực tế.
Exit code khác 0 khi có model error hoặc kết quả khác nhãn kỳ vọng, kể cả khi
chính sách đã xử lý bất đồng đúng bằng “Cần xem xét”. Không gộp review-needed
thành clean để làm đẹp điểm.

Structured output không ngăn hai model cùng suy diễn sai. Đúng quote cũng không
chứng minh quote là chỉ dẫn tấn công. Model agreement cần đánh giá chất lượng
trên các cặp sạch/tấn công đa nguồn; chưa cho phép tự chuyển dữ liệu vào RAG.

Tham khảo API: [Ollama Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs).
Schema giúp ràng buộc định dạng; không thay thế việc kiểm tra quote hoặc đánh
giá tính đúng đắn của suy luận.

## Kết quả kiểm tra phiên triển khai

- 94 test ứng dụng, gồm test logic chính sách, transport timeout và render UI,
  đã đạt. Bốn test công cụ benchmark cũng đã đạt trong phiên này.
- Smoke cuối `benchmark/results/ipi-policy-smoke-EMX2Bu/results.json` dùng
  gemma3:1b và qwen2.5-coder:1.5b thực tế, không mock phản hồi model.
- Cả hai ca hoàn tất với phản hồi hợp lệ, nhưng chưa đạt nhãn kỳ vọng:
  clean → needs_review (Detector uncertain, Verifier bác bỏ);
  attack → needs_review (nghi vấn rule: Detector bác bỏ, Verifier uncertain).
- Đây là bằng chứng chính sách giữ bất đồng cho con người, KHÔNG phải smoke
  accuracy đạt. Script trả exit code 1 và giữ nguyên kết quả; không đổi kỳ vọng
  để làm test xanh. Những lần smoke lỗi định dạng/bằng chứng trước đó vẫn lưu.
- Chưa đo accuracy/recall của chính sách mới trên dev/controls nhiều nguồn và
  chưa chấm holdout. Độ đúng của model, mức bất đồng, prompt và false-negative
  cần đánh giá trước khi coi vòng một đủ tin cậy hoặc mở rộng vòng phản biện.

## Bước tiếp theo

Phép đo 10 ca đã hoàn tất sau smoke, kết quả và thứ tự ưu tiên mới nằm ở
`danh-gia-luong-xu-ly-mot-vong.md`. Nó phát hiện lỗi extraction và đồng thuận/bỏ sót
của model, nên cần xử lý trước khi triển khai phản biện tự động.

1. Đo tỷ lệ phản hồi hợp lệ, review-needed, sai/bỏ sót và độ đúng bằng chứng của
   vòng một trên bộ nhỏ đa nguồn + fixture thực tế, giữ kết quả từng vai trò.
2. Thêm phản biện chỉ cho unresolved, tối đa 3 vòng tổng cộng, có ngữ cảnh gốc,
   theo dõi thay đổi lập luận, dừng khi không tiến triển và ngân sách thời gian.
   Chưa đủ điều kiện thì vẫn Cần xem xét; lỗi có trạng thái riêng.
3. So sánh một vòng với phản biện trên cùng dev/controls trước khi khóa cấu hình
   và đánh giá holdout độc lập; đo cả tác động thời gian, không chỉ điểm số.
# Cập nhật vị trí tài liệu và citation

Tài liệu được gom tại [mục lục](../README.md). Validator hiện có thể ánh xạ
khác biệt space/tab/xuống dòng về đúng đoạn nguồn duy nhất; citation cuối vẫn
là nguyên văn. Xem [báo cáo citation](anh-xa-trich-dan-ve-nguon.md). Nội dung
thêm/bớt từ hoặc khớp mơ hồ vẫn bị từ chối.

