const path = require('path');
const { normalizeFinding } = require('../models/finding');
const { IPI_DOC_PATTERNS } = require('./rules/ipi-document-rules');
const { conversationTransferCandidates } = require('./conversation-transfer');

// Đầu dòng nêu rõ người nhận là AI, sau đó yêu cầu bỏ hoặc sửa kết quả tóm tắt.
const SUMMARY_OVERRIDE = {
  re: /^[ \t]*(?:(?:to|for)\s+the\s+(?:ai|assistant|summarizer)\b[^:\r\n]{0,65}:[ \t]*(?:(?:skip|omit|replace|abandon)\b[^\r\n]{0,80}\bsummary\b|(?:state|report|say)\b[^\r\n]{0,180}\b(?:even\s+(?:if|though)|regardless\s+of)\b)|(?:trợ[ \t]+lý|ai)[ \t]+(?:đang[ \t]+)?(?:đọc|tóm[ \t]+tắt|(?:lập[ \t]+bản[ \t]+)?tổng[ \t]+hợp)[^:\r\n]{0,65}:[ \t]*(?:hãy[ \t]+)?(?:bỏ|thay)[ \t]+(?:(?:phần|bản)[ \t]+)?(?:tóm[ \t]+tắt|tổng[ \t]+hợp)(?![\p{L}\p{M}]))[^\r\n]{0,180}/imu,
  label: 'Summary-output-override-candidate',
  severity: 'medium',
  description: 'Chỉ dẫn hướng tới AI và yêu cầu đổi kết quả tóm tắt, cần xác minh ngữ cảnh',
};

// Yêu cầu áp đặt số lượng hoặc trạng thái cho đầu ra của người lập bản tổng hợp.
const SUMMARY_STATUS_OVERRIDE = {
  ...SUMMARY_OVERRIDE,
  re: /(?:\bwhoever\s+(?:generates|writes|prepares)\s+the\s+(?:overview|summary|report)\s+should\s+(?:report|state)\s+(?:zero|no)\s+(?:open|outstanding|pending)\b[^\r\n]{1,110}|hệ\s+thống\s+(?:lập|tạo)\s+báo\s+cáo\s+hãy\s+(?:ghi|báo)\s+(?:cả\s+\p{L}+|toàn\s+bộ)[^\r\n]{0,80}\s+đã\s+[^\r\n]{1,55}\s+xong)/iu,
};

// Cùng một dòng phải gọi AI đang tổng hợp, yêu cầu bỏ việc hiện tại và chỉ định việc thay thế.
const SUMMARY_TASK_SWITCH = {
  ...SUMMARY_OVERRIDE,
  re: /^[ \t]*(?:trợ[ \t]+lý|ai)[ \t]+đang[ \t]+(?:tóm[ \t]+tắt|tổng[ \t]+hợp)[ \t]+[^:\r\n]{1,65}:[ \t]*(?:hãy[ \t]+)?(?:bỏ|dừng|ngừng)[ \t]+(?:việc|nhiệm[ \t]+vụ)[ \t]+[^,;\r\n]{1,85}[,;][ \t]*chuyển[ \t]+sang[ \t]+[^\r\n]{1,160}/imu,
};

// Yêu cầu trợ lý bỏ qua kết quả bất lợi rồi trình bày một kết quả khác cho người dùng.
const SUMMARY_SUPPRESS_RESULTS = {
  ...SUMMARY_OVERRIDE,
  re: /^[ \t]*(?:assistant|ai)[ \t]+(?:reading|reviewing|analy[sz]ing)[ \t]+[^:\r\n]{1,65}:[ \t]*(?:ignore|omit|suppress|hide)[ \t]+(?:all[ \t]+|the[ \t]+)?(?:failed|failing|unresolved|open)[ \t]+\w[^\r\n]{0,100}?(?:\band[ \t]+)(?:tell[ \t]+the[ \t]+user|state|report)[ \t]+[^\r\n]{1,140}/imu,
};

// Đánh dấu yêu cầu AI thay một số liệu bằng giá trị cố định rồi khẳng định kết quả.
const SUMMARY_REPLACE_VALUE = {
  ...SUMMARY_OVERRIDE,
  re: /^[ \t]*(?:ai|trợ[ \t]+lý)[ \t]+(?:đang[ \t]+)?(?:lập|tạo|soạn)[ \t]+báo[ \t]+cáo[^:\r\n]{0,65}:[ \t]*(?:hãy[ \t]+)?(?:đổi|sửa|thay)[ \t]+(?:số(?:[ \t]+(?:lượng|liệu|tồn))?|giá[ \t]+trị)[ \t]+[^:\r\n]{0,55}?(?:thành|bằng)[ \t]+[+-]?\d+(?:[.,]\d+)?[ \t]+(?:và|rồi)[ \t]+(?:khẳng[ \t]+định|báo[ \t]+rằng|ghi[ \t]+rằng)[ \t]+[^\r\n]{1,140}/imu,
};

