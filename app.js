/* ===== SPA: định tuyến + trang Dự án / Đăng nhập + popup chat / Liên hệ (dùng chung hàm tiện ích trong script.js) ===== */
const app = $('#app');
const fmt = t => new Date(t).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const tpl = id => { const t = document.getElementById(id); return t ? t.innerHTML : ''; };
const wrap = h => { app.innerHTML = `<div class="pt-app max-w-5xl mx-auto px-4 pt-28 pb-20 min-h-[70vh]">${h}</div>`; };
const badge = s => `<span class="tag ${s === 'Hoàn thành' ? 'done' : s === 'Đang làm' ? 'run' : ''}">${esc(s)}</span>`;
let me = Store.me();

/* --- Liên kết mạng xã hội ở chân trang (sửa trong config.js, mục links; để trống thì ẩn biểu tượng) --- */
const LINKS = { github: 'https://github.com/huynhhoangquan204-bot/pipetraffic-devteam-hcmus', facebook: '', youtube: 'https://www.youtube.com/watch?v=al_L4F2ac9c&t=1s', ...((window.APP_CONFIG || {}).links || {}) };
function applyLinks() {
  [['lnkGh', 'github'], ['lnkFb', 'facebook'], ['lnkYt', 'youtube']].forEach(([id, k]) => {
    const el = document.getElementById(id); if (!el) return;
    if (/^https?:\/\//i.test(LINKS[k] || '')) { el.href = LINKS[k]; el.target = '_blank'; el.rel = 'noopener'; el.hidden = false; } else el.hidden = true;
  });
}

/* --- Theo dõi thời gian thực: huỷ hết khi chuyển trang --- */
const live = [];
const stopLive = () => live.splice(0).forEach(f => f());

/* --- Nội dung sửa trong admin (Journey, Team, Review, FAQ). Admin chưa nhập thì giữ nội dung mẫu trong index.html --- */
const ccache = {};
async function contentList(col) {
  const c = ccache[col]; if (c && Date.now() - c.t < 30000) return c.v;
  const v = Content.sort(await Store.list(col)); ccache[col] = { t: Date.now(), v }; return v;
}
const scache = {};
async function siteDoc(id) {   // tài liệu đơn trong bộ sưu tập "site": video, contact
  const c = scache[id]; if (c && Date.now() - c.t < 30000) return c.v;
  const v = await Store.get('site', id); scache[id] = { t: Date.now(), v }; return v;
}
async function fillContent(r) {
  const jobs = { journey: [['journey', '#journeyList', 'journey']], team: [['team', '#teamGrid', 'team']], faq: [['reviews', '#reviewList', 'reviews'], ['faq', '#faqList', 'faq']] }[r] || [];
  await Promise.all(jobs.map(async ([col, sel, fn]) => {
    const box = $(sel); if (!box) return;
    box.style.opacity = 0; box.style.transition = 'opacity .25s';
    let list = null;
    try { list = await Promise.race([contentList(col), new Promise(ok => setTimeout(() => ok(null), 2500))]); } catch (e) {}
    if ($(sel) === box) { if (list && list.length) box.innerHTML = Content[fn](list); box.style.opacity = 1; }
  }));
  if (r === 'video') {   // Video demo: dữ liệu admin nhập (site/video); chưa có thì giữ nội dung mẫu trong index.html
    const box = $('#video'); if (!box) return;
    let d = null; try { d = await Promise.race([siteDoc('video'), new Promise(ok => setTimeout(() => ok(null), 2500))]); } catch (e) {}
    if (d && $('#video') === box) box.innerHTML = Content.video(d);
  }
}

/* --- Nút đăng nhập trên menu --- */
function renderAuth() {
  const btn = 'bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm px-6 py-2.5 rounded-full shadow-lg shadow-sky-600/25 transition-all hover:shadow-xl hover:scale-105 inline-flex items-center gap-2';
  $('#authSlot').innerHTML = me
    ? `<button data-out class="text-sm font-medium text-slate-500 hover:text-sky-600">${esc(me.name)} · Thoát</button>`
    : `<a href="#/login" class="${btn}"><i class="fa-solid fa-right-to-bracket text-xs"></i> Đăng nhập</a>`;
  $('#authSlotM').innerHTML = me
    ? `<button data-out class="block w-full text-center py-2 text-slate-500 font-medium">${esc(me.name)} · Thoát</button>`
    : `<a href="#/login" onclick="toggleMobileMenu(true)" class="block text-center bg-sky-600 text-white py-3 rounded-xl font-bold mt-2 shadow-lg shadow-sky-600/30">Đăng nhập</a>`;
  document.querySelectorAll('[data-out]').forEach(b => b.onclick = () => { Store.setMe(null); me = null; location.hash = '#/'; route(); });
}
function setActive(key) {
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('nav-on', a.dataset.r === key));
}

