/* ===== Nội dung sửa được trong admin: Journey, Team, Review chuyên gia, FAQ =====
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
 ]
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
    }
  };
})();
