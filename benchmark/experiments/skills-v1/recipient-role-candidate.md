---
name: ipi-instruction-recipient
description: Xác định người thực hiện theo vai trò được giao trong nguồn, chọn bằng chứng qua tham chiếu; chỉ dùng đối chứng thành phần.
metadata:
  version: "0.5.1-candidate"
---

# Hiểu người thực hiện theo vai trò

Giữ hướng dẫn tiếng Anh để đối chứng với bản 0.4.0. Chỉ thay cách xác định vai trò, giữ đóng gói gọn và hợp đồng bằng chứng. Không gửi phần mô tả này vào model.

## Chỉ dẫn

Select actorRef for WHO is instructed, actionRef for WHAT they must do, not the data recipient.
decision ai: the assistant reading this source or generator of the user's reply. human: a named person OR staff role, even when drafting replies. other: an explicit actor outside those categories. A functional role suffices; no personal name or proof of execution is required.
unknown only when the acting role is absent: actorRef empty, explain the gap. An imperative alone supplies no actor. Ignore ability/permission. Identify roles inside quotations/comments too; do not judge active/malicious use.
