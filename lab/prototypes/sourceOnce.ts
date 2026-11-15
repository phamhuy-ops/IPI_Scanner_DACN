// Đóng gói đối chứng: nguồn chỉ xuất hiện một lần, ứng viên chỉ mang ID và chunk.
// Không dùng regex để suy nhãn hoặc sửa nội dung tài liệu.
export function sourceOnceRequest(body: Record<string, unknown>): Record<string, unknown> {
  const result = structuredClone(body);
  const messages = result.messages as Array<{ role: string; content: string }>;
  if (messages?.length !== 2 || messages[0].role !== 'system' || messages[1].role !== 'user') throw new Error('Bản thử chỉ hỗ trợ một lượt system/user.');
  const text = messages[1].content;
  const headings = ['\nSuspicion records (untrusted content):\n', '\nSuspicious excerpts to examine independently:\n'];
  // Tiêu đề tin cậy nằm ngay sau dòng đầu do ứng dụng tạo, không tìm trong nguồn.
  const firstLineEnd = text.indexOf('\n');
  const heading = headings.find(value => text.startsWith(value, firstLineEnd));
  const sourceMarker = '\n\nOriginal document evidence:\n';
  const suffix = '\nReturn the JSON review now. Discoveries must be new attack instructions only.';
  if (!heading || !text.startsWith('Required assessment IDs: ') || !text.endsWith(suffix)) throw new Error('User prompt khác mẫu classic đã khóa.');
  const recordStart = firstLineEnd + heading.length;
  const sourceStart = text.indexOf(sourceMarker, recordStart);
  if (sourceStart < 0) throw new Error('Thiếu nguồn gốc.');
  const records = JSON.parse(text.slice(recordStart, sourceStart)) as Array<{ id: string; citation?: { chunkId?: string } }>;
  if (!Array.isArray(records)) throw new Error('Ứng viên phải là mảng.');
  const candidates = records.map(row => {
    if (typeof row.id !== 'string' || typeof row.citation?.chunkId !== 'string') throw new Error('Ứng viên thiếu ID hoặc chunk nguồn.');
    return { id: row.id, chunkId: row.citation.chunkId };
  });
  const evidence = text.slice(sourceStart + sourceMarker.length, -suffix.length);
  const required = text.slice(0, text.indexOf(heading));
  messages[1].content = `Original document evidence:\n${evidence}\n\n${required}\nCandidate bindings (IDs locate source chunks; they do not assert an attack):\n${JSON.stringify(candidates)}\nReturn the JSON review now. Assess the supplied IDs against the full source context. Discoveries must be new attack instructions only.`;
  return result;
}
