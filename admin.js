const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = t => new Date(t).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2000); };
let tab = 'projects', editing = null, thread = null;

function login() {
  $('#nav').innerHTML = ''; admToggle(true); $('#admMenu').innerHTML = ''; $('#admBtn').hidden = true;
  const fb = Store.mode === 'firebase', noMail = fb && !(window.APP_CONFIG || {}).adminEmail, inf = Store.info();
  const status = fb
    ? `<p class="muted" style="font-size:.8rem;margin:8px 0 0">Kết nối: Firebase ✓ · Dự án: ${esc(inf.project)} · Email admin: ${esc(inf.email || '(chưa điền)')}</p>`
    : Store.fbFailed
      ? `<div class="banner" style="margin:10px 0;color:#991b1b;background:#fef2f2;border-color:#fecaca"><b>Không kết nối được Firebase</b> nên web đang ở <b>chế độ thử</b> (mật khẩu thử là 123, không phải mật khẩu Firebase của bạn). Lý do: ${esc(Store.fbFailReason)}<br>Hãy kiểm tra mạng, tắt trình chặn quảng cáo cho trang này rồi nhấn Ctrl+Shift+R.</div>`
      : '<p class="muted" style="font-size:.8rem;margin:8px 0 0">Chế độ thử (chưa cấu hình Firebase): tài khoản admin / mật khẩu 123.</p>';
  app.innerHTML = `<div class="card narrow"><h2>Đăng nhập quản trị</h2>${status}
  ${noMail ? '<div class="banner" style="margin:10px 0">Chưa điền <b>adminEmail</b> trong <b>config.js</b> nên chưa đăng nhập được (xem README, bước 4).</div>' : ''}
  <form id="f"><label>Tên tài khoản</label><input name="u" required autofocus autocomplete="username" placeholder="admin">
  <label>Mật khẩu</label><input type="password" name="p" required autocomplete="current-password"><button class="btn">Đăng nhập</button></form>
  ${fb && !noMail ? '<p style="margin-top:12px"><a href="#" id="forgot" class="plink">Quên mật khẩu admin?</a></p>' : ''}<div class="err" id="err"></div></div>`;
  $('#f').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target); $('#err').textContent = '';
    try {
      if (await Store.adminLogin(f.get('u'), f.get('p'))) render(); else $('#err').textContent = 'Sai tên tài khoản hoặc mật khẩu.';
    } catch (x) { $('#err').textContent = x.message || x.code; }
  };
  const fg = $('#forgot');
  if (fg) fg.onclick = async e => {
    e.preventDefault();
    try { toast('Đã gửi email đặt lại mật khẩu tới ' + await Store.adminReset()); } catch (x) { $('#err').textContent = x.message || x.code; }
  };
}

/* ===== Thanh tab (kèm số bình luận chờ duyệt / tin nhắn chờ trả lời) + theo dõi thời gian thực ===== */
const live = [];                       // theo dõi của tab đang mở, huỷ khi đổi tab
const stopLive = () => live.splice(0).forEach(f => f());
let pendCmt = 0, waitMsg = 0, pendBot = 0; const badgeOff = [];
function startBadges() {
  badgeOff.push(Store.listen('comments', null, cs => { pendCmt = cs.filter(c => !c.approved).length; if ($('#nav').children.length) nav(); }));
  badgeOff.push(Store.listen('messages', null, ms => { const last = {}; ms.forEach(m => last[m.uid] = m); waitMsg = Object.values(last).filter(m => m.from === 'user').length; if ($('#nav').children.length) nav(); }));
  badgeOff.push(Store.listen('botlogs', null, ls => { pendBot = ls.length; if ($('#nav').children.length) nav(); }));
}
const stopBadges = () => { badgeOff.splice(0).forEach(f => f()); pendCmt = waitMsg = pendBot = 0; };

/* --- Menu ☰ bên trái (giống trang chính): dừng ở mép trên footer --- */
const admMenu = $('#admMenu'), admBtn = $('#admBtn');
function admFit() {
  const f = document.querySelector('.foot');
  admMenu.style.bottom = f ? Math.max(0, innerHeight - f.getBoundingClientRect().top) + 'px' : '0px';
}
function admToggle(force) {   // true = đóng, false = mở, bỏ trống = đảo trạng thái
  const open = typeof force === 'boolean' ? !force : !admMenu.classList.contains('open');
  admMenu.classList.toggle('open', open);
  admBtn.textContent = open ? '✕' : '☰';
  admBtn.setAttribute('aria-expanded', String(open));
  if (open) admFit();
}
admBtn.onclick = () => admToggle();
addEventListener('scroll', admFit, { passive: true }); addEventListener('resize', admFit);
addEventListener('keydown', e => { if (e.key === 'Escape') admToggle(true); });
document.addEventListener('click', e => { if (admMenu.classList.contains('open') && !e.target.closest('#admMenu, #admBtn')) admToggle(true); });

function nav() {
  const old = Date.now() - (+localStorage.getItem('pt_last_backup') || 0) > 7 * 864e5;
  const t = [['projects', 'Dự án', '📁'], ['updates', 'Cập nhật tuần', '🗓️'], ['content', 'Nội dung', '📝'], ['site', 'Video & Liên hệ', '🎬'], ['comments', 'Bình luận', '💬', pendCmt], ['messages', 'Tin nhắn', '✉️', waitMsg], ['bot', 'Dạy Bot', '🤖', pendBot], ['users', 'Người dùng', '👤'], ['backup', old ? 'Sao lưu ⚠' : 'Sao lưu', '💾']];
  admBtn.hidden = false;   // các tab chuyển vào menu ☰, trên thanh chỉ còn nút Thoát
  admMenu.innerHTML = t.map(([k, v, ic, n]) => `<a href="#" data-t="${k}" class="${tab === k ? 'on' : ''}"><span>${ic}</span><span>${v}</span>${n ? `<span class="nbadge">${n}</span>` : ''}</a>`).join('');
  $('#nav').innerHTML = '<button id="out">Thoát</button>';
  admMenu.querySelectorAll('[data-t]').forEach(x => x.onclick = e => { e.preventDefault(); tab = x.dataset.t; editing = null; thread = null; admToggle(true); render(); });
  $('#out').onclick = async () => { admToggle(true); stopLive(); stopBadges(); await Store.adminLogout(); login(); };
}


