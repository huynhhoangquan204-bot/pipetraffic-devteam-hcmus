/* ===== Popup chat của admin (kiểu Messenger) =====
   Bấm nút 💬 trên thanh trên -> hiện danh sách hội thoại với người dùng -> chọn một người để chat -> nút ← quay về danh sách.
   Dùng lại Chat / Msgx / Avatar (messenger.js) và Attach (attach.js) nên có ảnh, video, thả cảm xúc, thu hồi như bên người dùng.
   Bình luận không còn ở nút này: đã chuyển vào menu ☰ > Bình luận. */
(function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtT = t => { const d = new Date(t), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); };
  let box = null, msgs = [], U = {}, cur = null, built = null, q = '', offs = [], at = null;

  const css = document.createElement('style');
  css.textContent = `
#admChat{position:fixed;right:18px;bottom:18px;z-index:9000;width:380px;max-width:calc(100vw - 24px);height:min(600px,calc(100vh - 100px));height:min(600px,calc(100dvh - 100px));display:none;flex-direction:column;overflow:hidden;border-radius:18px;background:#fff;color:#0f172a;box-shadow:0 18px 60px rgba(2,6,23,.35);border:1px solid #e2e8f0}
#admChat.open{display:flex}
.ac-head{flex:none;display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(135deg,#0369a1,#4f46e5);color:#fff}
.ac-head h3{margin:0;flex:1;min-width:0;font-size:1.02rem;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ac-head small{display:block;font-weight:500;font-size:.72rem;opacity:.85}
.ac-ib{flex:none;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;font-size:1.1rem;line-height:1;cursor:pointer}
.ac-ib:hover{background:rgba(255,255,255,.3)}
.ac-search{flex:none;padding:10px 12px 6px}
.ac-search input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:9px 14px;border:1px solid #cbd5e1;border-radius:99px;background:#f1f5f9;color:inherit;outline:0}
.ac-list{flex:1;min-height:0;overflow-y:auto;padding:4px 6px 10px}
.ac-row{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;padding:9px 10px;border:0;border-radius:12px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.ac-row:hover{background:#f1f5f9}
.ac-row .ac-tx{flex:1;min-width:0}
.ac-row b{display:block;font-size:.93rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ac-row span.ac-last{display:block;font-size:.82rem;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ac-row.wait b,.ac-row.wait span.ac-last{font-weight:800;color:#0f172a}
.ac-row small{flex:none;font-size:.7rem;color:#94a3b8}
.ac-dot{flex:none;width:10px;height:10px;border-radius:50%;background:#0284c7}
.ac-empty{padding:30px 16px;text-align:center;color:#64748b;font-size:.9rem}
.ac-log{flex:1;min-height:0;overflow-y:auto;padding:12px;background:#f8fafc}
.ac-form{flex:none;padding:10px 12px;border-top:1px solid #e2e8f0;background:#fff}
.ac-form textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:9px 12px;border:1px solid #cbd5e1;border-radius:12px;resize:none;background:#fff;color:inherit}
html[data-theme=dark] #admChat{background:#0f1a2e;color:#e2e8f0;border-color:#26364f}
html[data-theme=dark] .ac-search input{background:#111c31;border-color:#26364f}
html[data-theme=dark] .ac-row:hover{background:#16233b}
html[data-theme=dark] .ac-row.wait b,html[data-theme=dark] .ac-row.wait span.ac-last{color:#fff}
html[data-theme=dark] .ac-log{background:#0b1424}
html[data-theme=dark] .ac-form{background:#0f1a2e;border-color:#26364f}
html[data-theme=dark] .ac-form textarea{background:#111c31;border-color:#26364f}
@media(max-width:520px){#admChat{right:0;bottom:0;width:100vw;max-width:100vw;height:100vh;height:100dvh;border-radius:0}}
`;
  document.head.appendChild(css);

  const useCtx = () => { Msgx.ctx = { uid: () => (Store.uid && Store.uid()) || 'admin', th: id => (msgs.find(m => m.id === id) || {}).uid, find: id => msgs.find(m => m.id === id), redraw: () => draw() }; };
  const byUser = () => { const by = {}; msgs.forEach(m => (by[m.uid] = by[m.uid] || []).push(m)); Object.values(by).forEach(l => l.sort((a, b) => a.ts - b.ts)); return by; };
  const user = (id, l) => U[id] || { name: l && l.userName };

  function ensure() {
    if (box) return box;
    box = document.createElement('div'); box.id = 'admChat'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Chat với người dùng');
    document.body.appendChild(box);
    box.addEventListener('click', () => useCtx(), true);   // luôn dùng đúng ngữ cảnh của popup khi bấm ☺ / ⋮ trong popup
    box.addEventListener('click', e => {
      if (e.target.closest('[data-ac-close]')) return AdminChat.close();
      if (e.target.closest('[data-ac-back]')) { cur = null; built = null; draw(); return; }
      const r = e.target.closest('[data-ac-th]'); if (r) { cur = r.dataset.acTh; built = null; draw(); }
    });
    box.addEventListener('input', e => { if (e.target.id === 'acq') { q = e.target.value; drawList(); } });
    return box;
  }

  function drawList() {
    const list = box.querySelector('.ac-list'); if (!list) return;
    const by = byUser(), s = q.trim().toLowerCase();
    const ids = Object.keys(by).filter(id => !s || (by[id].at(-1).userName || '').toLowerCase().includes(s)).sort((a, b) => by[b].at(-1).ts - by[a].at(-1).ts);
    list.innerHTML = ids.map(id => {
      const l = by[id].at(-1), wait = l.from === 'user', name = l.userName || 'Người dùng';
      const txt = l.recalled ? 'Tin nhắn đã thu hồi' : (l.text || '');
      return `<button type="button" class="ac-row${wait ? ' wait' : ''}" data-ac-th="${esc(id)}">${Avatar.html(user(id, l))}<span class="ac-tx"><b>${esc(name)}</b><span class="ac-last">${l.from === 'admin' ? 'Bạn: ' : ''}${esc(txt.slice(0, 70))}</span></span><small>${esc(fmtT(l.ts))}</small>${wait ? '<i class="ac-dot" title="Chờ bạn trả lời"></i>' : ''}</button>`;
    }).join('') || `<p class="ac-empty">${s ? 'Không tìm thấy người dùng nào.' : 'Chưa có tin nhắn nào.'}</p>`;
  }

  function drawThread() {
    const list = (byUser()[cur]) || [], l0 = list.at(-1);
    if (built !== cur) {
      built = cur;
      box.innerHTML = `<div class="ac-head"><button type="button" class="ac-ib" data-ac-back aria-label="Quay lại">&larr;</button>${Avatar.html(user(cur, l0), 'sm')}<h3>${esc((l0 && l0.userName) || 'Người dùng')}</h3><button type="button" class="ac-ib" data-ac-close aria-label="Đóng">&times;</button></div>
        <div class="chat ms-log ac-log" id="acLog"></div>
        <form class="ac-form" id="acForm"><textarea name="t" rows="1" placeholder="Nhắn tin…"></textarea><button class="btn">Gửi</button></form>`;
      const f = box.querySelector('#acForm');
      at = Attach.composer({ form: f, text: f.elements.t, zone: box, label: 'Đính kèm' });
      f.onsubmit = async e => {
        e.preventDefault();
        const th = cur, t = e.target.elements.t.value.trim() || (!at.has() && e.submitter && e.submitter.classList.contains('ms-like') ? '👍' : '');
        if (!t && !at.has()) return;
        const u = msgs.find(m => m.uid === th), btn = e.target.querySelector('button.ms-send'); if (btn) btn.disabled = true;
        try {
          const media = at.has() ? await at.build({ uid: th, by: 'admin', progress: (i, n) => { if (btn) btn.innerHTML = '<small class="ms-prog">' + i + '/' + n + '</small>'; } }) : [];
          await Store.put('messages', { uid: th, userName: u ? u.userName : '', from: 'admin', text: t || Attach.txt(media), ...(media.length ? { media } : {}), projectId: '', projectName: '' });
          e.target.elements.t.value = ''; at.clear();
        } catch (x) { if (typeof toast === 'function') toast(x.message); else alert(x.message); }
        if (btn) btn.disabled = false; at.sync();
      };
    }
    const log = box.querySelector('#acLog'); if (!log) return;
    const stick = !log.children.length || log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    log.innerHTML = Chat.render(list.map(m => { const ad = m.from === 'admin'; return { id: m.id, who: ad ? 'me' : 'them', mine: ad, ts: m.ts, text: m.text, media: m.media, recalled: m.recalled, edited: m.edited, list: Msgx.get(m.id), uid: Msgx.ctx.uid(), av: Avatar.html(user(m.uid, m), 'sm') }; }));
    if (stick) log.scrollTop = log.scrollHeight;
    Chat.paint(log);
  }

  function draw() {
    if (!box || !box.classList.contains('open')) return;
    useCtx();
    if (cur) return drawThread();
    if (!box.querySelector('.ac-list')) {
      built = null;
      box.innerHTML = `<div class="ac-head"><h3>Đoạn chat<small>Chọn người để nhắn tin</small></h3><button type="button" class="ac-ib" data-ac-close aria-label="Đóng">&times;</button></div>
        <div class="ac-search"><input id="acq" type="search" placeholder="Tìm người dùng…" autocomplete="off" value="${esc(q)}"></div><div class="ac-list"></div>`;
    }
    drawList();
  }

  const AdminChat = window.AdminChat = {
    start() {
      if (offs.length) return;
      Store.list('users').then(us => { us.forEach(u => { U[u.id] = u; }); draw(); }).catch(() => {});
      offs.push(Store.listen('reacts', null, rs => { Msgx.setReacts(rs); draw(); }, () => {}));
      offs.push(Store.listen('messages', null, ms => { msgs = ms; draw(); }, () => {}));
    },
    stop() { offs.splice(0).forEach(f => f()); msgs = []; cur = null; built = null; if (box) { box.remove(); box = null; } },
    open() { ensure().classList.add('open'); cur = null; built = null; box.innerHTML = ''; draw(); },
    close() { if (box) box.classList.remove('open'); },
    toggle() { if (box && box.classList.contains('open')) this.close(); else this.open(); },
    isOpen: () => !!(box && box.classList.contains('open'))
  };
})();
