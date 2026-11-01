# Benchmark IPI Scanner

Xem [kho kiểm thử tập trung](kiem-thu/README.md) để tìm file mẫu, nhãn đối chiếu, PDF/DOCX và dataset đã tải. Danh mục CSV và hash phục vụ báo cáo nằm cùng thư mục.

Cập nhật dọn 28/10/2026: công cụ đang duy trì dùng một đầu vào `scripts/benchmark.cjs` (`npm run benchmark -- --help`), gồm đo Agent, theo manifest, report, replay và rule controls. 275 script thử nghiệm cũ cùng các audit/snapshot lặp đã rời thư mục làm việc; tra [danh mục lưu trữ/hash](archives/don-dep-2026-10-28/README.md) khi cần lệnh lịch sử. Raw, baseline, dataset và nhãn vẫn được giữ.

Để đối chứng mới, runner30 ca hỗ trợ `--paired yes` (baseline và candidate gọi model mới, cùng code/input path), `--candidate-config` là JSON được whitelist và `--stop-on-new-fp yes` khóa trước đo cổng dừng sớm. Cờ `--stop-on-proven-latency yes` yêu cầu paired và latency-policy: chỉ dừng giữa các ca khi p95 toàn cohort chắc chắn không thể qua cổng dù mọi ca chưa chạy mất0 giây; vẫn ghi rejected_incomplete và đủ mẫu số đã chọn. Không cho config đổi model/backend/input. Không có config thì paired kiểm tra lặp cấu hình mặc định; có config chủ ý đổi prompt/schema thì so nguồn ổn định và lưu khác biệt request. Đối chứng khác thư mục có thể bị nhiễu do path đi vào citation. Các prototype phục hồi citation đã bị loại/gỡ; không có flag chạy chúng trên mã hiện tại. Snapshot cũ được nén trong từng thư mục lượt đo, kèm index/hash; khôi phục vào bản làm việc riêng nếu cần tái lập, không ghi đè workspace đang dùng.

Runner chung cũng nhận `--manifest` cho bộ dev đã khóa và `--latency-policy` để chấm riêng ngắn/dài. Policy mới ở `experiments/evidence-stable-alias-v1/latency-policy.json`: proxy dài từ10.000 ký tự Unicode, p95≤45 giây; mẫu ngắn giữ cổng1,25 lần. Nhóm không có mẫu được ghi không áp dụng, không suy là đã kiểm chứng dài. Không sửa cổng của lượt cũ.

Mới nhất: [đối chứng đủ96 ca](results/agent-eval-96-fLodSV/quality-audit.json) của payload `stable-alias-v1`, đúng nhãn29→31/96; chưa đạt90%/độc lập nên chưa bật mặc định. Payload thử loại đường dẫn tuyệt đối trong suspicion/citation, giữ mapping file/dòng trong state; chưa kiểm chứng việc đổi tên file vì header còn basename. Reporter nay đối chiếu riêng citation với directive span có sẵn; nguồn thiếu span hoặc chưa map được ghi rõ, không tự coi quote có trong tài liệu là bằng chứng đúng ngữ nghĩa. Nhãn/span chỉ dùng sau đo, không đưa vào Agent.

- `kiem-thu/`: bản tập hợp có tên input trung tính, nhãn/nguồn tách riêng; dataset lớn liên kết bản canonical.
- `data/`: dữ liệu gốc, chuẩn hóa, nhãn và split; giữ đường dẫn hiện tại để các runner không bị hỏng.
- `fixtures/`: nguồn mẫu chẩn đoán tự soạn.
- `experiments/`: giao thức, kết quả và giới hạn của từng thử nghiệm.
- `results/`: đầu ra benchmark.
- `archives/`: hồ sơ cũ được lưu lại.

Không tính bản sao hoặc các biến thể là nguồn độc lập mới. Việc tập hợp không đổi nhãn/split và không chứng minh Agent đạt chất lượng nhận diện.

Ngày29/10: nhánh hai bước source-context-v1 đã bị loại và gỡ khỏi runtime/preflight sau [pipeline quá chậm](results/agent-upgrade-30-PiMptf/quyet-dinh.json); các thử rút gọn/giới hạn context cũng không đạt. Khôi phục7 file theo hash, giữ raw/snapshot và cấu hình lịch sử nhưng chặn chạy cấu hình đã gỡ. Chỉ giữ runner chung và cơ chế dừng latency có kiểm chứng; không thêm runner sản phẩm.

Cập nhật29/10: reporter thêm request_stability, chỉ báo các raw nhận định khác nhau với cùng request trong hồ sơ runtime/model đã khóa; không biến raw thành bằng chứng đúng hoặc đổi verdict. Runner so digest và snapshot show đã chuẩn hóa thứ tự khóa parameters, giữ nguyên giá trị/thứ tự cùng khóa và lưu raw trước/sau tại model-lock-check.json; tránh báo model đổi chỉ vì Modelfile sinh lại. Các thử Verifier/prompt/JSON/thứ tự nguồn trong [lượt chẩn đoán](results/verifier-framing-probe-02IW0s/tong-ket-luot.json) chưa đủ điều kiện áp dụng.

Sau lượt phân nhóm lỗi29/10, reporter có failure_taxonomy (tách kỹ thuật/coverage, role positive, benign flagged, uncertain chờ audit). Agent ghi reviewProgress.batchReviews sau parser và UI hiện mục Chi tiết các lượt AI. Hồ sơ cũ thiếu audit giữ trạng thái chưa có dữ liệu; không suy là chưa gọi model. Các thử tìm kiếm/bao khung/rule ứng viên mới đã bị loại khi mất ca đúng hoặc tăng FP, xem [nhật ký tuần3](<../kế hoạch - nhật ký tuần/tuan-03.md>).

Lưu trữ29/10: runner hiện dùng makeBenchmarkDirectory trong scripts/check-engines.js để tạo dữ liệu mới trên E:\IPI-Workspace\IPI_Scanner\benchmark\results và chỉ thêm junction cho lượt mới tại benchmark/results. Benchmark cũ trên C giữ nguyên. Các probe/runner mới phải dùng helper này; không ghi raw lớn trực tiếp vào thư mục C. TEMP/TMP/TMPDIR của tiến trình benchmark/test/build cũng trỏ E; --output riêng vẫn được tôn trọng.
