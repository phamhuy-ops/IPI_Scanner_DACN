# Tiến độ Ưu tiên 1

**Mốc mới nhất 05/11:** giữ skill bằng chứng bản lý do ngắn: 15/18, lỗi đầu ra 1 → 0, không mất ca đúng. Đã áp dụng vào caller thử nghiệm, Agent mặc định chưa bật. Ba ca sai ngữ nghĩa vẫn còn; chưa đạt 90% hoặc hoàn thành Ưu tiên 1. Các kết quả bên dưới là lịch sử.

**Cập nhật 05/11:** checkpoint bằng chứng tăng 14/18 → 15/18, giữ làm mốc phát triển. Sáu biến thể mới: cả hai bản 5/6; bản mới có một lỗi cắt đầu ra, chưa chứng minh cải thiện ngoài dev. Người nhận/ngữ cảnh giữ 13/18. Chưa bật Agent, Ưu tiên 1 vẫn mở. Chi tiết trong báo cáo checkpoint ngày 05/11 và selected-profiles.json; các mốc bên dưới là lịch sử.

## Ưu tiên 1 — gồm xây dựng và kiểm chứng ba skill (05/11/2026)

Theo yêu cầu mới, ba skill là công việc con của Ưu tiên 1, không phải nhánh có tiêu chí hoàn thành riêng. Giữ trạng thái **chưa hoàn thành**. Các ghi chú dừng thử prompt của đợt cũ vẫn là lịch sử; đợt này được người dùng yêu cầu tiếp tục, không mở lại train hoặc đổi model mặc định.

- Xác định người nhận ở bước phân tích ứng viên; phân biệt lệnh/ví dụ ở bước xét ngữ cảnh; đối chiếu bằng chứng trước khi kết luận. Hiện chưa skill nào được bật trong Agent mặc định.
- Sửa từng lỗi có bằng chứng, có mẫu sạch gần giống và biến thể mới. Mỗi chu kỳ một baseline và tối đa hai ứng viên; hết chu kỳ phải chốt giữ hoặc loại, không kéo dài chuỗi sửa prompt nhỏ.
- Trong phát triển skill, giữ tổng đúng cao nhất trên cùng bộ ca; đồng điểm ưu tiên ít lỗi rồi ít token. Ca riêng hồi quy vẫn báo đầy đủ nhưng không tự kéo về bản tổng thấp hơn. Nếu thử mới giảm điểm thì quay lại checkpoint tốt nhất vừa áp dụng. Không nới validator hoặc đổi nhãn; việc bật Agent mặc định vẫn cần kiểm chứng độc lập và pipeline.
- Sau đó khóa cấu hình, kiểm chứng dữ liệu độc lập, nối bằng chế độ thử tắt mặc định và đo toàn pipeline có/không có skill; chưa qua kiểm chứng thì không bật cho người dùng.
- Cổng hoàn thành Ưu tiên 1 giữ nguyên: mục tiêu ≥90% trên toàn bộ bộ đánh giá có nhãn đã khóa, kiểm chứng độc lập và pipeline/coverage thực tế. needs_review/lỗi ở benign/malicious không tính đúng; uncertain cần bất định có bằng chứng. Không train, tải/đổi model, nới validator hay đưa nhãn/metadata vào input.

Theo yêu cầu mới, đã giữ các checkpoint phát triển: người nhận 13/18, ngữ cảnh 13/18, bằng chứng 14/18. Hai lượt sửa tiếp từ 14/18 đạt 14/18 (hai lỗi) và 11/18; giữ bản 14/18 có một lỗi, không quay về bản 10/18. Agent mặc định không đổi. [Checkpoint và bằng chứng](../../benchmark/experiments/skills-v1/checkpoint-tot-nhat-2026-11-05.md).

Cập nhật 2026-10-28. **Chưa hoàn thành.**

## Kiểm chứng nâng cấp chuyển dữ liệu theo mục tiêu90%

