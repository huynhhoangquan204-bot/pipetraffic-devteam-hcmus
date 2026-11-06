// Cấu hình. Để trống firebase => chạy chế độ DEMO (dữ liệu lưu trong trình duyệt).
// Điền firebase (xem README.md) => dữ liệu dùng chung cho mọi người + Google thật.
window.APP_CONFIG = {
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: ""
  },
  // SHA-256 của mật khẩu admin. Mặc định = "123". Đổi: xem README.md
  adminUser: "admin",
  adminHash: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
};
