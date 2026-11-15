---
title: HTML
syntax-id: html
api: "no"
---

Nhiều ứng dụng Markdown cho phép bạn sử dụng các thẻ HTML trong văn bản được định dạng Markdown. Điều này hữu ích nếu bạn thích sử dụng một số thẻ HTML nhất định hơn cú pháp Markdown. Ví dụ, một số người thấy dễ dàng hơn khi sử dụng thẻ HTML cho hình ảnh. Sử dụng HTML cũng hữu ích khi bạn cần thay đổi các thuộc tính của một phần tử, như chỉ định [màu sắc của văn bản](/hacks/#color) hoặc thay đổi chiều rộng của hình ảnh.

Để sử dụng HTML, hãy đặt các thẻ vào trong văn bản của file được định dạng Markdown của bạn.

```
Từ này **in đậm**. Từ này <em>in nghiêng</em>.
```

Kết quả hiển thị sẽ trông như thế này:

Từ này **in đậm**. Từ này <em>in nghiêng</em>.

### Thực tiễn tốt nhất cho HTML

Vì lý do bảo mật, không phải tất cả các ứng dụng Markdown đều hỗ trợ HTML trong tài liệu Markdown. Khi nghi ngờ, hãy kiểm tra tài liệu của ứng dụng Markdown của bạn. Một số ứng dụng chỉ hỗ trợ một tập hợp con các thẻ HTML.

Sử dụng các dòng trống để tách các phần tử HTML cấp khối như `<div>`, `<table>`, `<pre>`, và `<p>` khỏi nội dung xung quanh. Cố gắng không thụt đầu dòng các thẻ bằng tab hoặc khoảng trắng — điều đó có thể ảnh hưởng đến định dạng.

Bạn không thể sử dụng cú pháp Markdown bên trong các thẻ HTML cấp khối. Ví dụ, `<p>in nghiêng và **in đậm**</p>` sẽ không hoạt động.
