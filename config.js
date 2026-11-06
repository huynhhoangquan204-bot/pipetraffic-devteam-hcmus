// ===== CẤU HÌNH — chỉ cần sửa file này =====
window.APP_CONFIG = {

  // 1) BÌNH LUẬN LƯU Ở GOOGLE SHEET
  // Dán link Web App của Apps Script (kết thúc bằng /exec). Để trống = chế độ thử (lưu trong trình duyệt).
  appsScriptUrl: "",
  // (Tuỳ chọn) Link CSV của Sheet đã "Publish to web" để ĐỌC bình luận.
  // Nếu để trống, web sẽ đọc bằng appsScriptUrl (cần hàm doGet, xem README).
  sheetCsvUrl: "",

  // 2) TÀI KHOẢN NGƯỜI DÙNG + TIN NHẮN (Firebase). Để trống = chế độ thử.
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: ""
  },

  // 3) ADMIN. adminHash là SHA-256 của mật khẩu (mặc định "123"). Cách đổi: xem README.
  adminUser: "admin",
  adminHash: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
};
