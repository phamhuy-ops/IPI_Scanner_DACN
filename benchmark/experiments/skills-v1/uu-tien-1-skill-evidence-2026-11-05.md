# Ưu tiên 1: gộp công việc skill và đo lại bước đối chiếu bằng chứng

Cập nhật 05/11/2026. **Đã gộp ba skill vào Ưu tiên 1. Chưa có cấu hình mới đủ điều kiện đưa vào Agent mặc định.**

## Đã áp dụng vào dự án

- Kế hoạch việc cần làm, trang tiến độ, cổng hoàn thành và tuần 3 cùng xác định ba skill là công việc con của Ưu tiên 1. Viết đủ ba file không phải hoàn thành mục tiêu.
- Giữ mục tiêu ≥90% trên toàn bộ bộ đánh giá đã khóa, sau đó kiểm chứng độc lập và pipeline/coverage. Lỗi và needs_review không được loại khỏi mẫu số. Không train, tải model hoặc đổi Agent mặc định.
- Gộp các phép đối chứng vào runner evaluate.cjs hiện có. Baseline dùng lại chỉ khi khớp hash dữ liệu/body, model digest, tùy chọn, đủ ID/nhãn và request thực tế; không gọi lại hoặc đếm lại baseline như mẫu mới.
- Thêm kiểm tra hợp đồng cho hai lượt độc lập, trạng thái xung đột, phần thiếu phải trích nguyên văn claim, ref giả và phép đổi tên trường kết luận. Đây là kiểm tra code, không phải bằng chứng AI đạt chất lượng.

## Kết quả trên cùng 18 ca dev

Chỉ có 18 ca duy nhất (12 ca cũ + 6 biến thể đã dùng từ trước), không phải 126 tài liệu độc lập. Baseline skill gốc 0.1 trên Qwen3 4B đạt 10/18, không lỗi. Các phương án sau đều đã chạy đủ 18 ca.

- **Hai câu hỏi độc lập: 10/18 → 9/18**, 1 lỗi đầu ra/hợp đồng. Mất ca baseline đúng: e4, es3, es4, es5, ea2, ea4, ea5. Chưa giữ bản mới.
- **Hai trường boolean có tên riêng: 10/18 → 10/18**, 0 lỗi đầu ra/hợp đồng. Mất ca baseline đúng: e4, es3, es4, es5, ea4, ea5. Chưa giữ bản mới.
- **Rà thành phần sau phân loại: 10/18 → 9/18**, 1 lỗi đầu ra/hợp đồng. Mất ca baseline đúng: e4, es3, es4, es5, ea2, ea4. Chưa giữ bản mới.
- **Đối chứng Qwen2.5 Instruct 1,5B đã được phép: 10/18 → 7/18**, 1 lỗi đầu ra/hợp đồng. Mất ca baseline đúng: e4, e6, es3, es4, es5. Chưa giữ bản mới.
- **Bằng chứng/lý do trước nhãn: 10/18 → 14/18**, 2 lỗi đầu ra/hợp đồng. Mất ca baseline đúng: e6, es1. Chưa giữ bản mới.
- **Lý do trước nhãn, thêm yêu cầu một câu: 10/18 → 10/18**, 0 lỗi đầu ra/hợp đồng. Mất ca baseline đúng: ea5. Chưa giữ bản mới.
- **Chỉ dẫn không minh họa và không phần vận hành code: 10/18 → 12/18**, 3 lỗi đầu ra/hợp đồng. Mất ca baseline đúng: e1, e6, ea5. Chưa giữ bản mới.

Phương án 14/18 xử lý đúng cả sáu ca thiếu dữ kiện nhưng hai ca trước đúng bị cắt JSON; bản rút lý do về một câu hết lỗi kỹ thuật nhưng mất cải thiện ngữ nghĩa. Bỏ ví dụ khỏi chỉ dẫn cũng chưa giữ được các ca đúng. Không chọn phương án chỉ vì tổng điểm cao hơn.

## Sai sót còn thấy rõ

- Các câu hỏi boolean có thể sửa nhóm thiếu thông tin nhưng lại coi nguồn phủ định là chưa có dữ kiện. Đổi tên trường chưa đủ giải quyết.
- Bộ rà thành phần vẫn nhầm “nguồn cấm hành động” thành “nguồn không nhắc hành động”; có một phần thiếu bị đổi chữ hoa/thường so với claim nên bị validator từ chối. Giữ lỗi này, không nới đối chiếu nguyên văn.
- Qwen2.5 Instruct trả nhiều nhãn supported dù giải thích có mâu thuẫn. Kết quả chỉ kết luận cấu hình này không đạt phép thử, không khái quát năng lực cả dòng model.
- Cho lý do trước nhãn cải thiện một số nhận định, nhưng có lý do dài và bị cắt. Ép lý do ngắn hoặc bỏ minh họa chưa tạo được cải thiện ổn định. Dấu hiệu lẫn ví dụ vào claim là quan sát để điều tra, chưa chứng minh đó là nguyên nhân duy nhất.
- e3 có cách diễn đạt falsify cần người rà nhãn độc lập; giữ nguyên nhãn và vẫn tính sai khi không đạt. Không bỏ ca này để đạt phần trăm.