Đã xây hai bản tạo ứng viên chuyển hội thoại và một hợp đồng classic-spans-v1 không chép quote. Đo tổng100 pipeline/200 request thật, không train/đổi model. V1 tạo3 FP nên loại. V2 trên22 ca mỗi nhánh tăng đúng36,4%→45,5%, TP1→3, false clear2→0 và FP giữ0, nhưng lỗi1→3/p95+110,2%, chưa đạt cổng. Span trên10 ca khác tăng đúng40%→60%, hợp lệ9/10→10/10, nhưng2 FP và hồi quy uncertain/tấn công, cũng không chọn. Không so phần trăm hai lô khác nhau thành một đường tiến bộ. 310 test/typecheck/lint/build đạt; nguồn và raw được giữ.

Giữ tính năng ở runner/hợp đồng thử, chưa bật mặc định hoặc mở đo rộng/holdout cho cấu hình trượt. Mục tiêu khoảng90% chưa đạt trên các lô lỗi khó; chưa thể suy tỷ lệ toàn dự án. [Báo cáo và liên kết từng ca](../../benchmark/kiem-thu/ket-qua-nang-cap-chuyen-du-lieu.md). Ưu tiên1 vẫn mở.

## Nâng cấp tính nhất quán và chốt đối chứng hành động

Đã áp dụng cổng mâu thuẫn trong `applyBatch`/`conclude`: giữ stance/reason/citation trái nhau của cùng vai trò trên bằng chứng cùng chunk có quan hệ chứa quote, chuyển nghi vấn đó thành unresolved và hiển thị đối chiếu trên UI. Không nhầm bất đồng giữa vai trò thành tự mâu thuẫn; vẫn giữ phát hiện từ bằng chứng độc lập khác. Một test tái hiện trước sửa thất bại, sau sửa cùng các đối chứng đạt. 291 test ứng dụng, typecheck/lint/build đạt; build còn cảnh báo Vite cũ.

Replay nguyên 60 response của 30 ca cũ không gọi model: verdict/processing không đổi, `case-006` được gắn cờ đúng. Sau đó đo một bản thử bổ sung kiểm tra hành động/người nhận/bao khung trong cùng request: 34 pipeline/68 request thật, hai nhánh cùng 17 ca. Hai false clear chỉ chuyển sang needs_review, TP giữ1/8; uncertain đúng có bằng chứng3/3→0/3, ca xử lý hợp lệ16/17→14/17, p95+32,5%. Trượt cổng: `actionAudit` chỉ dùng khi runner gọi rõ, không bật UI/mặc định, không mở prompt/train tiếp trong đợt này.

Quyết định và giới hạn tại `benchmark/results/action-audit-Q7bwE4/quyet-dinh.md`; replay tại `benchmark/results/consistency-replay-83MI25/tong-hop.json`. Chưa triển khai mặc định tham chiếu trích dẫn hoặc checkpoint/tiếp tục tài liệu dài; cần kiểm chứng riêng. Chưa có cải thiện nhận diện đạt cổng hoặc holdout độc lập. Không train, Ưu tiên 1 vẫn mở.

## Luồng xử lý lỗi đã áp dụng trong sản phẩm

Theo yêu cầu mới, ưu tiên sửa orchestration và đầu ra trước fine-tuning, không train model. Detector/Verifier hiện ghi `batchFailures` với role, model, mã lỗi, thời gian và file/dòng/ID chunk nguồn. Lỗi JSON/schema/trích dẫn được cô lập, tiếp tục batch khác trong deadline; lỗi kết nối/timeout vẫn dừng. Batch lỗi không được áp dụng finding hoặc tính là đã rà; phát hiện hai vai trò xác nhận vẫn giữ kèm lỗi, phần còn lại không thành sạch. UI hiện lý do và hướng xử lý cho từng loại lỗi.

