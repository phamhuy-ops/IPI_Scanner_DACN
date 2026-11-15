// Knowledge base for document-level Indirect Prompt Injection detection.

const IPI_DOC_PATTERNS = [
  // Group 1: Classic and Vietnamese instruction override
  {
    re: /ignore\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+instructions?/i,
    label: 'Ignore-previous-instructions',
    severity: 'critical',
    description: 'Classic "ignore previous instructions" command to cancel system directives',
  },
  {
    re: /disregard\s+(?:all\s+)?(?:previous|prior|your\s+)?(?:instructions?|guidelines?|rules?)/i,
    label: 'Disregard-prior-rules',
    severity: 'critical',
    description: 'Document asks the LLM to ignore prior safety rules or guidelines',
  },
  {
    re: /forget\s+(?:all\s+)?(?:previous|prior|everything\s+you\s+know|your\s+rules)/i,
    label: 'Forget-prior-rules',
    severity: 'critical',
    description: 'Instruction to forget initial system constraints',
  },
  {
    re: /bỏ\s+qua\s+(?:tất\s+cả\s+|mọi\s+)?(?:chỉ\s+dẫn|hướng\s+dẫn|yêu\s+cầu|quy\s+tắc|lệnh)\s+(?:trước|cũ|ban\s+đầu|ở\s+trên)/i,
    label: 'VN-Bo-qua-chi-dan-truoc',
    severity: 'critical',
    description: 'Vietnamese instruction to ignore all prior system rules or guidance',
  },
  {
    re: /không\s+(?:tuân\s+theo|làm\s+theo|thực\s+hiện)\s+(?:các\s+)?(?:chỉ\s+thị|hướng\s+dẫn|câu\s+lệnh)\s+(?:trước|ở\s+trên|của\s+hệ\s+thống)/i,
    label: 'VN-Khong-tuan-theo-chi-thi',
    severity: 'critical',
    description: 'Vietnamese instruction telling the LLM not to follow initial commands',
  },
  {
    re: /quên\s+(?:hết|đi|tất\s+cả)\s+(?:mọi\s+)?(?:chỉ\s+dẫn|ràng\s+buộc|quy\s+định|nhiệm\s+vụ\s+cũ)/i,
    label: 'VN-Quen-moi-rang-buoc',
    severity: 'critical',
    description: 'Vietnamese instruction to forget established safety constraints',
  },

  // Group 2: System prompt override and context poisoning
  {
    re: /(?:new\s+)?(?:system\s+)?(?:prompt|instruction)\s*:\s*.{0,200}(?:you\s+are|act\s+as|from\s+now|always)/i,
    label: 'System-prompt-override',
    severity: 'critical',
    description: 'Attempts to inject or overwrite the system prompt via document content',
  },
  {
    re: /from\s+now\s+on[,\s]+(?:you\s+are|act\s+as|forget|ignore|your\s+name|you\s+must)/i,
    label: 'From-now-on-override',
    severity: 'critical',
    description: 'Forces a change in model identity or behavior from this point forward',
  },
  {
    re: /(?:từ\s+bây\s+giờ|kể\s+từ\s+lúc\s+này)[,\s]+(?:bạn\s+là|hãy\s+đóng\s+vai|bạn\s+phải|hãy\s+quên|tên\s+bạn\s+là)/i,
    label: 'VN-Tu-bay-gio-override',
    severity: 'critical',
    description: 'Vietnamese role or behavior override from this point forward',
  },
  {
    re: /(?:chỉ\s+thị|hướng\s+dẫn)\s+hệ\s+thống\s+mới\s*:\s*.{0,150}(?:bạn\s+là|hãy|phải)/i,
    label: 'VN-Chi-thi-he-thong-moi',
    severity: 'critical',
    description: 'Fake new system instruction in Vietnamese to trick the model',
  },

  // Group 3: Persona hijacking and jailbreak
  {
    re: /act\s+as\s+(?:a\s+)?(?:different|new|uncensored|unrestricted|evil|jailbreak|chaos)/i,
    label: 'Role-jailbreak',
    severity: 'high',
    description: 'Document asks the model to play an unrestricted or uncensored persona',
  },
  {
    // A name or a mention of an acronym alone is not a jailbreak directive.
    // Keep mode activation and explicit persona adoption as prefilter signals.
    re: /\b(?:activate|enable|enter|use|start|switch\s+to)\s+(?:the\s+)?(?:DAN|AIM|maximum\s+jailbreak)\s+mode\b|\b(?:act|behave|respond)\s+as\s+(?:a\s+)?(?:DAN\b(?=\s*(?:[.!:;,(\r\n]|$))|Do\s+Anything\s+Now\b)|\b(?:you\s+are\s+now|become)\s+DAN\b(?=\s*(?:[.!:;,(\r\n]|$))/i,
    label: 'DAN-jailbreak',
    severity: 'high',
    description: 'Directive to activate a jailbreak mode or adopt the DAN / Do Anything Now persona',
  },
  {
    re: /(?:developer|maintenance|sudo|god)\s+mode\s+(?:is\s+)?(?:enabled|activated|on)/i,
    label: 'Developer-mode-jailbreak',
    severity: 'high',
    description: 'Fake developer or maintenance mode to disable safety barriers',
  },
  {
    re: /hãy\s+đóng\s+vai\s+(?:một\s+)?(?:AI\s+không\s+kiểm\s+duyệt|hacker|nhân\s+vật\s+phản\s+diện|DAN|trợ\s+lý\s+không\s+giới\s+hạn)/i,
    label: 'VN-Dong-vai-khong-kiem-duyet',
    severity: 'high',
    description: 'Vietnamese request to role-play an uncensored AI or unsafe assistant',
  },

  // Group 4: Structural and delimiter smuggling
  {
    re: /\[(?:INST|SYS|SYSTEM|OVERRIDE|HIDDEN|INJECT|ASSISTANT)\]/i,
    label: 'Hidden-tag-injection',
    severity: 'high',
    description: 'Special tags like [INST] or [SYS] used to split prompt templates',
  },
  {
    re: /<\/(?:system|instructions?|prompt|context|user)>/i,
    label: 'Closing-delimiter-smuggling',
    severity: 'critical',
    description: 'Fake closing tag such as </system> to break application context',
  },
  {
    re: /(?:---|\*\*\*|===)\s*(?:END|STOP)\s+OF\s+(?:SYSTEM|PROMPT|INSTRUCTIONS?|CONTEXT)\s*(?:---|\*\*\*|===)/i,
    label: 'End-of-prompt-boundary-spoofing',
    severity: 'high',
    description: 'Fake end-of-prompt boundary to confuse context parsing',
  },
  {
    re: /(?:^|\n)\s*(?:Assistant|AI|ChatGPT|Claude|Model)\s*:\s*(?:Understood|Tôi\s+hiểu|I\s+agree|Sure,\s+I\s+can)/i,
    label: 'Fake-assistant-dialogue-spoofing',
    severity: 'high',
    description: 'Injected fake assistant reply agreeing to harmful commands',
  },
  {
    re: /<!--[\s\S]{0,500}(?:ignore|system|instruction|override|inject|prompt)[\s\S]{0,200}-->/i,
    label: 'HTML-comment-injection',
    severity: 'high',
    description: 'Hidden instruction inside an HTML comment in the document',
  },

  // Group 5: Data exfiltration and secret leaking
  {
    re: /(?:send|output|print|reveal|leak|extract|return)\s+(?:all\s+)?(?:system\s+prompt|your\s+instructions?|confidential|secret|private\s+data|api\s+key)/i,
    label: 'Data-exfiltration-attempt',
    severity: 'critical',
    description: 'Attempts to extract system prompt or secrets from the LLM runtime',
  },
  {
    re: /(?:in\s+ra|tiết\s+lộ|xuất\s+ra|trích\s+xuất|hiển\s+thị)\s+(?:toàn\s+bộ\s+)?(?:system\s+prompt|hướng\s+dẫn\s+hệ\s+thống|bí\s+mật|mật\s+khẩu|api\s+key)/i,
    label: 'VN-Trich-xuat-system-prompt',
    severity: 'critical',
    description: 'Vietnamese request to print or reveal system prompt or secrets',
  },
  {
    re: /repeat\s+(?:everything\s+)?(?:above|before|previously|your\s+system\s+prompt)/i,
    label: 'Prompt-leak-repeat-above',
    severity: 'high',
    description: '"Repeat everything above" trick to leak hidden prompt text',
  },
  {
    re: /!\[.*?\]\(https?:\/\/[^\s)]+(?:\?|&)(?:leak|data|token|prompt|key|secret|exfil)=[^)]*\)/i,
    label: 'Markdown-image-exfiltration',
    severity: 'critical',
    description: 'Markdown image URL crafted to exfiltrate data to an external server',
  },

  // Group 6: Task diversion and goal hijacking
  {
    re: /(?:instead\s+of|do\s+not)\s+(?:summariz|answ|translat)[\s\S]{0,80}(?:you\s+must|please\s+send|execute|print)/i,
    label: 'Task-diversion-hijack',
    severity: 'high',
    description: 'Hijacks the user task (e.g. summarize) and redirects to harmful action',
  },
  {
    re: /(?:thay\s+vì\s+làm\s+theo|đừng\s+làm\s+theo|bỏ\s+qua\s+nhiệm\s+vụ)\s+[\s\S]{0,80}(?:hãy\s+làm|thay\s+vào\s+đó\s+hãy|gửi\s+dữ\s+liệu)/i,
    label: 'VN-Chiem-doat-tac-vu',
    severity: 'high',
    description: 'Vietnamese task diversion away from the user goal toward harmful behavior',
  },

  // Group 7: Response manipulation
  // Bounded, line-leading directives: a response target plus a concrete
  // corruption operation or external link. These are review signals, not
  // proof of malicious intent; quoted instructions still need semantic review.
  {
    re: /(?:^|(?<=[\r\n]))[ \t]*(?:please\s+)?(?=(?:use|write|provide|give|render|replace|convert|scramble|reverse|misspell|remove|group|swap|substitute|change)\b)(?=[^\r\n]{0,220}\b(?:your|the)\s+(?:response|answer|reply)\b)(?=[^\r\n]{0,220}(?:\banagrams?\b|\banagrammed\b|\balphanumeric\s+substitution\b|\bROT13\b|\b(?:scramble|reverse|misspell|remove|replace|convert|swap|substitute|group)\b[^\r\n]{0,60}\b(?:vowels?|letters?|spaces?|characters?|words?)\b))[^\r\n]{1,240}/i,
    label: 'Response-text-corruption',
    severity: 'high',
    description: 'Document directs the reader to corrupt the response text or character encoding',
  },
  {
    re: /(?:^|(?<=[\r\n]))[ \t]*(?:please\s+)?(?:append|add|include|insert|embed|integrate)\b(?=[^\r\n]{0,400}\byour\s+(?:response|answer|reply)\b)(?=[^\r\n]{0,400}(?:https?:\/\/|www\.))[^\r\n]{1,420}/i,
    label: 'Response-link-insertion',
    severity: 'high',
    description: 'Document requests inserting an external link into the assistant response',
  },
  {
    re: /(?:^|(?<=[\r\n]))[ \t]*(?:hãy\s+)?(?:đảo\s+(?:thứ\s+tự\s+)?(?:chữ|ký\s+tự)|thay\s+(?:thế\s+)?(?:nguyên\s+âm|chữ\s+cái)|xóa\s+(?:mọi\s+|tất\s+cả\s+)?khoảng\s+trắng)(?=[^\r\n]{0,180}(?:câu\s+trả\s+lời|phản\s+hồi)\s+của\s+bạn)[^\r\n]{1,200}/i,
    label: 'VN-Response-text-corruption',
    severity: 'high',
    description: 'Vietnamese instruction to alter characters or remove spaces from the assistant response',
  },

  // Group 8: Tool and function call injection
  {
    re: /(?:call|invoke|execute|run)\s+(?:function|tool|plugin|api)\s*[:("']?\s*(?:send_email|delete|drop|exec|shell|system)/i,
    label: 'Tool-call-injection',
    severity: 'critical',
    description: 'Dangerous tool calls embedded in the document (shell, email, database)',
  },

  // Group 9: Steganography and anomalies
  {
    re: /(?:\u200B|\u200C|\u200D|\uFEFF|\u00AD){3,}/,
    label: 'Zero-width-char-steganography',
    severity: 'medium',
    description: 'Long run of zero-width characters that may hide commands',
  },
  {
    re: /(?:a{500,}|={500,}|-{500,}|\*{500,})/,
    label: 'Context-padding-attack',
    severity: 'medium',
    description: 'Abnormal padding meant to push system instructions out of context window',
  },
];

module.exports = { IPI_DOC_PATTERNS };