function isoWeek() {
  const d = new Date(), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `Tuần ${Math.ceil(((t - y) / 864e5 + 1) / 7)}/${t.getUTCFullYear()}`;
}

async function render() {
  stopLive();
  app.innerHTML = '<div class="loading">Đang tải…</div>';
  if (!await Store.isAdmin()) { stopBadges(); return login(); }
  nav(); if (!badgeOff.length) startBadges();
  try { await ({ projects, updates, content, site, comments, messages, bot: botTab, users, backup })[tab](); } catch (e) { app.innerHTML = '<p class="err">Lỗi: ' + esc(e.message) + '</p>'; }
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

// Ảnh nền thẻ dự án: thu nhỏ còn tối đa 960px, JPEG, ~150KB cho trang chính tải nhanh
async function bgShrink(file) {
  if (!/^image\//.test(file.type)) throw new Error('"' + file.name + '" không phải ảnh');
  if (file.type === 'image/gif') {   // GIF: giữ nguyên để còn chuyển động (nén lại sẽ mất động), giới hạn ~650KB vì mỗi bản ghi Firestore tối đa 1MB
    if (file.size > 650000) throw new Error('GIF nặng ' + Math.round(file.size / 1024) + 'KB, tối đa ~650KB. Hãy nén GIF (ezgif.com) hoặc chọn ảnh tĩnh.');
    return await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(new Error('Không đọc được GIF')); r.readAsDataURL(file); });
  }
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Không đọc được ảnh')); i.src = URL.createObjectURL(file); });
  let max = 960, q = .75, out;
  for (let k = 0; k < 6; k++) {
    const sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    out = c.toDataURL('image/jpeg', q); if (out.length <= 150000) break; max *= .8; q = Math.max(.5, q - .07);
  }
  URL.revokeObjectURL(img.src);
  if (out.length > 300000) throw new Error('Ảnh quá lớn để lưu, hãy chọn ảnh khác');
  return out;
}

