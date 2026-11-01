import { expect, it } from 'vitest';
import { boundedReviewRequest } from './boundedReview';
it('chỉ giới hạn analysis/reason, giữ minLength, quote, nguồn, stance và model', () => {
  const body = { model: 'gemma3:1b', seed: 42, messages: [{ role: 'user', content: 'Nguồn\r\nkhông đổi.' }],
    response_format: { type: 'json_schema', json_schema: { schema: { properties: {
      analysis: { type: 'string', minLength: 3 }, discoveries: { items: { properties: {
        reason: { type: 'string', minLength: 20 }, quote: { type: 'string', enum: ['A'.repeat(2000)] }, stance: { enum: ['confirmed'] },
      } } },
    } } } } };
  const result = boundedReviewRequest(body) as typeof body;
  expect(result.response_format.json_schema.schema.properties.analysis).toEqual({ type: 'string', minLength: 3, maxLength: 240 });
  expect(result.response_format.json_schema.schema.properties.discoveries.items.properties.reason).toEqual({ type: 'string', minLength: 20, maxLength: 320 });
  expect(result.messages).toEqual(body.messages); expect(result.model).toBe(body.model);
  expect(result.response_format.json_schema.schema.properties.discoveries.items.properties.quote).toEqual(body.response_format.json_schema.schema.properties.discoveries.items.properties.quote);
  expect(body.response_format.json_schema.schema.properties.analysis).not.toHaveProperty('maxLength');
});
it('không đoán hợp đồng khác', () => {
  expect(() => boundedReviewRequest({ response_format: { type: 'json_object' } })).toThrow();
});
