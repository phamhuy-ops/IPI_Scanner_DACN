import { expect, it } from 'vitest';
import { semanticStanceRequest, semanticStanceResponse } from './semanticStance';
it('đổi đúng trường stance, giữ nguyên quote/id/nguồn và không sửa request gốc', () => {
  const body = { model: 'gemma3:1b', seed: 42, messages: [{ role: 'system', content: 'confirmed dismissed uncertain' },
    { role: 'user', content: 'The document says confirmed. Không thay dòng\r\nnguồn.' }],
  response_format: { type: 'json_schema', json_schema: { schema: { properties: { discoveries: { items: {
    properties: { stance: { enum: ['confirmed', 'uncertain'] }, quote: { enum: ['confirmed'] } },
  } } } } } } };
  const result = semanticStanceRequest(body) as typeof body;
  expect(result.messages[0].content).toBe('active_ai_redirection ordinary_source_content insufficient_source_context');
  expect(result.messages[1]).toEqual(body.messages[1]);
  expect(result.response_format.json_schema.schema.properties.discoveries.items.properties.quote.enum).toEqual(['confirmed']);
  expect(body.messages[0].content).toBe('confirmed dismissed uncertain');
  expect(result.model).toBe(body.model); expect(result.seed).toBe(42);
});
it('ánh xạ một một stance, không sửa reason/quote và từ chối nhãn ngoài enum', () => {
  const response = (stance: string) => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ analysis: 'analysis', assessments: [],
    discoveries: [{ stance, reason: 'confirmed is a word inside the source.', chunkId: 'chunk-1', quote: 'confirmed' }] }) } }] });
  const data = JSON.parse(JSON.parse(semanticStanceResponse(response('active_ai_redirection'))).choices[0].message.content);
  expect(data.discoveries[0]).toEqual({ stance: 'confirmed', reason: 'confirmed is a word inside the source.', chunkId: 'chunk-1', quote: 'confirmed' });
  expect(() => semanticStanceResponse(response('confirmed'))).toThrow();
});
