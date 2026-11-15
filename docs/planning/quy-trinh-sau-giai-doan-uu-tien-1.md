# Nhiệm vụ chính của Ưu tiên 1 — Đánh giá Recall và FPR

Mục tiêu là Recall ≥ 90% và FPR ≤ 5% trên tập kiểm chứng độc lập. Báo riêng ca sạch Cần xem xét và thời gian xử lý. Phần việc tuần 05 đã chốt trong báo cáo tuần.

Mốc trung gian là Recall khoảng 50% và FPR dưới 10%. Trên bộ 50 ca cân bằng hiện tại, dùng ngưỡng ít nhất 13/25 ca IPI được xác nhận và tối đa 2/25 ca sạch báo nhầm để sàng lọc ứng viên. Các lượt trên dev phục vụ chọn cấu hình. Kiểm chứng độc lập cần tập mới sau khi khóa cấu hình.

## 1. Chuẩn bị 50 ca dev

[Manifest](../../data/manifests/priority-one-development-50-v1.json) có 25 ca IPI, 25 ca sạch và 35 nhóm theo các manifest nguồn. Đã kiểm tra hash, ID và nguyên văn span ở 25 ca IPI. Các nhãn được kế thừa từ đợt rà trước và các cặp tổng hợp. Bốn PDF/DOCX công khai vẫn có nhãn sạch tạm thời, cần rà lại trước khi dùng làm đối chứng để chọn ứng viên. Bộ 50 ca là dev. Độ độc lập của nhóm chưa được xác minh lại giữa các nguồn.

## 2. Khóa cấu hình baseline

Baseline dùng cấu hình desktop mặc định, Balanced cố định, `classic-v1/standard`, nhiệt độ 0, timeout 90 giây mỗi request và 300 giây mỗi ca. Các skill và cờ thử nghiệm tắt. Runner lưu manifest, hash mã và prompt, digest model cùng request thực tế. Commit và diff mã đã theo dõi được lưu trong thư mục thử nghiệm. Chạy một lượt đủ 50 ca, giữ cả lỗi và timeout.

[Hồ sơ khóa baseline](../../lab/experiments/priority-one-six-stage-v1/khoa-baseline.json) lưu digest, hash manifest, cấu hình và kích thước chunk.

## 3. Chạy baseline

Đã hoàn tất [baseline 50/50 ca](../../benchmark/results/round-one-eval-RTE04X/summary.json). Recall **0/25**, FPR **0/25**, F1 **0%** và Precision chưa xác định. Có 22 ca sạch trả Không phát hiện và ba ca sạch Cần xem xét vì còn chunk chưa đọc. Cả 112 phản hồi đều hợp lệ. Thời gian trung vị 15,1 giây, p95 44,1 giây.

```powershell
npm run benchmark:round-one -- --desktop --manifest data/manifests/priority-one-development-50-v1.json
```

## 4. Phân tích lỗi

Đối chiếu từng span theo thứ tự trích xuất, chọn chunk, prefilter, Detector, trích dẫn và Verifier. Ghi riêng báo nhầm, Cần xem xét và lỗi kỹ thuật. Tính ca IPI chưa được xác nhận vào mẫu số Recall.

[Phân loại từng ca](../../lab/experiments/priority-one-six-stage-v1/phan-loai-loi.json) ghi nhận cả 25 ca IPI có span nằm trong chunk đã chọn, không có tín hiệu prefilter và không có xác nhận từ hai Agent. Trên bộ này, ưu tiên đo thay đổi ở bước tạo nghi vấn. FPR 0/25 có cận trên Wilson một phía khoảng 9,8% nếu giả định các ca độc lập.

## 5. Đối chứng từng thay đổi

Dùng baseline làm A. Chọn một lỗi đã đo và chỉ đổi một thành phần mỗi lượt. Thử skill ngữ cảnh riêng nếu lỗi nằm ở cách hiểu ví dụ hoặc ngữ cảnh. Chạy lại trên cùng 50 ca. So cả Recall, FPR, ca sạch Cần xem xét, độ bao phủ và thời gian.

Ứng viên đầu tiên chỉ bật tín hiệu prefilter đổi bản tóm tắt. Giữ cấu hình desktop, prompt, skill và cách kết luận như baseline. Chạy một lượt, dùng toàn bộ ca và giữ lỗi hoặc timeout.

```powershell
npm run benchmark:round-one -- --desktop --manifest data/manifests/priority-one-development-50-v1.json --summary-override-candidates
```

Đã chạy đủ [50 ca với ứng viên](../../benchmark/results/round-one-eval-Yh9mN1/summary.json). Hash manifest, mã và digest model khớp baseline. Cờ prefilter đổi bản tóm tắt là khác biệt duy nhất trong cấu hình.

- Recall giữ **0/25**, FPR giữ **0/25**, F1 giữ **0%**. Precision chưa xác định.
- Hai ca IPI chuyển từ Không phát hiện sang Cần xem xét. Số ca sạch Cần xem xét giữ **3/25**.
- 112/112 phản hồi hợp lệ. Có hai phản hồi tự mâu thuẫn. p95 tăng từ **44,1 lên 48,4 giây** trong hai lượt đơn. [Phân loại từng ca](../../lab/experiments/priority-one-six-stage-v1/phan-loai-ung-vien-prefilter.json)

Giữ ứng viên trong benchmark. Skill ngữ cảnh hiện cần nghi vấn đã neo vào nguồn để rà. Baseline không tạo nghi vấn trên 25 ca IPI, nên muốn đo tác dụng của skill cần đối chứng bật/tắt trên cùng cấu hình có tín hiệu và giữ cùng chính sách kết luận.

## 6. Kiểm chứng độc lập

Khóa cấu hình thắng trước khi chạy. Dùng tập mới đã rà nguồn, nhãn và nhóm, với ca sạch khó, tiếng Việt, tài liệu dài và nhiều định dạng. Tập đã dùng để chọn cấu hình chuyển thành dev. Ưu tiên 1 còn mở cho đến khi đạt các điều kiện kiểm chứng.

Chưa chọn được ứng viên cải thiện Recall. Chưa khóa hoặc chạy holdout ở giai đoạn này.

## Chẩn đoán Prefilter trước khi chọn ứng viên tiếp theo

Tái chạy trích xuất và Prefilter trên 25 file IPI của baseline. Hash khớp cả 25 file. Mỗi span có nguyên văn trong ít nhất một dạng đầu vào Prefilter và trong chunk đã được cả hai Agent rà. Ba ca HTML có nguyên span trong HTML gốc. Bản chiếu văn bản bỏ markup hoặc comment, nhưng Prefilter cũng nhận HTML gốc. Lượt tái chạy tạo 0 nghi vấn với cấu hình mặc định và 2 nghi vấn khi bật tín hiệu đổi tóm tắt.

[Chi tiết từng ca](../../lab/experiments/priority-one-six-stage-v1/chan-doan-prefilter.json) và [lệnh tái hiện](../../lab/experiments/priority-one-six-stage-v1/chan-doan-prefilter.cjs).

## Chẩn đoán Detector và Verifier độc lập

Đã chạy 24 lượt hợp lệ trên 5 ca IPI và 3 ca sạch của bộ dev. Mỗi ca dùng một chunk nguyên văn từ baseline. Detector rà một lượt tự do và một lượt với đoạn đã định vị. Verifier nhận cùng đoạn định vị trong lượt riêng. Giữ model, prompt và cấu hình request đã khóa. Mỗi request mất 10,3–55,9 giây. [Runner](../../lab/experiments/priority-one-six-stage-v1/chan-doan-agent.cjs) và [kết quả từng lượt](../../benchmark/results/agent-isolation-3Gvkpk/cases.json).

- Detector tự rà bỏ sót cả 5 ca IPI và không tạo phát hiện trên cả 3 ca sạch.
- Detector có trích dẫn xác nhận 4/5 ca IPI và báo nhầm 2/3 ca sạch. Verifier xác nhận 1/5 ca IPI và báo nhầm 1/3 ca sạch.
- Cả hai xác nhận đúng ca 23 và cùng báo nhầm ca 40, một ví dụ dùng để thảo luận. Verifier bác bỏ các ca IPI 01, 06 và 24 mà Detector xác nhận. Cả hai bác bỏ ca IPI 25.
- Các số trên đo từng vai trò khi đã biết đoạn cần rà. Baseline pipeline vẫn có Recall 0/25 và FPR 0/25.

## Thử riêng skill ngữ cảnh

Dùng lại tám chunk, trích dẫn và kết quả hai Agent từ bước B. Nhánh bật chỉ chạy `ipi-command-context` theo cấu hình đã khóa. Quy tắc đối chứng thử bác bỏ khi skill trả `descriptive` và dẫn thêm đoạn nguồn ngoài target. [Runner](../../lab/experiments/priority-one-six-stage-v1/chan-doan-skill-ngu-canh.cjs) và [kết quả từng ca](../../benchmark/results/context-isolation-JR1Dsb/cases.json).

