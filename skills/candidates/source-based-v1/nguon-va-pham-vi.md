# Ba skill tham khảo nguồn chính thức

**Mốc mới nhất 05/11:** giữ skill bằng chứng bản lý do ngắn: 15/18, lỗi đầu ra 1 → 0, không mất ca đúng. Đã áp dụng vào caller thử nghiệm, Agent mặc định chưa bật. Ba ca sai ngữ nghĩa vẫn còn; chưa đạt 90% hoặc hoàn thành Ưu tiên 1. Các kết quả bên dưới là lịch sử.

**Cập nhật 05/11:** checkpoint bằng chứng tăng 14/18 → 15/18, giữ làm mốc phát triển. Sáu biến thể mới: cả hai bản 5/6; bản mới có một lỗi cắt đầu ra, chưa chứng minh cải thiện ngoài dev. Người nhận/ngữ cảnh giữ 13/18. Chưa bật Agent, Ưu tiên 1 vẫn mở. Chi tiết trong báo cáo checkpoint ngày 05/11 và selected-profiles.json; các mốc bên dưới là lịch sử.

**Trạng thái mới nhất:** theo yêu cầu giữ tổng điểm cao nhất, đã áp dụng checkpoint phát triển 13/18 người nhận, 13/18 ngữ cảnh, 14/18 bằng chứng. Xem selected-profiles.json và báo cáo checkpoint. Các quyết định loại/khôi phục bên dưới là lịch sử trước yêu cầu mới; Agent mặc định chưa bật skill.

Ngày soạn: 04/11/2026. Trạng thái: **đã đo đủ ba skill trên dev; cả ba bản mới không đạt điều kiện giữ**, chưa thay bản đang giữ hoặc nối Agent. Dùng hướng dẫn skill-creator để giữ mỗi nhiệm vụ nhỏ và nạp riêng phần cần thiết.

Gói này tổng hợp nguyên tắc rồi tự viết lại cho IPI Scanner; không phải ba skill có sẵn do các tổ chức bên dưới phát hành. Không có số đo nào chứng minh gói mới tốt hơn các bản đã thử. Các nguồn web tham khảo là dữ liệu nghiên cứu, không cấp quyền thực thi cho Agent.

## Nguồn nào đóng góp phần nào

