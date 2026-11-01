---
title: Trích dẫn khối (Blockquotes)
syntax-id: blockquotes
syntax-summary: "> blockquote"
description: "Để tạo một trích dẫn khối, thêm dấu `>` vào trước đoạn văn."
examples:
  - markdown: "> Dorothy đi theo bà qua nhiều căn phòng xinh đẹp trong lâu đài."
    html: "<blockquote><p>Dorothy đi theo bà qua nhiều căn phòng xinh đẹp trong lâu đài.</p></blockquote>"
additional-examples:
  - name: "Trích dẫn khối với nhiều đoạn văn"
    description: "Trích dẫn khối có thể chứa nhiều đoạn văn. Thêm dấu `>` vào các dòng trống giữa các đoạn văn."
    markdown: |
      > Dorothy đi theo bà qua nhiều căn phòng xinh đẹp trong lâu đài.
      >
      > Mụ phù thủy ra lệnh cho cô lau chùi nồi niêu, quét nhà và giữ cho lửa luôn cháy bằng củi.
    html: "<blockquote><p>Dorothy đi theo bà qua nhiều căn phòng xinh đẹp trong lâu đài.</p><p>Mụ phù thủy ra lệnh cho cô lau chùi nồi niêu, quét nhà và giữ cho lửa luôn cháy bằng củi.</p></blockquote>"
  - name: "Trích dẫn khối lồng nhau"
    description: "Trích dẫn khối có thể được lồng vào nhau. Thêm dấu `>>` vào trước đoạn văn bạn muốn lồng."
    markdown: |
      > Dorothy đi theo bà qua nhiều căn phòng xinh đẹp trong lâu đài.
      >
      >> Mụ phù thủy ra lệnh cho cô lau chùi nồi niêu, quét nhà và giữ cho lửa luôn cháy bằng củi.
    html: "<blockquote><p>Dorothy đi theo bà qua nhiều căn phòng xinh đẹp trong lâu đài.</p><blockquote><p>Mụ phù thủy ra lệnh cho cô lau chùi nồi niêu, quét nhà và giữ cho lửa luôn cháy bằng củi.</p></blockquote></blockquote>"
  - name: "Trích dẫn khối với các phần tử khác"
    description: "Trích dẫn khối có thể chứa các phần tử định dạng Markdown khác. Không phải tất cả các phần tử đều có thể sử dụng được — bạn sẽ cần thử nghiệm để xem cái nào hoạt động."
    markdown: |
      > ### Kết quả hàng quý trông rất tuyệt!
      >
      > - Doanh thu vượt ngoài mong đợi.
      > - Lợi nhuận cao hơn bao giờ hết.
      >
      >  *Mọi thứ* đang diễn ra theo đúng **kế hoạch**.
    html: "<blockquote><h3>Kết quả hàng quý trông rất tuyệt!</h3><ul><li>Doanh thu vượt ngoài mong đợi.</li><li>Lợi nhuận cao hơn bao giờ hết.</li></ul><p><em>Mọi thứ</em> đang diễn ra theo đúng <strong>kế hoạch</strong>.</p></blockquote>"
---

Để tạo một trích dẫn khối, thêm dấu `>` vào trước đoạn văn.

```
> Dorothy đi theo bà qua nhiều căn phòng xinh đẹp trong lâu đài.
```

Kết quả hiển thị sẽ trông như thế này:

> Dorothy đi theo bà qua nhiều căn phòng xinh đẹp trong lâu đài.

### Trích dẫn khối với nhiều đoạn văn

Trích dẫn khối có thể chứa nhiều đoạn văn. Thêm dấu `>` vào các dòng trống giữa các đoạn văn.

```
> Dorothy đi theo bà qua nhiều căn phòng xinh đẹp trong lâu đài.
>
> Mụ phù thủy ra lệnh cho cô lau chùi nồi niêu, quét nhà và giữ cho lửa luôn cháy bằng củi.
```

Kết quả hiển thị sẽ trông như thế này:

> Dorothy đi theo bà qua nhiều căn phòng xinh đẹp trong lâu đài.
>
> Mụ phù thủy ra lệnh cho cô lau chùi nồi niêu, quét nhà và giữ cho lửa luôn cháy bằng củi.

### Trích dẫn khối lồng nhau

Trích dẫn khối có thể được lồng vào nhau. Thêm dấu `>>` vào trước đoạn văn bạn muốn lồng.

```
> Dorothy đi theo bà qua nhiều căn phòng xinh đẹp trong lâu đài.
>
>> Mụ phù thủy ra lệnh cho cô lau chùi nồi niêu, quét nhà và giữ cho lửa luôn cháy bằng củi.
```

Kết quả hiển thị sẽ trông như thế này:

> Dorothy đi theo bà qua nhiều căn phòng xinh đẹp trong lâu đài.
>
>> Mụ phù thủy ra lệnh cho cô lau chùi nồi niêu, quét nhà và giữ cho lửa luôn cháy bằng củi.

### Trích dẫn khối với các phần tử khác

Trích dẫn khối có thể chứa các phần tử định dạng Markdown khác. Không phải tất cả các phần tử đều có thể sử dụng được — bạn sẽ cần thử nghiệm để xem cái nào hoạt động.

```
> #### Kết quả hàng quý trông rất tuyệt!
>
> - Doanh thu vượt ngoài mong đợi.
> - Lợi nhuận cao hơn bao giờ hết.
>
>  *Mọi thứ* đang diễn ra theo đúng **kế hoạch**.
```

Kết quả hiển thị sẽ trông như thế này:

> <h4 class="no-anchor">Kết quả hàng quý trông rất tuyệt!</h4>
>
> - Doanh thu vượt ngoài mong đợi.
> - Lợi nhuận cao hơn bao giờ hết.
>
> *Mọi thứ* đang diễn ra theo đúng **kế hoạch**.

### Thực tiễn tốt nhất cho Trích dẫn khối

Để đảm bảo khả năng tương thích, hãy đặt các dòng trống trước và sau trích dẫn khối.

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

        > Đây là một trích dẫn khối<br><br>

        ...và sau một trích dẫn khối.
        </code>
      </td>
      <td>
        <code class="highlighter-rouge">
        Nếu không có dòng trống, nó có thể trông không đúng.<br>
        > Đây là một trích dẫn khối<br>
        Đừng làm điều này!
        </code>
      </td>
    </tr>
  </tbody>
</table>