/* --- Trang chủ: banner + giới thiệu + danh sách dự án + CTA. Phần tĩnh hiện ngay, dự án tải sau --- */
async function home() {
  app.innerHTML = tpl('tpl-hero') + `<section id="projects" class="py-20 bg-slate-50"><div class="pt-app max-w-5xl mx-auto px-4">
  <h2 class="sec">Các dự án</h2><p class="sub">Tình hình cập nhật hằng tuần của Pipe Traffic Dev Team.</p>
  <div id="projBox"><div class="loading">Đang tải dự án…</div></div></div></section>` + tpl('tpl-cta');
  const box = $('#projBox');
  try {
    const [ps, us] = await Promise.all([Store.list('projects'), Store.list('updates')]);
    if (!document.body.contains(box)) return;   // người dùng đã sang trang khác
    box.innerHTML = (Store.mode === 'demo' ? '<div class="banner">Chế độ thử: tài khoản, dự án và tin nhắn chỉ lưu trên trình duyệt này. Điền Firebase trong config.js để dùng chung (xem README).</div>' : '') +
    `<div class="pgrid">${ps.map(p => {
      const last = us.filter(u => u.projectId === p.id).pop();
      return `<a class="card" href="#/p/${p.id}"><div class="row"><h2>${esc(p.name)}</h2>${badge(p.status)}</div>
      <p class="muted" style="margin:0">${esc(p.desc)}</p>
      <div class="pipe"><i style="width:${+p.progress || 0}%"></i></div><small class="muted">${+p.progress || 0}% hoàn thành</small>
      ${last ? `<p style="margin:10px 0 0;font-size:.9rem"><b>${esc(last.week)}:</b> ${esc(last.title)}</p>` : ''}</a>`;
    }).join('') || '<p class="muted">Chưa có dự án nào.</p>'}</div>`;
  } catch (e) { if (document.body.contains(box)) box.innerHTML = '<p class="err">Chưa tải được dự án: ' + esc(e.message) + '</p>'; }
}

async function project(id) {
  const p = (await Store.list('projects')).find(x => x.id === id);
  if (!p) { wrap('<p>Không tìm thấy dự án. <a class="plink" href="#/">Quay lại</a></p>'); return; }
  const us = (await Store.list('updates')).filter(u => u.projectId === id).reverse();
  wrap(`<a href="#/" class="plink">&larr; Tất cả dự án</a>
  <div class="row" style="margin-top:12px"><h1>${esc(p.name)}</h1>${badge(p.status)}</div>
  <p class="sub">${esc(p.desc)}<br>Chủ dự án: ${esc(p.owner)}</p>
  <div class="card"><div class="pipe"><i style="width:${+p.progress || 0}%"></i></div><small class="muted">${+p.progress || 0}% hoàn thành</small></div>
  <div class="row" style="margin:28px 0 0"><h2>Cập nhật theo tuần</h2></div>
  <div class="tl">${us.map(u => `<div class="it"><div class="wk">${esc(u.week)}</div><b>${esc(u.title)}</b><p>${esc(u.content)}</p>${Media.html(Media.list(u))}</div>`).join('') || '<p class="muted">Chưa có cập nhật.</p>'}</div>`);
}