- **OWASP-PI — [LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html):** tham khảo việc tách dữ liệu không tin cậy khỏi chỉ dẫn và kiểm tra đầu ra nhiều lớp. Tài liệu cảnh báo lời nhắc và nhãn phân cách không tự tạo ranh giới bảo mật. Không lấy các đoạn regex mẫu làm kết luận nhận diện.
- **MS-PS — [Microsoft Prompt Shields](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/concepts/jailbreak-detection):** tham khảo phân biệt đầu vào và tài liệu có thể chứa chỉ dẫn điều khiển model. Dịch vụ không xác nhận provenance hoặc groundedness thay ứng dụng. Đây không phải bộ phân loại người nhận ai/human/other của dự án; cũng không cung cấp sẵn cách phân biệt mọi câu trích.
- **NV-FACT — [NVIDIA NeMo Self-Check Fact-Checking](https://docs.nvidia.com/nemo/guardrails/configure-guardrails/guardrail-catalog/fact-checking):** tham khảo cách đối chiếu một nhận định với evidence được cung cấp, không dựa vào kiến thức ngoài nguồn. NVIDIA nêu hiệu quả phụ thuộc khả năng model tuân thủ. Chưa dùng framework, model chuyên dụng hoặc API của họ; không chuyển kết quả entailment thành chứng nhận an toàn.
- **AS-SPEC — [Agent Skills Specification](https://agentskills.io/specification):** tham khảo cấu trúc SKILL.md và nạp tài nguyên khi cần. Đây là chuẩn đóng gói, không phải phương pháp phát hiện IPI.

Các trang được đọc ngày 04/11/2026, phiên bản web có thể thay đổi. [Manifest trong gói](sources-manifest.json) ghi URL, thời điểm thu và hash; bản tải nghiên cứu nằm trên E. Nội dung được diễn giải, không chép nguyên framework hoặc script bên ngoài. Khi trích dùng nguyên văn sau này phải kiểm tra giấy phép tương ứng; gói này không cấp lại giấy phép nội dung nguồn.

## Phần do IPI Scanner tự thiết kế

- **Người nhận:** yêu cầu bên gọi cung cấp targetRef; phân biệt người nhận dữ liệu với bên phải làm; thiếu danh tính có căn cứ thì chưa xác định. Đây là hợp đồng dự án rút từ lỗi dev, không phải output taxonomy của Microsoft.
- **Ngữ cảnh:** phân biệt việc nhắc đến một chỉ dẫn với yêu cầu áp dụng nó. Dấu ngoặc/code block và câu “chỉ là ví dụ” là dữ kiện ngữ cảnh, không đủ để tự hạ benign. Có thể có câu kích hoạt ngoài phần trích. Quy tắc thao tác này là giả thuyết cần kiểm thử của dự án, không phải bộ skill được OWASP xác nhận.
- **Bằng chứng:** thêm trạng thái thiếu/mâu thuẫn thay cho ép yes/no; ref/quote/offset/view do code kiểm tra. Code xác nhận vị trí không chứng minh ý nghĩa đúng; model đối chiếu ý nghĩa không xác nhận sự thật ngoài đời. Lỗi kỹ thuật không được đổi thành uncertain hợp lệ.

## Ranh giới ba nhiệm vụ

1. [Người nhận](ipi-instruction-recipient/SKILL.md) chỉ trả bên được nhắm tới, không phân loại lệnh đang có hiệu lực hay độc/sạch.
2. [Ngữ cảnh](ipi-command-context/SKILL.md) chỉ xem cách nguồn dùng target, không xác nhận thẩm quyền hoặc thực thi.
3. [Bằng chứng](ipi-evidence-review/SKILL.md) chỉ đối chiếu nhận định với nguồn, không tìm sự thật trên web hoặc quyết định nhãn toàn tài liệu.

Bên gọi giữ schema hiện có. Các mô tả đầu ra trong skill là yêu cầu ngữ nghĩa, chưa phải schema runtime mới. Không đọc kết luận/lý do của Detector như đáp án cho Verifier; claim cần kiểm tra là giả thuyết, không phải nhãn đúng được cung cấp. Nếu cần user intent thì phải ghi rõ chế độ context-aware, không tự suy ra từ đường dẫn hoặc tên bộ dữ liệu.

## Giữ gọn và kiểm chứng

Chỉ phần sau `## Chỉ dẫn` của đúng một skill được dự kiến gửi model. Manifest, tài liệu này và nguồn web không đi vào prompt thường lệ. Mỗi phần chỉ dẫn có trần biên soạn 1.000 ký tự Unicode; ký tự không phải token. Cả ba skill đã có số đo token/latency thành phần; chưa bản mới nào đạt điều kiện giữ.

Giữ nguyên baseline 0.6.0 trong harness và ba bản gốc. Đo từng nhiệm vụ một trên dev khóa trước; không đổi đồng thời model, parser, prompt và cách chấm. Có đối chứng tấn công/sạch gần nhau, Việt/Anh, câu trích có/không có yêu cầu áp dụng, nhận định đủ/thiếu/mâu thuẫn và biến thể chưa dùng để soạn. Bộ dev cũ đã dùng chọn nhiều lần, không coi là holdout.

Đã đo skill bằng chứng theo phương pháp tham khảo NV-FACT và cùng Qwen3 4B Verifier ở hai nhánh: đủ 24 request, cả hai 7/12, sửa một ca và mất một ca cũ đúng, p95 không đạt trần. Chưa chọn bản mới. [Báo cáo và bằng chứng](../../../benchmark/experiments/skills-v1/evidence-sourced-ket-qua.md) lưu cả lỗi hiểu nghĩa và giới hạn, không lấy nguồn uy tín làm chứng nhận hiệu quả.

Tiếp tục lưu raw, code/prompt/model/seed/lệnh, lỗi, số đo từng nguồn/nhóm/ngôn ngữ, precision/recall/F1/FPR/confusion, abstention, token, latency và tài nguyên. Sau chọn cấu hình mới khóa rồi kiểm chứng độc lập và pipeline đầy đủ. Không đưa gói vào Agent chỉ vì đúng định dạng, nguồn uy tín hoặc một bộ nhỏ đạt điểm tốt. Ưu tiên 1 vẫn mở.

## Tổng hợp sau khi đo đủ ba nhiệm vụ

Đã hoàn tất thêm 48 request: người nhận 9/12 → 1/12 (6 lỗi tham chiếu/đầu ra), ngữ cảnh 4/12 → 3/12 (mỗi nhánh 1 lỗi thiếu target trong evidenceRefs). Bằng chứng giữ kết quả 7/12 → 7/12 ở 24 request trước. Cả ba bản source-based-v1 bị loại khỏi lựa chọn tích hợp; giữ các bản gốc và baseline thử nghiệm 0.6.0. [Báo cáo lỗi từng ca, chi phí và thứ tự sửa](../../../benchmark/experiments/skills-v1/tong-hop-loi-source-based-v1.md). Đây là dev tự soạn, target cấp trước; chưa phải tỷ lệ Agent hoặc kiểm chứng độc lập.

## Đợt sửa 1.1–1.4 và khôi phục

Đã đo lại 12 ca cũ + 6 biến thể mỗi nhiệm vụ. Bản mới nhất đạt 12/18 người nhận, 13/18 ngữ cảnh, 11/18 bằng chứng; không gộp thành tỷ lệ Agent. Người nhận/ngữ cảnh có regression; bằng chứng thiếu dữ kiện vẫn sai 6/6, ngữ cảnh bị ép đóng lý do giữa câu khi thêm trần ký tự. Đã khôi phục nội dung ba bản nháp 1.0 trước đợt sửa, chỉ giữ snapshot ứng viên trong kết quả trên E. [Báo cáo đầy đủ](../../../benchmark/experiments/skills-v1/sua-loi-ba-skill.md). Không đổi các skill gốc hoặc Agent mặc định.

## Ngày 05/11: thuộc Ưu tiên 1, chưa tích hợp

Đã thử cách hỏi độc lập, bộ rà thành phần, đối chứng model Verifier đã được phép và thay hợp đồng đầu ra để sinh lý do trước nhãn. Không bản nào giữ được mọi ca baseline đúng và không lỗi mới; khôi phục nội dung bản nháp bằng chứng trước đợt sửa. [Kết quả và raw](../../../benchmark/experiments/skills-v1/uu-tien-1-skill-evidence-2026-11-05.md). Không đổi Agent mặc định hoặc coi skill đã sẵn sàng.

## Yêu cầu mới: giữ checkpoint tổng cao nhất

Đã chọn body người nhận 1.1 (13/18), ngữ cảnh 1.4 kèm hợp đồng bound/capped (13/18), bằng chứng 1.1 (14/18, một lỗi). Metadata/hợp đồng và snapshot nằm trong selected-profiles.json. Đây là mốc phát triển, chưa chốt chất lượng ngữ nghĩa hoặc bật Agent; ngữ cảnh còn lý do kết thúc giữa câu. Hai lượt sửa từ 14/18 chưa vượt mốc, nên giữ nguyên 14/18. [Báo cáo và chính sách mới](../../../benchmark/experiments/skills-v1/checkpoint-tot-nhat-2026-11-05.md).
