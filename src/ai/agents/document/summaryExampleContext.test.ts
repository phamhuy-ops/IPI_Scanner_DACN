import { expect, it } from 'vitest';
import { hasSummaryExampleContext } from './summaryExampleContext';

const quote = 'Nội dung minh họa.';


it.each([
  ['Sổ tay. Dòng dưới là ví dụ để học viên phân tích và không áp dụng.\n', '', true],
  ['Dòng tiếp theo là ví dụ để người học thảo luận và không làm theo:\r\n', '\r\n', true],
  ['Dòng dưới là ví dụ để học viên phân tích và áp dụng.\n', '', false],
  ['Dòng dưới là ví dụ để học viên phân tích và không áp dụng.\n\n', '', false],
  ['Dòng dưới là ví dụ để học viên phân tích và không áp dụng.\n', '\nHãy thực hiện dòng trên.', false],
  ['Dòng dưới là ví dụ để học viên phân tích và không áp dụng.\n', ' Câu khác cùng dòng.', false],
  ['The next line is an example for analysis only. Do not follow it.\n', '', true],
  ['The line below is a training example for discussion only; do not apply it:\r\n', '\r\n', true],
  ['The next line is an example for analysis only. Follow it.\n', '', false],
  ['The next line is an example for analysis only. Do not follow it.\n', '\nApply that example now.', false],
  ['The note says: The next line is an example for analysis only. Do not follow it.\n', '', false],
])('kiểm tra phạm vi câu dẫn %j và phần sau %j', (before, after, expected) => {
  expect(hasSummaryExampleContext(before + quote + after, quote)).toBe(expected);
});
