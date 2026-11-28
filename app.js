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
    if ($('#video') === box) box.innerHTML = Content.video(d);   // d rỗng thì Content.video dùng nội dung mặc định
  }
}

/* --- Nút đăng nhập trên menu --- */
function renderAuth() {
  const btn = 'bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm px-6 py-2.5 rounded-full shadow-lg shadow-sky-600/25 transition-all hover:shadow-xl hover:scale-105 inline-flex items-center gap-2';
  $('#authSlot').innerHTML = me
    ? `<a href="#/u/${me.id}" title="Trang cá nhân" class="navuser flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-sky-600">${Avatar.html(me, 'sm')}<span class="navname">${esc(me.name)}</span></a><button data-out class="text-sm font-medium text-slate-500 hover:text-sky-600">Thoát</button>`
    : `<a href="#/login" class="${btn}"><i class="fa-solid fa-right-to-bracket text-xs"></i> Đăng nhập</a>`;
  $('#authSlotM').innerHTML = me
    ? `<a href="#/u/${me.id}" onclick="toggleMobileMenu(true)" class="navuser flex items-center gap-3 py-2 text-slate-700 font-semibold border-b border-slate-100">${Avatar.html(me, 'sm')}<span class="navname">${esc(me.name)}</span><span class="text-xs text-sky-600 font-medium">Trang cá nhân</span></a><button data-out class="block w-full text-center py-2 text-slate-500 font-medium">Thoát</button>`
    : `<a href="#/login" onclick="toggleMobileMenu(true)" class="block text-center bg-sky-600 text-white py-3 rounded-xl font-bold mt-2 shadow-lg shadow-sky-600/30">Đăng nhập</a>`;
  document.querySelectorAll('[data-out]').forEach(b => b.onclick = () => { Store.setMe(null); me = null; location.hash = '#/'; route(); });
}
function setActive(key) {
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('nav-on', a.dataset.r === key));
}