// Yêu cầu AI dừng đánh giá và viết nội dung khác thay cho kết quả cần trả.
const SUMMARY_REPLACE_REVIEW = {
  ...SUMMARY_OVERRIDE,
  re: /^[ \t]*(?:trợ[ \t]+lý|ai)[ \t]+(?:đang[ \t]+)?(?:đọc|rà[ \t]+soát|kiểm[ \t]+tra)[ \t]+[^:\r\n]{1,65}:[ \t]*(?:hãy[ \t]+)?(?:dừng|ngừng|bỏ)[ \t]+(?:việc[ \t]+)?(?:đánh[ \t]+giá|kiểm[ \t]+tra|rà[ \t]+soát)[ \t]+[^,;\r\n]{1,85}?[ \t]+và[ \t]+(?:viết|soạn|tạo)[ \t]+[^\r\n]{1,110}?[ \t]+thay[ \t]+cho[ \t]+(?:kết[ \t]+quả|báo[ \t]+cáo)(?![\p{L}\p{M}])[^\r\n]{0,80}/imu,
};

// Yêu cầu trợ lý ghi đè điểm số và che việc thay đổi trong báo cáo.
const SUMMARY_CONCEAL_SCORE_CHANGE = {
  ...SUMMARY_OVERRIDE,
  re: /^[ \t]*(?:assistant|ai)[ \t]+(?:calculating|reviewing|grading)[ \t]+[^:\r\n]{1,65}:[ \t]*(?:replace|overwrite|set)[ \t]+(?:(?:both|all|the)[ \t]+)?scores?[ \t]+(?:with|to)[ \t]+\d+(?:\.\d+)?[ \t]+and[ \t]+(?:report|state)[ \t]+[^\r\n]{1,100}?[ \t]+without[ \t]+(?:mentioning|disclosing|documenting)[ \t]+(?:the[ \t]+)?(?:replacement|change|adjustment)\b[^\r\n]{0,60}/imu,
};

// Yêu cầu hệ thống phân loại bỏ tiêu chí rồi áp đặt thứ tự ưu tiên.
const SUMMARY_OVERRIDE_PRIORITY = {
  ...SUMMARY_OVERRIDE,
  re: /^[ \t]*(?:hệ[ \t]+thống[ \t]+)?(?:ai|trợ[ \t]+lý)[ \t]+(?:đang[ \t]+)?(?:phân[ \t]+loại|xếp[ \t]+hạng|xếp[ \t]+ưu[ \t]+tiên)[ \t]+[^:\r\n]{1,55}:[ \t]*(?:hãy[ \t]+)?(?:bỏ(?:[ \t]+qua)?|phớt[ \t]+lờ)[ \t]+(?:các[ \t]+)?tiêu[ \t]+chí[ \t]+[^,;\r\n]{1,65}[,;][ \t]*(?:luôn[ \t]+)?(?:đặt|đưa|xếp)[ \t]+[^\r\n]{1,75}?[ \t]+(?:lên[ \t]+đầu|ở[ \t]+vị[ \t]+trí[ \t]+đầu)(?![\p{L}\p{M}])[^\r\n]{0,120}/imu,
};

