// Dán toàn bộ vào Google Apps Script (Extensions > Apps Script) của file Google Sheet.
// Cột trong Sheet: A = thời gian, B = tên, C = bình luận.

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
// Chặn ô bắt đầu bằng = + - @ bị Google Sheet hiểu thành công thức
function clean_(s, max) {
  s = String(s || "").slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    var name = clean_(data.name || "Ẩn danh", 80);
    var comment = clean_(data.comment, 700);
    if (!comment) throw new Error("Thiếu nội dung bình luận");
    sheet.appendRow([new Date(), name, comment]);
    return json_({ status: "success" });
  } catch (error) {
    return json_({ status: "error", message: error.toString() }); // chú ý: toString() có dấu ngoặc
  }
}

// Để web ĐỌC bình luận về hiển thị
function doGet() {
  var rows = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getDataRange().getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] instanceof Date && rows[i][2] !== "") {   // bỏ qua dòng tiêu đề
      out.push({ time: rows[i][0].toISOString(), name: String(rows[i][1]), comment: String(rows[i][2]) });
    }
  }
  return json_(out);
}
