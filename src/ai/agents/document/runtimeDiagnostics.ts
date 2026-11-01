import { IpiBatchFailure } from '../../../types';
import { InvalidAgentResponse } from './reviewPolicy';
import { SlmConnectionError, SlmOutputTruncatedError } from '../slmResponse';

export function batchFailureCode(error: unknown): IpiBatchFailure['code'] {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof SlmConnectionError) return 'connection_error';
  if (error instanceof SlmOutputTruncatedError) return 'output_truncated';
  if (error instanceof InvalidAgentResponse) {
    if (/not valid JSON/i.test(message)) return 'invalid_json';
    if (/citation|quote|excerpt|Span không khớp/i.test(message)) return 'invalid_citation';
    return 'invalid_schema';
  }
  // Ollama có thể dùng "aborted" khi chặn sinh lặp, chưa hề hết deadline.
  if (/token repeat limit reached/i.test(message)) return 'output_repetition';
  return /timeout|timed out|deadline|abort/i.test(message) ? 'timeout' : 'model_error';
}

export function failureGuidance(code: IpiBatchFailure['code'], locale: 'en' | 'vi'): string {
  const guidance = {
    connection_error: ['Mất kết nối tới backend local; phần dưới chưa được rà hoàn chỉnh. Kiểm tra Ollama đang chạy và cổng kết nối, rồi chạy lại các file bị ảnh hưởng. Không đổi model hoặc tăng timeout để thay cho việc khôi phục kết nối.', 'The local backend connection failed; the chunks below are incomplete. Check that Ollama is running and reachable, then rerun affected files. Changing models or increasing the timeout does not restore the connection.'],
    output_repetition: ['Backend đã dừng vì model sinh lặp, không phải hết thời gian chờ. Kiểm tra phản hồi thô và độ dài batch; rà riêng phần chưa hoàn tất. Tăng timeout hoặc nhận đầu ra thiếu không khắc phục được lỗi này.', 'The backend stopped repetitive generation before completion. Inspect the raw response and batch length, and review incomplete chunks separately. Increasing the timeout or accepting incomplete output does not resolve repetition.'],
    output_truncated: ['Model đã chạm giới hạn sinh và đầu ra bị cắt. Kiểm tra giới hạn đầu ra và độ dài batch; có thể quét riêng file bị ảnh hưởng. Phần này chưa được rà hoàn chỉnh, kể cả khi JSON vẫn đọc được.', 'The model reached its generation limit and the output was truncated. Check the output budget and batch length; affected files can be scanned separately. This part is incomplete even if the JSON is readable.'],
    invalid_json: ['Model trả JSON không đọc được. Rà thủ công các đoạn dưới đây; nếu lặp lại, kiểm tra model đang chạy và hỗ trợ JSON schema.', 'The model returned unreadable JSON. Review these chunks manually; if repeated, check the running model and JSON schema support.'],
    invalid_citation: ['Trích dẫn không khớp nguồn. Đối chiếu file và dòng dưới đây; không sửa câu trích hoặc nới kiểm tra để chấp nhận phản hồi.', 'The citation does not match the source. Compare these files and lines; do not rewrite quotes or relax validation to accept the response.'],
    invalid_schema: ['Phản hồi thiếu trường, sai ID hoặc mâu thuẫn hợp đồng. Rà thủ công các đoạn dưới đây và đối chiếu thông báo lỗi trước khi chạy lại.', 'The response has missing fields, wrong IDs or violates the contract. Review these chunks and the error details before rerunning.'],
    timeout: ['Hết thời gian xử lý. Kiểm tra Ollama và tài nguyên máy; có thể quét riêng file bị ảnh hưởng. Phần chưa hoàn tất vẫn cần rà.', 'The request timed out. Check Ollama and machine resources; scan affected files separately if needed. Incomplete chunks still require review.'],
    model_error: ['Không gọi được model. Kiểm tra Ollama và model đã chọn trước khi chạy lại các file bị ảnh hưởng.', 'The model request failed. Check Ollama and the selected model before rerunning affected files.'],
  };
  return guidance[code][locale === 'vi' ? 0 : 1];
}
