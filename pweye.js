/* ===== Nút con mắt cho mọi ô mật khẩu =====
   Tự gắn vào MỌI <input type="password"> (kể cả ô được tạo sau này: đăng nhập, đăng ký, nhập lại mật khẩu, admin).
   Bấm vào con mắt để hiện / che mật khẩu. Dùng ở index.html và admin.html. */
(function () {
  'use strict';
  const EYE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19c-7 0-11-7-11-7a19.8 19.8 0 0 1 5.06-5.94M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 7 11 7a19.9 19.9 0 0 1-3.17 4.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';

  const css = document.createElement('style');
  css.textContent = `
.pw-wrap{position:relative;display:block}
.pw-wrap>input{width:100%;padding-right:46px!important;box-sizing:border-box}
.pw-eye{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:none;color:#64748b;cursor:pointer;padding:0;margin:0;min-height:0}
.pw-eye:hover{background:#f1f5f9;color:#0284c7}
.pw-eye:focus-visible{outline:2px solid #0284c7;outline-offset:1px}`;
  document.head.appendChild(css);

  function wire(inp) {
    if (inp.dataset.pwEye) return;
    inp.dataset.pwEye = '1';
    const cs = getComputedStyle(inp), box = document.createElement('span');
    box.className = 'pw-wrap'; box.style.margin = cs.margin; inp.style.margin = '0';   // giữ khoảng cách như ô gốc
    inp.parentNode.insertBefore(box, inp); box.appendChild(inp);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pw-eye'; b.innerHTML = EYE;
    b.setAttribute('aria-label', 'Hiện mật khẩu'); b.setAttribute('aria-pressed', 'false');
    b.onclick = () => {
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      b.innerHTML = show ? OFF : EYE;
      b.setAttribute('aria-label', show ? 'Che mật khẩu' : 'Hiện mật khẩu'); b.setAttribute('aria-pressed', String(show));
      inp.focus();
    };
    box.appendChild(b);
  }
  const scan = root => (root.querySelectorAll ? root : document).querySelectorAll('input[type=password]').forEach(wire);
  function start() {
    scan(document);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches && n.matches('input[type=password]')) wire(n); else scan(n); } })))
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
