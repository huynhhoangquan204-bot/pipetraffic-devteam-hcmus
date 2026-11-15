const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = t => new Date(t).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2000); };
let tab = 'projects', editing = null, thread = null;

function login() {
  $('#nav').innerHTML = '';
  const fb = Store.mode === 'firebase', noMail = fb && !(window.APP_CONFIG || {}).adminEmail;
  app.innerHTML = `<div class="card narrow"><h2>Đăng nhập quản trị</h2>
  ${noMail ? '<div class="banner" style="margin:10px 0">Chưa điền <b>adminEmail</b> trong <b>config.js</b> nên chưa đăng nhập được (xem README, bước 4).</div>' : ''}
  <form id="f"><label>Tên tài khoản</label><input name="u" required autofocus autocomplete="username">
  <label>Mật khẩu</label><input type="password" name="p" required autocomplete="current-password"><button class="btn">Đăng nhập</button></form>
  ${fb && !noMail ? '<p style="margin-top:12px"><a href="#" id="forgot" class="plink">Quên mật khẩu admin?</a></p>' : ''}<div class="err" id="err"></div></div>`;
  $('#f').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    try {
      if (await Store.adminLogin(f.get('u').trim(), f.get('p'))) render(); else $('#err').textContent = 'Sai tên tài khoản hoặc mật khẩu.';
    } catch (x) { $('#err').textContent = x.message || x.code; }
  };
  const fg = $('#forgot');
  if (fg) fg.onclick = async e => {
    e.preventDefault();
    try { toast('Đã gửi email đặt lại mật khẩu tới ' + await Store.adminReset()); } catch (x) { $('#err').textContent = x.message || x.code; }
  };
}

function nav() {
  const t = [['projects', 'Dự án'], ['updates', 'Cập nhật tuần'], ['comments', 'Bình luận'], ['messages', 'Tin nhắn'], ['users', 'Người dùng']];
  $('#nav').innerHTML = t.map(([k, v]) => `<a href="#" data-t="${k}" class="${tab === k ? 'on' : ''}">${v}</a>`).join('') + '<button id="out">Thoát</button>';
  document.querySelectorAll('[data-t]').forEach(a => a.onclick = e => { e.preventDefault(); tab = a.dataset.t; editing = null; thread = null; render(); });
  $('#out').onclick = async () => { await Store.adminLogout(); login(); };
}

function isoWeek() {
  const d = new Date(), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `Tuần ${Math.ceil(((t - y) / 864e5 + 1) / 7)}/${t.getUTCFullYear()}`;
}

async function render() {
  app.innerHTML = '<div class="loading">Đang tải…</div>';
  if (!await Store.isAdmin()) return login();
  nav();
  try { await ({ projects, updates, comments, messages, users })[tab](); } catch (e) { app.innerHTML = '<p class="err">Lỗi: ' + esc(e.message) + '</p>'; }
}

