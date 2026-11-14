// ===== CẤU HÌNH — chỉ cần sửa file này =====
window.APP_CONFIG = {

  // Firebase (Authentication + Firestore). Lấy ở Project settings > Your apps > Config.
  firebase: {
    apiKey: "AIzaSyAx-93r4CMaVhMlQggy4U9PMdN7MqcGSn4",
    authDomain: "pipetraffic-devteam-hcmus.firebaseapp.com",
    projectId: "pipetraffic-devteam-hcmus",
    appId: "1:925073186465:web:ea4ab666bff77c18431ae0"
  },

  // ADMIN (trang admin.html). adminEmail = email của tài khoản admin bạn tạo trong
  // Firebase Console > Authentication > Users > Add user (xem README, bước 4).
  adminUser: "admin",
  adminEmail: "",

  // Chỉ dùng cho CHẾ ĐỘ THỬ (khi không có Firebase): SHA-256 của mật khẩu admin, mặc định "123".
  adminHash: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
};
