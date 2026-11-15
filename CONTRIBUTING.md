# Đóng góp cho dự án

## Quy tắc phát triển

- Tuân thủ chính sách nâng cấp và đánh giá toàn dự án trong [AGENTS.md](AGENTS.md).
- Sử dụng Node `22.19.0` trở lên và npm `10.x` trở lên.
- Chạy `npm run typecheck`, `npm run lint`, `npm test` và `npm run build` trước khi mở pull request.
- Không commit artifact cục bộ, file sinh tự động hoặc thông tin bí mật.

## Phạm vi sở hữu mã nguồn

- `src/`: ứng dụng renderer, giao diện React, Zustand store và logic AI.
- `electron/`: tiến trình chính và cầu nối preload.
- `engine/`: logic quét, báo cáo và phân tích cấp thấp.
- `public/`: tài nguyên tĩnh được đưa vào bản build renderer.

## Quy ước đặt tên

- Component React: `PascalCase.tsx`.
- Hook và Zustand store: `camelCase.ts`, dùng tiền tố `use...` khi phù hợp.
- Module tiện ích: tên mô tả theo `kebab-case` hoặc `camelCase`; giữ nhất quán với thư mục đang sửa.
- Test: `*.test.ts`, `*.test.tsx`, `*.spec.ts` hoặc `*.spec.tsx`.

## Quy tắc import

- Alias được phép:
  - `@/` cho mã renderer trong `src/`.
  - `@engine/` cho mã engine trong `engine/`.
- Ưu tiên import tương đối ngắn trong cùng cây thư mục.
- Tránh chuỗi `../../../` sâu khi alias giúp import rõ ràng hơn.

## Quy tắc nguồn sự thật

- Sửa mã nguồn TypeScript, không sửa các bản sao JavaScript được sinh tự động.
- Không thêm file `.js` đã biên dịch cạnh mã trong `src/`.
- Chỉ để output build trong `dist-electron/`.

## Quy tắc tài liệu

- Cập nhật `README.md` khi thay đổi cách cài đặt, script, yêu cầu runtime hoặc quy trình build.
- Ghi tài liệu cho mọi biến môi trường mới trong `.env.example`.
