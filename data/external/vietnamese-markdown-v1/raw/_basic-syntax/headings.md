---
title: Tiêu đề (Headings)
syntax-id: headings
syntax-summary: |
  # H1
  ## H2
  ### H3
description: "Để tạo tiêu đề, thêm dấu thăng (`#`) vào trước một từ hoặc cụm từ. Số lượng dấu thăng bạn sử dụng sẽ tương ứng với cấp độ tiêu đề. Ví dụ, để tạo tiêu đề cấp ba (`<h3>`), sử dụng ba dấu thăng (ví dụ: `### Tiêu đề của tôi`)."
examples:
  - markdown: "# Tiêu đề cấp 1"
    html: "<h1>Tiêu đề cấp 1</h1>"
  - markdown: "## Tiêu đề cấp 2"
    html: "<h2>Tiêu đề cấp 2</h2>"
  - markdown: "### Tiêu đề cấp 3"
    html: "<h3>Tiêu đề cấp 3</h3>"
  - markdown: "#### Tiêu đề cấp 4"
    html: "<h4>Tiêu đề cấp 4</h4>"
  - markdown: "##### Tiêu đề cấp 5"
    html: "<h5>Tiêu đề cấp 5</h5>"
  - markdown: "###### Tiêu đề cấp 6"
    html: "<h6>Tiêu đề cấp 6</h6>"
additional-examples:
  - name: "Cú pháp thay thế cho H1"
    description: "Ngoài ra, ở dòng bên dưới văn bản, thêm bất kỳ số lượng ký tự == nào cho tiêu đề cấp 1."
    markdown: |
      Tiêu đề cấp 1
      ===============
    html: "<h1>Tiêu đề cấp 1</h1>"
  - name: "Cú pháp thay thế cho H2"
    description: "Ngoài ra, ở dòng bên dưới văn bản, thêm bất kỳ số lượng ký tự -- nào cho tiêu đề cấp 2."
    markdown: |
      Tiêu đề cấp 2
      ---------------
    html: "<h2>Tiêu đề cấp 2</h2>"
---

Để tạo tiêu đề, thêm dấu thăng (`#`) vào trước một từ hoặc cụm từ. Số lượng dấu thăng bạn sử dụng sẽ tương ứng với cấp độ tiêu đề. Ví dụ, để tạo tiêu đề cấp ba (`<h3>`), sử dụng ba dấu thăng (ví dụ: `### Tiêu đề của tôi`).

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
      <td><code class="highlighter-rouge"># Tiêu đề cấp 1</code></td>
      <td><code class="highlighter-rouge">&lt;h1&gt;Tiêu đề cấp 1&lt;/h1&gt;</code></td>
      <td><h1 class="no-anchor" data-toc-skip>Tiêu đề cấp 1</h1></td>
    </tr>
    <tr>
      <td><code class="highlighter-rouge">## Tiêu đề cấp 2</code></td>
      <td><code class="highlighter-rouge">&lt;h2&gt;Tiêu đề cấp 2&lt;/h2&gt;</code></td>
      <td><h2 class="no-anchor" data-toc-skip>Tiêu đề cấp 2</h2></td>
    </tr>
    <tr>
      <td><code class="highlighter-rouge">### Tiêu đề cấp 3</code></td>
      <td><code class="highlighter-rouge">&lt;h3&gt;Tiêu đề cấp 3&lt;/h3&gt;</code></td>
      <td><h3 class="no-anchor" data-toc-skip>Tiêu đề cấp 3</h3></td>
    </tr>
    <tr>
      <td><code class="highlighter-rouge">#### Tiêu đề cấp 4</code></td>
      <td><code class="highlighter-rouge">&lt;h4&gt;Tiêu đề cấp 4&lt;/h4&gt;</code></td>
      <td><h4 class="no-anchor">Tiêu đề cấp 4</h4></td>
    </tr>
    <tr>
      <td><code class="highlighter-rouge">##### Tiêu đề cấp 5</code></td>
      <td><code class="highlighter-rouge">&lt;h5&gt;Tiêu đề cấp 5&lt;/h5&gt;</code></td>
      <td><h5 class="no-anchor">Tiêu đề cấp 5</h5></td>
    </tr>
    <tr>
      <td><code class="highlighter-rouge">###### Tiêu đề cấp 6</code></td>
      <td><code class="highlighter-rouge">&lt;h6&gt;Tiêu đề cấp 6&lt;/h6&gt;</code></td>
      <td><h6 class="no-anchor">Tiêu đề cấp 6</h6></td>
    </tr>
  </tbody>
</table>

### Cú pháp thay thế

Ngoài ra, ở dòng bên dưới văn bản, thêm bất kỳ số lượng ký tự `==` nào cho tiêu đề cấp 1 hoặc ký tự `--` cho tiêu đề cấp 2.

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
      <td><code class="highlighter-rouge">Tiêu đề cấp 1<br/>===============</code></td>
      <td><code class="highlighter-rouge">&lt;h1&gt;Tiêu đề cấp 1&lt;/h1&gt;</code></td>
      <td><h1 class="no-anchor" data-toc-skip>Tiêu đề cấp 1</h1></td>
    </tr>
    <tr>
      <td><code class="highlighter-rouge">Tiêu đề cấp 2<br/>---------------</code></td>
      <td><code class="highlighter-rouge">&lt;h2&gt;Tiêu đề cấp 2&lt;/h2&gt;</code></td>
      <td><h2 class="no-anchor" data-toc-skip>Tiêu đề cấp 2</h2></td>
    </tr>
  </tbody>
</table>

### Thực tiễn tốt nhất cho Tiêu đề

Các ứng dụng Markdown không thống nhất về cách xử lý việc thiếu khoảng trắng giữa dấu thăng (`#`) và tên tiêu đề. Để đảm bảo khả năng tương thích, luôn đặt một khoảng trắng giữa dấu thăng và tên tiêu đề.

<table class="table table-bordered">
  <thead class="thead-light">
    <tr>
      <th>✅&nbsp; Nên làm</th>
      <th>❌&nbsp; Không nên làm</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <code class="highlighter-rouge">
          # Đây là một Tiêu đề<br><br>
        </code>
      </td>
      <td>
        <code class="highlighter-rouge">
          #Đây là một Tiêu đề
        </code>
      </td>
    </tr>
  </tbody>
</table>

Bạn cũng nên đặt các dòng trống trước và sau tiêu đề để đảm bảo khả năng tương thích.

<table class="table table-bordered">
  <thead class="thead-light">
    <tr>
      <th>✅&nbsp; Nên làm</th>
      <th>❌&nbsp; Không nên làm</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <code class="highlighter-rouge">
        Cố gắng đặt một dòng trống trước...<br><br>

        # Tiêu đề<br><br>

        ...và sau một tiêu đề.
        </code>
      </td>
      <td>
        <code class="highlighter-rouge">
        Nếu không có dòng trống, nó có thể trông không đúng.<br>
        # Tiêu đề<br>
        Đừng làm điều này!
        </code>
      </td>
    </tr>
  </tbody>
</table>