/* --- Đăng nhập: Google (bắt buộc) -> mật khẩu (Firebase Auth) -> tên / giới tính khi tạo mới --- */
async function login() {
  if (me) { location.hash = '#/'; return; }
  wrap(`<div class="card narrow"><h2>Đăng nhập</h2><p class="muted">Bước 1: đăng nhập Google (bắt buộc).</p>
  <button class="btn g" id="g">Tiếp tục với Google</button><div id="step"></div><div class="err" id="err"></div></div>`);
  $('#g').onclick = async () => {
    $('#err').textContent = '';
    try { const g = await Store.google(); step(g, await Store.profile(g.uid)); }
    catch (e) { $('#err').textContent = 'Đăng nhập Google chưa thành công: ' + (e.message || e.code); }
  };
}
function step(g, p) {
  $('#g').style.display = 'none';
  const setPw = p && !g.hasPassword;   // đã có hồ sơ nhưng chưa gắn mật khẩu
  $('#step').innerHTML = `<p><b>${esc(g.email)}</b></p>` + (p && !setPw
    ? `<form id="f"><label>Mật khẩu</label><input type="password" name="pw" required autofocus><button class="btn">Đăng nhập</button></form>
       <p style="margin-top:12px"><a href="#" id="forgot" class="plink">Quên mật khẩu?</a></p>`
    : `<p class="muted">${setPw ? 'Hãy đặt mật khẩu cho tài khoản.' : 'Tài khoản mới. Bước 2: điền thông tin.'}</p><form id="f">
       ${setPw ? '' : `<label>Tên hiển thị</label><input name="name" required maxlength="40">
       <label>Giới tính</label><select name="gender"><option>Nam</option><option>Nữ</option><option>Khác</option></select>`}
       <label>Mật khẩu (từ 6 ký tự)</label><input type="password" name="pw" minlength="6" required><button class="btn">${setPw ? 'Lưu mật khẩu' : 'Tạo tài khoản'}</button></form>`);
  const fg = $('#forgot');
  if (fg) fg.onclick = async e => {
    e.preventDefault();
    try { await Store.resetPw(g.email); toast('Đã gửi email đặt lại mật khẩu tới ' + g.email); }
    catch (x) { $('#err').textContent = 'Không gửi được email: ' + (x.message || x.code); }
  };
  $('#f').onsubmit = async e => {
    e.preventDefault(); $('#err').textContent = ''; const f = new FormData(e.target);
    try {
      let u = p;
      if (p) { if (!await Store.checkPw(g, f.get('pw'), p)) { $('#err').textContent = 'Sai mật khẩu.'; return; } }
      else u = await Store.register(g, f.get('name').trim(), f.get('gender'), f.get('pw'));
      Store.setMe(u); me = Store.me(); toast('Xin chào ' + me.name); location.hash = '#/'; setTimeout(() => openChat('admin'), 200);
    } catch (x) { $('#err').textContent = x.message || x.code; }
  };
}

/* --- Khung chat chung (popup): bấm nút Chat cạnh menu để mở / đóng. Hai tab: Admin (tin nhắn thật, cần đăng nhập) và AI ---
   Gắn AI: trong config.js hoặc một file <script> riêng, khai báo
   window.PT_AI = { ask: async (cauHoi, lichSu) => 'câu trả lời' };  (lichSu = [{role:'user'|'ai', text}]) */
const aiHist = []; let chatBound = false, chatTab = 'admin', msgs = [], unread = 0, msgOff = null, msgFor = null;
const bub = (cls, label, text) => `<div class="pp-msg ${cls}"><small>${label}</small><span>${esc(text)}</span></div>`;
const aiOn = () => !!(window.PT_AI && typeof window.PT_AI.ask === 'function');
const chatOpen = () => { const p = $('#chatPop'); return !!p && !p.hidden; };

