// ===== CẤU HÌNH — chỉ cần sửa file này =====
window.APP_CONFIG = {

  // 1) BÌNH LUẬN LƯU Ở GOOGLE SHEET
  // Dán link Web App của Apps Script (kết thúc bằng /exec). Để trống = chế độ thử (lưu trong trình duyệt).
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbw14V3XKOd6tjeaX1RUj5wg1yjSNG_o_YN5xptU2Wa1bH3N2u-pZtn-BBnMAh6DE84k/exec",
  // (Tuỳ chọn) Link CSV của Sheet đã "Publish to web" để ĐỌC bình luận.
  // Nếu để trống, web sẽ đọc bằng appsScriptUrl (cần hàm doGet, xem README).
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/1XX4yRdfpe5X8nVTYVJJ-2U4OZbhQnBikqv5Z09DoJJA/edit?gid=0#gid=0",

  // 2) TÀI KHOẢN NGƯỜI DÙNG + TIN NHẮN (Firebase). Để trống = chế độ thử.
  firebase: {
    apiKey: "AIzaSyAx-93r4CMaVhMlQggy4U9PMdN7MqcGSn4",
    authDomain: "pipetraffic-devteam-hcmus.firebaseapp.com",
    projectId: "pipetraffic-devteam-hcmus",
    appId: "1:925073186465:web:ea4ab666bff77c18431ae0"
  },

  // 3) ADMIN. adminHash là SHA-256 của mật khẩu (mặc định "123"). Cách đổi: xem README.
  adminUser: "admin",
  adminHash: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
};
