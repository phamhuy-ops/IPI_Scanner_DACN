// Chỉ tạo từ lỗi vận chuyển của bridge, không suy ra từ nội dung model trả về.
export class SlmConnectionError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'SlmConnectionError';
  }
}

export class SlmOutputTruncatedError extends Error {
  constructor(model: string, tokens?: number) {
    super(`Model ${model} trả đầu ra bị cắt (finish_reason=length${Number.isFinite(tokens) ? `, completion_tokens=${tokens}` : ''}); chưa có phản hồi hoàn chỉnh để kiểm chứng.`);
    this.name = 'SlmOutputTruncatedError';
  }
}

// Chỉ đọc metadata envelope của backend, không tìm dấu hiệu này trong văn bản nguồn.
export function assertCompleteSlmResponse(response: {
  choices?: Array<{ finish_reason?: string }>;
  usage?: { completion_tokens?: number };
}, model: string): void {
  if (response.choices?.[0]?.finish_reason === 'length') throw new SlmOutputTruncatedError(model, response.usage?.completion_tokens);
}
