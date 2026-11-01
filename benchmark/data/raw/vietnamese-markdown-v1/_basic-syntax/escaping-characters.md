---
title: Thoát ký tự (Escaping Characters)
syntax-id: escaping-characters
api: "no"
---

Để hiển thị một ký tự theo nghĩa đen mà nếu không sẽ được sử dụng để định dạng văn bản trong tài liệu Markdown, hãy thêm dấu gạch chéo ngược (`\`) vào trước ký tự đó.

```
\* Nếu không có dấu gạch chéo ngược, đây sẽ là một dấu chấm đầu dòng trong danh sách không có thứ tự.
```

Kết quả hiển thị sẽ trông như thế này:

\* Nếu không có dấu gạch chéo ngược, đây sẽ là một dấu chấm đầu dòng trong danh sách không có thứ tự.

### Các ký tự bạn có thể thoát

Bạn có thể sử dụng dấu gạch chéo ngược để thoát các ký tự sau.

<table class="table table-bordered">
  <thead class="thead-light">
    <tr>
      <th>Ký tự</th>
      <th>Tên</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>\</td>
      <td>dấu gạch chéo ngược (backslash)</td>
    </tr>
    <tr>
      <td>`</td>
      <td>dấu huyền (backtick) (xem thêm <a href="#escaping-backticks">thoát dấu huyền trong mã</a>)</td>
    </tr>
    <tr>
      <td>*</td>
      <td>dấu sao (asterisk)</td>
    </tr>
    <tr>
      <td>_</td>
      <td>dấu gạch dưới (underscore)</td>
    </tr>
    <tr>
      <td>{ }</td>
      <td>dấu ngoặc nhọn (curly braces)</td>
    </tr>
    <tr>
      <td>[ ]</td>
      <td>dấu ngoặc vuông (brackets)</td>
    </tr>
    <tr>
      <td>< ></td>
      <td>dấu ngoặc nhọn (góc) (angle brackets)</td>
    </tr>
    <tr>
      <td>( )</td>
      <td>dấu ngoặc đơn (parentheses)</td>
    </tr>
    <tr>
      <td>#</td>
      <td>dấu thăng (pound sign)</td>
    </tr>
    <tr>
      <td>+</td>
      <td>dấu cộng (plus sign)</td>
    </tr>
    <tr>
      <td>-</td>
      <td>dấu trừ / gạch nối (minus sign / hyphen)</td>
    </tr>
    <tr>
      <td>.</td>
      <td>dấu chấm (dot)</td>
    </tr>
    <tr>
      <td>!</td>
      <td>dấu chấm than (exclamation mark)</td>
    </tr>
    <tr>
      <td>|</td>
      <td>dấu gạch đứng (pipe) (xem thêm <a href="/extended-syntax/#escaping-pipe-characters-in-tables">thoát dấu gạch đứng trong bảng</a>)</td>
    </tr>
  </tbody>
</table>