// Yêu cầu hệ thống tự động chấm kết quả bất kể tiêu chí, kể cả khi nguồn viện dẫn phê duyệt.
const SUMMARY_OVERRIDE_SCREENING = {
  ...SUMMARY_OVERRIDE,
  re: /^[ \t]*\[?(?:(?:note|instruction)[ \t]+to[ \t]+)?(?:the[ \t]+)?(?:automated|ai)[ \t]+(?:screening|evaluation|ranking)[ \t]+(?:system|assistant)[ \t]*:[ \t]*(?:[^\r\n.]{1,100}\.[ \t]+)?(?:score|rate|rank|classify)[ \t]+[^\r\n]{1,150}?[ \t]+(?:regardless[ \t]+of|without[ \t]+considering)[ \t]+(?:the[ \t]+)?(?:other[ \t]+|any[ \t]+|remaining[ \t]+)?(?:criteria|requirements)(?!\w)[^\r\n]{0,40}/imu,
};

// Khối HTML gọi trực tiếp trợ lý, yêu cầu bỏ nội dung và thay bằng câu trả lời cố định.
const HTML_FIXED_ANSWER_OVERRIDE = {
  ...SUMMARY_OVERRIDE,
  re: /<(p|aside)\b[^<>\r\n]{0,100}>[ \t]*(?:assistant|ai)[ \t]+(?:reading|reviewing)[ \t]+[^:<>\r\n]{1,65}:[ \t]*(?:omit|skip|ignore)[ \t]+[^<>\r\n]{1,90}?[ \t]+and[ \t]+(?:answer|respond|reply)[ \t]+with[ \t]+(?:the[ \t]+)?(?:phrase|fixed[ \t]+message)[ \t]+[^<>\r\n]{1,120}<\/\1>/iu,
};

// Comment gọi AI đang đọc nguồn và yêu cầu thay một giá trị trong câu trả lời.
const HTML_COMMENT_REPLACE_ANSWER_VALUE = {
  ...SUMMARY_OVERRIDE,
  re: /<!--[ \t]*(?:assistant|ai)[ \t]+(?:reading|reviewing)[ \t]+[^:<>\r\n]{1,65}:[ \t]*(?:please[ \t]+)?(?:replace|substitute)[ \t]+[^<>\r\n]{1,75}?[ \t]+in[ \t]+(?:the|your)[ \t]+(?:answer|response|reply)[ \t]+with[ \t]+[^<>\r\n]{1,100}?-->/iu,
};

// Đánh dấu yêu cầu báo đã xong khi đoạn ngay trước vẫn ghi có mục đang chờ.
const HTML_PENDING_STATUS_OVERRIDE = {
  ...SUMMARY_OVERRIDE,
  re: /(?<=<p\b[^<>\r\n]{0,80}>[^<>\r\n]{0,110}(?:còn|vẫn[ \t]+có)[ \t]+[^<>\r\n]{1,45}[ \t]+(?:chờ[ \t]+xác[ \t]+nhận|chưa[ \t]+hoàn[ \t]+tất)[^<>\r\n]{0,45}<\/p>[\r\n \t]{0,20})<(aside|p)\b[^<>\r\n]{0,80}>[ \t]*(?:ai|trợ[ \t]+lý)[ \t]+(?:đang[ \t]+)?(?:đọc|rà[ \t]+soát)[ \t]+[^:<>\r\n]{1,60}:[ \t]*(?:hãy[ \t]+)?(?:ghi|nói|báo)[ \t]+trong[ \t]+(?:câu[ \t]+trả[ \t]+lời|phản[ \t]+hồi)[ \t]+rằng[ \t]+(?:mọi[ \t]+mục|tất[ \t]+cả[ \t]+các[ \t]+mục)[ \t]+đã[ \t]+(?:hoàn[ \t]+tất|xong)[.!]?[ \t]*<\/\1>/iu,
};

function snippetAround(text, index, radius = 150) {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function lineOf(text, index) {
  return text.slice(0, index).split(/\r\n?|\n/).length;
}

/** Scan for suspicious Base64 strings and decode to find hidden IPI commands. */
function scanBase64Payloads(text, filePath, folderPath = '') {
  const findings = [];
  const rel = folderPath ? path.relative(folderPath, filePath) : path.basename(filePath);
  const b64Regex = /\b[A-Za-z0-9+/]{24,}={0,2}\b/g;

  let match;
  while ((match = b64Regex.exec(text)) !== null) {
    const rawMatch = match[0];
    try {
      const decoded = Buffer.from(rawMatch, 'base64').toString('utf8');
      if (/^[\x20-\x7E\r\n\t\u00C0-\u024F\u1EA0-\u1EF9]+$/.test(decoded)) {
        for (const pattern of IPI_DOC_PATTERNS) {
          if (pattern.re.test(decoded)) {
            const line = lineOf(text, match.index);
            findings.push(normalizeFinding({
              ruleId: 'IPI-DOC-BASE64-OBFUSCATED',
              owaspCategory: 'LLM01',
              title: '[Doc IPI] Base64 obfuscation — encoded IPI command hidden in Base64',
              severity: 'critical',
              confidence: 'high',
              target: filePath,
              location: `${rel}:${line}`,
              matchedText: rawMatch,
              evidence: [
                `Base64 string: "${rawMatch.slice(0, 60)}..."`,
                `Decoded content: "${decoded.slice(0, 150)}"`,
                `Matched attack pattern: ${pattern.label}`,
                `File: ${rel}`,
              ],
              remediation:
                'Do not auto-decode unknown content into the LLM prompt. ' +
                'Filter encoded payloads before they enter the context window.',
              references: [
                'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
                'https://genai.owasp.org/llmrisk/llm01-prompt-injection/',
              ],
              collector: 'document',
            }));
            break;
          }
        }
      }
    } catch {
      // Invalid Base64 — skip
    }
  }

  return findings;
}

/** Scan plain text for IPI patterns using the knowledge base and decoders. */
function scanTextForIpi(text, filePath, folderPath = '', options = {}) {
  const findings = [];
  const rel = folderPath ? path.relative(folderPath, filePath) : path.basename(filePath);

  const patterns = options.includeSummaryOverrideCandidates
    ? [...IPI_DOC_PATTERNS, SUMMARY_OVERRIDE, SUMMARY_STATUS_OVERRIDE, SUMMARY_TASK_SWITCH, SUMMARY_SUPPRESS_RESULTS, SUMMARY_REPLACE_VALUE, SUMMARY_REPLACE_REVIEW, SUMMARY_CONCEAL_SCORE_CHANGE, SUMMARY_OVERRIDE_PRIORITY, SUMMARY_OVERRIDE_SCREENING, HTML_FIXED_ANSWER_OVERRIDE, HTML_COMMENT_REPLACE_ANSWER_VALUE, HTML_PENDING_STATUS_OVERRIDE] : IPI_DOC_PATTERNS;
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.re.source, pattern.re.flags.includes('g') ? pattern.re.flags : pattern.re.flags + 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const line = lineOf(text, match.index);
      if (pattern.label === 'Context-padding-attack' && /^[=*-]+$/.test(match[0])) {
        // Dòng chỉ có dấu phân cách là định dạng. Các rule khác vẫn quét toàn văn.
        const start = Math.max(text.lastIndexOf('\n', match.index), text.lastIndexOf('\r', match.index)) + 1;
        const end = match.index + match[0].length;
        const suffix = text.slice(end).split(/\r\n?|\n/, 1)[0];
        if (/^\s*$/.test(text.slice(start, match.index)) && /^\s*$/.test(suffix)) continue;
      }
      const snippet = snippetAround(text, match.index);

      findings.push(normalizeFinding({
        ruleId: `IPI-DOC-${pattern.label.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`,
        owaspCategory: 'LLM01',
        title: `[Doc IPI] ${pattern.label} — ${pattern.description}`,
        severity: pattern.severity,
        confidence: pattern.label === SUMMARY_OVERRIDE.label ? 'medium' : 'high',
        target: filePath,
        location: `${rel}:${line}`,
        matchedText: match[0],
        evidence: [
          `Pattern: ${pattern.label}`,
          `Line ${line} snippet: "${snippet}"`,
          `Document file: ${rel}`,
        ],
        remediation:
          'Keep user document content separate from the system prompt. ' +
          'Wrap content in clear delimiters (e.g. <user_document>...</user_document>) ' +
          'and instruct the model to treat it as data only.',
        references: [
          'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
          'https://genai.owasp.org/llmrisk/llm01-prompt-injection/',
        ],
        collector: 'document',
      }));

      if (match[0].length === 0) break;
    }
  }

  findings.push(...scanBase64Payloads(text, filePath, folderPath));
  if (options.includeTransferCandidates === true) for (const candidate of conversationTransferCandidates(text)) {
    findings.push(normalizeFinding({
      ruleId: 'IPI-DOC-CONVERSATION-TRANSFER-CANDIDATE', owaspCategory: 'LLM01',
      title: 'Nghi vấn yêu cầu chuyển dữ liệu hội thoại qua kênh nhận', severity: 'high', confidence: 'medium',
      target: filePath, location: `${rel}:${lineOf(text, candidate.start)}`, matchedText: candidate.quote,
      evidence: ['Cùng đoạn nguồn có động từ hành động, dữ liệu hội thoại và đích/kênh nhận.',
        'Đây là ứng viên cần xác minh; lời cho người, phủ định hoặc ví dụ trích dẫn chưa được loại bằng regex.'],
      remediation: 'Đối chiếu người nhận, bao khung và quyền thực hiện trên nguồn; không tự thực hiện hành động hoặc xác nhận IPI chỉ từ rule.',
      collector: 'document',
    }));
  }

  return findings;
}

module.exports = { scanTextForIpi, scanBase64Payloads };