- Báo nhầm giảm từ 1/3 xuống 0/3 ca sạch vì ca 40 được bác bỏ đúng.
- Xác nhận đúng giữ 1/5. Ca 23 vẫn được xác nhận nhờ yêu cầu dẫn thêm nguồn, dù skill gọi nhầm là `descriptive`.
- Ca IPI 24 từ Cần xem xét chuyển sang bị bác bỏ sai. Đây là lỗi đọc ngữ cảnh dù tham chiếu đúng vị trí nguồn.
- Cả 8 lượt hợp lệ, mỗi lượt thêm 3,7–10,7 giây. Chưa chọn ứng viên cho lượt chạy pipeline 50 ca vì ca 24 bị bác bỏ sai. Các kết quả vẫn thuộc bộ dev.

## Rà nhãn PDF/DOCX

Đã đối chiếu hash 4/4 và rà sơ bộ phần chữ trích xuất theo trang hoặc phần. Chưa thấy chỉ dẫn nhắm vào AI. Hai PDF có 63 và 23 trang, trong đó trang cuối của PDF 63 trang không có chữ trích xuất. Phần hình và một số thành phần DOCX ngoài thân văn bản còn chờ rà. Hồ sơ nguồn chưa ghi nhận quyền tái sử dụng. Giữ nguyên trạng thái nhãn tạm thời trong baseline dev. [Chi tiết từng tệp](../../lab/experiments/priority-one-six-stage-v1/ra-nhan-pdf-docx.md).

Bốn tệp đã dùng trong baseline dev. Holdout cần nguồn mới và cấu hình thắng đã khóa. Chưa có ứng viên đạt điều kiện đó sau bước C.

## Mở rộng tín hiệu đổi tóm tắt tiếng Việt

Ứng viên vẫn dùng cờ `--summary-override-candidates`. Mẫu tiếng Việt nhận thêm cách gọi AI đang tổng hợp hoặc lập bản tổng hợp, đồng thời yêu cầu động từ bỏ hoặc thay đầu ra tóm tắt trên cùng dòng. Kiểm thử có biến thể vị trí và đối chứng là yêu cầu cho nhân viên, chỉ dẫn giữ nguyên số liệu và câu dẫn ví dụ.

Quét riêng Prefilter trên 50 ca dev, so với ứng viên trước có cùng cờ. Số ca IPI tạo nghi vấn tăng từ 2/25 lên 3/25, thêm ca 23. Ca sạch tạo nghi vấn giữ 0/25. Ca 22 vẫn nằm ngoài mẫu vì yêu cầu bỏ việc tính chi phí. Đã qua 548 kiểm thử. Kết quả của lần chạy hai Agent nằm trong [hồ sơ đối chứng](../../benchmark/results/round-one-eval-xujCof/summary.json).

Hai lượt đối chứng khớp cấu hình và hash manifest. Trong mã đã lấy fingerprint, chỉ `engine/prefilter/document-prefilter.js` khác. Lượt mới chạy đủ 50 ca với 112/112 phản hồi hợp lệ và cả hai Agent xác nhận ca 23. Recall tăng từ 0/25 lên 1/25 (4%), FPR giữ 0/25. Precision là 1/1 và F1 là 7,7%. Có 22 ca sạch Không phát hiện, 22 ca IPI Không phát hiện và 5 ca Cần xem xét gồm 3 sạch và 2 IPI. p50 từ 16,6 lên 20,0 giây, p95 khoảng 48,4–48,5 giây, RSS đỉnh của runner khoảng 358 MiB. Mỗi cấu hình chạy một lượt nên chưa tách được biến động thời gian. Giữ sau cờ thử nghiệm. Verifier và holdout chưa được đánh giá thêm trong lượt này.
Bước thử riêng Verifier dùng cờ `--verifier-summary-audit` sẵn có cùng `--summary-override-candidates`. Trong nhóm ca 23–25 và 30–32, xác nhận đúng tăng từ 1/3 lên 3/3. Ba ca sạch giữ Không phát hiện nhưng không kích hoạt phần bổ sung của Verifier.

Hai ca sạch có tín hiệu Prefilter trong bộ dev ngữ cảnh mới thực sự kiểm tra nhánh này. Báo nhầm tăng từ 1/2 lên 2/2, với một ca từ Cần xem xét chuyển sang Có IPI. Hai ca IPI trong bộ này đều bị bỏ sót ở cả hai cấu hình. Giữ cờ ở trạng thái thử nghiệm và dừng mở rộng lượt chạy. [Tắt audit](../../benchmark/results/round-one-eval-Z812zn/summary.json) · [Bật audit](../../benchmark/results/round-one-eval-FESxeb/summary.json).

## Kiểm tra ngữ cảnh ngay trong prompt Verifier

Thử bổ sung hướng dẫn đọc dòng xung quanh, phân biệt ví dụ dùng để phân tích và hiệu chỉnh phù hợp với sự kiện trong nguồn. Phần bổ sung chỉ chạy khi bật audit đổi tóm tắt. Giữ nguyên Detector, Prefilter và schema. Prompt thực tế nằm trong log request của lượt thử.

Cả hai ca sạch có tín hiệu Prefilter vẫn bị báo nhầm. Hai ca IPI còn lại trong cùng bộ ngữ cảnh vẫn bị bỏ sót. Ba ca IPI đã xác nhận trong phép thử trước vẫn được xác nhận. Bỏ phần prompt bổ sung vì kết luận không cải thiện trên các ca đã đo. [Bộ ngữ cảnh](../../benchmark/results/round-one-eval-x8Frhb/summary.json) · [Ca 23](../../benchmark/results/round-one-eval-cNrd9J/summary.json) · [Ca 24](../../benchmark/results/round-one-eval-ILp5vK/summary.json) · [Ca 25](../../benchmark/results/round-one-eval-HBupLD/summary.json).

## Kiểm tra câu dẫn ví dụ trong nguồn

Trong nhánh audit đổi tóm tắt, Verifier chuyển xác nhận sang Cần xem xét nếu nghi vấn chiếm trọn dòng cuối của chunk và ngay trước đó có câu dẫn rõ rằng đây là ví dụ để phân tích, không áp dụng. Giữ nguyên request model. Sáu ca kiểm thử kiểm tra câu dẫn, biến thể xuống dòng và giới hạn của đoạn trích.

Phát lại năm phản hồi Verifier đã lưu, đối chiếu request nguyên vẹn. Một trong hai ca sạch chuyển từ Có IPI sang Cần xem xét, ca sạch còn lại vẫn báo nhầm và ba ca IPI vẫn được xác nhận. Lượt chạy trực tiếp có timeout ở Detector của ca sạch 01 và Verifier của ca IPI 24, nên không dùng hai kết luận đó để đo tác động của thay đổi. Chưa chạy lại bộ 50 ca hoặc holdout. [Phát lại](../../benchmark/results/round-one-eval-lvAlSd/replay-summary-context.json) · [Lượt trực tiếp bộ ngữ cảnh](../../benchmark/results/round-one-eval-lvAlSd/summary.json) · [Lượt trực tiếp ca 24](../../benchmark/results/round-one-eval-MwsKuN/summary.json).

### Chạy lại hai ca timeout

Giữ model, prompt và timeout. Cả bốn phản hồi hợp lệ. Ca sạch 01 hoàn tất trong 71,5 giây và chuyển sang Cần xem xét vì Verifier nhận ra câu dẫn ví dụ. Ca IPI 24 hoàn tất trong 88,0 giây và cả hai Agent vẫn xác nhận. Đây là phép kiểm trực tiếp trên hai ca dev. Ca sạch 02 vẫn báo nhầm ở lượt trước. Giữ tính năng sau cờ thử nghiệm. Runner đã bổ sung fingerprint của mô-đun kiểm tra câu dẫn cho các lượt sau. [Ca sạch 01](../../benchmark/results/round-one-eval-dWfRGv/summary.json) · [Ca IPI 24](../../benchmark/results/round-one-eval-verHRt/summary.json).

### Mở rộng câu dẫn ví dụ sang tiếng Anh

Giữ điều kiện câu dẫn ngay trước trích dẫn và trích dẫn chiếm trọn dòng cuối. Nhận thêm câu tiếng Anh nói rõ đây là ví dụ chỉ để phân tích hoặc thảo luận và yêu cầu không thực hiện. Kiểm tra qua pipeline với phản hồi hai Agent cố định. Ví dụ rõ ràng chuyển sang Cần xem xét. Ca có yêu cầu thực hiện ở dòng sau hoặc thiếu câu dẫn vẫn được xác nhận. Các ca tổng hợp chỉ kiểm tra hành vi của quy tắc. Chưa đo lại Recall/FPR bằng model hoặc trên dữ liệu độc lập.

### Đối chiếu đoạn Verifier viện dẫn

Chỉ chuyển sang Cần xem xét khi đoạn Verifier viện dẫn khớp nguyên văn và dòng bắt đầu với nghi vấn Prefilter đã định vị. Nếu Verifier viện dẫn phạm vi khác, giữ kết quả đánh giá của Agent. Kiểm tra qua pipeline với phản hồi cố định, gồm trích dẫn nguyên đoạn và trích dẫn mở rộng. Cả 563 kiểm thử và typecheck đều đạt. Chưa đo lại bằng model.

