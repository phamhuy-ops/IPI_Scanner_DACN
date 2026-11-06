# Việc cần làm

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

Cập nhật 2026-10-28. **Ưu tiên 1 vẫn mở.**

Điểm điều phối tiến độ hiện hành: [nhật ký và đề xuất tuần 3](../../kế%20hoạch%20-%20nhật%20ký%20tuần/tuan-03.md). Đã thu gọn công cụ thử nghiệm; bước kế là đo baseline sau hoàn tác prompt, đồng thời thực hiện demo/pipeline và báo cáo. Giới hạn mỗi chu kỳ 1 baseline + tối đa2 ứng viên, không để các nhánh còn lại chờ đạt90%; đây là đề xuất kế hoạch, không đánh dấu Ưu tiên 1 hoàn thành.

## Ưu tiên thực thi mới: sửa luồng Agent trước huấn luyện

Nâng cấp gần nhất đã chốt: cổng mâu thuẫn cùng vai trò và UI đối chiếu đã áp dụng; replay30 ca không đổi verdict/processing, 291 test/typecheck/lint/build đạt. Bản thử kiểm tra hành động qua34 pipeline/68 request trượt (TP không tăng, uncertain/lỗi/latency hồi quy), giữ ngoài mặc định. Chi tiết `benchmark/results/action-audit-Q7bwE4/quyet-dinh.md`. Không tiếp tục sửa prompt trong đợt đã đóng; tham chiếu trích dẫn và checkpoint tài liệu dài còn cần thiết kế/đo riêng. Không train.

Theo yêu cầu người dùng ngày 2026-10-28, tập trung lỗi xử lý thực tế, orchestration và đầu ra; không train model. Fine-tuning chỉ được cân nhắc sau khi các hướng cải thiện luồng có đối chứng không đáp ứng, không tự mở lại pilot paired-context dưới đây.

Đã áp dụng vào pipeline mặc định: cô lập batch bị lỗi JSON/schema/trích dẫn, tiếp tục batch khác trong deadline; không retry, không nhận đầu ra lỗi hoặc tính batch lỗi vào coverage. Transport/timeout vẫn dừng. Có chẩn đoán theo role/model/file/dòng và hướng xử lý trên UI. Hai kiểm thử mới thất bại trước sửa, sau sửa đạt; ba ca qua extraction TXT/HTML thật với phản hồi model cố định đạt. Không phải bằng chứng tăng năng lực nhận diện model.

Bước tiếp dựa trên lỗi thực tế và `batchFailures`: xác định lỗi thuộc extraction, hợp đồng/trích dẫn, tài nguyên hay bất đồng ngữ nghĩa; tái hiện bằng nguồn đã làm sạch, thêm đối chứng gần giống rồi chỉ sửa tầng gây lỗi. Không dùng lỗi JSON làm lý do train; không dùng đồng thuận hai model thay nhãn đúng. Đo model thật, PDF/DOCX/UI native, chi phí và holdout vẫn chưa hoàn tất.

## Hướng nghiên cứu đã chuẩn bị: Detector theo ngữ cảnh, chưa triển khai

**Đã chốt đặc tả và kế hoạch một pilot, chưa train.** Input là nhiệm vụ Agent đích + document không tin cậy; không dùng scanner task làm nhiệm vụ thay thế. Có contract validator/7 test, audit nguồn và9 reference AI-draft bị cấm train. Mismatch chủ đề không tự là IPI; LLMail dùng user_query, không dùng attacker task. InjecAgent có2.108 hàng có task/tool response nhưng chưa train-ready; LLMail subset48 chưa xác minh mapping scenario.

Pilot đề xuất chỉ học head3 trên encoder PIGuard frozen bằng CPU, một run tối đa5 epoch/100 steps/15phút; không được phép train hiện tại. Không lấy66/52 dev cũ vào train. Xem [đặc tả và điểm dừng](ke-hoach-detector-theo-ngu-canh.md). Bước kế là rà một lô nhỏ paired provenance/nhãn/span trước phase0, không tự mở thêm model hoặc thử prompt. Ưu tiên1 vẫn mở.

## Quyết định sau đợt tách trách nhiệm

**Đã đóng đợt — loại bản thử, không bật trong ứng dụng mặc định.** Code `candidate-only-v1` chỉ dùng khi runner gọi rõ: Rule/Detector tìm ứng viên, Verifier chỉ xác minh, schema/runtime cấm discovery; ghi riêng required/reviewed chunks. Không có lựa chọn UI.

