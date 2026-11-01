# Tuần 2 — Tái cấu trúc IPI Scanner

**Thời gian:** 19/10/2026 – 24/10/2026
**Trạng thái:** Đang thực hiện

| STT | Công việc đã thực hiện | Commit chính | Kết quả (ảnh) | Ghi chú |
|:---:|---|---|---|---|
| 1 | Định hướng lại đồ án IPI Scanner và tinh gọn mã nguồn. | [50232385](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/50232385) | ![Cấu trúc dự án mới](./ảnh/tuan-02-cau-truc-du-an-moi.png) | Loại bỏ cấu trúc sườn cũ từ dự án ban đầu, thay thế bằng cấu trúc mới tinh gọn hơn |
| 2 | Tách khâu đọc tài liệu, chia đoạn và lọc sơ bộ. | [095a16b9](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/095a16b9) | ![Tách các khâu xử lý thành các file riêng biệt](./ảnh/tuan-02-tach-engine-xu-ly.png) | Tách cấu hình, engine xử lý và rule IPI. |
| 3 | Tổ chức luồng AI phát hiện, xác minh và quản lý bằng chứng. | [095a16b9](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/095a16b9) | ![Kết quả trả về](./ảnh/tuan-02-ket-qua-test.png) | Sử dụng 2 model SLM để phân tích và kiểm tra kết quả tài liệu có IPI. |
| 4 | Đồng bộ lockfile phục vụ CI trên Node 22. | [5d51aca1](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/5d51aca1) | Không có ảnh. | Không có ghi chú |
| 5 | Cập nhật tài liệu, giao diện và nội dung tiếng Anh. | [50232385](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/50232385)<br>[c6c91f0d](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/c6c91f0d) | Không có ảnh. | Chuẩn hóa nội dung và prompt tiếng Anh phục vụ thử nghiệm; chưa xác nhận cải thiện khả năng hiểu ngữ cảnh. |
| 6 | Tăng độ bao phủ các đoạn tài liệu (chunk) được AI phân tích. | [50232385](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/50232385) | ![Tăng độ bao phủ và lấy mẫu từ nhiều vị trí](./ảnh/tuan-02-tang-do-bao-phu-chunk.png) | Ưu tiên chunk đáng ngờ, bổ sung các đoạn lân cận và lấy mẫu ở nhiều vị trí; hỗ trợ chế độ balanced và deep. |
| 7 | Mở rộng bộ rule lọc sơ bộ và thêm dữ liệu đối chứng. | [c044185f](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/c044185f) | Không có ảnh. | Sửa rule DAN khỏi bắt tên người; thêm rule tiếng Việt và dấu hiệu thao túng câu trả lời. |
| 8 | Đổi cách kết luận một vòng thành 3 trạng thái rõ ràng. | [c044185f](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/c044185f) | Không có ảnh. | Phát hiện IPI / Chưa phát hiện IPI / Cần xem xét. Rule chỉ tạo nghi vấn, không tự kết luận độc hại. |
| 9 | Sửa đọc file HTML để không mất chỉ dẫn ẩn trong comment. | [c044185f](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/c044185f) | Không có ảnh. | Giữ nguyên mã HTML thô, đồng thời có bản text phụ để đọc nội dung. |
| 10 | Đo luồng quét thật với model local trên bộ mẫu nhỏ. | [c044185f](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/c044185f) | Không có ảnh. | 10 ca chẩn đoán; chưa đủ để kết luận độ chính xác chung. |
| 11 | Thử nhiều cách hỏi model; giữ cấu hình mặc định cũ. | [c044185f](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/c044185f) | Không có ảnh. | Prompt/schema mới chưa đạt cổng nên chưa bật mặc định; chưa thêm vòng phản biện. |
| 12 | Cập nhật giao diện và chuẩn bị dữ liệu fine-tune Verifier. | [c044185f](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/c044185f) | Không có ảnh. | Giao diện hiện 3 kết luận và lỗi xử lý riêng. 20 nhãn ngữ cảnh đã rà soát; thêm 30 mẫu nháp đang chờ duyệt; chưa huấn luyện. |
| 13 | Chẩn đoán lỗi trích dẫn trên file Word demo. | Chưa commit | Không có ảnh trong nhật ký. | Deep Scan vẫn lỗi; ứng viên rút gọn giải thích chưa đạt nên chưa áp dụng. |
| 14 | Nâng luồng Agent: prompt, split-batch recovery, NeedsReviewKind. | Chưa commit | Không có ảnh. | 367 test đạt, typecheck/lint sạch. Chưa đo model thực tế, không claim tăng nhận diện. |

