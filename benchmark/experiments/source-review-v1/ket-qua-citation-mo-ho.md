# Chặn discovery trùng chữ bị tự gán sai vị trí

Ngày 29/10/2026. Đã áp dụng sửa validator định vị, không đổi model/prompt mặc định. Ưu tiên1 chưa đạt90%.

## Lỗi và cách sửa

Discovery theo hợp đồng classic-v1 chỉ có quote/chunkId, không có mã xác thực vị trí. Trước sửa, khi quote lặp trong một chunk, citationFor tự dùng lần đầu. Nếu một câu nằm trong ví dụ rồi được dùng làm lệnh thật ở chỗ khác, bằng chứng có thể bị gán vào ví dụ dù lời giải đang nói về lệnh thật. Quote có trong nguồn chưa đủ chứng minh đúng vị trí.

Giờ discovery classic không có vị trí bị từ chối nếu quote xuất hiện hơn một lần trong chunk. Giữ invalid_citation/needs_review và phần chưa rà; yêu cầu trích thêm ngữ cảnh để chỉ còn một lần xuất hiện. Không đoán vị trí từ reason, không tự chọn lần đầu/cuối, không đổi stance hoặc nới validator. Ngữ cảnh duy nhất vẫn hợp lệ; discovery classic-spans-v1 đã có spanId được xác thực vẫn khôi phục đúng lần xuất hiện. Nhận định theo ID/vị trí đã giao và các hợp đồng khác không nằm trong thay đổi này. Đây chưa loại mọi dạng mơ hồ ở mọi hợp đồng.

## Bằng chứng trước/sau

[Bộ kiểm chứng](../../results/ambiguous-discovery-validation-IFcNTM/quyet-dinh.json) giữ source trước sửa, snapshot sau sửa, lệnh và kết quả. Bốn ca unit tái hiện (cùng dòng, LF, CRLF, tên lành Dan Evans lặp) đều thất bại trước sửa; sau sửa đạt. Có controls quote mở rộng duy nhất và spanId chọn đúng lần thứ hai.

So sánh trước/sau dùng extractor/pipeline thật trên cùng bốn file TXT; chỉ thay module policy bằng snapshot trước/sau. Phản hồi model giả lập cố định, không inference. Tổng8 pipeline/16 phản hồi giả lập:

- Câu giống nhau ở ví dụ và lệnh thật: bản cũ confirmed nhưng gán dòng1 (ví dụ), bản mới needs_review/invalid_citation.
- Hai câu ví dụ lặp với phản hồi model giả xác nhận: bản mới không nhận vị trí mơ hồ. Đây là kiểm tra lỗi có kiểm soát, không chứng minh model thực tế báo nhầm ca đó.
- Quote có ngữ cảnh duy nhất vẫn detected đúng dòng2 ở cả hai bản.
- Văn bản thể thao sạch có Dan Evans vẫn not_detected ở cả hai bản.

Không gọi needs_review ở benign/malicious là đúng nhãn. Tác dụng ở đây là không đưa bằng chứng định vị thiếu căn cứ thành xác nhận, không phải tăng accuracy.

Một test tích hợp cũ từng dựa vào giả định tự chọn lần đầu cho quote trùng. Đã đổi phản hồi giả lập classic trong test đó sang trích ngữ cảnh ví dụ duy nhất; test vẫn kiểm tra hai vị trí và phát hiện lệnh thật. Test mới riêng giữ yêu cầu từ chối quote mơ hồ; không bỏ ca lỗi hoặc hạ kỳ vọng kiểm tra.

## Các thử nghiệm model không được áp dụng

[context-before-stance16-FsOWCj](../../results/context-before-stance16-FsOWCj/quyet-dinh.json): dự kiến16 ca, dừng1/16 vì ca001 baseline đúng thành not_detected. Hai phản hồi mới (Detector42,34giây; Verifier5,28giây), không lỗi parser. Rà raw thấy backend đã sinh reason trước stance ở baseline, dù thứ tự properties của schema khác. Giả thuyết chỉ đổi thứ tự properties vì vậy không được xác nhận; phương án gây hồi quy nên loại. Mười lăm ca chưa chạy không được chấm đúng hoặc coi đây là phép đo hoàn tất16.

[summary-last16-jF4qta](../../results/summary-last16-jF4qta/quyet-dinh.json): thử tên root analysis thành summary để tổng kết sau assessments/discoveries, ánh xạ1:1 trước validator cũ. Dừng1/16 vì Detector timeout45giây, không có phản hồi hoàn tất;15 ca chưa chạy. Chưa đủ dữ liệu kết luận ngữ nghĩa, không áp dụng. Không đổi deadline để lấy điểm. Lý do thử là baseline có analysis nói không có lệnh nhưng assessment lại xác nhận lệnh; chưa chứng minh nguyên nhân nằm ở thứ tự sinh.

Hai thử nghiệm tổng3 request attempts,2 phản hồi hoàn tất và1 timeout, không phải3 mẫu độc lập. Driver kế thừa tên new_verifier_calls nhưng biến đếm bao gồm cả Detector: lượt đầu thực tế1D+1V, lượt sau1D timeout. Các quyết định hậu kiểm nêu đúng phạm vi. Raw, request/schema/prompt, code/dataset/model/template/seed42/lệnh và /api/ps được lưu trên E qua alias benchmark/results. Có resource snapshot từng phản hồi nhưng chưa đo tài nguyên CPU/GPU đầy đủ. Không có p95 mới toàn pipeline; không suy p95 từ hai phản hồi hoặc thời gian replay.

## Hồi quy, kết quả giữ lại và giới hạn

- [Replay mặc định](../../results/ambiguous-discovery-default-A4tU8j/tong-hop.json):192 pipeline/382 raw, không inference mới; không đổi request/verdict/processing/suspicion.
- [Replay compact](../../results/ambiguous-discovery-compact16-xBnx9W/tong-hop.json): extractor thật16 file TXT/MD/HTML,32 phản hồi cũ; không lệch request/verdict, vẫn13/16 về nhãn. Đây không phải phép đo model live mới hoặc kiểm chứng độc lập.
- 432 test sản phẩm/35 file,31 benchmark, lint/typecheck/build đạt. Còn warning build customResolver/freeze đã có. Không thêm runner/script cấp đầu.

Kết quả giữ lại về nhận diện vẫn13/16 (81,25%): TP7 FP2 TN6 FN1 gồm một malicious abstention; precision0,778 recall0,875 F1 0,824 FPR0,25, abstention1/16. Chưa có đo model live mới cho các ca mơ hồ sau sửa; chưa kiểm chứng độc lập hoặc đủ tài liệu dài/đa định dạng. Hai FP ví dụ Anh/Việt và ca lệnh ngoài ví dụ chưa được giải quyết về ngữ nghĩa. Giữ Ưu tiên1 mở, không suy hiệu quả bảo mật chung từ unit/replay.