Đo đủ 24 pipeline TXT (12 nguồn × 2 luồng), 41 request model hiện tại, không tải model hoặc train. Baseline xác nhận 1/4 tấn công, ứng viên 0/4; ca ra-008 hồi quy thành cần xem xét. Hai luồng đều 2/6 mẫu sạch kết luận chưa phát hiện, 4/6 cần xem xét; cả hai có 2 lỗi Detector trên biến thể mới. Mẫu thiếu ngữ cảnh đúng 1/2, mẫu còn lại kết luận chưa phát hiện. P95 31,25→32,31 giây (+3,38%).

240 kiểm thử, lint/typecheck/build đạt; đây là bằng chứng triển khai đúng phạm vi, không phải tăng an toàn. Code/bộ đo/model/seed được khóa trước gọi. Gồm 8 dev cũ và 4 biến thể mới nhãn AI, chưa phải holdout độc lập; chưa đo PDF/DOCX dài/UI.

**Quyết định kiến trúc vận hành:** giữ luồng mặc định, Agent chỉ hỗ trợ rà soát; không tiếp tục sửa prompt của ứng viên này. Chất lượng model hiểu người nhận/bao khung và khả năng tạo ứng viên vẫn chưa đạt. Phần triển khai/đối chứng/chốt ứng viên đã hoàn tất, Ưu tiên 1 chưa hoàn thành. Không tự mở đợt prompt/model/train tiếp. Kết quả: `benchmark/experiments/split-role-pipeline-v1/{giao-thuc-truoc-do,tong-hop,quyet-dinh}.json`.

## Các mốc trước để đối chiếu

Đã thử Qwen3-4B-Instruct-2507 Q4_K_M, tải weights vào E; 32 request so với Coder trên cùng 16 nguồn dev, giữ classic-v1/prompt/schema/parser, không cấp suspicion. JSON 15→16/16, stance đúng 7→8/16; TP giữ 0/4, FP 0/8, cả 4 uncertain vẫn dismissed. P95 trả lời sau nạp 2,21→13,40 giây; snapshot VRAM 1,27→2,14 GiB, Qwen context 8192, có dùng RAM/CPU. Cổng mới có điều kiện tăng TP/nhận diện uncertain nên loại ứng viên. Ba test cổng đạt. Không đổi mặc định/registry sản phẩm, chưa đo pipeline/holdout, không train thêm; kết quả chưa chứng minh Qwen3 4B nói chung kém hoặc thiếu năng lực.

Bước kế tiếp hiện tại: Không thử thêm model/prompt tự động. Chẩn đoán riêng việc hiểu ngữ cảnh và thiên lệch không có suspicion trước khi thiết kế thay đổi luồng; chưa thể kết luận model 4B nói chung không đủ năng lực.

Đã hoàn tất A/B giao đoạn trung lập: 32 request Coder trên cùng 16 nguồn dev (không dùng 48 nháp train). JSON 15→16/16 nhưng stance đúng 7→4/16; TP 0→4/4, báo nhầm 0→8/8, cả 4 mẫu uncertain bị confirmed. Precision ứng viên 33,33%, recall 100%, F1 50%, FPR 100%; p95 6,75→6,40 giây, snapshot VRAM giữ 1,27 GiB (không phải peak). Đóng ứng viên, không tích hợp pipeline/đổi mặc định. Quote bị ràng buộc toàn chunk nên chưa chứng minh tự định vị bằng chứng; đây là dev đã dùng, chưa phải kiểm chứng độc lập.

Đo thực 32 request so sánh classic-v1/structured-v1 trên cùng 16 nguồn dev: JSON 15→16/16, stance đúng 7→8/16, TP giữ 0/4, FP giữ 0/8; cả 4 mẫu uncertain vẫn dismissed. p95 8,51→9,24 giây (+8,63%), snapshot VRAM giữ 1,27 GiB. Cổng kỹ thuật đã khóa báo đạt vì sửa được một lỗi trên mẫu sạch, nhưng không chứng minh tăng nhận diện: không tích hợp hoặc đổi mặc định. Mọi discovery rỗng nên chưa đo được accuracy người nhận/ngữ cảnh; cần thiết kế bài đo ngữ cảnh cho mọi đoạn và bổ sung điều kiện tăng TP/xử lý uncertain cho cổng lựa chọn sau. Giữ nguyên cổng và kết quả đợt này, không diễn giải lại thành thành công bảo mật.

