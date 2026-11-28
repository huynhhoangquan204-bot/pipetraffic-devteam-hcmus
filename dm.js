/* ===== Nhắn tin giữa người dùng (tab "Mọi người" trong khung chat) =====
   - Danh sách: LUÔN có 2 dòng ghim trên đầu là Trợ lý ảo (bot) và Admin, tiếp theo là các đoạn chat gần đây,
     rồi bạn bè; gõ tên vào ô tìm để nhắn cho bất kỳ người dùng nào (kể cả người lạ).
   - Mở một người: khung chat riêng có ảnh / video / PDF / emoji / 👍 giữ để phóng to (dùng lại Attach + Chat của web).
   - Tin mới đến: thông báo + chấm đỏ trên nút Chat.
   - Dữ liệu: bộ sưu tập "dms" { pair, from, to, fromName, text, media?, lk? }. Cần Firestore Rules (xem firestore.rules.additions.txt). */
(function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => document.querySelector(s);
  const cur = () => Store.me();
  const say = m => { if (typeof window.toast === 'function') window.toast(m); else alert(m); };
  const pairOf = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
  const fmtT = t => { const d = new Date(t), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); };
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } } };

  let forUid = null, out = [], inn = [], offs = [], first = { o: true, i: true };
  let peer = null, q = '', built = null, at = null, active = false;
  let people = { t: 0, friends: [], profs: {} };

  const all = () => [...out, ...inn].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const seenKey = p => 'pt_dmseen_' + forUid + '_' + p;
  const seenOf = p => +ls.get(seenKey(p)) || 0;
  const unreadBy = () => { const r = {}; inn.forEach(m => { if (m.ts > seenOf(m.from)) r[m.from] = (r[m.from] || 0) + 1; }); return r; };
  const unread = () => Object.values(unreadBy()).reduce((a, b) => a + b, 0);
  const ping = () => window.dispatchEvent(new Event('pt-badge'));
  const mark = p => { ls.set(seenKey(p), Date.now()); ping(); };
  const nameOf = (id, hint) => { const u = people.profs[id]; return (u && (u.pageName || u.name)) || hint || 'Người dùng'; };
  const userOf = (id, hint) => people.profs[id] || { id, name: hint || 'Người dùng' };

  /* ---------- Theo dõi tin nhắn của người đang đăng nhập ---------- */
  function sync() {
    const m = cur(), id = m ? m.id : null;
    if (id === forUid) return;
    offs.splice(0).forEach(f => f()); out = []; inn = []; first = { o: true, i: true }; forUid = id; peer = null; built = null; ping();
    if (!id) return;
    offs.push(Store.listen('dms', { where: ['from', '==', id] }, ms => { out = ms; first.o = false; refresh(); }, () => {}));
    offs.push(Store.listen('dms', { where: ['to', '==', id] }, ms => {
      if (!first.i) {
        const known = new Set(inn.map(x => x.id)), fresh = ms.filter(x => !known.has(x.id) && !x.recalled);
        if (fresh.length) {
          const x = fresh[fresh.length - 1], watching = DM.visible() && peer === x.from && !document.hidden;
          if (!watching) {
            const msg = (x.fromName || 'Ai đó') + ': ' + String(x.text || '').slice(0, 80);
            if (document.hidden && typeof Notify !== 'undefined') Notify.show('Tin nhắn mới', msg, 'chat'); else say(msg);
          }
        }
      }
      inn = ms; first.i = false;
      if (DM.visible() && peer && !document.hidden) mark(peer);
      ping(); refresh();
    }, () => {}));
  }

  /* ---------- Khung trong popup chat ---------- */
  function boxEl() {
    let box = $('#dmBox'); if (box) return box;
    const log = $('#chatLog'); if (!log) return null;
    box = document.createElement('div'); box.id = 'dmBox'; log.parentNode.insertBefore(box, log);
    box.addEventListener('click', e => {
      const t = e.target.closest('[data-dm-tab]');
      if (t) { const b = document.querySelector('[data-ct="' + t.dataset.dmTab + '"]'); if (b) b.click(); return; }
      const p = e.target.closest('[data-dm-peer]');
      if (p) { peer = p.dataset.dmPeer; built = null; mark(peer); draw(); return; }
      if (e.target.closest('[data-dm-back]')) { peer = null; built = null; draw(); }
    });
    box.addEventListener('input', e => { if (e.target.id === 'dmq') { q = e.target.value; drawList(); } });
    return box;
  }
  function header() {
    const hav = $('#chatHav'), nm = $('#chatName'), sb = $('#chatSub'); if (!hav || !nm || !sb) return;
    if (peer) { hav.innerHTML = Avatar.html(userOf(peer), 'sm'); nm.textContent = nameOf(peer); sb.textContent = 'Nhắn riêng'; }
    else { hav.innerHTML = '<span class="dm-hico">💬</span>'; nm.textContent = 'Tin nhắn'; sb.textContent = 'Chọn người để nhắn tin'; }
  }
  async function loadPeople() {
    const m = cur(); if (!m) return;
    if (Date.now() - people.t < 30000) return;
    const [profs, f1, f2] = await Promise.all([window.Social ? Social.profiles().catch(() => ({})) : {}, Store.list('friends', { where: ['from', '==', m.id] }).catch(() => []), Store.list('friends', { where: ['to', '==', m.id] }).catch(() => [])]);
    people = { t: Date.now(), profs, friends: [...f1, ...f2].filter(x => x.status === 'accepted').map(x => x.from === m.id ? x.to : x.from) };
  }
  const row = (id, name, sub, av, extra, attr) => `<button type="button" class="dm-row" ${attr || `data-dm-peer="${esc(id)}"`}>${av}<span class="dm-tx"><b>${esc(name)}</b><small>${esc(sub)}</small></span>${extra || ''}</button>`;

  function drawList() {
    const list = $('#dmBox .dm-list'); if (!list) return;
    const m = cur(), un = unreadBy(), s = q.trim().toLowerCase(), by = {};
    all().forEach(x => { const p = x.from === m.id ? x.to : x.from; (by[p] = by[p] || []).push(x); });
    const convIds = Object.keys(by).sort((a, b) => by[b].at(-1).ts - by[a].at(-1).ts);
    const match = id => !s || nameOf(id, (by[id] && by[id].find(x => x.from === id) || {}).fromName).toLowerCase().includes(s);
    const convs = convIds.filter(match).map(id => {
      const l = by[id].at(-1), t = l.recalled ? 'Tin nhắn đã thu hồi' : (l.text || '');
      return row(id, nameOf(id, (by[id].find(x => x.from === id) || {}).fromName), (l.from === m.id ? 'Bạn: ' : '') + t.slice(0, 60), Avatar.html(userOf(id), 'sm'), `<small class="dm-t">${esc(fmtT(l.ts))}</small>${un[id] ? '<i class="dm-dot"></i>' : ''}`);
    });
    const fr = people.friends.filter(id => !by[id] && match(id)).map(id => row(id, nameOf(id), 'Bạn bè', Avatar.html(userOf(id), 'sm')));
    const shown = new Set([...convIds, ...people.friends, m.id]);
    const found = s ? Object.keys(people.profs).filter(id => !shown.has(id) && nameOf(id).toLowerCase().includes(s)).slice(0, 20).map(id => row(id, nameOf(id), 'Người dùng', Avatar.html(userOf(id), 'sm'))) : [];
    const sec = (t, a) => a.length ? `<div class="dm-sec">${t}</div>${a.join('')}` : '';
    list.innerHTML = row('', 'Trợ lý ảo Pipe Traffic', 'Luôn sẵn sàng trả lời', Avatar.ai('sm'), '<i class="fa-solid fa-thumbtack dm-pin" aria-hidden="true"></i>', 'data-dm-tab="ai"')
      + row('', 'Admin Pipe Traffic', 'Nhắn cho quản trị viên', Avatar.admin('sm'), '<i class="fa-solid fa-thumbtack dm-pin" aria-hidden="true"></i>', 'data-dm-tab="admin"')
      + sec('Đoạn chat', convs) + sec('Bạn bè', fr) + sec('Kết quả tìm kiếm', found)
      + (s && !convs.length && !fr.length && !found.length ? '<p class="dm-empty">Không tìm thấy người dùng nào.</p>' : '')
      + (!s && !convs.length && !fr.length ? '<p class="dm-empty">Chưa có đoạn chat nào. Gõ tên vào ô tìm kiếm để nhắn cho bất kỳ ai, hoặc vào trang của họ và bấm “Nhắn tin”.</p>' : '');
  }

  function drawThread() {
    const m = cur(), box = $('#dmBox'); if (!box || !peer) return;
    if (built !== peer) {
      built = peer;
      box.innerHTML = `<div class="dm-top"><button type="button" class="dm-bk" data-dm-back aria-label="Quay lại">&larr;</button>${Avatar.html(userOf(peer), 'sm')}<a class="dm-nm" href="#/u/${esc(peer)}" data-chat-close>${esc(nameOf(peer))}</a></div>
        <div class="ms-log dm-log" id="dmLog"></div>
        <form class="dm-form" id="dmForm"><textarea name="t" rows="1" placeholder="Nhắn tin…"></textarea><button class="btn">Gửi</button></form>`;
      const f = $('#dmForm');
      at = Attach.composer({ form: f, text: f.elements.t, zone: box, label: 'Đính kèm' });
      f.onsubmit = async e => {
        e.preventDefault();
        const to = peer, lk = +f._lk || 0; f._lk = 0;
        const t = e.target.elements.t.value.trim() || (!at.has() && e.submitter && e.submitter.classList.contains('ms-like') ? '👍' : '');
        if (!t && !at.has()) return;
        const btn = e.target.querySelector('button.ms-send'); if (btn) btn.disabled = true;
        try {
          const media = at.has() ? await at.build({ uid: m.id, by: 'user', progress: (i, n) => { if (btn) btn.innerHTML = '<small class="ms-prog">' + i + '/' + n + '</small>'; } }) : [];
          await Store.put('dms', { pair: pairOf(m.id, to), from: m.id, to, fromName: m.name, text: t || Attach.txt(media), ...(media.length ? { media } : {}), ...(lk > 1 && t === '👍' && !media.length ? { lk } : {}) });
          e.target.elements.t.value = ''; at.clear();
        } catch (x) { say('Gửi chưa được: ' + (x.message || x.code)); }
        if (btn) btn.disabled = false; at.sync();
      };
    }
    const log = $('#dmLog'); if (!log) return;
    const pr = pairOf(m.id, peer), list = all().filter(x => x.pair === pr || (x.from === peer && x.to === m.id) || (x.from === m.id && x.to === peer));
    const stick = !log.children.length || log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    log.innerHTML = Chat.render(list.map(x => ({ id: x.id, who: x.from === m.id ? 'me' : 'them', mine: x.from === m.id, ts: x.ts, text: x.text, media: x.media, recalled: x.recalled, lk: x.lk, noact: true, av: Avatar.html(userOf(peer), 'sm') })))
      || '<div class="pp-empty">Chưa có tin nhắn. Hãy gửi lời chào!</div>';
    if (stick) log.scrollTop = log.scrollHeight;
    Chat.paint(log);
  }

  function draw() {
    const box = boxEl(); if (!box || !active) return;
    const m = cur(); header();
    if (!m) { built = null; box.innerHTML = '<div class="pp-empty">Đăng nhập để nhắn tin cho mọi người.<br><a class="pp-btn" href="#/login" data-chat-close>Đăng nhập</a></div>'; return; }
    if (peer) {
      drawThread();
      if (!people.t) loadPeople().then(() => { if (active && peer) { built = null; header(); drawThread(); } });   // lấy tên / avatar người đối thoại
      return;
    }
    built = null;
    if (!box.querySelector('.dm-list')) box.innerHTML = `<div class="dm-search"><input id="dmq" type="search" placeholder="Tìm người dùng để nhắn tin…" autocomplete="off" value="${esc(q)}"></div><div class="dm-list"></div>`;
    drawList();
    loadPeople().then(() => { if (active && !peer) drawList(); });
  }
  function refresh() { if (active && !$('#chatPop').hidden) draw(); }

  const DM = window.DM = {
    sync, unread,
    visible: () => active && !!$('#chatPop') && !$('#chatPop').hidden,
    show() {   // app.js gọi khi đang ở tab "Mọi người"
      const log = $('#chatLog'), form = $('#chatForm'); if (!log || !form) return;
      active = true; log.style.display = 'none'; form.style.display = 'none';
      const box = boxEl(); if (box) box.style.display = 'flex';
      if (peer && !document.hidden) mark(peer);
      draw();
    },
    hide() {
      if (!active && !$('#dmBox')) return;
      active = false; const box = $('#dmBox'), log = $('#chatLog'), form = $('#chatForm');
      if (box) box.style.display = 'none'; if (log) log.style.display = ''; if (form) form.style.display = '';
    },
    openList() { if (!cur()) { location.hash = '#/login'; return; } peer = null; built = null; if (typeof openChat === 'function') openChat('dm'); },
    openWith(uid) { if (!cur()) { location.hash = '#/login'; return; } peer = uid; built = null; if (typeof openChat === 'function') openChat('dm'); }
  };
  addEventListener('pt-me', sync);

  const css = document.createElement('style');
  css.textContent = `
#dmBox{flex:1;min-height:0;display:none;flex-direction:column;background:#fff}
.dm-search{flex:none;padding:10px 12px 6px}
.dm-search input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:9px 14px;border:1px solid #cbd5e1;border-radius:99px;background:#f1f5f9;color:inherit;outline:0}
.dm-list{flex:1;min-height:0;overflow-y:auto;padding:4px 6px 10px}
.dm-sec{padding:10px 10px 4px;font-size:.72rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#94a3b8}
.dm-row{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;padding:9px 10px;border:0;border-radius:12px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.dm-row:hover{background:#f1f5f9}
.dm-tx{flex:1;min-width:0}
.dm-tx b{display:block;font-size:.93rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dm-tx small{display:block;font-size:.8rem;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dm-t{flex:none;font-size:.7rem;color:#94a3b8}
.dm-dot{flex:none;width:10px;height:10px;border-radius:50%;background:#0284c7}
.dm-pin{flex:none;font-size:.75rem;color:#94a3b8}
.dm-empty{padding:22px 16px;text-align:center;color:#64748b;font-size:.88rem}
.dm-top{flex:none;display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #e2e8f0}
.dm-bk{flex:none;width:34px;height:34px;border:0;border-radius:50%;background:#f1f5f9;font-size:1.1rem;cursor:pointer;color:inherit}
.dm-nm{font-weight:800;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:inherit;text-decoration:none}
.dm-log{flex:1;min-height:0;overflow-y:auto;padding:12px}
.dm-form{flex:none;padding:10px 12px;border-top:1px solid #e2e8f0}
.dm-form textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:9px 12px;border:1px solid #cbd5e1;border-radius:12px;resize:none;background:#fff;color:inherit}
.dm-hico{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.25);font-size:1.3rem}
html[data-theme=dark] #dmBox{background:#0f1a2e;color:#e2e8f0}
html[data-theme=dark] .dm-search input,html[data-theme=dark] .dm-form textarea{background:#111c31;border-color:#26364f;color:#e2e8f0}
html[data-theme=dark] .dm-row:hover,html[data-theme=dark] .dm-bk{background:#16233b}
html[data-theme=dark] .dm-top,html[data-theme=dark] .dm-form{border-color:#26364f}`;
  document.head.appendChild(css);
})();
