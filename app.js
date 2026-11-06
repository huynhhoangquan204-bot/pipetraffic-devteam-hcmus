/* ===== SPA: định tuyến + trang Dự án / Đăng nhập / Tin nhắn (dùng chung hàm tiện ích trong script.js) ===== */
const app = $('#app');
const fmt = t => new Date(t).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const tpl = id => document.getElementById(id).innerHTML;
const wrap = h => { app.innerHTML = `<div class="pt-app max-w-5xl mx-auto px-4 pt-28 pb-20 min-h-[70vh]">${h}</div>`; };
const badge = s => `<span class="tag ${s === 'Hoàn thành' ? 'done' : s === 'Đang làm' ? 'run' : ''}">${esc(s)}</span>`;
let me = Store.me();

/* --- Nút đăng nhập trên menu --- */
function renderAuth() {
  const btn = 'bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm px-6 py-2.5 rounded-full shadow-lg shadow-sky-600/25 transition-all hover:shadow-xl hover:scale-105 inline-flex items-center gap-2';
  $('#authSlot').innerHTML = me
    ? `<a href="#/chat" class="${btn}"><i class="fa-solid fa-comment-dots text-xs"></i> Nhắn tin</a><button data-out class="text-sm font-medium text-slate-500 hover:text-sky-600">${esc(me.name)} · Thoát</button>`
    : `<a href="#/login" class="${btn}"><i class="fa-solid fa-right-to-bracket text-xs"></i> Đăng nhập</a>`;
  $('#authSlotM').innerHTML = me
    ? `<a href="#/chat" onclick="toggleMobileMenu(true)" class="block text-center bg-sky-600 text-white py-3 rounded-xl font-bold mt-2">Nhắn tin với chủ dự án</a><button data-out class="block w-full text-center py-2 text-slate-500 font-medium">${esc(me.name)} · Thoát</button>`
    : `<a href="#/login" onclick="toggleMobileMenu(true)" class="block text-center bg-sky-600 text-white py-3 rounded-xl font-bold mt-2 shadow-lg shadow-sky-600/30">Đăng nhập</a>`;
  document.querySelectorAll('[data-out]').forEach(b => b.onclick = () => { Store.setMe(null); me = null; location.hash = '#/'; route(); });
}
function setActive(key) {
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('nav-on', a.dataset.r === key));
}

/* --- Trang chủ: banner gốc + danh sách dự án --- */
async function home() {
  const [ps, us] = await Promise.all([Store.list('projects'), Store.list('updates')]);
  app.innerHTML = tpl('tpl-hero') + `<section id="projects" class="py-20 bg-slate-50"><div class="pt-app max-w-5xl mx-auto px-4">
  <h2 class="sec">Các dự án</h2><p class="sub">Tình hình cập nhật hằng tuần của Pipe Traffic Dev Team.</p>
  ${Store.mode === 'demo' ? '<div class="banner">Chế độ thử: tài khoản, dự án và tin nhắn chỉ lưu trên trình duyệt này. Điền Firebase trong config.js để dùng chung (xem README).</div>' : ''}
  <div class="pgrid">${ps.map(p => {
    const last = us.filter(u => u.projectId === p.id).pop();
    return `<a class="card" href="#/p/${p.id}"><div class="row"><h2>${esc(p.name)}</h2>${badge(p.status)}</div>
    <p class="muted" style="margin:0">${esc(p.desc)}</p>
    <div class="pipe"><i style="width:${+p.progress || 0}%"></i></div><small class="muted">${+p.progress || 0}% hoàn thành</small>
    ${last ? `<p style="margin:10px 0 0;font-size:.9rem"><b>${esc(last.week)}:</b> ${esc(last.title)}</p>` : ''}</a>`;
  }).join('') || '<p class="muted">Chưa có dự án nào.</p>'}</div></div></section>`;
}

async function project(id) {
  const p = (await Store.list('projects')).find(x => x.id === id);
  if (!p) { wrap('<p>Không tìm thấy dự án. <a class="plink" href="#/">Quay lại</a></p>'); return; }
  const us = (await Store.list('updates')).filter(u => u.projectId === id).reverse();
  wrap(`<a href="#/" class="plink">&larr; Tất cả dự án</a>
  <div class="row" style="margin-top:12px"><h1>${esc(p.name)}</h1>${badge(p.status)}</div>
  <p class="sub">${esc(p.desc)}<br>Chủ dự án: ${esc(p.owner)}</p>
  <div class="card"><div class="pipe"><i style="width:${+p.progress || 0}%"></i></div><small class="muted">${+p.progress || 0}% hoàn thành</small></div>
  <div class="row" style="margin:28px 0 0"><h2>Cập nhật theo tuần</h2><a class="btn sm" href="#/chat/${p.id}">Nhắn chủ dự án</a></div>
  <div class="tl">${us.map(u => `<div class="it"><div class="wk">${esc(u.week)}</div><b>${esc(u.title)}</b><p>${esc(u.content)}</p></div>`).join('') || '<p class="muted">Chưa có cập nhật.</p>'}</div>`);
}

