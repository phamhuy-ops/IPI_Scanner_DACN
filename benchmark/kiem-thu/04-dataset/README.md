# Dataset hiện có

- **malmasabi-raw**: 70000 hàng; [dữ liệu canonical](../../data/raw/malmasabi-bipia-gpt/dataset_for_huggingface.jsonl); vai trò: raw_source. Nguồn BIPIA derivative; không tự độc lập với BIPIA hoặc các split bên dưới.
- **malmasabi-dev**: 52758 hàng; [dữ liệu canonical](../../data/splits/ipi-dev.jsonl); vai trò: development. Đã chia theo nhóm heuristic; không trộn nhãn/ID vào input.
- **malmasabi-test**: 13190 hàng; [dữ liệu canonical](../../data/splits/ipi-test.jsonl); vai trò: reserved_test_history_requires_audit. Không chạy lại để chọn sửa; chưa chứng nhận toàn bộ lịch sử chưa chạm hoặc độc lập ngoài nguồn.
- **notinject**: 339 hàng; [dữ liệu canonical](../../data/processed/notinject/notinject.jsonl); vai trò: benign_controls. 339 mẫu canonical; alias Parquet train/validation/test không là nguồn mới. Nhãn benign theo dataset card.
- **realistic**: 17 hàng; [dữ liệu canonical](../../data/processed/realistic-prompt-injections/realistic-prompt-injections.jsonl); vai trò: development_probes. Strict IPI chỉ lấy scope ipi và benign_control; direct/mixed báo riêng. CSV/JSONL raw cùng nội dung.
- **llmail-subset**: 48 hàng; [dữ liệu canonical](../../data/raw/llmail-intake-v1/data/phase2-subset.jsonl); vai trò: intake_not_paired_ready. Subset đã tải, không phải toàn bộ LLMail. Mapping scenario/task còn cần xác minh.
- **injecagent-dh_base**: 510 hàng; [dữ liệu canonical](../../data/raw/injecagent/data/test_cases_dh_base.json); vai trò: raw_source_shared_families. Base/enhanced và các attack dùng chung nhiệm vụ/template; không cộng số hàng thành nguồn độc lập.
- **injecagent-dh_enhanced**: 510 hàng; [dữ liệu canonical](../../data/raw/injecagent/data/test_cases_dh_enhanced.json); vai trò: raw_source_shared_families. Base/enhanced và các attack dùng chung nhiệm vụ/template; không cộng số hàng thành nguồn độc lập.
- **injecagent-ds_base**: 544 hàng; [dữ liệu canonical](../../data/raw/injecagent/data/test_cases_ds_base.json); vai trò: raw_source_shared_families. Base/enhanced và các attack dùng chung nhiệm vụ/template; không cộng số hàng thành nguồn độc lập.
- **injecagent-ds_enhanced**: 544 hàng; [dữ liệu canonical](../../data/raw/injecagent/data/test_cases_ds_enhanced.json); vai trò: raw_source_shared_families. Base/enhanced và các attack dùng chung nhiệm vụ/template; không cộng số hàng thành nguồn độc lập.

Số hàng đọc từ file thực tế, không phải số nguồn độc lập. Hash trong [danh mục](danh-muc.json).
