# Rà phụ thuộc ngữ cảnh của Agent — đang kiểm chứng

Ngày31/10/2026. Baseline khóa: `quoted-router-frozen-dev96-BF6ZF2`,79/96 (82,29%), TP21/TN58/FP0/FN6, uncertain0/11. Chưa đạt90% hoặc kiểm chứng độc lập; không đổi Agent mặc định.

## Hành vi đang đối chứng

Bổ sung lượt trích dữ kiện trung tính: có chỉ dẫn thật hay không, người thực hiện có được nguồn xác định hay không, tham chiếu/thỏa thuận nào chưa được giải quyết, có khung công việc cho người/ví dụ không thực thi hoặc lệnh AI rõ hay không. Không cho model nhận nhãn, ID/group dataset, đường dẫn hoặc lý do của model trước. Không dùng kiểu câu mệnh lệnh đơn thuần làm bằng chứng tấn công.

Chỉ tạo đề xuất uncertain nếu có chỉ dẫn, chưa có bằng chứng người thực hiện, có trích dẫn phụ thuộc chưa xác định, không có khung người/ví dụ/lệnh AI rõ, và **trích dẫn ngữ cảnh bổ sung không trùng chính câu lệnh**. Mã nguồn chỉ dùng reference để neo nguyên văn/vị trí, không nhận diện bằng ID. Đề xuất đi qua validator structured hiện có; không tự xác nhận tấn công. Nhận định cũ/bất đồng được giữ bởi applyBatch/conclude, không ghi đè để ép điểm. Model reason thô được lưu chẩn đoán, còn giải thích bất định dùng trích dẫn nguồn cụ thể để tránh suy diễn ngoài nguồn như nhầm tài khoản đăng nhập thành tài khoản tài chính.

Lượt bổ sung được tính khi model Detector còn nạp, nhưng chỉ hợp nhất **sau** Verifier chính. Vì vậy input hai vai trò chính không chứa giả thuyết hoặc kết luận của lượt này. Nguồn chọn thiếu hoặc cả file vượt ngân sách không bị cắt âm thầm rồi suy thành thiếu ngữ cảnh; báo coverage hạn chế và không tính uncertain đúng. Ngân sách45s/request và180s tổng giữ nguyên. Chưa chứng minh char budget tương đương giới hạn token trên tài liệu dài.

## Các phương án đã loại, không áp dụng

- `recipient-grounding-paired12-FHmkrv`: harness tính nhầm request dỡ model vào budget. Raw giữ nguyên; lỗi5pipeline cuối là lỗi harness, không dùng kết luận model. Sửa và chạy lại toàn12.
- `recipient-grounding-fixed12-VyxPYp`: prompt bổ sung chỉ cải thiện1/12 (5→6 sau audit uncertain);3uncertain dev cũ vẫn sai, controls5/6. Không áp prompt. Metadata protocol của lượt này từng bị preflight prototype ghi nhầm; đã khôi phục từ protocol gốc/raw với ghi chú, không tuyên bố khớp byte metadata cũ. cases/model-calls không bị ghi đè.
- `source-unit-prototype12-tHgt61`: đánh giá từng reference sửa aq-020 nhưng không sửa uncertain, controls4/6, aq-062 timeout. Prototype chỉ nạp trong Vite, chưa sửa runtime. Không áp để tránh đổi lỗi nhận diện lấy lỗi thời gian.
- `context-gap-component12-J5iRxX`: tìm thiếu ngữ cảnh trực tiếp báo gap giả ở cả2ca AI đổi số liệu rõ. Không dùng làm verdict.
- `context-gap-verification-c8OOHr`: kiểm chứng bằng nhãn essential/resolved trả resolved toàn6đề xuất, gồm cả gap thật; có lý do không nhất quán. Không áp.
- `context-dependency-proof16-ZYb6mE`: model Instruct1,5B có sẵn, được phép đối chứng, vẫn suy actor human không có căn cứ; không áp, không đổi Verifier chính.

## Bằng chứng trước tích hợp

`context-dependency-facts12-MFPuX6` trích được phụ thuộc ở cả5uncertain trong12ca, không gắn cho7binary; còn đưa một câu mô tả thành đề xuất phụ. Đây là component, không phải12pipeline đạt.

`context-dependency-facts16-vVr8nA` thêm hasDirective và4controls đại từ/ngữ cảnh thiếu/lệnh AI ngầm/ví dụ. Có một đề xuất sai cho câu kể giao việc cho người dùng chính nó làm chứng cứ thiếu ngữ cảnh. Điều kiện chứng cứ bổ sung loại đề xuất này. Parser/lọc trên raw16 tạo gap đúng cả6uncertain và không tạo gap ở10binary; đây vẫn là kiểm tra component trên dev tự soạn, không phải điểm Agent16/16 hoặc holdout. Raw reason và các field chưa chắc đúng toàn bộ; không lấy đúng nhãn làm bằng chứng mọi lời giải đã tốt.

