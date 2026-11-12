// Màn hình loading dùng chung cho index.html và admin.html
(function () {
  const el = document.getElementById('loader'); if (!el) return;
  el.classList.remove('init'); // JS đã chạy: bỏ cơ chế tự ẩn dự phòng của CSS
  let t0 = Date.now(), timer, guard;
  window.Loader = {
    show() { clearTimeout(timer); clearTimeout(guard); t0 = Date.now(); el.classList.add('on'); guard = setTimeout(() => el.classList.remove('on'), 10000); },
    hide(min) { clearTimeout(timer); clearTimeout(guard); timer = setTimeout(() => el.classList.remove('on'), Math.max(0, (min || 0) - (Date.now() - t0))); }
  };
  // Chuyển giữa index.html <-> admin.html: hiện loading ngay khi bấm
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    const h = a.getAttribute('href') || '';
    if (h[0] !== '#' && /^[\w./-]+\.html(\?|#|$)/.test(h)) window.Loader.show();
  });
  addEventListener('pageshow', e => { if (e.persisted) window.Loader.hide(0); }); // nút Back
})();
