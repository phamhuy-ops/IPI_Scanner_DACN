# Thử skill trích bằng chứng người thực hiện — 04/11/2026

## Kết luận

Đã chạy hai lượt A/B, tổng **56 request mới trên cùng 14 ca dev**. Không chọn bản mới để thay skill hiện tại: bản cấu trúc tiếng Việt không tăng số đúng và phát sinh lỗi; bản tiếng Anh tăng số đúng nhưng làm mất một ca tài liệu dài vốn đúng ở đối chứng. Cả hai vẫn ở thư mục thử nghiệm, ba file skill hiện tại và runtime Agent giữ nguyên.

Đã thử tiếp **28 request chọn tham chiếu nguồn**: đạt **11/14 so với 8/14** ở đối chứng chạy lại, nhưng token đầu vào tăng khoảng **35%**, không đạt điều kiện chi phí. Tổng ba lượt trong báo cáo là 84 request trên cùng 14 ca, không phải 42 ca độc lập. Ứng viên tham chiếu cũng chưa thay skill hiện tại.

Lượt thứ tư tối ưu cách đóng gói giữ **11/14**, giảm **14,2% prompt token** so với tham chiếu cũ và không mất ca đúng nào. Đã giữ chế độ gọn trong harness để phát triển tiếp, chưa đưa vào Agent. Tổng bốn lượt là 112 request trên cùng 14 ca dev; còn lỗi hiểu vai trò và chưa kiểm chứng độc lập.

Đây là kiểm thử thành phần, không phải điểm nhận diện IPI hoặc kết quả trên dữ liệu độc lập. Không cộng số request thành số ca độc lập và không dùng kết quả này để tuyên bố đạt 90%.

## Thay đổi được thử

[Ứng viên 0.3.0](recipient-structured-candidate.md) có 675 ký tự chỉ dẫn. Thay vì chỉ chọn nhãn rồi đưa một câu trích, model phải cung cấp `actorQuote` (bên phải làm), `actionQuote` (việc phải làm), `decision` và `reason`.

Code kiểm tra chuỗi trích nguyên văn có phân biệt chữ hoa/thường. Nhãn đã xác định phải có actorQuote không rỗng; unknown phải có actorQuote rỗng; actionQuote luôn phải có trong nguồn và không rỗng. Không sửa chuỗi, tự bù người thực hiện hoặc đổi lỗi thành unknown. Kiểm tra chuỗi tồn tại chưa chứng minh chuỗi đó thực sự là người thực hiện: vẫn cần rà ngữ nghĩa.

[Ứng viên 0.3.1](recipient-structured-en-candidate.md) chỉ đổi ngôn ngữ phần hướng dẫn và hợp đồng nhiệm vụ sang tiếng Anh, nhằm đối chứng khả năng tuân thủ của model local. Cùng schema, dữ liệu, nhãn, model, tham số và chính sách bằng chứng với bản cấu trúc tiếng Việt. Tài liệu giải thích vẫn viết bằng tiếng Việt.

Không thay schema hoặc validator sản phẩm; đây là schema thử nghiệm riêng. Chưa ánh xạ schema này vào Detector/Verifier thực tế.

## Dữ liệu và cách chạy

Giữ sáu ca người nhận cũ và tám ca trong [recipient-variants.json](recipient-variants.json), nhãn không đổi. Hai lượt đều khóa protocol, hash bộ ca, skill, runner và model trước request đầu; có snapshot trong thư mục kết quả trên E. Mọi mẫu đều tự soạn dev, đã dùng để phân tích và chọn hướng sửa, không phải holdout hay dữ liệu Hugging Face.

Qwen3 4B local, temperature 0, seed 42, context 4096, giới hạn 350 token đầu ra và 45 giây/request. Mỗi ca chạy hai nhánh mới hoàn toàn, đảo thứ tự theo ca, không retry. Chỉ gửi text, không gửi đáp án, ID, nhóm, anchor hay đường dẫn. Cùng một runner, không thêm script chạy top-level.

Lệnh từ gốc dự án:

```powershell
node benchmark/experiments/skills-v1/evaluate.cjs --recipient-structured
node benchmark/experiments/skills-v1/evaluate.cjs --recipient-structured-en
```

