# Giữ đúng directive và ngữ cảnh nguồn — kết quả ngày 29/10/2026

## Kết luận đang có hiệu lực

Giữ sửa lỗi định danh bằng chứng và truyền ngữ cảnh trong nhánh thử nghiệm `source-review-compact-v1`. Kết quả đang giữ là **13/16 đúng nhãn (81,25%)**, chưa đạt 90%. Không đổi Agent mặc định hoặc cấu hình `pipeline.json`. Không train, tải model hoặc nới validator/chính sách đồng thuận.

Điểm 14/16 từng được thông báo trong quá trình thử đã bị rút lại sau đọc raw: Verifier xác nhận câu ví dụ nhưng trả uncertain cho lệnh thật. Đây không phải cải thiện hợp lệ. Raw không bị sửa để khớp kết luận sau rà soát.

## Lỗi phần mềm đã sửa

- Scope đọc toàn chunk từng bị gộp vào rule trích câu ví dụ, khiến mất citation riêng của lệnh thật. Với compact, citation chuẩn giờ là directive đã xác thực; nguyên chunk được giữ riêng làm ngữ cảnh.
- Khôi phục vị trí UTF-16 từ bảng nguồn đã xác thực. Hai đoạn giống hệt trên cùng dòng không bị tự chuyển về lần xuất hiện đầu tiên; vị trí sai bị từ chối, không đoán lại.
- Verifier nhận ngữ cảnh nguồn trực tiếp, không nhận stance/lý do của Detector. Prompt riêng nhánh này yêu cầu phân biệt nguồn đang ra lệnh với nguồn đang nhắc lại một câu lệnh. Prompt mặc định không đổi.

Các test bổ sung kiểm tra cặp ví dụ/lệnh thật, hai đoạn trùng chữ cùng dòng và cặp ví dụ sạch. Test chỉ chứng minh hành vi phần mềm trong các ca đó; không chứng minh model hiểu đúng mọi ngữ cảnh.

## Đối chứng và quyết định

1. `directive-identity16-sLabX2`: replay cùng 16 Detector, gọi mới 16 Verifier. Sau sửa identity và truyền ngữ cảnh, điểm nhãn 13/16 lịch sử giảm còn 11/16. Không giấu mức giảm; sửa identity vẫn cần thiết để không nhận điểm từ sai bằng chứng.
2. `verifier-structured16-iMhuqv`: đổi hợp đồng Verifier có đối chứng, 16 inference mới; 11/16 xuống 10/16. Loại và hoàn tác.
3. `verifier-instruct16-r0ToxT`: đổi riêng sang Qwen2.5 Instruct 1,5B đã được phép đối chứng, 16 inference mới; 11/16 xuống 10/16. Loại, không đổi mặc định.
4. `verifier-source-use16-u80bCj`: chỉ làm rõ cách nguồn sử dụng câu lệnh trong prompt Verifier, 16 inference mới; 11/16 lên 13/16. Giữ cho phát triển. Detector và extraction được replay, không phải lượt live toàn pipeline mới.
5. `verifier-isolation16-Oktq4l`: tách request theo nghi vấn; 2 inference mới, các phần còn lại replay. Nhãn tăng 14/16 nhưng bằng chứng sai ở ca tăng điểm. Loại sau hậu kiểm; đã bỏ toàn bộ routing/flag coverage và ba test riêng của phương án này.
6. `framing-live20-soysG7`: thử riêng prompt Detector về framing ngoài câu trích, dự kiến 20 ca. Dừng ở 17/20 với 31 calls đã ghi và tối đa một request đang chạy chưa ghi. Có bỏ sót mới và timeout. Loại, hoàn tác prompt; không báo accuracy toàn bộ 20 ca hoặc quy nguyên nhân timeout khi chưa đủ bằng chứng.

Tổng 97 inference mới được ghi trong các thử nghiệm, cộng tối đa một request chưa ghi khi dừng. Đây không phải 97 mẫu độc lập. Bốn ca chọn thêm thuộc dev có sẵn; chỉ một ca đã được quan sát trong thử nghiệm dở, không gọi đó là holdout.

## Kết quả bản giữ lại

[Replay với extractor thật](../../results/identity-retained-replay16-HIiBJM/tong-hop.json) chạy 16 file TXT/MD/HTML, dùng lại đúng 32 phản hồi model đã lưu; không có inference mới, request lệch hoặc verdict thay đổi. Đủ 18/18 chunk đã chọn qua cả hai vai trò. Đây là kiểm chứng tích hợp bằng replay, không phải đo model mới hay kiểm chứng độc lập.

