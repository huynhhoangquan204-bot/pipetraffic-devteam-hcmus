const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = t => new Date(t).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2000); };
let tab = 'projects', editing = null, thread = null;

function login() {
  $('#nav').innerHTML = '';
  app.innerHTML = `<div class="card narrow"><h2>Đăng nhập quản trị</h2><form id="f"><label>Tên tài khoản</label><input name="u" required autofocus autocomplete="username">
  <label>Mật khẩu</label><input type="password" name="p" required autocomplete="current-password"><button class="btn">Đăng nhập</button></form><div class="err" id="err"></div></div>`;
  $('#f').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    if (await Store.adminLogin(f.get('u').trim(), f.get('p'))) render(); else $('#err').textContent = 'Sai tên tài khoản hoặc mật khẩu.';
  };
}

function nav() {
  const t = [['projects', 'Dự án'], ['updates', 'Cập nhật tuần'], ['messages', 'Tin nhắn'], ['users', 'Người dùng']];
  $('#nav').innerHTML = t.map(([k, v]) => `<a href="#" data-t="${k}" class="${tab === k ? 'on' : ''}">${v}</a>`).join('') + '<button id="out">Thoát</button>';
  document.querySelectorAll('[data-t]').forEach(a => a.onclick = e => { e.preventDefault(); tab = a.dataset.t; editing = null; thread = null; render(); });
  $('#out').onclick = () => { Store.adminLogout(); login(); };
}

function isoWeek() {
  const d = new Date(), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `Tuần ${Math.ceil(((t - y) / 864e5 + 1) / 7)}/${t.getUTCFullYear()}`;
}

async function render() {
  if (!Store.isAdmin()) return login();
  nav();
  try { await ({ projects, updates, messages, users })[tab](); } catch (e) { app.innerHTML = '<p class="err">Lỗi: ' + esc(e.message) + '</p>'; }
}

async function projects() {
  const ps = await Store.list('projects'), e = ps.find(p => p.id === editing) || {};
  app.innerHTML = `<h1>Dự án</h1><p class="sub">Thêm, sửa hoặc xoá dự án hiển thị trên trang chính.</p>
  <div class="card"><h2>${e.id ? 'Sửa dự án' : 'Thêm dự án'}</h2><form id="f"><label>Tên</label><input name="name" required value="${esc(e.name)}">
  <label>Mô tả</label><textarea name="desc">${esc(e.desc)}</textarea>
  <div class="two"><div><label>Trạng thái</label><select name="status">${['Kế hoạch', 'Đang làm', 'Tạm dừng', 'Hoàn thành'].map(s => `<option ${e.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
  <div><label>Tiến độ (%)</label><input type="number" name="progress" min="0" max="100" value="${+e.progress || 0}"></div></div>
  <label>Chủ dự án</label><input name="owner" value="${esc(e.owner || 'Admin')}">
  <button class="btn">${e.id ? 'Lưu thay đổi' : 'Thêm dự án'}</button>${e.id ? ' <button type="button" class="btn ghost" id="x">Huỷ</button>' : ''}</form></div>
  <div class="card" style="margin-top:14px">${ps.map(p => `<div class="item"><div><b>${esc(p.name)}</b> <span class="tag">${esc(p.status)}</span> <small class="muted">${+p.progress}%</small></div>
  <div><button class="btn ghost sm" data-e="${p.id}">Sửa</button> <button class="btn danger" data-d="${p.id}">Xoá</button></div></div>`).join('') || '<p class="muted">Chưa có dự án.</p>'}</div>`;
  $('#f').onsubmit = async ev => {
    ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target));
    await Store.put('projects', { ...e, name: f.name.trim(), desc: f.desc, status: f.status, progress: Math.min(100, Math.max(0, +f.progress)), owner: f.owner });
    editing = null; toast('Đã lưu'); render();
  };
  if ($('#x')) $('#x').onclick = () => { editing = null; render(); };
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { editing = b.dataset.e; render(); window.scrollTo(0, 0); });
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Xoá dự án này và các cập nhật của nó?')) { const id = b.dataset.d; for (const u of (await Store.list('updates')).filter(u => u.projectId === id)) await Store.del('updates', u.id); await Store.del('projects', id); render(); } });
}

async function updates() {
  const [ps, us] = await Promise.all([Store.list('projects'), Store.list('updates')]), e = us.find(u => u.id === editing) || {};
  const name = id => (ps.find(p => p.id === id) || {}).name || '(đã xoá)';
  app.innerHTML = `<h1>Cập nhật theo tuần</h1><p class="sub">Mỗi bản cập nhật gắn với một dự án.</p>
  <div class="card"><h2>${e.id ? 'Sửa cập nhật' : 'Thêm cập nhật'}</h2>${ps.length ? `<form id="f"><div class="two"><div><label>Dự án</label><select name="projectId">${ps.map(p => `<option value="${p.id}" ${e.projectId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
  <div><label>Tuần</label><input name="week" required value="${esc(e.week || isoWeek())}"></div></div>
  <label>Tiêu đề</label><input name="title" required value="${esc(e.title)}"><label>Nội dung</label><textarea name="content" required>${esc(e.content)}</textarea>
  <button class="btn">${e.id ? 'Lưu thay đổi' : 'Đăng cập nhật'}</button>${e.id ? ' <button type="button" class="btn ghost" id="x">Huỷ</button>' : ''}</form>` : '<p class="muted">Hãy tạo dự án trước.</p>'}</div>
  <div class="card" style="margin-top:14px">${[...us].reverse().map(u => `<div class="item"><div><small class="muted">${esc(name(u.projectId))} · ${esc(u.week)}</small><br><b>${esc(u.title)}</b></div>
  <div><button class="btn ghost sm" data-e="${u.id}">Sửa</button> <button class="btn danger" data-d="${u.id}">Xoá</button></div></div>`).join('') || '<p class="muted">Chưa có cập nhật.</p>'}</div>`;
  if ($('#f')) $('#f').onsubmit = async ev => { ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target)); await Store.put('updates', { ...e, ...f }); editing = null; toast('Đã đăng'); render(); };
  if ($('#x')) $('#x').onclick = () => { editing = null; render(); };
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { editing = b.dataset.e; render(); window.scrollTo(0, 0); });
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Xoá cập nhật này?')) { await Store.del('updates', b.dataset.d); render(); } });
}

