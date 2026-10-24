# Công việc quan trọng còn tồn đọng

Rà soát sau đợt nâng cấp rule thao túng câu trả lời. Đây là danh sách cần làm,
không phải các kết luận đã kiểm chứng bằng mô hình hoặc tài liệu ngoài thực tế.
Tuân theo AGENTS.md: lỗi rõ ràng → đối chứng → đánh giá độc lập → toàn pipeline.

## Cập nhật triển khai chính sách một vòng

Mục 1–2 bên dưới đã được xử lý ở mức code: ba kết luận, trạng thái xử lý riêng,
hồ sơ từng nghi vấn, JSON Schema khi sinh và validation/citation ở runtime.
Verifier vòng đầu không nhìn stance/lập luận của Detector; không còn ép fail
theo finding count. Các mô tả 1–2 được giữ làm lịch sử vấn đề ban đầu, không
còn là mô tả hành vi hiện tại. Xem [chinh-sach-phan-tich-mot-vong.md](../reports/chinh-sach-phan-tich-mot-vong.md) để biết hợp đồng mới.

Chất lượng nhận định model thật vẫn cần đo; pass unit test không chứng minh
hiệu quả phát hiện. Ưu tiên tiếp là đo một vòng và triển khai phản biện có giới
hạn cho các nghi vấn chưa giải quyết. Chưa chấm holdout MAlmasabi.

Đã đo tiếp baseline nhỏ 10 ca qua core pipeline bằng hai model thật, xem
[danh-gia-luong-xu-ly-mot-vong.md](../reports/danh-gia-luong-xu-ly-mot-vong.md): 5 needs_review, 3 ca tấn công bị kết luận chưa phát
hiện, 1 báo nhầm, 1 đạt kỳ vọng. Có mất injection trong HTML comment ở extraction
và lỗi quote tiếng Việt. Vì vậy ưu tiên hiện tại là sửa các vấn đề này và chất
lượng nhận định vòng một; chưa thêm phản biện ngay vì các ca đồng thuận sai/
mất dữ liệu không được chữa chỉ bằng phản biện khi bất đồng.

## Ưu tiên 1: chính sách kết luận và độ bao phủ

Cập nhật extraction HTML: đã giữ raw + phép chiếu text, ghi nguồn và cảnh báo
coverage; xem [kiem-chung-trich-xuat-html.md](../reports/kiem-chung-trich-xuat-html.md). Mô tả HTML loại comment ở mục 7 là
lỗi baseline đã sửa. Citation model và nhận định ngữ nghĩa vẫn là ưu tiên tiếp;
chưa triển khai phản biện và chưa kết luận cải thiện độ chính xác.

1. **Phân biệt tín hiệu prefilter với kết luận độc hại.**
   `src/ai/agents/document/verifierAgent.ts` chỉ cho pass khi model trả pass VÀ
   `initialFindingCount === 0`. Nghĩa là Verifier hiện không thể gỡ một cảnh báo
   nhầm của rule. `detectorAgent.ts` cũng nâng risk level chỉ từ finding count.
   Cần quyết định chính sách rõ: cảnh báo heuristic / AI xác nhận / chưa đủ
   bằng chứng; kiểm thử cả model đồng ý, bất đồng, lỗi và thiếu bằng chứng.
   Không tự bỏ chặn chỉ để giảm FPR; so sánh các chính sách trên cùng dữ liệu.

2. **Kiểm tra kiểu và schema phản hồi model ở runtime.**
   `slmClient.ts` parse JSON rồi cast kiểu; Detector dùng truthiness của
   `hasIndirectInjection`. JSON đúng cú pháp chưa đảm bảo boolean/enums/arrays
   đúng kiểu. Cần từ chối phản hồi thiếu/sai trường và thể hiện lỗi rõ ràng,
   có kiểm thử `"false"`, missing fields và verdict không hợp lệ.

3. **Đo đúng pipeline sản phẩm, không chỉ prompt benchmark riêng.**
   `scripts/run-ipi-benchmark.js` gọi hai model với prompt khác luồng sản phẩm,
   chỉ đọc smoke dataset; chưa tái hiện extraction/chunking/agent orchestration.
   Cần harness dùng cùng logic với ứng dụng, so sánh rule-only, Detector,
   Detector+Verifier trên cùng mẫu; lưu prompt/model version, failures, latency,
   RAM/VRAM và bằng chứng. Chạy smoke nhỏ trước, rồi mới mở rộng mô hình local.