## Chi tiết nội dung công việc

### 1. Định hướng lại đồ án và tinh gọn mã nguồn

Chuyển trọng tâm từ ứng dụng quét lỗ hổng tổng quát sang IPI Scanner, tập trung vào phát hiện chỉ dẫn độc hại trong tài liệu. Loại bỏ nhiều module quét cũ, điều chỉnh giao diện và bổ sung manifest mô tả hướng triển khai. Thêm bộ dữ liệu baseline cùng script benchmark làm cơ sở đánh giá; nhật ký chưa kết luận về độ chính xác từ các thay đổi này.

### 2. Tách các bước xử lý tài liệu

Phần đọc văn bản từ tài liệu được đưa vào module riêng. Semantic chunker chia văn bản thành các đoạn để thuận tiện phân tích; prefilter dùng các rule để lọc sơ bộ dấu hiệu đáng ngờ. Cấu hình quét và rule được tách riêng, giúp việc chỉnh cách quét hoặc bổ sung rule dễ theo dõi hơn.

### 3. Tổ chức luồng AI và bằng chứng

Tạo cấu trúc `src/ai/agents/document/` với thành phần phát hiện (detector), xác minh (verifier), prompt và kiểu dữ liệu dùng chung. Pipeline điều phối các bước này, còn phần evidence hỗ trợ quản lý bằng chứng liên quan đến kết quả phát hiện. Có bổ sung test cho evidence; cần kết quả chạy thực tế trước khi xác nhận chất lượng của cả luồng.

### 4. Đồng bộ môi trường Node 22

Cập nhật `package-lock.json` trong commit sửa CI để đồng bộ thông tin các gói phụ thuộc cho môi trường Node 22. Thay đổi này phục vụ quá trình cài đặt nhất quán. Chưa có ảnh hoặc kết quả CI được ghi vào nhật ký, nên mục kiểm tra cài đặt và build vẫn cần bổ sung minh chứng.

### 5. Cập nhật tài liệu và nội dung tiếng Anh

Điều chỉnh `README.md`, manifest, giao diện React và phần kết nối Electron theo phạm vi IPI Scanner. Commit `c6c91f0d` chuyển nhiều nội dung giao diện, hướng dẫn, thông báo và prompt sang tiếng Anh để thống nhất cách diễn đạt và phục vụ thử nghiệm; chưa có phép đo chứng minh việc đổi ngôn ngữ giúp SLM hiểu ngữ cảnh tốt hơn.

Từ ngày 24/10/2026, hướng dẫn, báo cáo, kế hoạch, ghi chú và chú thích mới dùng tiếng Việt. Giữ nguyên định danh kỹ thuật, dữ liệu và trích dẫn gốc khi cần đối chiếu; prompt tiếng Anh được giữ cho các thử nghiệm đã ghi rõ mục đích.

### 6. Tăng độ bao phủ các đoạn tài liệu (chunk) được AI phân tích.

Điều chỉnh cơ chế lựa chọn chunk để AI phân tích được nhiều đoạn nội dung hơn trong tài liệu, đồng thời ưu tiên những đoạn có dấu hiệu đáng ngờ. Cơ chế lấy mẫu mở rộng các vị trí được xem, nhưng chưa chứng minh giảm bỏ sót IPI. Balanced chọn tối đa 12 chunk và Deep Scan chọn tối đa 24 chunk; tài liệu dài vẫn có thể chưa được AI đọc đầy đủ. Ví dụ file Word demo tạo 112 chunk, Deep Scan chỉ chọn 24/112 chunk.