Baseline trước sửa: 48 test pipeline/UI đạt; hai kiểm thử mới tái hiện dừng sớm và thiếu chẩn đoán, cùng thất bại trước sửa. Sau sửa: 284 test toàn ứng dụng đạt, typecheck/lint/build đạt. Ba ca tích hợp trích xuất bốn file TXT/HTML thật, năm chunk, với phản hồi model cố định đạt: sạch có batch lỗi vẫn cần xem xét; IPI chỉ có Verifier xác nhận vẫn chưa giải quyết; IPI được cả hai xác nhận giữ phát hiện dù batch khác lỗi. Không có lượt model/train mới, chưa đo latency/resource model thực hoặc UI native/PDF/DOCX. Chi tiết lệnh và giới hạn tại `benchmark/experiments/runtime-batch-recovery-v1/kiem-chung.json`. Ưu tiên 1 vẫn mở.

## Sửa lỗi đối chiếu phạm vi file yêu cầu

Đã tái hiện bằng hai kiểm thử pipeline: scanner trả `ok` và coverage đầy đủ cho một file nhưng bỏ file thứ hai trong yêu cầu; pipeline cũ vẫn trả `not_detected`, hoặc giữ phát hiện mà thiếu cảnh báo file chưa đọc. Sau sửa, pipeline đối chiếu `fileResults` với danh sách file yêu cầu trực tiếp, ghi đường dẫn còn thiếu vào `coverageReasons`, trả `needs_review` nếu chưa có xác nhận IPI. Phát hiện được hai vai trò xác nhận vẫn giữ `ipi_detected` kèm cảnh báo phạm vi. Quét thư mục tiếp tục dùng cổng coverage hiện có vì không có danh sách file yêu cầu trực tiếp để đối chiếu.

Lệnh tái hiện: `npx vitest run --config vitest.config.ts src/ai/agents/document/ipiPipeline.test.ts`. Trước sửa: 2 lỗi/40 test; sau sửa: 40/40 đạt. Toàn bộ `npm test`: 276/276 đạt; `npm run typecheck` đạt. Đây là kiểm chứng chính sách xử lý qua bridge giả lập, không đo khả năng nhận diện của model hoặc extraction file thật. Chưa có kết quả holdout độc lập, dài/đa định dạng hoặc chất lượng ngữ cảnh đạt cổng B/C; Ưu tiên 1 vẫn mở. Bước tiếp giữ hướng Detector theo ngữ cảnh đã chốt bên dưới, đồng thời cần đo phạm vi file thật qua toàn pipeline; không suy từ test này rằng model đã tốt hơn.

Kiểm tra bổ sung sau sửa: `npm run lint` và `npm run build` đạt. Build còn cảnh báo cấu hình Vite về `customResolver` và `freeze`; không coi build đạt là bằng chứng nhận diện đạt.

## Hướng nghiên cứu đã chuẩn bị: Detector theo ngữ cảnh

**Đã chốt đặc tả và kế hoạch một pilot, chưa train.** Input là nhiệm vụ Agent đích + document không tin cậy; không dùng scanner task làm nhiệm vụ thay thế. Có contract validator/7 test, audit nguồn và9 reference AI-draft bị cấm train. Mismatch chủ đề không tự là IPI; LLMail dùng user_query, không dùng attacker task. InjecAgent có2.108 hàng có task/tool response nhưng chưa train-ready; LLMail subset48 chưa xác minh mapping scenario.

Pilot đề xuất chỉ học head3 trên encoder PIGuard frozen bằng CPU, một run tối đa5 epoch/100 steps/15phút; không được phép train hiện tại. Không lấy66/52 dev cũ vào train. Xem [đặc tả và điểm dừng](ke-hoach-detector-theo-ngu-canh.md). Bước kế là rà một lô nhỏ paired provenance/nhãn/span trước phase0, không tự mở thêm model hoặc thử prompt. Ưu tiên1 vẫn mở.

## Quyết định sau đợt tách trách nhiệm

