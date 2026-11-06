# Làm rõ chỉ dẫn cần xét trong skill — 04/11/2026

## Kết quả chính

Đã chuẩn hóa đầu vào bằng **targetRef**: bên gọi chỉ rõ đoạn chứa yêu cầu cần phân tích, các đoạn khác chỉ cung cấp ngữ cảnh. Trên cùng bộ chẩn đoán mới, quy tắc phạm vi giúp lỗi chọn sai target giảm **5 → 0**, số ca đúng cả target/nhãn/bằng chứng tăng **3/12 → 8/12 (66,67%)**. Giữ đủ ba ca baseline đúng, không lỗi mới.

Giữ ứng viên 0.6.0 và hợp đồng target trong **harness thử nghiệm**, chưa nối vào Agent hoặc thay ba skill hiện tại. Chỉ qua kiểm tra phạm vi thành phần; bốn ca vẫn hiểu vai trò sai, chưa đạt 90% hoặc kiểm chứng độc lập. Không so trực tiếp 8/12 với 11/14 hay 14/22 cũ vì bộ dữ liệu và hợp đồng đầu vào khác nhau.

## Đã sửa gì

- [Hợp đồng target-v1](recipient-target-contract.md) quy định đầu vào, đầu ra và ranh giới trách nhiệm. Skill không tự chọn yêu cầu khác khi nguồn có nhiều chỉ dẫn, không xác nhận thẩm quyền/thực thi, không kết luận độc/sạch.
- [Ứng viên 0.6.0](recipient-target-candidate.md) giữ nguyên phần chỉ dẫn 0.4.0 và chỉ thêm một câu giới hạn target. Không thêm quy tắc suy đoán vai trò, tăng epoch hay đổi model.
- [Bộ dev mới](recipient-target-dev.json) gồm 6 tài liệu, mỗi tài liệu 2 target, tổng 12 ca. Nhãn/lý do nhãn và target được khóa trước đo. Nguồn tự soạn, CC0, chia nhóm theo tài liệu, có Việt/Anh, người/AI/phần mềm khác, câu trích và thiếu người thực hiện. Các tài liệu đều ngắn; chưa phải đo coverage tài liệu dài.
- Rà và ghi cảnh báo cho rc7 vì có nhiều yêu cầu; r2/r6/rv5/rc1 cần rà về danh tính AI/con người/phần mềm. **Không đổi nhãn, bỏ ca hoặc tính lại điểm lịch sử.** Bộ cũ giữ nguyên trạng thái dev đã dùng.

Target được người xây phép thử chọn trước từ nguyên văn nguồn, không do Detector tìm. Cả hai nhánh đều nhận cùng segments và targetRef, không nhận nhãn, ID ca/nhóm, lý do nhãn hay đường dẫn. Đây là **đánh giá có điều kiện khi đã biết đoạn cần xét**, không đo phát hiện/chọn đoạn tấn công hoặc toàn Agent. Target có cả yêu cầu hợp lệ và câu trích, không đồng nghĩa nhãn malicious.

## Cách đo có đối chứng

Lệnh: `node benchmark/experiments/skills-v1/evaluate.cjs --recipient-target-ab`.

Đã chạy đủ **24 request mới**, không retry. Baseline dùng skill tham chiếu 0.4.0; candidate chỉ thêm câu phạm vi target. Cùng model local Qwen3 4B, schema, input, validator, seed 42, temperature 0, context 4096, tối đa 350 token đầu ra và timeout 45 giây. Đảo thứ tự hai nhánh theo ca. Snapshot/hash bộ ca, skill, runner, model và lệnh được lưu trước đo.

Validator ở cả hai nhánh đều yêu cầu actionRef bằng targetRef, ref có thật và trích xuất đúng nguồn; unknown giữ quy tắc actorRef rỗng và reason có nội dung. Không ép actionRef bằng một enum chỉ có target để model tự động đúng; schema vẫn cho chọn mọi ref nguồn và code kiểm tra lựa chọn. Không sửa đầu ra hoặc hạ lỗi thành unknown.

Target không có thật, xuất hiện nhiều lần hoặc vượt ranh giới một segment bị từ chối trước khi gọi model, tránh tự chọn một vị trí không rõ. Đã kiểm tra 12 target đều duy nhất và nằm trong nguồn; nguồn/offset giữ đúng, cả hai nhánh có input/schema/model/options giống nhau. Đã đọc 12 đầu ra candidate và các đoạn được chọn; tám ca đúng có lý do phù hợp, hai unknown đúng t11/t12 thực sự thiếu người thực hiện. Cùng người xây bộ thử rà, chưa độc lập.