### 7. Mở rộng rule lọc sơ bộ và dữ liệu đối chứng

Rule cũ khá đơn giản và dễ bắt nhầm (ví dụ tên người có chữ “Dan”). Tuần này chỉnh rule DAN chỉ báo khi có chỉ dẫn jailbreak rõ, đồng thời thêm rule tiếng Việt và rule bắt yêu cầu làm méo câu trả lời hoặc chèn link. Rule vẫn chỉ là tín hiệu nghi vấn để AI xem lại, không phải kết luận cuối.

Đã đưa thêm nguồn dữ liệu sạch/tấn công (NotInject, realistic IPI) để đối chứng, kèm script đo riêng bộ lọc. Đây là dữ liệu đang dùng khi chỉnh rule, chưa phải bộ test độc lập cuối cùng.

### 8. Chính sách kết luận một vòng

Ứng dụng không còn kiểu “có rule là fail”. Detector và Verifier xem từng nghi vấn; Verifier vòng đầu không nhìn lập luận của Detector để tránh chỉ đồng ý theo. Kết luận gộp thành 3 mức:

- **Phát hiện IPI:** hai model cùng xác nhận có bằng chứng.
- **Chưa phát hiện IPI:** không còn nghi vấn chưa rõ và đã xem đủ phần được trích xuất.
- **Cần xem xét:** hai model bất đồng, thiếu bằng chứng, lỗi model hoặc chưa đọc đủ tài liệu.

Chưa bật vòng phản biện tự động giữa hai model.

### 9. Sửa trích xuất HTML

Trước đây bước đọc HTML có thể bỏ comment, nên chỉ dẫn ẩn trong `<!-- ... -->` dễ bị mất. Nay giữ bản HTML gốc (kể cả comment) và có thêm bản text phụ. Giao diện cảnh báo nếu chưa đọc đủ phần gốc. Đã kiểm tra lại một ca comment đã biết; ca này chuyển sang cần xem xét vì model trích dẫn sai, chưa được coi là tăng độ chính xác.

### 10. Đo pipeline với model thật

Đã có harness chạy đúng luồng sản phẩm: đọc file → rule → chia đoạn → Detector → Verifier → kết luận. Bộ đo nhỏ 10 ca (gồm file sạch, tấn công, HTML, tiếng Việt). Kết quả dùng để tìm lỗi, không dùng để tuyên bố độ chính xác tổng quát. Một lần đo cho thấy còn ca bỏ sót, báo nhầm và nhiều ca cần xem xét.

### 11. Thử prompt và schema, chưa đổi mặc định

Đã thử vài cách hỏi model: nhận định có cấu trúc, tham chiếu đoạn bằng mã, rút gọn JSON, làm rõ “stance”. Các thử nghiệm ghi nhận trong `docs/reports/`. Cấu hình đang dùng vẫn là cách hỏi cũ (`classic-v1`) vì các ứng viên chưa đạt cổng (JSON lỗi, báo nhầm hoặc bỏ sót). Vì vậy chưa thêm vòng phản biện.

### 12. Giao diện và chuẩn bị fine-tune

Giao diện hiện 3 kết luận trên, tách riêng trạng thái xử lý (xong, lỗi model, hết thời gian, phản hồi sai). Đã soạn 20 mẫu nhãn chỉ dẫn/ngữ cảnh; sau khi rà soát cùng người dùng: 19 chấp nhận, 1 sửa. Đã chuẩn bị riêng 30 mẫu nháp mới cho Verifier, chưa duyệt hoàn tất và chưa xuất thành tập huấn luyện; bộ 20 mẫu trước giữ làm tham chiếu cách gán nhãn. Có kế hoạch thử fine-tune một Verifier và môi trường lưu trên ổ E, nhưng **chưa huấn luyện** và chưa đổi model mặc định.

