# Ảnh minh chứng

Lưu ảnh kết quả tại đây, ví dụ `tuan-01-cong-viec-01.png`. Nên đặt tên không dấu, dùng dấu gạch nối và tránh khoảng trắng.

Trong tệp `tuan-01.md`, thay nội dung chờ ảnh ở cột **Kết quả (ảnh)** bằng:

```markdown
![Kết quả phát hiện IPI](./ảnh/tuan-01-cong-viec-01.png)
```

Để thu nhỏ ảnh trong ô bảng, dùng:

```html
<img src="./ảnh/tuan-01-cong-viec-01.png" alt="Kết quả phát hiện IPI" width="220">
```

Nếu một ô có nhiều ảnh, ngăn cách bằng `<br>` và giữ toàn bộ hàng bảng trên cùng một dòng trong mã Markdown. Commit và push cả tệp Markdown lẫn ảnh để GitHub hiển thị đầy đủ.