4. **Đánh giá phần nội dung thực sự được AI xem.**
   Budget Balanced/Deep giới hạn 12/24 chunk, dùng chung cho phiên quét; Verifier
   còn cắt evidence theo số ký tự. Cần đo bỏ sót ở đầu/giữa/cuối tài liệu dài,
   nhiều file và khi chunk quan trọng vượt ngân sách. Không hiển thị “sạch toàn
   bộ tài liệu” nếu chưa xem đủ; kiểm thử trạng thái coverage limited.

## Ưu tiên 2: dữ liệu, tài liệu thật và các khoảng trống phát hiện

5. **Rà soát nhãn gây tranh cãi, không tự sửa theo output scanner.**
   Bản rule mới có 106 FP theo nhãn MAlmasabi dev. Một số ví dụ có câu
   “Group letters in your response in sets of three” dù nhãn benign. Cần người
   kiểm tra nội dung + user_intent theo tiêu chí viết trước; lưu nhãn gốc,
   nhận định và bất đồng riêng. Giữ nguyên số đo gốc trước khi có kết luận.

6. **Thêm bộ file thực tế và holdout độc lập.**
   NotInject/realistic hiện là development probes đã xem. MAlmasabi test có
   nhóm 7.282 mẫu (55,2%) và các nguồn có thể còn trùng ý dù lexical check = 0.
   Cần bộ đánh giá chưa dùng chọn rule/prompt, nguồn gốc rõ, Việt/Anh, mẫu sạch
   khó, tài liệu dài, cùng biến thể và định dạng TXT/HTML/PDF/DOCX. Tách nhóm
   tài liệu trước chia; chỉ chấm holdout sau khi khóa cấu hình. Chưa thể tuyên
   bố khả năng tổng quát hóa từ ba nguồn hiện có.

7. **Kiểm chứng extraction và những gì có thể bị loại bỏ.**
   HTML extractor loại tag/comment/script trước scan nên benchmark trực tiếp
   text HTML không tương đương quét file HTML. Cần fixture để quyết định scan
   raw/rendered content và giải thích coverage. Kiểm tra PDF ảnh/OCR, DOCX
   bảng/chú thích và khả năng hỗ trợ `.doc` thực tế; không coi mọi định dạng
   khai báo là đã được kiểm chứng. Không thay đổi extraction chỉ theo một mẫu.

8. **Mở rộng phát hiện theo hành vi, có đối chứng đa nguồn.**
   Response corruption/link insertion mới tăng recall dev lên 20,13% nhưng
   realistic strict IPI vẫn chỉ 1/7, nên chưa chứng minh cải thiện trên nguồn
   khác. Các khoảng trống cần đánh giá tiếp: exfiltration diễn đạt khác,
   lạm dụng tool, thao túng chấm điểm, câu hỏi lệch nhiệm vụ, inline/multiline,
   phủ định/trích dẫn. Không bắt toàn bộ câu mệnh lệnh, URL hoặc import mạng.
   Kết hợp kiểm thử semantic thay vì cố giải quyết tất cả bằng regex.

## Ưu tiên 3: kiểm chứng tự động và bàn giao

9. **Đưa kiểm thử công cụ benchmark/dữ liệu vào CI phù hợp.**
   `npm test`/Vitest chưa chạy các test `.cjs` và Python. Hiện các kiểm tra đó
   chạy riêng. Cần job test bằng fixture nhỏ trong repo, pin dependency audit,
   không yêu cầu tải toàn bộ raw gated datasets hoặc chạy Ollama trong CI cơ bản.
   Giữ baseline, manifests, nguồn/license, lệnh tái lập; rà soát file lớn, output
   và Python cache trước commit. Chưa tạo PR hoặc kiểm tra bản portable Windows.
   Build hiện thành công nhưng còn cảnh báo Vite về alias customResolver và
   output.freeze; cần xử lý riêng để tránh lỗi khi nâng phiên bản công cụ.

## Đề xuất công việc kế tiếp

Đã [cấu hình lưu trữ huấn luyện trên E](../guides/luu-tru-huan-luyen-tren-o-e.md),
giữ code trên C: Python 3.12.15/venv, cache/temp và output mới trên E; Ollama
đã dùng E từ trước, kiểm tra hash/nạp model đạt, không có bản cũ C để xóa.
Disk đã đạt ngân sách khi dùng launcher E. Thư viện ML, renderer dữ liệu và
smoke backward vẫn chưa hoàn tất; bước dữ liệu 30 mẫu vẫn theo kế hoạch.