### 13. Chẩn đoán lỗi trích dẫn trên file Word demo

File Word đọc được 80.041 ký tự, chia thành 112 chunk. Detector sinh trích dẫn không khớp nguyên văn nguồn nên pipeline dừng trước Verifier và trả **Cần xem xét**. Đã thử giới hạn phần giải thích ở 240 ký tự: một lượt Balanced hoàn thành cả hai model, nhưng Deep Scan vẫn lỗi trích dẫn. Đối chứng còn cho thấy bỏ sót tấn công và báo nhầm ví dụ tấn công được trích dẫn; vì vậy ứng viên chưa được áp dụng vào mặc định.

Đã chạy đạt 46 kiểm thử policy/pipeline liên quan; đây là kiểm tra hành vi của code, không chứng minh chất lượng nhận diện của model. Phần chẩn đoán này đang ở thay đổi cục bộ, chưa commit. Xem [báo cáo chẩn đoán — tổng hợp](../docs/reports/tong-hop-hien-trang.md).

### 14. Nâng luồng Agent (28/10/2026)

**Prompt phân biệt người nhận:** REVIEW_CONTRACT phân biệt rõ 3 loại nội dung: chỉ dẫn cho AI (confirm), nhiệm vụ cho người (dismiss), và câu tấn công trích dẫn làm ví dụ (dismiss). Hướng dẫn rõ khi nào dùng `uncertain`: chỉ khi có bằng chứng ngượng nhưng không xác định được người nhận hoặc chủ đượng, phải nêu cụ thể thiếu gì.

**Split-batch recovery:** Khi Detector chạm giới hạn sinh (`output_truncated`) và batch có ≥2 chunk, tự động chia batch thành 2 nửa nhỏ và thực hiện tiếp. Batch gốc bị ghi vào `batchFailures` để cảnh báo; batch nhỏ nếu thành công không ghi lỗi. Giảm bỏ sót tài liệu do model chạm giới hạn, đặc biệt với file dài.

**NeedsReviewKind và verifierOnlyCount:** Thêm trường phân loại lý do cần xét thủ công: `conflict` (mâu thuẫn nội bộ), `uncertain_evidence` (bất định), `verifier_only` (chỉ Verifier phát hiện), `citation_failure` (bị ảnh hưởng bởi batch lỗi), `coverage_incomplete` (rule không có chunk tương ứng). Đếm riêng `verifierOnlyCount` trong `IpiCheckVerdict`. Lý do `needs_review` trong `conclude` được phân nhóm rõ thành tiếng Việt để UI hiển thị chính xác hơn. Pipeline gán `citation_failure` cho nghi vấn bị ảnh hưởng bởi batch lỗi JSON/citation/truncated sau khi cả hai agent hoàn thành.

367 test đạt (tăng từ 359), typecheck/lint sạch. Chưa đo model thực tế; không claim tăng TP hay giảm FP.

## Kế hoạch tiếp theo

- **Ưu tiên:** Đo luồng Agent nâng cấp với model thực tế trên bộ mẫu dev cũ (30 ca), giữ baseline cũ làm đối chứng; ghi precision/recall/FP trước–sau.
- Thử mỗi request ít đoạn hơn và ràng buộc mã tham chiếu nguồn trong một thí nghiệm riêng, có đối chứng sạch/tấn công/ví dụ trích dẫn.
- Cải thiện chất lượng vòng một (trích dẫn sai, bỏ sót, báo nhầm) trước khi thêm vòng phản biện.
- Thêm vòng phản biện giữa 2 model khi đạt cổng đã ghi trong tài liệu; hiện chưa đạt.
- Fine-tune một Verifier sau khi có dữ liệu đủ và bộ kiểm chứng độc lập; chưa train ở tuần này.
- Chuẩn bị tập holdout độc lập (hiện chưa thu thập); khóa cấu hình trước khi kiểm thử, không lấy tập test để chỉnh rule hay prompt.