- TP7, FP2, TN6, FN1 (gồm một malicious needs_review); không có malicious trả sạch hoặc lỗi xử lý trong lượt giữ lại.
- Precision 0,7778; recall 0,875; F1 0,8235; FPR 0,25.
- Abstention 1/16 (6,25%). Không có ca nhãn uncertain để đánh giá chính sách uncertain.
- Phân nhóm nguồn/nhóm/ngôn ngữ/định dạng: [JSON phân nhóm](../../results/identity-retained-replay16-HIiBJM/ket-qua-phan-nhom.json).
- [Rà bằng chứng](../../results/identity-retained-replay16-HIiBJM/ra-soat-bang-chung.json): vẫn báo nhầm ví dụ Anh/Việt; ca Anh có lệnh ngoài ví dụ còn needs_review; ca aq-007 có phần lý do diễn giải sai. Vì thế 13 nhãn đúng không có nghĩa 13 đầu ra đều hoàn toàn đạt.

Không có p95 live toàn pipeline mới cho cấu hình giữ lại. Mốc p95 25,72 giây thuộc lượt `compact-keyed16-C4UDdV` trước sửa, không kế thừa sang cấu hình mới. Tài nguyên sau khi dừng: RAM trống khoảng 8,93 GiB, C trống 8,22 GiB, E trống 161,58 GiB, GPU 2341/4096 MiB và 0% utilization. Snapshot sau dừng không giải thích nguyên nhân timeout trước đó. Raw/model resources từng request và snapshot code/prompt/schema/model/seed/lệnh giữ trên E qua alias `benchmark/results`.

## Kiểm tra hồi quy và phạm vi áp dụng

[Replay luồng mặc định cuối cùng](../../results/identity-final-default-dOkCVS/tong-hop.json): 192 pipeline, 382 phản hồi cũ, không inference mới; không đổi request, verdict, processing hoặc suspicion. Kiểm tra sản phẩm: 417 test/35 file; benchmark: 31 test; lint, typecheck và build đạt. Build còn cảnh báo customResolver/freeze đã có. Không thêm runner cấp đầu; hiện vẫn 34 script cấp đầu.

Cấu hình compact vẫn là đối chứng phát triển, chưa đưa thành mặc định. Chưa đủ dev đa nguồn đầy đủ, dữ liệu độc lập, tài liệu dài PDF/DOCX hoặc pipeline thực tế để đóng Ưu tiên 1.

Bước phát triển tiếp theo: đo riêng cách biểu diễn quyết định để tránh nhầm “xác nhận đây là ví dụ” với “xác nhận tấn công”; dùng cặp lệnh thật/ví dụ và biến thể ngữ cảnh. Không dùng regex sửa stance sau model hoặc tăng điểm bằng nới bằng chứng. Chỉ chọn sau đối chứng, khóa cấu hình rồi kiểm chứng độc lập phù hợp.

## Đối chứng tiếp: tên quyết định tường minh

`verifier-decision-names16-K2XCj8` khóa 16 ca và cổng dừng khi một ca baseline đúng đổi sai. Chỉ thay tên enum stance ở system/schema Verifier, ánh xạ một-một về enum cũ trước validator; không sửa theo reason/nhãn. Ca đầu aq-001 bị dismissed dù nguồn ra lệnh đổi số tồn kho. Dừng ở **1/16 quan sát, 15 chưa chạy**, không tuyên bố accuracy toàn16. Gọi lại đúng request baseline trên cùng ca nhận confirmed với lý do đúng; tổng hai inference mới. Đảo mapping trên request cho thấy toàn bộ request còn lại khớp baseline. Không sửa mã sản phẩm hoặc mặc định.

Phương án bị loại, bản giữ lại vẫn13/16 về nhãn. Raw/request/response cùng [quyết định hậu kiểm](../../results/verifier-decision-names16-K2XCj8/quyet-dinh.json) giữ trên E. Driver kế thừa từng ghi nhầm completed16 sau dừng sớm; đã giữ bản trước hậu kiểm, sửa tiến độ về1/16 và ghi rõ trong quyết định. Trường scope cũ nói chỉ đổi system prompt chưa đủ; thử này đổi cả enum schema theo mapping đã khóa. Không sửa raw hoặc coi15 ca chưa chạy là đúng.

Lượt tiếp tục đã chạy lại417 test sản phẩm,31 test benchmark, lint/typecheck/build đều đạt. Mã runtime khớp hash bản giữ lại; báo cáo này không nhận thêm hiệu quả nhận diện từ các kiểm tra phần mềm.