async function projects() {
  const ps = await Store.list('projects'), e = ps.find(p => p.id === editing) || {};
  let bg = /^data:image\/(jpeg|png|webp|gif);base64,/.test(e.bgImg || '') ? e.bgImg : '';
  const pct = v => Math.min(100, Math.max(0, Math.round(+v || 0))), P = pct(e.progress);
  const team = ps.filter(p => !p.ownerUid), comm = ps.filter(p => p.ownerUid);
  const mains = team.filter(p => p.kind !== 'sub'), subs = team.filter(p => p.kind === 'sub');
  const nameOf = id => (ps.find(p => p.id === id) || {}).name || '';
  const row = (p, own) => `<div class="item"><div><b>${esc(p.name)}</b> <span class="tag">${esc(p.status)}</span> <small class="muted">${pct(p.progress)}%${p.bgImg ? ' · có ảnh nền' : ''}${p.kind === 'sub' && p.parentId && nameOf(p.parentId) ? ' · thuộc: ' + esc(nameOf(p.parentId)) : ''}${own ? ' · bởi ' + esc(p.ownerName || p.owner || '?') : ''}</small></div>
    <div>${own ? `<a class="btn ghost sm" href="index.html#/p/${p.id}" target="_blank" rel="noopener">Xem</a> ` : `<button class="btn ghost sm" data-e="${p.id}">Sửa</button> <button class="btn ghost sm" data-k="${p.id}">${p.kind === 'sub' ? '→ Chính' : '→ Phụ'}</button> `}<button class="btn danger" data-d="${p.id}">Xoá</button></div></div>`;
  const grp = (t, list, own) => `<h3 style="margin:14px 0 6px">${t} (${list.length})</h3>` + (list.map(p => row(p, own)).join('') || '<p class="muted">Chưa có.</p>');
  app.innerHTML = `<h1>Dự án</h1><p class="sub">Chia thành <b>dự án chính</b> và <b>dự án phụ</b>; thêm, sửa, đổi loại hoặc xoá dự án hiển thị trên trang chính.</p>
  <div class="card"><h2>${e.id ? 'Sửa dự án' : 'Thêm dự án'}</h2><form id="f"><label>Tên</label><input name="name" required value="${esc(e.name)}">
  <label>Mô tả</label><textarea name="desc">${esc(e.desc)}</textarea>
  <div class="two"><div><label>Loại dự án</label><select name="kind"><option value="main" ${e.kind !== 'sub' ? 'selected' : ''}>Dự án chính</option><option value="sub" ${e.kind === 'sub' ? 'selected' : ''}>Dự án phụ</option></select></div>
  <div><label>Thuộc dự án chính (chỉ áp dụng cho dự án phụ)</label><select name="parentId"><option value="">— Không —</option>${mains.filter(m => m.id !== e.id).map(m => `<option value="${m.id}" ${e.parentId === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div></div>
  <div class="two"><div><label>Trạng thái</label><select name="status">${['Kế hoạch', 'Đang làm', 'Tạm dừng', 'Hoàn thành'].map(s => `<option ${e.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
  <div><label>Tiến độ (%)</label><div class="prog"><input type="range" id="pr" min="0" max="100" step="1" value="${P}" aria-label="Kéo để chỉnh tiến độ"><input type="text" id="pn" name="progress" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" value="${P}" aria-label="Tiến độ (%)"></div></div></div>
  <label>Chủ dự án</label><input name="owner" value="${esc(e.owner || 'Admin')}">
  <label>Ảnh bìa dự án (hiện giữa đầu thẻ; ảnh tĩnh tự thu nhỏ, hỗ trợ GIF động ≤ 650KB)</label><input type="file" id="pbg" accept="image/*"><div class="pthumbs" id="pbgPrev"></div>
  <button class="btn">${e.id ? 'Lưu thay đổi' : 'Thêm dự án'}</button>${e.id ? ' <button type="button" class="btn ghost" id="x">Huỷ</button>' : ''}</form></div>
  <div class="card" style="margin-top:14px">${grp('Dự án chính', mains)}${grp('Dự án phụ', subs)}</div>
  ${comm.length ? `<div class="card" style="margin-top:14px">${grp('Dự án do người dùng đăng', comm, true)}<small class="muted">Người dùng tự quản lý dự án của họ ở trang cá nhân. Admin chỉ xem và xoá khi cần kiểm duyệt.</small></div>` : ''}`;
  // Ô tiến độ: ô chữ (không dùng type=number nên lăn chuột / phím mũi tên không làm đổi số) + thanh kéo, luôn giữ trong 0–100
  const drawBg = () => { $('#pbgPrev').innerHTML = bg ? `<div class="pth" style="width:120px"><img src="${esc(bg)}" alt="Ảnh nền"><button type="button" id="pbgRm" aria-label="Bỏ ảnh nền">×</button></div>` : ''; if ($('#pbgRm')) $('#pbgRm').onclick = () => { bg = ''; drawBg(); }; };
  drawBg();
  $('#pbg').onchange = async ev => { const f = ev.target.files[0]; ev.target.value = ''; if (!f) return; try { bg = await bgShrink(f); drawBg(); } catch (x) { toast(x.message); } };
  const pr = $('#pr'), pn = $('#pn');
  pr.oninput = () => { pn.value = pr.value; };
  pn.oninput = () => { pn.value = pn.value.replace(/\D/g, '').slice(0, 3); if (pn.value !== '') { pn.value = pct(pn.value); pr.value = pn.value; } };
  pn.onblur = () => { pn.value = pct(pn.value); pr.value = pn.value; };
  $('#f').onsubmit = async ev => {
    ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target));
    if (String(f.progress).trim() === '') return toast('Hãy nhập tiến độ từ 0 đến 100');
    const progress = pct(f.progress);
    try {
      // Dự án không còn lưu ảnh / video / PDF: stripMedia xoá luôn các trường tệp cũ của bản ghi này
      const o = { ...stripMedia(e), name: f.name.trim(), desc: f.desc, status: f.status, progress, owner: f.owner, kind: f.kind === 'sub' ? 'sub' : 'main' };
      if (o.kind === 'sub' && f.parentId) o.parentId = f.parentId; else delete o.parentId;
      if (bg) o.bgImg = bg; else delete o.bgImg;
      await Store.put('projects', o);
    } catch (x) { return toast(x.message); }
    editing = null; toast('Đã lưu · ' + (f.kind === 'sub' ? 'dự án phụ' : 'dự án chính') + ' · tiến độ ' + progress + '%'); render();
  };
  if ($('#x')) $('#x').onclick = () => { editing = null; render(); };
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { editing = b.dataset.e; render(); window.scrollTo(0, 0); });
  document.querySelectorAll('[data-k]').forEach(b => b.onclick = async () => {   // đổi nhanh giữa dự án chính / phụ
    const p = ps.find(x => x.id === b.dataset.k); if (!p) return;
    const o = { ...p, kind: p.kind === 'sub' ? 'main' : 'sub' }; delete o.parentId;
    try { await Store.put('projects', o); } catch (x) { return toast(x.message); }
    toast(o.kind === 'sub' ? 'Đã chuyển thành dự án phụ' : 'Đã chuyển thành dự án chính'); render();
  });
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Xoá dự án này và các cập nhật của nó?')) { const id = b.dataset.d; for (const u of (await Store.list('updates')).filter(u => u.projectId === id)) await Store.del('updates', u.id); for (const c of ps.filter(x => x.parentId === id)) { const o = { ...c }; delete o.parentId; await Store.put('projects', o); } await Store.del('projects', id); render(); } });
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

/* ===== Nội dung trang: Journey / Team / Review / FAQ ===== */
const COLOR_VN = { sky: 'Xanh da trời', indigo: 'Chàm', cyan: 'Xanh ngọc', rose: 'Hồng', emerald: 'Xanh lá' };
const SECTIONS = {
  journey: { name: 'Journey (từng tuần)', opt: [], label: x => `${x.week} · ${x.title}`,
    fields: [['week', 'Nhãn tuần', 'text', 'Tuần 1'], ['title', 'Tiêu đề', 'text'], ['items', 'Các ý (mỗi dòng một ý, có thể **in đậm**)', 'lines'], ['color', 'Màu', 'color']] },
  team: { name: 'Team (thành viên)', opt: ['modalRole', 'detail', 'photo'], label: x => `${x.name} · ${x.role}`,
    fields: [['name', 'Họ tên', 'text'], ['role', 'Vai trò (dưới tên)', 'text'], ['short', 'Mô tả ngắn (1–2 dòng)', 'text'], ['modalRole', 'Vai trò đầy đủ (trong cửa sổ Chi tiết)', 'text'], ['detail', 'Mô tả chi tiết', 'area'], ['photo', 'Ảnh đại diện', 'photo'], ['color', 'Màu viền', 'color']] },
  reviews: { name: 'Review chuyên gia', opt: [], label: x => `${x.name} · ${'★'.repeat(+x.stars || 5)}`,
    fields: [['text', 'Nội dung nhận xét', 'area'], ['name', 'Tên', 'text'], ['title', 'Chức danh', 'text'], ['stars', 'Số sao', 'stars']] },
  faq: { name: 'FAQ (câu hỏi thường gặp)', opt: [], label: x => x.q,
    fields: [['q', 'Câu hỏi', 'text'], ['a', 'Trả lời (có thể **in đậm**)', 'area']] }
};
let csec = 'journey', photoData = '';
function fieldHtml(S, f, v) {
  const [k, l, t, ph] = f, req = S.opt.includes(k) ? '' : 'required';
  if (t === 'area') return `<label>${l}</label><textarea name="${k}" rows="3" ${req}>${esc(v)}</textarea>`;
  if (t === 'lines') return `<label>${l}</label><textarea name="${k}" rows="5" ${req}>${esc((v || []).join('\n'))}</textarea>`;
  if (t === 'color') return `<label>${l}</label><select name="${k}">${Content.colors.map(c => `<option value="${c}" ${(v || 'sky') === c ? 'selected' : ''}>${COLOR_VN[c]}</option>`).join('')}</select>`;
  if (t === 'stars') return `<label>${l}</label><select name="${k}">${[5, 4, 3, 2, 1].map(n => `<option ${(+v || 5) === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  if (t === 'photo') return `<label>${l}</label><input type="file" id="photoFile" accept="image/*"><div class="pthumbs" id="photoPrev"></div>
    <input name="photo" placeholder="hoặc dán link ảnh https://..." value="${esc(v && !String(v).startsWith('data:') ? v : '')}">`;
  return `<label>${l}</label><input name="${k}" value="${esc(v)}" ${ph ? `placeholder="${esc(ph)}"` : ''} ${req}>`;
}
async function content() {
  const S = SECTIONS[csec], list = Content.sort(await Store.list(csec)), e = list.find(x => x.id === editing) || {};
  photoData = e.photo && String(e.photo).startsWith('data:') ? e.photo : '';
  app.innerHTML = `<h1>Nội dung trang</h1><p class="sub">Journey, Team, Review và FAQ trên web hiển thị theo dữ liệu nhập ở đây. Mục nào chưa có dữ liệu thì web dùng nội dung mẫu.</p>
  <div class="row" style="justify-content:flex-start;gap:8px;margin-bottom:14px">${Object.entries(SECTIONS).map(([k, v]) => `<button class="btn ${k === csec ? '' : 'ghost'} sm" data-s="${k}">${v.name}</button>`).join('')}</div>
  ${list.length ? '' : '<div class="banner">Mục này chưa có dữ liệu nên web đang hiện nội dung mẫu. <button class="btn sm" id="seed">Nạp nội dung mẫu để chỉnh sửa</button></div>'}
  <div class="card"><h2>${e.id ? 'Sửa' : 'Thêm'}: ${S.name}</h2><form id="f">${S.fields.map(f => fieldHtml(S, f, e[f[0]])).join('')}
  <button class="btn">${e.id ? 'Lưu thay đổi' : 'Thêm'}</button>${e.id ? ' <button type="button" class="btn ghost" id="x">Huỷ</button>' : ''}</form></div>
  <div class="card" style="margin-top:14px">${list.map((x, i) => `<div class="item"><div style="min-width:0"><b>${esc(S.label(x))}</b></div>
  <div style="display:flex;gap:6px;flex-shrink:0"><button class="btn ghost sm" data-mv="${x.id}|-1" ${i === 0 ? 'disabled' : ''} aria-label="Lên">▲</button><button class="btn ghost sm" data-mv="${x.id}|1" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Xuống">▼</button>
  <button class="btn ghost sm" data-e="${x.id}">Sửa</button><button class="btn danger" data-d="${x.id}">Xoá</button></div></div>`).join('') || '<p class="muted">Chưa có mục nào.</p>'}</div>`;
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { csec = b.dataset.s; editing = null; render(); });
  const prev = () => { const p = $('#photoPrev'); if (p) p.innerHTML = photoData ? `<div class="pth"><img src="${esc(photoData)}" alt=""><button type="button" id="photoRm" aria-label="Bỏ ảnh">×</button></div>` : ''; const r = $('#photoRm'); if (r) r.onclick = () => { photoData = ''; prev(); }; };
  prev();
  if ($('#photoFile')) $('#photoFile').onchange = async ev => { try { photoData = await Media.avatar(ev.target.files[0]); prev(); } catch (x) { toast(x.message); } ev.target.value = ''; };
  if ($('#seed')) $('#seed').onclick = async () => {
    const d = Content.defaults[csec] || [];
    for (let i = 0; i < d.length; i++) await Store.put(csec, { ...d[i], id: `seed-${csec}-${i + 1}`, order: i * 10, ts: Date.now() + i });
    toast('Đã nạp nội dung mẫu, bạn có thể sửa từng mục'); render();
  };
  $('#f').onsubmit = async ev => {
    ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target)), o = {};
    S.fields.forEach(([k, , t]) => {
      if (t === 'lines') o[k] = String(f[k] || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
      else if (t === 'stars') o[k] = +f[k] || 5;
      else if (t === 'photo') o[k] = photoData || String(f[k] || '').trim();
      else o[k] = String(f[k] ?? '').trim();
    });
    if (o.photo && !/^(https?:\/\/|data:image\/)/i.test(o.photo)) return toast('Link ảnh phải bắt đầu bằng https://');
    o.order = e.id ? e.order ?? list.length * 10 : (list.reduce((m, x) => Math.max(m, x.order ?? 0), -10) + 10);
    try { await Store.put(csec, { ...e, ...o }); } catch (x) { return toast(x.message); }
    editing = null; toast('Đã lưu'); render();
  };
  if ($('#x')) $('#x').onclick = () => { editing = null; render(); };
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { editing = b.dataset.e; render(); window.scrollTo(0, 0); });
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Xoá mục này?')) { await Store.del(csec, b.dataset.d); render(); } });
  document.querySelectorAll('[data-mv]').forEach(b => b.onclick = async () => {
    const [id, dir] = b.dataset.mv.split('|'), i = list.findIndex(x => x.id === id), j = i + +dir; if (j < 0 || j >= list.length) return;
    const order = list.map(x => x.id); [order[i], order[j]] = [order[j], order[i]];
    for (let k = 0; k < order.length; k++) { const x = list.find(y => y.id === order[k]); if (x.order !== k * 10) await Store.put(csec, { ...x, order: k * 10 }); }
    render();
  });
}

