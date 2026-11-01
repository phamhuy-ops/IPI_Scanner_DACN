import { expect, it } from 'vitest';
import { assertCompleteSlmResponse, SlmOutputTruncatedError } from './slmResponse';
it('nhận ra metadata cắt đầu ra dù content trông như JSON hoàn chỉnh', () => {
  expect(() => assertCompleteSlmResponse({ choices: [{ finish_reason: 'length' }], usage: { completion_tokens: 1400 } }, 'gemma3:1b')).toThrow(SlmOutputTruncatedError);
  expect(() => assertCompleteSlmResponse({ choices: [{ finish_reason: 'length' }], usage: { completion_tokens: 1400 } }, 'gemma3:1b')).toThrow('completion_tokens=1400');
});
it('không suy cắt đầu ra từ nội dung hoặc metadata vắng mặt', () => {
  expect(() => assertCompleteSlmResponse({ choices: [{ finish_reason: 'stop' }] }, 'gemma3:1b')).not.toThrow();
  expect(() => assertCompleteSlmResponse({ choices: [{}] }, 'gemma3:1b')).not.toThrow();
});