/* ===== Đính kèm: ảnh / PDF nhỏ tải từ máy, video / PDF lớn dán link ===== */
let M = { files: [] };
const stripMedia = e => { const b = { ...e }; Media.KEYS.forEach(k => delete b[k]); return b; };   // bỏ tên trường cũ, gom về "media"
function mediaHtml(e) {
  const all = Media.list(e);
  M.files = all.filter(m => m.src.startsWith('data:'));
  const links = all.filter(m => !m.src.startsWith('data:')).map(m => m.src).join('\n');
  return `<label>Ảnh (tối đa 4, tự nén cho nhẹ) · PDF nhỏ (dưới ~550KB)</label>
  <input type="file" id="mf" accept="image/*,application/pdf" multiple><div class="pthumbs" id="mthumbs"></div>
  <label>Link video, PDF hoặc Google Drive (mỗi dòng một link)</label>
  <textarea name="links" rows="3" placeholder="https://www.youtube.com/watch?v=...&#10;https://drive.google.com/file/d/.../view">${esc(links)}</textarea>
  <small class="muted">Video và PDF lớn: đưa lên YouTube (không công khai) hoặc Google Drive (chia sẻ "Bất kỳ ai có liên kết") rồi dán link vào đây.</small>`;
}
function mediaWire() {
  const draw = () => {
    $('#mthumbs').innerHTML = M.files.map((m, i) => `<div class="pth">${m.t === 'img' ? `<img src="${esc(m.src)}" alt="">` : `<span class="pchip">📄 ${esc(m.name || 'PDF')}</span>`}<button type="button" data-rm="${i}" aria-label="Bỏ tệp này">×</button></div>`).join('');
    document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { M.files.splice(+b.dataset.rm, 1); draw(); });
  };
  draw();
  $('#mf').onchange = async ev => {
    for (const f of [...ev.target.files]) {
      try {
        if (f.type === 'application/pdf') M.files.push({ t: 'pdf', src: await Media.pdf(f), name: f.name });
        else if (M.files.filter(m => m.t === 'img').length >= 4) { toast('Tối đa 4 ảnh'); break; }
        else M.files.push({ t: 'img', src: await Media.image(f), name: '' });
      } catch (x) { toast(x.message); }
    }
    ev.target.value = ''; draw();
  };
}
function mediaCollect(links) {
  const ls = String(links || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
  const bad = ls.find(u => !/^https?:\/\/\S+$/i.test(u)); if (bad) throw new Error('Link không hợp lệ: ' + bad);
  const items = M.files.map(m => ({ t: m.t, src: m.src, ...(m.name ? { name: m.name } : {}) }));
  Media.list({ media: ls.map(u => ({ url: u })) }).forEach(m => items.push({ t: m.t, src: m.src }));
  if (JSON.stringify(items).length > 950000) throw new Error('Tệp đính kèm quá nặng (giới hạn ~950KB mỗi bài). Bớt ảnh/PDF hoặc dùng link.');
  return items;
}

async function projects() {
  const ps = await Store.list('projects'), e = ps.find(p => p.id === editing) || {};
  app.innerHTML = `<h1>Dự án</h1><p class="sub">Thêm, sửa hoặc xoá dự án hiển thị trên trang chính.</p>
  <div class="card"><h2>${e.id ? 'Sửa dự án' : 'Thêm dự án'}</h2><form id="f"><label>Tên</label><input name="name" required value="${esc(e.name)}">
  <label>Mô tả</label><textarea name="desc">${esc(e.desc)}</textarea>
  <div class="two"><div><label>Trạng thái</label><select name="status">${['Kế hoạch', 'Đang làm', 'Tạm dừng', 'Hoàn thành'].map(s => `<option ${e.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
  <div><label>Tiến độ (%)</label><input type="number" name="progress" min="0" max="100" value="${+e.progress || 0}"></div></div>
  <label>Chủ dự án</label><input name="owner" value="${esc(e.owner || 'Admin')}">
  ${mediaHtml(e)}
  <button class="btn">${e.id ? 'Lưu thay đổi' : 'Thêm dự án'}</button>${e.id ? ' <button type="button" class="btn ghost" id="x">Huỷ</button>' : ''}</form></div>
  <div class="card" style="margin-top:14px">${ps.map(p => `<div class="item"><div><b>${esc(p.name)}</b> <span class="tag">${esc(p.status)}</span> <small class="muted">${+p.progress}%${Media.list(p).length ? ' · 📎' + Media.list(p).length : ''}</small></div>
  <div><button class="btn ghost sm" data-e="${p.id}">Sửa</button> <button class="btn danger" data-d="${p.id}">Xoá</button></div></div>`).join('') || '<p class="muted">Chưa có dự án.</p>'}</div>`;
  $('#f').onsubmit = async ev => {
    ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target));
    try {
      const media = mediaCollect(f.links);
      await Store.put('projects', { ...stripMedia(e), name: f.name.trim(), desc: f.desc, status: f.status, progress: Math.min(100, Math.max(0, +f.progress)), owner: f.owner, media });
    } catch (x) { return toast(x.message); }
    editing = null; toast('Đã lưu'); render();
  };
  mediaWire();
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
  ${mediaHtml(e)}
  <button class="btn">${e.id ? 'Lưu thay đổi' : 'Đăng cập nhật'}</button>${e.id ? ' <button type="button" class="btn ghost" id="x">Huỷ</button>' : ''}</form>` : '<p class="muted">Hãy tạo dự án trước.</p>'}</div>
  <div class="card" style="margin-top:14px">${[...us].reverse().map(u => `<div class="item"><div><small class="muted">${esc(name(u.projectId))} · ${esc(u.week)}${Media.list(u).length ? ' · 📎' + Media.list(u).length : ''}</small><br><b>${esc(u.title)}</b></div>
  <div><button class="btn ghost sm" data-e="${u.id}">Sửa</button> <button class="btn danger" data-d="${u.id}">Xoá</button></div></div>`).join('') || '<p class="muted">Chưa có cập nhật.</p>'}</div>`;
  if ($('#f')) {
    $('#f').onsubmit = async ev => {
      ev.preventDefault(); const { links, ...f } = Object.fromEntries(new FormData(ev.target));
      try { await Store.put('updates', { ...stripMedia(e), ...f, media: mediaCollect(links) }); } catch (x) { return toast(x.message); }
      editing = null; toast('Đã đăng'); render();
    };
    mediaWire();
  }
  if ($('#x')) $('#x').onclick = () => { editing = null; render(); };
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { editing = b.dataset.e; render(); window.scrollTo(0, 0); });
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Xoá cập nhật này?')) { await Store.del('updates', b.dataset.d); render(); } });
}

async function comments() {
  const cs = (await Store.list('comments')).reverse(), wait = cs.filter(c => !c.approved).length;
  app.innerHTML = `<h1>Bình luận</h1><p class="sub">${wait} chờ duyệt · ${cs.length - wait} đang hiển thị. Bình luận chỉ hiện trên web sau khi bạn bấm Duyệt.</p>
  <div class="card">${cs.map(c => `<div class="item" style="align-items:flex-start"><div style="min-width:0"><b>${esc(c.name)}</b> ${c.role ? `<span class="tag">${esc(c.role)}</span>` : ''}
  <span class="tag ${c.approved ? 'done' : 'run'}">${c.approved ? 'Đã duyệt' : 'Chờ duyệt'}</span> <small class="muted">⭐${+c.rating || 0} · ${fmt(c.ts)}</small><br>
  <span style="white-space:pre-wrap;word-break:break-word">${esc(c.text)}</span></div>
  <div style="display:flex;gap:6px;flex-shrink:0"><button class="btn ghost sm" data-a="${c.id}">${c.approved ? 'Bỏ duyệt' : 'Duyệt'}</button> <button class="btn danger" data-d="${c.id}">Xoá</button></div></div>`).join('') || '<p class="muted">Chưa có bình luận nào.</p>'}</div>`;
  document.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => { const c = cs.find(x => x.id === b.dataset.a); await Store.put('comments', { ...c, approved: !c.approved }); render(); });
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Xoá bình luận này?')) { await Store.del('comments', b.dataset.d); render(); } });
}

async function messages() {
  const ms = await Store.list('messages'), by = {};
  ms.forEach(m => (by[m.uid] = by[m.uid] || []).push(m));
  const ids = Object.keys(by).sort((a, b) => by[b].at(-1).ts - by[a].at(-1).ts);
  const t = thread && by[thread] ? thread : null;
  app.innerHTML = `<h1>Tin nhắn</h1><p class="sub">Trao đổi giữa người dùng và chủ dự án.</p>
  ${t ? `<a href="#" id="back" class="muted">&larr; Tất cả hội thoại</a><div class="card" style="margin-top:10px"><h2>${esc(by[t][0].userName)}</h2><div class="chat" id="log">${by[t].map(m => `<div class="msg ${m.from === 'admin' ? 'me' : ''}"><small>${m.from === 'admin' ? 'Admin' : esc(m.userName)}${m.projectName ? ' · ' + esc(m.projectName) : ''} · ${fmt(m.ts)}</small><span>${esc(m.text)}</span></div>`).join('')}</div>
  <form id="f"><textarea name="t" required placeholder="Trả lời…"></textarea><button class="btn">Gửi trả lời</button></form></div>`
  : `<div class="card">${ids.map(id => { const l = by[id].at(-1); return `<div class="item"><div><b>${esc(l.userName)}</b> <small class="muted">${fmt(l.ts)}</small><br><span class="muted">${l.from === 'admin' ? 'Bạn: ' : ''}${esc(l.text.slice(0, 80))}</span></div><button class="btn sm" data-t="${id}">Mở</button></div>`; }).join('') || '<p class="muted">Chưa có tin nhắn nào.</p>'}</div>`}`;
  if (t) {
    $('#back').onclick = e => { e.preventDefault(); thread = null; render(); };
    const log = $('#log'); log.scrollTop = log.scrollHeight;
    $('#f').onsubmit = async e => { e.preventDefault(); await Store.put('messages', { uid: t, userName: by[t][0].userName, from: 'admin', text: new FormData(e.target).get('t').trim() }); render(); };
  }
  document.querySelectorAll('[data-t]').forEach(b => { if (b.classList.contains('btn')) b.onclick = () => { thread = b.dataset.t; render(); }; });
}

async function users() {
  const us = await Store.list('users');
  app.innerHTML = `<h1>Người dùng</h1><p class="sub">${us.length} tài khoản đã đăng ký.</p>${Store.uid() ? `<div class="banner">UID tài khoản admin của bạn: <code style="user-select:all">${esc(Store.uid())}</code><br>Giá trị này phải trùng với UID trong <b>firestore.rules</b> (hàm <code>isAdmin</code>).</div>` : ''}<div class="card">${us.map(u => `<div class="item"><div><b>${esc(u.name)}</b> <span class="tag">${esc(u.gender)}</span><br><small class="muted">${esc(u.email)} · ${fmt(u.ts)}</small></div><button class="btn danger" data-d="${u.id}">Xoá</button></div>`).join('') || '<p class="muted">Chưa có người dùng.</p>'}</div>`;
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Xoá người dùng này?')) { await Store.del('users', b.dataset.d); render(); } });
}
render();