## Các lỗi được tách rõ

**Chọn target:** baseline 7/12 đúng vị trí, candidate **12/12**. Năm ca baseline chọn yêu cầu khác vẫn bị tính sai kể cả nhãn tình cờ trùng. Không bỏ các ca đó khỏi mẫu số.

**Hiểu vai trò:** candidate còn bốn ca sai, dù đã chọn đúng target:

- t03: thấy câu gọi language-model assistant nhưng yêu cầu bằng chứng ai thực sự thực hiện; nhầm bên được yêu cầu với việc thực thi câu trích.
- t04: lý do nói giảng viên là con người nhưng lại chọn unknown vì không có tên riêng; nội dung tự mâu thuẫn.
- t05: từ câu mệnh lệnh và bối cảnh công việc tự đoán có nhân viên thực hiện, dù target không nêu người thực hiện. Không được lấy nhân sự ở mục khác gán sang.
- t07: có dịch vụ backup timer được nêu rõ nhưng vẫn chọn unknown; chưa hiểu đúng lớp other.

Không tự chuyển nhãn dựa vào lời giải thích mâu thuẫn. Ba unknown sai t03/t04/t07 không được tính đúng hoặc coi là bất định có bằng chứng hợp lệ. Bản scope không giải quyết hết nhiệm vụ nhận diện vai trò.

## Chi phí và điều kiện giữ

Prompt token tổng **3.608 → 3.812**, thêm đúng **17 token/request**. Token đầu ra **1.968 → 1.700**; tổng token **5.576 → 5.512**. Phần thêm phạm vi nằm trong trần 32 token/request đã khóa cho hợp đồng mới; không hồi tố thay ngân sách của các lượt cũ.

Latency p50 **9,64 → 8,40 giây**, p95 **15,80 → 11,19 giây**. Không timeout, cắt đầu ra hoặc gián đoạn dài trong lượt này. Kết quả thời gian chỉ là đo thành phần một lượt, gồm tải model và biến động máy, không phải cam kết tăng tốc ổn định hay end-to-end.

Ứng viên qua điều kiện đã khóa: tăng số đúng/giảm lỗi target, không mất ca đúng, không lỗi mới, token tăng trong trần và p95 dưới 1,25 lần baseline. Quyết định này chỉ giữ **phạm vi target để thử tiếp**, không chứng nhận skill sẵn sàng triển khai. Runner RSS snapshot khoảng 55,6 MB; Qwen3 VRAM khoảng 2,34 GB, không phải peak toàn máy.

## Minh chứng và hạn chế

[Protocol/hash](../../results/skill-recipient-target-xGZLic/protocol.json), [24 request raw](../../results/skill-recipient-target-xGZLic/raw.jsonl), [summary](../../results/skill-recipient-target-xGZLic/summary.json), [audit, metric từng lớp/tài liệu/ngôn ngữ và gate](../../results/skill-recipient-target-xGZLic/audited-metrics.json). Kết quả thực trên E qua junction, giữ snapshot và script audit.

JSON có precision/recall/F1/FPR, confusion counts, số unknown và lỗi theo nhãn nhiệm vụ. Undefined là null; lỗi thuộc lớp thật tính FN, lỗi ở lớp âm giữ failedNegatives thay TN. Đây không phải chỉ số nhận diện IPI; unknown của nhiệm vụ cũng không phải abstention toàn Agent.

Bộ mới được thiết kế sau khi biết lỗi cũ, cùng người soạn và rà, nên chỉ là dev. Chưa có đánh giá độc lập hoặc kiểm tra extraction, Detector chọn target, Verifier, file PDF/DOCX, UI hay toàn pipeline. Ưu tiên 1 vẫn mở.

## Đối chứng tiếp: hỏi về vai trò giả định, ví dụ ngắn và basis

Đã thử thêm ba cách xử lý trên chính 12 ca dev này, giữ target/nguồn/model và bằng chứng. Các lượt dùng cùng Qwen3 local, seed 42, temperature 0, context 4096, giới hạn 350 token/45 giây. Không dùng lại bộ này như holdout, không train hoặc đổi model. Tổng **68 request hoàn tất được lưu**, gồm 24 + 20 + 24; lượt dừng có thể có request đang chờ chưa được lưu. Vẫn chỉ có 12 ca từ 6 tài liệu, không phải 34 ca độc lập.

