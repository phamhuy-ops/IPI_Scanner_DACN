import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseReviewJson } from '../agents/document/reviewPolicy';
import { SemanticChunk } from '../agents/document/types';

const manifest = JSON.parse(readFileSync('benchmark/experiments/citation-context-controls-v1/mau-da-khoa.json', 'utf8'));

describe('hồi quy trích dẫn từ phản hồi thật, không sửa validator', () => {
  it('bỏ marker vẫn không hợp lệ vì model còn đổi hoa thường', () => {
    const call = manifest.captured[0].failed;
    const prompt: string = call.request.messages[1].content;
    const start = prompt.indexOf('<untrusted_document_data>\n') + '<untrusted_document_data>\n'.length;
    const text = prompt.slice(start, prompt.lastIndexOf('\n</untrusted_document_data>'));
    const data = JSON.parse(JSON.parse(call.response).choices[0].message.content);
    const chunk: SemanticChunk = { chunkId: 'chunk-5', fileName: 'sample.txt', startLine: 1, endLine: 1, text, riskScore: 0, findingCount: 0, selectionReasons: [] };
    expect(() => parseReviewJson(JSON.stringify(data), [chunk], [])).toThrow(/exact excerpt/);
    data.discoveries[0].quote = data.discoveries[0].quote.replace(/\n<\/untrusted_document_data>$/, '');
    expect(() => parseReviewJson(JSON.stringify(data), [chunk], [])).toThrow(/exact excerpt/);
    const quote: string = data.discoveries[0].quote;
    expect(text.includes(quote)).toBe(false);
    expect(text.toLowerCase().includes(quote.toLowerCase())).toBe(true);
  });
  it('parser chấp nhận discovery sai ngữ nghĩa nếu schema/citation hợp lệ: không được dùng parser làm nhãn', () => {
    const call = manifest.captured[0].clean;
    const chunk: SemanticChunk = { chunkId: 'chunk-1', fileName: 'sample.txt', startLine: 1, endLine: 1,
      text: manifest.cases[0].text, riskScore: 0, findingCount: 0, selectionReasons: [] };
    const result = parseReviewJson(JSON.parse(call.response).choices[0].message.content, [chunk], []);
    expect(result.discoveries).toHaveLength(1);
    expect(result.discoveries[0].stance).toBe('uncertain');
    expect(manifest.cases[0].label).toBe('benign');
  });
});
