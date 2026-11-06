# Pipe Traffic — website (SPA)

Web tĩnh chạy trên GitHub Pages. **Toàn bộ giao diện nằm trong 1 file `style.css`.**

## Các file (tất cả nằm ngoài cùng, không có thư mục con — kéo thả hết lên repo)
| File | Vai trò |
|---|---|
| `index.html` | Trang chính. Nội dung gốc (Journey, Team, Problems, Video, FAQ, Bình luận…) nằm trong 2 khối `<template id="tpl-hero">` và `<template id="tpl-about">` — sửa chữ/ảnh/link ở đây |
| `admin.html` | Trang admin riêng |
| `style.css` | Toàn bộ CSS. Phần đầu file là **vùng chỉnh sửa** (màu, bo góc, thẻ, nút) |
| `config.js` | Link Google Sheet, Firebase, mật khẩu admin |
| `script.js` | Tương tác của trang gốc: menu, tab, popup thành viên, bình luận |
| `app.js` / `store.js` / `admin.js` | Điều hướng + đăng nhập + tin nhắn + trang admin |

Khi up (kèm `apps-script.gs` và `README.md` cũng được, không ảnh hưởng web): xoá các file cũ không dùng (`team.html`, `faq.html`, `comments.html`, `cta.html`, `problems.html`, `journey.html`, `video`) rồi up đè phần còn lại.

## Bình luận lưu vào Google Sheet
1. Trong Google Sheet: Extensions → Apps Script, dán nội dung `apps-script.gs` (đã sửa lỗi `error.toString` thiếu `()` và thêm `doGet` để web đọc lại bình luận).
2. Deploy → New deployment → loại **Web app** → Execute as: **Me** → Who has access: **Anyone** → Deploy → copy link kết thúc bằng `/exec`.
3. Dán link đó vào `appsScriptUrl` trong `config.js`, commit.
4. Mỗi lần sửa Apps Script phải Deploy → Manage deployments → Edit → **New version** (link giữ nguyên).

Định dạng trong Sheet: cột A thời gian, B tên, C bình luận. Điểm sao và vai trò được ghi ở đầu cột C dạng `⭐5 | vai trò | nội dung`, web tự tách ra khi hiển thị.
Chưa điền `appsScriptUrl` thì bình luận chỉ lưu thử trong trình duyệt.

## Tài khoản người dùng + tin nhắn cho chủ dự án (Firebase, tuỳ chọn)
1. console.firebase.google.com → tạo project → thêm Web app → copy config vào `config.js`.
2. Authentication → Sign-in method → bật **Google**; Authorized domains → thêm `<user>.github.io`.
3. Firestore Database → tạo database → Rules, dán:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /{col}/{doc} { allow read: if true; allow write: if true; }
  }
}
```
Chưa điền Firebase thì web chạy chế độ thử (dữ liệu chỉ trong trình duyệt, ô Google chỉ nhập email giả lập).

## Admin
Vào `/admin.html`, tài khoản `admin`, mật khẩu `123`. Đổi mật khẩu: mở Console trình duyệt, chạy
`crypto.subtle.digest('SHA-256', new TextEncoder().encode('MẬT_KHẨU_MỚI')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))`
rồi dán kết quả vào `adminHash` trong `config.js`.

**Lưu ý bảo mật:** GitHub Pages không có máy chủ nên mật khẩu admin kiểm tra ngay trên trình duyệt, và Rules ở trên cho ghi tự do. Chỉ phù hợp nhóm nhỏ/nội bộ. Muốn chặt hơn, dùng tài khoản Firebase cho admin và giới hạn quyền ghi theo UID.

## Chỉnh sửa nhanh
| Muốn sửa | Ở đâu |
|---|---|
| Màu chủ đạo, nền, bo góc thẻ | `style.css`, khối `:root` đầu file |
| Nội dung Journey/Team/Problems/FAQ… | `index.html`, trong `<template id="tpl-about">` |
| Banner đầu trang | `index.html`, trong `<template id="tpl-hero">` |
| Thêm/sửa dự án, cập nhật tuần | `admin.html` (dùng form, không cần sửa code) |
| Thêm thành viên | `index.html`, copy một khối thẻ thành viên trong mục `id="team"` |

CSS tiện ích (các class như `px-4`, `bg-sky-600`…) đã biên dịch sẵn chỉ cho những class web đang dùng, nên hãy dùng lại các class có sẵn trong `index.html`. Class Tailwind mới chưa có trong `style.css` sẽ không có tác dụng; cần thì báo để biên dịch lại.
