---
title: Liên kết (Links)
syntax-id: links
syntax-summary: "[tên liên kết](https://www.example.com)"
description: "Để tạo một liên kết, bao quanh văn bản liên kết trong dấu ngoặc vuông (ví dụ: `[Duck Duck Go]`) và sau đó theo ngay sau đó là URL trong dấu ngoặc đơn (ví dụ: `(https://duckduckgo.com)`). Bạn có thể tùy chọn thêm tiêu đề sau URL trong dấu ngoặc đơn."
examples:
  - markdown: "Công cụ tìm kiếm yêu thích của tôi là [Duck Duck Go](https://duckduckgo.com \"Công cụ tìm kiếm tốt nhất cho quyền riêng tư\")."
    html: Công cụ tìm kiếm yêu thích của tôi là <a href=\"https://duckduckgo.com\" title=\"Công cụ tìm kiếm tốt nhất cho quyền riêng tư\">Duck Duck Go</a>.
additional-examples:
  - name: "URL và Địa chỉ Email"
    description: "Để nhanh chóng biến một URL hoặc địa chỉ email thành một liên kết, hãy bao quanh nó trong dấu ngoặc nhọn."
    markdown: "<https://www.markdownguide.org><fake@example.com>"
    html: <a href=\"https://www.markdownguide.org\">https://www.markdownguide.org</a><a href=\"&#x6d;&#97;&#105;&#x6c;&#116;&#x6f;&#58;&#x66;&#x61;&#x6b;&#101;&#64;&#x65;&#120;&#x61;&#x6d;&#x70;&#108;&#101;&#46;&#99;&#x6f;&#109;\">&#x66;&#x61;&#x6b;&#101;&#64;&#x65;&#120;&#x61;&#x6d;&#x70;&#108;&#101;&#46;&#99;&#x6f;&#109;</a>
  - name: "Định dạng Liên kết"
    description: "Để nhấn mạnh các liên kết, thêm dấu sao vào trước và sau dấu ngoặc vuông và dấu ngoặc đơn."
    markdown: "Tôi thích ủng hộ **[EFF](https://eff.org)**. Đây là *[Hướng dẫn Markdown](https://www.markdownguide.org)*."
    html: Tôi thích ủng hộ <strong><a href=\"https://eff.org\">EFF</a></strong>. Đây là <em><a href=\"https://www.markdownguide.org\">Hướng dẫn Markdown</a></em>.
---

Để tạo một liên kết, bao quanh văn bản liên kết trong dấu ngoặc vuông (ví dụ: `[Duck Duck Go]`) và sau đó theo ngay sau đó là URL trong dấu ngoặc đơn (ví dụ: `(https://duckduckgo.com)`).

```
Công cụ tìm kiếm yêu thích của tôi là [Duck Duck Go](https://duckduckgo.com).
```

Kết quả hiển thị sẽ trông như thế này:

Công cụ tìm kiếm yêu thích của tôi là [Duck Duck Go](https://duckduckgo.com).

<div class="alert alert-info">
  <i class="fas fa-info-circle"></i> <strong>Lưu ý:</strong> Để liên kết đến một phần tử trên cùng một trang, xem <a href="/extended-syntax/#linking-to-heading-ids">liên kết đến ID tiêu đề</a>. Để tạo một liên kết mở trong tab hoặc cửa sổ mới, xem phần về <a href="/hacks/#link-targets">mục tiêu liên kết</a>.
</div>

### Thêm Tiêu đề

Bạn có thể tùy chọn thêm tiêu đề cho một liên kết. Tiêu đề này sẽ xuất hiện dưới dạng chú giải công cụ khi người dùng di chuột qua liên kết. Để thêm tiêu đề, hãy bao quanh nó trong dấu ngoặc kép sau URL.

```
Công cụ tìm kiếm yêu thích của tôi là [Duck Duck Go](https://duckduckgo.com "Công cụ tìm kiếm tốt nhất cho quyền riêng tư").
```

Kết quả hiển thị sẽ trông như thế này:

Công cụ tìm kiếm yêu thích của tôi là [Duck Duck Go](https://duckduckgo.com "Công cụ tìm kiếm tốt nhất cho quyền riêng tư").

### URL và Địa chỉ Email

Để nhanh chóng biến một URL hoặc địa chỉ email thành một liên kết, hãy bao quanh nó trong dấu ngoặc nhọn.

```
<https://www.markdownguide.org>
<fake@example.com>
```

Kết quả hiển thị sẽ trông như thế này:

<https://www.markdownguide.org><br/>
<fake@example.com>

### Định dạng Liên kết

Để [nhấn mạnh](#emphasis) các liên kết, thêm dấu sao vào trước và sau dấu ngoặc vuông và dấu ngoặc đơn. Để biểu thị các liên kết là [mã](#code), thêm dấu huyền vào trong dấu ngoặc vuông.

```
Tôi thích ủng hộ **[EFF](https://eff.org)**.
Đây là *[Hướng dẫn Markdown](https://www.markdownguide.org)*.
Xem phần về [`code`](#code).
```

Kết quả hiển thị sẽ trông như thế này:

Tôi thích ủng hộ **[EFF](https://eff.org)**.<br/>
Đây là *[Hướng dẫn Markdown](https://www.markdownguide.org)*.<br/>
Xem phần về [`code`](#code).

### Liên kết kiểu tham chiếu

Liên kết kiểu tham chiếu là một loại liên kết đặc biệt giúp URL dễ hiển thị và dễ đọc hơn trong Markdown. Liên kết kiểu tham chiếu được xây dựng thành hai phần: phần bạn giữ nội tuyến với văn bản của mình và phần bạn lưu trữ ở một nơi khác trong file để giữ cho văn bản dễ đọc.

#### Định dạng Phần đầu tiên của Liên kết

Phần đầu tiên của liên kết kiểu tham chiếu được định dạng bằng hai bộ dấu ngoặc vuông. Bộ dấu ngoặc vuông đầu tiên bao quanh văn bản sẽ xuất hiện dưới dạng liên kết. Bộ dấu ngoặc vuông thứ hai hiển thị nhãn được sử dụng để trỏ đến liên kết bạn đang lưu trữ ở nơi khác trong tài liệu của mình.

Mặc dù không bắt buộc, bạn có thể bao gồm một khoảng trắng giữa bộ dấu ngoặc vuông thứ nhất và thứ hai. Nhãn trong bộ dấu ngoặc vuông thứ hai không phân biệt chữ hoa chữ thường và có thể bao gồm chữ cái, số, khoảng trắng hoặc dấu câu.

Điều này có nghĩa là các định dạng ví dụ sau đây gần như tương đương cho phần đầu tiên của liên kết:

- `[hobbit-hole][1]`
- `[hobbit-hole] [1]`

#### Định dạng Phần thứ hai của Liên kết

Phần thứ hai của liên kết kiểu tham chiếu được định dạng với các thuộc tính sau:

1. Nhãn, trong dấu ngoặc vuông, theo ngay sau đó là dấu hai chấm và ít nhất một khoảng trắng (ví dụ: `[nhãn]:`).
2. URL cho liên kết, bạn có thể tùy chọn bao quanh trong dấu ngoặc nhọn.
3. Tiêu đề tùy chọn cho liên kết, bạn có thể bao quanh trong dấu ngoặc kép, dấu ngoặc đơn hoặc dấu ngoặc đơn.

Điều này có nghĩa là các định dạng ví dụ sau đây đều gần như tương đương cho phần thứ hai của liên kết:

- `[1]: https://en.wikipedia.org/wiki/Hobbit#Lifestyle`
- `[1]: https://en.wikipedia.org/wiki/Hobbit#Lifestyle "Lối sống Hobbit"`
- `[1]: https://en.wikipedia.org/wiki/Hobbit#Lifestyle 'Lối sống Hobbit'`
- `[1]: https://en.wikipedia.org/wiki/Hobbit#Lifestyle (Lối sống Hobbit)`
- `[1]: <https://en.wikipedia.org/wiki/Hobbit#Lifestyle> "Lối sống Hobbit"`
- `[1]: <https://en.wikipedia.org/wiki/Hobbit#Lifestyle> 'Lối sống Hobbit'`
- `[1]: <https://en.wikipedia.org/wiki/Hobbit#Lifestyle> (Lối sống Hobbit)`

Bạn có thể đặt phần thứ hai này của liên kết ở bất kỳ đâu trong tài liệu Markdown của mình. Một số người đặt chúng ngay sau đoạn văn mà chúng xuất hiện trong khi những người khác đặt chúng ở cuối tài liệu (giống như chú thích cuối trang hoặc chú thích cuối sách).

#### Một Ví dụ Kết hợp các Phần lại với nhau

Giả sử bạn thêm một URL dưới dạng [liên kết URL chuẩn](#links) vào một đoạn văn và nó trông như thế này trong Markdown:

```
Trong một cái hang dưới đất có một người hobbit sinh sống. Không phải là một cái hang bẩn thỉu, dơ dáy, ẩm ướt, đầy đầu
giun và mùi hôi thối, cũng không phải là một cái hang khô khan, trần trụi, đầy cát không có gì để ngồi hoặc để
ăn: đó là một [hang hobbit](https://en.wikipedia.org/wiki/Hobbit#Lifestyle "Lối sống Hobbit"), và điều đó có nghĩa là sự thoải mái.
```

Mặc dù nó có thể trỏ đến thông tin bổ sung thú vị, nhưng URL khi hiển thị thực sự không thêm nhiều vào văn bản thô hiện có ngoài việc làm cho nó khó đọc hơn. Để khắc phục điều đó, bạn có thể định dạng URL như thế này thay thế:

```
Trong một cái hang dưới đất có một người hobbit sinh sống. Không phải là một cái hang bẩn thỉu, dơ dáy, ẩm ướt, đầy đầu
giun và mùi hôi thối, cũng không phải là một cái hang khô khan, trần trụi, đầy cát không có gì để ngồi hoặc để
ăn: đó là một [hang hobbit][1], và điều đó có nghĩa là sự thoải mái.

[1]: <https://en.wikipedia.org/wiki/Hobbit#Lifestyle> "Lối sống Hobbit"
```

Trong cả hai trường hợp trên, kết quả hiển thị sẽ giống hệt nhau:

> Trong một cái hang dưới đất có một người hobbit sinh sống. Không phải là một cái hang bẩn thỉu, dơ dáy, ẩm ướt, đầy đầu giun và mùi hôi thối, cũng không phải là một cái hang khô khan, trần trụi, đầy cát không có gì để ngồi hoặc để ăn: đó là một <a href="https://en.wikipedia.org/wiki/Hobbit#Lifestyle" title="Lối sống Hobbit">hang hobbit</a>, và điều đó có nghĩa là sự thoải mái.

và HTML cho liên kết sẽ là:

```
<a href="https://en.wikipedia.org/wiki/Hobbit#Lifestyle" title="Lối sống Hobbit">hang hobbit</a>
```

### Thực tiễn tốt nhất cho Liên kết

Các ứng dụng Markdown không thống nhất về cách xử lý khoảng trắng ở giữa URL. Để đảm bảo khả năng tương thích, hãy cố gắng mã hóa URL bất kỳ khoảng trắng nào bằng `%20`. Ngoài ra, nếu ứng dụng Markdown của bạn [hỗ trợ HTML](#html), bạn có thể sử dụng thẻ HTML `a`.

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
        [liên kết](https://www.example.com/my%20great%20page)<br><br>

        &lt;a href="https://www.example.com/my great page"&gt;liên kết&lt;/a&gt;<br><br>
        </code>
      </td>
      <td>
        <code class="highlighter-rouge">
        [liên kết](https://www.example.com/my great page)<br><br>
        </code>
      </td>
    </tr>
  </tbody>
</table>

Dấu ngoặc đơn ở giữa URL cũng có thể gây ra vấn đề. Để đảm bảo khả năng tương thích, hãy cố gắng mã hóa URL dấu ngoặc đơn mở (`(`) bằng `%28` và dấu ngoặc đơn đóng (`)`) bằng `%29`. Ngoài ra, nếu ứng dụng Markdown của bạn [hỗ trợ HTML](#html), bạn có thể sử dụng thẻ HTML `a`.

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
        [tiểu thuyết](https://en.wikipedia.org/wiki/<wbr>The_Milagro_Beanfield_War_%28novel%29)<br><br>

        &lt;a href="https://en.wikipedia.org/wiki/<wbr>The_Milagro_Beanfield_War_(novel)"&gt;tiểu thuyết&lt;/a&gt;<br><br>
        </code>
      </td>
      <td>
        <code class="highlighter-rouge">
        [tiểu thuyết](https://en.wikipedia.org/wiki/<wbr>The_Milagro_Beanfield_War_(novel))
        </code>
      </td>
    </tr>
  </tbody>
</table>