/* Chấm đỏ trên nút Chat khi admin vừa trả lời; tin nhắn của người đăng nhập cập nhật ngay (thời gian thực) */
const paintBadge = () => document.querySelectorAll('[data-chat-open]').forEach(a => a.classList.toggle('has-dot', !!me && unread > 0));
const markSeen = () => { if (me) localStorage.setItem('pt_seen_' + me.id, Date.now()); unread = 0; paintBadge(); };
function ensureMsgs() {
  const id = me ? me.id : null;
  if (id === msgFor) return;
  if (msgOff) { msgOff(); msgOff = null; }
  msgFor = id; msgs = []; unread = 0; paintBadge();
  if (!id) return;
  msgOff = Store.listen('messages', { where: ['uid', '==', id] }, ms => {
    msgs = ms;
    if (chatOpen() && chatTab === 'admin') { markSeen(); drawChat(); }
    else { const seen = +localStorage.getItem('pt_seen_' + id) || 0; unread = ms.filter(m => m.from === 'admin' && m.ts > seen).length; paintBadge(); }
  }, () => {});
}

function drawChat(busy) {
  const log = $('#chatLog'), form = $('#chatForm'); if (!log || !form) return;
  document.querySelectorAll('[data-ct]').forEach(b => b.classList.toggle('on', b.dataset.ct === chatTab));
  const inp = form.t, btn = form.querySelector('button'), stick = !log.children.length || log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  if (chatTab === 'ai') {
    const on = aiOn(); inp.disabled = btn.disabled = !on;
    inp.placeholder = on ? 'Hỏi trợ lý AI…' : 'AI sẽ được thêm sau';
    log.innerHTML = (aiHist.map(m => bub(m.role === 'user' ? 'me' : 'ai', m.role === 'user' ? 'Bạn' : 'AI', m.text)).join('')
      || `<div class="pp-empty">${on ? 'Hãy đặt câu hỏi cho trợ lý AI.' : 'Trợ lý AI sẽ được thêm sau.'}</div>`) + (busy ? bub('ai', 'AI', 'Đang trả lời…') : '');
    log.scrollTop = log.scrollHeight; return;
  }
  if (!me) {
    inp.disabled = btn.disabled = true; inp.placeholder = 'Đăng nhập để nhắn tin cho admin';
    log.innerHTML = '<div class="pp-empty">Đăng nhập để nhắn tin cho admin.<br><a class="pp-btn" href="#/login" data-chat-close>Đăng nhập</a></div>'; return;
  }
  inp.disabled = btn.disabled = false; inp.placeholder = 'Nhắn cho admin…';
  log.innerHTML = msgs.map(m => bub(m.from === 'user' ? 'me' : '', `${m.from === 'user' ? 'Bạn' : 'Admin'} · ${fmt(m.ts)}`, m.text)).join('') || '<div class="pp-empty">Chưa có tin nhắn. Hãy gửi tin đầu tiên.</div>';
  if (stick) log.scrollTop = log.scrollHeight;
}
function openChat(tab) {
  const p = $('#chatPop'); if (!p) return;
  if (tab) chatTab = tab;
  if (!chatBound) {
    chatBound = true;
    $('#chatForm').onsubmit = async e => {
      e.preventDefault(); const inp = e.target.t, t = inp.value.trim(); if (!t || inp.disabled) return;
      if (chatTab === 'ai') {
        inp.value = ''; const before = aiHist.slice(); aiHist.push({ role: 'user', text: t }); drawChat(true);
        try { aiHist.push({ role: 'ai', text: String(await window.PT_AI.ask(t, before)) }); }
        catch (x) { aiHist.push({ role: 'ai', text: 'AI chưa trả lời được: ' + (x.message || x) }); }
        drawChat(); inp.focus();
      } else {
        try { await Store.put('messages', { uid: me.id, userName: me.name, from: 'user', text: t, projectId: '', projectName: '' }); inp.value = ''; }
        catch (x) { toast('Gửi chưa được: ' + x.message); }
      }
    };
  }
  p.hidden = false; if (chatTab === 'admin') markSeen(); drawChat();
  const log = $('#chatLog'); if (log) log.scrollTop = log.scrollHeight;
  if (!$('#chatForm').t.disabled) setTimeout(() => $('#chatForm').t.focus(), 50);
}
const closeChat = () => { const p = $('#chatPop'); if (p) p.hidden = true; };
const toggleChat = () => { const p = $('#chatPop'); if (p) p.hidden ? openChat() : closeChat(); };

