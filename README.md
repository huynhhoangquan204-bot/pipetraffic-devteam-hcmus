# Pipe Traffic Dev Team — website

SPA tĩnh (HTML/CSS/JS thuần), chạy trên GitHub Pages.

- `index.html` — trang người dùng: dự án, cập nhật tuần, đăng nhập, nhắn tin.
- `admin.html` — trang admin riêng (tài khoản `admin`, mật khẩu `123`).
- `config.js` — cấu hình Firebase + mật khẩu admin.

## Đăng lên GitHub
1. Giải nén, up toàn bộ file lên repo.
2. Settings → Pages → Deploy from branch → `main` / root.
3. Mở `https://<user>.github.io/<repo>/` và `/admin.html`.

## Hai chế độ
- **Demo** (mặc định, `firebase.apiKey` trống): dữ liệu lưu trong trình duyệt, Google chỉ mô phỏng. Dùng để xem thử.
- **Firebase** (khuyên dùng): dữ liệu dùng chung, Google thật.
  1. console.firebase.google.com → tạo project → thêm Web app → copy config vào `config.js`.
  2. Authentication → Sign-in method → bật **Google**; Authorized domains → thêm `<user>.github.io`.
  3. Firestore Database → tạo database → tab Rules, dán:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /{col}/{doc} { allow read: if true; allow write: if true; }
  }
}
```
  (Rules trên đang mở để chạy ngay. Xem lưu ý bảo mật bên dưới trước khi dùng thật.)

## Đổi mật khẩu admin
Mở console trình duyệt, chạy:
`crypto.subtle.digest('SHA-256', new TextEncoder().encode('MẬT_KHẨU_MỚI')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))`
rồi dán kết quả vào `adminHash`.

## Lưu ý bảo mật
GitHub Pages không có máy chủ, nên kiểm tra mật khẩu admin chạy ở trình duyệt: ai đọc được mã nguồn đều thấy hash `123`, và rules Firestore ở trên cho phép ghi tự do. Phù hợp cho nhóm nhỏ/nội bộ. Muốn bảo mật thật, cho admin đăng nhập bằng một tài khoản Firebase và giới hạn quyền ghi theo UID của tài khoản đó trong Rules.
