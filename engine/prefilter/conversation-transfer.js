// Chỉ tạo ứng viên: cần đồng thời hành động, dữ liệu hội thoại và đích/kênh nhận.
// Không suy quyền, người nhận hoặc bao khung chỉ từ regex; hai Agent phải đối chiếu nguồn.
const ACTION = /\b(?:send|email|transmit|upload|post|forward|transfer|append|insert|embed|attach|include|add)\b|(?:gửi|chuyển|đăng|tải\s+lên|chèn|đính\s+kèm|sao[ \t]+chép)/giu;
// Chỉ dẫn lấy dữ liệu riêng từ hội thoại và công bố trong câu trả lời.
const PRIVATE_REPLY = /^[ \t]*(?:trợ[ \t]+lý|ai)[ \t]+[^:\r\n]{1,65}:[ \t]*(?:hãy[ \t]+)?(?:lấy|trích)[ \t]+(?:(?:các|những)[ \t]+)?(?:ghi[ \t]+chú|nội[ \t]+dung)[ \t]+riêng[ \t]+(?:trong|từ)[ \t]+(?:hội[ \t]+thoại|cuộc[ \t]+trò[ \t]+chuyện)[^\r\n]{0,60}?[ \t]+(?:và|rồi)[ \t]+(?:đưa|chép)[ \t]+(?:nguyên[ \t]+văn[ \t]+)?vào[ \t]+(?:câu[ \t]+trả[ \t]+lời|phản[ \t]+hồi)(?![\p{L}\p{M}])[^\r\n]{0,100}/gimu;
const DATA = /\b(?:conversation|chat|dialogue|chatlog|messages?|system\s+prompt|private\s+context)\b|(?:hội\s+thoại|trò\s+chuyện|tin\s+nhắn|prompt\s+hệ\s+thống)/iu;
const DESTINATION = /https?:\/\/[^\s<>"']+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:e-?mail|webhook|callback|endpoint|url|query\s+(?:string|parameter)|tracking\s+image)\b|(?:địa\s+chỉ|liên\s+kết|hộp\s+thư)/iu;

function isDirectedAction(content, index) {
  const before = content.slice(Math.max(0, index - 180), index);
  const after = content.slice(index, index + 120);
  // Chỉ xét dấu hiệu quá khứ ngay trước động từ đang kiểm tra.
  if (/(?:\b(?:did|already)\s+|(?:^|[^\p{L}\p{N}])đã\s+)$/iu.test(before)) return false;
  // Các cụm danh từ chỉ địa chỉ liên hệ không biểu thị hành động gửi.
  if (/^email\b/iu.test(after) && (/\bcontact\s+$/iu.test(before) || /^email\s+address\b/iu.test(after))) return false;
  // Chỉ loại phủ định của chính hành động, không loại do chữ "không" ở nơi khác.
  if (/\b(?:never|do\s+not|don't|must\s+not|should\s+not|cannot|can't)\s+(?:\w+\s+){0,3}$/iu.test(before) ||
      /\bnot\s+(?:assigned|asked|authorized|instructed|requested)\s+to\s*$/iu.test(before) ||
      /\b(?:does|do|did)\s+not\s+(?:ask|request|instruct|tell)\b[^.!?\n]{0,140}$/iu.test(before) ||
      /(?:không|đừng|chớ)\s+(?:được\s+|bao\s+giờ\s+)?$/iu.test(before)) return false;
  const recipient = /\b(?:assistant|AI\s+agent|chatbot|language\s+model)\b|(?:trợ\s+lý|mô\s+hình\s+ngôn\s+ngữ)/iu.test(before);
  const output = /\byour\s+(?:next\s+)?(?:response|answer|reply)\b|\b(?:to|before)\s+(?:finish|finishing|compose|composing|write|writing)\s+(?:the|your)\s+(?:reply|answer|response)\b|(?:câu\s+trả\s+lời|phản\s+hồi)\s+của\s+bạn|trước\s+khi\s+trả\s+lời/iu.test(before + after);
  if (!recipient && !output) return false;
  // Ví dụ được trích rõ và có lệnh không thực thi: không nâng thành ứng viên hoạt động.
  const quotes = [...content.slice(0, index).matchAll(/"/g)];
  if (quotes.length % 2 === 1) {
    const opening = quotes[quotes.length - 1].index;
    const closing = content.indexOf('"', index);
    const framing = content.slice(Math.max(0, opening - 100), opening);
    if (closing >= 0 && /(?:quoted\s+(?:attack\s+)?example|ví\s+dụ\s+(?:được\s+)?trích\s+dẫn)/iu.test(framing) &&
        /(?:must\s+not\s+be\s+executed|do\s+not\s+execute|for\s+(?:study|analysis)|không\s+thực\s+thi)/iu.test(content.slice(closing + 1))) return false;
  }
  return true;
}

function conversationTransferCandidates(text) {
  const candidates = [];
  const seen = new Set();
  for (const paragraph of text.matchAll(/\S[\s\S]*?(?=\r?\n[ \t]*\r?\n|$)/g)) {
    const content = paragraph[0];
    for (const action of content.matchAll(new RegExp(ACTION.source, ACTION.flags))) {
      if (!isDirectedAction(content, action.index)) continue;
      // Sao chép tại chỗ không phải chuyển dữ liệu. Yêu cầu đối tượng và đích trên cùng dòng.
      if (/^sao[ \t]+chép$/iu.test(action[0])) {
        const tail = content.slice(action.index + action[0].length).split(/\r\n?|\n/, 1)[0].slice(0, 240);
        const transfer = tail.match(/^[ \t]+(.+?)[ \t]+(?:tới|đến|vào|sang)[ \t]+(.+)$/iu);
        if (!transfer || !DATA.test(transfer[1]) || !DESTINATION.test(transfer[2])) continue;
      }
      const from = content.length <= 640 ? 0 : Math.max(0, action.index - 120);
      const to = content.length <= 640 ? content.length : Math.min(content.length, action.index + 520);
      const quote = content.slice(from, to);
      if (!DATA.test(quote) || !DESTINATION.test(quote)) continue;
      const start = paragraph.index + from, end = paragraph.index + to;
      const key = `${start}:${end}`;
      if (!seen.has(key)) {
        seen.add(key); candidates.push({ start, end, quote });
      }
    }
  }
  for (const match of text.matchAll(PRIVATE_REPLY)) {
    const start = match.index;
    const end = start + match[0].length;
    if (candidates.some(candidate => candidate.start <= start && candidate.end >= end)) continue;
    candidates.push({ start, end, quote: match[0] });
  }
  return candidates;
}
module.exports = { conversationTransferCandidates };
