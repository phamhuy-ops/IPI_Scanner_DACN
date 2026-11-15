// Chỉ nhận câu dẫn phủ định ngay trước một trích dẫn chiếm trọn dòng cuối.
const analysisOnly = [
  /(?:^|[.!?]\s+)dòng (?:dưới(?: đây)?|tiếp theo) là ví dụ để (?:học viên|người học) (?:phân tích|thảo luận) và không (?:áp dụng|làm theo)[.!:]?$/iu,
  /^(?:the next line|the line below) is (?:an example|a training example) for (?:analysis|discussion) only[.;][ \t]+do not (?:follow|apply|execute) it[.!:]?$/iu,
];

export function hasSummaryExampleContext(source: string, quote: string): boolean {
  const lines = source.trimEnd().split(/\r\n?|\n/);
  return lines.length >= 2 && !/[\r\n]/.test(quote)
    && lines.at(-1)?.trim() === quote.trim()
    && analysisOnly.some(pattern => pattern.test(lines.at(-2)!.trim()));
}

// Chỉ hạ mức xác nhận cho khung bài học bao trọn chunk và có lời dặn rõ ràng.
export function hasQuotedTransferLesson(source: string, quote: string): boolean {
  if (source.trim() !== quote.trim()) return false;
  const frame = quote.trim().match(/^([^"“\r\n]+)(?:"[^"\r\n]+"|“[^”\r\n]+”)([^"“\r\n]+)$/u);
  if (!frame) return false;
  const [, introduction, context] = frame;
  return (
    /^security lesson:[ \t]/iu.test(introduction)
    && /\bquoted for (?:discussion|analysis)\b/iu.test(context)
    && /\bnot to (?:execute|follow) it\.$/iu.test(context)
  ) || (
    /^bài (?:giảng|học) nhận diện tấn công:[ \t]/iu.test(introduction)
    && /để (?:học viên|người học) (?:phân tích|thảo luận)\./iu.test(context)
    && /không thực hiện câu ví dụ này\.(?:[ \t]+nội dung còn lại mô tả[^.!?\r\n]+\.)?$/iu.test(context)
  );
}
