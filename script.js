/* ===== Tương tác của trang gốc (menu, tab, popup thành viên) =====
   Bọc trong IIFE để KHÔNG khai báo const/let toàn cục → không bao giờ lỗi
   "Identifier '$' has already been declared". Các hàm tiện ích vẫn dùng được
   ở app.js nhờ gán vào window (chỉ gán nếu chưa có). */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = m => { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), Math.max(2400, m.length * 70)); };

  // Chia sẻ cho app.js (không ghi đè nếu đã tồn tại)
  if (!('$' in window)) window.$ = $;
  if (!('esc' in window)) window.esc = esc;
  if (!('toast' in window)) window.toast = toast;

  /* --- Menu điện thoại --- */
  function toggleMobileMenu(force) {
    const m = $('#mobile-menu'), i = $('#mobile-menu-icon');
    if (!m || !i) return;
    const closed = typeof force === 'boolean' ? (m.classList.toggle('hidden', force), force) : m.classList.toggle('hidden');
    i.className = closed ? 'fa-solid fa-bars text-xl' : 'fa-solid fa-xmark text-xl';
  }

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

  // Các hàm được gọi từ onclick="..." trong HTML phải nằm trên window
  Object.assign(window, { toggleMobileMenu, switchTab, openMemberModal, closeMemberModal });
})();
