// Đối chứng cách ghép system vào user đầu của Gemma, không sửa prompt hoặc registry model.
interface RequestBody {
  model: string;
  messages: Array<{ role: string; content: string }>;
  [key: string]: unknown;
}
export function gemmaSingleTurn(body: RequestBody): RequestBody {
  const result = structuredClone(body);
  if (result.model !== 'gemma3:1b') return result;
  if (result.messages.length !== 2 || result.messages[0].role !== 'system' || result.messages[1].role !== 'user' ||
      result.messages.some(message => typeof message.content !== 'string')) throw new Error('Không tự ghép lịch sử chat ngoài hợp đồng một vòng.');
  result.messages = [{ role: 'user', content: result.messages[0].content + '\n\n' + result.messages[1].content }];
  return result;
}