**Đã đóng đợt — loại bản thử, không bật trong ứng dụng mặc định.** Code `candidate-only-v1` chỉ dùng khi runner gọi rõ: Rule/Detector tìm ứng viên, Verifier chỉ xác minh, schema/runtime cấm discovery; ghi riêng required/reviewed chunks. Không có lựa chọn UI.

Đo đủ 24 pipeline TXT (12 nguồn × 2 luồng), 41 request model hiện tại, không tải model hoặc train. Baseline xác nhận 1/4 tấn công, ứng viên 0/4; ca ra-008 hồi quy thành cần xem xét. Hai luồng đều 2/6 mẫu sạch kết luận chưa phát hiện, 4/6 cần xem xét; cả hai có 2 lỗi Detector trên biến thể mới. Mẫu thiếu ngữ cảnh đúng 1/2, mẫu còn lại kết luận chưa phát hiện. P95 31,25→32,31 giây (+3,38%).

240 kiểm thử, lint/typecheck/build đạt; đây là bằng chứng triển khai đúng phạm vi, không phải tăng an toàn. Code/bộ đo/model/seed được khóa trước gọi. Gồm 8 dev cũ và 4 biến thể mới nhãn AI, chưa phải holdout độc lập; chưa đo PDF/DOCX dài/UI.

**Quyết định kiến trúc vận hành:** giữ luồng mặc định, Agent chỉ hỗ trợ rà soát; không tiếp tục sửa prompt của ứng viên này. Chất lượng model hiểu người nhận/bao khung và khả năng tạo ứng viên vẫn chưa đạt. Phần triển khai/đối chứng/chốt ứng viên đã hoàn tất, Ưu tiên 1 chưa hoàn thành. Không tự mở đợt prompt/model/train tiếp. Kết quả: `benchmark/experiments/split-role-pipeline-v1/{giao-thuc-truoc-do,tong-hop,quyet-dinh}.json`.

## Các mốc trước để đối chiếu

Đã thử Qwen3-4B-Instruct-2507 Q4_K_M, tải weights vào E; 32 request so với Coder trên cùng 16 nguồn dev, giữ classic-v1/prompt/schema/parser, không cấp suspicion. JSON 15→16/16, stance đúng 7→8/16; TP giữ 0/4, FP 0/8, cả 4 uncertain vẫn dismissed. P95 trả lời sau nạp 2,21→13,40 giây; snapshot VRAM 1,27→2,14 GiB, Qwen context 8192, có dùng RAM/CPU. Cổng mới có điều kiện tăng TP/nhận diện uncertain nên loại ứng viên. Ba test cổng đạt. Không đổi mặc định/registry sản phẩm, chưa đo pipeline/holdout, không train thêm; kết quả chưa chứng minh Qwen3 4B nói chung kém hoặc thiếu năng lực.

Đo thực 32 request so sánh classic-v1/structured-v1 trên cùng 16 nguồn dev: JSON 15→16/16, stance đúng 7→8/16, TP giữ 0/4, FP giữ 0/8; cả 4 mẫu uncertain vẫn dismissed. p95 8,51→9,24 giây (+8,63%), snapshot VRAM giữ 1,27 GiB. Cổng kỹ thuật đã khóa báo đạt vì sửa được một lỗi trên mẫu sạch, nhưng không chứng minh tăng nhận diện: không tích hợp hoặc đổi mặc định. Mọi discovery rỗng nên chưa đo được accuracy người nhận/ngữ cảnh; cần thiết kế bài đo ngữ cảnh cho mọi đoạn và bổ sung điều kiện tăng TP/xử lý uncertain cho cổng lựa chọn sau. Giữ nguyên cổng và kết quả đợt này, không diễn giải lại thành thành công bảo mật.