/* ===== Video demo & Liên hệ (popup): mỗi mục là một tài liệu trong bộ sưu tập "site" ===== */
const SITE = {
  video: { name: 'Video demo', view: 'index.html#/video', opt: ['tag', 'videoUrl', 'cover', 'playTitle', 'playSub', 'scenes'],
    fields: [['tag', 'Dòng nhỏ phía trên tiêu đề', 'text'], ['title', 'Tiêu đề', 'text'],
      ['videoUrl', 'Link video (YouTube, Vimeo, Google Drive hoặc .mp4). Để trống thì chỉ hiện ảnh bìa', 'text', 'https://www.youtube.com/watch?v=...'],
      ['cover', 'Ảnh bìa (hiện trước khi phát, hoặc khi chưa có link video; hỗ trợ GIF động ≤ 650KB)', 'cover'],
      ['playTitle', 'Dòng chữ lớn trên ảnh bìa', 'text'], ['playSub', 'Dòng chữ nhỏ trên ảnh bìa', 'text'],
      ['scenesTitle', 'Tiêu đề khung kịch bản', 'text'],
      ['scenes', 'Các phân cảnh: mỗi dòng một cảnh, dạng  Nhãn | Nội dung  (có thể **in đậm**, *in nghiêng*). Xoá hết để ẩn khung này', 'lines']] },
  contact: { name: 'Liên hệ (popup)', view: 'index.html', opt: ['intro', 'note'],
    fields: [['title', 'Tiêu đề popup', 'text'], ['intro', 'Lời giới thiệu ngắn', 'area'],
      ['rows', 'Các dòng liên hệ: mỗi dòng dạng  Nhãn | Giá trị  (vd: Email | nhom@gmail.com, Điện thoại | 0901234567, Facebook | https://facebook.com/...). Email, số điện thoại và link tự thành liên kết bấm được', 'lines'],
      ['note', 'Ghi chú cuối popup (vd: giờ phản hồi)', 'area']] }
};
let ssec = 'video', coverData = '';
async function site() {
  const S = SITE[ssec], doc = await Store.get('site', ssec).catch(() => null), v = { ...Content.defaults[ssec], ...(doc || {}) };
  coverData = v.cover && String(v.cover).startsWith('data:') ? v.cover : '';
  const field = f => {
    const [k, l, t, ph] = f;
    if (t !== 'cover') return fieldHtml(S, f, v[k]);
    return `<label>${l}</label><input type="file" id="coverFile" accept="image/*"><div class="pthumbs" id="coverPrev"></div>
      <input name="cover" placeholder="hoặc dán link ảnh https://..." value="${esc(v.cover && !String(v.cover).startsWith('data:') ? v.cover : '')}">`;
  };
  app.innerHTML = `<h1>Video & Liên hệ</h1><p class="sub">Sửa mục Video demo và popup Liên hệ hiển thị trên web.</p>
  <div class="row" style="justify-content:flex-start;gap:8px;margin-bottom:14px">${Object.entries(SITE).map(([k, x]) => `<button class="btn ${k === ssec ? '' : 'ghost'} sm" data-s="${k}">${x.name}</button>`).join('')}</div>
  ${doc ? '' : '<div class="banner">Mục này chưa có dữ liệu nên web đang hiện nội dung mẫu. Form bên dưới đã điền sẵn nội dung mẫu, sửa rồi bấm Lưu để web dùng nội dung của bạn.</div>'}
  <div class="card"><h2>${S.name}</h2><form id="f">${S.fields.map(field).join('')}
  <button class="btn">Lưu</button> <a class="btn ghost" href="${S.view}" target="_blank" rel="noopener">Xem trên web</a>${doc ? ' <button type="button" class="btn danger" id="reset">Xoá, dùng lại nội dung mẫu</button>' : ''}</form></div>`;
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { ssec = b.dataset.s; render(); });
  const prev = () => { const p = $('#coverPrev'); if (p) p.innerHTML = coverData ? `<div class="pth"><img src="${esc(coverData)}" alt=""><button type="button" id="coverRm" aria-label="Bỏ ảnh">×</button></div>` : ''; const r = $('#coverRm'); if (r) r.onclick = () => { coverData = ''; prev(); }; };
  prev();
  if ($('#coverFile')) $('#coverFile').onchange = async ev => { try { coverData = await bgShrink(ev.target.files[0]); prev(); } catch (x) { toast(x.message); } ev.target.value = ''; };
  if ($('#reset')) $('#reset').onclick = async () => { if (confirm('Xoá nội dung đã nhập và dùng lại nội dung mẫu?')) { try { await Store.del('site', ssec); } catch (x) { return toast(x.message); } toast('Đã quay về nội dung mẫu'); render(); } };
  $('#f').onsubmit = async ev => {
    ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target)), o = {};
    S.fields.forEach(([k, , t]) => {
      if (t === 'lines') o[k] = String(f[k] || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
      else if (t === 'cover') o[k] = coverData || String(f[k] || '').trim();
      else o[k] = String(f[k] ?? '').trim();
    });
    if (o.videoUrl && !/^https?:\/\/\S+$/i.test(o.videoUrl)) return toast('Link video phải bắt đầu bằng https://');
    if (o.cover && !/^(https?:\/\/\S+|data:image\/)/i.test(o.cover)) return toast('Link ảnh bìa phải bắt đầu bằng https://');
    if (ssec === 'contact' && !o.rows.length) return toast('Hãy nhập ít nhất một dòng liên hệ');
    try { await Store.put('site', { ...(doc || {}), ...o, id: ssec }); } catch (x) { return toast(x.message); }
    toast('Đã lưu'); render();
  };
}