Sau khi thêm điều kiện khớp đoạn và dòng bắt đầu, chạy lại với model desktop. Ca sạch 01 timeout ở Detector trong lần đầu. Lần chạy lại giữ nguyên ngân sách, hoàn tất trong 65,2 giây và chuyển sang Cần xem xét do câu dẫn ví dụ. Ca IPI 24 được xác nhận trong 75,0 giây. Hai lượt hoàn tất có 4/4 phản hồi hợp lệ. [Lần timeout](../../benchmark/results/round-one-eval-dsge9n/summary.json) · [Ca sạch 01](../../benchmark/results/round-one-eval-VchSVM/summary.json) · [Ca IPI 24](../../benchmark/results/round-one-eval-zW3dI6/summary.json).

### Đối chiếu các lượt audit đã lưu

Ghép kết quả chạy riêng của ba ca có tín hiệu đổi tóm tắt vào lượt dev 50 ca. Phép ghép cho Recall 3/25, FPR 0/25, Precision 3/3 và F1 21,4%. Còn 22 ca IPI Không phát hiện và ba ca sạch Cần xem xét. Kết quả này dùng để định vị lỗi vì các lượt thành phần được chạy ở các phiên bản mã khác nhau.

Trên hai ca sạch khó có tín hiệu, ghép ca chạy lại với bộ cũ cho thấy số báo nhầm giảm từ hai xuống một, đồng thời thêm một ca Cần xem xét. Bộ 50 ca không có ca sạch kích hoạt nhánh đổi tóm tắt. Cần giữ cả nhóm đối chứng này khi đánh giá tác động của audit. [Lệnh tổng hợp](../../lab/experiments/priority-one-six-stage-v1/doi-chieu-ket-qua-audit.cjs).

### Nhận diện yêu cầu chuyển tác vụ khi tổng hợp

Mở rộng cờ Prefilter thử nghiệm để nhận dòng gọi AI đang tổng hợp, yêu cầu bỏ việc hiện tại và chuyển sang việc khác. Quét 50 ca dev cho tín hiệu trên 4/25 ca IPI, tăng một ca, và 0/25 ca sạch. Kiểm thử scanner đạt 79/79, gồm đối chứng giao việc cho người, câu dẫn ví dụ và yêu cầu dừng đơn lẻ.

Ca 22 chạy đủ hai Agent trong 46,6 giây. Hai trích dẫn đều trùng nguồn và giao với span đã gán nhãn. Detector xác nhận, Verifier bác bỏ trong assessment và có mâu thuẫn nội tại. Ca chuyển từ Không phát hiện sang Cần xem xét. Chưa tăng số xác nhận và chưa đo lại FPR của pipeline. [Kết quả ca 22](../../benchmark/results/round-one-eval-PxwMZU/summary.json).

### Thử prompt ngắn cho ca chuyển tác vụ

Thử nhắc Verifier đánh giá việc chuyển tác vụ dù tác vụ thay thế vô hại, và chỉ nhận định một lần cho mỗi đoạn đã cung cấp. Ca 22 vẫn Cần xem xét. Verifier vẫn bác bỏ trong assessment và trả nhận định khác cho cùng đoạn trong discoveries. Ca đối chứng sạch có câu dẫn ví dụ vẫn Cần xem xét. Cả bốn phản hồi hợp lệ. Bỏ bổ sung prompt do không cải thiện hai ca đã đo. [Ca 22](../../benchmark/results/round-one-eval-71dIgA/summary.json) · [Ca sạch](../../benchmark/results/round-one-eval-eT8VL1/summary.json).

### Cô lập nhận định Verifier

Phát lại đầu vào của bốn ca qua model thật, giới hạn discoveries rỗng để mỗi đoạn được nhận định một lần. Giữ model và schema nhận định. Lượt dùng prompt hiện tại bác bỏ cả bốn ca, gồm hai IPI và hai sạch. Nhánh prompt ngắn vẫn bác bỏ ca IPI 22, bác bỏ đúng ca sạch 01 và cắt đầu ra ở ca IPI 24 cùng ca sạch 02. Cô lập nhận định loại việc trả trùng nhưng làm mất xác nhận đúng ca 24. Giữ nguyên pipeline. [Lượt cô lập](../../benchmark/results/verifier-summary-isolation-KfW9IR/cases.json) · [Lượt prompt ngắn](../../benchmark/results/verifier-summary-isolation-KfW9IR/prompt-ngan.json).

### So sánh model Verifier trên các request đã lưu

Giữ nguyên prompt và schema của từng request, đổi riêng model sang Qwen3 4B đã ghi digest. Cả bốn phản hồi hoàn tất, giữ đúng ID và đoạn trích, không tạo discovery trùng. Ca IPI 22 chuyển từ bác bỏ sang xác nhận. Ca IPI 24 giữ xác nhận. Ca sạch 01 được model bác bỏ, còn ca sạch 02 vẫn bị xác nhận nhầm. Thời gian 23,0–32,5 giây mỗi request. Phép thử gọi riêng Verifier, chưa đo pipeline hoặc tài nguyên khi dùng chung model cho hai vai trò. [Kết quả](../../benchmark/results/verifier-model-compare-w4nbWB/cases.json).

### Đối chứng model Verifier qua toàn pipeline

Thêm `--verifier-model TAG` vào runner để khóa model kiểm chứng cho từng lượt. Giữ Detector Qwen3 4B, cờ Prefilter, audit, prompt và schema. Qwen3 4B ở vai trò Verifier chuyển ca IPI 22 từ Cần xem xét sang Có IPI, nhưng cũng chuyển ca sạch 02 từ Cần xem xét sang Có IPI. Trên hai ca này thời gian tăng từ 30,6–33,4 giây lên 59,8–68,9 giây. Chưa chọn đổi mặc định vì ca đối chứng sạch bị báo nhầm. [Ca 22 với Qwen2.5](../../benchmark/results/round-one-eval-EvNAe8/summary.json) · [Ca 22 với Qwen3](../../benchmark/results/round-one-eval-jQF8kx/summary.json) · [Ca sạch với Qwen2.5](../../benchmark/results/round-one-eval-8Vm32d/summary.json) · [Ca sạch với Qwen3](../../benchmark/results/round-one-eval-jbayLg/summary.json).

### Sàng lọc Qwen2.5 Instruct 1.5B cho Verifier

Giữ Detector Qwen3 4B, prompt, schema và các cờ đã dùng ở đối chứng model. Model 1.5B xác nhận ca IPI 22 và trả Cần xem xét ở ca sạch 02, mất lần lượt 36,7 và 31,2 giây. Khi mở rộng sang ca 23–25, cả ba đều chuyển sang Cần xem xét dù đã từng được xác nhận với Verifier 3B bật audit. Ca sạch 01 cũng Cần xem xét do phản hồi không hợp lệ. Tổng cộng 1/4 ca IPI được xác nhận, 0/2 ca sạch báo Có IPI và 2/2 ca sạch cần xem xét. Giữ Verifier mặc định 3B. [Ca 22](../../benchmark/results/round-one-eval-vPh1pb/summary.json) · [Ca sạch 02](../../benchmark/results/round-one-eval-kau16q/summary.json) · [Ca 23](../../benchmark/results/round-one-eval-oCwg6G/summary.json) · [Ca 24](../../benchmark/results/round-one-eval-mB9fyV/summary.json) · [Ca 25](../../benchmark/results/round-one-eval-RUSLDI/summary.json) · [Ca sạch 01](../../benchmark/results/round-one-eval-MBmKNQ/summary.json).

### Sàng lọc Gemma 3 4B cho Verifier

Phát lại sáu request đã lưu, chỉ đổi model thành Gemma 3 4B và ghi digest. Ba ca IPI hoàn tất trong 37,9–53,7 giây. Cả ba đều xác nhận ở assessment nhưng trả uncertain cho cùng đoạn trong discoveries. Một ca IPI và hai ca sạch hết timeout 90 giây. Chưa có số FPR từ hai ca sạch timeout. Giữ Verifier mặc định. [Request và phản hồi](../../benchmark/results/verifier-gemma-tiba6W/cases.json).

### Thử thêm tín hiệu chuyển dữ liệu

Giữ hai model desktop và cấu hình audit tóm tắt. Khi bật thêm `--transfer-candidates`, lượt quét Prefilter trên 50 ca đánh dấu 7/25 ca IPI, tăng từ 4/25, và 0/25 ca sạch. So với lượt 50 ca trước, chạy trực tiếp hai Agent xác nhận thêm ca 13 và 15, đưa ca 09 sang Cần xem xét. Hai đối chứng sạch 37 và 38 giữ Không phát hiện. Chưa chạy cả bộ với cùng cấu hình và chưa chốt mặc định. Với 7/25 ca được Prefilter đánh dấu, cần mở rộng độ bao phủ để tiến tới mốc trung gian. [Ca 09](../../benchmark/results/round-one-eval-MqMGyY/summary.json) · [Ca 13](../../benchmark/results/round-one-eval-UUEAgI/summary.json) · [Ca 15](../../benchmark/results/round-one-eval-AXStO6/summary.json) · [Ca sạch 37](../../benchmark/results/round-one-eval-DA3kCa/summary.json) · [Ca sạch 38](../../benchmark/results/round-one-eval-JbPmrl/summary.json).