Đã thêm `contextDependencies.ts` và cấu hình đối chứng `context-dependency-pipeline.json`; mặc định không bật.463test sản phẩm/37file,35test benchmark, lint/typecheck/build đạt; warning Vite customResolver/freeze cũ còn. Replay mặc định `context-dependency-default-replay-wViOlm`:192pipeline/382raw,0inference mới, không đổi request/verdict/processing/suspicions. Đây là hồi quy code, không phải điểm model mới.

Công cụ benchmark đang duy trì được dùng lại: manifest mới chạy paired; so lịch sử chỉ khi toàn bộ nội dung/nhãn/annotation/group và model chính khớp. File input từng ca giữ thư mục số trung tính riêng, không ghi đè ca trước. Budget chỉ đếm chat, có chỗ cho lượt rà bổ sung; model/template/source snapshot giữ trước/sau. Không thêm runner cấp đầu hoặc train/tải model.

Bước đang thực hiện: đo pipeline thật trên10controls đã khóa (`benchmark/data/context-dependency-controls-dev-v1.json`), rồi nếu chất lượng không lùi mới đo đủ96dev với cấu hình khóa. Mọi ca lỗi/needs_review binary giữ trong mẫu số; uncertain chỉ đúng sau rà bằng chứng. Nguồn/tập lựa chọn này đã dùng phát triển; Ưu tiên1 tiếp tục mở cho đến khi đủ bằng chứng độc lập và pipeline thực tế.

## Pipeline controls10 đã hoàn tất

Lượt đầu `agent-eval-10-4RWbj0` dừng10baseline/3candidate vì catalog chưa bật role check cho Qwen3. Model đã được người dùng cho phép đối chứng Verifier từ trước; đã bổ sung chọn rõ cho role check, vẫn explicitSelectionOnly, giữ nguyên fallback/UI mặc định. Preflight pipeline kiểm tra catalog trước scan, test SlmClient gọi thật tới bridge giả lập cho cả2role để tránh mock che lỗi tích hợp này. Raw lượt lỗi giữ nguyên, không chấm như đủ10candidate.

Sau sửa, `agent-eval-10-ghQMr1` hoàn tất10ca/2pha,50inference thật, không lỗi. Sau audit3uncertain có nguồn cụ thể: baseline7/10, candidate10/10. Cả7binary giữ đúng (TP3/TN4/FP0/FN0),3uncertain đúng từ bằng chứng người nhận/thỏa thuận/đối tượng chưa xác định. Đây là controls dev đã dùng phát triển, không phải độc lập hoặc mục tiêu96đã xong.

Latencyp50 15,97→24,19s; p95 19,13→30,58s. Cổng tốc độ1,25lần **không đạt**, giữ nguyên không nới để lấy điểm. Chưa đủ điều kiện đổi mặc định. Lượt96kế tiếp là đo chẩn đoán chất lượng đầy đủ trên cấu hình khóa; vẫn phải giải quyết đánh đổi tốc độ và kiểm chứng độc lập.464test sản phẩm/37file,35benchmark, lint/typecheck/build đạt sau sửa catalog. Ngân sách và chứng cứ không thay đổi.

### Tạm dừng theo yêu cầu người dùng — tối31/10/2026

Đã dừng hai tiến trình benchmark đang chạy, giữ nguyên Ollama/dữ liệu và Agent mặc định. Lượt `agent-eval-96-OZGRqr` mới xong1/96candidate,3request đã lưu; có thể1request đang chạy chưa ghi khi dừng.96baseline trong thư mục là lịch sử, không phải96inference mới. Đã đánh dấu paused_by_user, không chấm như đủ96 hoặc tuyên bố90%.

Điểm đã kiểm chứng gần nhất: controls10 từ7/10→10/10 sau audit, không lỗi; p9519,13→30,58s nên cổng tỷ lệ tốc độ1,25không đạt.464test sản phẩm/35benchmark và lint/typecheck/build đạt. Feature chỉ trong cấu hình đối chứng, không mặc định. Mai tiếp tục nên đo lại cohort96mới bằng cấu hình khóa, giữ raw1ca hôm nay riêng; sau đó audit và kiểm chứng độc lập. Báo cáo `benchmark/experiments/source-review-v1/ket-qua-context-dependency.md`.

## Đo tiếp đủ96 và sửa lỗi Unicode — 01/11/2026

Đã chạy cohort mới `benchmark/results/agent-eval-96-HHzEQv`, không gộp1ca của lượt tạm dừng `OZGRqr`. Ollama ban đầu tắt (ECONNREFUSED, chưa inference), đã khởi động lại với kho model E; không tải/train. Giữ lệnh benchmark hiện có, cùng manifest96, Detector Qwen3 4B/Verifier Coder1,5B, thêm contextDependencyModel opt-in. Seed42, temperature0,1400token,45s/request,180s/document. Raw/input/source/model/template/command được giữ trên E qua junction. Runner kiểm tra code/model pin trước/sau và hoàn tất; không sửa code giữa lượt.

### Kết quả model thật, trước sửa Unicode

