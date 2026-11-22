/* ===== Trợ lý ảo Pipe Traffic — tự viết, không dùng dịch vụ/AI bên ngoài =====
   Cách hoạt động (đọc từ trên xuống):
   1. Chuẩn hoá câu hỏi: chữ thường, bỏ dấu tiếng Việt, tách từ, bỏ từ đệm ("là", "của", "không"...).
   2. Nhận ý đồ đơn giản: chào hỏi, cảm ơn, "bạn là ai", "ai là ...", "tuần 2", "còn gì nữa"...
   3. Tìm trong KHO KIẾN THỨC bằng điểm từ khoá (kiểu BM25) + khớp cụm từ + chịu gõ sai 1–2 chữ.
   4. Kho kiến thức = phần viết tay (KB bên dưới, sửa thoải mái) + dữ liệu thật của web
      (thành viên, journey, FAQ, dự án, liên hệ, video...) lấy từ admin; admin chưa nhập thì dùng nội dung mẫu.
   Muốn bot biết thêm điều gì: thêm một mục vào mảng KB (t = tiêu đề, k = các cụm từ khoá cách nhau dấu phẩy, a = câu trả lời). */
(function () {
  'use strict';

  // ---------- Tiện ích chữ ----------
  const fold = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const norm = s => ' ' + fold(s).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';          // " chuoi da bo dau "
  // Từ đệm bị bỏ khi chấm điểm. Cố ý KHÔNG bỏ: ai, lam, chi, anh, em (có nghĩa trong tên/nội dung)
  const STOP = new Set(('la va cua co khong the nao gi sao ra cho toi ban minh nay do nhu de duoc o tai trong mot cac nhung vay ' +
    'a ah nhe voi hay thi bi ad oi nha ha vi nhi chu hoi biet muon can xin on giup dum ve cai nguoi').split(' '));
  const tok = s => norm(s).trim().split(' ').filter(Boolean);
  const keyTok = s => tok(s).filter(w => !STOP.has(w));
  const plain = s => String(s == null ? '' : s).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/[ \t]+/g, ' ').trim();
  const cut = (s, n) => { s = plain(s); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

  // Từ đồng nghĩa (đã bỏ dấu): hỏi từ nào cũng hiểu cả nhóm
  const SYN = [['ong', 'pipe'], ['metro', 'subway', 'tau'], ['phi', 'tien', 'dat', 'denbu'], ['video', 'clip', 'demo', 'phim'],
    ['nhom', 'team', 'doi'], ['vien', 'member'], ['maglev', 'magnetic'], ['khan', 'cuuho', 'cuuthuong', 'cuuhoa'], ['nghien', 'research'],
    ['xanh', 'moitruong', 'carbon'], ['hop', 'meeting', 'hop'], ['tieng', 'on']];
  const synOf = {}; SYN.forEach(g => g.forEach(w => { synOf[w] = (synOf[w] || []).concat(g.filter(x => x !== w)); }));

  function lev(a, b, max) {                       // khoảng cách sửa chữ, dừng sớm nếu > max
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let low = i;
      for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); low = Math.min(low, cur[j]); }
      if (low > max) return max + 1; prev = cur;
    }
    return prev[b.length];
  }

  // ---------- KHO KIẾN THỨC viết tay (sửa / thêm tuỳ ý) ----------
  const KB = [
    { id: 'about', t: 'Pipe Traffic là gì', k: 'pipe traffic la gi, gioi thieu, du an la gi, y tuong, noi ve du an, tong quan, la du an gi, muc tieu',
      a: 'Pipe Traffic là đề xuất hệ thống giao thông đường ống từ trường (maglev) của nhóm sinh viên HCMUS. Cabin trượt bằng lực từ không ma sát trong mạng ống đa tầng, nối thẳng tới hộ gia đình và tòa nhà, có AI điều phối khoảng cách an toàn và ưu tiên xe khẩn cấp.\nMục tiêu: giải bài toán ùn tắc, đất đô thị chật hẹp và chi phí hạ tầng.',
      more: ['Hệ thống hoạt động thế nào?', 'Có những tính năng gì?', 'So với Metro khác gì?'] },
    { id: 'how', t: 'Nguyên lý hoạt động', k: 'hoat dong, nguyen ly, van hanh, chay nhu the nao, co che, cabin, tu truong, dem tu, maglev, luc day',
      a: 'Cabin di chuyển trong đường ống nhờ đệm từ trường (maglev): lực đẩy từ tính không ma sát nên rất êm và nhanh. Đường ống chia nhiều tầng, nối từ nhà này sang nhà khác hoặc ra các trục chính đô thị. AI tính khoảng cách an toàn theo thời gian thực để các cabin chạy liên tục không tắc.',
      more: ['Dùng Pipe Traffic trong 3 bước', 'AI xử lý khẩn cấp ra sao?'] },
    { id: 'features', t: 'Tính năng nổi bật', k: 'tinh nang, tien ich, uu diem, diem noi bat, loi ich, dac diem, ky thuat, dac diem ky thuat, thong so',
      a: 'Bốn điểm nổi bật:\n• Đệm từ trường Maglev: lực đẩy không ma sát, nhanh, êm, bền thiết bị.\n• Kết nối tận hộ gia đình: lắp tận cửa, nối thẳng tòa nhà cao tầng, không chờ ở trạm.\n• AI điều hướng khẩn cấp: tự đo khoảng cách an toàn, nhường làn cho cấp cứu/cứu hỏa.\n• Môi trường xanh: không phát thải carbon, giảm ồn, tiết kiệm diện tích.' },
    { id: 'compare', t: 'So sánh với Metro truyền thống', k: 'so sanh, metro, khac gi, khac nhau, hon metro, tau dien, duong sat, ngam, uu the, voi metro, bang so sanh, xe buyt',
      a: 'Pipe Traffic so với Metro:\n• Kết nối: tận cổng nhà/tòa nhà ↔ chỉ qua các ga cố định.\n• Không gian: ống treo/ngầm đa tầng nhỏ gọn ↔ cần hành lang đường sắt riêng rất lớn.\n• Đền bù mặt bằng: tiết kiệm nhờ thiết kế mô-đun ↔ rất đắt đỏ.\n• Linh hoạt: AI tự chuyển làn, ưu tiên cứu hộ ↔ tuyến cố định, khó nhường đường tức thì.\n• Vận hành: liên tục, êm, không ma sát ↔ chạy theo giờ cố định, tần suất hạn chế.' },
    { id: 'steps', t: 'Dùng Pipe Traffic trong 3 bước', k: 'su dung, cach dung, huong dan, 3 buoc, ba buoc, dat chuyen, di nhu the nao, len cabin, quy trinh, cach di',
      a: '3 bước:\n1) Đặt chuyến & chọn điểm đến trên ứng dụng Pipe Traffic – cabin tự trượt tới trạm ống tại nhà bạn.\n2) Vào cabin & khởi hành – động cơ từ tính tăng tốc êm vào mạng ống đa tầng.\n3) Tự động đến nơi an toàn – AI tính khoảng cách an toàn, đưa cabin cập bến chính xác, không lo kẹt xe.' },
    { id: 'abstract', t: 'Tóm tắt đề tài (Abstract)', k: 'abstract, tom tat, de tai, bai toan, van de, ket xe, un tac, tac duong, dat hep, 4.1',
      a: 'Các đô thị lớn đang tắc nghẽn giao thông nghiêm trọng và quỹ đất hạ tầng rất hạn hẹp. Pipe Traffic đề xuất phương tiện chạy bằng từ trường lắp trực tiếp tại hộ gia đình và tòa nhà: di chuyển nhanh, an toàn, không phát thải và tối ưu không gian đô thị nén.' },
    { id: 'solution', t: 'Giải pháp (Solution)', k: 'solution, giai phap, dot pha, ong da tang, da tang, toi uu khong gian, 4.2',
      a: 'Ba trụ cột giải pháp:\n• Ống trượt đa tầng chạy bằng lực từ, nối linh hoạt nhà–nhà và nhà–trục chính đô thị.\n• Tối ưu không gian & chi phí: không tốn mặt bằng hay đường ray/đường nhựa đắt đỏ.\n• Tích hợp AI: tính khoảng cách an toàn, điều luồng liên tục, tự giải phóng lộ trình khi có xe cấp cứu, cứu hỏa, lực lượng chức năng.' },
    { id: 'methods', t: 'Phương pháp triển khai (Methods)', k: 'methods, phuong phap, trien khai, thi cong, xay dung, bo xay dung, quy chuan, an toan, luat, giay phep, cap phep, he thong ham, cam bien, 4.3',
      a: 'Triển khai gồm:\n• Quy hoạch & xây dựng: thi công ống ngầm/trên cao dưới sự giám sát, cấp phép của Bộ Xây dựng và cơ quan quản lý giao thông.\n• Tiết kiệm chi phí: vật liệu mô-đun hiện đại, sản xuất hàng loạt.\n• An toàn & luật định: tuân thủ quy chuẩn an toàn giao thông, có hệ thống hãm từ tính khẩn cấp và cảm biến đa điểm.' },
    { id: 'conclusions', t: 'Kết luận (Conclusions)', k: 'conclusions, ket luan, tong ket du an, y nghia, ket qua cuoi, 4.4',
      a: 'Pipe Traffic mang đến góc nhìn đột phá cho hạ tầng giao thông tương lai: kết hợp từ trường và AI quản lý luồng chạy để giải quyết tận gốc kẹt xe và đất đô thị hẹp, đồng thời tạo phương thức di chuyển xanh, bền vững, tiết kiệm chi phí xây dựng cho xã hội.' },
    { id: 'green', t: 'Môi trường & chi phí', k: 'moi truong, xanh, phat thai, carbon, o nhiem, tieng on, tiet kiem, chi phi, giai phong mat bang, den bu, dien tich, ben vung, gia thanh, ton tien, ton kem, kinh phi, bao nhieu tien, dau tu, re khong, dat khong',
      a: 'Về môi trường: không phát thải carbon, giảm tối đa tiếng ồn đô thị.\nVề chi phí: thiết kế mô-đun, sản xuất hàng loạt giúp giảm giá lắp đặt; không cần giải phóng mặt bằng lớn nên tiết kiệm khoản đền bù mà Metro truyền thống rất tốn.' },
    { id: 'charter', t: 'Hợp đồng thành lập nhóm', k: 'hop dong, thanh lap nhom, cam ket, charter, muc tieu chung, ten du an',
      a: 'Hợp đồng thành lập nhóm (HCMUS Pipe Traffic Charter):\n• Tên dự án: Pipe Traffic - HCMUS.\n• Mục tiêu: hoàn thành xuất sắc bài tập nhóm, xây dựng nguyên mẫu ý tưởng thực tế, đúng hạn 100%.\n• Cam kết: tham gia đủ các buổi họp online & offline; tôn trọng ý kiến, thảo luận xây dựng; đảm bảo chất lượng đúng deadline.' },
    { id: 'rules', t: 'Quy tắc làm việc nhóm', k: 'quy tac, noi quy, lam viec nhom, dung han, minh bach, deadline, bo phieu, quyet dinh, dong gop, punctuality, transparency',
      a: 'Quy tắc làm việc:\n• Đúng hạn: nộp trước deadline ít nhất 6 tiếng để kiểm tra chéo.\n• Minh bạch: có khó khăn phải báo lên kênh chung trong 12 tiếng.\n• Đóng góp: mỗi người ít nhất 1 ý kiến trong mỗi buổi họp.\n• Quyết định: đa số bỏ phiếu; hòa thì Project Manager quyết định cuối cùng.' },
    { id: 'comm', t: 'Kênh liên lạc & lịch họp của nhóm', k: 'lich hop, hop nhom, hop khi nao, kenh, zalo, discord, trello, notion, google drive, giao tiep, check in, tong ket, thu tu, chu nhat, ke hoach giao tiep',
      a: 'Kế hoạch giao tiếp của nhóm:\n• Trao đổi hằng ngày/gấp: Zalo hoặc Discord Group.\n• Tài liệu & task: Google Drive (lưu trữ), Trello/Notion (theo dõi tiến độ).\n• Họp: check-in online 21:00 Thứ Tư hằng tuần (30 phút); họp tổng kết 14:00 Chủ Nhật hằng tuần.' },
    { id: 'school', t: 'Nhóm thuộc trường nào', k: 'hcmus, truong, dai hoc, khoa hoc tu nhien, dhqg, sinh vien, tp hcm, ho chi minh, nhom o dau, thuoc truong',
      a: 'Pipe Traffic - HCMUS là dự án của nhóm sinh viên Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM (TP.HCM).' },
    { id: 'comment', t: 'Cách gửi góp ý / bình luận', k: 'binh luan, gop y, danh gia, de lai y kien, gui y kien, comment, nhan xet, phan hoi, cho sao, an danh',
      a: 'Vào mục Bình luận trên web, điền họ tên (có thể ẩn danh), chọn số sao đánh giá, viết nội dung (tối đa 700 ký tự) rồi bấm Gửi. Bình luận sẽ hiện công khai sau khi admin duyệt.' },
    { id: 'account', t: 'Đăng nhập & nhắn tin cho admin', k: 'dang nhap, dang ky, tai khoan, google, nhan tin, nhan cho admin, gap admin, lien he admin, chat voi admin, mat khau, avatar, anh dai dien, ho so, quen mat khau',
      a: 'Bấm nút Đăng nhập trên menu: đăng nhập Google, rồi đặt tên, giới tính và mật khẩu cho tài khoản. Sau đó mở khung Chat, chọn tab Admin để nhắn trực tiếp cho admin; admin trả lời ngay trong khung này. Bạn cũng đổi ảnh đại diện được ở trang Hồ sơ.' },
    { id: 'editprofile', t: 'Sửa thông tin cá nhân', k: 'sua thong tin, doi thong tin, chinh sua ho so, doi ten, doi so dien thoai, doi nghe nghiep, cap nhat thong tin, thong tin ca nhan, sua ho so, doi mat khau, doi avatar',
      a: 'Bấm vào tên của bạn trên menu để mở trang Hồ sơ. Ở đó bạn đổi được ảnh đại diện, tên hiển thị, giới tính, ngày sinh, số điện thoại và nghề nghiệp, rồi bấm \"Lưu thông tin\". Email Google không đổi được.' },
    { id: 'forgotpw', t: 'Quên mật khẩu', k: 'quen mat khau, lay lai mat khau, dat lai mat khau, khong nho mat khau, reset password, mat mat khau',
      a: 'Vào Đăng nhập → đăng nhập Google → bấm \"Quên mật khẩu?\". Hệ thống sẽ gửi email đặt lại mật khẩu tới địa chỉ Google của bạn.' },
    { id: 'delacc', t: 'Xoá tài khoản', k: 'xoa tai khoan, huy tai khoan, xoa thong tin, xoa du lieu, khong muon dung nua, dong tai khoan',
      a: 'Bạn có quyền yêu cầu xoá thông tin bất cứ lúc nào: mở khung Chat, chọn tab Admin và nhắn yêu cầu xoá tài khoản. Nếu vừa đăng ký mà chưa muốn tiếp tục, bấm \"Không đồng ý\" ở bước cam kết quyền riêng tư để huỷ ngay.' },
    { id: 'bot', t: 'Trợ lý ảo là gì', k: 'ban la ai, bot la ai, ten ban, tro ly, chatbot, ai tra loi, ban la gi, ban ten gi, ai tao ra ban, ban duoc lam bang gi, thong minh',
      a: 'Mình là trợ lý ảo của Pipe Traffic, do nhóm tự viết (không dùng dịch vụ AI bên ngoài). Mình tìm câu trả lời trong nội dung của web này: dự án, nguyên lý, thành viên, tiến độ, liên hệ... Câu nào mình chưa biết, bạn có thể nhắn thẳng cho admin ở tab Admin.' }
  ];

  const SUGGEST = ['Pipe Traffic là gì?', 'Hệ thống hoạt động thế nào?', 'So với Metro khác gì?', 'Nhóm có những ai?', 'Tiến độ các tuần', 'Liên hệ nhóm'];

  // ---------- Dữ liệu thật của web (admin nhập), nạp có nhớ tạm ----------
  let dyn = [], people = [], journeyByWeek = {}, dynAt = 0, dynBusy = null;
  const withTimeout = (p, ms) => Promise.race([p, new Promise(ok => setTimeout(() => ok(null), ms))]);
  const roleVi = r => { r = fold(r); return [/design|graphic|thiet ke/.test(r) && 'thiet ke, do hoa, logo, nhan dien thuong hieu, mind map',
    /web|tech|dev|ky thuat/.test(r) && 'web, website, lap trinh, ky thuat, cong nghe, cau hinh',
    /research|content|nghien cuu|noi dung/.test(r) && 'nghien cuu, noi dung, tai lieu chuyen mon, y tuong, bien soan, viet bai, tao ra, sang lap, nghi ra, chu y tuong, tac gia',
    /media|video|truyen thong/.test(r) && 'video, truyen thong, dung phim, hau ky, kich ban, bien ban hop',
    /manager|pm\b|quan ly|dieu phoi/.test(r) && 'quan ly, dieu phoi, tien do, truong nhom, leader, tai lieu, hop dong, quy tac'].filter(Boolean).join(', '); };

  async function pull() {
    const D = (window.Content && Content.defaults) || {};
    const list = async c => {
      let v = null;
      try { v = window.Store ? await withTimeout(Store.list(c), 2500) : null; } catch (e) {}
      if (!v || !v.length) return D[c] || [];
      return window.Content ? Content.sort(v) : v;
    };
    const one = async id => {
      let v = null;
      try { v = window.Store ? await withTimeout(Store.get('site', id), 2500) : null; } catch (e) {}
      return v || D[id] || null;
    };
    const [team, journey, faq, reviews, projects, updates, contact, video] = await Promise.all(
      [list('team'), list('journey'), list('faq'), list('reviews'), list('projects'), list('updates'), one('contact'), one('video')]);
    let taught = []; try { taught = (window.Store ? await withTimeout(Store.list('botkb'), 2500) : null) || []; } catch (e) {}
    const out = []; people = []; journeyByWeek = {};
    // Câu trả lời do admin dạy (tab "Dạy Bot" trong admin): ưu tiên cao nhất
    taught.forEach((b, i) => { if (b.q && b.a) out.push({ id: 'b' + i, taught: true, t: b.q, k: [b.q].concat(String(b.k || '').split(/[\n,]+/)).map(x => x.trim()).filter(Boolean).join(', '), a: String(b.a).trim() }); });

    team.forEach((m, i) => {
      const e = { id: 'm' + i, who: true, t: m.name, k: [m.name, m.role, roleVi(m.role), m.modalRole].filter(Boolean).join(', '),
        a: `${m.name} – ${m.modalRole || m.role}.\n${plain(m.detail || m.short)}${m.short && m.detail && m.short !== m.detail ? '\nĐã làm: ' + plain(m.short) : ''}` };
      out.push(e);
      const parts = tok(m.name), last = parts[parts.length - 1], last2 = parts.slice(-2).join(' ');
      people.push({ e, full: ' ' + parts.join(' ') + ' ', last2: ' ' + last2 + ' ', last, ambiguous: ['quan', 'lam', 'phuc'].includes(last) });
    });
    if (team.length) out.push({ id: 'team', who: true, t: 'Thành viên nhóm', k: 'thanh vien, nhom co may nguoi, bao nhieu nguoi, doi ngu, ai trong nhom, danh sach, team, member, ai lam gi, phan cong, vai tro',
      a: `Nhóm có ${team.length} thành viên:\n` + team.map(m => `• ${m.name} – ${m.role}`).join('\n') + '\nHỏi tên một người để biết họ làm gì.' });

    journey.forEach((j, i) => {
      const n = (String(j.week).match(/\d+/) || [i + 1])[0];
      const e = { id: 'j' + i, t: `${j.week}: ${j.title}`, k: `${j.week}, tuan ${n}`, a: `${j.week} – ${j.title}:\n` + (j.items || []).map(x => '• ' + plain(x)).join('\n') };
      out.push(e); journeyByWeek[n] = e;
    });
    if (journey.length) out.push({ id: 'journey', t: 'Nhật ký hành trình', k: 'tien do, hanh trinh, nhat ky, timeline, lich trinh, cac tuan, lo trinh, qua trinh, da lam gi, giai doan, tien trinh, journey',
      a: 'Hành trình của nhóm:\n' + journey.map(j => `• ${j.week}: ${plain(j.title)}`).join('\n') + '\nHỏi "Tuần 2 làm gì?" để xem chi tiết từng tuần.' });

    faq.forEach((q, i) => out.push({ id: 'f' + i, t: q.q, k: q.q, a: plain(q.a) }));
    if (reviews.length) out.push({ id: 'reviews', t: 'Chuyên gia đánh giá', k: 'review, chuyen gia, danh gia chuyen gia, nhan xet chuyen gia, ai khen, feedback, ky su, quy dau tu, nhan xet cua',
      a: 'Một vài đánh giá:\n' + reviews.map(r => `• ${r.name} (${r.title}): "${cut(r.text, 150)}"`).join('\n') });

    if (projects.length) out.push({ id: 'projects', t: 'Các dự án đang làm', k: 'du an, danh sach du an, dang lam, trang thai, tien do du an, progress, hoan thanh, project',
      a: 'Các dự án:\n' + projects.map(p => `• ${p.name} – ${p.status || ''}${p.progress != null ? ' (' + p.progress + '%)' : ''}${p.desc ? '\n  ' + cut(p.desc, 110) : ''}`).join('\n') });
    if (updates.length) out.push({ id: 'updates', t: 'Cập nhật mới nhất', k: 'cap nhat, moi nhat, gan day, tuan nay, tin moi, update, vua lam, hien tai, bao cao tuan, tin tuc',
      a: 'Cập nhật gần đây:\n' + updates.slice(-3).reverse().map(u => `• ${u.week || ''} – ${u.title || ''}: ${cut(u.content, 140)}`).join('\n') });

    if (contact) {
      const rows = (contact.rows || []).map(r => { const i = String(r).indexOf('|'); return i < 0 ? '• ' + plain(r) : `• ${plain(String(r).slice(0, i))}: ${plain(String(r).slice(i + 1))}`; });
      out.push({ id: 'contact', t: 'Liên hệ nhóm', k: 'lien he, contact, email, mail, sdt, so dien thoai, github, youtube, facebook, mang xa hoi, dia chi, hop tac, kenh chinh thuc, link',
        a: `${plain(contact.title || 'Liên hệ nhóm')}\n${plain(contact.intro || '')}\n${rows.join('\n')}${contact.note ? '\n' + plain(contact.note) : ''}\nBấm nút "Liên hệ" trên menu để xem đầy đủ.`.replace(/\n\n/g, '\n') });
    }
    if (video) {
      const sc = (video.scenes || []).map(s => '• ' + cut(s, 95));
      out.push({ id: 'video', t: 'Video giới thiệu', k: 'video, clip, demo, kich ban, phan canh, scene, xem video, phim, youtube, truyen thong, dung phim',
        a: `${plain(video.title || 'Video giới thiệu')}${video.videoUrl ? '\nBạn xem video ở mục Video trên web.' : '\nVideo đang được hoàn thiện; hiện đã có kịch bản phân cảnh.'}${sc.length ? `\nKịch bản gồm ${sc.length} cảnh:\n` + sc.join('\n') : ''}` });
    }
    dyn = out; dynAt = Date.now(); index = null;
  }
  const ensure = () => (Date.now() - dynAt < 60000 && dynAt) ? Promise.resolve() : (dynBusy = dynBusy || pull().catch(() => { dynAt = Date.now(); }).then(() => { dynBusy = null; }));

  // ---------- Chỉ mục tìm kiếm ----------
  let index = null;
  function build() {
    const docs = [...dyn, ...KB].map(e => {
      const tf = new Map(), add = (s, w) => keyTok(s).forEach(x => tf.set(x, (tf.get(x) || 0) + w));
      add(e.t, 3); add(e.k, 3); add(e.a, 1);
      return { e, tf, phr: String(e.k || '').split(',').map(x => norm(x)).filter(x => x.trim()), title: norm(e.t) };
    });
    const df = new Map(); docs.forEach(d => d.tf.forEach((_, w) => df.set(w, (df.get(w) || 0) + 1)));
    index = { docs, df, N: docs.length, vocab: [...df.keys()] };
  }
  const idf = w => { const n = index.df.get(w) || 0; return Math.log(1 + (index.N - n + .5) / (n + .5)); };

  function expand(q) {                     // từ khoá câu hỏi -> [từ, trọng số]; sửa lỗi gõ; thêm đồng nghĩa
    const out = new Map(), groups = [], put = (w, x) => out.set(w, Math.max(out.get(w) || 0, x));
    keyTok(q).forEach(w => {
      const ws = [w]; let known = index.df.has(w), base = w;
      if (known || synOf[w]) put(w, 1);
      else if (w.length >= 5) {
        let best = null, bd = w.length >= 8 ? 2 : 1;
        for (const v of index.vocab) { if (Math.abs(v.length - w.length) > bd) continue; const d = lev(w, v, bd); if (d <= bd && (best === null || d < bd || index.df.get(v) > index.df.get(best))) { best = v; bd = d; } }
        if (best) { put(best, .8); ws.push(best); known = true; base = best; }
      }
      (synOf[w] || []).forEach(x => { put(x, .6); ws.push(x); });
      // groups: mỗi từ của câu hỏi + độ hiếm của nó (từ lạ chưa từng thấy trong kho = hiếm nhất)
      groups.push({ ws, wt: known ? idf(base) : Math.log(1 + index.N) });
    });
    return { out, groups };
  }

  function rank(q, only) {
    if (!index) build();
    const { out: qw, groups } = expand(q), fq = norm(q), res = [], total = groups.reduce((a, g) => a + g.wt, 0);
    index.docs.forEach(d => {
      if (only && !only(d.e)) return;
      let s = 0; const ptok = new Set();
      qw.forEach((wt, w) => { const f = d.tf.get(w) || 0; if (f) s += idf(w) * wt * (f * 2.2 / (f + 1.2)); });
      d.phr.forEach(p => { if (fq.includes(p)) { s += 3 + p.trim().split(' ').length; p.trim().split(' ').forEach(x => ptok.add(x)); } });
      if (d.title.trim() && fq.includes(d.title)) s += 4;
      if (d.e.taught) s *= 1.3;
      if (s <= 0) return;
      // cov = phần "độ hiếm" của câu hỏi mà mục này giải thích được. Thấp = bot đang đoán bừa.
      const hit = groups.reduce((a, g) => a + (g.ws.some(x => d.tf.has(x) || ptok.has(x)) ? g.wt : 0), 0);
      res.push({ e: d.e, s, cov: total ? hit / total : 1 });
    });
    return res.sort((a, b) => b.s - a.s);
  }


  // ---------- Hiểu câu hỏi tiếng Anh nhờ bộ dữ liệu Bitext (botintents.js) ----------
  // Cách làm: mỗi câu mẫu -> vector TF-IDF (bỏ từ đệm tiếng Anh); câu hỏi mới so độ giống (cosine) với từng câu mẫu,
  // lấy 5 câu giống nhất rồi bỏ phiếu theo nhóm ý đồ. Không đủ giống thì trả null để bot trả lời như cũ.
  const EN_STOP = new Set(('i me my a an the to of in on for is are am be can could would you your it its do does did how what where when why please want need ' +
    'tell us we with about and or if this that there have has get just let like would should will so as at by from help').split(' '));
  const enTok = s => String(s || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(' ').filter(w => w && !EN_STOP.has(w)).map(w => w.replace(/(ing|ed|es|s)$/, m => w.length > 4 ? '' : m));
  let intentIdx = null;
  function buildIntents() {
    const data = window.PT_INTENTS || {}, docs = [], df = new Map();
    Object.keys(data).forEach(g => data[g].forEach(u => { const t = enTok(u); if (!t.length) return; docs.push({ g, t: new Map(t.map(w => [w, 1])) }); new Set(t).forEach(w => df.set(w, (df.get(w) || 0) + 1)); }));
    const N = docs.length || 1, idf = w => Math.log(1 + N / (df.get(w) || 1));
    docs.forEach(d => { let n = 0; d.t.forEach((_, w) => { const v = idf(w); d.t.set(w, v); n += v * v; }); d.n = Math.sqrt(n) || 1; });
    intentIdx = { docs, idf, N };
  }
  function classify(q) {
    if (!window.PT_INTENTS) return null;
    if (!intentIdx) buildIntents();
    const qt = [...new Set(enTok(q))];
    if (!qt.length) return null;
    const qv = new Map(qt.map(w => [w, intentIdx.idf(w)])); let qn = 0; qv.forEach(v => { qn += v * v; }); qn = Math.sqrt(qn) || 1;
    const hits = [];
    intentIdx.docs.forEach(d => { let dot = 0, shared = 0; qv.forEach((v, w) => { const x = d.t.get(w); if (x) { dot += v * x; shared++; } }); if (shared) hits.push({ g: d.g, sim: dot / (qn * d.n), shared }); });
    hits.sort((a, b) => b.sim - a.sim);
    const top = hits.slice(0, 5); if (!top.length || top[0].sim < .45) return null;
    const vote = {}; top.forEach(h => { vote[h.g] = (vote[h.g] || 0) + h.sim; });
    let g = Object.keys(vote).sort((a, b) => vote[b] - vote[a])[0];
    // Nói tới đơn hàng / thanh toán / giao hàng mà không nhắc tài khoản thì chắc chắn là ngoài phạm vi (tránh nhầm "cancel my order" thành xoá tài khoản)
    if (/\b(orders?|refunds?|pay(ment|ments)?|invoices?|bills?|shipping|ship|deliver(y|ies)?|parcels?|packages?|tracking|purchases?|items?)\b/i.test(q) && !/\baccount\b/i.test(q)) g = 'shop';
    return { g, sim: top[0].sim };
  }
  // Trả lời theo nhóm ý đồ: en = tiếng Anh (vì người hỏi viết tiếng Anh), vi = bản tiếng Việt
  const INTENT_ANS = {
    signup: { en: 'To create an account: click \"Đăng nhập\" on the menu → continue with Google → enter your name, gender, birth date, phone and job, set a password (6+ characters), then accept the privacy commitment.', vi: 'Tạo tài khoản: bấm Đăng nhập trên menu → tiếp tục với Google → điền tên, giới tính, ngày sinh, số điện thoại, nghề nghiệp, đặt mật khẩu từ 6 ký tự → đồng ý cam kết quyền riêng tư.' },
    regproblem: { en: 'Sign-up needs a Google account first. Check that the password has 6+ characters and the phone number has 9–15 digits. Still stuck? Message the admin in Chat → Admin tab, or use the \"Liên hệ\" button.', vi: 'Đăng ký cần đăng nhập Google trước; mật khẩu từ 6 ký tự, số điện thoại 9–15 chữ số. Vẫn lỗi thì nhắn admin ở khung Chat (tab Admin) hoặc bấm nút Liên hệ.' },
    password: { en: 'Forgot your password? Go to Đăng nhập → sign in with Google → click \"Quên mật khẩu?\". A reset email is sent to your Google address.', vi: 'Quên mật khẩu: Đăng nhập → đăng nhập Google → bấm Quên mật khẩu? để nhận email đặt lại.' },
    edit: { en: 'Click your name on the menu to open your Profile. You can change your avatar, display name, gender, birth date, phone and job there. The Google email cannot be changed.', vi: 'Bấm vào tên của bạn trên menu để mở Hồ sơ: đổi avatar, tên, giới tính, ngày sinh, số điện thoại, nghề nghiệp. Email Google không đổi được.' },
    switch: { en: 'To switch accounts, click \"Thoát\" (log out) on the menu, then sign in again with another Google account.', vi: 'Đổi tài khoản: bấm Thoát trên menu rồi đăng nhập lại bằng tài khoản Google khác.' },
    delete: { en: 'You can ask to have your data deleted at any time: open Chat → Admin tab and send the request. If you just registered, choose \"Không đồng ý\" on the privacy step to cancel right away.', vi: 'Bạn có thể yêu cầu xoá thông tin bất cứ lúc nào: mở Chat → tab Admin và nhắn yêu cầu. Vừa đăng ký xong thì bấm Không đồng ý ở bước quyền riêng tư để huỷ ngay.' },
    contact: { en: 'To reach a real person: log in, open Chat and choose the Admin tab, or click the \"Liên hệ\" button on the menu for the team’s contact details.', vi: 'Gặp người thật: đăng nhập, mở khung Chat và chọn tab Admin; hoặc bấm nút Liên hệ trên menu để xem thông tin liên hệ.' },
    complaint: { en: 'Sorry to hear that. Please tell the admin in Chat → Admin tab, or leave feedback in the Comments section — the team reads both.', vi: 'Rất tiếc về điều đó. Bạn nhắn admin ở Chat → tab Admin hoặc để lại góp ý ở mục Bình luận để nhóm xem xét.' },
    review: { en: 'You can leave a review in the Comments section: choose a star rating, write up to 700 characters and submit. It appears after the admin approves it.', vi: 'Để lại đánh giá ở mục Bình luận: chọn số sao, viết tối đa 700 ký tự rồi gửi. Bình luận hiện sau khi admin duyệt.' },
    newsletter: { en: 'There is no newsletter. To follow the project, check the Journey page and the GitHub / YouTube links in the footer.', vi: 'Web chưa có bản tin email. Bạn theo dõi dự án qua trang Hành trình và các liên kết GitHub / YouTube ở chân trang.' },
    shop: { en: 'Pipe Traffic is a student research project, not a shop, so there are no orders, payments, refunds or shipping here. Ask me about the project, the team or its progress instead.', vi: 'Pipe Traffic là dự án nghiên cứu của sinh viên, không bán hàng nên không có đơn hàng, thanh toán, hoàn tiền hay giao hàng. Bạn hỏi mình về dự án, thành viên hoặc tiến độ nhé.' }
  };
  const intentReply = q => { const c = classify(q); if (!c) return null; const a = INTENT_ANS[c.g]; return a ? a.en + '\n' + a.vi : null; };

  // ---------- Nhận ý đồ ----------
  const has = (fq, re) => re.test(fq);
  function smallTalk(fq) {
    if (has(fq, /^ (xin )?chao( ban| ad| admin| bot| tro ly)? $|^ (hello|hi|hey|alo|helo|hallo)( .*)? $/)) return 'greet';
    if (has(fq, / (cam on|camon|thanks|thank you|thank|cảm ơn) |^ ok (cam on)? $/)) return 'thanks';
    if (has(fq, / (tam biet|bye|goodbye|hen gap lai|chao nhe) /)) return 'bye';
    if (has(fq, /^ ?(ban|may|bot|tro ly) (la ai|ten gi|la gi|co the lam duoc gi|lam duoc gi|giup duoc gi|co the giup gi|biet gi|biet nhung gi)/) || has(fq, / ban lam duoc gi | ban giup duoc gi | giup gi duoc /)) return 'self';
    if (has(fq, / (con gi nua|noi them|tiep (di|nhe|tuc)?|chi tiet hon|cu the hon|them nua|khac nua) |^ tiep $/)) return 'more';
    return '';
  }
  const WHO = / ai (la|lam|phu trach|thiet ke|dung|viet|quan ly|dieu phoi|dam nhan|chu|nghien cuu|bien soan|tao ra|lap trinh|cau hinh|lo|thuyet trinh|ghi|tong hop|dua ra|nghi ra|ra y tuong)/;
  const TITLE = / (anh|chi|ban|em|thanh vien|ong|co|bac) (phuc|quan|lam|giau) /;

  function findPerson(fq, fqTokens) {
    for (const p of people) if (fq.includes(p.full) || fq.includes(p.last2)) return p.e;
    for (const p of people) {
      if (!fqTokens.includes(p.last)) continue;
      if (!p.ambiguous) return p.e;
      if (TITLE.test(fq) || fq.includes(' ' + p.last + ' la ai ')) return p.e;   // "anh Quân", "Lâm là ai" (còn "ai làm logo" thì KHÔNG phải tên người)
    }
    return null;
  }

  // ---------- Trả lời ----------
  let state = { list: [], pos: 0 };
  const more = e => e && e.more && e.more.length ? '\n\nBạn có thể hỏi thêm: ' + e.more.map(x => '"' + x + '"').join(' · ') : '';
  const OUT_SCOPE = () => 'Mình chưa tìm thấy thông tin về câu này. Mình trả lời được về: dự án Pipe Traffic là gì, nguyên lý & tính năng, so sánh với Metro, các bước sử dụng, thành viên, tiến độ từng tuần, quy tắc nhóm, liên hệ và video.\nVí dụ: ' + SUGGEST.slice(0, 3).map(x => '"' + x + '"').join(' · ') + '\nCần người thật? Mở tab Admin trong khung chat để nhắn cho admin (cần đăng nhập).';

  // Ghi lại câu hỏi bot chưa biết để admin dạy (mỗi câu một lần, tối đa 5 câu / lượt mở web)
  const logged = new Set(); let logCount = 0;
  function logMiss(q) {
    const key = fold(q).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    if (!window.Store || !key || q.length < 3 || q.length > 200 || logged.has(key) || logCount >= 5) return;
    logged.add(key); logCount++;
    Promise.resolve().then(() => Store.put('botlogs', { id: 'q-' + key, q: q.slice(0, 200), ts: Date.now() })).catch(() => {});
  }

  async function ask(q, _hist, opt) {
    q = String(q || '').trim(); const nolog = !!(opt && opt.nolog);
    if (!q) return 'Bạn hãy gõ câu hỏi nhé.';
    await ensure(); if (!index) build();
    const fq = norm(q), toks = fq.trim().split(' ');

    const st = smallTalk(fq);
    if (st === 'greet') return 'Xin chào! Mình là trợ lý ảo của Pipe Traffic. Bạn muốn biết điều gì: dự án, cách hoạt động, thành viên hay tiến độ?\nThử hỏi: "' + SUGGEST[0] + '"';
    if (st === 'thanks') return 'Không có gì! Cần hỏi thêm về Pipe Traffic cứ nhắn mình nhé.';
    if (st === 'bye') return 'Tạm biệt bạn! Chúc bạn một ngày tốt lành.';
    if (st === 'self') return KB.find(e => e.id === 'bot').a + '\n\nBạn có thể hỏi: ' + SUGGEST.map(x => '"' + x + '"').join(' · ');
    if (st === 'more') {
      const n = state.list[state.pos + 1];
      if (!n) return 'Mình chưa có thêm gì để bổ sung. Bạn thử hỏi cụ thể hơn, hoặc nhắn admin ở tab Admin nhé.';
      state.pos++; return n.e.a + more(n.e);
    }

    // Câu admin đã dạy, khớp nguyên văn: trả lời đúng như đã dạy
    const ex = dyn.find(e => e.taught && norm(e.t) === fq);
    if (ex) { state = { list: [{ e: ex }], pos: 0 }; return ex.a; }

    // "Tuần 2 làm gì?"
    const wk = fq.match(/ tuan (\d+) /);
    if (wk && journeyByWeek[wk[1]]) { state = { list: [{ e: journeyByWeek[wk[1]] }], pos: 0 }; return journeyByWeek[wk[1]].a; }

    // Hỏi về một người cụ thể / "ai làm ...?"
    const person = findPerson(fq, toks);
    if (person) { state = { list: [{ e: person }], pos: 0 }; return person.a; }
    let r = rank(q, WHO.test(fq) ? e => e.who : null);
    if (WHO.test(fq) && (!r[0] || r[0].s < 4 || r[0].cov < .3)) r = rank(q);   // hỏi "ai ..." mà không ra người nào thì tìm rộng hơn

    // Ngưỡng tin cậy
    const top = r[0];
    if (!top || top.s < 4 || top.cov < (WHO.test(fq) ? .3 : .55)) {
      state = { list: [], pos: 0 };
      const ir = intentReply(q); if (ir) return ir;          // câu hỏi tiếng Anh dạng hỗ trợ khách hàng (học từ bộ Bitext)
      if (!nolog) logMiss(q); return OUT_SCOPE();
    }
    state = { list: r.filter(x => x.s >= top.s * .45).slice(0, 4), pos: 0 };
    let ans = top.e.a + more(top.e);
    const next = r[1];
    if (next && next.s >= top.s * .7 && next.e.id !== top.e.id) ans += '\n\nCó thể bạn cũng muốn xem: ' + cut(next.e.t, 70) + ' (gõ "còn gì nữa" để mình trả lời).';
    return ans;
  }

  window.PT_AI = { ask, test: q => { dynAt = 0; return ask(q, null, { nolog: true }); }, reload: () => { dynAt = 0; }, suggest: SUGGEST, name: 'Trợ lý ảo Pipe Traffic', _debug: { classify, rank: q => ensure().then(() => rank(q)), norm, pull } };
  setTimeout(() => ensure(), 1500);   // nạp dữ liệu sẵn để lần hỏi đầu trả lời nhanh
})();
