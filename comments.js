/* ===== Bình luận gọn: dùng chung cho trang Video và cuối MỌI trang dự án =====
   - Dùng: Cmt.mount(phầnTửChứa, 'video')  hoặc  Cmt.mount(phầnTửChứa, 'p:' + idDựÁn)
   - Mỗi bình luận lưu ở bộ sưu tập "comments" kèm trường scope (video / p:<id>). Bình luận cũ chưa có scope được tính là của trang Video.
   - Chỉ cần gõ nội dung rồi Gửi. Đã đăng nhập thì tự lấy tên; chưa đăng nhập thì nhập tên (hoặc để trống = Ẩn danh).
   - Vẫn chờ admin duyệt rồi mới hiện (Rules yêu cầu approved:false khi tạo).
   - Phần chữ trong danh sách có data-autotr nên được tự dịch sang tiếng Anh khi bấm 🌐 (xem i18n.js). */
(function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;                      // luôn ẩn email trên trang công khai
  const hideEmail = s => String(s ?? '').replace(EMAIL, '•••');
  const COLORS = ['#0ea5e9', '#6366f1', '#06b6d4', '#10b981', '#f59e0b'];
  const say = m => { try { if (typeof toast === 'function') return toast(m); } catch (x) { /* dùng alert */ } alert(m); };
  const T = (vi, en) => (window.I18N ? I18N.t(vi, en) : vi);

  function item(m) {
    const name = hideEmail(m.name || 'Ẩn danh'), c = COLORS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];
    const when = m.ts ? new Date(m.ts).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '';
    return `<div class="cmt-it"><span class="cmt-av" style="background:${c}">${esc(name.trim().charAt(0).toUpperCase() || '?')}</span>
      <div class="cmt-bd"><div class="cmt-top"><b data-no-i18n>${esc(name)}</b><small>${esc(when)}</small></div>
      <p>${esc(hideEmail(m.text))}</p></div></div>`;
  }

  const Cmt = window.Cmt = {
    async mount(box, scope) {
      if (!box) return;
      const me = (window.Store && Store.me && Store.me()) || null;
      box.classList.add('cmt');
      box.innerHTML = `<div class="cmt-h"><h3>Bình luận <span class="cmt-n">0</span></h3></div>
        <form class="cmt-f" autocomplete="off">
          ${me ? '' : '<input class="cmt-name" maxlength="60" placeholder="Tên của bạn (để trống = Ẩn danh)">'}
          <div class="cmt-r"><textarea rows="2" maxlength="500" placeholder="Viết bình luận… (Enter để gửi, Shift+Enter xuống dòng)" required></textarea></div>
        </form>
        <div class="cmt-list" data-autotr><p class="cmt-empty">Đang tải bình luận…</p></div>`;
      const list = box.querySelector('.cmt-list'), n = box.querySelector('.cmt-n'), form = box.querySelector('.cmt-f');

      const load = async () => {
        try {
          const all = await Store.list('comments', { where: ['approved', '==', true] });
          if (!document.body.contains(box)) return;
          const mine = all.filter(c => (c.scope || 'video') === scope).sort((a, b) => (b.ts || 0) - (a.ts || 0));
          n.textContent = mine.length;
          list.innerHTML = mine.map(item).join('') || '<p class="cmt-empty">Chưa có bình luận nào. Hãy là người đầu tiên!</p>';
        } catch (e) {
          if (document.body.contains(box)) list.innerHTML = '<p class="cmt-empty">Chưa tải được bình luận. <a href="#" class="cmt-retry">Thử lại</a></p>';
        }
      };
      box.addEventListener('click', e => { if (e.target.closest('.cmt-retry')) { e.preventDefault(); load(); } });

      form.querySelector('textarea').addEventListener('keydown', e => {
        if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
        e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
      });
      form.onsubmit = async e => {
        e.preventDefault();
        const ta = form.querySelector('textarea'), nm = form.querySelector('.cmt-name');
        const text = ta.value.trim(), name = ((me && me.name) || (nm && nm.value.trim()) || 'Ẩn danh').slice(0, 80);
        if (text.length < 2) return say(T('Hãy nhập nội dung bình luận', 'Please write a comment'));
        if (Date.now() - (+localStorage.getItem('pt_last_comment') || 0) < 15000) return say(T('Bạn gửi hơi nhanh, đợi vài giây nhé', 'You are sending too fast, please wait a few seconds'));
        ta.disabled = true;
        try {
          await Store.put('comments', { name, role: '', rating: 0, text: text.slice(0, 700), ts: Date.now(), approved: false, scope });
          localStorage.setItem('pt_last_comment', Date.now()); ta.value = '';
          say(T('Đã gửi! Bình luận sẽ hiện sau khi quản trị viên duyệt.', 'Sent! Your comment will appear after the admin approves it.'));
        } catch (x) { say(T('Gửi chưa được: ', 'Could not send: ') + (x.message || 'thử lại sau ít phút')); }
        ta.disabled = false; ta.focus();
      };
      await load();
    }
  };

  const css = document.createElement('style');
  css.textContent = `
.cmt{max-width:760px;margin:0 auto;padding:8px 0 0;color:#0f172a}
.cmt-h h3{margin:0 0 12px;font-size:1.15rem;font-weight:800;display:flex;align-items:center;gap:8px}
.cmt-n{font-size:.75rem;font-weight:700;padding:2px 10px;border-radius:99px;background:#e0f2fe;color:#0369a1}
.cmt-f{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
.cmt-f input,.cmt-f textarea{width:100%;font:inherit;font-size:16px;color:#0f172a;background:#fff;border:1px solid #cbd5e1;border-radius:14px;padding:10px 14px;outline:0;resize:vertical}
.cmt-f input:focus,.cmt-f textarea:focus{border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.25)}
.cmt-r{display:flex}
.cmt-r textarea{flex:1;min-height:46px;max-height:160px}
.cmt-send{flex:none;height:46px;padding:0 22px;border:0;border-radius:14px;background:#0284c7;color:#fff;font:inherit;font-weight:700;cursor:pointer}
.cmt-send:disabled{opacity:.5;cursor:default}
.cmt-it{display:flex;gap:12px;padding:12px 0;border-top:1px solid #e2e8f0}
.cmt-av{flex:none;width:38px;height:38px;border-radius:50%;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
.cmt-bd{min-width:0;flex:1}
.cmt-top{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}
.cmt-top b{font-size:.92rem}.cmt-top small{color:#64748b;font-size:.72rem}
.cmt-bd p{margin:3px 0 0;font-size:.93rem;line-height:1.5;white-space:pre-wrap;word-break:break-word;color:#334155}
.cmt-empty{margin:0;padding:18px 0;text-align:center;color:#64748b;font-size:.9rem}
.cmt-empty a{color:#0284c7;text-decoration:underline}
html[data-theme=dark] .cmt{color:#e2e8f0}
html[data-theme=dark] .cmt-f input,html[data-theme=dark] .cmt-f textarea{background:#111c31;color:#e2e8f0;border-color:#26364f}
html[data-theme=dark] .cmt-n{background:#0c4a6e;color:#bae6fd}
html[data-theme=dark] .cmt-it{border-color:#26364f}
html[data-theme=dark] .cmt-bd p{color:#cbd5e1}
html[data-theme=dark] .cmt-top small,html[data-theme=dark] .cmt-empty{color:#94a3b8}
`;
  document.head.appendChild(css);
})();
