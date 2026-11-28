/* ===== Nội dung sửa được trong admin: Journey, Team, Review chuyên gia, FAQ, Video demo, Liên hệ =====
   - Nếu admin chưa nhập gì vào mục nào thì trang hiện nội dung mẫu trong index.html.
   - Có chữ **in đậm** bằng cách bọc hai dấu sao. */
(function () {
  const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = s => e(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Bảng màu: ghi đủ tên class để Tailwind biên dịch (đừng ghép chuỗi động)
  const C = {
    sky:     { circle: 'bg-sky-500 shadow-sky-500/50',         pill: 'bg-sky-500/20 text-sky-300',         check: 'text-sky-400',     border: 'border-sky-400',     role: 'text-sky-600',     btn: 'text-sky-600' },
    indigo:  { circle: 'bg-indigo-500 shadow-indigo-500/50',   pill: 'bg-indigo-500/20 text-indigo-300',   check: 'text-indigo-400',  border: 'border-indigo-400',  role: 'text-indigo-600',  btn: 'text-indigo-600' },
    cyan:    { circle: 'bg-cyan-500 shadow-cyan-500/50',       pill: 'bg-cyan-500/20 text-cyan-300',       check: 'text-cyan-400',    border: 'border-cyan-400',    role: 'text-cyan-600',    btn: 'text-cyan-600' },
    rose:    { circle: 'bg-rose-500 shadow-rose-500/50',       pill: 'bg-rose-500/20 text-rose-300',       check: 'text-rose-400',    border: 'border-rose-400',    role: 'text-rose-600',    btn: 'text-rose-600' },
    emerald: { circle: 'bg-emerald-500 shadow-emerald-500/50', pill: 'bg-emerald-500/20 text-emerald-300', check: 'text-emerald-400', border: 'border-emerald-400', role: 'text-emerald-600', btn: 'text-emerald-600' }
  };
  const col = c => C[c] || C.sky;
  const safeImg = u => /^(https?:\/\/|data:image\/)/i.test(u || '') || /^[\w\-./]+\.(jpe?g|png|webp|gif|svg)$/i.test(u || '') ? u : '';
  const DEFAULTS = {
 "journey": [
  {
   "color": "sky",
   "week": "Tuần 1",
   "title": "Khởi Tạo & Định Hình Dự Án",
   "items": [
    "Họp nhóm phân công vai trò, thành lập **Hợp đồng nhóm**.",
    "Thống nhất quy tắc làm việc và kênh giao tiếp chung.",
    "**Nguyễn Giàu** đảm nhận thiết kế Logo nhóm.",
    "Brainstorming ý tưởng giải pháp giao thông đường ống từ trường."
   ]
  },
  {
   "color": "indigo",
   "week": "Tuần 2",
   "title": "Nghiên Cứu & Thiết Kế Giải Pháp",
   "items": [
    "Phân tích bài toán giao thông urban/không gian hẹp đô thị.",
    "Hoàn thiện cấu trúc nội dung 4 phần: **Abstract, Solution, Methods, Conclusions**.",
    "Phác thảo sơ đồ đường ống nhiều tầng và tích hợp AI điều hướng.",
    "Thu thập tư liệu và lên kịch bản kịch tính dựng Video giới thiệu."
   ]
  },
  {
   "color": "emerald",
   "week": "Tuần 3",
   "title": "Xây Dựng Website & Dựng Video",
   "items": [
    "Tạo và hoàn thiện cấu trúc Website nhóm mã nguồn chuẩn trên nền tảng Web.",
    "Dựng và edit hoàn chỉnh Video demo / giới thiệu dự án.",
    "Kiểm thử tính năng, rà soát toàn bộ nội dung và chuẩn bị báo cáo hoàn thành."
   ]
  }
 ],
 "team": [
  {
   "photo": "https://i.postimg.cc/qqd6Sfps/Anh-Giau.jpg",
   "color": "sky",
   "name": "Nguyễn Giàu",
   "role": "Design Lead & Graphic",
   "short": "Thiết kế Logo nhóm, làm mind map, thuyết trình mind map.",
   "modalRole": "Design Lead & Graphic Specialist",
   "detail": "Thiết kế Logo nhóm, nhận diện thương hiệu, chịu trách nhiệm thiết kế giao diện đồ họa cho dự án Pipe Traffic."
  },
  {
   "photo": "https://i.postimg.cc/x1sHCF3s/Hoang-Quan.jpg",
   "color": "indigo",
   "name": "Huỳnh Hoàng Quân",
   "role": "Technical & Web Dev",
   "short": "Cấu hình & dựng cấu trúc Website, làm mind map.",
   "modalRole": "Technical & Web Developer",
   "detail": "Cấu hình và dựng cấu trúc Website nhóm, tích hợp các nội dung công nghệ và tương tác."
  },
  {
   "photo": "https://i.postimg.cc/h4x9rsKh/Khanh.jpg",
   "color": "cyan",
   "name": "Gia Khánh",
   "role": "Research & Content",
   "short": "Chủ ý tưởng Pipe Traffic, làm mind map, phát triển dự án.",
   "modalRole": "Research & Content Specialist",
   "detail": "Thu thập tài liệu chuyên môn, biên soạn nội dung 4 phần: Abstract, Solution, Methods và Conclusions."
  },
  {
   "photo": "https://i.postimg.cc/x8rLQJ32/Thuy-Lam.jpg",
   "color": "rose",
   "name": "Thùy Lâm",
   "role": "Media & Video Producer",
   "short": "Biên bản họp, dựng video demo và hậu kỳ truyền thông, mind map.",
   "modalRole": "Media & Video Producer",
   "detail": "Lên kịch bản chi tiết phân cảnh, dựng video demo và thực hiện công tác hậu kỳ nội dung truyền thông dự án."
  },
  {
   "photo": "https://i.postimg.cc/TPCbKNqv/Trong-Phuc.png",
   "color": "emerald",
   "name": "Trọng Phúc",
   "role": "Project Manager",
   "short": "Điều phối tiến độ, Hợp đồng nhóm, Quy tắc & tổng hợp tài liệu.",
   "modalRole": "Project Manager & Documentation",
   "detail": "Điều phối tiến độ công việc, xây dựng Hợp đồng thành lập nhóm, Quy tắc giao tiếp và tổng hợp toàn bộ tài liệu dự án."
  }
 ],
 "reviews": [
  {
   "text": "Ý tưởng lắp đặt đường ống trượt từ trường tận hộ gia đình mang tính tiên phong rất cao cho không gian hẹp đô thị.",
   "name": "TS. Nguyễn Gia Khánh",
   "title": "Chuyên gia Quy hoạch Hạ tầng",
   "stars": 5
  },
  {
   "text": "Việc kết hợp AI điều hướng khẩn cấp giúp loại bỏ hoàn toàn hiện tượng ùn tắc và đảm bảo an toàn tuyệt đối.",
   "name": "Trọng Phúc",
   "title": "Kỹ sư Giao thông Đô thị",
   "stars": 5
  },
  {
   "text": "Tiết kiệm chi phí đền bù giải phóng mặt bằng so với dự án Metro truyền thống là điểm cộng lớn nhất.",
   "name": "Lê Hoàng Nam",
   "title": "Đại diện Quỹ Đầu Tư Công Nghệ",
   "stars": 5
  }
 ],
 "faq": [
  {
   "q": "Hệ thống đường ống trượt từ trường hoạt động như thế nào tại nhà?",
   "a": "Đường ống trượt từ tính được lắp đặt mô-đun hóa nối trực tiếp tới cổng hộ gia đình hoặc tầng kỹ thuật tòa nhà. Cabin di chuyển nhờ lực đẩy đệm từ không ma sát."
  },
  {
   "q": "Thuật toán AI xử lý tình huống khẩn cấp ra sao?",
   "a": "AI liên tục đo khoảng cách an toàn thời gian thực giữa các cabin. Khi có tín hiệu ưu tiên (cấp cứu, cứu hỏa), AI tự động di chuyển các cabin thường sang tầng ống phụ để mở lộ trình trống ngay lập tức."
  },
  {
   "q": "Dự án tuân thủ theo cơ quan quản lý nào?",
   "a": "Toàn bộ phương pháp triển khai thi công đường ống ngầm/trên cao đều được thiết kế tuân thủ nghiêm ngặt theo các quy chuẩn an toàn do **Bộ Xây dựng** cấp phép."
  }
 ],
 "video": {
  "tag": "Truyền Thông Dự Án",
  "title": "Video Giới Thiệu & Kịch Bản Đô Thị",
  "videoUrl": "",
  "cover": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
  "playTitle": "Xem Video Demo Nguyên Lý Hoạt Động Pipe Traffic",
  "playSub": "Sản phẩm truyền thông nhóm sinh viên HCMUS",
  "scenesTitle": "Kịch Bản Phân Cảnh Video (5 Scenes)",
  "scenes": [
   "Scene 1 (0:00 - 0:25) | Cảnh tắc đường đô thị giờ cao điểm. *\"Tắc nghẽn giao thông, diện tích đất hạn hẹp và ô nhiễm – bài toán chưa có lời giải.\"*",
   "Scene 2 (0:25 - 0:55) | Logo Pipe Traffic xuất hiện (Giàu thiết kế). Mô hình 3D đường ống kết nối giữa các tòa nhà đô thị.",
   "Scene 3 (0:55 - 1:40) | Mô phỏng đường ống đa tầng, cabin trượt đệm từ tính và thuật toán AI tự động điều phối khoảng cách khẩn cấp.",
   "Scene 4 (1:40 - 2:15) | Sơ đồ thi công chuẩn quy chuẩn Bộ Xây dựng và hình ảnh 5 thành viên nhóm HCMUS thảo luận làm việc.",
   "Scene 5 (2:15 - 2:30) | Slide kết thúc: Logo nhóm + Tên 5 thành viên + Thông điệp *\"Pipe Traffic – Kết nối không giới hạn\"*."
  ]
 },
 "contact": {
  "title": "Liên Hệ Nhóm Dự Án",
  "intro": "Pipe Traffic Dev Team – sinh viên Trường Đại học Khoa học Tự nhiên TP.HCM (HCMUS). Bạn muốn góp ý hoặc hợp tác, hãy liên hệ nhóm qua các kênh dưới đây.",
  "rows": [
   "GitHub | https://github.com/huynhhoangquan204-bot/pipetraffic-devteam-hcmus",
   "YouTube | https://www.youtube.com/watch?v=al_L4F2ac9c&t=1s",
   "Trường | Đại học Khoa học Tự nhiên, ĐHQG-HCM"
  ],
  "note": ""
 }
};

  window.Content = {
    colors: Object.keys(C),
    defaults: DEFAULTS,
    rich,
    sort: list => [...list].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || (a.ts || 0) - (b.ts || 0)),

    journey(list) {
      return list.map((j, i) => {
        const c = col(j.color), n = (String(j.week).match(/\d+/) || [i + 1])[0], left = i % 2 === 0, last = i === list.length - 1;
        const card = `<div class="bg-slate-800/90 p-8 rounded-3xl border border-slate-700 shadow-xl w-full text-left backdrop-blur-md">
          <div class="inline-block px-3.5 py-1 rounded-full ${c.pill} text-xs font-bold mb-3">${e(j.week)}</div>
          <h3 class="text-2xl font-bold text-white mb-3">${e(j.title)}</h3>
          <ul class="text-sm text-slate-300 space-y-2.5">${(j.items || []).map(t => `<li class="flex items-start gap-2.5"><i class="fa-solid fa-check ${c.check} mt-1"></i> ${rich(t)}</li>`).join('')}</ul></div>`;
        const dot = `<div class="w-14 h-14 rounded-full ${c.circle} text-white font-extrabold text-base flex items-center justify-center border-4 border-slate-900 shrink-0 shadow-lg my-2 md:my-0">T${e(n)}</div>`;
        return `<div class="${last ? '' : 'mb-12 '}relative z-10 flex flex-col md:flex-row items-center">` + (left
          ? `<div class="flex items-center justify-start md:justify-end w-full md:w-1/2 md:pr-12 mb-4 md:mb-0">${card}</div>${dot}<div class="w-full md:w-1/2 md:pl-12"></div>`
          : `<div class="w-full md:w-1/2 md:pr-12"></div>${dot}<div class="flex items-center justify-start w-full md:w-1/2 md:pl-12 mt-4 md:mt-0">${card}</div>`) + '</div>';
      }).join('');
    },

    team(list) {
      return list.map(m => {
        const c = col(m.color), img = safeImg(m.photo);
        const pic = img
          ? `<img src="${e(img)}" alt="${e(m.name)}" class="w-20 h-20 mx-auto rounded-full object-cover mb-4 shadow-md group-hover:scale-105 transition-transform border-2 ${c.border}">`
          : `<div class="w-20 h-20 mx-auto rounded-full mb-4 shadow-md bg-slate-200 text-slate-500 text-2xl font-extrabold flex items-center justify-center border-2 ${c.border}">${e(String(m.name || '?').trim().charAt(0).toUpperCase())}</div>`;
        return `<div class="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center hover:shadow-xl transition-all group flex flex-col justify-between">
          <div>${pic}<h3 class="font-bold text-slate-900 text-base">${e(m.name)}</h3><p class="text-xs font-semibold ${c.role} mt-1">${e(m.role)}</p>
          <p class="text-[11px] text-slate-500 mt-2 line-clamp-2">${e(m.short)}</p></div>
          <button data-name="${e(m.name)}" data-role="${e(m.modalRole || m.role)}" data-desc="${e(m.detail || m.short)}" onclick="openMemberModal(this.dataset.name, this.dataset.role, this.dataset.desc)" class="mt-4 text-xs font-bold ${c.btn} hover:underline flex items-center justify-center gap-1 mx-auto">Chi tiết <i class="fa-solid fa-arrow-right text-[10px]"></i></button></div>`;
      }).join('');
    },

    reviews(list) {
      return list.map(r => {
        const n = Math.min(5, Math.max(1, +r.stars || 5));
        const stars = Array.from({ length: 5 }, (_, i) => `<i class="fa-solid fa-star${i < n ? '' : ' text-slate-300'}"></i>`).join('');
        return `<div class="p-8 rounded-3xl bg-slate-50 border border-slate-200"><div class="flex text-amber-400 gap-1 text-base mb-4">${stars}</div>
          <p class="text-slate-700 text-sm sm:text-base leading-relaxed mb-6">"${rich(r.text)}"</p>
          <div class="font-bold text-slate-900 text-base">${e(r.name)}</div><p class="text-xs text-slate-500">${e(r.title)}</p></div>`;
      }).join('');
    },

    faq(list) {
      return list.map((q, i) => `<div class="bg-slate-50 rounded-2xl border border-slate-200 p-6"><h3 class="font-bold text-slate-900 text-lg mb-2">${i + 1}. ${e(q.q)}</h3>
        <p class="text-slate-600 text-sm sm:text-base leading-relaxed">${rich(q.a)}</p></div>`).join('');
    },

    /* ----- Video demo: trả về phần bên trong <section id="video"> ----- */
    video(v) {
      v = { ...DEFAULTS.video, ...(v || {}) };
      const url = String(v.videoUrl || '').trim(), emb = url && window.Media ? Media.embed(url) : null;
      const cover = safeImg(v.cover) || safeImg(DEFAULTS.video.cover);
      const poster = `<img src="${e(cover)}" alt="Video Cover" class="w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity">`;
      const label = `<div class="absolute text-center p-6"><span class="w-20 h-20 rounded-full bg-sky-600 text-white text-2xl flex items-center justify-center shadow-lg shadow-sky-600/50 hover:scale-110 transition-transform mx-auto mb-4"><i class="fa-solid fa-play ml-1"></i></span>
        ${v.playTitle ? `<p class="text-white font-bold text-xl">${e(v.playTitle)}</p>` : ''}${v.playSub ? `<p class="text-slate-300 text-sm mt-1">${e(v.playSub)}</p>` : ''}</div>`;
      const frame = 'w-full rounded-3xl overflow-hidden shadow-2xl bg-slate-950 border border-slate-800 aspect-video relative flex items-center justify-center group yt-vp';
      let player;
      if (emb && emb.k === 'video') player = `<div class="${frame}"><video controls preload="metadata" poster="${e(cover)}" src="${e(emb.src)}" style="position:absolute;inset:0;width:100%;height:100%"></video></div>`;
      else if (emb) player = `<div class="${frame}"><iframe src="${e(emb.src)}" allowfullscreen loading="lazy" allow="fullscreen; picture-in-picture" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>`;
      else if (/^https?:\/\/\S+$/i.test(url)) player = `<a href="${e(url)}" target="_blank" rel="noopener" class="${frame}">${poster}${label}</a>`;
      else player = `<div class="${frame}">${poster}${label}</div>`;

      const rows = (v.scenes || []).map(s => {
        s = String(s); const i = s.indexOf('|'), a = i < 0 ? '' : s.slice(0, i).trim(), b = i < 0 ? s.trim() : s.slice(i + 1).trim();
        return `<div class="pt-3 flex flex-col sm:flex-row gap-4 justify-between">${a ? `<span class="font-bold text-slate-900 shrink-0 w-40">${e(a)}</span>` : ''}<p class="grow">${rich(b).replace(/\*(.+?)\*/g, '<em>$1</em>')}</p></div>`;
      }).join('');
      let vst = {}; try { vst = JSON.parse(localStorage.getItem('pt_vs')) || {}; } catch (x) { /* mặc định */ }
      const vHid = !!vst.hidden, vBig = !!vst.big;
      const scenes = rows ? `<div class="yt-vs vs-box w-full bg-white rounded-3xl border border-slate-200 p-6 shadow-sm" data-vs data-hidden="${vHid ? 1 : 0}" data-big="${vBig ? 1 : 0}">
        <div class="vs-head"><h4 class="font-bold text-slate-900 text-lg flex items-center gap-2"><i class="fa-solid fa-clapperboard text-sky-600"></i> ${e(v.scenesTitle)}</h4>
        <div class="vs-ctl"><button type="button" data-vs-act="size" aria-expanded="${vBig}">${vBig ? 'Thu hẹp' : 'Mở rộng'}</button><button type="button" data-vs-act="hide" aria-expanded="${!vHid}">${vHid ? 'Hiện kịch bản' : 'Tắt kịch bản'}</button></div></div>
        <div class="vs-body"><div class="space-y-4 text-sm text-slate-700 divide-y divide-slate-100">${rows}</div></div></div>` : '';
      return `<div class="w-full px-4 sm:px-8 lg:px-16"><div class="yt-vh text-center max-w-4xl mx-auto mb-12">
        ${v.tag ? `<h2 class="text-xs font-bold uppercase tracking-widest text-sky-600 mb-2">${e(v.tag)}</h2>` : ''}<p class="text-3xl font-extrabold text-slate-900">${e(v.title)}</p></div>${player}${scenes}</div>`;
    },

    /* ----- Liên hệ (popup): trả về phần bên trong khung #contactBody ----- */
    contact(c) {
      c = { ...DEFAULTS.contact, ...(c || {}) };
      const item = v => {
        let m;
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return ['fa-solid fa-envelope', 'mailto:' + v, v];
        if (/^\+?\d[\d\s().-]{6,}$/.test(v)) return ['fa-solid fa-phone', 'tel:' + v.replace(/[^\d+]/g, ''), v];
        if (/^https?:\/\/\S+$/i.test(v)) {
          const ic = /facebook\.com|fb\.com|fb\.me/i.test(v) ? 'fa-brands fa-facebook' : /github\.com/i.test(v) ? 'fa-brands fa-github' : /youtube\.com|youtu\.be/i.test(v) ? 'fa-brands fa-youtube' : /zalo\./i.test(v) ? 'fa-solid fa-comment' : 'fa-solid fa-link';
          return [ic, v, v.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')];
        }
        return ['fa-solid fa-location-dot', '', v];
      };
      const list = (c.rows || []).map(s => {
        s = String(s); const i = s.indexOf('|'), a = i < 0 ? '' : s.slice(0, i).trim(), b = i < 0 ? s.trim() : s.slice(i + 1).trim();
        if (!b) return ''; const [ic, href, txt] = item(b);
        return `<li><i class="${ic}"></i><div style="min-width:0">${a ? `<small>${e(a)}</small>` : ''}${href ? `<a href="${e(href)}" ${/^https?:/i.test(href) ? 'target="_blank" rel="noopener"' : ''}>${e(txt)}</a>` : `<span>${e(txt)}</span>`}</div></li>`;
      }).join('');
      return `<h3>${e(c.title)}</h3>${c.intro ? `<p>${e(c.intro)}</p>` : ''}${list ? `<ul class="pp-list">${list}</ul>` : ''}${c.note ? `<div class="pp-note">${e(c.note)}</div>` : ''}`;
    }
  };
})();
