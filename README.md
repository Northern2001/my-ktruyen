# MKT

## Memory

Trang `/memory/` đọc ảnh và video từ thư mục `memory/` ở root dự án. File gốc được giữ local và không commit; website dùng bản đã tối ưu trong `public/memory-media/`.

1. Thêm ảnh hoặc video vào `memory/`.
2. Chạy `npm run sync:memory` (hoặc khởi động `npm run dev`, script sẽ tự chạy trước dev server).
3. Commit các file được tạo trong `public/memory-media/` để GitHub Pages deploy chúng.

Trên macOS, script tự đổi HEIC thành JPEG, MOV/HEVC thành MP4 H.264 và tạo poster cho video. Chạy lại script sau mỗi lần thêm, sửa hoặc xóa media.

```bash
yarn dev
```