Đã chốt [kế hoạch pilot cho một Verifier](ke-hoach-thu-fine-tuning-verifier.md)
và [kiểm tra môi trường](../reports/kiem-tra-moi-truong-huan-luyen-verifier.md).
Base là Qwen2.5-1.5B-Instruct đúng commit, đích referenced-v1/compact-v1;
chưa huấn luyện hoặc thay mặc định. Bước tiếp: mở rộng batch dữ liệu có
finding đúng/sai và batch không finding, rà soát/nhóm nguồn; đồng thời chuẩn
bị đường lưu và venv riêng. GPU 4 GB chưa được thử backward, Python hiện tại
thiếu thư viện và disk chưa đạt ngân sách dự án. Cần renderer/mask audit và
smoke trước train; không dùng bộ20 để train hoặc làm test cuối.

Đã chuẩn bị 20 nhãn nháp do AI đề xuất, nguồn đầy đủ và phiếu người rà soát;
xem [hướng dẫn gán nhãn](../guides/huong-dan-gan-nhan-ngu-canh.md) và
[báo cáo chuẩn bị](../reports/chuan-bi-bo-nhan-chi-dan-va-ngu-canh.md).
Đã hoàn tất rà soát cùng người dùng: 19 chấp nhận, 1 sửa, không còn pending;
xem [tổng kết](../../benchmark/data/annotations/ngu-canh-v1/tong-ket-ra-soat.md).
Đây là xác nhận có xem đề xuất AI, không phải gán nhãn độc lập/mù. Bước tiếp
là chốt phạm vi pilot cho một model, nguồn được dùng lại, mở rộng dữ liệu và
giữ nhóm/tập kiểm chứng độc lập. Chưa train, chia tập hoặc thay agent. Các
cập nhật phía dưới là lịch sử.

Đã đo Qwen2.5-1.5B-Instruct so với bản Coder qua 48 request; xem
[báo cáo ứng viên Verifier](../reports/danh-gia-model-thay-the-verifier.md).
Recognition bắt 4/5 thay vì 1/5, nhưng còn một báo nhầm và một bỏ sót;
context chỉ 4/12 nhất quán, gồm một mẫu không chấm nhị phân, và có false
clear. Chưa thay Verifier hoặc thêm phản biện. Bước tiếp đề xuất: chuẩn bị
bộ chú thích nhỏ về chỉ dẫn/ngữ cảnh có đối chứng được kiểm tra thủ công,
nhằm chuẩn bị thử fine-tuning một model; giữ dữ liệu độc lập cho kiểm chứng
cuối. Các đoạn phía dưới là lịch sử mốc đo.

Đã thử làm rõ nghĩa stance qua 72 request; xem
[báo cáo stance](../reports/thu-nghiem-lam-ro-nghia-stance.md). Gemma tăng nhất
quán 5→7/12 nhưng tạo false clear mới ở realistic; Qwen 1→0/12 trong baseline
chạy cùng lượt. Ứng viên không đạt nên không tích hợp hoặc đo pipeline tiếp.
Ưu tiên đề xuất: đo model ứng viên thay thế Verifier với cùng giới hạn tài
nguyên; nếu fine-tune thì thử một model, với nhãn ngữ cảnh được kiểm tra và
holdout độc lập. Không thêm phản biện hoặc nới validator. Các đoạn dưới là
lịch sử mốc đo, không phải yêu cầu tiếp tục áp dụng prompt đã trượt cổng.

Đã đo riêng 48 lượt nhận diện/gán ngữ cảnh của hai model; xem
[báo cáo từng model](../reports/do-nhan-dien-ipi-va-gan-ngu-canh-tung-model.md).
Gemma phân loại trực tiếp bắt 5/5 tấn công nhưng báo nhầm 3/6 sạch; Qwen bắt
1/5. Context nhất quán chỉ 5/12 và 0/12. Bước tiếp: thử làm rõ nghĩa stance
trong một ứng viên nhỏ, kiểm tra thiên lệch enum/trường với đối chứng trước
khi đo lại pipeline. Không tự sửa stance từ reason, không nới validator và
chưa thêm phản biện. Các cập nhật phía dưới là lịch sử mốc đo trước.