Đóng đợt, không nối thêm thử prompt. Trước lần lựa chọn tiếp cần khóa cổng có tăng nhận diện tấn công và đánh giá uncertain; chuẩn bị bài đo độc lập về ngữ cảnh cho mọi đoạn, không thông qua schema discovery chỉ dành finding. Đây là thiết kế mới, chưa được triển khai hoặc chứng minh.
Tạm dừng mở rộng dữ liệu và train; các mốc chuẩn bị dưới đây được giữ để đối chiếu.

Mốc hiện tại: hai ứng viên fine-tuning đã train trên E, đều chưa đạt screen.
Candidate-02 vẫn đúng stance 4/12 như candidate-01, lỗi tăng 3→4; không đổi
Agent, không chạy probe. Đã dùng đủ ngân sách hai ứng viên. Đã đo teacher-forcing
744 forward: khớp cấu trúc tốt hơn khi có tiền tố gold, nhưng token addressee/framing
trên dev nhỏ không tăng; reason chiếm phần lớn NLL. Đã đo oracle gợi ý ngữ cảnh
trên JSON gốc: stance giữ 4/12, lỗi tăng 4→6, vẫn có mâu thuẫn none + confirmed.
Đã chạy prefix v1 đúng 6 ca rồi dừng; audit phát hiện tiền tố lệch token gold,
nên chưa dùng để kết luận ánh xạ. Đã sửa v2, guard và preflight 6/6 đạt.
Đã đo đủ 6 ca v2: cú pháp JSON 6/6 nhưng hợp đồng ứng dụng 3/6;
hai ca lỗi độ dài reason, một ca human/none vẫn confirmed. Chốt vòng
chẩn đoán, dừng thêm thử prompt/train tự động và không chọn candidate-02.
Trước lượt nâng cấp mới cần thiết kế có đối chứng cho nhất quán
ngữ cảnh→stance và giải thích có bằng chứng; giữ parser và needs_review.
Thiết kế này đã chuẩn bị, khóa và đo tại [kế hoạch Verifier](ke-hoach-thu-fine-tuning-verifier.md).
Đợt đã dừng ở 48/136 lượt vì candidate có 15 lỗi hợp đồng. Trên 24 cặp đã
đo, stance đúng 7→3, hợp lệ 12→9; không báo thành kết quả cả bộ.
Ứng viên bị loại, không tự thêm prompt, train hoặc chạy lại. Trước đợt
nâng cấp mới cần một giả thuyết và giao thức mới; dữ liệu độc lập, tài liệu
dài/đa định dạng và toàn pipeline vẫn là phần tồn đọng, chưa thể đóng Ưu tiên 1.
Đã kiểm toán target train: cấu trúc đạt nhưng giám sát context thực tế lệch
144/72/72; uncertain chỉ một kiểu, benign AI active/none chỉ hai nguồn EN.
Đã lập ma trận 16 vị trí neo/bốn loại ngữ cảnh và đọc 12 nguồn để đề xuất
reason bám bằng chứng; chưa áp dụng. Đã đủ bốn batch, 48 mẫu/96 preview
qua parser/token/mask/collator và rà gộp. Audit toàn kho v21 giữ đúng bốn
nhóm train cha, chưa bảo đảm độc lập ngữ nghĩa. Bước tiếp rà ngữ nghĩa theo
hàng chờ 48 mẫu rồi lập phương án phát hành/thay thế, tiếp tục giữ target
rỗng, không đưa dev vào train hoặc tự mở lượt model/train mới.
Các số liệu pool cũ bên dưới là mốc
lịch sử; số hiện tại xem bảng tổng hợp, không dùng để tính thiếu mẫu mới.

Nhánh chất lượng Agent: đã đo ví dụ đối chiếu ngữ cảnh trên 13 mẫu, chưa
đạt cổng chất lượng dù có cải thiện nhỏ. Giữ mặc định; bước tiếp là chốt
regression về mâu thuẫn stance/lý do, hoàn thiện dữ liệu và trainer cho
pilot một Verifier. Không tiếp tục đổi prompt nhỏ chỉ để tối ưu bộ dev này.
Nhánh extraction/định dạng bên dưới vẫn cần hoàn thành riêng.