/* ===== Bình luận: lọc, duyệt từng cái hoặc tất cả, cập nhật ngay ===== */
let cfilter = 'pending';
async function comments() {
  app.innerHTML = '<h1>Bình luận</h1><p class="sub" id="csub"></p><div class="row" style="justify-content:flex-start;gap:8px;margin-bottom:14px" id="cf"></div><div class="card" id="clist"><div class="loading">Đang tải…</div></div>';
  let all = [];
  const draw = () => {
    if (!$('#clist')) return;
    const wait = all.filter(c => !c.approved).length, ok = all.length - wait;
    $('#csub').textContent = `${wait} chờ duyệt · ${ok} đang hiển thị. Bình luận chỉ hiện trên web sau khi bạn duyệt.`;
    $('#cf').innerHTML = [['pending', `Chờ duyệt (${wait})`], ['approved', `Đã duyệt (${ok})`], ['all', `Tất cả (${all.length})`]].map(([k, v]) => `<button class="btn ${cfilter === k ? '' : 'ghost'} sm" data-f="${k}">${v}</button>`).join('') + (wait ? `<button class="btn sm" id="apall">Duyệt tất cả (${wait})</button>` : '');
    const list = [...all].reverse().filter(c => cfilter === 'all' || (cfilter === 'approved') === !!c.approved);
    $('#clist').innerHTML = list.map(c => `<div class="item" style="align-items:flex-start"><div style="min-width:0"><b>${esc(c.name)}</b> ${c.role ? `<span class="tag">${esc(c.role)}</span>` : ''}
      <span class="tag ${c.approved ? 'done' : 'run'}">${c.approved ? 'Đã duyệt' : 'Chờ duyệt'}</span> <small class="muted">⭐${+c.rating || 0} · ${fmt(c.ts)}</small><br>
      <span style="white-space:pre-wrap;word-break:break-word">${esc(c.text)}</span></div>
      <div style="display:flex;gap:6px;flex-shrink:0"><button class="btn ghost sm" data-a="${c.id}">${c.approved ? 'Bỏ duyệt' : 'Duyệt'}</button><button class="btn danger" data-d="${c.id}">Xoá</button></div></div>`).join('') || '<p class="muted">Không có bình luận nào ở mục này.</p>';
    document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { cfilter = b.dataset.f; draw(); });
    const ap = $('#apall'); if (ap) ap.onclick = async () => { for (const c of all.filter(x => !x.approved)) await Store.put('comments', { ...c, approved: true }); toast('Đã duyệt tất cả'); };
    document.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => { const c = all.find(x => x.id === b.dataset.a); try { await Store.put('comments', { ...c, approved: !c.approved }); } catch (x) { toast(x.message); } });
    document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Xoá bình luận này?')) { try { await Store.del('comments', b.dataset.d); } catch (x) { toast(x.message); } } });
  };
  live.push(Store.listen('comments', null, cs => { all = cs; draw(); }, er => { const b = $('#clist'); if (b) b.innerHTML = '<p class="err">' + esc(er.message) + '</p>'; }));
}