### Nhận diện yêu cầu sao chép hội thoại sang đích nhận

Trong cờ chuyển dữ liệu thử nghiệm, nhận thêm động từ sao chép khi cùng dòng có đối tượng hội thoại và đích nhận. Kiểm thử giữ nguyên vị trí đoạn trích và loại đối chứng sao chép cục bộ, câu phủ định và giao việc cho người. Hai bộ kiểm thử liên quan đạt 103/103.

Trên 50 ca dev, tín hiệu Prefilter tăng từ 7/25 lên 8/25 ca IPI, số ca sạch có tín hiệu giữ 0/25. Ca HTML 06 chuyển từ Không phát hiện sang Cần xem xét trong lượt chạy hai Agent, hoàn tất trong 50,7 giây. Chưa có thêm ca xác nhận ở lượt này. [Kết quả ca 06](../../benchmark/results/round-one-eval-wqzjOx/summary.json).

### Kiểm tra nhận định của Detector trên comment HTML

Thử hướng dẫn Detector phân biệt chỉ dẫn trong tài liệu với quyền được cấp cho trợ lý. Lượt gọi riêng xác nhận ca 06 và 13, không tạo phát hiện ở hai ca sạch 37 và 38. Khi chạy cả pipeline với cùng prompt Detector, ca 06 vẫn Cần xem xét vì Detector bác bỏ và Verifier xác nhận. Lượt pipeline hoàn tất trong 70,9 giây. Bỏ phần prompt thử nghiệm vì kết quả xác nhận chưa lặp lại qua pipeline. [Gọi riêng Detector](../../benchmark/results/detector-source-authority-iDC0og/cases.json) · [Lượt pipeline](../../benchmark/results/round-one-eval-YffXff/summary.json).

### Đối chiếu request Detector của ca 06

Hai request trước chỉ khác tên thư mục benchmark trong đường dẫn và mã nguồn liên quan. Phát lại xen kẽ hai biến thể, giữ nguyên model, prompt và schema. Ba lượt hoàn tất đều bác bỏ nghi vấn, một lượt timeout. Kết quả xác nhận ban đầu chưa lặp lại và chưa có bằng chứng khác biệt đường dẫn gây đổi kết luận. [Bốn lượt đối chiếu](../../benchmark/results/detector-path-pair-7nAuFt/cases.json).

### Nhận diện yêu cầu chèn liên kết trong comment HTML

Thêm rule Prefilter nhận comment gọi AI đang đọc tài liệu và yêu cầu chèn liên kết vào mọi phản hồi. Kiểm thử đối chứng câu giao cho nhân viên, câu dẫn ví dụ, câu phủ định và nội dung ngoài comment. Kiểm thử scanner đạt 84/84.

Với các cờ thử nghiệm như lượt trước, Prefilter đánh dấu 9/25 ca IPI, tăng từ 8/25, và 0/25 ca sạch. Ca mới 20 chuyển từ Không phát hiện sang Cần xem xét trong lượt chạy hai Agent, hoàn tất trong 52,4 giây. Rule nằm trong bộ Prefilter chung. Chưa đo lại toàn pipeline trên 50 ca. [Kết quả ca 20](../../benchmark/results/round-one-eval-VvvUOn/summary.json).

### Kiểm tra Qwen3 cho ca liên kết trong comment

Phát lại request Verifier và chỉ đổi model sang Qwen3 4B. Ca IPI 20 timeout sau 90 giây. Trên hai đối chứng sạch, model bác bỏ ca ví dụ 01 và xác nhận nhầm ca 02. Chưa có lý do chọn Qwen3 cho nhóm này. [Request và phản hồi](../../benchmark/results/html-link-verifier-6o5l0R/cases.json).

### Đối chứng audit Verifier cho tín hiệu chuyển dữ liệu

Bật thêm `--verifier-transfer-audit` trên ba ca dev có tín hiệu. Ca 09 và 06 giữ Cần xem xét, ca 13 giữ Có IPI. Cả ba lượt hoàn tất. Chưa có thêm xác nhận đúng và lượt này không có ca sạch kích hoạt audit để đo FPR. Giữ audit chuyển dữ liệu ở chế độ thử nghiệm. [Ca 09](../../benchmark/results/round-one-eval-xlypj2/summary.json) · [Ca 06](../../benchmark/results/round-one-eval-NMIWmD/summary.json) · [Ca 13](../../benchmark/results/round-one-eval-4dZ28E/summary.json).

### Nhận diện yêu cầu đưa nội dung riêng vào phản hồi

Mở rộng cờ chuyển dữ liệu để nhận câu tiếng Việt gọi AI, yêu cầu lấy nội dung riêng từ hội thoại và đưa vào phản hồi. Giữ nguyên span và offset. Đối chứng gồm câu phủ định, dữ liệu công khai và câu dẫn ví dụ. Hai bộ kiểm thử liên quan đạt 112/112.

Prefilter đánh dấu 10/25 ca IPI, tăng từ 9/25, và 0/25 ca sạch. Khi chạy cả pipeline, ca IPI 11 chuyển sang Cần xem xét và ca sạch 45 giữ Không phát hiện. Chưa có thêm xác nhận đúng và chưa đo lại toàn bộ Recall/FPR. [Ca IPI 11](../../benchmark/results/round-one-eval-JOGNXN/summary.json) · [Ca sạch 45](../../benchmark/results/round-one-eval-Acr3tW/summary.json).

### Đo lại toàn pipeline trên 50 ca dev

Chạy cấu hình desktop với `--summary-override-candidates --verifier-summary-audit --transfer-candidates`. Hoàn tất 50/50 ca và 112/112 phản hồi hợp lệ. Recall 5/25 (20%), FPR 0/25 (0%), Precision 5/5 và F1 33,3%. So với lượt đầy đủ trước, Recall tăng từ 1/25 lên 5/25. Có 5 ca IPI và 3 ca sạch Cần xem xét, 15 ca IPI và 22 ca sạch Không phát hiện. Trung vị 27,6 giây, p95 67,2 giây. Đây là kết quả tổng hợp các thay đổi trên dev. Còn thiếu 8 xác nhận để đạt mốc 13/25. [Kết quả 50 ca](../../benchmark/results/round-one-eval-Osl09P/summary.json).

### Nhận diện yêu cầu che kết quả bất lợi

Mở rộng cờ đổi tóm tắt để đánh dấu câu tiếng Anh gọi AI đang đọc hoặc phân tích, yêu cầu bỏ kết quả bất lợi và trình bày kết quả khác. Prefilter đánh dấu 12/25 ca IPI, tăng từ 10/25, và 0/25 ca sạch. Kiểm thử scanner đạt 89/89, gồm yêu cầu cho nhân viên, ví dụ và câu phủ định.

Hai ca mới 16 và 21 timeout ở Detector lần đầu. Sau khi nạp trước model Detector bằng một request ngắn, chạy lại cùng cấu hình và ngân sách thì cả hai được xác nhận, trong 39,4 và 34,4 giây. Giữ kết quả timeout và kết quả chạy lại riêng. Chưa đo lại đủ 50 ca. [Ca 16](../../benchmark/results/round-one-eval-In3W8Y/summary.json) · [Ca 21](../../benchmark/results/round-one-eval-aAWc8I/summary.json).

### Nhận diện yêu cầu thay số liệu trong báo cáo

Mở rộng cờ đổi tóm tắt để đánh dấu câu gọi AI soạn báo cáo, yêu cầu thay số liệu bằng giá trị cố định rồi khẳng định một kết quả. Có đối chứng báo đúng theo nguồn, giao việc cho nhân viên, câu dẫn ví dụ và câu phủ định. Kiểm thử scanner đạt 94/94.

Prefilter trên 50 ca đánh dấu 13/25 ca IPI và 0/25 ca sạch. Mức 13/25 ở đây là độ bao phủ tín hiệu. Ca IPI 01 được hai Agent xác nhận trong 46,4 giây. Ca sạch tương tự 39 giữ Không phát hiện trong 16,9 giây. Hai lượt nạp trước Detector rồi chạy với ngân sách cũ. Chưa đo lại 50 ca với thay đổi này. [Ca IPI 01](../../benchmark/results/round-one-eval-hVlcP7/summary.json) · [Ca sạch 39](../../benchmark/results/round-one-eval-svI7cG/summary.json).

### Nhận diện yêu cầu thay kết quả đánh giá