## Quyết định

Loại các cấu hình thử ở đợt này. Khôi phục nội dung bản nháp skill bằng chứng trước đợt sửa; giữ baseline 0.6.0 người nhận trong harness và ba skill gốc 0.1.0. Người nhận/ngữ cảnh chưa được đo nâng cấp mới hôm nay; trạng thái chưa ổn định ở đợt trước vẫn giữ. Không tự coi hai skill đó đã sẵn sàng.

Sáu biến thể chuyển giao đã được chuẩn bị nhưng **không gọi model**, vì không ứng viên nào qua cổng hồi quy. Tệp được lưu cùng kết quả trên E thay vì để thêm bộ thử chưa dùng trong repo. Chưa đo holdout độc lập hoặc pipeline có skill; không tuyên bố đạt 90% hay nâng chất lượng Agent thực tế.

## Minh chứng, chi phí và tái hiện

### Hai câu hỏi độc lập

Prompt token 11684 → 17734; output token 3199 → 4463. p50 10.157 → 14.286 giây; p95 20.140 → 25.291 giây. Request mới thực tế: 54.

[Raw](../../results/skill-evidence-facts-n26rfE/raw.jsonl), [protocol/seed/model/hash/lệnh](../../results/skill-evidence-facts-n26rfE/protocol.json), [metrics/confusion/precision/recall/F1/FPR/nhóm/ngôn ngữ](../../results/skill-evidence-facts-n26rfE/audited-metrics.json).

### Hai trường boolean có tên riêng

Prompt token 11684 → 17806; output token 3199 → 4306. p50 10.157 → 14.631 giây; p95 20.140 → 27.932 giây. Request mới thực tế: 36.

[Raw](../../results/skill-evidence-facts-N9yf5B/raw.jsonl), [protocol/seed/model/hash/lệnh](../../results/skill-evidence-facts-N9yf5B/protocol.json), [metrics/confusion/precision/recall/F1/FPR/nhóm/ngôn ngữ](../../results/skill-evidence-facts-N9yf5B/audited-metrics.json).

### Rà thành phần sau phân loại

Prompt token 11684 → 16509; output token 3199 → 4834. p50 10.157 → 15.097 giây; p95 20.140 → 23.501 giây. Request mới thực tế: 14.

[Raw](../../results/skill-evidence-completeness-wC6WpF/raw.jsonl), [protocol/seed/model/hash/lệnh](../../results/skill-evidence-completeness-wC6WpF/protocol.json), [metrics/confusion/precision/recall/F1/FPR/nhóm/ngôn ngữ](../../results/skill-evidence-completeness-wC6WpF/audited-metrics.json).

### Đối chứng Qwen2.5 Instruct 1,5B đã được phép

Prompt token 11684 → 11684; output token 3199 → 1686. p50 10.157 → 1.375 giây; p95 20.140 → 10.223 giây. Request mới thực tế: 18.

[Raw](../../results/skill-evidence-authorized-model-hB20wI/raw.jsonl), [protocol/seed/model/hash/lệnh](../../results/skill-evidence-authorized-model-hB20wI/protocol.json), [metrics/confusion/precision/recall/F1/FPR/nhóm/ngôn ngữ](../../results/skill-evidence-authorized-model-hB20wI/audited-metrics.json).

### Bằng chứng/lý do trước nhãn

Prompt token 11684 → 11684; output token 3199 → 4116. p50 10.157 → 16.997 giây; p95 20.140 → 41.082 giây. Request mới thực tế: 18.

[Raw](../../results/skill-evidence-relation-last-B3OF6i/raw.jsonl), [protocol/seed/model/hash/lệnh](../../results/skill-evidence-relation-last-B3OF6i/protocol.json), [metrics/confusion/precision/recall/F1/FPR/nhóm/ngôn ngữ](../../results/skill-evidence-relation-last-B3OF6i/audited-metrics.json).

### Lý do trước nhãn, thêm yêu cầu một câu

