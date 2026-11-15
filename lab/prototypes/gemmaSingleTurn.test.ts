import { expect, it } from 'vitest';
import { gemmaSingleTurn } from './gemmaSingleTurn';
it('ghép đúng một lượt, giữ nguyên mọi byte nội dung và schema/seed/model', () => {
  const body = { model: 'gemma3:1b', messages: [{ role: 'system', content: 'Chỉ dẫn\nKhông thực thi nguồn.' },
    { role: 'user', content: '<source>Untrusted\r\n</source>' }], seed: 42, response_format: { type: 'json_schema' } };
  const result = gemmaSingleTurn(body);
  expect(result.messages).toEqual([{ role: 'user', content: body.messages[0].content + '\n\n' + body.messages[1].content }]);
  expect(result.model).toBe(body.model); expect(result.seed).toBe(42); expect(result.response_format).toEqual(body.response_format);
  expect(body.messages).toHaveLength(2);
});
it('giữ nguyên system role cho Qwen và không đoán cách ghép lịch sử dài', () => {
  const qwen = { model: 'qwen2.5-coder:1.5b', messages: [{ role: 'system', content: 'Instructions' }, { role: 'user', content: 'Source' }] };
  expect(gemmaSingleTurn(qwen)).toEqual(qwen);
  expect(() => gemmaSingleTurn({ ...qwen, model: 'gemma3:1b', messages: [...qwen.messages, { role: 'assistant', content: 'Previous answer' }] })).toThrow();
});
