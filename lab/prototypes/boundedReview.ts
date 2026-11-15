// Đối chứng ngân sách văn bản giải thích; không cắt hoặc giới hạn quote nguồn.
export function boundedReviewRequest(body: Record<string, unknown>): Record<string, unknown> {
  const result = structuredClone(body);
  const format = result.response_format as { type?: string; json_schema?: { schema?: unknown } };
  if (format?.type !== 'json_schema' || !format.json_schema?.schema) throw new Error('Bản thử yêu cầu schema nhận định.');
  let analysis = 0, reason = 0;
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return;
    const row = value as Record<string, unknown>;
    const fields = row.properties as Record<string, { type?: string; maxLength?: number }> | undefined;
    for (const key of ['analysis', 'reason'] as const) if (fields?.[key]) {
      if (fields[key].type !== 'string' || fields[key].maxLength !== undefined) throw new Error('Khác schema classic chưa có giới hạn giải thích.');
      fields[key].maxLength = key === 'analysis' ? 240 : 320;
      if (key === 'analysis') analysis++; else reason++;
    }
    for (const child of Object.values(row)) visit(child);
  }
  visit(format.json_schema.schema);
  if (analysis !== 1 || !reason) throw new Error('Không tìm đủ trường classic để giới hạn.');
  return result;
}
