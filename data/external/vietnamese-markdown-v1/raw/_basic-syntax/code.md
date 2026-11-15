---
title: Mã (Code)
syntax-id: code
syntax-summary: "`code`"
description: "Để biểu thị một từ hoặc cụm từ là mã, hãy bao quanh nó bằng dấu huyền (`` ` ``)."
examples:
  - markdown: "Tại dấu nhắc lệnh, gõ `nano`."
    html: "Tại dấu nhắc lệnh, gõ <code>nano</code>."
additional-examples:
  - name: "Thoát dấu huyền"
    description: "Nếu từ hoặc cụm từ bạn muốn biểu thị là mã có chứa một hoặc nhiều dấu huyền, bạn có thể thoát nó bằng cách bao quanh từ hoặc cụm từ đó bằng hai dấu huyền (<code>``</code>)."
    markdown: "``Sử dụng `code` trong file Markdown của bạn.``"
    html: <code>Sử dụng `code` trong file Markdown của bạn.</code>
  - name: "Khối mã"
    description: "Để tạo khối mã, thụt đầu dòng mỗi dòng của khối ít nhất bốn khoảng trắng hoặc một tab."
    markdown: |
        <html>
          <head>
          </head>
        </html>
    html: <pre><code><html><head></head></html></code></pre>
---

Để biểu thị một từ hoặc cụm từ là mã, hãy bao quanh nó bằng dấu huyền (`` ` ``).

<table class="table table-bordered">
  <thead class="thead-light">
    <tr>
      <th>Markdown</th>
      <th>HTML</th>
      <th>Kết quả hiển thị</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code class="highlighter-rouge">Tại dấu nhắc lệnh, gõ `nano`.</code></td>
      <td><code class="highlighter-rouge">Tại dấu nhắc lệnh, gõ &lt;code&gt;nano&lt;/code&gt;. </code></td>
      <td>Tại dấu nhắc lệnh, gõ <code class="highlighter-rouge">nano</code>.</td>
    </tr>
  </tbody>
</table>

### Thoát dấu huyền

Nếu từ hoặc cụm từ bạn muốn biểu thị là mã có chứa một hoặc nhiều dấu huyền, bạn có thể thoát nó bằng cách bao quanh từ hoặc cụm từ đó bằng hai dấu huyền (<code>``</code>).

<table class="table table-bordered">
  <thead class="thead-light">
    <tr>
      <th>Markdown</th>
      <th>HTML</th>
      <th>Kết quả hiển thị</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>``Sử dụng `code` trong file Markdown của bạn.``</code></td>
      <td><code class="highlighter-rouge">&lt;code&gt;Sử dụng `code` trong file Markdown của bạn.&lt;/code&gt;</code></td>
      <td><code>Sử dụng `code` trong file Markdown của bạn.</code></td>
    </tr>
  </tbody>
</table>

### Khối mã

Để tạo khối mã, thụt đầu dòng mỗi dòng của khối ít nhất bốn khoảng trắng hoặc một tab.

```text
    <html>
      <head>
      </head>
    </html>
```

Kết quả hiển thị sẽ trông như thế này:

```text
<html>
  <head>
  </head>
</html>
```

<div class="alert alert-info">
  <i class="fas fa-info-circle"></i> <strong>Lưu ý:</strong> Để tạo khối mã mà không cần thụt đầu dòng, hãy sử dụng <a href="/extended-syntax/#fenced-code-blocks">khối mã có rào chắn (fenced code blocks)</a>.
</div>