/* ===== Tin nhắn: thời gian thực, đánh dấu cuộc trò chuyện chờ trả lời ===== */
async function messages() {
  app.innerHTML = '<h1>Tin nhắn</h1><p class="sub">Tin mới hiện ngay, không cần tải lại. Cuộc trò chuyện đang chờ bạn trả lời được đánh dấu.</p><div id="mbox"><div class="loading">Đang tải…</div></div>';
  let last = [], built = null; const U = {};
  Msgx.ctx = { uid: () => (Store.uid && Store.uid()) || 'admin', th: id => (last.find(m => m.id === id) || {}).uid, find: id => last.find(m => m.id === id), redraw: () => draw() };
  try { (await Store.list('users')).forEach(u => { U[u.id] = u; }); } catch (e) {}   // để hiện avatar người dùng
  const bubbles = ms => Chat.render(ms.map(m => { const ad = m.from === 'admin'; return { id: m.id, who: ad ? 'me' : 'them', mine: ad, ts: m.ts, text: m.text, media: m.media, recalled: m.recalled, lk: m.lk, list: Msgx.get(m.id), uid: Msgx.ctx.uid(), av: Avatar.html(U[m.uid] || { name: m.userName }, 'sm') }; }));
  const draw = () => {
    const box = $('#mbox'); if (!box) return;
    const by = {}; last.forEach(m => (by[m.uid] = by[m.uid] || []).push(m));
    if (thread && by[thread]) {
      if (built !== thread) {
        built = thread;
        box.innerHTML = '<a href="#" id="back" class="plink">&larr; Tất cả hội thoại</a><div class="card" style="margin-top:10px"><h2 id="tname"></h2><div class="chat ms-log" id="log"></div><form id="f"><textarea name="t" placeholder="Trả lời… (kéo thả, Ctrl+V hoặc bấm 📎 để gửi ảnh / video)"></textarea><button class="btn">Gửi trả lời</button></form></div>';
        $('#back').onclick = e => { e.preventDefault(); thread = null; built = null; draw(); };
        const at = Attach.composer({ form: $('#f'), text: $('#f').elements.t, zone: $('#f').closest('.card'), label: 'Đính kèm' });
        $('#f').onsubmit = async e => {
          e.preventDefault(); const t = e.target.elements.t.value.trim() || (!at.has() && e.submitter && e.submitter.classList.contains('ms-like') ? '👍' : ''); if (!t && !at.has()) return;
          const th = thread, u = last.find(m => m.uid === th), btn = e.target.querySelector('button.ms-send'), lk = +e.target._lk || 0; e.target._lk = 0; btn.disabled = true;
          try {
            const media = at.has() ? await at.build({ uid: th, by: 'admin', progress: (i, n) => { btn.innerHTML = '<small class="ms-prog">' + i + '/' + n + '</small>'; } }) : [];
            await Store.put('messages', { uid: th, userName: u ? u.userName : '', from: 'admin', text: t || Attach.txt(media), ...(media.length ? { media } : {}), ...(lk > 1 && t === '👍' && !media.length ? { lk } : {}), projectId: '', projectName: '' });
            e.target.elements.t.value = ''; at.clear();
          } catch (x) { toast(x.message); }
          btn.disabled = false; at.sync();
        };
      }
      $('#tname').textContent = by[thread][0].userName;
      const log = $('#log'), stick = !log.children.length || log.scrollHeight - log.scrollTop - log.clientHeight < 80;
      log.innerHTML = bubbles(by[thread]); if (stick) log.scrollTop = log.scrollHeight; Chat.paint(log);
    } else {
      built = null; thread = null;
      const ids = Object.keys(by).sort((a, b) => by[b].at(-1).ts - by[a].at(-1).ts);
      box.innerHTML = `<div class="card">${ids.map(id => { const l = by[id].at(-1); return `<div class="item"><div style="min-width:0;display:flex;gap:10px;align-items:center">${Avatar.html(U[id] || { name: l.userName })}<div style="min-width:0"><b>${esc(l.userName)}</b> ${l.from === 'user' ? '<span class="tag run">Chờ trả lời</span>' : ''} <small class="muted">${fmt(l.ts)}</small><br><span class="muted">${l.from === 'admin' ? 'Bạn: ' : ''}${esc(l.text.slice(0, 80))}</span></div></div><button class="btn sm" data-th="${id}">Mở</button></div>`; }).join('') || '<p class="muted">Chưa có tin nhắn nào.</p>'}</div>`;
      box.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { thread = b.dataset.th; draw(); });
    }
  };
  live.push(Store.listen('reacts', null, rs => { Msgx.setReacts(rs); draw(); }, () => {}));
  live.push(Store.listen('messages', null, ms => { last = ms; draw(); }, er => { const b = $('#mbox'); if (b) b.innerHTML = '<p class="err">' + esc(er.message) + '</p>'; }));
}