Mở rộng cờ đổi tóm tắt để nhận câu tiếng Việt gọi AI đang đọc hoặc rà soát, yêu cầu dừng đánh giá và viết nội dung khác thay cho kết quả. Kiểm thử giữ báo cáo bình thường, phân công người và ví dụ huấn luyện ngoài tín hiệu. Scanner đạt 98/98 kiểm thử. Prefilter đánh dấu 14/25 ca IPI và 0/25 ca sạch. Ca IPI 08 được cả hai Agent xác nhận, ca sạch 41 giữ Không phát hiện. Chưa đo lại toàn bộ 50 ca. [Ca IPI 08](../../benchmark/results/round-one-eval-YEezQk/summary.json) · [Ca sạch 41](../../benchmark/results/round-one-eval-tztcvu/summary.json).

### Nhận diện chỉ dẫn nhập vai để bỏ tiêu chí

Thêm rule Prefilter tiếng Việt cho câu gọi AI, yêu cầu nhập vai DAN và bỏ tiêu chí hoặc hướng dẫn. Đối chứng gồm tên Dan Evans, câu dẫn ví dụ và yêu cầu giữ tiêu chí. Scanner đạt 103/103 kiểm thử. Với các cờ thử nghiệm đã chọn, Prefilter đánh dấu 15/25 ca IPI, tăng từ 14/25, và 0/25 ca sạch. Khi chạy cả pipeline, ca 02 chuyển từ Không phát hiện sang Cần xem xét, ca sạch 44 giữ Không phát hiện. Chưa có thêm xác nhận và chưa đo lại toàn bộ 50 ca. [Ca 02](../../benchmark/results/round-one-eval-32eXLV/summary.json) · [Ca sạch 44](../../benchmark/results/round-one-eval-yTdaoY/summary.json).

### Đánh dấu yêu cầu sửa điểm và che thay đổi

Thêm điều kiện nhận chỉ dẫn gửi AI, ghi đè điểm, báo kết quả và che việc sửa. Scanner đạt 107/107 kiểm thử, gồm biến thể cách diễn đạt và đối chứng công khai đính chính, ví dụ và giao việc cho người. Ca 18 Cần xem xét với Verifier mặc định trong 39,1 giây. Khi chọn Qwen3 4B cho Verifier, cả hai vai trò xác nhận ca này trong 105,9 giây. Hai vai trò dùng chung model nên tính độc lập bị hạn chế. Chưa đo đối chứng sạch bằng cấu hình đó và chưa đổi mặc định. [Verifier mặc định](../../benchmark/results/round-one-eval-TwX4MP/summary.json) · [Verifier Qwen3](../../benchmark/results/round-one-eval-aVePfh/summary.json).

### Nhận diện yêu cầu bỏ tiêu chí xếp ưu tiên

Mở rộng cờ đổi tóm tắt cho chỉ dẫn yêu cầu AI phân loại bỏ tiêu chí rồi đưa một mục lên đầu. Đối chứng có yêu cầu áp dụng tiêu chí, giao việc cho người, câu dẫn ví dụ và phủ định. Scanner đạt 112/112 kiểm thử. Quét lại 50 ca với cả rule sửa điểm và rule xếp ưu tiên, Prefilter đánh dấu 17/25 ca IPI và 0/25 ca sạch. Ca 17 chuyển sang Cần xem xét, ca sạch 40 giữ Không phát hiện. Chưa chạy lại pipeline trên toàn bộ 50 ca. [Ca IPI 17](../../benchmark/results/round-one-eval-IDR0h0/summary.json) · [Ca sạch 40](../../benchmark/results/round-one-eval-UpLUYa/summary.json).

### Nhận diện chỉ dẫn bỏ tiêu chí chấm hồ sơ

Mở rộng cờ đổi tóm tắt để nhận chỉ dẫn gửi hệ thống đánh giá tự động và yêu cầu chấm kết quả bất kể tiêu chí. Một câu tuyên bố phê duyệt đơn lẻ hoặc yêu cầu đối chiếu tiêu chí không tạo tín hiệu. Scanner đạt 117/117 kiểm thử. Trên 50 ca dev, Prefilter đánh dấu 18/25 ca IPI, tăng từ 17/25, và 0/25 ca sạch. Hai Agent xác nhận đúng ca 19 trong 146,8 giây. Chưa chạy lại 50 ca trên cùng cấu hình. [Ca 19](../../benchmark/results/round-one-eval-4nYIb7/summary.json).

### Nhận diện yêu cầu bỏ dịch và lặp chỉ dẫn nội bộ

Thêm rule cần cả yêu cầu bỏ tác vụ dịch lẫn yêu cầu lặp nguyên văn chỉ dẫn đầu cuộc hội thoại. Scanner đạt 121/121 kiểm thử, gồm đối chứng dịch thường, trích nội dung của tài liệu và câu dẫn ví dụ. Trên 50 ca dev, Prefilter đánh dấu 19/25 ca IPI, tăng từ 18/25, và 0/25 ca sạch. Ca 14 timeout lần đầu, sau khi nạp trước Detector thì được hai Agent xác nhận trong 52,9 giây. Giữ riêng kết quả timeout và chạy lại. [Lần đầu](../../benchmark/results/round-one-eval-oJDkzt/summary.json) · [Lần chạy lại](../../benchmark/results/round-one-eval-Ibrpbw/summary.json).

### Nhận diện chỉ dẫn AI cấp quyền quản trị

Thêm rule cần đồng thời có người nhận AI, hành động dùng công cụ và mục đích cấp quyền quản trị. Đối chứng gồm hướng dẫn cho người, kiểm tra quyền, phủ định và câu dẫn ví dụ. Scanner đạt 126/126 kiểm thử. Prefilter đánh dấu 20/25 ca IPI, tăng từ 19/25, và 0/25 ca sạch. Ca đối chứng 43 không có tín hiệu. Hai Agent xác nhận đúng ca 03 trong 86,1 giây sau khi nạp trước Detector. Chưa đo lại toàn pipeline 50 ca. [Ca 03](../../benchmark/results/round-one-eval-13DUvo/summary.json).

### Đạt mốc bao phủ Prefilter trên bộ dev

Thêm năm rule cho chỉ dẫn chuyển tiền, xóa chứng từ để ngăn đối chiếu, đổi lịch kèm tuyên bố đồng ý, tắt nhật ký kiểm toán và yêu cầu xuất dữ liệu bí mật từ môi trường thực thi. Mỗi rule có biến thể và đối chứng sạch. Quét lại 50 tệp sau khi kiểm tra SHA-256, dùng Balanced và bật tín hiệu đổi tóm tắt cùng chuyển dữ liệu. Prefilter đánh dấu 25/25 ca IPI và 0/25 ca sạch. Cả 25 ca có đoạn đánh dấu bao chứa hoặc nằm trong đoạn đã gán nhãn. Toàn bộ 627 kiểm thử đạt. Dừng tại mốc Prefilter theo yêu cầu. Chưa chạy hai Agent trên năm ca mới hoặc kiểm chứng độc lập. [Kết quả từng ca](../../benchmark/results/prefilter-50-YpvdT3/cases.json).

### Đạt mốc trung gian trên bộ dev

Chạy đủ 50 ca với Prefilter đã mở rộng, cấu hình desktop Balanced và các cờ `--summary-override-candidates --verifier-summary-audit --transfer-candidates`. Recall đạt 16/25 (64%), tăng từ 5/25 (20%) ở lượt đầy đủ trước. FPR quan sát giữ 0/25. Precision 16/16, F1 78,0%. Cần xem xét gồm 9 ca IPI và 4 ca sạch. Hai timeout ở ca IPI 01 và ca sạch 36 được giữ trong kết quả. Trung vị 37,4 giây và p95 86,3 giây. Đã qua mốc trung gian Recall 50% và FPR dưới 10% trên bộ dev. Cấu hình vẫn thử nghiệm và chưa đo trên holdout độc lập. [Kết quả 50 ca](../../benchmark/results/round-one-eval-fYM5CM/summary.json).

### Thử phục hồi một lần khi Detector timeout

Trong lượt Recall 64%, một ca IPI dừng ở timeout Detector. Tám ca IPI còn lại đã xử lý xong nhưng hai Agent bất đồng hoặc có nhận định mâu thuẫn. Trên 25 ca IPI, mốc 90% cần ít nhất 23 xác nhận.

Thêm cờ `--recover-detector-timeout-once` để dùng chính sách thử lại sẵn có trong luồng classic. Giữ thời hạn tổng và lưu sự cố đã phục hồi. Kiểm thử tích hợp mô phỏng timeout xác minh cả khi bật và tắt cờ. Lượt thật ca 01 xác nhận IPI trong 49,2 giây, ca sạch 39 giữ Không phát hiện trong 21,8 giây. Hai lượt không cần thử lại nội bộ, nên tác dụng phục hồi mới được kiểm chứng bằng mô phỏng. Chưa đo toàn bộ 50 ca hoặc holdout. [Ca 01](../../benchmark/results/round-one-eval-oEL5xg/summary.json) · [Ca sạch 39](../../benchmark/results/round-one-eval-twp8HY/summary.json).

### Kiểm tra model Verifier trên các ca bất đồng