Đã hoàn tất A/B giao đoạn trung lập: 32 request Coder trên cùng 16 nguồn dev (không dùng 48 nháp train). JSON 15→16/16 nhưng stance đúng 7→4/16; TP 0→4/4, báo nhầm 0→8/8, cả 4 mẫu uncertain bị confirmed. Precision ứng viên 33,33%, recall 100%, F1 50%, FPR 100%; p95 6,75→6,40 giây, snapshot VRAM giữ 1,27 GiB (không phải peak). Đóng ứng viên, không tích hợp pipeline/đổi mặc định. Quote bị ràng buộc toàn chunk nên chưa chứng minh tự định vị bằng chứng; đây là dev đã dùng, chưa phải kiểm chứng độc lập.

- Đã chuyển lại trọng tâm model/Agent: sửa lỗi chọn model thực chạy, chứng minh bằng ba test thất bại trước sửa rồi bộ 230 test đạt; lint/typecheck/build đạt. Chọn rõ phải khớp model, lỗi không âm thầm đổi; hỗ trợ Instruct khi chọn thủ công, hai model mặc định giữ nguyên. Đây là sửa luồng thật, không phải chứng minh tăng nhận diện.
- Đã gọi model thực 40 lần: 32 lượt Verifier classic-v1 trên 16 nguồn dev ngoài train, rồi bốn pipeline TXT. Coder/Instruct đúng 7/6 trên 16, TP 0/0 khi không cấp suspicion; không đổi sang Instruct. Pipeline baseline có 1 TP, 1 TN, 2 needs_review do model bất đồng, không lỗi/thiếu coverage. Hướng kiểm chứng tiếp là cách giao đoạn kiểm tra khi chưa có finding; tạm dừng mở rộng dữ liệu và train. Bộ dev này đã dùng chẩn đoán, chưa phải holdout độc lập cuối.

