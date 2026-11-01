import { ClassifierSource, SourceTokenizer, SourceWindow } from './contracts';

function boundary(text: string, at: number): boolean {
  return !(at > 0 && at < text.length && /[\uD800-\uDBFF]/.test(text[at - 1]) && /[\uDC00-\uDFFF]/.test(text[at]));
}
function integer(value: number, min: number): boolean { return Number.isSafeInteger(value) && value >= min; }

export function sourceWindows(source: ClassifierSource, tokenizer: SourceTokenizer, maxInputTokens: number, overlapTokens: number): SourceWindow[] {
  if (!source.sourceId || !source.filePath || !source.sourceView || typeof source.text !== 'string' || !integer(source.startLine, 1) ||
      !integer(maxInputTokens, 1) || !integer(overlapTokens, 0) || overlapTokens >= maxInputTokens) throw new Error('Nguồn hoặc ngân sách token không hợp lệ.');
  if (!source.text.length) return [];
  const offsets = tokenizer.offsets(source.text);
  let previous = { start: 0, end: 0 };
  for (const token of offsets) {
    if (!integer(token.start, 0) || !integer(token.end, 1) || token.end <= token.start || token.end > source.text.length ||
        token.start < previous.start || token.end < previous.end || !boundary(source.text, token.start) || !boundary(source.text, token.end)) {
      throw new Error('Tokenizer trả offset sai hoặc khác hệ tọa độ UTF-16.');
    }
    previous = token;
  }
  const count = (text: string) => {
    const tokens = tokenizer.countInputTokens(text);
    if (!integer(tokens, 0)) throw new Error('Tokenizer trả số token không hợp lệ.');
    return tokens;
  };
  const window = (start: number, end: number, index: number): SourceWindow => {
    const text = source.text.slice(start, end);
    const startLine = source.startLine + (source.text.slice(0, start).match(/\n/g)?.length || 0);
    // Ký tự xuống dòng cuối nằm ở dòng trước, không tạo dòng bằng chứng giả.
    const endLine = startLine + (text.replace(/\n$/, '').match(/\n/g)?.length || 0);
    return { id: `window-${index + 1}`, startOffset: start, endOffset: end, startLine, endLine, text, inputTokens: count(text) };
  };
  if (!offsets.length) {
    if (source.text.trim()) throw new Error('Tokenizer không trả offset cho nguồn có nội dung.');
    const only = window(0, source.text.length, 0);
    if (only.inputTokens > maxInputTokens) throw new Error('Không thể chia nguồn không có offset trong ngân sách.');
    return [only];
  }
  const windows: SourceWindow[] = [];
  let tokenStart = 0;
  let previousEnd = 0;
  while (tokenStart < offsets.length) {
    const start = !windows.length ? 0 : overlapTokens ? offsets[tokenStart].start : previousEnd;
    let tokenEnd = Math.min(offsets.length, tokenStart + maxInputTokens);
    let current: SourceWindow;
    for (;;) {
      const end = tokenEnd === offsets.length ? source.text.length : offsets[tokenEnd - 1].end;
      current = window(start, end, windows.length);
      if (current.inputTokens <= maxInputTokens) break;
      if (--tokenEnd <= tokenStart) throw new Error('Một đơn vị nguồn vượt ngân sách; không cắt ngầm văn bản.');
    }
    if (current.endOffset <= start) throw new Error('Cửa sổ không tiến triển.');
    windows.push(current);
    if (tokenEnd === offsets.length) break;
    if (tokenEnd - tokenStart <= overlapTokens) throw new Error('Overlap quá lớn so với payload thực sau special tokens.');
    previousEnd = current.endOffset;
    tokenStart = tokenEnd - overlapTokens;
  }
  return windows;
}

export function coveredCharacters(windows: Array<{ startOffset: number; endOffset: number }>): number {
  let end = 0;
  let count = 0;
  for (const row of [...windows].sort((a, b) => a.startOffset - b.startOffset)) {
    count += Math.max(0, row.endOffset - Math.max(end, row.startOffset));
    end = Math.max(end, row.endOffset);
  }
  return count;
}