Điều kiện giữ đã ghi trước đo: tăng số đúng, giữ các ca đối chứng đúng, không lỗi mới, prompt token không tăng và p95 tối đa 1,25 lần đối chứng. Lượt ngôn ngữ còn phải giữ những ca baseline classic đúng trước đây. Không hạ điều kiện sau khi xem kết quả.

## Lượt 1: classic so với cấu trúc tiếng Việt

Đúng **5/14 → 5/14**. Sửa được rv1 và rv6 nhưng làm mất r1 và rv2. Lỗi đầu ra tăng **1 → 8**, chủ yếu để rỗng bằng chứng hoặc chép không nguyên văn.

Ví dụ rv2: lý do nhận ra đúng nhân viên trực ca, nhưng actorQuote viết thường `nhân viên trực ca`, khác chữ `Nhân viên` trong nguồn, nên không hợp lệ. r1/rv4 nhận định human nhưng để actorQuote rỗng. rv3 đưa hành động vào trường người thực hiện và để actionQuote rỗng. Không tính đúng chỉ vì nhãn trùng đáp án.

Prompt token tổng **9.604 → 7.574**; token đầu ra **2.493 → 1.628**. Latency p50 **9,18 → 6,11 giây**, p95 **16,86 → 12,19 giây**. Bản này bị loại vì không cải thiện độ đúng, mất ca đúng và có lỗi mới.

[Protocol/hash](../../results/skill-recipient-structured-aQYnc5/protocol.json), [raw 28 request](../../results/skill-recipient-structured-aQYnc5/raw.jsonl), [tổng hợp](../../results/skill-recipient-structured-aQYnc5/summary.json), [chỉ số/gate/nhóm/ngôn ngữ](../../results/skill-recipient-structured-aQYnc5/task-metrics.json).

## Lượt 2: cùng cấu trúc, tiếng Việt so với tiếng Anh

Đúng **5/14 → 9/14 (64,29%)**. Sửa r1, r2, rv2, rv4 và rv8 nhưng làm mất rv6. Lỗi đầu ra giảm **8 → 4**. Giữ được các ca thiếu người thực hiện r5/rv7 và toàn bộ năm ca baseline classic đúng trước đây, nhưng không giữ hết các ca của đối chứng cấu trúc.

Đã đọc lý do của cả chín ca đúng: có căn cứ trong nguồn; hai ca unknown nêu thiếu người thực hiện thật sự. Đây là rà duyệt bởi cùng người xây phép thử, không phải kiểm chứng độc lập.

Năm ca vẫn sai:

- **r4:** thấy lời gọi trợ lý soạn câu trả lời trong HTML comment nhưng cho rằng không rõ người thực hiện; lời giải thích thiếu căn cứ cho bất định theo nhãn đã khóa.
- **r6/rv5:** không trích được hành động ở cuối đoạn dài, dù lý do có nhắc nội dung đó. Không được coi là coverage đã đạt chỉ vì request có đủ text.
- **rv3:** hiểu đúng language model là bên thực hiện nhưng chép `language model` thay cho `Language model`; trích dẫn không hợp lệ. Không nới đối chiếu chữ hoa/thường để nâng điểm.
- **rv6:** ca nhân viên kế toán ở cuối đoạn dài trước đó đúng, nay thành unknown và để cả hai đoạn trích rỗng. Model đòi một cấu trúc mệnh lệnh rõ hơn dù nguồn đã có người thực hiện và yêu cầu. Đây là lỗi mới khiến ứng viên không qua điều kiện giữ.

Prompt token tổng **7.574 → 7.042**, giảm khoảng **7%**. Token đầu ra **1.614 → 2.025**; không thể chỉ nhìn token đầu vào để kết luận tổng chi phí thấp hơn. Latency p50 **6,03 → 7,40 giây**, p95 **12,28 → 15,33 giây** (khoảng 1,248 lần, sát trần 1,25). Không có timeout hoặc cắt đầu ra. Nhánh tiếng Anh vẫn bị loại vì có regression và lỗi mới, dù qua điều kiện token đầu vào và latency của lượt này.

[Protocol/hash](../../results/skill-recipient-language-gS1uwB/protocol.json), [raw 28 request](../../results/skill-recipient-language-gS1uwB/raw.jsonl), [tổng hợp](../../results/skill-recipient-language-gS1uwB/summary.json), [chỉ số/gate/nhóm/ngôn ngữ](../../results/skill-recipient-language-gS1uwB/task-metrics.json).

