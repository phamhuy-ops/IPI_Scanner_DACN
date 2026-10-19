// Knowledge base for document-level Indirect Prompt Injection detection.

const IPI_DOC_PATTERNS = [
  // ── Nhóm 1: Classic & Vietnamese Instruction Override ──
  {
    re: /ignore\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+instructions?/i,
    label: 'Ignore-previous-instructions',
    severity: 'critical',
    description: 'Tài liệu chứa câu lệnh "Ignore previous instructions" kinh điển để hủy bỏ chỉ thị của hệ thống',
  },
  {
    re: /disregard\s+(?:all\s+)?(?:previous|prior|your\s+)?(?:instructions?|guidelines?|rules?)/i,
    label: 'Disregard-prior-rules',
    severity: 'critical',
    description: 'Tài liệu yêu cầu LLM bỏ qua toàn bộ quy tắc hoặc hướng dẫn an toàn đã đặt trước',
  },
  {
    re: /forget\s+(?:all\s+)?(?:previous|prior|everything\s+you\s+know|your\s+rules)/i,
    label: 'Forget-prior-rules',
    severity: 'critical',
    description: 'Chỉ thị ép mô hình quên đi các ràng buộc hệ thống ban đầu',
  },
  {
    re: /bỏ\s+qua\s+(?:tất\s+cả\s+|mọi\s+)?(?:chỉ\s+dẫn|hướng\s+dẫn|yêu\s+cầu|quy\s+tắc|lệnh)\s+(?:trước|cũ|ban\s+đầu|ở\s+trên)/i,
    label: 'VN-Bo-qua-chi-dan-truoc',
    severity: 'critical',
    description: 'Chỉ thị Tiếng Việt yêu cầu bỏ qua tất cả hướng dẫn/quy tắc trước đó của hệ thống',
  },
  {
    re: /không\s+(?:tuân\s+theo|làm\s+theo|thực\s+hiện)\s+(?:các\s+)?(?:chỉ\s+thị|hướng\s+dẫn|câu\s+lệnh)\s+(?:trước|ở\s+trên|của\s+hệ\s+thống)/i,
    label: 'VN-Khong-tuan-theo-chi-thi',
    severity: 'critical',
    description: 'Chỉ thị Tiếng Việt ép LLM không tuân theo các câu lệnh ban đầu',
  },
  {
    re: /quên\s+(?:hết|đi|tất\s+cả)\s+(?:mọi\s+)?(?:chỉ\s+dẫn|ràng\s+buộc|quy\s+định|nhiệm\s+vụ\s+cũ)/i,
    label: 'VN-Quen-moi-rang-buoc',
    severity: 'critical',
    description: 'Chỉ thị Tiếng Việt yêu cầu mô hình quên đi các ràng buộc an toàn đã thiết lập',
  },

  // ── Nhóm 2: System Prompt Override & Context Poisoning ──
  {
    re: /(?:new\s+)?(?:system\s+)?(?:prompt|instruction)\s*:\s*.{0,200}(?:you\s+are|act\s+as|from\s+now|always)/i,
    label: 'System-prompt-override',
    severity: 'critical',
    description: 'Cố gắng chèn hoặc ghi đè system prompt bằng nội dung tài liệu',
  },
  {
    re: /from\s+now\s+on[,\s]+(?:you\s+are|act\s+as|forget|ignore|your\s+name|you\s+must)/i,
    label: 'From-now-on-override',
    severity: 'critical',
    description: 'Câu lệnh ép thay đổi hành vi và danh tính của model từ điểm này trở đi',
  },
  {
    re: /(?:từ\s+bây\s+giờ|kể\s+từ\s+lúc\s+này)[,\s]+(?:bạn\s+là|hãy\s+đóng\s+vai|bạn\s+phải|hãy\s+quên|tên\s+bạn\s+là)/i,
    label: 'VN-Tu-bay-gio-override',
    severity: 'critical',
    description: 'Chỉ thị Tiếng Việt thay đổi vai trò hoặc hành vi của mô hình từ thời điểm này trở đi',
  },
  {
    re: /(?:chỉ\s+thị|hướng\s+dẫn)\s+hệ\s+thống\s+mới\s*:\s*.{0,150}(?:bạn\s+là|hãy|phải)/i,
    label: 'VN-Chi-thi-he-thong-moi',
    severity: 'critical',
    description: 'Giả mạo chỉ thị hệ thống mới bằng tiếng Việt để lừa mô hình',
  },

  // ── Nhóm 3: Persona Hijacking & Jailbreak Vectors ──
  {
    re: /act\s+as\s+(?:a\s+)?(?:different|new|uncensored|unrestricted|evil|DAN|jailbreak|chaos)/i,
    label: 'Role-jailbreak',
    severity: 'high',
    description: 'Tài liệu yêu cầu model đóng vai nhân vật không bị hạn chế hoặc không kiểm duyệt',
  },
  {
    re: /\bDAN\b|\bDo\s+Anything\s+Now\b|\bAIM\s+mode\b|\bMaximum\s+jailbreak\b/i,
    label: 'DAN-jailbreak',
    severity: 'high',
    description: 'Kỹ thuật jailbreak kinh điển (DAN - Do Anything Now / AIM mode)',
  },
  {
    re: /(?:developer|maintenance|sudo|god)\s+mode\s+(?:is\s+)?(?:enabled|activated|on)/i,
    label: 'Developer-mode-jailbreak',
    severity: 'high',
    description: 'Giả lập chế độ nhà phát triển hoặc chế độ bảo trì để vô hiệu hóa rào cản an toàn',
  },
  {
    re: /hãy\s+đóng\s+vai\s+(?:một\s+)?(?:AI\s+không\s+kiểm\s+duyệt|hacker|nhân\s+vật\s+phản\s+diện|DAN|trợ\s+lý\s+không\s+giới\s+hạn)/i,
    label: 'VN-Dong-vai-khong-kiem-duyet',
    severity: 'high',
    description: 'Yêu cầu đóng vai một AI không bị kiểm duyệt hoặc trợ lý vượt rào an toàn',
  },

  // ── Nhóm 4: Structural & Delimiter Smuggling ──
  {
    re: /\[(?:INST|SYS|SYSTEM|OVERRIDE|HIDDEN|INJECT|ASSISTANT)\]/i,
    label: 'Hidden-tag-injection',
    severity: 'high',
    description: 'Tag đặc biệt [INST], [SYS] thường dùng trong prompt template để chia tách lượt thoại',
  },
  {
    re: /<\/(?:system|instructions?|prompt|context|user)>/i,
    label: 'Closing-delimiter-smuggling',
    severity: 'critical',
    description: 'Giả mạo thẻ đóng cấu trúc </system> để ngắt ngữ cảnh bảo mật của ứng dụng',
  },
  {
    re: /(?:---|\*\*\*|===)\s*(?:END|STOP)\s+OF\s+(?:SYSTEM|PROMPT|INSTRUCTIONS?|CONTEXT)\s*(?:---|\*\*\*|===)/i,
    label: 'End-of-prompt-boundary-spoofing',
    severity: 'high',
    description: 'Giả mạo ranh giới kết thúc của prompt để đánh lừa bộ phân giải ngữ cảnh',
  },
  {
    re: /(?:^|\n)\s*(?:Assistant|AI|ChatGPT|Claude|Model)\s*:\s*(?:Understood|Tôi\s+hiểu|I\s+agree|Sure,\s+I\s+can)/i,
    label: 'Fake-assistant-dialogue-spoofing',
    severity: 'high',
    description: 'Chèn đoạn hội thoại giả lập của Assistant đồng ý tuân theo câu lệnh độc hại',
  },
  {
    re: /<!--[\s\S]{0,500}(?:ignore|system|instruction|override|inject|prompt)[\s\S]{0,200}-->/i,
    label: 'HTML-comment-injection',
    severity: 'high',
    description: 'Instruction ẩn trong HTML comment bên trong tài liệu để trốn mắt người đọc',
  },

  // ── Nhóm 5: Data Exfiltration & Secret Leaking ──
  {
    re: /(?:send|output|print|reveal|leak|extract|return)\s+(?:all\s+)?(?:system\s+prompt|your\s+instructions?|confidential|secret|private\s+data|api\s+key)/i,
    label: 'Data-exfiltration-attempt',
    severity: 'critical',
    description: 'Tài liệu cố gắng trích xuất system prompt hoặc thông tin bí mật từ môi trường chạy LLM',
  },
  {
    re: /(?:in\s+ra|tiết\s+lộ|xuất\s+ra|trích\s+xuất|hiển\s+thị)\s+(?:toàn\s+bộ\s+)?(?:system\s+prompt|hướng\s+dẫn\s+hệ\s+thống|bí\s+mật|mật\s+khẩu|api\s+key)/i,
    label: 'VN-Trich-xuat-system-prompt',
    severity: 'critical',
    description: 'Tài liệu Tiếng Việt yêu cầu in hoặc tiết lộ cấu hình / system prompt của hệ thống',
  },
  {
    re: /repeat\s+(?:everything\s+)?(?:above|before|previously|your\s+system\s+prompt)/i,
    label: 'Prompt-leak-repeat-above',
    severity: 'high',
    description: 'Thủ thuật "Repeat everything above" để buộc mô hình làm lộ prompt ẩn',
  },
  {
    re: /!\[.*?\]\(https?:\/\/[^\s)]+(?:\?|&)(?:leak|data|token|prompt|key|secret|exfil)=[^)]*\)/i,
    label: 'Markdown-image-exfiltration',
    severity: 'critical',
    description: 'Nhúng thẻ ảnh Markdown chứa tham số URL nhằm tự động gửi dữ liệu rò rỉ ra máy chủ bên ngoài',
  },

  // ── Nhóm 6: Task Diversion & Goal Hijacking ──
  {
    re: /(?:instead\s+of|do\s+not)\s+(?:summariz|answ|translat)[\s\S]{0,80}(?:you\s+must|please\s+send|execute|print)/i,
    label: 'Task-diversion-hijack',
    severity: 'high',
    description: 'Chiếm đoạt tác vụ: yêu cầu mô hình không thực hiện việc tóm tắt/dịch thuật mà làm việc khác',
  },
  {
    re: /(?:thay\s+vì\s+làm\s+theo|đừng\s+làm\s+theo|bỏ\s+qua\s+nhiệm\s+vụ)\s+[\s\S]{0,80}(?:hãy\s+làm|thay\s+vào\s+đó\s+hãy|gửi\s+dữ\s+liệu)/i,
    label: 'VN-Chiem-doat-tac-vu',
    severity: 'high',
    description: 'Tài liệu Tiếng Việt yêu cầu bỏ qua nhiệm vụ của người dùng và chuyển sang hành vi độc hại',
  },

  // ── Nhóm 7: Tool/Function Call Injections ──
  {
    re: /(?:call|invoke|execute|run)\s+(?:function|tool|plugin|api)\s*[:("']?\s*(?:send_email|delete|drop|exec|shell|system)/i,
    label: 'Tool-call-injection',
    severity: 'critical',
    description: 'Tài liệu nhúng lệnh gọi tool nguy hiểm (gửi email, lệnh shell, thao tác cơ sở dữ liệu)',
  },

  // ── Nhóm 8: Steganography & Anomaly ──
  {
    re: /(?:\u200B|\u200C|\u200D|\uFEFF|\u00AD){3,}/,
    label: 'Zero-width-char-steganography',
    severity: 'medium',
    description: 'Chuỗi ký tự tàng hình (zero-width) — có thể ẩn giấu câu lệnh độc hại bằng kỹ thuật steganography',
  },
  {
    re: /(?:a{500,}|={500,}|-{500,}|\*{500,})/,
    label: 'Context-padding-attack',
    severity: 'medium',
    description: 'Chuỗi đệm bất thường để đẩy thông tin hướng dẫn của hệ thống ra ngoài cửa sổ ngữ cảnh',
  },
];

module.exports = { IPI_DOC_PATTERNS };
