/* ===== Tương tác của trang gốc (menu, tab, popup thành viên) =====
   Bọc trong IIFE để KHÔNG khai báo const/let toàn cục → không bao giờ lỗi
   "Identifier '$' has already been declared". Các hàm tiện ích vẫn dùng được
   ở app.js nhờ gán vào window (chỉ gán nếu chưa có). */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = m => { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), Math.max(2400, m.length * 70)); };

  // Chia sẻ cho app.js (không ghi đè nếu đã tồn tại)
  // Lưu ý: <div id="toast"> khiến window.toast là một phần tử HTML, nên phải kiểm tra typeof === 'function'
  if (typeof window.$ !== 'function') window.$ = $;
  if (typeof window.esc !== 'function') window.esc = esc;
  if (typeof window.toast !== 'function') window.toast = toast;

  /* --- Menu trượt bên trái --- */
  // Bấm ☰ để mở/đóng. toggleMobileMenu(true) = đóng, toggleMobileMenu(false) = mở.   // <--- SỬA Ở ĐÂY
  function toggleMobileMenu(force) {
    const m = $('#mobile-menu'), i = $('#mobile-menu-icon');
    if (!m || !i) return;
    const open = typeof force === 'boolean' ? !force : !m.classList.contains('open');
    m.classList.toggle('open', open);
    m.setAttribute('aria-hidden', String(!open));
    i.className = open ? 'fa-solid fa-xmark text-xl' : 'fa-solid fa-bars text-xl';
    if (open) { fitSideMenu(); if (typeof closeChat === 'function') closeChat(); if (window.Search) Search.close(); }   // mở menu thì đóng chat + gợi ý tìm kiếm
  }

  // Menu luôn dừng ở mép trên Footer: khi cuộn tới cuối trang, đáy menu được đẩy lên theo   // <--- THÊM MỚI
  function fitSideMenu() {
    const m = $('#mobile-menu'), f = document.querySelector('footer'), mb = $('#mobbar');
    if (!m) return;
    const bar = mb && getComputedStyle(mb).display !== 'none' ? mb.offsetHeight : 0;                 // thanh công cụ dưới (điện thoại)
    const foot = f && f.offsetHeight ? Math.max(0, window.innerHeight - f.getBoundingClientRect().top) : 0;   // footer (máy tính)
    m.style.bottom = Math.max(bar, foot) + 'px';
  }
  window.addEventListener('scroll', fitSideMenu, { passive: true });
  window.addEventListener('resize', fitSideMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleMobileMenu(true); });   // Esc đóng menu
  document.addEventListener('click', e => {                                                         // bấm ra ngoài thì đóng menu
    const m = $('#mobile-menu');
    if (m && m.classList.contains('open') && !e.target.closest('#mobile-menu, #mobile-menu-btn')) toggleMobileMenu(true);
  });

  /* --- Tab 4.1 – 4.4 (mục Problems) --- */
  function switchTab(name) {
    const on = ['bg-sky-600', 'text-white', 'shadow-lg', 'shadow-sky-600/30'];
    const off = ['bg-white', 'text-slate-600', 'hover:text-sky-600', 'border', 'border-slate-200'];
    ['abstract', 'solution', 'methods', 'conclusions'].forEach(k => {
      const b = $('#tab-btn-' + k), c = $('#tab-' + k), a = k === name;
      if (!b || !c) return;
      c.classList.toggle('hidden', !a);
      b.classList.remove(...(a ? off : on)); b.classList.add(...(a ? on : off));
    });
  }

  /* --- Popup thành viên --- */
  function openMemberModal(name, role, desc) {
    $('#modal-name').textContent = name; $('#modal-role').textContent = role; $('#modal-desc').textContent = desc;
    $('#member-modal').classList.remove('hidden');
  }
  function closeMemberModal() { const m = $('#member-modal'); if (m) m.classList.add('hidden'); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMemberModal(); });
  document.addEventListener('click', e => { if (e.target.id === 'member-modal') closeMemberModal(); });

  /* --- Bình luận chung: lưu ở Firestore, admin duyệt rồi mới hiện --- */
  let rating = 5, commentList = [];
  const AVATAR = ['bg-sky-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500'];
  const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;                       // luôn ẩn email trên trang công khai
  const hideEmail = s => String(s ?? '').replace(EMAIL, '•••');
  const debugOn = () => sessionStorage.getItem('pt_admin') === '1' || /[?&]debug\b/.test(location.search); // chi tiết kỹ thuật chỉ hiện cho admin

  function setRating(n) {
    rating = n;
    document.querySelectorAll('.star-btn').forEach((s, i) => { s.style.opacity = i < n ? 1 : .25; });
    const t = $('#ratingValueText'); if (t) t.textContent = n + '/5 Sao';
  }
  function toggleIdentityFields() {
    const anon = document.querySelector('input[name="identityMode"]:checked').value === 'anonymous';
    $('#realNameInputs').classList.toggle('hidden', anon);
  }
  function updateCharCount() { $('#charCount').textContent = $('#commentText').value.length + '/500'; }
  function addEmoji(e) {
    const t = $('#commentText'); if (t.value.length + e.length > 500) return;
    t.value += (t.value && !t.value.endsWith(' ') ? ' ' : '') + e + ' '; updateCharCount(); t.focus();
  }

  function renderComments() {
    const box = $('#commentsContainer'); if (!box) return;
    const list = [...commentList].reverse();
    $('#commentBadgeCount').textContent = list.length;
    const info = debugOn() ? `<div class="text-[11px] text-slate-500 text-right">Chế độ admin · ${Store.mode === 'firebase' ? 'Firestore' : 'chế độ thử (chỉ lưu trong trình duyệt này)'} · ${list.length} bình luận đã duyệt</div>` : '';
    box.innerHTML = info + (list.map(m => {
      const star = Math.min(5, Math.max(0, +m.rating || 0)), role = /@/.test(m.role || '') ? '' : (m.role || ''), text = hideEmail(m.text);
      const when = new Date(m.ts).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
      const name = hideEmail(m.name || 'Ẩn danh'), col = AVATAR[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
      return `<div class="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5"><div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-full ${col} text-white font-extrabold flex items-center justify-center shrink-0">${esc(name.trim().charAt(0).toUpperCase() || '?')}</div>
        <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-x-2 gap-y-1"><b class="text-white text-sm">${esc(name)}</b>
        ${role ? `<span class="text-[11px] text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-full">${esc(role)}</span>` : ''}
        <span class="text-[11px] text-slate-500 sm:ml-auto">${esc(when)}</span></div>
        ${star ? `<div class="text-amber-400 text-xs my-1">${'★'.repeat(star)}${'☆'.repeat(5 - star)}</div>` : ''}
        <p class="text-slate-300 text-sm mt-1 whitespace-pre-wrap break-words">${esc(text)}</p></div></div></div>`;
    }).join('') || '<p class="text-slate-500 text-sm text-center py-8">Chưa có bình luận nào được hiển thị. Hãy là người đầu tiên!</p>');
  }

  // Tên hàm giữ nguyên vì nút "Làm mới" trong index.html đang gọi nó
  async function loadCommentsFromSheet() {
    const box = $('#commentsContainer'); if (!box) return;
    if (!commentList.length) box.innerHTML = '<p class="text-slate-500 text-sm text-center py-8">Đang tải bình luận…</p>';
    try { commentList = await Store.list('comments', { where: ['approved', '==', true] }); }
    catch (e) {
      box.innerHTML = `<div class="text-center py-8"><p class="text-red-300 text-sm">Chưa tải được bình luận lúc này.</p>
        ${debugOn() ? `<p class="text-xs text-slate-400 mt-1">${esc(e.message)}</p>` : ''}
        <button type="button" onclick="loadCommentsFromSheet()" class="mt-3 text-sm text-sky-300 underline">Thử lại</button></div>`;
      return;
    }
    renderComments();
  }

  async function handleCommentSubmit(ev) {
    ev.preventDefault();
    const btn = $('#submitBtn');
    const anon = document.querySelector('input[name="identityMode"]:checked').value === 'anonymous';
    const name = (anon ? 'Ẩn danh' : $('#commenterName').value.trim()).slice(0, 80);
    const role = (anon ? '' : $('#commenterRole').value.trim()).slice(0, 80);
    const text = $('#commentText').value.trim();
    if (!name) return toast('Vui lòng nhập họ tên hoặc chọn Ẩn danh');
    if (text.length < 2) return toast('Hãy nhập nội dung bình luận');
    if (Date.now() - (+localStorage.getItem('pt_last_comment') || 0) < 15000) return toast('Bạn gửi hơi nhanh, đợi vài giây nhé');
    const html = btn.innerHTML; btn.disabled = true; btn.style.opacity = .6; btn.textContent = 'Đang gửi…';
    try {
      // approved:false => chỉ hiện trên web sau khi admin duyệt (Rules cũng bắt buộc điều này)
      await Store.put('comments', { name, role, rating, text: text.slice(0, 700), ts: Date.now(), approved: false });
      localStorage.setItem('pt_last_comment', Date.now());
      $('#commentText').value = ''; updateCharCount();
      toast('Đã gửi! Bình luận sẽ hiện sau khi quản trị viên duyệt.');
    } catch (e) { toast('Gửi chưa được. ' + (debugOn() ? e.message : 'Vui lòng thử lại sau ít phút.')); }
    btn.disabled = false; btn.style.opacity = 1; btn.innerHTML = html;
  }

  /* --- Banner Cookie: nhớ lựa chọn trong localStorage (khoá pt_cookie) --- */   // <--- THÊM MỚI
  (function initCookie() {
    const bar = $('#cookie-bar'); if (!bar) return;
    let saved = null; try { saved = localStorage.getItem('pt_cookie'); } catch (x) { /* không đọc được thì vẫn hiện banner */ }
    if (saved) return;                                       // đã chọn rồi: không hiện lại
    setTimeout(() => { bar.hidden = false; }, 800);          // đợi màn hình chờ tắt rồi mới hiện
    bar.addEventListener('click', e => {
      const b = e.target.closest('[data-cookie]'); if (!b) return;
      try { localStorage.setItem('pt_cookie', b.dataset.cookie); } catch (x) { /* bỏ qua */ }
      bar.hidden = true;
    });
  })();

  // Các hàm được gọi từ onclick="..." trong HTML phải nằm trên window
  Object.assign(window, { toggleMobileMenu, switchTab, openMemberModal, closeMemberModal, setRating, toggleIdentityFields, updateCharCount, addEmoji, handleCommentSubmit, loadCommentsFromSheet });
})();