96/96 ca,289 request mới:288thường +1retry Detector aq-096 sau timeout45s; retry phục hồi xử lý nhưng nhãn vẫn sai. Baseline lịch sử79/96, candidate79/96 (82,29%). Có3uncertain được rà là có bằng chứng (aq-016,022,069) nhưng3benign thành lỗi schema (aq-003,015,086), nên không tiến bộ tổng điểm. Không loại lỗi khỏi mẫu số.

Precision1, recall21/27=77,78%,F1=87,50%,FPR0/58=0. TP21/TN55/FP0/FN6; FN gồm4false clear và2malicious abstention. Có thêm3binary processing errors, không thành TN. Uncertain đúng3/11;2bị báo attack,6bị kết luận sạch. Needs_review raw8/96 gồm cả3lỗi; binary abstention2/85, decision coverage80/85. Audit nguồn do Codex thực hiện, không phải kiểm chứng độc lập. aq-022 có một fact phụ sai coi câu kể là lệnh; chỉ dẫn chính/nguồn vẫn chứng minh thiếu tham chiếu, không khẳng định mọi fact đều đúng.

p50=32,97s, p95=51,98s; baseline lịch sử20,76/49,19s trên điều kiện tải khác, không phải đối chứng tốc độ cùng thời điểm. Controls10 trước đó vẫn trượt cổng1,25x (19,13→30,58s), không nới cổng hoặc lấy tỷ số lịch sử để bỏ qua. Chưa áp mặc định.

Extractor/selection/Detector/Verifier chính rà103/103 đoạn; context stage hợp lệ93/96ca,100đoạn,151facts;3ca lỗi không có ledger hợp lệ. Đây là coverage kỹ thuật, không phải recall ngữ nghĩa từng tầng. Harness peak RSS315453440byte (~300,84MiB); model snapshots Qwen3 VRAM2344636907byte, Coder1169382440byte, context4096. Không phải peak toàn máy. Có snapshot GPU86°C giữa lượt và tài nguyên trong `tai-nguyen.ndjson`; không dừng ứng dụng người dùng. Bộ96 chỉ TXT/MD/HTML ngắn, chưa xác nhận tài liệu dài/PDF/DOCX/UI native. Các bảng theo nguồn/nhóm/ngôn ngữ và chỉ số undefined=null nằm trong `quality-audit.json`, không coi7source label là7dataset độc lập.

### Sửa đúng đặc tả, giữ nguyên bằng chứng

JSON Schema maxLength đếm code point Unicode, parser mới lại dùng String.length (UTF-16). Ba raw lỗi có180code point nhưng181–182đơn vị UTF-16 vì emoji. Đã đổi riêng phép đếm sang code point, giữ nguyên20–180, schema/prompt/ref/quote/decision policy. Test biên19/20/180/181 với emoji bảo đảm không nhận lý do quá ngắn/dài. Không sửa offset citation UTF-16.

Replay `benchmark/results/unicode-schema-replay96-8MRCKe`:96pipeline/289raw,0inference mới, mọi request khớp tuyệt đối. Chỉ3ca lỗi đổi thành completed/not_detected;93ca khác giữ nguyên. Điểm replay82/96=85,42%;TP21/TN58/FP0/FN6,precision/recall/F1/FPR không đổi,uncertain3/11. Đây KHÔNG phải96model mới sau sửa; không lấy latency replay làm tốc độ model mới, không gộp live subset vào thành cohort96 mới.

Default replay `benchmark/results/unicode-default-replay-qW77pj`:192pipeline/382raw,0request/verdict/processing/suspicion khác. Vite báo port websocket đang dùng khi chạy đồng thời runner, replay vẫn hoàn tất; không phải bằng chứng UI native.465test sản phẩm/37file,35benchmark,lint/typecheck/build đạt; warning Vite customResolver/freeze còn như cũ. Dùng runner hiện có, không thêm script cấp đầu.

Chưa đạt90%, không đổi mặc định; Ưu tiên1 mở. Hướng có bằng chứng cần xử lý tiếp: model bỏ sót directive hoặc nhầm data-recipient thành executor, bỏ qua tham chiếu thiếu, cùng6malicious sai cũ. Không hạ bằng chứng để chấp nhận cùng câu làm chứng cứ cho chính nó. Cần đo cấu hình sửa đã khóa, rồi độc lập/phân nhóm gần trùng và pipeline tài liệu dài trước tuyên bố hoàn thành.


### Xác nhận live sau sửa Unicode

Lượt paired agent-eval-3-3plv2D hoàn tất 3 baseline + 3 candidate, 15 inference mới; cả hai đúng 3/3 benign, candidate không còn lỗi schema/coverage. p95 baseline 26.88s, candidate 36.31s; cổng tốc độ 1,25x tiếp tục không đạt. Đây chỉ là hồi quy 3 ca đã biết, không phải dữ liệu độc lập hoặc 96 live bản sửa. Manifest 3 lấy nguyên nội dung/nhãn từ dev96, dùng runner có sẵn; lần preflight đặt manifest ở results bị chặn trước inference, sau đó chuyển vào benchmark/data theo quy tắc runner. Giữ Unicode fix, không áp context stage mặc định.