Đã có registry 267 bản: 84 giữ dev, 183 ứng viên/68 nhóm chờ điều kiện.
Batch mới có 32 mẫu tự soạn/8 bối cảnh, không phải nguồn ngoài độc lập;
đã rà lại 12 mẫu Python. Theo mục tiêu train 180/probe 60, còn thiếu ít
nhất 57 ứng viên ngoài dev nếu cả 183 bản đều đạt. Ưu tiên nguồn ngoài
đa dạng/quyền dùng rõ thay vì tiếp tục tăng mẫu cùng khuôn. Audit v11 giữ
nhóm cũ; audit hiện tại v15, chưa tạo split hay tự phê duyệt quyền train từ khai báo license.

LLMail-Inject: 23/251 email đã chuẩn hóa; lượt thêm 11 mẫu có 22/22 bản đạt,
gồm sáu đối chứng việc cho người và một uncertain khác nhãn nguồn.
Chưa lấy hàng loạt 228 email còn lại vì nhiều mẫu cùng khuôn. Không tự biến ngân hàng FP
hoặc nhãn nguồn thành stance, không lấp số thiếu bằng cùng một family.

Đã thêm 18 mẫu tiếng Việt trên sáu đoạn hướng dẫn Markdown có ghi công và
license nội dung CC BY-SA 4.0; 36/36 bản đạt, chưa train. Đã rà pool và hash bằng chứng nguồn. Bước tiếp soạn batch có mục tiêu: confirmed/uncertain tiếng Việt trong nhiều bối cảnh, kèm đối chứng gần giống; kiểm tra span/token và nhóm trước nhập registry. Kịch bản 240 bản còn thiếu 40 confirmed/16 dismissed/17 uncertain, ít nhất 28 bản tiếng Việt nằm trong số đó. Đây là giới hạn lập kế hoạch nếu toàn bộ ứng viên đạt, không phải split đã chốt.

| Thứ tự | Việc cần làm | Điều kiện chốt |
| --- | --- | --- |
| 1 | Chuẩn bị đối chứng PDF/DOCX tự soạn: sạch, hướng dẫn cho người, attack trích dẫn, attack có hiệu lực; vị trí đầu/giữa/cuối, chữ thật/chữ trong ảnh | Có nhãn/span, nguồn cha/nhóm, hash; nhãn không đi vào scanner/model. |
| 2 | Đo extraction, selection và trạng thái thiếu dữ liệu trên cùng đối chứng | Biết phần chữ mất, đoạn không chọn, lỗi thực; không kết luận sạch khi biết thiếu phạm vi theo chính sách. |
| 3 | Đo Detector + Verifier và toàn pipeline; chọn một sửa đổi có căn cứ | Baseline trước/sau, đối chứng gần giống, biến thể chưa dùng chọn cấu hình; ghi lỗi, coverage, latency và tài nguyên. |
| 4 | Hoàn thiện dữ liệu cho một Verifier | Bổ sung nguồn/nhóm còn thiếu; quyền dùng, riêng tư, span/context, trùng lặp, token/mask được kiểm tra; chia theo nhóm. |
| 5 | Chạy pilot fine-tuning khi đủ điều kiện | Trainer/accumulation/checkpoint-resume đã qua smoke kỹ thuật; còn phải chốt train/dev, holdout độc lập và ngân sách dữ liệu thật. So sánh cùng base/backend có và không adapter. |
| 6 | Kiểm chứng cuối và cân nhắc vòng phản biện | Đạt tiêu chí đã khóa; đo cấu hình cố định trên holdout mới và luồng sản phẩm. Phản biện tối đa 2–3 vòng cần phép đo riêng. |

Nguồn công khai 2 PDF/2 DOCX hiện chỉ ở incoming; chưa duyệt quyền train,
ảnh và metadata toàn bộ. Không cần người dùng tải lại. Chưa cần cài thêm
phần mềm cho bước tạo/đo đối chứng; nếu phát sinh phụ thuộc sẽ thông báo.

Nguyên tắc: lỗi chứng minh được → đối chứng sạch/tấn công → dữ liệu độc lập
→ toàn pipeline. Không nới citation/schema để làm đẹp số đo. Giữ log và
baseline, không nhân bản nhóm để đủ số lượng.

Xem [bảng hiện trạng](../reports/tong-hop-hien-trang.md),
[cổng Ưu tiên 1 đã khóa](cong-hoan-thanh-uu-tien-1.md),
[kế hoạch Verifier](ke-hoach-thu-fine-tuning-verifier.md).