async function users() {
  const us = await Store.list('users');
  app.innerHTML = `<h1>Người dùng</h1><p class="sub">${us.length} tài khoản đã đăng ký. <button class="btn ghost sm" id="mkpf">Tạo trang công khai cho mọi tài khoản</button></p><div class="card">${us.map(u => `<div class="item"><div style="display:flex;gap:10px;align-items:center">${Avatar.html(u)}<div><b>${esc(u.name)}</b> <span class="tag">${esc(u.gender)}</span><br><small class="muted">${esc(u.email)} · ${fmt(u.ts)}</small>${u.phone || u.dob || u.job ? `<br><small>${esc(u.dob || '')} · ${esc(u.phone || '')} · ${esc(u.job || '')}</small>` : ''}${u.privacyAgreed === false ? '<br><small class="err">Chưa đồng ý cam kết quyền riêng tư</small>' : ''}</div></div><button class="btn danger" data-d="${u.id}">Xoá</button></div>`).join('') || '<p class="muted">Chưa có người dùng.</p>'}</div>`;
  $('#mkpf').onclick = async () => {   // để tài khoản cũ cũng hiện trong ô tìm kiếm người dùng
    let n = 0; const have = new Set((await Store.list('profiles').catch(() => [])).map(p => p.id));
    for (const u of us) if (!have.has(u.id)) { try { await Store.put('profiles', { id: u.id, name: u.name, avatar: Avatar.ok(u.avatar) ? u.avatar : '', cover: '', bio: '', pageName: '', accent: 'sky' }); n++; } catch (x) { return toast(x.message); } }
    toast('Đã tạo ' + n + ' trang công khai');
  };
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Xoá người dùng này?')) { await Store.del('users', b.dataset.d); await Store.del('profiles', b.dataset.d).catch(() => {}); render(); } });
}