Prompt token 11684 → 12368; output token 3199 → 1437. p50 10.157 → 5.933 giây; p95 20.140 → 15.387 giây. Request mới thực tế: 18.

[Raw](../../results/skill-evidence-relation-last-fy50RH/raw.jsonl), [protocol/seed/model/hash/lệnh](../../results/skill-evidence-relation-last-fy50RH/protocol.json), [metrics/confusion/precision/recall/F1/FPR/nhóm/ngôn ngữ](../../results/skill-evidence-relation-last-fy50RH/audited-metrics.json).

### Chỉ dẫn không minh họa và không phần vận hành code

Prompt token 11684 → 9992; output token 3199 → 4006. p50 10.157 → 15.551 giây; p95 20.140 → 36.820 giây. Request mới thực tế: 18.

[Raw](../../results/skill-evidence-relation-last-KuzNu7/raw.jsonl), [protocol/seed/model/hash/lệnh](../../results/skill-evidence-relation-last-KuzNu7/protocol.json), [metrics/confusion/precision/recall/F1/FPR/nhóm/ngôn ngữ](../../results/skill-evidence-relation-last-KuzNu7/audited-metrics.json).

Tổng 176 lần gọi suy luận mới ở các lượt hợp lệ. Baseline 18 lần chỉ gọi một lần; dùng lại response không đếm thành request mới. Mỗi số đúng vẫn tính đủ 18 ca, có lỗi là sai. Dataset/ID/nhãn/nhóm/đường dẫn không đi vào request model; chỉ có nguồn, claim và câu hỏi/hợp đồng được giao.

Các prompt/response của lượt hai pha nằm trong phases; request bên ngoài là template, không phải một response API tổng hợp. Bộ rà thành phần dùng lại phân loại cũ nên token/latency của candidate bao gồm chi phí phân loại đã lưu; không phải một lượt pipeline mới. Các so sánh dùng baseline lưu có khác thời điểm/tải/cold load, chỉ dùng thời gian để tham khảo, chưa chứng minh ngân sách tài liệu ngắn/dài.

Phân nhóm ký tự trong metrics là phân tích bổ sung, chưa phải giao thức hiệu năng đã khóa trước đo. Tài nguyên Ollama cuối mỗi lượt nằm trong summary; snapshot RAM/GPU chỉ theo thời điểm, không phải peak. Không dùng p95 thành phần thay p95 toàn tài liệu.

Có một lượt khởi tạo bị dừng vì helper lỗi đường dẫn trước khi ghi skill đúng; đã giữ raw và đánh dấu invalid-setup, không dùng làm baseline hoặc điểm một cấu hình đủ ca. [Hồ sơ lỗi khởi tạo](../../results/skill-evidence-facts-FqidlV/invalid-setup.json). Bản isolated có mô tả phương pháp cần đính chính: body thực tế là 4.0 chứ không phải 0.1; snapshot/hash/request đã ghi đúng, không đổi dữ liệu hoặc ngưỡng. [Đính chính](../../results/skill-evidence-relation-last-KuzNu7/protocol-correction.json).

Sáu mẫu chưa chạy: [tệp chuyển giao chưa sử dụng](../../results/skill-evidence-relation-last-KuzNu7/transfer-not-run.json). Tự soạn cùng người và có họ lỗi chung với dev, không gọi là holdout độc lập.

Các lượt không tăng giới hạn sinh 350 token, không nới validator/ref hoặc tự chọn nhãn từ reason. Enum không xác định bị từ chối; metric không xác định là null. Insufficient của nhiệm vụ này không đồng nghĩa needs_review hoặc uncertain hợp lệ của toàn Agent.

## Phần còn lại trong Ưu tiên 1

Cần chốt hợp đồng ngữ nghĩa và rà độc lập nhãn/ca sai trước đợt chọn tiếp; không tiếp tục nối thêm prompt chỉ để sửa từng ID dev. Khi có cấu hình qua hồi quy mới đo chuyển giao, khóa cấu hình để kiểm chứng độc lập, rồi nối vào đúng bước xử lý ở chế độ thử tắt mặc định và đo pipeline. Hiện chưa đủ căn cứ thực hiện phần bật skill.

## Kiểm tra sau khôi phục

42 kiểm tra benchmark đạt, cú pháp runner và git diff không có lỗi. Ba skill gốc giữ nguyên; ba body nháp khớp bản trước đợt sửa. Các kiểm tra này không chứng minh nhận diện đạt 90%. [Log kiểm tra](../../results/skill-evidence-relation-last-KuzNu7/checks-2026-11-05.log), [snapshot tài nguyên cuối đợt](../../results/skill-evidence-relation-last-KuzNu7/resources-snapshot.json).