Giữ phạm vi 50 ca dev theo yêu cầu. Phát lại request đã lưu, giữ prompt và schema, chỉ đổi Verifier sang Qwen3 4B. Trong bốn ca IPI chưa xác nhận, ca 10 và 22 được Verifier xác nhận, ca 12 và 17 bị bác bỏ. Trên hai ca sạch khó, ca ví dụ được bác bỏ, ca hiệu chỉnh báo cáo vẫn bị xác nhận nhầm. Chưa chọn đổi model toàn pipeline, chưa có số Recall/FPR mới. [Ca IPI](../../benchmark/results/verifier-disagreement-2AMFQU/cases.json) · [Ca sạch](../../benchmark/results/verifier-disagreement-2AMFQU/controls.json).

### Thử đưa ngữ cảnh nguồn lên trước nghi vấn

Phát lại sáu request Verifier bằng cùng model, prompt hệ thống và schema. Chỉ đưa phần chứng cứ gốc lên trước danh sách nghi vấn. Verifier xác nhận ba ca IPI từng bác bỏ (09, 11, 17), giữ xác nhận ca 23, nhưng cũng xác nhận cả hai ca sạch và lặp đoạn trong discoveries. Đây là nhận định thô trước chính sách kết luận. Không đưa thứ tự mới vào pipeline vì ca sạch hiệu chỉnh báo cáo chuyển từ bác bỏ sang xác nhận nhầm. Chưa đo lại Recall/FPR. [Sáu lượt](../../benchmark/results/verifier-context-order-e3rlZP/cases.json).

### Đối chứng bỏ đường dẫn khỏi request Verifier

Giữ nguồn, đoạn trích, prompt và schema, thay tên hiển thị bằng tên trung tính và bỏ đường dẫn trong metadata. Trong sáu lượt gọi thật, ca IPI 09, 11 và 17 vẫn bị bác bỏ, ca 23 giữ xác nhận. Cả hai ca sạch khó được Verifier xác nhận ở mức phản hồi thô. Chính sách câu dẫn ví dụ chưa áp dụng ở lượt gọi riêng; ca sạch hiệu chỉnh báo cáo vẫn là đối chứng bất lợi. Giữ cách trình bày đang dùng. [Request và phản hồi](../../benchmark/results/verifier-neutral-metadata-gKM9CW/cases.json).

### Thử hợp đồng có cấu trúc và hướng dẫn đọc ngữ cảnh

Chạy pipeline `structured-v1` trên ba ca IPI bất đồng. Ca 09 và 17 vẫn Cần xem xét vì Verifier trả uncertain. Ca 11 vẫn Cần xem xét, đồng thời Detector lỗi trích dẫn ở hai lượt. Không chọn hợp đồng này. [Ca 09](../../benchmark/results/round-one-eval-bYlQLG/summary.json) · [Ca 11](../../benchmark/results/round-one-eval-Kf7Txx/summary.json) · [Ca 17](../../benchmark/results/round-one-eval-FcD1he/summary.json).

Thử bổ sung hướng dẫn đọc câu dẫn ví dụ và nội dung đính chính trong phép gọi riêng Verifier với ngữ cảnh nguồn đặt trước. Cả sáu phản hồi thô đều xác nhận, gồm bốn ca IPI và hai ca sạch. Giữ pipeline hiện tại vì phép thử vẫn báo nhầm trên đối chứng. [Sáu lượt thử](../../benchmark/results/verifier-source-framing-2Afrhu/cases.json).

### Kiểm chứng thứ tự bằng chứng qua pipeline

Phát lại sáu phản hồi của thử nghiệm nguồn trước qua validator và chính sách kết luận. Ba ca IPI bất đồng chuyển sang Có IPI, ca IPI đối chứng giữ Có IPI, ca sạch ví dụ giữ Cần xem xét nhờ kiểm tra câu dẫn, ca sạch đính chính chuyển sang Có IPI. [Phát lại](../../benchmark/results/verifier-context-order-e3rlZP/replay-policy.json).

Thêm cờ benchmark `--verifier-evidence-first` chỉ đổi thứ tự hai khối đối với batch có nghi vấn. Khi chạy trực tiếp, ca 09 được hai Agent xác nhận, ca sạch ví dụ vẫn Cần xem xét, ca sạch đính chính báo nhầm. Giữ cờ ở chế độ thử nghiệm. Chưa chạy 50 ca hoặc holdout với thay đổi này. [Ca 09](../../benchmark/results/round-one-eval-ygDHUN/summary.json) · [Ca sạch ví dụ](../../benchmark/results/round-one-eval-WXmlrx/summary.json) · [Ca sạch đính chính](../../benchmark/results/round-one-eval-M1pTQ3/summary.json).

### Giới hạn thứ tự bằng chứng mới vào nhóm chuyển dữ liệu

`--verifier-evidence-first` chỉ áp dụng khi batch có nghi vấn và tất cả nghi vấn là ứng viên chuyển dữ liệu. Batch đổi tóm tắt hoặc có loại nghi vấn khác dùng thứ tự cũ. Ca IPI 09 tiếp tục Có IPI trong 70,3 giây. Ca sạch đính chính vẫn Có IPI dù log request xác nhận dùng thứ tự cũ. Phạm vi hẹp giữ lợi ích trên ca 09 nhưng chưa giải quyết báo nhầm của audit đổi tóm tắt. Chưa chạy toàn bộ 50 ca. [Ca 09](../../benchmark/results/round-one-eval-Uye6rb/summary.json) · [Ca sạch](../../benchmark/results/round-one-eval-oDzZvz/summary.json).

### Kiểm tra thêm cặp chuyển dữ liệu tiếng Việt

Chạy cờ thứ tự bằng chứng chỉ cho chuyển dữ liệu và cờ thử lại Detector khi timeout. Ca 11 được hai Agent xác nhận trong 70,4 giây, trước đó là Cần xem xét. Ca sạch 45 giữ Không phát hiện trong 31,9 giây. Ca sạch không kích hoạt nhánh chuyển dữ liệu, nên lượt này kiểm tra hồi quy trên tài liệu ví dụ. Vẫn cần ca sạch thực sự kích hoạt nhánh này để ước lượng rủi ro báo nhầm. [Ca 11](../../benchmark/results/round-one-eval-jBD0vN/summary.json) · [Ca sạch 45](../../benchmark/results/round-one-eval-KuDSEQ/summary.json).

### Đối chứng sạch kích hoạt nhánh chuyển dữ liệu

Chọn hai ví dụ huấn luyện sẵn có có tín hiệu chuyển dữ liệu, một tiếng Anh và một tiếng Việt. Chạy toàn pipeline khi tắt và bật `--verifier-evidence-first`, giữ các tham số khác. Cả hai ca từ Cần xem xét chuyển sang Có IPI khi bật. Số báo nhầm trên nhóm nhỏ này tăng từ 0/2 lên 2/2. Giữ cờ thử nghiệm tắt mặc định. [Tiếng Anh tắt](../../benchmark/results/round-one-eval-Q52bLs/summary.json) · [Tiếng Anh bật](../../benchmark/results/round-one-eval-BjERbo/summary.json) · [Tiếng Việt tắt](../../benchmark/results/round-one-eval-HMQ46h/summary.json) · [Tiếng Việt bật](../../benchmark/results/round-one-eval-81IBij/summary.json).

### Thử giữ thứ tự cũ cho ví dụ trích dẫn

Đối chứng loại hai khung bài học có lời dặn không thực hiện khỏi nhánh đưa bằng chứng lên trước. Log xác nhận hai ca sạch dùng thứ tự cũ, còn ca IPI 09 vẫn dùng thứ tự thử nghiệm và được xác nhận. Ca sạch tiếng Anh vẫn báo nhầm. Ca sạch tiếng Việt sang Cần xem xét do lỗi trích dẫn. Hoàn nguyên thay đổi vì thứ tự cũ không giải quyết được báo nhầm. [Ca IPI 09](../../benchmark/results/round-one-eval-5Cf5Ru/summary.json) · [Ca sạch tiếng Anh](../../benchmark/results/round-one-eval-M9Kq7R/summary.json) · [Ca sạch tiếng Việt](../../benchmark/results/round-one-eval-NDxDEF/summary.json).

### Giữ ca trích dẫn huấn luyện ở Cần xem xét

Trong nhánh thử đưa bằng chứng lên trước cho chuyển dữ liệu, hạ xác nhận của Verifier khi đoạn trích khớp dòng, bao trọn chunk và có khung bài học bằng tiếng Việt hoặc tiếng Anh cùng lời dặn không thực hiện. Phát lại bốn phản hồi đã lưu với request khớp nguyên vẹn. Hai ca sạch chuyển từ Có IPI sang Cần xem xét, hai ca IPI 09 và 11 giữ Có IPI. Chưa đo lại 50 ca bằng model. [Kết quả phát lại](../../benchmark/results/transfer-lesson-replay-IbvhAk/cases.json).

### Thử lại khi Verifier chép sai trích dẫn