/* ===== Dạy trợ lý ảo: câu hỏi bot chưa biết (botlogs) + câu trả lời do admin dạy (botkb) ===== */
let botDraft = null;
async function botTab() {
  const kb = [...(await Store.list('botkb').catch(() => []))].reverse();
  const e = editing ? (kb.find(x => x.id === editing) || {}) : (botDraft || {});
  app.innerHTML = `<h1>Dạy trợ lý ảo</h1><p class="sub">Câu khách hỏi mà bot chưa biết sẽ hiện ở mục 2. Bạn gõ câu trả lời, bot dùng được ngay, không cần sửa code.</p>
  <div class="card"><h2>1. Thử hỏi bot</h2><form id="tf" style="display:flex;gap:8px"><input name="t" placeholder="Gõ một câu hỏi để thử…" autocomplete="off" style="flex:1"><button class="btn">Hỏi</button></form><div id="tans" style="white-space:pre-wrap;margin-top:10px"></div></div>
  <div class="card" style="margin-top:14px"><h2>2. Câu hỏi bot chưa trả lời được <span class="tag" id="lc">0</span></h2><div id="llist"><div class="loading">Đang tải…</div></div></div>
  <div class="card" style="margin-top:14px" id="bf"><h2>3. ${e.id ? 'Sửa câu trả lời' : 'Dạy bot câu mới'}</h2><form id="f">
  <label>Câu hỏi / chủ đề</label><input name="q" required maxlength="200" value="${esc(e.q)}" placeholder="VD: Dự án có xin học bổng không?">
  <label>Câu trả lời của bot</label><textarea name="a" rows="5" required maxlength="1200" placeholder="Bot sẽ trả lời đúng nội dung này">${esc(e.a)}</textarea>
  <label>Các cách hỏi khác (tuỳ chọn, mỗi cách một dòng)</label><textarea name="k" rows="3" placeholder="VD: học bổng (mỗi dòng một cách hỏi)">${esc(e.k)}</textarea>
  <button class="btn">${e.id ? 'Lưu thay đổi' : 'Dạy bot'}</button>${e.id || botDraft ? ' <button type="button" class="btn ghost" id="x">Huỷ</button>' : ''}</form></div>
  <div class="card" style="margin-top:14px"><h2>4. Bot đã được dạy (${kb.length})</h2>${kb.map(b => `<div class="item" style="align-items:flex-start"><div style="min-width:0"><b>${esc(b.q)}</b><br><small class="muted" style="white-space:pre-wrap;word-break:break-word">${esc(String(b.a || '').slice(0, 160))}</small></div><div style="display:flex;gap:6px;flex-shrink:0"><button class="btn ghost sm" data-be="${b.id}">Sửa</button><button class="btn danger" data-bd="${b.id}">Xoá</button></div></div>`).join('') || '<p class="muted">Chưa dạy câu nào.</p>'}</div>`;

  $('#tf').onsubmit = async ev => {
    ev.preventDefault(); const t = ev.target.elements.t.value.trim(); if (!t) return;
    if (!window.PT_AI) { $('#tans').textContent = 'Không tải được bot.js (kiểm tra file đã up lên GitHub chưa).'; return; }
    $('#tans').textContent = 'Đang trả lời…';
    try { $('#tans').textContent = await PT_AI.test(t); } catch (x) { $('#tans').textContent = x.message || String(x); }
  };
  $('#f').onsubmit = async ev => {
    ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target)), q = f.q.trim(), a = f.a.trim();
    if (!q || !a) return toast('Hãy nhập cả câu hỏi và câu trả lời');
    try {
      await Store.put('botkb', { ...(editing ? e : {}), q, a, k: f.k.trim() });
      if (botDraft && botDraft.logId) await Store.del('botlogs', botDraft.logId).catch(() => {});   // đã dạy xong thì bỏ khỏi danh sách chưa biết
    } catch (x) { return toast(x.message); }
    botDraft = null; editing = null; if (window.PT_AI) PT_AI.reload(); toast('Đã dạy bot'); render();
  };
  if ($('#x')) $('#x').onclick = () => { botDraft = null; editing = null; render(); };
  document.querySelectorAll('[data-be]').forEach(b => b.onclick = async () => { editing = b.dataset.be; botDraft = null; await render(); const f = $('#bf'); if (f) f.scrollIntoView({ behavior: 'smooth' }); });
  document.querySelectorAll('[data-bd]').forEach(b => b.onclick = async () => { if (confirm('Xoá câu trả lời này? Bot sẽ không còn biết câu đó.')) { try { await Store.del('botkb', b.dataset.bd); } catch (x) { return toast(x.message); } if (window.PT_AI) PT_AI.reload(); render(); } });

  let logs = [];
  const draw = () => {
    const box = $('#llist'); if (!box) return;
    $('#lc').textContent = logs.length;
    box.innerHTML = [...logs].reverse().map(l => `<div class="item" style="align-items:flex-start"><div style="min-width:0"><b style="word-break:break-word">${esc(l.q)}</b><br><small class="muted">${fmt(l.ts)}</small></div><div style="display:flex;gap:6px;flex-shrink:0"><button class="btn sm" data-teach="${l.id}">Dạy</button><button class="btn danger" data-skip="${l.id}">Bỏ qua</button></div></div>`).join('') || '<p class="muted">Chưa có câu nào. Khi khách hỏi điều bot chưa biết, câu đó sẽ hiện ở đây.</p>';
    document.querySelectorAll('[data-teach]').forEach(b => b.onclick = async () => { const l = logs.find(x => x.id === b.dataset.teach); if (!l) return; botDraft = { q: l.q, logId: l.id }; editing = null; await render(); const f = $('#bf'); if (f) f.scrollIntoView({ behavior: 'smooth' }); });
    document.querySelectorAll('[data-skip]').forEach(b => b.onclick = async () => { try { await Store.del('botlogs', b.dataset.skip); } catch (x) { toast(x.message); } });
  };
  live.push(Store.listen('botlogs', null, ls => { logs = ls; draw(); }, er => { const b = $('#llist'); if (b) b.innerHTML = '<p class="err">' + esc(er.message) + '<br>Nếu chưa thêm Rules cho botlogs / botkb thì dán lại firestore.rules mới rồi Publish.</p>'; }));
}

/* ===== Sao lưu / khôi phục JSON ===== */
async function backup() {
  const last = +localStorage.getItem('pt_last_backup') || 0;
  app.innerHTML = `<h1>Sao lưu dữ liệu</h1><p class="sub">Tải toàn bộ dữ liệu (dự án, cập nhật, nội dung trang, bình luận, tin nhắn, người dùng) về máy thành một file JSON. Nên sao lưu mỗi tuần.</p>
  <div class="card"><p>Lần sao lưu gần nhất: <b>${last ? fmt(last) : 'chưa có'}</b></p><button class="btn" id="bk">Tải bản sao lưu (.json)</button></div>
  <div class="card" style="margin-top:14px"><h2>Khôi phục từ file</h2><p class="muted">Ghi lại các bản ghi trong file (trùng ID thì ghi đè). Không xoá dữ liệu đang có.</p>
  <input type="file" id="rs" accept="application/json,.json"><button class="btn ghost" id="rsb">Khôi phục</button></div>`;
  $('#bk').onclick = async () => {
    try {
      const d = await Store.exportAll(), a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' }));
      a.download = 'pipe-traffic-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      localStorage.setItem('pt_last_backup', Date.now()); toast('Đã tạo bản sao lưu'); nav(); backup();
    } catch (x) { toast(x.message); }
  };
  $('#rsb').onclick = async () => {
    const f = $('#rs').files[0]; if (!f) return toast('Hãy chọn file .json trước');
    try {
      const obj = JSON.parse(await f.text()), n = Object.values(obj.data || {}).reduce((s, l) => s + (l || []).length, 0);
      if (!confirm(`Khôi phục ${n} bản ghi từ file này?`)) return;
      toast(`Đã khôi phục ${await Store.importAll(obj)} bản ghi`);
    } catch (x) { toast(x.message || 'File không đọc được'); }
  };
}

render();