- Đã triển khai chính sách kết luận/lỗi và tiến độ từng model trong UI/pipeline.
- Chưa đạt chất lượng nhận diện/ngữ cảnh của Agent.
- Đã đo ứng viên ví dụ ngữ cảnh trên 13 mẫu/26 lượt: có cải thiện nhỏ nhưng còn báo nhầm/lỗi/hồi quy; chưa đổi mặc định.
- Chưa hoàn tất tài liệu dài/đa định dạng qua toàn pipeline và holdout độc lập.
- Đã fine-tune candidate-01 nội bộ, chưa đạt cổng chất lượng và chưa đưa vào Agent; chưa thêm vòng phản biện.
- Candidate-02 đã train trên E: 45 bước/360 microbatch, 45 kiểm tra gradient đạt. Screen cùng 6 nguồn dev: 8/12 qua parser, 4 stance đúng, 1 FP, 4 lỗi; chưa đạt. FP giảm do ca cũ chuyển thành lỗi, chưa có ca stance nào được sửa so candidate-01. Không chạy full dev/probe hoặc đưa vào Agent; đã dùng đủ ngân sách 2 ứng viên.
- Đã đo teacher-forcing off/on: 360 train + 12 dev nhỏ mỗi mode, tổng 744 forward; không cập nhật weights. Token cấu trúc có tiền tố gold đạt khoảng 99% nhưng addressee/framing trên dev không tăng; reason chiếm 94% NLL dev khi bật adapter. Không coi điểm token là độ đúng phân loại. Bước tiếp dùng ngữ cảnh gold làm đối chứng chẩn đoán để tách đọc ngữ cảnh khỏi ánh xạ stance; chưa train thêm.
- Đã đo oracle ngữ cảnh: stance-only đổi tác vụ và sụp về dismissed nên không cô lập được lỗi. Đối chứng trên JSON gốc tái hiện nguyên văn baseline; oracle giữ stance đúng 4/12 nhưng parser 8→6/12, sửa 2 ca và hồi quy 2 ca. Model còn ghi deviation none + confirmed dù được gợi ý ngữ cảnh; parser chặn đúng. Chưa đổi Agent hoặc train thêm. Bước tiếp cố định ngữ cảnh trong tiền tố JSON cho phép đo diagnostic để kiểm tra ánh xạ, thay vì chỉ gợi ý trong system.
- Prefix oracle v1 đã dừng đúng 6 ca: phát hiện ranh giới token prefix khác gold ở 6/6 ca, nên chưa dùng để kết luận riêng khả năng ánh xạ stance. Đã giữ raw/snapshot, sửa prefix v2 và thêm chặn mismatch; preflight tokenizer đạt 6/6, 3 kiểm thử đạt, chưa gọi model v2. Bước tiếp chỉ đo lại 6 ca v2, không tăng ngân sách train hoặc đổi Agent.
- Đã đo đúng 6 ca prefix v2 và chốt vòng chẩn đoán: JSON cú pháp 6/6, hợp đồng ứng dụng 3/6, stance đúng được chấp nhận 3/6. Raw stance đúng 5/6 không thay số accepted: hai ca lỗi độ dài reason; một ca human/none vẫn confirmed. Ngữ cảnh/span đã được cấp gold nên không phải hiệu quả nhận diện. Dừng thêm prompt/train trong vòng này; candidate-02 không được chọn, giữ parser và Agent. Trước lượt nâng cấp mới cần thiết kế có đối chứng cho nhất quán ngữ cảnh→stance và giải thích có bằng chứng.
- Theo yêu cầu mới, đã chuẩn bị và khóa thiết kế một ứng viên kiểm tra cuối, 28 đối chứng mới/4 bối cảnh/2 nhóm từ vựng; 112 preview qua parser/token/mask/collator, max 1455 token. Khóa 52 file và tiêu chí trước đo; ngân sách 1 prompt, 0 train. Chưa viết runner hoặc gọi model. Bước tiếp triển khai runner theo giao thức, không thay mặc định hay thêm ứng viên nếu trượt.
- Đợt kiểm tra nhất quán đã đóng: runner/chấm/cổng qua kiểm thử, đã chạy 48/136 lượt rồi dừng do 15 phản hồi candidate vi phạm hợp đồng. Trên 24 cặp đã đo: stance đúng baseline 7/candidate 3, hợp lệ 12/9, FP 1/2. Baseline dev cũ tái hiện nguyên văn; SHA adapter không đổi, GPU đã giải phóng. Đây là subset, không phải kết quả cả bộ. Không thêm prompt, chạy full/probe, train hoặc triển khai ứng viên. Chất lượng nhận diện và kiểm chứng độc lập/toàn pipeline vẫn chưa đạt.
- Đã kiểm toán target train không gọi model: 360/360 qua parser, không thấy lỗi cấu trúc hoặc corpus metadata lộ theo phép kiểm tra. Tuy 72/72/36 nguồn, số biểu diễn dạy trực tiếp context/stance là 144/72/72 do 72 benign/none đúng hợp đồng phải rỗng. Uncertain chỉ một ô ngữ cảnh, assistant/active/none benign chỉ hai nguồn EN; 23 mẫu lý do lặp qua ít nhất ba nhóm, bao phủ 112 nguồn. Đây là khoảng cần rà cách giám sát, chưa chứng minh nguyên nhân hoặc nhãn sai. Chưa sửa dữ liệu/train; bước tiếp thiết kế ma trận bổ sung ngữ cảnh thiếu, giữ dev ngoài train.
- Trainer đã qua kiểm tra accumulation 8, checkpoint/resume trên GPU; dữ liệu đủ điều kiện và chia tập độc lập vẫn chưa hoàn tất.

Số liệu dùng chung tại [bảng tổng hợp](../reports/tong-hop-hien-trang.md),
bước tiếp tại [việc cần làm](cong-viec-can-lam.md). Không nối thêm nhật ký
lặp vào trang này. [Tiêu chí hoàn thành đã khóa](cong-hoan-thanh-uu-tien-1.md)
được giữ nguyên để đối chiếu baseline.