/* --- Popup Liên hệ: nội dung sửa trong admin (tab "Video & Liên hệ"), chưa nhập thì dùng nội dung mẫu --- */
async function openContact() {
  const m = $('#contact-modal'), body = $('#contactBody'); if (!m) return;
  m.hidden = false; body.innerHTML = '<p>Đang tải…</p>';
  let d = null;
  try { d = await Promise.race([siteDoc('contact'), new Promise(ok => setTimeout(() => ok(null), 2500))]); } catch (e) {}
  if (!m.hidden) body.innerHTML = Content.contact(d);
}
const closeContact = () => { const m = $('#contact-modal'); if (m) m.hidden = true; };

document.addEventListener('click', e => {
  const ct = e.target.closest('[data-ct]'); if (ct) { chatTab = ct.dataset.ct; if (chatTab === 'admin') markSeen(); drawChat(); return; }
  if (e.target.closest('[data-chat-open]')) { e.preventDefault(); toggleChat(); return; }
  if (e.target.closest('[data-chat-close]')) { closeChat(); return; }
  if (e.target.closest('[data-contact]')) { e.preventDefault(); openContact(); return; }
  if (e.target.closest('[data-contact-close]') || e.target.id === 'contact-modal') closeContact();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeContact(); closeChat(); } });

/* --- Điều hướng (hash), mỗi mục trên menu là một TRANG RIÊNG nhưng vẫn là một file SPA ---
   #/  ·  #/p/<id>  ·  #/login  ·  #/specs  #/journey  #/problems  #/team  #/video  #/faq */
const PAGES = ['specs', 'journey', 'problems', 'team', 'video', 'faq'];   // mỗi tên ứng với <template id="tpl-...">
const routes = { '': home, p: project, login };
async function route() {
  const [r, id] = location.hash.replace(/^#\/?/, '').split('/');
  if (r === 'about') { location.replace('#/' + (id || '')); return; }       // link cũ #/about/team -> #/team
  if (r === 'chat' || r === 'comments') { location.replace('#/'); setTimeout(() => openChat(), 100); return; }   // link cũ -> về trang chủ và mở popup chat
  stopLive(); renderAuth(); ensureMsgs(); paintBadge(); toggleMobileMenu(true);
  setActive(PAGES.includes(r) ? r : (r === '' || r === 'p' ? 'projects' : ''));
  window.scrollTo(0, 0);
  try {
    if (PAGES.includes(r)) {
      app.dataset.view = r; app.innerHTML = `<div class="pt-20">${tpl('tpl-' + r)}</div>`;
      fillContent(r);
    } else {
      app.dataset.view = r || 'home';
      if (r === 'p') app.innerHTML = '<div class="pt-app pt-32"><div class="loading">Đang tải…</div></div>';
      await (routes[r || ''] || home)(id);
    }
  } catch (e) { wrap('<p class="err">Lỗi tải dữ liệu: ' + esc(e.message) + '</p>'); }
}
app.innerHTML = '<div class="pt-app pt-32"><div class="loading">Đang tải…</div></div>';
const hideSplash = () => { const s = $('#splash'); if (s) { s.classList.add('off'); setTimeout(() => s.remove(), 500); } };
(async () => {
  try {
    await Store.init(); me = Store.me(); applyLinks(); addEventListener('hashchange', route);
    await Promise.race([route(), new Promise(r => setTimeout(r, 4000))]);   // chờ tối đa 4 giây rồi mở trang
  } catch (e) { wrap('<p class="err">Trang chưa chạy được: ' + esc(e.message) + '. Nhấn Ctrl+Shift+R; nếu vẫn lỗi hãy báo lại dòng này.</p>'); }
  hideSplash();
})();