async function messages() {
  const ms = await Store.list('messages'), by = {};
  ms.forEach(m => (by[m.userId] = by[m.userId] || []).push(m));
  const ids = Object.keys(by).sort((a, b) => by[b].at(-1).ts - by[a].at(-1).ts);
  const t = thread && by[thread] ? thread : null;
  app.innerHTML = `<h1>Tin nhắn</h1><p class="sub">Trao đổi giữa người dùng và chủ dự án.</p>
  ${t ? `<a href="#" id="back" class="muted">&larr; Tất cả hội thoại</a><div class="card" style="margin-top:10px"><h2>${esc(by[t][0].userName)}</h2><div class="chat" id="log">${by[t].map(m => `<div class="msg ${m.from === 'admin' ? 'me' : ''}"><small>${m.from === 'admin' ? 'Admin' : esc(m.userName)}${m.projectName ? ' · ' + esc(m.projectName) : ''} · ${fmt(m.ts)}</small><span>${esc(m.text)}</span></div>`).join('')}</div>
  <form id="f"><textarea name="t" required placeholder="Trả lời…"></textarea><button class="btn">Gửi trả lời</button></form></div>`
  : `<div class="card">${ids.map(id => { const l = by[id].at(-1); return `<div class="item"><div><b>${esc(l.userName)}</b> <small class="muted">${fmt(l.ts)}</small><br><span class="muted">${l.from === 'admin' ? 'Bạn: ' : ''}${esc(l.text.slice(0, 80))}</span></div><button class="btn sm" data-t="${id}">Mở</button></div>`; }).join('') || '<p class="muted">Chưa có tin nhắn nào.</p>'}</div>`}`;
  if (t) {
    $('#back').onclick = e => { e.preventDefault(); thread = null; render(); };
    const log = $('#log'); log.scrollTop = log.scrollHeight;
    $('#f').onsubmit = async e => { e.preventDefault(); await Store.put('messages', { userId: t, userName: by[t][0].userName, from: 'admin', text: new FormData(e.target).get('t').trim() }); render(); };
  }
  document.querySelectorAll('[data-t]').forEach(b => { if (b.classList.contains('btn')) b.onclick = () => { thread = b.dataset.t; render(); }; });
}

async function users() {
  const us = await Store.list('users');
  app.innerHTML = `<h1>Người dùng</h1><p class="sub">${us.length} tài khoản đã đăng ký.</p><div class="card">${us.map(u => `<div class="item"><div><b>${esc(u.name)}</b> <span class="tag">${esc(u.gender)}</span><br><small class="muted">${esc(u.email)} · ${fmt(u.ts)}</small></div><button class="btn danger" data-d="${u.id}">Xoá</button></div>`).join('') || '<p class="muted">Chưa có người dùng.</p>'}</div>`;
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Xoá người dùng này?')) { await Store.del('users', b.dataset.d); render(); } });
}
render();
