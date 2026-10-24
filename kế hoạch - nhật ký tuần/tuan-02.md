# Tuần 2 — Tái cấu trúc IPI Scanner

**Thời gian:** 19/10/2026 – 24/10/2026
**Trạng thái:** Đang thực hiện

| STT | Công việc đã thực hiện | Commit chính | Kết quả (ảnh) | Ghi chú |
|:---:|---|---|---|---|
| 1 | Định hướng lại đồ án IPI Scanner và tinh gọn mã nguồn. | [50232385](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/50232385) | ![Cấu trúc dự án mới](./ảnh/tuan-02-cau-truc-du-an-moi.png) | Loại bỏ cấu trúc sườn cũ từ dự án ban đầu, thay thế bằng cấu trúc mới tinh gọn hơn |
| 2 | Tách khâu đọc tài liệu, chia đoạn và lọc sơ bộ. | [095a16b9](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/095a16b9) | ![Tách các khâu xử lý thành các file riêng biệt](./ảnh/tuan-02-tach-engine-xu-ly.png) | Tách cấu hình, engine xử lý và rule IPI. |
| 3 | Tổ chức luồng AI phát hiện, xác minh và quản lý bằng chứng. | [095a16b9](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/095a16b9) | ![Kết quả trả về](./ảnh/tuan-02-ket-qua-test.png) | Sử dụng 2 model SLM để phân tích và kiểm tra kết quả tài liệu có IPI. |
| 4 | Đồng bộ lockfile phục vụ CI trên Node 22. | [5d51aca1](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/5d51aca1) | Không có ảnh. | Không có ghi chú |
| 5 | Cập nhật tài liệu, giao diện và nội dung tiếng Anh. | [50232385](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/50232385)<br>[c6c91f0d](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/c6c91f0d) | Không có ảnh. | Cập nhật tài liệu, prompt bằng tiếng anh để các mô hình SLM hiểu rõ ngữ cảnh hơn. |
| 6 | Tăng độ bao phủ các đoạn tài liệu (chunk) được AI phân tích. | [50232385](https://github.com/phamhuy-ops/IPI_Scanner_DACN/commit/50232385) | ![Tăng độ bao phủ và lấy mẫu từ nhiều vị trí](./ảnh/tuan-02-tang-do-bao-phu-chunk.png) | Ưu tiên chunk đáng ngờ, bổ sung các đoạn lân cận và lấy mẫu ở nhiều vị trí; hỗ trợ chế độ balanced và deep. |
| 7 | Mở rộng bộ rule lọc sơ bộ và thêm dữ liệu đối chứng. | Chưa commit | Không có ảnh. | Sửa rule DAN khỏi bắt tên người; thêm rule tiếng Việt và dấu hiệu thao túng câu trả lời. |
| 8 | Đổi cách kết luận một vòng thành 3 trạng thái rõ ràng. | Chưa commit | Không có ảnh. | Phát hiện IPI / Chưa phát hiện IPI / Cần xem xét. Rule chỉ tạo nghi vấn, không tự kết luận độc hại. |
| 9 | Sửa đọc file HTML để không mất chỉ dẫn ẩn trong comment. | Chưa commit | Không có ảnh. | Giữ nguyên mã HTML thô, đồng thời có bản text phụ để đọc nội dung. |
| 10 | Đo luồng quét thật với model local trên bộ mẫu nhỏ. | Chưa commit | Không có ảnh. | 10 ca chẩn đoán; chưa đủ để kết luận độ chính xác chung. |
| 11 | Thử nhiều cách hỏi model; giữ cấu hình mặc định cũ. | Chưa commit | Không có ảnh. | Prompt/schema mới chưa đạt cổng nên chưa bật mặc định; chưa thêm vòng phản biện. |
| 12 | Cập nhật giao diện và chuẩn bị dữ liệu fine-tune Verifier. | Chưa commit | Không có ảnh. | Giao diện hiện 3 kết luận và lỗi xử lý riêng. 20 nhãn ngữ cảnh đã rà soát; chưa huấn luyện. |

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

Điều chỉnh `README.md`, manifest, giao diện React và phần kết nối Electron theo phạm vi IPI Scanner. Commit `c6c91f0d` chuyển nhiều nội dung giao diện, hướng dẫn, thông báo và prompt sang tiếng Anh để cách diễn đạt trong ứng dụng thống nhất hơn và cũng đồng thời tạo điều kiện cho mô hình SLM hiểu rõ ngữ cảnh hơn.

### 6. Tăng độ bao phủ các đoạn tài liệu (chunk) được AI phân tích.

Điều chỉnh cơ chế lựa chọn chunk để AI phân tích được nhiều đoạn nội dung hơn trong tài liệu, đồng thời ưu tiên những đoạn có dấu hiệu đáng ngờ. Thay đổi giúp giảm số đoạn chưa được AI kiểm tra và hạn chế bỏ sót nội dung có nguy cơ chứa prompt injection.

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

Giao diện hiện 3 kết luận trên, tách riêng trạng thái xử lý (xong, lỗi model, hết thời gian, phản hồi sai). Đã soạn 20 mẫu nhãn chỉ dẫn/ngữ cảnh; sau khi rà soát cùng người dùng: 19 chấp nhận, 1 sửa. Có kế hoạch thử fine-tune một Verifier và môi trường lưu trên ổ E, nhưng **chưa huấn luyện** và chưa đổi model mặc định.

## Kế hoạch tiếp theo

- Cải thiện chất lượng vòng một (trích dẫn sai, bỏ sót, báo nhầm) trước khi thêm vòng phản biện.
- Thêm vòng phản biện giữa 2 model khi đạt cổng đã ghi trong tài liệu; hiện chưa đạt.
- Fine-tune một Verifier sau khi có dữ liệu đủ và bộ kiểm chứng độc lập; chưa train ở tuần này.
- Giữ tập holdout độc lập; không lấy tập test để chỉnh rule hay prompt.