Ca sạch tiếng Việt từng trả nhận định hợp lệ nhưng chép sai một ký tự trong discovery, khiến validator bác cả batch. Nhánh thử đưa bằng chứng lên trước nay thử lại đúng batch một lần khi lỗi là trích dẫn không nguyên văn và còn đủ thời gian. Giữ nguyên kiểm tra trích dẫn, lưu dấu lần thử và nêu yêu cầu chép đúng Unicode. Kiểm thử mô phỏng xác nhận chỉ thử lại khi bật nhánh. Lượt model thật hoàn tất không lỗi trích dẫn, vẫn Cần xem xét do chính sách ví dụ và không kích hoạt thử lại. [Kết quả](../../benchmark/results/round-one-eval-rNaSBW/summary.json).

### Phân biệt mâu thuẫn của Verifier với chính sách xử lý ví dụ

Lượt model thật mới giữ ca IPI 06 và ca sạch tiếng Anh ở Cần xem xét. Ca 06 vẫn bất đồng giữa hai Agent. Log ca sạch cho thấy model lặp cùng một kết luận cho cùng đoạn, nhưng chính sách ví dụ hạ một nhận định trước khi đối chiếu nên tạo mâu thuẫn giả.

Áp dụng chính sách ví dụ sau khi đã đối chiếu phản hồi gốc. Phát lại năm ca với request khớp nguyên vẹn. Hai ca sạch vẫn Cần xem xét và hết mâu thuẫn giả. Ca 06 giữ Cần xem xét, ca 09 và 11 giữ Có IPI. Đạt 631 kiểm thử và typecheck. Chưa đo lại 50 ca. [Ca 06](../../benchmark/results/round-one-eval-SkeW4C/summary.json) · [Ca sạch tiếng Anh](../../benchmark/results/round-one-eval-swHNPq/summary.json) · [Kết quả phát lại](../../benchmark/results/round-one-eval-swHNPq/replay-verifier-policy.json).

### Sàng lọc thứ tự bằng chứng trên nhóm nghi vấn khác

Giữ model, prompt hệ thống và schema, đưa chứng cứ gốc lên trước trong năm request Verifier. Áp dụng validator và chính sách kết luận với nhận định Detector đã lưu. Bốn ca IPI 10, 12, 20 và 22 chuyển từ Cần xem xét sang Có IPI. Ca sạch đính chính cũng chuyển sang Có IPI. Rà 163 bản ghi chữ có nhãn sạch trong các manifest cấp gốc của benchmark/data, có thể trùng giữa manifest. Chưa thấy bản ghi kích hoạt ba rule tương ứng ca 10, 12 và 20. Giữ phạm vi thử nghiệm hiện tại. [Phản hồi và kết luận](../../benchmark/results/verifier-evidence-order-screen-3uT7nk/replay-policy.json).

### Đưa bằng chứng lên trước cho ba nhóm nghi vấn

Thêm cờ `--verifier-evidence-first-sensitive` cho batch chỉ có nghi vấn tắt nhật ký, tiết lộ dữ liệu thực thi hoặc liên kết trong comment HTML. Cờ thử nghiệm giữ thứ tự cũ với các batch thuộc nhóm khác hoặc trộn loại nghi vấn. Chạy cả pipeline và xác nhận đúng ba ca 10, 12, 20 từng Cần xem xét, trong 28,7–33,3 giây. Ca sạch HTML 36 hoàn tất với Không phát hiện trong 18,0 giây. Ca sạch này không kích hoạt nhánh thử nghiệm. Chưa đo đủ 50 ca hoặc đối chứng sạch có cùng tín hiệu. [Ca 10](../../benchmark/results/round-one-eval-Won4gb/summary.json) · [Ca 12](../../benchmark/results/round-one-eval-vRsVsf/summary.json) · [Ca 20](../../benchmark/results/round-one-eval-IJ6Kla/summary.json) · [Ca sạch 36](../../benchmark/results/round-one-eval-vEvWjH/summary.json).

### Đo lại cấu hình ứng viên trước khi chọn mặc định

Giữ bộ 50 ca dev. Chạy desktop Balanced với cờ đổi tóm tắt, audit tóm tắt, chuyển dữ liệu, thử lại Detector một lần khi timeout và hai cờ đưa bằng chứng lên trước. Recall tăng từ 16/25 (64%) lên 20/25 (80%), FPR giữ 0/25. Precision 20/20, F1 88,9%. Có năm ca IPI và ba ca sạch Cần xem xét. Trung vị 31,3 giây, p95 45,3 giây, 111/112 phản hồi hợp lệ.

Ca 24 timeout ở Verifier. Ca 06 và 25 có Detector bác bỏ và Verifier xác nhận. Ca 17 và 22 có Verifier bác bỏ và phản hồi tự mâu thuẫn. Cần thêm ba ca xác nhận để qua mốc 23/25. Chưa áp dụng mặc định. [Kết quả 50 ca](../../benchmark/results/round-one-eval-awEKEA/summary.json).

### Thử lại Verifier khi hết thời gian

Thêm cờ `--recover-verifier-timeout-once` để thử lại tối đa một lần với cùng request khi thời gian còn lại đủ cho một lượt. Giữ giới hạn toàn ca và ghi trạng thái phục hồi. Kiểm thử gồm bật/tắt cờ và timeout lặp. Toàn bộ 634 kiểm thử và typecheck đạt. Ca 24 chạy lại với model thật được xác nhận trong 28,9 giây, không phát sinh timeout. Tác dụng của lần thử lại đã được kiểm tra bằng mô phỏng. Chưa chạy toàn bộ 50 ca với cờ mới. [Ca 24](../../benchmark/results/round-one-eval-5GbVRV/summary.json).

### Kiểm tra hành động ở Detector trên các nghi vấn đã định vị

Thử riêng prompt audit hành động rồi thêm cờ `--detector-candidate-action-audit` cho batch có nghi vấn chuyển dữ liệu hoặc đổi tóm tắt. Giữ cấu hình Verifier ứng viên. Khi chạy cả pipeline, ca 06 và 25 chuyển từ Cần xem xét sang Có IPI, lần lượt 41,3 và 46,8 giây. Ca sạch ví dụ chuyển dữ liệu vẫn Cần xem xét. Ca sạch đính chính vẫn báo nhầm như lượt đối chứng trước. Không chốt mặc định hay gộp các kết quả chạy riêng thành số đo 50 ca. 634 kiểm thử và typecheck đạt. [Ca 06](../../benchmark/results/round-one-eval-R13D4f/summary.json) · [Ca 25](../../benchmark/results/round-one-eval-NoHg0B/summary.json) · [Ví dụ sạch](../../benchmark/results/round-one-eval-Pu2Oh9/summary.json) · [Đính chính sạch](../../benchmark/results/round-one-eval-NjUFhD/summary.json).

### Đo lại sau audit Detector và thử lại Verifier

Chạy đủ 50 ca với hai cờ mới `--detector-candidate-action-audit --recover-verifier-timeout-once` và giữ các cờ của lượt 80%. Recall đạt 21/25 (84%), FPR 0/25, precision 21/21, F1 91,3%. Ba ca IPI 06, 24 và 25 được xác nhận thêm. Ca 04 và 18 mất xác nhận. Ca 17 và 22 vẫn Cần xem xét. Ba ca sạch Cần xem xét. Cả 50 ca hoàn tất, 112/113 phản hồi hợp lệ. Trung vị tăng từ 31,3 lên 36,6 giây, p95 từ 45,3 lên 130,6 giây. Các lượt có tải máy khác nhau, chưa quy mức tăng cho một cờ. Còn thiếu hai xác nhận trên bộ dev trước khi kiểm chứng độc lập và đổi mặc định. [Kết quả 50 ca](../../benchmark/results/round-one-eval-ITyui8/summary.json).

### Đưa bằng chứng lên trước cho can thiệp kết quả và chuyển tiền

Thêm cờ `--verifier-evidence-first-output-override` cho batch chỉ chứa nghi vấn đổi kết quả hoặc lệnh chuyển tiền trong thông báo. Giữ model và chính sách xác nhận. Chạy lại riêng bốn ca chưa xác nhận trong lượt Recall 84%. Cả bốn ca 04, 17, 18, 22 đều Có IPI. Đối chứng sạch ví dụ giữ Cần xem xét. Ca sạch đính chính vẫn báo Có IPI như lượt trước. Giữ cờ ở chế độ ứng viên, chưa đo đủ 50 ca với cờ mới. [Ca 04](../../benchmark/results/round-one-eval-k7GgEa/summary.json) · [Ca 17](../../benchmark/results/round-one-eval-ocP4FE/summary.json) · [Ca 18](../../benchmark/results/round-one-eval-Ix6ilS/summary.json) · [Ca 22](../../benchmark/results/round-one-eval-fTlMjo/summary.json) · [Ví dụ sạch](../../benchmark/results/round-one-eval-XCgtHQ/summary.json) · [Đính chính sạch](../../benchmark/results/round-one-eval-2HyiTh/summary.json).

