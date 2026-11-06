const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = t => new Date(t).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); };
const badge = s => `<span class="tag ${s === 'Hoàn thành' ? 'done' : s === 'Đang làm' ? 'run' : ''}">${esc(s)}</span>`;
let me = Store.me();

function nav(r) {
  $('#nav').innerHTML = `<a href="#/" class="${r === '' || r === 'p' ? 'on' : ''}">Dự án</a>` +
    (me ? `<a href="#/chat" class="${r === 'chat' ? 'on' : ''}">Nhắn tin</a><button id="out">${esc(me.name)} · Thoát</button>`
        : `<a href="#/login" class="${r === 'login' ? 'on' : ''}">Đăng nhập</a>`);
  const o = $('#out'); if (o) o.onclick = () => { Store.setMe(null); me = null; location.hash = '#/'; route(); };
}

async function home() {
  const [ps, us] = await Promise.all([Store.list('projects'), Store.list('updates')]);
  app.innerHTML = `<h1>Các dự án</h1><p class="sub">Tình hình cập nhật hằng tuần của Pipe Traffic Dev Team.</p>
  ${Store.mode === 'demo' ? '<div class="banner">Chế độ demo: dữ liệu chỉ lưu trên trình duyệt này. Cấu hình Firebase để dùng chung (xem README).</div>' : ''}
  <div class="grid">${ps.map(p => {
    const last = us.filter(u => u.projectId === p.id).pop();
    return `<a class="card" href="#/p/${p.id}"><div class="row"><h2>${esc(p.name)}</h2>${badge(p.status)}</div>
    <p class="muted" style="margin:0">${esc(p.desc)}</p>
    <div class="pipe"><i style="width:${+p.progress || 0}%"></i></div><small class="muted">${+p.progress || 0}% hoàn thành</small>
    ${last ? `<p style="margin:10px 0 0;font-size:.9rem"><b>${esc(last.week)}:</b> ${esc(last.title)}</p>` : ''}</a>`;
  }).join('') || '<p class="muted">Chưa có dự án nào.</p>'}</div>`;
}

async function project(id) {
  const p = (await Store.list('projects')).find(x => x.id === id);
  if (!p) { app.innerHTML = '<p>Không tìm thấy dự án. <a href="#/">Quay lại</a></p>'; return; }
  const us = (await Store.list('updates')).filter(u => u.projectId === id).reverse();
  app.innerHTML = `<a href="#/" class="muted">&larr; Tất cả dự án</a>
  <div class="row" style="margin-top:10px"><h1>${esc(p.name)}</h1>${badge(p.status)}</div>
  <p class="sub">${esc(p.desc)}<br>Chủ dự án: ${esc(p.owner)}</p>
  <div class="card"><div class="pipe"><i style="width:${+p.progress || 0}%"></i></div><small class="muted">${+p.progress || 0}% hoàn thành</small></div>
  <div class="row" style="margin:26px 0 0"><h2>Cập nhật theo tuần</h2><a class="btn sm" style="text-decoration:none;color:#fff" href="#/chat/${p.id}">Nhắn chủ dự án</a></div>
  <div class="tl">${us.map(u => `<div class="it"><div class="wk">${esc(u.week)}</div><b>${esc(u.title)}</b><p>${esc(u.content)}</p></div>`).join('') || '<p class="muted">Chưa có cập nhật.</p>'}</div>`;
}

async function login() {
  if (me) { location.hash = '#/chat'; return; }
  app.innerHTML = `<div class="card narrow"><h2>Đăng nhập</h2><p class="muted">Bước 1: đăng nhập Google (bắt buộc).</p>
  <button class="btn g" id="g">Tiếp tục với Google</button><div id="step"></div><div class="err" id="err"></div></div>`;
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

async function chat(pid) {
  if (!me) { location.hash = '#/login'; return; }
  const [ps, all] = await Promise.all([Store.list('projects'), Store.list('messages')]);
  const ms = all.filter(m => m.userId === me.id);
  app.innerHTML = `<h1>Nhắn tin với chủ dự án</h1><p class="sub">Cuộc trò chuyện được lưu lại để admin trả lời.</p>
  <div class="card"><div class="chat" id="log">${ms.map(m => `<div class="msg ${m.from === 'user' ? 'me' : ''}"><small>${m.from === 'user' ? 'Bạn' : 'Admin'}${m.projectName ? ' · ' + esc(m.projectName) : ''} · ${fmt(m.ts)}</small><span>${esc(m.text)}</span></div>`).join('') || '<p class="muted">Chưa có tin nhắn. Hãy gửi tin đầu tiên.</p>'}</div>
  <form id="f"><label>Về dự án</label><select name="p"><option value="">Chung</option>${ps.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
  <label>Nội dung</label><textarea name="t" required maxlength="1000"></textarea><button class="btn">Gửi</button></form></div>`;
  const log = $('#log'); log.scrollTop = log.scrollHeight;
  $('#f').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target), p = ps.find(x => x.id === f.get('p'));
    await Store.put('messages', { userId: me.id, userName: me.name, from: 'user', text: f.get('t').trim(), projectId: p ? p.id : '', projectName: p ? p.name : '' });
    toast('Đã gửi'); chat(pid);
  };
}

const routes = { '': home, p: project, login, chat };
async function route() {
  const [r, id] = location.hash.replace(/^#\//, '').split('/');
  nav(r || ''); window.scrollTo(0, 0);
  try { await (routes[r || ''] || home)(id); } catch (e) { app.innerHTML = '<p class="err">Lỗi tải dữ liệu: ' + esc(e.message) + '</p>'; }
}
addEventListener('hashchange', route); route();
