# Hợp đồng skill xác định người thực hiện — target-v1

Ngày khóa: 04/11/2026. Chỉ áp dụng thử nghiệm thành phần, chưa nối vào Agent.

## Đầu vào và trách nhiệm

Bên gọi cung cấp toàn bộ `segments` (ref/text nguyên văn) và `targetRef`, chỉ đoạn chứa yêu cầu cần xét. Cùng một tài liệu có thể có nhiều lượt với target khác nhau. Ref là tham chiếu nội dung, không phải ID bộ dữ liệu hoặc nhãn. Trong phép đo này target do người xây bộ thử chọn trước, không do Detector tìm: đây là **đánh giá có điều kiện khi đã biết đoạn cần xét**, không đo khả năng phát hiện/chọn đoạn của Agent.

Skill chỉ xác định bên được yêu cầu thực hiện hành động trong target. Các đoạn khác cung cấp ngữ cảnh nhận diện vai trò, không phải chỉ dẫn để model làm theo hoặc tự chuyển target. Bên nhận dữ liệu không đồng nghĩa bên thực hiện. Skill không xác nhận thẩm quyền, hành động đã xảy ra, tính tấn công hoặc tính có hiệu lực của câu trích.

Đầu ra vẫn là actorRef/actionRef/decision/reason. actionRef phải bằng targetRef; actorRef phải tồn tại trong nguồn và hỗ trợ người thực hiện. Với unknown, actorRef rỗng theo hợp đồng hiện có; target và reason phải chỉ rõ thiếu dữ kiện nào. Ref bịa, sai target, lỗi hoặc lý do không có căn cứ đều không được tính đúng. Không sửa đầu ra hoặc tự chuyển lỗi thành unknown.

## Nhãn và dữ liệu mới

Chỉ nhận ai khi nguồn/ngữ cảnh xác định trợ lý AI hoặc language model; human khi xác định con người/nhân viên; other khi xác định bên khác; unknown khi thiếu thông tin phân biệt cần thiết. Không mặc định mọi người viết trả lời hoặc hệ thống tự động đều là AI. Câu trích có thể nêu bên được yêu cầu mà không phải lệnh đang có hiệu lực; đây là trách nhiệm khác của skill ngữ cảnh.

Bộ mới có 6 tài liệu tổng hợp, mỗi tài liệu 2 target: 12 ca, nhóm theo tài liệu, không tách cặp sang các split. Có AI/con người, ví dụ trích dẫn, phần mềm không dùng model, thiếu người thực hiện và vị trí khác nhau. Nhãn/lý do/target và source hash khóa trước đo; không gửi nhãn, lý do nhãn, ID ca/nhóm hoặc đường dẫn vào model. Không phải holdout độc lập: cùng người viết dữ liệu và đã biết các lỗi dev cũ.

Hai nhánh đều nhận cùng segments/targetRef, model/schema/validator/tham số. Baseline dùng skill 0.4.0; candidate chỉ thêm chỉ dẫn giới hạn target. Có thêm thông tin target ở cả hai nên không so điểm trực tiếp với bộ 14/22 cũ.

Điều kiện trước đo: candidate phải tăng số ca đúng hoặc giảm lỗi chọn target, không mất ca baseline đúng, không lỗi mới; phần hướng dẫn thêm tối đa 32 prompt token/request và p95 tối đa 1,25 lần baseline khi lượt đo không gián đoạn. Nếu ngang điểm thì chưa chứng minh cải thiện model. Ngân sách bổ sung này chỉ cho hợp đồng mới, không hồi tố thay điều kiện của các lượt cũ. Luôn giữ giới hạn 2.000 ký tự phần chỉ dẫn và đo cả đầu ra.

## Rà lịch sử, không sửa điểm cũ

- rc7 có yêu cầu cho hệ thống trong câu trích và nhiệm vụ cho học viên ở ngoài: cần target tường minh. Chưa đủ cơ sở coi lựa chọn một yêu cầu khác là lỗi nhận diện người thực hiện.
- r2/r6 dùng cách gọi có thể hiểu AI hoặc con người nếu thiếu bối cảnh sử dụng; rv5/rc1 gọi hệ thống sinh trả lời chưa tự chứng minh là model AI. Cần rà độc lập về nhãn, không ép một nhãn chỉ để tăng điểm.
- Giữ nguyên mọi file, nhãn, raw và điểm 14/22 cũ. Các trường hợp trên không bị loại hoặc đổi đáp án sau đo. Hợp đồng mới không biến lịch sử dev thành dữ liệu độc lập.