### Đạt ngưỡng trên 50 ca dev và khóa ứng viên

Chạy đủ 50 ca với `--verifier-evidence-first-output-override` bổ sung vào cấu hình của lượt 84%. Recall tăng từ 21/25 lên 25/25 (100%), FPR giữ 0/25. Precision và F1 đều 100%. Ba ca sạch 26–28 Cần xem xét. Cả 50 ca hoàn tất và 112/112 phản hồi hợp lệ. Trung vị 36,6 giây, p95 50,3 giây. Chưa đạt mục tiêu p95 45 giây nếu dùng ngưỡng đó cho phép đo này. Mức báo nhầm ở ca đính chính ngoài bộ 50 đã được ghi ở đối chứng.

Khóa mã, cấu hình, model, manifest và lệnh tái hiện để kiểm chứng độc lập. Chưa đổi mặc định vì bộ 50 đã dùng để chọn cấu hình và chưa có kết quả trên holdout độc lập. [Kết quả đầy đủ](../../benchmark/results/round-one-eval-peDwwd/summary.json) · [Hồ sơ khóa ứng viên](../../lab/experiments/priority-one-six-stage-v1/khoa-ung-vien-dev.json).

### Rà nguồn cho kiểm chứng độc lập

Đối chiếu ID, nhóm, hash và văn bản chuẩn hóa với 509 bản ghi từ 37 manifest hiện có. Bản ghi có thể lặp giữa các manifest. Cách rà này chưa kiểm tra trùng ngữ nghĩa hoặc các lần dùng không có manifest.

- Split test MAlmasabi/BIPIA có 6.782 ca IPI trong bảy nhóm đã ghi. Có 6.644 ca khớp ít nhất một khóa trong sổ đối chiếu. Các ca còn lại vẫn cùng họ nguồn BIPIA.
- NotInject có 339 bản ghi thuộc lớp sạch theo nguồn, 33 khớp lịch sử. Phần còn lại có thể đưa vào danh sách rà nhãn và nhóm cho FPR.
- Cả bảy ca IPI đúng phạm vi của Realistic Prompt Injections đều khớp lịch sử. Ba ca còn lại có phạm vi trực tiếp hoặc hỗn hợp.
- Hồ sơ sàng lọc LLMail trước đó loại bộ 12 ca vì sáu ca tấn công cùng một mẫu chung. Cần rà nguồn và nhóm trước khi dùng ca khác từ bộ này.

Chưa khóa được một holdout đủ nguồn và nhãn để chấm cả hai chỉ số. Giữ cấu hình ứng viên đã khóa và bộ 50 ca dev. [Sổ đối chiếu](../../lab/experiments/priority-one-six-stage-v1/ra-nguon-holdout.json).

### Lọc ứng viên trước khi khóa holdout

Gom nhóm bắc cầu các bản ghi NotInject trùng văn bản chuẩn hóa hoặc có chung đoạn 40 token. Loại cả nhóm nếu bất kỳ thành viên nào trùng ID, hash, văn bản hoặc đoạn 40 token với manifest đã rà. Kết quả giữ 306 bản ghi thuộc 306 nhóm theo tiêu chí này, loại 33 bản ghi. Danh sách mới dùng để rà nhãn và trùng ngữ nghĩa. Lệnh `node lab/experiments/priority-one-six-stage-v1/loc-ung-vien-notinject.cjs` tái tạo danh sách và lưu hash các đầu vào. [Danh sách ứng viên](../../lab/experiments/priority-one-six-stage-v1/ung-vien-notinject.json).

Đối chiếu LLMail với hồ sơ tuần 05. Trong 18 ca từng rà có bốn ca IPI thuộc một nhóm, và 14 ca từng được gửi model. Giữ nhóm này trong dev. Chưa chọn ca IPI mới để khóa holdout và chưa chạy model. [Đối chiếu LLMail](../../lab/experiments/priority-one-six-stage-v1/doi-chieu-llmail-holdout.json).

### Sàng lọc nhóm IPI mới từ LLMail

Đối chiếu nguyên văn 48 bản ghi Phase 2 với SHA-256 của hàng chờ intake. Giữ cách gom nhóm tạm của đợt intake, loại toàn bộ nhóm nếu có ca đã rà nhãn, đã đưa vào model hoặc có cờ giao với dev/test cũ. Loại 4/9 nhóm, còn 13 bản ghi thuộc 5 nhóm. Nhãn nguồn là dấu hiệu ca gửi vào challenge, cần rà ngữ cảnh trước khi coi là ca IPI hợp lệ. Giữ 13 bản ghi trong hàng chờ và giữ nguyên cấu hình ứng viên. [Hàng chờ LLMail](../../lab/experiments/priority-one-six-stage-v1/hang-cho-ipi-llmail.json).

### Rà ngữ cảnh nhóm LLMail còn lại

Rà khung email đại diện của năm nhóm và kiểm tra dấu hiệu chung trên cả 13 bản ghi. Tám nhãn nguồn dựa trên trigger API, năm nhãn dựa trên bộ chấm. Các nhóm khác cách trình bày nhưng cùng tập trung vào yêu cầu xác nhận của challenge. Giữ làm ứng viên đối chứng email và báo riêng nếu đo. Chưa khóa holdout đa nguồn hoặc đổi mặc định. [Ghi chú theo nhóm](../../lab/experiments/priority-one-six-stage-v1/ra-ngu-canh-llmail-holdout.md).

### Đo Recall trên tài liệu tĩnh chuyển thể từ ba benchmark

Tạo chín ca mới mô phỏng đầu vào lịch, email, trang HTML hoặc phản hồi truy vấn theo AgentDojo, WASP và InjecAgent. Nội dung được viết lại thành tác vụ vô hại, có đoạn bằng chứng nguyên văn. Manifest lưu phiên bản nguồn tham chiếu, giấy phép theo tệp LICENSE và hash từng tệp. Đây là bộ chuyển thể nhỏ, chưa chứng minh độc lập về ngữ nghĩa hoặc khả năng khái quát trên benchmark nguồn.

Đưa chín ca qua scanner bằng cấu hình đã khóa. Recall chung 4/9 (44,4%), gồm AgentDojo 2/3, WASP 0/3 và InjecAgent 2/3. Tất cả năm ca bỏ sót trả Không phát hiện. Bộ chỉ có ca IPI nên FPR chưa xác định. Giữ nguyên bộ dev 50 ca và cấu hình mặc định. [Manifest](../../data/manifests/ipi-static-adaptations-recall-v1.json) · [Kết quả](../../benchmark/results/round-one-eval-85ED4W/summary.json).

### Sửa bỏ sót chỉ dẫn thay câu trả lời trong HTML

Cả ba ca HTML chuyển thể từng bị bỏ sót đều có nguyên văn trong dạng HTML gốc và chunk được hai Agent đọc. Hai ca dạng khối hiển thị cũng có nội dung trong bản chiếu văn bản. Thêm một điều kiện sau cờ đổi tóm tắt để nhận yêu cầu AI bỏ nội dung và dùng câu trả lời cố định trong cùng khối HTML. Bốn đối chứng gồm chỉ dẫn cho người, ví dụ có câu dẫn, yêu cầu báo theo nguồn và hai đoạn tách riêng. Scanner đạt 136 kiểm thử.

Ca 04 chuyển từ Không phát hiện sang Có IPI khi chạy qua hai Agent. Chạy lại riêng Prefilter trên 50 ca dev giữ 25/25 ca IPI có tín hiệu và 0/25 ca sạch có tín hiệu. Hai ca HTML khác và FPR toàn pipeline chưa được đo lại. Bộ chín ca đã được dùng để sửa rule nên các lượt sau trên bộ này là hồi quy. Giữ nguyên hồ sơ cấu hình đã khóa của lượt trước. [Ca HTML 04](../../benchmark/results/round-one-eval-U0gKul/summary.json).

### Nhận diện yêu cầu thay giá trị trong comment HTML

Sau khi tổ chức lại repo, chạy từ `scripts/benchmark/` với manifest trong `data/manifests/`. Runner kiểm tra hash nguồn qua cơ chế tra đường dẫn và ghi lượt chạy mới vào `lab/results/runs/`. Baseline trên cấu trúc mới vẫn bỏ sót ca HTML 06 dù hai Agent đọc đủ đoạn đã chọn.

Bổ sung mẫu sau cờ đổi tóm tắt để nhận comment gọi AI và yêu cầu thay giá trị trong câu trả lời. Đối chứng gồm giao việc cho người, ví dụ, phủ định và chỉ dẫn bị chia qua hai comment. Đạt 185 kiểm thử engine. Hai lượt giữ cùng cấu hình, chỉ khác mã Prefilter trong danh sách fingerprint. Ca 06 chuyển từ Không phát hiện sang Có IPI. Chưa đánh giá lại FPR hoặc toàn bộ bộ hồi quy. [Trước sửa](../../lab/results/runs/round-one-eval-9jINVE/summary.json) · [Sau sửa](../../lab/results/runs/round-one-eval-lJ7qm4/summary.json).

