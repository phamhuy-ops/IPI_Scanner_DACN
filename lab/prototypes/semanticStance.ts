// Chỉ đổi tên enum trên dây truyền của bản thử; không sửa nguồn hoặc suy stance từ reason.
const NAMES = { confirmed: 'active_ai_redirection', dismissed: 'ordinary_source_content', uncertain: 'insufficient_source_context' } as const;
type Stance = keyof typeof NAMES;

export function semanticStanceRequest(body: Record<string, unknown>): Record<string, unknown> {
  const result = structuredClone(body);
  const messages = result.messages as Array<{ role: string; content: string }>;
  if (messages?.length !== 2 || messages[0].role !== 'system' || messages[1].role !== 'user') throw new Error('Bản thử yêu cầu đúng system/user.');
  // Chỉ system là chỉ dẫn đáng tin; không replace trong user chứa nguyên văn tài liệu.
  for (const [before, after] of Object.entries(NAMES)) messages[0].content = messages[0].content.replace(new RegExp(`\\b${before}\\b`, 'g'), after);
  const format = result.response_format as { type?: string; json_schema?: { schema?: unknown } };
  if (format?.type !== 'json_schema' || !format.json_schema?.schema) throw new Error('Thiếu schema để đối chứng enum.');
  let changed = 0;
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return;
    const row = value as Record<string, unknown>;
    const fields = row.properties as Record<string, { enum?: string[] }> | undefined;
    if (fields?.stance?.enum) {
      fields.stance.enum = fields.stance.enum.map(name => {
        if (!Object.hasOwn(NAMES, name)) throw new Error('Enum stance ngoài classic-v1.');
        return NAMES[name as Stance];
      }); changed++;
    }
    for (const child of Object.values(row)) visit(child);
  }
  visit(format.json_schema.schema);
  if (!changed) throw new Error('Không có stance trong schema.');
  return result;
}

export function semanticStanceResponse(raw: string): string {
  const envelope = JSON.parse(raw);
  const message = envelope.choices?.[0]?.message;
  if (typeof message?.content !== 'string') throw new Error('Thiếu nội dung response A/B.');
  const review = JSON.parse(message.content);
  if (!Array.isArray(review.assessments) || !Array.isArray(review.discoveries)) throw new Error('Thiếu mảng nhận định.');
  for (const row of [...review.assessments, ...review.discoveries]) {
    const stance = (Object.keys(NAMES) as Stance[]).find(key => NAMES[key] === row.stance);
    if (!stance) throw new Error('Stance response không thuộc enum đã giao.');
    row.stance = stance;
  }
  message.content = JSON.stringify(review);
  return JSON.stringify(envelope);
}