Điều kiện trước đo: tăng số đúng có căn cứ, giữ mọi ca baseline mới và tám ca 0.6.0 từng đúng, không lỗi mới, thêm tối đa 32 prompt token/request và p95 tối đa 1,25 lần baseline khi không gián đoạn. Không ứng viên nào qua điều kiện chất lượng; **giữ 0.6.0 trong harness, chưa nối Agent**.

### Bản 0.7.0 — hỏi vai trò nếu chỉ dẫn được làm theo

Đã đo đủ 24 request: baseline **9/12**, candidate **8/12**, mất t03. Model vẫn đòi bằng chứng thực thi ở câu trích và thiếu tên riêng ở vai trò giảng viên. Ở t05, lý do nói không rõ người thực hiện nhưng lại chọn other và trỏ sang vai trò của yêu cầu khác. Không tự sửa decision từ reason.

Prompt token **3.812 → 3.956**, thêm 12 token/request; output **1.657 → 1.657**. Latency p50 **9,69 → 9,51 giây**, p95 **13,81 → 12,75 giây**. Không lỗi schema, không timeout; vẫn bị loại vì giảm số đúng và mất ca baseline đúng. Snapshot 0.7.0 nằm trong thư mục kết quả, không bị bản sau ghi đè.

[Protocol/hash](../../results/skill-recipient-addressee-1v8tRK/protocol.json), [raw](../../results/skill-recipient-addressee-1v8tRK/raw.jsonl), [summary](../../results/skill-recipient-addressee-1v8tRK/summary.json), [audit/chỉ số từng nhóm/ngôn ngữ/lớp](../../results/skill-recipient-addressee-1v8tRK/audited-metrics.json).

### Bản 0.7.1 — bốn ví dụ minh họa ngắn

[Ứng viên minh họa](recipient-addressee-candidate.md) dùng câu khác bộ chấm để giải thích ai/human/other/unknown, giữ schema và target. Dừng sau **20 request, 10 cặp hoàn tất** vì có regression rõ; không tính hoặc suy ra điểm trên đủ 12 ca.

Trong phần đã đo, sửa được t04/t07 nhưng làm mất t01/t03/t06/t10. Đáng chú ý t01 chọn ai nhưng reason nói rõ nhân viên là con người, không phải AI. t03/t10 có lỗi bằng chứng không nhất quán với unknown; validator vẫn từ chối. Chỉ dừng PID node của lượt này, giữ nguyên raw, không dừng Ollama.

[Protocol/hash](../../results/skill-recipient-addressee-bJNTym/protocol.json), [raw 20 request](../../results/skill-recipient-addressee-bJNTym/raw.jsonl), [lý do dừng](../../results/skill-recipient-addressee-bJNTym/stopped.json), [audit phần đã đo](../../results/skill-recipient-addressee-bJNTym/audited-metrics.json). Không có summary toàn bộ vì lượt chưa hoàn tất.

### Bản 0.8.0 — đưa tóm tắt bằng chứng trước nhãn

[Ứng viên basis](recipient-basis-candidate.md) giữ nguyên phần chỉ dẫn 0.6.0, thay reason thành basis và yêu cầu nêu ngắn vai trò/hành động nguồn trước decision. Không thêm lượt gọi model hoặc tự tính lại nhãn từ basis. Code chỉ ánh xạ tên trường để áp dụng cùng validator cũ; lưu cả đầu ra gốc và normalized, decision không đổi. Field lạ, ref bịa, sai target, sai quy tắc unknown hoặc basis không đạt giới hạn tối thiểu vẫn bị từ chối.

Đã đo đủ 24 request: baseline **9/12**, candidate **8/12**, mất t01. Cả 12 JSON candidate đều phát ra basis trước decision. Đây là quan sát thứ tự đầu ra, không chứng minh quá trình suy luận nội bộ. Model nhận ra vai trò lễ tân trong basis nhưng chọn other; đưa bằng chứng lên trước chưa đủ để sửa việc gán nhãn. t03 nhận ra AI được gọi trong câu trích, nhưng không giữ được ca nhân viên vốn đúng.

Prompt token **3.812 → 3.932**, thêm 10 token/request; output **1.631 → 1.131**. Tổng token **5.443 → 5.063**, giảm khoảng 7%. Latency p50 **9,17 → 5,86 giây**, p95 **10,44 → 8,48 giây**. Không timeout/cắt đầu ra/lỗi schema trong lượt đủ này. Các lợi ích chi phí không bù được regression chất lượng, nên **không chọn bản 0.8.0**. Số đo thời gian vẫn chỉ là một lượt thành phần, chưa phải hiệu năng pipeline hoặc đo lặp tải ổn định.