Đã bổ sung 16 mẫu nghiệp vụ tiếng Việt tự soạn; kiểm tra JSON/token và nhóm đạt, registry v6. Bước tiếp rà ngữ nghĩa chéo theo bối cảnh và hoàn thiện điều kiện từng nhóm hiện có trước khi tăng số lượng; nhãn AI không thay kiểm chứng độc lập.

Đã rà lại 16 mẫu nghiệp vụ Việt: 12 giữ nguyên, 4 sửa riêng framing active trong khi stance vẫn uncertain. Registry v7 thay bản nhãn, không tăng số mẫu; nguồn/model input/nhóm giữ nguyên, 32 bản sau sửa qua JSON/token/mask. Đây là AI tự rà lại, chưa kiểm chứng độc lập. Bước tiếp: Rà điều kiện và ngữ nghĩa theo nhóm của các ứng viên tự soạn còn lại, dùng nhãn hiệu chỉnh hiện tại làm tham chiếu; bổ sung nguồn độc lập cho khoảng thiếu confirmed/uncertain. Chưa chia tập hoặc train.

Đã tự rà đủ 63 ứng viên tự soạn (registry v8); giữ stance, hiệu chỉnh 17 framing qua hai lượt. Không thêm mẫu hoặc thay văn bản. Rà 18 ứng viên uncertain từ nguồn ngoài theo đúng văn bản đang đưa model, không dùng nhãn nguồn hoặc biến thể khác để suy thêm người nhận/quyền; ghi quyết định từng ca rồi kiểm tra JSON/token nếu sửa. Chưa chia tập/train.

Registry v9: đã rà thêm 18 uncertain nguồn ngoài, giữ stance, sửa 17 framing; 36 bản kiểm tra đạt. Tổng 35 uncertain ngoài dev đều đã tự rà. Rà các ứng viên confirmed/dismissed nguồn ngoài theo nhóm và đối chứng, ưu tiên phát hiện giả định người nhận/quyền hoặc thiếu bao khung; còn 102 bản chưa thuộc lượt rà ngữ nghĩa mới. Không lấy việc sửa framing làm bằng chứng model nhận diện tốt hơn.

Đã hoàn tất lượt AI tự rà ngữ nghĩa 183 ứng viên ngoài dev; 102 bản nhị phân giữ nguyên, không cần tái tạo token vì input/target không đổi. Bổ sung nhóm mới có đủ ngữ cảnh và đối chứng: theo kịch bản pool 240, thiếu 36 confirmed/8 dismissed/13 uncertain, ít nhất 12 tiếng Việt nằm trong số đó. Giữ nhóm nguyên vẹn; chuẩn bị holdout độc lập 200 mẫu riêng, không dùng các ứng viên đã rà làm holdout.

Hiện tại sau batch OpenAPI: registry v10 có 198 ứng viên/69 nhóm, còn thiếu tối thiểu 42. Các số 183/57 bên trên là mốc trước mở rộng. Bổ sung bối cảnh tiếng Việt mới với đủ ngữ cảnh người nhận/quyền, ưu tiên confirmed/uncertain và cách diễn đạt khác nguồn cũ; còn tối thiểu 42 ứng viên theo kịch bản, trong đó 12 vi chưa được bù. Giữ holdout độc lập riêng, chưa chia tập/train.

Hiện tại: registry v11 có 302 bản, gồm 84 dev và 218 ứng viên/73 nhóm. Thêm 20 mẫu nghiệp vụ Việt; 40 bản kiểm tra đạt. Ưu tiên bổ sung confirmed/uncertain ở nhóm mới và kiểm tra khả năng chia theo nhóm. Tổng thiếu ít nhất 22 bản; nếu giữ kịch bản tỷ lệ 40/40/20 thì thiếu 22 confirmed và 6 uncertain (28 bản), không loại đối chứng để làm đẹp tỷ lệ. Tiếng Việt đạt số lượng tham chiếu nhưng chưa chứng minh chất lượng; holdout độc lập còn riêng. Chưa chia tập/train.

Mốc hiện tại: registry v12 có 254 ứng viên/79 nhóm. Đã đạt số lượng, có nghiệm giữ nguyên nhóm cho 180 train/60 probe; chưa cân bằng nguồn/ngôn ngữ hoặc xuất split. Đã đủ số lượng ứng viên cho pilot: dừng gom chỉ để đạt số. Chốt điều kiện sử dụng và chất lượng từng nhóm, đề xuất phân bổ cân bằng nguồn/ngôn ngữ theo nhóm rồi kiểm tra trước khi export train/dev/probe. Chưa train; holdout độc lập và đo toàn pipeline còn thiếu.