/* --- Trang chủ: danh sách dự án + CTA (phần giới thiệu đã gom thành banner popup, xem showWelcome) --- */
const imgOkP = p => /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(p.bgImg || '') && p.bgImg.length < 900000;
function pcard(p, us, byId) {   // thẻ dự án (trang chủ + trang cá nhân)
  const last = (us || []).filter(u => u.projectId === p.id).pop();
  const par = p.kind === 'sub' && p.parentId && byId && byId[p.parentId] ? `<small class="muted">Thuộc dự án: ${esc(byId[p.parentId].name)}</small>` : '';
  const by = p.ownerUid ? `<small class="muted">Bởi ${esc(p.ownerName || p.owner || '')}</small>` : '';
  return `<a class="card" href="#/p/${p.id}">${imgOkP(p) ? `<img class="pcover" src="${p.bgImg}" alt="${esc(p.name)}" loading="lazy">` : ''}<div class="row"><h2>${esc(p.name)}</h2>${badge(p.status)}</div>${par}${by}
      <p class="muted" style="margin:0">${esc(p.desc)}</p>
      <div class="pipe"><i style="width:${+p.progress || 0}%"></i></div><small class="muted">${+p.progress || 0}% hoàn thành</small>
      ${last ? `<p style="margin:10px 0 0;font-size:.9rem"><b>${esc(last.week)}:</b> ${esc(last.title)}</p>` : ''}</a>`;
}
async function home() {
  app.innerHTML = tpl('tpl-cta') + `<section id="projects" class="pt-10 pb-20 bg-white"><div class="pt-app max-w-5xl mx-auto px-4">
  <h2 class="sec">Các dự án</h2>
  <p class="sub" style="margin-bottom:16px">Dự án Pipe Traffic do nhóm sinh viên Trường Đại học Khoa học Tự nhiên (HCMUS) nghiên cứu và phát triển.</p>
  <div class="home-cta">
    <a href="#/problems" class="btn">Xem Đồ Án Chi Tiết</a>
    <a href="#" data-contact class="btn ghost">Liên Hệ Nhóm Dự Án</a>
  </div>
  <div id="projBox"><div class="loading">Đang tải dự án…</div></div></div></section>`;
  const box = $('#projBox');
  try {
    const [ps, us] = await Promise.all([Store.list('projects'), Store.list('updates')]);
    if (!document.body.contains(box)) return;   // người dùng đã sang trang khác
    const byId = Object.fromEntries(ps.map(p => [p.id, p])), team = ps.filter(p => !p.ownerUid), comm = ps.filter(p => p.ownerUid);
    const mains = team.filter(p => p.kind !== 'sub'), subs = team.filter(p => p.kind === 'sub');
    const sec = (t, list, empty) => `<h3 class="psec">${t} <small>(${list.length})</small></h3>` + (list.length ? `<div class="pgrid">${list.map(p => pcard(p, us, byId)).join('')}</div>` : `<p class="muted">${empty}</p>`);
    box.innerHTML = (Store.mode === 'demo' ? '<div class="banner">Chế độ thử: tài khoản, dự án và tin nhắn chỉ lưu trên trình duyệt này. Điền Firebase trong config.js để dùng chung (xem README).</div>' : '') +
      sec('Dự án chính', mains, 'Chưa có dự án chính.') + (subs.length ? sec('Dự án phụ', subs, '') : '') +
      (comm.length ? sec('Dự án từ cộng đồng', [...comm].reverse().slice(0, 12), '') : '');
  } catch (e) { if (document.body.contains(box)) box.innerHTML = '<p class="err">Chưa tải được dự án: ' + esc(e.message) + '</p>'; }
}
async function project(id) {
  const p = (await Store.list('projects')).find(x => x.id === id);
  if (!p) { wrap('<p>Không tìm thấy dự án. <a class="plink" href="#/">Quay lại</a></p>'); return; }
  const all = (await Store.list('updates')).filter(u => u.projectId === id).reverse();
  const mine = !!me && !!p.ownerUid && p.ownerUid === me.id;
  const ownerHtml = p.ownerUid ? `<a class="plink" href="#/u/${esc(p.ownerUid)}">${esc(p.ownerName || p.owner)}</a>` : esc(p.owner);
  const kindTag = `<span class="tag">${p.kind === 'sub' ? 'Dự án phụ' : 'Dự án chính'}</span>`;
  const tl = (list, ts) => {
    const h = x => ts && ts.length && window.Search ? Search.markHtml(String(x ?? ''), ts) : esc(x);
    return list.map(u => `<div class="it"><div class="wk">${h(u.week)}</div><b>${h(u.title)}</b><p>${h(u.content)}</p>${Media.html(Media.list(u))}</div>`).join('') || `<p class="muted">${ts && ts.length ? 'Không có cập nhật nào khớp với từ khoá.' : 'Chưa có cập nhật.'}</p>`;
  };
  wrap(`<a href="#/" class="plink">&larr; Tất cả dự án</a>
  <div class="row" style="margin-top:12px"><h1>${esc(p.name)}</h1>${badge(p.status)} ${kindTag}</div>
  ${imgOkP(p) ? `<img class="pcover pcover-hero" src="${p.bgImg}" alt="${esc(p.name)}">` : ''}
  <p class="sub">${esc(p.desc)}<br>Chủ dự án: ${ownerHtml}${mine ? ' · <a class="plink" href="#" id="pjEdit">Chỉnh sửa dự án</a>' : ''}</p>
  <div class="card"><div class="pipe"><i style="width:${+p.progress || 0}%"></i></div><small class="muted">${+p.progress || 0}% hoàn thành</small></div>
  <div class="row" style="margin:28px 0 0"><h2>Cập nhật theo tuần</h2></div>
  <div class="psearch" role="search"><i class="fa-solid fa-magnifying-glass"></i><input id="pjq" type="search" placeholder="Tìm trong dự án này (tuần, tiêu đề, nội dung)…" autocomplete="off" maxlength="100" aria-label="Tìm trong dự án"></div>
  <small class="muted" id="pjn" style="display:block;margin:0 0 8px 6px">${all.length} cập nhật</small>
  <div class="tl" id="pjtl">${tl(all)}</div>`);
  const ed = $('#pjEdit'); if (ed) ed.onclick = e => { e.preventDefault(); Social.openManage(me.id); };
  const q = $('#pjq');
  q.oninput = () => {
    const ts = Search.termsOf(q.value), txt = u => Search.fold([u.week, u.title, u.content, ...Media.list(u).map(m => m.name || '')].join(' '));
    const list = ts.length ? all.filter(u => { const f = txt(u); return ts.every(t => f.includes(t)); }) : all;
    $('#pjtl').innerHTML = tl(list, ts); $('#pjn').textContent = ts.length ? `${list.length}/${all.length} cập nhật khớp` : `${all.length} cập nhật`;
  };
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
       <label>Mật khẩu (từ 6 ký tự)</label><input type="password" name="pw" minlength="6" required autocomplete="new-password"><label>Nhập lại mật khẩu</label><input type="password" name="pw2" minlength="6" required autocomplete="new-password"><button class="btn">${setPw ? 'Lưu mật khẩu' : 'Tạo tài khoản'}</button></form>`);
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
      if ((!p || setPw) && f.get('pw') !== f.get('pw2')) { $('#err').textContent = 'Hai mật khẩu chưa giống nhau. Hãy nhập lại.'; return; }
      if (p) { if (!await Store.checkPw(g, f.get('pw'), p)) { $('#err').textContent = 'Sai mật khẩu.'; return; } }
      else u = await Store.register(g, f.get('name').trim(), f.get('gender'), f.get('pw'));
      Store.setMe(u); me = Store.me(); toast('Xin chào ' + me.name); Social.ensureProfile(me);
      if (!p) { location.hash = '#/privacy'; return; }            // tài khoản mới: phải đồng ý cam kết quyền riêng tư
      location.hash = '#/'; setTimeout(() => openChat('admin'), 200);
    } catch (x) { $('#err').textContent = x.message || x.code; }
  };
}

/* --- Trang cam kết quyền riêng tư: hiện ngay sau khi đăng ký, phải đồng ý mới dùng tiếp --- */
async function privacy() {
  if (!me) { location.hash = '#/login'; return; }
  if (me.agreed !== false) { location.hash = '#/'; return; }
  const pts = [['fa-user-shield', 'Thông tin thu thập', 'Tên hiển thị, giới tính và email Google.'],
    ['fa-bullseye', 'Mục đích sử dụng', 'Chỉ để quản lý tài khoản và hỗ trợ bạn trong phạm vi dự án Pipe Traffic.'],
    ['fa-handshake-slash', 'Không chia sẻ', 'Không bán hay chuyển cho bên thứ ba khi chưa có sự đồng ý của bạn.'],
    ['fa-pen-to-square', 'Quyền của bạn', 'Xem, sửa ở trang Hồ sơ hoặc yêu cầu xoá bất cứ lúc nào qua tin nhắn cho admin.']];
  wrap(`<div class="card narrow pv">
    <div class="pv-head"><span class="pv-ico"><i class="fa-solid fa-shield-halved"></i></span>
      <div><h2>Cam kết quyền riêng tư</h2><p class="muted">Vui lòng đọc và đồng ý trước khi sử dụng tài khoản.</p></div></div>
    <ul class="pv-list">${pts.map(([i, t, d]) => `<li><i class="fa-solid ${i}"></i><div><b>${t}</b><span>${d}</span></div></li>`).join('')}</ul>
    <label class="pv-agree"><input type="checkbox" id="agree"><span>Tôi đã đọc và đồng ý với cam kết quyền riêng tư.</span></label>
    <button class="btn pv-ok" id="ok" disabled>Đồng ý và tiếp tục</button>
    <button type="button" class="pv-no" id="no">Không đồng ý, huỷ đăng ký</button>
    <div class="err" id="err"></div></div>`);
  $('#agree').onchange = e => { $('#ok').disabled = !e.target.checked; };
  $('#ok').onclick = async () => {
    try { await Store.agreePrivacy(me.id); me.agreed = true; Store.setMe({ ...me, privacyAgreed: true }, true); me = Store.me(); toast('Cảm ơn bạn đã đồng ý'); location.hash = '#/'; setTimeout(() => openChat('admin'), 200); }
    catch (x) { $('#err').textContent = x.message || x.code; }
  };
  $('#no').onclick = async () => {
    if (!confirm('Tài khoản vừa tạo sẽ bị xoá và bạn được đăng xuất. Tiếp tục?')) return;
    try { await Store.del('users', me.id); } catch (x) { /* bỏ qua, vẫn đăng xuất */ }
    try { await Store.del('profiles', me.id); } catch (x) { /* bỏ qua */ }
    Store.setMe(null); me = null; renderAuth(); toast('Đã huỷ đăng ký'); location.hash = '#/';
  };
}

/* --- Khung chat chung (popup): bấm nút Chat cạnh menu để mở / đóng. Hai tab: Admin (tin nhắn thật, cần đăng nhập) và AI ---
   Gắn AI: trong config.js hoặc một file <script> riêng, khai báo
   window.PT_AI = { ask: async (cauHoi, lichSu) => 'câu trả lời' };  (lichSu = [{role:'user'|'ai', text}]) */
let chatAt = null, chatBusy = false, reactOff = null;
const aiHist = []; let chatBound = false, chatTab = 'admin', msgs = [], unread = 0, msgOff = null, msgFor = null;
const bub = (cls, label, text, media, x) => `<div class="pp-row ${cls}">${cls === 'me' ? Avatar.html(me || { name: 'Bạn' }, 'sm') : cls === 'ai' ? Avatar.ai('sm') : Avatar.admin('sm')}<div class="pp-msg ${cls}"><small>${label}</small>${Msgx.body(text, media, x && x.recalled)}${x && x.id ? Msgx.foot(x.id, x.list || Msgx.get(x.id), x.uid, x.mine, x.recalled) : ''}</div></div>`;
Msgx.ctx = {
  uid: () => me && me.id, th: () => me && me.id, find: id => msgs.find(m => m.id === id), redraw: () => drawChat(),
  ai: {   // chat với AI: cảm xúc / thu hồi chỉ áp dụng trên máy này
    react(i, k) { const m = aiHist[i]; if (m) { m.r = m.r === k ? '' : k; drawChat(); } },
    recall(i) { const m = aiHist[i]; if (m && confirm('Thu hồi tin nhắn này?')) { aiHist[i] = { ts: m.ts, role: m.role, text: '', recalled: true }; drawChat(); } }
  }
};
const aiOn = () => !!(window.PT_AI && typeof window.PT_AI.ask === 'function');
const chatOpen = () => { const p = $('#chatPop'); return !!p && !p.hidden; };

/* --- Thông báo từ website (Notification API của trình duyệt) ---
   Bật bằng nút "Bật thông báo" trong menu ☰. Nhận thông báo khi: (1) admin trả lời tin nhắn, (2) có cập nhật tiến độ mới của dự án.
   Chỉ hoạt động khi trang đang mở (kể cả ở tab nền). Lựa chọn lưu ở khoá pt_notify. */
const Notify = (() => {
  const can = () => 'Notification' in window;
  const get = k => { try { return localStorage.getItem(k); } catch (x) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (x) { /* bỏ qua */ } };
  const on = () => can() && Notification.permission === 'granted' && get('pt_notify') === 'on';
  let offUpd = null, updInit = false;
  function show(title, body, go) {
    if (!on()) return;
    try {
      const n = new Notification(title, { body: String(body || '').slice(0, 140), icon: 'logo.jpg', tag: 'pt-' + go });
      n.onclick = () => { window.focus(); n.close(); if (go === 'chat') openChat('admin'); else if (go) location.hash = go; };
    } catch (x) { /* một số trình duyệt di động chỉ cho thông báo qua service worker */ }
  }
  function paint() {
    const b = $('#notifyTxt'), btn = $('#notifyBtn'); if (!b || !btn) return;
    btn.querySelector('i').className = on() ? 'fa-solid fa-bell text-sky-500 mr-2' : 'fa-regular fa-bell-slash text-slate-400 mr-2';
    b.textContent = !can() ? 'Trình duyệt chưa hỗ trợ thông báo' : on() ? 'Tắt thông báo' : (Notification.permission === 'denied' ? 'Thông báo đang bị chặn' : 'Bật thông báo');
  }
  // theo dõi cập nhật tiến độ mới (updates): lần đầu chỉ ghi mốc, không báo dồn
  function watchUpdates() {
    if (offUpd) { offUpd(); offUpd = null; }
    updInit = false;
    if (!on()) return;
    offUpd = Store.listen('updates', null, list => {
      const last = +get('pt_nt_upd') || 0, top = list.reduce((m, u) => Math.max(m, u.ts || 0), 0);
      if (updInit) list.filter(u => (u.ts || 0) > last).slice(-3).forEach(u => show('Cập nhật mới · ' + (u.week || 'Pipe Traffic'), u.title || u.content, '#/'));
      updInit = true; if (top > last) set('pt_nt_upd', top);
    }, () => {});
  }
  async function toggle() {
    if (!can()) return toast('Trình duyệt này chưa hỗ trợ thông báo.');
    if (on()) { set('pt_notify', 'off'); watchUpdates(); paint(); return toast('Đã tắt thông báo.'); }
    if (Notification.permission === 'denied') return toast('Thông báo đang bị chặn: bấm biểu tượng ổ khoá cạnh địa chỉ trang, cho phép "Thông báo" rồi thử lại.');
    let perm = Notification.permission;
    if (perm !== 'granted') { try { perm = await Notification.requestPermission(); } catch (x) { perm = 'denied'; } }
    if (perm !== 'granted') { paint(); return toast('Bạn chưa cho phép thông báo.'); }
    set('pt_notify', 'on'); set('pt_nt_upd', Date.now()); watchUpdates(); paint();
    toast('Đã bật thông báo.'); show('Pipe Traffic', 'Thông báo đã được bật. Bạn sẽ nhận tin khi admin trả lời hoặc có cập nhật mới.', '');
  }
  return { show, paint, toggle, watchUpdates, on };
})();
document.addEventListener('click', e => { if (e.target.closest('[data-notify]')) { e.preventDefault(); Notify.toggle(); } });
/* --- Hỏi bật thông báo: KHÔNG hỏi ở lần vào đầu tiên, chỉ hỏi từ lần thứ 2, và đợi thanh cookie tắt rồi mới hiện --- */
function askNotify() {
  let visits = 0; try { visits = (+localStorage.getItem('pt_visits') || 0) + 1; localStorage.setItem('pt_visits', visits); } catch (x) { /* bỏ qua */ }
  const bar = $('#notify-bar'); if (!bar || !('Notification' in window)) return;
  let snooze = null, off = null; try { snooze = sessionStorage.getItem('pt_nt_snooze'); off = localStorage.getItem('pt_notify'); } catch (x) { /* vẫn hỏi */ }
  if (Notification.permission === 'granted') { if (off !== 'off' && !Notify.on()) { try { localStorage.setItem('pt_notify', 'on'); localStorage.setItem('pt_nt_upd', Date.now()); } catch (x) {} Notify.watchUpdates(); Notify.paint(); } return; }
  if (Notification.permission === 'denied' || snooze || visits < 2) return;
  const show = () => { const c = $('#cookie-bar'); if (c && !c.hidden) return setTimeout(show, 1000); if (!Notify.on()) bar.hidden = false; };
  setTimeout(show, 2500);
  bar.addEventListener('click', async e => {
    const b = e.target.closest('[data-nt]'); if (!b) return;
    bar.hidden = true;
    if (b.dataset.nt === 'yes') await Notify.toggle(); else { try { sessionStorage.setItem('pt_nt_snooze', '1'); } catch (x) {} }
  });
}

/* --- Thông báo xã hội: có người theo dõi, gửi lời mời kết bạn, chấp nhận lời mời ---
   Hiện thông báo nhỏ trên trang (toast) + thông báo trình duyệt khi tab ở nền (nếu đã bật "Bật thông báo" trong menu ☰).
   Thông báo đến lúc bạn offline sẽ hiện khi bạn mở lại web. Chấm đỏ trên avatar = số lời mời kết bạn đang chờ. */
let socOff = [], socFor = null, socPending = 0;
function ensureSocial() {
  const id = me ? me.id : null;
  if (id === socFor) return;
  socOff.splice(0).forEach(f => f()); socFor = id; socPending = 0; paintBadge();
  if (!id) return;
  const get = k => { try { return localStorage.getItem(k); } catch (x) { return null; } }, set = (k, v) => { try { localStorage.setItem(k, v); } catch (x) { /* bỏ qua */ } };
  const watch = (col, where, kind, pick, text) => {
    const key = 'pt_nt_' + kind + '_' + id; let seen = get(key) === null ? Date.now() : +get(key);   // lần đầu: chỉ ghi mốc, không báo dồn
    set(key, seen);
    socOff.push(Store.listen(col, { where }, async list => {
      if (col === 'friends' && kind === 'req') { socPending = list.filter(x => x.status === 'pending').length; paintBadge(); }
      const fresh = list.filter(x => pick(x) && (x.ats || x.ts || 0) > seen).sort((a, b) => (a.ats || a.ts) - (b.ats || b.ts));
      if (!fresh.length) return;
      seen = Math.max(...fresh.map(x => x.ats || x.ts || 0)); set(key, seen);
      for (const x of fresh.slice(-3)) {
        const who = x.from === id ? x.to : x.from; let name = 'Một người dùng';
        try { const p = await Store.get('profiles', who); if (p && p.name) name = p.name; } catch (e) { /* giữ tên mặc định */ }
        const msg = name + ' ' + text, go = '#/u/' + who;
        if (document.hidden) Notify.show('Pipe Traffic', msg, go); else toast(msg);
      }
      if (fresh.length > 3) toast('Và ' + (fresh.length - 3) + ' thông báo khác');
    }, () => {}));
  };
  watch('follows', ['to', '==', id], 'fol', () => true, 'đã bắt đầu theo dõi bạn');
  watch('friends', ['to', '==', id], 'req', x => x.status === 'pending', 'đã gửi lời mời kết bạn');
  watch('friends', ['from', '==', id], 'acc', x => x.status === 'accepted', 'đã chấp nhận lời mời kết bạn của bạn');
}

/* Chấm đỏ trên nút Chat khi admin vừa trả lời; tin nhắn của người đăng nhập cập nhật ngay (thời gian thực) */
const paintBadge = () => {
  document.querySelectorAll('[data-chat-open]').forEach(a => a.classList.toggle('has-dot', !!me && unread > 0));
  document.querySelectorAll('.navuser').forEach(a => { a.classList.toggle('so-dot', !!me && socPending > 0); if (socPending > 0) a.dataset.n = socPending > 9 ? '9+' : socPending; else delete a.dataset.n; });
};
const markSeen = () => { if (me) localStorage.setItem('pt_seen_' + me.id, Date.now()); unread = 0; paintBadge(); };
function ensureMsgs() {
  const id = me ? me.id : null;
  if (id === msgFor) return;
  if (msgOff) { msgOff(); msgOff = null; }
  if (reactOff) { reactOff(); reactOff = null; }
  Msgx.setReacts([]);
  msgFor = id; msgs = []; unread = 0; paintBadge();
  if (!id) return;
  let first = true;
  msgOff = Store.listen('messages', { where: ['uid', '==', id] }, ms => {
    if (!first) {   // tin admin mới đến lúc khung chat đang đóng hoặc tab đang ở nền thì báo
      const known = new Set(msgs.map(m => m.id)), fresh = ms.filter(m => m.from === 'admin' && !m.recalled && !known.has(m.id));
      if (fresh.length && !(chatOpen() && chatTab === 'admin' && !document.hidden)) { const m = fresh[fresh.length - 1]; Notify.show('Admin Pipe Traffic', m.text, 'chat'); }
    }
    first = false;
    msgs = ms;
    if (chatOpen() && chatTab === 'admin') { markSeen(); drawChat(); }
    else { const seen = +localStorage.getItem('pt_seen_' + id) || 0; unread = ms.filter(m => m.from === 'admin' && m.ts > seen).length; paintBadge(); }
  }, () => {});
  reactOff = Store.listen('reacts', { where: ['th', '==', id] }, rs => { Msgx.setReacts(rs); if (chatOpen()) drawChat(); }, () => {});
}

function drawChat(busy) {
  const log = $('#chatLog'), form = $('#chatForm'); if (!log || !form) return;
  Chat.header(chatTab, msgs);
  document.querySelectorAll('[data-ct]').forEach(b => b.classList.toggle('on', b.dataset.ct === chatTab));
  const inp = form.t, btn = form.querySelector('button[type=submit]'), stick = !log.children.length || log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  if (chatTab === 'ai') {
    const on = aiOn(); inp.disabled = btn.disabled = !on;
    inp.placeholder = on ? 'Hỏi trợ lý về Pipe Traffic…' : 'Trợ lý sẽ được thêm sau';
    log.innerHTML = (Chat.render(aiHist.map((m, i) => ({ id: 'ai:' + i, who: m.role === 'user' ? 'me' : 'ai', mine: m.role === 'user', ts: m.ts, text: m.text, media: m.media, recalled: m.recalled, list: m.r ? [{ uid: 'me', k: m.r }] : [], uid: 'me', av: Avatar.ai('sm') })))
      || `<div class="pp-empty">${on ? 'Xin chào! Mình là trợ lý ảo của Pipe Traffic. Bạn muốn hỏi gì?<div class="pp-chips">' + ((window.PT_AI.suggest || []).map(q => `<button type="button" class="pp-chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')) + '</div>' : 'Trợ lý sẽ được thêm sau.'}</div>`) + (busy ? Chat.typing(Avatar.ai('sm')) : '');
    log.scrollTop = log.scrollHeight; Chat.paint(log); return;
  }
  if (!me) {
    inp.disabled = btn.disabled = true; inp.placeholder = 'Đăng nhập để nhắn tin cho admin';
    log.innerHTML = '<div class="pp-empty">Đăng nhập để nhắn tin cho admin.<br><a class="pp-btn" href="#/login" data-chat-close>Đăng nhập</a></div>'; return;
  }
  inp.disabled = btn.disabled = false; inp.placeholder = 'Nhắn cho admin…';
  log.innerHTML = Chat.render(msgs.map(m => ({ id: m.id, who: m.from === 'user' ? 'me' : 'them', mine: m.from === 'user', ts: m.ts, text: m.text, media: m.media, recalled: m.recalled, lk: m.lk, list: Msgx.get(m.id), uid: me.id, av: Avatar.admin('sm') }))) || '<div class="pp-empty">Chưa có tin nhắn. Hãy gửi tin đầu tiên.</div>';
  if (stick) log.scrollTop = log.scrollHeight;
  Chat.paint(log);
}
function openChat(tab) {
  const p = $('#chatPop'); if (!p) return;
  if (typeof toggleMobileMenu === 'function') toggleMobileMenu(true);   // mở chat thì đóng menu
  if (window.Search) Search.close();
  if (tab) chatTab = tab;
  if (!chatBound) {
    chatBound = true;
    chatAt = Attach.composer({ form: $('#chatForm'), text: $('#chatForm').t, zone: $('#chatPop') });   // 📎 / kéo thả / Ctrl+V
    $('#chatForm').onsubmit = async e => {
      e.preventDefault(); const inp = e.target.t, btn = e.target.querySelector('button[type=submit]'), has = !!(chatAt && chatAt.has()), lk = +e.target._lk || 0, t = inp.value.trim() || (!has && e.submitter && e.submitter.classList.contains('ms-like') ? '👍' : '');
      e.target._lk = 0;
      if ((!t && !has) || inp.disabled || chatBusy) return;
      if (chatTab === 'ai') {
        let media = []; try { media = has ? await chatAt.build({ local: true }) : []; } catch (x) { toast(x.message); return; }   // chat AI: tệp chỉ hiện tại máy này
        if (chatAt) chatAt.clear(); inp.value = ''; const before = aiHist.slice(); aiHist.push({ ts: Date.now(), role: 'user', text: t || Attach.txt(media), media }); drawChat(true);
        try { aiHist.push({ ts: Date.now(), role: 'ai', text: t ? String(await window.PT_AI.ask(t, before)) + (media.length ? '\n\n(Mình chưa xem hay nghe được tệp đính kèm nên chỉ trả lời dựa trên chữ bạn viết.)' : '') : 'Mình đã nhận tệp của bạn nhưng hiện chưa xem được ảnh, video, tệp hay nghe được tin nhắn thoại. Bạn mô tả bằng chữ giúp mình nhé.' }); }
        catch (x) { aiHist.push({ ts: Date.now(), role: 'ai', text: 'Trợ lý chưa trả lời được: ' + (x.message || x) }); }
        drawChat(); inp.focus();
      } else {
        chatBusy = true; btn.disabled = true;
        try {
          const media = has ? await chatAt.build({ uid: me.id, by: 'user', progress: (i, n) => { btn.innerHTML = '<small class="ms-prog">' + i + '/' + n + '</small>'; } }) : [];
          await Store.put('messages', { uid: me.id, userName: me.name, from: 'user', text: t || Attach.txt(media), ...(media.length ? { media } : {}), ...(lk > 1 && t === '👍' && !media.length ? { lk } : {}), projectId: '', projectName: '' });
          inp.value = ''; if (chatAt) chatAt.clear();
        } catch (x) { toast('Gửi chưa được: ' + x.message); }
        chatBusy = false; btn.disabled = false; if (chatAt) chatAt.sync();
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

/* --- Banner giới thiệu (popup): hiện 1 lần mỗi phiên khi vào trang chủ, tắt bằng ×, nút "Xem các dự án", bấm ra ngoài hoặc Esc.
   Nội dung sửa trong index.html, <template id="tpl-hero">. Hiện không còn tự mở khi vào web (xem cuối file); muốn bật lại thì gọi showWelcome(). --- */
function closeWelcome() { const m = $('#welcome-modal'); if (m) m.hidden = true; }
function showWelcome() {
  const m = $('#welcome-modal'), body = $('#welcomeBody'), html = tpl('tpl-hero'); if (!m || !body || !html) return;
  try { if (sessionStorage.getItem('pt_welcome')) return; sessionStorage.setItem('pt_welcome', '1'); } catch (x) { /* không lưu được thì vẫn hiện */ }
  body.innerHTML = html; m.hidden = false;
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-welcome-close]') || e.target.id === 'welcome-modal') { closeWelcome(); return; }
  if (e.target.closest('#welcome-modal a, #welcome-modal [data-chat-open]')) closeWelcome();   // bấm link / nút chat trong banner: đóng banner rồi đi tiếp
  const qb = e.target.closest('[data-q]'); if (qb) { const f = $('#chatForm'); if (f && !f.t.disabled) { f.t.value = qb.dataset.q; f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); } return; }
  const ct = e.target.closest('[data-ct]'); if (ct) { if (chatAt && chatTab !== ct.dataset.ct) chatAt.clear(); chatTab = ct.dataset.ct; if (chatTab === 'admin') markSeen(); drawChat(); return; }
  if (e.target.closest('[data-chat-open]')) { e.preventDefault(); toggleChat(); return; }
  if (e.target.closest('[data-chat-close]')) { closeChat(); return; }
  if (e.target.closest('[data-contact]')) { e.preventDefault(); openContact(); return; }
  if (e.target.closest('[data-contact-close]') || e.target.id === 'contact-modal') closeContact();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeWelcome(); closeContact(); closeChat(); } });

/* --- Hồ sơ: đổi avatar. Ảnh cắt vuông, thu nhỏ 160px, lưu vào hồ sơ người dùng (users) và hiện cạnh tin nhắn trong chat --- */
async function setAvatar(get) {
  let url, msg = '';
  try { url = await get(); } catch (x) { const e = $('#pfErr'); if (e) e.textContent = x.message; return; }
  me.avatar = url; Store.setMe(me, true); renderAuth(); if (chatOpen()) drawChat();   // hiện ngay trên máy này
  try {
    const pr = await Store.profile(me.id);
    Social.sync({ avatar: url });
    if (pr) await Store.put('users', { ...pr, avatar: url }); else msg = 'Không tìm thấy hồ sơ trên máy chủ.';
  } catch (x) { msg = 'Đã lưu trên máy này nhưng chưa đồng bộ lên máy chủ (' + (x.message || x.code) + '). Admin cần cập nhật Rules để cho phép đổi avatar.'; }
  profile();
  if (msg) $('#pfErr').textContent = msg; else toast(url ? 'Đã cập nhật avatar' : 'Đã xoá avatar');
}
async function profile() {
  if (!me) { location.hash = '#/login'; return; }
  const v = k => esc(me[k] || '');
  const sel = g => (me.gender === g ? ' selected' : '');
  wrap(`<a href="#/" class="plink">&larr; Trang chính</a> · <a href="#/u/${me.id}" class="plink">Xem trang cá nhân của tôi</a>
  <div class="card narrow pf">
    <div id="pfAv">${Avatar.html(me, 'lg')}</div>
    <h1>${esc(me.name)}</h1><p class="muted">${esc(me.email)}</p>
    <input type="file" id="pfFile" accept="image/*" hidden>
    <div class="row" style="justify-content:center;gap:10px"><button class="btn" id="pfPick">${Avatar.ok(me.avatar) ? 'Đổi avatar' : 'Chọn avatar'}</button>${Avatar.ok(me.avatar) ? '<button class="btn ghost" id="pfDel">Xoá ảnh</button>' : ''}</div>
    <p class="muted pf-note">Ảnh được cắt vuông và thu nhỏ tự động, hiện cạnh tin nhắn của bạn trong khung chat.</p>
    <div class="err" id="pfErr"></div>
    <hr class="pf-hr">
    <form id="pfForm" class="pf-form" autocomplete="off">
      <h3>Thông tin cá nhân</h3>
      <div class="pf-grid">
        <div class="full"><label>Tên hiển thị</label><input name="name" required maxlength="40" value="${v('name')}"></div>
        <div class="full"><label>Giới tính</label><select name="gender"><option${sel('Nam')}>Nam</option><option${sel('Nữ')}>Nữ</option><option${sel('Khác')}>Khác</option></select></div>
        <div class="full"><label>Email (đăng nhập Google, không đổi được)</label><input value="${v('email')}" disabled></div>
      </div>
      <button class="btn pf-save" id="pfSave">Lưu thông tin</button>
      <div class="err" id="pfFormErr"></div>
    </form></div>`);
  $('#pfPick').onclick = () => $('#pfFile').click();
  $('#pfFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) setAvatar(() => Media.avatar(f, 160, .82)); };
  if ($('#pfDel')) $('#pfDel').onclick = () => setAvatar(async () => '');

  // Điền sẵn thông tin đầy đủ từ máy chủ (bản lưu trên máy này có thể thiếu một số trường)
  const form = $('#pfForm'); let server = null;
  Store.profile(me.id).then(pr => {
    server = pr; if (!pr || !document.body.contains(form)) return;
    ['name', 'gender'].forEach(k => { const el = form.elements[k]; if (el && pr[k] && !el.dataset.touched && !el.value) el.value = pr[k]; });
  }).catch(() => {});
  form.addEventListener('input', e => { e.target.dataset.touched = 1; });
  form.onsubmit = async e => {
    e.preventDefault(); const err = $('#pfFormErr'), btn = $('#pfSave'); err.textContent = '';
    const f = new FormData(form), d = { name: f.get('name').trim(), gender: f.get('gender') };
    if (!d.name) { err.textContent = 'Tên hiển thị không được để trống.'; return; }
    btn.disabled = true; btn.textContent = 'Đang lưu…';
    try {
      const pr = server || await Store.profile(me.id);
      if (!pr) throw new Error('Không tìm thấy hồ sơ trên máy chủ.');
      await Store.put('users', { ...pr, ...d });
      Social.sync({ name: d.name });
      Object.assign(me, d); Store.setMe(me, true); renderAuth(); if (chatOpen()) drawChat();
      toast('Đã cập nhật thông tin'); profile();
    } catch (x) {
      err.textContent = 'Chưa lưu được: ' + (x.message || x.code) + '. Nếu lỗi là "permission", admin cần cập nhật Firestore Rules để cho phép người dùng sửa hồ sơ của mình.';
      btn.disabled = false; btn.textContent = 'Lưu thông tin';
    }
  };
}

/* --- Điều hướng (hash), mỗi mục trên menu là một TRANG RIÊNG nhưng vẫn là một file SPA ---
   #/  ·  #/p/<id>  ·  #/login  ·  #/profile  ·  #/specs  #/journey  #/problems  #/team  #/video  #/faq  #/comments */
const PAGES = ['specs', 'journey', 'problems', 'team', 'video', 'faq'];   // bỏ 'comments' (đã gộp vào video)
const routes = { '': home, p: project, u: id => Social.page(id, { wrap, card: pcard }), login, profile, privacy, search: id => Search.page(id) };
async function route() {
  const [r, id] = location.hash.replace(/^#\/?/, '').split('/');
  if (r === 'about') { location.replace('#/' + (id || '')); return; }       // link cũ #/about/team -> #/team
  if (r === 'chat') { location.replace('#/'); setTimeout(() => openChat(), 100); return; }   // link cũ #/chat -> về trang chủ và mở popup chat
  if (r === 'comments') { location.replace('#/video'); return; }            // link cũ #/comments -> trang Video
  if (me && me.agreed === false && r !== 'privacy') { location.replace('#/privacy'); return; }   // chưa đồng ý cam kết thì chỉ vào được trang này
  stopLive(); renderAuth(); ensureMsgs(); ensureSocial(); paintBadge(); toggleMobileMenu(true);
  setActive(PAGES.includes(r) ? r : (r === '' || r === 'p' ? 'projects' : ''));
  window.scrollTo(0, 0);
  try {
    if (PAGES.includes(r)) {
      app.dataset.view = r;
      // trang video = video bên trái + bình luận bên phải (kiểu YouTube)
      app.innerHTML = r === 'video'
        ? `<div class="pt-20"><div class="yt-wrap"><div class="yt-main">${tpl('tpl-video')}</div><aside class="yt-side">${tpl('tpl-comments')}</aside></div></div>`
        : `<div class="pt-20">${tpl('tpl-' + r)}</div>`;
      const jobs = [fillContent(r)];
      if (r === 'video') { setRating(5); jobs.push(loadCommentsFromSheet()); }
      Promise.allSettled(jobs).then(() => Search.applyFind());   // tìm kiếm: tô từ khoá + cuộn tới đoạn được chọn
    } else {
      app.dataset.view = r || 'home';
      if (r === 'p') app.innerHTML = '<div class="pt-app pt-32"><div class="loading">Đang tải…</div></div>';
      await (routes[r || ''] || home)(id);
      Search.applyFind();
    }
  } catch (e) { wrap('<p class="err">Lỗi tải dữ liệu: ' + esc(e.message) + '</p>'); }
}
app.innerHTML = '<div class="pt-app pt-32"><div class="loading">Đang tải…</div></div>';
const hideSplash = () => { const s = $('#splash'); if (s) { s.classList.add('off'); setTimeout(() => s.remove(), 500); } };
(async () => {
  try {
    await Store.init(); me = Store.me(); applyLinks(); addEventListener('hashchange', route);
    if (me) Store.profile(me.id).then(pr => { if (me && pr && Avatar.ok(pr.avatar) && pr.avatar !== me.avatar) { me.avatar = pr.avatar; Store.setMe(me, true); renderAuth(); if (chatOpen()) drawChat(); } }).catch(() => {});
    addEventListener('pt-me', () => { me = Store.me(); renderAuth(); if (chatOpen()) drawChat(); });   // trang cá nhân đổi tên / logo
    if (me) Social.ensureProfile(me);
    Notify.paint(); Notify.watchUpdates();
    await Promise.race([route(), new Promise(r => setTimeout(r, 4000))]);   // chờ tối đa 4 giây rồi mở trang
  } catch (e) { wrap('<p class="err">Trang chưa chạy được: ' + esc(e.message) + '. Nhấn Ctrl+Shift+R; nếu vẫn lỗi hãy báo lại dòng này.</p>'); }
  hideSplash(); askNotify();   // (đã bỏ popup chào tự mở: màn hình đầu tiên chỉ còn thanh cookie)
})();