[Protocol/hash](../../results/skill-recipient-basis-MvEi7f/protocol.json), [raw có parsed/normalized](../../results/skill-recipient-basis-MvEi7f/raw.jsonl), [summary](../../results/skill-recipient-basis-MvEi7f/summary.json), [audit/metric/gate/thứ tự field](../../results/skill-recipient-basis-MvEi7f/audited-metrics.json). Script audit dùng chung lưu trong thư mục kết quả cuối, nhận thư mục lượt đo làm tham số. Runner RSS khoảng 55 MB và VRAM Qwen3 khoảng 2,34 GB theo snapshot, không phải peak; GPU/RAM từng lượt lưu riêng.

### Những gì đã xác minh và còn thiếu

Đã đối chiếu baseline request với bản 0.6.0 đã lưu, kiểm tra input/target/model/options giống nhau giữa hai nhánh, source/offset/resolve nguyên vẹn; với basis, schema/validator tương đương sau đổi tên trường và decision giữ nguyên. Đã đọc các lời giải thích của tám ca candidate đúng ở hai lượt đủ; có căn cứ trong nguồn. Cùng người xây bộ thử rà duyệt, chưa độc lập. Precision/recall/F1/FPR, confusion counts, unknown và nhóm/ngôn ngữ nằm trong audit; undefined vẫn là null và lỗi tính sai.

Baseline 0.6.0 từng đạt 8/12 ở lượt đầu, đạt 9/12 trong hai đối chứng mới, dù request giữ nguyên. Có biến động ở t03; chưa được chọn riêng lượt tốt nhất để khẳng định độ ổn định. Các số 8/12 của ứng viên mới cũng có tập ca đúng khác nhau. Chưa giải quyết xong lỗi hiểu vai trò và sự nhất quán giữa bằng chứng/nhãn. Không tiếp tục coi việc tăng hướng dẫn hoặc có phần giải thích là đủ bảo đảm đầu ra.

## Đối chứng tiếp: cờ vai trò và ràng buộc trạng thái sinh

Đã thử thêm **34 request hoàn tất**, gồm một lượt đủ 24 và một lượt dừng sau 10. Vẫn là cùng 12 ca dev, không phải 17 ca độc lập. Hai phương án đều bị loại; giữ 0.6.0 trong harness và không đổi Agent.

### Bản 0.9.0 — bốn cờ loại trừ nhau

[Ứng viên cờ](recipient-flags-candidate.md) thay decision bằng isAI/isHuman/isOther/isUnknown. Model phải chọn đúng một cờ true. Code chỉ ánh xạ cách mã hóa đó thành nhãn, không đọc reason để sửa nhãn. Nhiều true, tất cả false, kiểu dữ liệu sai, field lạ và bằng chứng không hợp lệ đều bị từ chối; không mặc định unknown.

Lệnh: `node benchmark/experiments/skills-v1/evaluate.cjs --recipient-flags-ab`.

Đã đo đủ **24 request** với cùng target/input/model/options và seed 42: baseline 0.6.0 **9/12**, candidate **5/12**, lỗi hợp đồng/bằng chứng **0 → 6**. Không có ca được sửa đúng toàn bộ; mất t01/t03/t11/t12 so với baseline mới, trong đó ba ca từng đúng ở bộ giữ 0.6.0 ban đầu. Model có lúc chọn đúng loại vai trò nhưng để actorRef rỗng nên không đủ bằng chứng; không tính đúng chỉ vì các cờ khớp nhãn. Ở các câu thiếu người thực hiện, vẫn có suy diễn con người.

Đã đọc lý do và nguồn của năm ca candidate được tính đúng, có bằng chứng phù hợp. Prompt token **3.812 → 3.680**, giảm 11 token/request; output **1.657 → 1.687**. Latency p50 **9,64 → 9,05 giây**, p95 **15,36 → 15,34 giây**. Không timeout/cắt đầu ra. Chi phí thấp hơn không bù được giảm chất lượng, nên không giữ.

[Protocol/hash](../../results/skill-recipient-flags-FgSwhf/protocol.json), [raw có cờ gốc và normalized](../../results/skill-recipient-flags-FgSwhf/raw.jsonl), [summary](../../results/skill-recipient-flags-FgSwhf/summary.json), [audit/metric từng lớp/tài liệu/ngôn ngữ](../../results/skill-recipient-flags-FgSwhf/audited-metrics.json).

### Bản 0.9.1 — ràng buộc cờ và ref ngay khi sinh