Đã lập phương án theo nhóm seed 65: 180 train/84 dev/60 probe, 14 ứng viên chưa dùng. Bốn kiểm thử và kiểm tra hash đạt; chưa export. Đối chiếu điều kiện từng nhóm trong phương án 180 train/84 dev/60 probe: ghi công/notice, phạm vi riêng tư và nhãn hiệu lực; sau đó tái dựng payload/target, kiểm tra token/mask trên đúng bản xuất. Chưa niêm phong probe, chưa train; giữ riêng holdout độc lập.

Đã dựng bản xuất thử v2: đúng 324 nhãn hiệu lực, 648 JSON/token/mask/collator đạt, không truncate. Có bảng điều kiện nguồn/notice/riêng tư từng mẫu. Chốt quyết định dùng nội bộ theo nguồn và phạm vi tên/địa chỉ trong dữ liệu ngoài; tách bản phát hành train/dev/probe với notice và kiểm tra ranh giới vai trò. Bản xuất thử 324 mẫu đã qua JSON/token/mask, chưa được đưa vào Trainer; không dùng file gộp 648 biểu diễn để train.

Đã tách ba file preview nội bộ và sao lưu notice theo nguồn; 18 bản đổi email, 648 bản JSON/token/mask đạt. Rà tác động ngữ nghĩa của 18 bản đổi email, chốt phiên bản dữ liệu nội bộ và khóa phép đo cùng base/backend trước pilot. Chưa train hoặc niêm phong probe.

Đã rà tác động email, tạo bản nội bộ v2 và khóa dữ liệu/phép đo (28 file). Có 16 bản đổi email, hai bản mã hóa giữ raw. 648 JSON/token/mask đạt; chưa bật train. Viết và kiểm tra loader train-only trên phiên bản đã khóa: chỉ nạp 180 nguồn/360 biểu diễn train, chặn dev/probe và mask prompt; sau đó đo baseline HF base trên dev trước pilot. Chưa huấn luyện.

Đã kiểm tra loader train-only và đo đủ baseline HF 84 dev/168 request: 3 qua parser đều báo nhầm, 165 lỗi JSON. Không có lỗi tài nguyên hoặc cập nhật trọng số. Tích hợp loader train-only vào lượt pilot một ứng viên theo giao thức khóa; chuẩn bị đối chứng cùng model/backend với adapter off/on. Đo riêng JSON, stance/ngữ cảnh và lỗi trên dev; không triển khai chỉ vì JSON cải thiện. Chưa dùng probe hoặc sửa Agent mặc định.

Pilot đầu đã train hoàn tất trên E, không cần train lại vì chuyển lưu trữ. Lượt đo off/on chưa hoàn tất; tiếp theo kiểm tra nguyên nhân và chạy lại phép đo theo phiên bản mới, giữ kết quả cũ. Lưu trữ đã kiểm tra sau khi chuyển 92 thư mục kết quả sang E.

Đã hoàn tất off/on screen candidate-01: JSON/parser 1/12→9/12, stance đúng 1/12→4/12; hai FP mới và ba phản hồi lỗi. Candidate bị giữ lại theo cổng đã định, không chạy full dev/probe hoặc thay Agent. Chuẩn bị cặp đối chứng mới về chỉ dẫn cho người/AI và đủ/thiếu quyền; rà sự nhất quán trường context của nhãn dev cũ theo phiên bản riêng, giữ gold lượt đã đo. Sau đó định trước một thay đổi huấn luyện có đối chứng và nhóm diễn đạt mới; không chỉ tăng epoch hoặc nới parser để vượt screen.

Đã tạo và đo 24 đối chứng chẩn đoán mới: 48 request, 35 hợp lệ/9 stance đúng/17 FP/4 false-clear. Giữ candidate-01 chưa đạt; không đưa bộ này vào train. Chuẩn bị bản dữ liệu train phản thực tế từ các nhóm train cũ theo kế hoạch đã ghi; chỉ đổi thành phần đối chứng người nhận/nguồn tự nhận quyền, giữ 180 nguồn/360 biểu diễn và 45 bước, prompt/model/loss không đổi. Không dùng 24 đối chứng dev mới làm bài học; chưa train candidate-02.