Đã thử rút gọn JSON Verifier: bỏ analysis tự do, reason 20–240 ký tự, giữ các
kiểm tra nguồn/nhận định. Trên hai bộ đo, JSON Verifier hoàn chỉnh tăng 6/14
lên 14/14 nhưng validation đầy đủ vẫn 6/14; hai ca exfiltration cùng bỏ sót
chưa đổi. Xem [báo cáo JSON](../reports/rut-gon-json-verifier-va-do-lai-ca-bo-sot.md).
Ưu tiên tiếp là đo riêng nhận định IPI và sự nhất quán stance/ngữ cảnh của từng
model, giữ đối chứng đa nguồn; chưa bật rút gọn mặc định hay thêm phản biện.

Cập nhật tham chiếu nguồn: đã triển khai thử nghiệm `referenced-v1` để model
chọn mã đoạn thay vì tự chép văn bản. Xem
[phép đo mã nguồn](../reports/danh-gia-tham-chieu-bang-ma-nguon.md). Controls có
7/13 phản hồi hợp lệ nhưng vẫn bỏ sót tấn công và chưa đạt cổng phản biện.
Tiếp tục đo chất lượng nhận định, lỗi JSON và mức độ nhất quán của từng vai
trò; không tự bật mặc định chỉ vì lỗi chép trích dẫn đã giảm.

Đã đo xong cả ba bộ. Ưu tiên tiếp: rút gọn/giới hạn JSON Verifier và đo riêng
so với hiện tại (các lỗi Verifier đã thấy đều dừng vì `length`), đồng thời giữ
ca cả hai model cùng bỏ sót để đánh giá ngữ nghĩa. Chi tiết trong báo cáo mã
nguồn; chưa bật vòng lặp phản biện và chưa đổi cấu hình mặc định.

Cập nhật 2026-10-24: đã triển khai hợp đồng `structured-v1` ở chế độ thử nghiệm,
gồm người nhận chỉ dẫn, framing, chuyển hướng, directive và ngữ cảnh trích nguồn.
Xem [phép đo có cấu trúc](../reports/danh-gia-nhan-dinh-co-cau-truc.md). Chưa tự
bật mặc định hoặc thêm vòng phản biện chỉ vì schema/unit test đã qua.

Kết quả cấu hình cuối: 26/26 ca lỗi phản hồi ở Detector, nên tiếp tục giữ
`classic-v1`. Ưu tiên kế tiếp là tham chiếu đoạn nguồn bằng mã thay vì yêu cầu
model tự chép lại directive/ngữ cảnh, rồi đo lại tính hợp lệ và chất lượng nhận
định. Không giảm validation để làm tăng tỷ lệ hoàn tất.

Đã thử prompt làm rõ directive/ngữ cảnh và bổ sung controls Việt/Anh với cổng
đo tự động. Controls trung tính chưa đạt: xem
[thử nghiệm ngữ cảnh](../reports/thu-nghiem-chi-dan-va-ngu-canh.md) và
[tiêu chí phản biện](tieu-chi-them-vong-phan-bien.md). Không xem thêm lời giải thích trong
prompt là một cải thiện nếu số đo không xác nhận. Ưu tiên thử hợp đồng nhận định
có cấu trúc (người nhận chỉ dẫn, directive, deviation, framing) và đối chiếu với
nguyên văn, rồi đo cùng controls/dev; vẫn cần nguồn độc lập trước kết luận rộng.

Cập nhật mới: đã bổ sung ánh xạ citation chỉ khác layout và replay phản hồi
baseline; xem [báo cáo citation](../reports/anh-xa-trich-dan-ve-nguon.md).
Không tự sửa quote thêm lời giải thích. Bước tiếp cần tập trung vào nhận định
ngữ nghĩa sai: yêu cầu chỉ ra directive và hành vi bị chuyển hướng, có đối chứng
tài liệu sạch đa nguồn, rồi đo lại pipeline trước khi thêm phản biện.

Chính sách và schema vòng một đã được triển khai. Ưu tiên đo chất lượng vòng
một bằng harness đúng core pipeline trên bộ đối chứng nhỏ đa nguồn và file
thực tế (mục 3–4, 6–7), gồm tỷ lệ unresolved và tính đúng của bằng chứng. Smoke
model thật hiện còn bất đồng; chưa chứng minh độ chính xác. Sau đó triển khai
phản biện tối đa 3 vòng tổng cộng cho unresolved và so sánh một vòng/nhiều vòng.
Có thể rà soát nhãn dev bằng quy trình ghi nhận độc lập. Chưa fine-tune trước
khi có baseline pipeline đáng tin cậy và nguồn đánh giá phù hợp.