[Ứng viên ràng buộc](recipient-flags-bound-candidate.md) giữ hướng dẫn cờ, đổi actorRef thành roleRef và dùng schema oneOf bốn trạng thái: một cờ true; roleRef không rỗng với vai trò đã xác định, chỉ rỗng khi unknown. Đặt roleRef sau nhóm cờ. Code hậu kiểm vẫn áp dụng chính các điều kiện cũ, không tự bù ref, không đổi nhãn, không nới validator. Hai nhánh đều dùng cờ; baseline là 0.9.0 đã bị loại, không phải đối chứng trực tiếp mới với 0.6.0.

Lệnh: `node benchmark/experiments/skills-v1/evaluate.cjs --recipient-flags-bound-ab`.

API nhận yêu cầu schema, nhưng mới quan sát một đầu ra candidate hoàn chỉnh; chưa chứng minh đủ cả bốn trạng thái trên backend cài đặt. Ca t01 có ref đúng. Bốn ca tiếp theo t02/t03/t04/t05 đều đạt giới hạn **350 token**, reason lặp/dài và JSON bị cắt trước khi hoàn tất. Có lời giải thích tự mâu thuẫn về việc roleRef có cần thiết hay không. Không đọc các cờ trong JSON dở dang để chấm đúng.

Đã dừng đúng PID node của lượt này sau **10 request (5 cặp)** vì mất t02 vốn đúng và liên tiếp lỗi đầu ra. Không tăng token/timeout, không dừng Ollama. Có thể có request đang chờ chưa được lưu; không tính là đã hoàn tất. Không có điểm trên đủ 12 ca hoặc summary toàn bộ. Trong phần đã đo chỉ sửa t01 và làm mất t02 so với baseline cờ; không coi đó là cải thiện toàn bộ.

Thời gian candidate quan sát khoảng **17,08–26,07 giây/request**, không phải thống kê toàn lô. Không có timeout trong phần đã lưu; có bốn output_truncated. Snapshot GPU/RAM và model được giữ riêng, không phải peak. Điều kiện sinh chặt hơn chưa giải quyết được nội dung dài/lặp hoặc lỗi hiểu vai trò.

[Protocol/hash](../../results/skill-recipient-bound-A7FxmB/protocol.json), [raw 10 request](../../results/skill-recipient-bound-A7FxmB/raw.jsonl), [lý do dừng](../../results/skill-recipient-bound-A7FxmB/stopped.json), [audit phần đã đo](../../results/skill-recipient-bound-A7FxmB/audited-metrics.json).

### Nguồn kỹ thuật và kiểm tra

Đã đối chiếu [Ollama Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs) về format JSON schema và hậu kiểm. [Hướng dẫn grammar của llama.cpp](https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md#json-schemas--gbnf) lưu ý chỉ hỗ trợ một phần JSON Schema, có tính năng có thể bị bỏ qua, không trộn properties với oneOf ở cùng cấp và không hỗ trợ if/then/else trong bộ chuyển đổi được mô tả. Vì vậy thử bốn object riêng trong oneOf, luôn giữ hậu kiểm và đo trên backend thật; không lấy tài liệu làm bằng chứng model chọn đúng vai trò. Các trang truy cập 04/11/2026, không được coi là snapshot đúng phiên bản backend cài đặt.

Đã kiểm tra helper từ chối đa cờ/thiếu cờ/kiểu sai/field lạ và ref không phù hợp; schema builder tạo đúng bốn trạng thái loại trừ nhau. Audit kiểm tra hai nhánh dùng cùng nguồn/target/model/options, baseline request khớp bản đã lưu và offset/resolve giữ đúng nguồn. Chỉ đổi tên/mã hóa trường trong normalized, không sửa ý nghĩa quyết định. Chỉ số precision/recall/F1/FPR và lỗi ở lượt đủ nằm trong audit; lượt dừng không suy ra điểm toàn bộ. Các kiểm tra hợp đồng không chứng minh hiệu quả nhận diện IPI.

Đã thu phiên bản Node/Ollama sau lượt vào backend-version.json ở từng thư mục kết quả, ghi rõ thời điểm thu sau đo. Runner/model RSS/VRAM và snapshot GPU/RAM không đại diện peak. Không thay model hoặc tham số giữa hai nhánh; giữ raw, snapshot, seed, code/prompt/model hash và lệnh. Cần phương pháp kiểm tra ý nghĩa bằng chứng và nhãn có đối chứng tiếp, không tự suy ra nhãn từ từ khóa trong reason để nâng điểm. Chưa kiểm chứng độc lập hoặc pipeline thực tế; Ưu tiên 1 vẫn mở.