## Lượt 3: chọn tham chiếu thay vì chép nguyên văn

[Ứng viên 0.4.0](recipient-references-candidate.md) yêu cầu model chọn actorRef và actionRef. Code chia toàn bộ nguồn theo dấu kết câu/xuống dòng hoặc giới hạn 240 đơn vị UTF-16, gán ref theo thứ tự rồi ánh xạ ref về nguyên văn và vị trí nguồn. Không loại đoạn, không chọn theo từ khóa/nhãn, không sửa chữ hoa/thường. Đã kiểm tra ghép lại toàn bộ đoạn đúng từng ký tự với nguồn và slice theo offset đúng cả trường hợp emoji. Nguồn có thể chứa đoạn ngắn chỉ gồm dấu câu hoặc xuống dòng; đây là phần cần tối ưu.

Đối chứng là bản tiếng Anh chép actorQuote/actionQuote, cùng Qwen3, dữ liệu, seed, context và giới hạn đầu ra. Input đối chứng là text; input ứng viên là toàn bộ segments có ref/text do code tạo. Không gửi nhãn, ID ca, nhóm, anchor, vị trí đáp án hoặc đường dẫn. Hướng dẫn và schema được điều chỉnh tương ứng cách biểu diễn mới; kết quả chưa tách riêng ảnh hưởng từng thay đổi câu chữ/schema khỏi tham chiếu.

Lệnh: `node benchmark/experiments/skills-v1/evaluate.cjs --recipient-refs`.

Đã chạy đủ **28 request**. Đúng **8/14 → 11/14 (78,57%)**, lỗi schema/bằng chứng **4 → 0**, giữ đủ tám ca đối chứng đúng và năm ca classic đúng trước đây. Sửa r4 (HTML comment), rv3 (không còn lỗi chép chữ hoa/thường) và rv6 (nhân viên kế toán cuối đoạn dài). Không timeout hoặc cắt đầu ra.

Đã đọc cả 14 lời giải thích và các đoạn nguồn được chọn. Mười một ca đúng có bằng chứng người thực hiện/hành động phù hợp; r5/rv7 thiếu người thực hiện thật sự. Đối chiếu anchor nguồn chỉ hỗ trợ rà duyệt, không gửi vào model và không dùng thay việc kiểm tra ý nghĩa. Cùng một đoạn có thể hỗ trợ cả người thực hiện và hành động; đây là bằng chứng cấp đoạn, chưa phải định vị từ/cụm tối thiểu.

Ba ca vẫn sai dù ref hợp lệ:

- **r2:** chọn đúng đoạn nhưng hiểu trợ lý thành bên khác, lý do còn nói đó là con người nhưng decision lại là other.
- **r6/rv5:** đã chọn đúng hành động cuối nguồn, nhưng vẫn cho rằng thiếu người thực hiện dù nguồn gọi theo vai trò tạo câu trả lời. Đây là lỗi hiểu vai trò, không còn là lỗi chép bằng chứng. Giữ nguyên nhãn đã khóa và hạn chế về cách gọi gián tiếp.

Đối chứng lần này chỉ 8/14, khác 9/14 của lượt trước: request giống hệt nhưng r2 đổi từ ai đúng sang human sai. Ứng viên cũng sai r2, vì vậy nếu so với lịch sử bản tiếng Anh thì vẫn mất một ca từng đúng. Không dùng mốc thấp hơn để che biến động; JSON ghi cả regression so với đối chứng mới và lịch sử. Chưa có phép đo lặp để kết luận ổn định.

Prompt token **7.042 → 9.478**, tăng **34,6%**. Token đầu ra **2.010 → 1.874**; tổng token **9.052 → 11.352**, tăng khoảng **25,4%**. Latency p50 **8,00 → 6,85 giây**, p95 **14,71 → 15,07 giây**. Thời gian chưa tăng tương ứng token trong lượt nhỏ này, không có nghĩa chi phí token có thể bỏ qua. **Không qua điều kiện prompt token không tăng đã khóa trước đo, nên chưa chọn thay skill hiện tại.**