/* --- Đăng nhập: Google (bắt buộc) -> tên / giới tính / mật khẩu --- */
async function login() {
  if (me) { location.hash = '#/chat'; return; }
  wrap(`<div class="card narrow"><h2>Đăng nhập</h2><p class="muted">Bước 1: đăng nhập Google (bắt buộc).</p>
  <button class="btn g" id="g">Tiếp tục với Google</button><div id="step"></div><div class="err" id="err"></div></div>`);
  $('#g').onclick = async () => {
    $('#err').textContent = '';
    try { const email = await Store.google(); step(email, await Store.findUser(email)); }
    catch (e) { $('#err').textContent = 'Đăng nhập Google chưa thành công: ' + (e.message || e.code); }
  };
}
function step(email, u) {
  $('#g').style.display = 'none';
  $('#step').innerHTML = `<p><b>${esc(email)}</b></p>` + (u
    ? `<form id="f"><label>Mật khẩu</label><input type="password" name="pw" required autofocus><button class="btn">Đăng nhập</button></form>`
    : `<p class="muted">Tài khoản mới. Bước 2: điền thông tin.</p><form id="f"><label>Tên hiển thị</label><input name="name" required maxlength="40">
       <label>Giới tính</label><select name="gender"><option>Nam</option><option>Nữ</option><option>Khác</option></select>
       <label>Mật khẩu (từ 4 ký tự)</label><input type="password" name="pw" minlength="4" required><button class="btn">Tạo tài khoản</button></form>`);
  $('#f').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    if (u) { if (!await Store.checkPw(u, f.get('pw'))) { $('#err').textContent = 'Sai mật khẩu.'; return; } }
    else u = await Store.register(email, f.get('name').trim(), f.get('gender'), f.get('pw'));
    Store.setMe(u); me = Store.me(); toast('Xin chào ' + me.name); location.hash = '#/chat';
  };
}

/* --- Nhắn tin với chủ dự án --- */
async function chat(pid) {
  if (!me) { location.hash = '#/login'; return; }
  const [ps, all] = await Promise.all([Store.list('projects'), Store.list('messages')]);
  const ms = all.filter(m => m.userId === me.id);
  wrap(`<h1>Nhắn tin với chủ dự án</h1><p class="sub">Cuộc trò chuyện được lưu lại để admin trả lời.</p>
  <div class="card"><div class="chat" id="log">${ms.map(m => `<div class="msg ${m.from === 'user' ? 'me' : ''}"><small>${m.from === 'user' ? 'Bạn' : 'Admin'}${m.projectName ? ' · ' + esc(m.projectName) : ''} · ${fmt(m.ts)}</small><span>${esc(m.text)}</span></div>`).join('') || '<p class="muted">Chưa có tin nhắn. Hãy gửi tin đầu tiên.</p>'}</div>
  <form id="f"><label>Về dự án</label><select name="p"><option value="">Chung</option>${ps.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
  <label>Nội dung</label><textarea name="t" required maxlength="1000"></textarea><button class="btn">Gửi</button></form></div>`);
  const log = $('#log'); log.scrollTop = log.scrollHeight;
  $('#f').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target), p = ps.find(x => x.id === f.get('p'));
    await Store.put('messages', { userId: me.id, userName: me.name, from: 'user', text: f.get('t').trim(), projectId: p ? p.id : '', projectName: p ? p.name : '' });
    toast('Đã gửi'); chat(pid);
  };
}

/* --- Điều hướng (hash): #/ · #/p/<id> · #/login · #/chat · #/about/<mục> --- */
const routes = { '': home, p: project, login, chat };
async function route() {
  const [r, id] = location.hash.replace(/^#\/?/, '').split('/');
  renderAuth(); toggleMobileMenu(true);
  setActive(r === 'about' ? (id || '') : (r === '' || r === 'p' ? 'projects' : ''));
  try {
    if (r === 'about') {
      if (app.dataset.view !== 'about') { app.innerHTML = tpl('tpl-about'); app.dataset.view = 'about'; setRating(5); loadCommentsFromSheet(); }
      if (id) setTimeout(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 40);
      else window.scrollTo(0, 0);
    } else {
      app.dataset.view = r || 'home'; window.scrollTo(0, 0);
      await (routes[r || ''] || home)(id);
    }
  } catch (e) { wrap('<p class="err">Lỗi tải dữ liệu: ' + esc(e.message) + '</p>'); }
}
addEventListener('hashchange', route); route();