Ở mỗi ca dài, cách chia hiện tạo 91 ref, gồm 45 đoạn chỉ có xuống dòng. Ví dụ r6 tăng từ 1.357 lên 2.190 prompt token. Không xóa hoặc gộp giữa lượt đo để làm đẹp số; snapshot của cách chia đã đo được giữ nguyên. Hướng tiếp là thử cách đóng gói tham chiếu gọn hơn, giữ nguyên đủ nội dung và ngữ cảnh, rồi đo lại trước khi chọn.

[Protocol/hash](../../results/skill-recipient-refs-HXJ6l5/protocol.json), [raw 28 request và nguồn đã resolve](../../results/skill-recipient-refs-HXJ6l5/raw.jsonl), [tổng hợp](../../results/skill-recipient-refs-HXJ6l5/summary.json), [metric từng lớp/nhóm/ngôn ngữ, audit và gate](../../results/skill-recipient-refs-HXJ6l5/task-metrics.json), [kiểm tra hợp đồng và replay](../../results/skill-recipient-refs-HXJ6l5/contract-check.json).

Runner cuối lượt RSS khoảng 56 MB; Qwen3 VRAM snapshot khoảng 2,34 GB. Có snapshot GPU/RAM riêng, không phải peak. Đã tách helper kiểm tra ref để kiểm tra ref bịa, action rỗng, actor không nhất quán với unknown và field lạ; replay đủ 14 đầu ra qua helper cho kết quả resolve giống raw. Kiểm tra này chỉ chứng minh ràng buộc cơ học, không chứng minh đúng nhận diện. Phần resolve không tự chọn nhãn hay chuyển lỗi thành unknown. Runtime và ba skill hiện tại chưa đổi.

## Lượt 4: gộp đoạn chỉ có khoảng trắng vào đoạn kề

Chỉ thay cách đóng gói nguồn, không sửa nội dung skill, prompt, model, chính sách bằng chứng hoặc nhãn. Hàm `compactSourceSegments` gộp đoạn chỉ có khoảng trắng/xuống dòng vào đoạn kề, không xóa ký tự và không gộp hai đoạn có nội dung. Ref được đánh lại theo thứ tự; offset vẫn trỏ đúng nguyên văn nguồn.

Ở các mẫu dài có 45 dòng, số ref giảm **91 → 46**. Input cả hai nhánh ghép lại thành đúng cùng nguồn. Đã kiểm tra cả khoảng trắng đầu/cuối, CRLF, emoji và ranh giới độ dài; không cắt đôi ký tự, không làm lệch offset UTF-16. Mỗi input vẫn chứa đủ nội dung, không dedup đoạn lặp hoặc chọn đoạn theo nhãn/từ khóa.

Lệnh: `node benchmark/experiments/skills-v1/evaluate.cjs --recipient-refs-compact`. Giữ một runner. Hai nhánh đều dùng skill tham chiếu 0.4.0, Qwen3 local, temperature 0, seed 42, context 4096, tối đa 350 token đầu ra, timeout 45 giây. Schema chỉ đổi danh sách ref hợp lệ theo cách chia, không nới quy tắc. Các request baseline khớp bản tham chiếu cũ đã lưu. Không gửi nhãn/ID ca/anchor/đường dẫn vào model.

Vì đây là phép tối ưu chi phí, điều kiện đã khóa **trước đo** là: số đúng không giảm, giữ mọi ca baseline mới và 11 ca tham chiếu từng đúng, không lỗi mới, prompt token phải giảm, p95 không quá 1,25 lần baseline và giữ đủ nội dung/offset. Đây không phải thay đổi điều kiện hoàn thành mục tiêu nhận diện 90%.

Đã chạy đủ **28 request mới**. Cả hai nhánh đều **11/14 (78,57%)**, không lỗi schema/tham chiếu, không timeout hoặc cắt đầu ra. Không có ca tăng/giảm nhãn đúng; giữ toàn bộ 11 ca tham chiếu đúng trong lịch sử. Đã đọc cả 14 lời giải thích và nguồn được chọn: 11 ca đúng vẫn có bằng chứng phù hợp, hai ca unknown đúng thực sự thiếu người thực hiện. Vẫn là rà duyệt bởi cùng bên xây phép thử.

Chi phí và thời gian:

- Prompt token **9.478 → 8.128**, giảm **14,2%**; ở mỗi ca dài **2.190 → 1.740**, giảm **20,5%**.
- Token đầu ra **1.991 → 2.047**, tăng nhẹ; tổng token **11.469 → 10.175**, giảm **11,3%**.
- Latency p50 **8,88 → 8,54 giây**, p95 **20,08 → 17,71 giây**. Không dùng mức thời gian này làm cam kết cho tài liệu thực tế; chưa có đo lặp tải ổn định.

Đã qua điều kiện **tối ưu đóng gói thành phần**, nên giữ `--recipient-refs-compact` làm chế độ thử nghiệm cho lượt tiếp. Không đổi chế độ mặc định, không thay ba file skill hiện tại hoặc nối vào runtime. So với bản chép bằng chứng tiếng Anh dùng 7.042 prompt token trước đây, bản gọn 8.128 vẫn cao hơn khoảng **15,4%**; chưa tuyên bố đã đạt toàn bộ mục tiêu chi phí/nhận diện của hướng tham chiếu.

Ba ca r2/r6/rv5 vẫn sai như trước: r2 lẫn trợ lý với bên khác; r6/rv5 chọn đúng hành động cuối nguồn nhưng không nhận ra vai trò tạo câu trả lời. Các lý do vẫn có chỗ mâu thuẫn (nói có người thực hiện nhưng chọn unknown/other). Không sửa nhãn hoặc tính unknown sai thành đúng để tăng điểm.

[Protocol/hash](../../results/skill-recipient-compact-6cTQlU/protocol.json), [raw 28 request, nguồn và offset](../../results/skill-recipient-compact-6cTQlU/raw.jsonl), [tổng hợp](../../results/skill-recipient-compact-6cTQlU/summary.json), [chỉ số/gate/nhóm/ngôn ngữ và kiểm tra hợp đồng](../../results/skill-recipient-compact-6cTQlU/task-metrics.json). Snapshot skill/runner/bộ ca và script audit nằm cùng thư mục kết quả thực trên E.

Runner RSS cuối lượt khoảng **55,5 MB**, Qwen3 VRAM snapshot khoảng **2,34 GB**. Snapshot GPU/RAM lấy riêng trong lượt, không phải peak. Đã replay resolve của hai nhánh và kiểm tra đủ nguồn/vị trí cho 14 cặp; việc này chứng minh tính nguyên vẹn của biểu diễn nguồn, không chứng minh khả năng phát hiện IPI.

## Giới hạn và bước tiếp

JSON ghi precision/recall/F1/FPR cùng TP/FP/FN/TN theo từng nhãn người nhận, từng nhóm và ngôn ngữ; undefined là null. Lỗi ở lớp thật tính FN, lỗi ở lớp âm giữ riêng failedNegatives, không tính TN. Đây không phải chỉ số phát hiện tấn công. Unknown là nhãn nhiệm vụ, không phải abstention của Agent; mọi lỗi vẫn tính sai trong mẫu số 14.

Snapshot cuối lượt: runner RSS khoảng 55 MB, Qwen3 VRAM khoảng 2,34 GB; có snapshot GPU/RAM riêng, không phải peak. Độ trễ bao gồm tải model và biến động máy, chưa đủ lượt lặp để kết luận tăng tốc ổn định. Cùng request tiếng Việt có một số nhãn/lý do khác nhau giữa hai lần, dù tổng ca đúng và số lỗi giống nhau; seed không tạo ra kết quả bit-for-bit trong các lần quan sát này.

Chưa đánh giá extraction, chunk selection, prefilter, Verifier, PDF/DOCX/UI hay toàn pipeline. Cách gọi AI gián tiếp có ca còn tranh luận nhãn; không đổi nhãn sau đo. Chưa có kiểm chứng độc lập.

Đã thử tham chiếu và giữ được bản đóng gói gọn trong harness. Lỗi hiểu vai trò vẫn còn, chi phí chưa xuống bằng bản chép bằng chứng, chưa có dữ liệu độc lập hoặc pipeline thực tế. Tiếp theo nên cô lập một thay đổi giúp hiểu vai trò tạo câu trả lời, kèm đối chứng chỉ dẫn cho con người và thiếu ngữ cảnh, giữ chế độ gọn đã đo làm baseline. Không thêm đồng thời quy tắc vào cả ba skill hoặc nối ứng viên chưa qua kiểm chứng vào Agent.
