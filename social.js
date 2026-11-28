/* ===== Trang cá nhân kiểu Facebook:  #/u/<id> =====
   - Mỗi người dùng có một trang riêng: ảnh bìa, logo (avatar), tên trang, giới thiệu, màu chủ đạo.
   - Theo dõi, kết bạn (gửi / chấp nhận / từ chối / huỷ), danh sách người theo dõi và bạn bè.
   - Chủ trang tự đăng dự án (chính / phụ) và cập nhật theo tuần, giống admin nhưng KHÔNG có sao lưu, người dùng, bot...
   - Dữ liệu CÔNG KHAI nằm ở bộ sưu tập "profiles" (chỉ tên, avatar, ảnh bìa, giới thiệu). Email, giới tính... vẫn ở "users", không lộ ra.
   - Quan hệ: "follows" (id = từ_đến), "friends" (id = người gửi_người nhận, status pending | accepted).
   File tự chèn CSS. Cần cập nhật Firestore Rules (xem firestore.rules.additions.txt). */
(function () {
  'use strict';

  /* ---------- Tiện ích ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => document.querySelector(s);
  const say = m => { if (typeof window.toast === 'function') window.toast(m); else alert(m); };
  const hideEmail = s => String(s ?? '').replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '•••');
  const okImg = x => typeof x === 'string' && x.length < 900000 && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(x);
  const pct = v => Math.min(100, Math.max(0, Math.round(+v || 0)));
  const cur = () => Store.me();
  const ACC = { sky: '#0284c7', indigo: '#4f46e5', emerald: '#059669', rose: '#e11d48', amber: '#d97706', violet: '#7c3aed' };
  const ACC_VN = { sky: 'Xanh da trời', indigo: 'Chàm', emerald: 'Xanh lá', rose: 'Hồng', amber: 'Cam', violet: 'Tím' };
  const isoWeek = () => {
    const d = new Date(), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), n = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - n); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return `Tuần ${Math.ceil(((t - y) / 864e5 + 1) / 7)}/${t.getUTCFullYear()}`;
  };

  // Thu nhỏ ảnh: cạnh dài tối đa `max` px, JPEG, cố gắng dưới `limit` ký tự (mỗi bản ghi Firestore tối đa 1MB)
  async function shrink(file, max, q, limit) {
    if (!/^image\//.test(file.type)) throw new Error('"' + file.name + '" không phải ảnh');
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Không đọc được ảnh')); i.src = URL.createObjectURL(file); });
    let out;
    for (let k = 0; k < 6; k++) {
      const sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      out = c.toDataURL('image/jpeg', q); if (out.length <= limit) break; max *= .8; q = Math.max(.5, q - .07);
    }
    URL.revokeObjectURL(img.src);
    if (out.length > limit * 1.4) throw new Error('Ảnh quá lớn để lưu, hãy chọn ảnh khác');
    return out;
  }
  const pick = cb => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => { if (i.files[0]) cb(i.files[0]); }; i.click(); };

  // Gom ảnh / PDF đã chọn + link dán vào thành mảng "media" (giống admin)
  function collect(files, links) {
    const ls = String(links || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
    const bad = ls.find(u => !/^https?:\/\/\S+$/i.test(u)); if (bad) throw new Error('Link không hợp lệ: ' + bad);
    const items = files.map(m => ({ t: m.t, src: m.src, ...(m.name ? { name: m.name } : {}) }));
    Media.list({ media: ls.map(u => ({ url: u })) }).forEach(m => items.push({ t: m.t, src: m.src }));
    if (JSON.stringify(items).length > 950000) throw new Error('Tệp đính kèm quá nặng (giới hạn ~950KB mỗi bài). Bớt ảnh / PDF hoặc dùng link.');
    return items;
  }

  /* ---------- Hồ sơ công khai (profiles) ---------- */
  let pc = null;
  const bust = () => { pc = null; };
  async function profiles() {
    if (pc && Date.now() - pc.t < 15000) return pc.v;
    const v = {}; (await Store.list('profiles')).forEach(p => { v[p.id] = p; }); pc = { t: Date.now(), v }; return v;
  }
  async function ensureProfile(m) {   // tạo trang công khai nếu người dùng chưa có
    if (!m) return null;
    try {
      let p = await Store.get('profiles', m.id);
      if (!p) { p = await Store.put('profiles', { id: m.id, name: m.name, avatar: Avatar.ok(m.avatar) ? m.avatar : '', cover: '', bio: '', pageName: '', accent: 'sky' }); bust(); }
      return p;
    } catch (e) { return null; }
  }
  async function sync(patch) {        // app.js gọi khi đổi avatar / tên ở trang Tài khoản
    const m = cur(); if (!m) return;
    try { const p = (await Store.get('profiles', m.id)) || { id: m.id, name: m.name }; await Store.put('profiles', { ...p, ...patch }); bust(); } catch (e) { /* chưa có Rules: bỏ qua */ }
  }
  async function saveProf(p, patch) {
    const np = { ...p, ...patch };
    await Store.put('profiles', np); bust();
    if ('avatar' in patch || 'name' in patch) {   // đồng bộ hồ sơ riêng tư và phiên đăng nhập hiện tại
      try { const u = await Store.profile(p.id); if (u) await Store.put('users', { ...u, ...('avatar' in patch ? { avatar: patch.avatar } : {}), ...('name' in patch ? { name: patch.name } : {}) }); } catch (e) { /* bỏ qua */ }
      const m = cur(); if (m) { if ('avatar' in patch) m.avatar = patch.avatar; if ('name' in patch) m.name = patch.name; Store.setMe(m, true); window.dispatchEvent(new Event('pt-me')); }
    }
    return np;
  }

  /* ---------- Quan hệ ---------- */
  async function relation(m, id) {
    if (!m || m.id === id) return null;
    const g = (c, k) => Store.get(c, k).catch(() => null);
    const [fo, out, inn] = await Promise.all([g('follows', m.id + '_' + id), g('friends', m.id + '_' + id), g('friends', id + '_' + m.id)]);
    let friend = 'none', doc = null;
    if (out) { friend = out.status === 'accepted' ? 'yes' : 'out'; doc = out; }
    else if (inn) { friend = inn.status === 'accepted' ? 'yes' : 'in'; doc = inn; }
    return { following: !!fo, friend, doc };
  }

  /* ---------- Trạng thái trang ---------- */
  let ctx = null, P = null, D = null, token = 0;
  let view = { id: '', tab: 'projects', edit: false };
  let mg = { pid: '', uid: '', bg: '', files: [], links: '' };
  const resetMg = () => { mg = { pid: '', uid: '', bg: '', files: [], links: '' }; };

  async function load(p) {
    const m = cur(), own = !!m && m.id === p.id, L = (c, w) => Store.list(c, { where: w }).catch(() => []);
    const [projs, fers, fing, f1, f2, rel, profs, ups] = await Promise.all([
      L('projects', ['ownerUid', '==', p.id]), L('follows', ['to', '==', p.id]), L('follows', ['from', '==', p.id]),
      L('friends', ['from', '==', p.id]), L('friends', ['to', '==', p.id]), relation(m, p.id), profiles().catch(() => ({})),
      own ? L('updates', ['ownerUid', '==', p.id]) : Promise.resolve([])
    ]);
    return { projs, fers, fing, friends: [...f1, ...f2].filter(x => x.status === 'accepted'), reqIn: f2.filter(x => x.status === 'pending'), rel, profs, ups };
  }

  async function page(id, c) {
    ctx = c; const m = cur(), tk = ++token;
    if (!id) { if (m) location.replace('#/u/' + m.id); else location.hash = '#/login'; return; }
    ctx.wrap('<div class="loading">Đang tải trang…</div>');
    let p = await Store.get('profiles', id).catch(() => null);
    if (!p && m && m.id === id) p = await ensureProfile(m);
    if (tk !== token) return;
    if (!p) { ctx.wrap('<p>Không tìm thấy trang này. <a class="plink" href="#/">Về trang chính</a></p>'); return; }
    if (view.id !== id) { view = { id, tab: 'projects', edit: false }; resetMg(); }
    P = p; D = await load(p);
    if (tk !== token) return;
    paint();
  }
  async function reload() { D = await load(P); paint(); if (window.Search && Search.reset) Search.reset(); }

  /* ---------- Giao diện ---------- */
  function paint() {
    const p = P, d = D, m = cur(), own = !!m && m.id === p.id, acc = ACC[p.accent] || ACC.sky, tab = view.tab;
    const people = ids => ids.map(id => {
      const u = d.profs[id] || { id, name: 'Người dùng' };
      return `<a class="so-row" href="#/u/${esc(id)}">${Avatar.html(u, 'sm')}<span><b>${esc(hideEmail(u.pageName || u.name))}</b><small>${esc(hideEmail(u.bio || ''))}</small></span></a>`;
    }).join('') || '<p class="muted">Chưa có ai.</p>';
    const byId = Object.fromEntries(d.projs.map(x => [x.id, x]));
    const section = (t, list) => `<h3 class="so-h">${t} <small>(${list.length})</small></h3>` + (list.length ? `<div class="pgrid">${list.map(x => ctx.card(x, [], byId)).join('')}</div>` : '<p class="muted">Chưa có.</p>');

    let acts = '';
    if (own) acts = `<button type="button" class="btn" data-so="edit">${view.edit ? 'Đóng chỉnh sửa' : '✏️ Chỉnh sửa trang'}</button><a class="btn ghost" href="#/profile">⚙️ Tài khoản</a>`;
    else if (!m) acts = '<a class="btn" href="#/login">Đăng nhập để theo dõi / kết bạn</a>';
    else {
      const r = d.rel || {};
      acts = `<button type="button" class="btn ${r.following ? 'ghost' : ''}" data-so="follow">${r.following ? '✓ Đang theo dõi' : '＋ Theo dõi'}</button>`
        + (r.friend === 'in' ? `<button type="button" class="btn" data-so="accept" data-id="${esc(r.doc.id)}">Chấp nhận kết bạn</button><button type="button" class="btn ghost" data-so="decline" data-id="${esc(r.doc.id)}">Từ chối</button>`
          : `<button type="button" class="btn ghost" data-so="friend">${r.friend === 'yes' ? '✓ Bạn bè' : r.friend === 'out' ? 'Huỷ lời mời' : '👥 Kết bạn'}</button>`);
    }

    const edit = own && view.edit ? `<div class="card so-edit"><h2>Chỉnh sửa trang của bạn</h2><form id="soForm" autocomplete="off">
      <label>Tên hiển thị</label><input name="name" required maxlength="40" value="${esc(p.name)}">
      <label>Tên trang (chữ lớn đầu trang; để trống thì dùng tên hiển thị)</label><input name="pageName" maxlength="60" value="${esc(p.pageName || '')}" placeholder="VD: Xưởng ống từ của An">
      <label>Giới thiệu</label><textarea name="bio" rows="3" maxlength="300" placeholder="Vài dòng về bạn và các dự án của bạn">${esc(p.bio || '')}</textarea>
      <label>Màu chủ đạo của trang</label><div class="so-acc">${Object.keys(ACC).map(k => `<label class="so-sw" title="${ACC_VN[k]}"><input type="radio" name="accent" value="${k}" ${(p.accent || 'sky') === k ? 'checked' : ''}><i style="background:${ACC[k]}"></i></label>`).join('')}</div>
      <div class="so-btns"><button type="button" class="btn ghost sm" data-so="cover">🖼 Đổi ảnh bìa</button>${okImg(p.cover) ? '<button type="button" class="btn ghost sm" data-so="nocover">Xoá ảnh bìa</button>' : ''}
      <button type="button" class="btn ghost sm" data-so="avatar">📷 Đổi logo</button>${Avatar.ok(p.avatar) ? '<button type="button" class="btn ghost sm" data-so="noavatar">Xoá logo</button>' : ''}</div>
      <button class="btn">Lưu trang</button></form></div>` : '';

    let body = '';
    if (tab === 'projects') {
      body = (own && !d.projs.length ? '<div class="banner">Bạn chưa có dự án nào. Mở tab “Quản lý dự án” để đăng dự án đầu tiên.</div>' : '')
        + section('Dự án chính', d.projs.filter(x => x.kind !== 'sub')) + section('Dự án phụ', d.projs.filter(x => x.kind === 'sub'));
    } else if (tab === 'followers') {
      body = `<h3 class="so-h">Người theo dõi <small>(${d.fers.length})</small></h3>${people(d.fers.map(x => x.from))}<h3 class="so-h">Đang theo dõi <small>(${d.fing.length})</small></h3>${people(d.fing.map(x => x.to))}`;
    } else if (tab === 'friends') {
      const reqs = own && d.reqIn.length ? `<h3 class="so-h">Lời mời kết bạn <small>(${d.reqIn.length})</small></h3>${d.reqIn.map(x => {
        const u = d.profs[x.from] || { id: x.from, name: 'Người dùng' };
        return `<div class="so-row so-req"><a href="#/u/${esc(x.from)}" class="so-rl">${Avatar.html(u, 'sm')}<span><b>${esc(hideEmail(u.name))}</b></span></a><button type="button" class="btn sm" data-so="accept" data-id="${esc(x.id)}">Chấp nhận</button><button type="button" class="btn ghost sm" data-so="decline" data-id="${esc(x.id)}">Từ chối</button></div>`;
      }).join('')}` : '';
      body = reqs + `<h3 class="so-h">Bạn bè <small>(${d.friends.length})</small></h3>${people(d.friends.map(x => x.from === p.id ? x.to : x.from))}`;
    } else if (tab === 'manage' && own) body = '<div id="soMg"></div>';

    const T = (k, l, n) => `<button type="button" class="so-tab ${tab === k ? 'on' : ''}" data-so="tab" data-tab="${k}">${l}${n === undefined ? '' : ` <b>${n}</b>`}</button>`;
    ctx.wrap(`<div class="so" style="--so:${acc}">
      <div class="so-cover" ${okImg(p.cover) ? `style="background-image:url(${p.cover})"` : ''}>${own ? '<button type="button" class="so-cam" data-so="cover">📷 Đổi ảnh bìa</button>' : ''}</div>
      <div class="so-head"><div class="so-av">${Avatar.html(p, 'xl')}${own ? '<button type="button" class="so-avcam" data-so="avatar" aria-label="Đổi logo">📷</button>' : ''}</div>
        <div class="so-info"><h1>${esc(hideEmail(p.pageName || p.name))}</h1>
          ${p.pageName ? `<p class="so-by">${esc(hideEmail(p.name))}</p>` : ''}
          ${p.bio ? `<p class="so-bio">${esc(hideEmail(p.bio))}</p>` : ''}
          <p class="so-stats"><button type="button" class="so-stat" data-so="tab" data-tab="followers"><b>${d.fers.length}</b> người theo dõi</button> · <button type="button" class="so-stat" data-so="tab" data-tab="followers"><b>${d.fing.length}</b> đang theo dõi</button> · <button type="button" class="so-stat" data-so="tab" data-tab="friends"><b>${d.friends.length}</b> bạn bè</button></p>
        </div><div class="so-acts">${acts}</div></div>
      ${edit}
      <div class="so-tabs">${T('projects', 'Dự án', d.projs.length)}${T('followers', 'Người theo dõi', d.fers.length)}${T('friends', 'Bạn bè', d.friends.length)}${own ? T('manage', '🛠 Quản lý dự án') : ''}</div>
      <div class="so-body">${body}</div></div>`);
    wire();
    if (tab === 'manage' && own) manage();
  }

  function wire() {
    const root = $('.so'); if (!root) return;
    root.onclick = async e => {
      const b = e.target.closest('[data-so]'); if (!b) return;
      const k = b.dataset.so, m = cur();
      try {
        if (k === 'tab') { view.tab = b.dataset.tab; paint(); return; }
        if (k === 'edit') { view.edit = !view.edit; paint(); return; }
        if (!m) { location.hash = '#/login'; return; }
        const r = D.rel || {};
        if (k === 'follow') {
          if (r.following) await Store.del('follows', m.id + '_' + P.id);
          else await Store.put('follows', { id: m.id + '_' + P.id, from: m.id, to: P.id });
          await reload(); return;
        }
        if (k === 'friend') {
          if (r.friend === 'none') await Store.put('friends', { id: m.id + '_' + P.id, from: m.id, to: P.id, status: 'pending' });
          else if (r.friend === 'out') await Store.del('friends', r.doc.id);
          else if (r.friend === 'yes' && confirm('Huỷ kết bạn với ' + (P.pageName || P.name) + '?')) await Store.del('friends', r.doc.id);
          await reload(); return;
        }
        if (k === 'accept' || k === 'decline') {
          const doc = await Store.get('friends', b.dataset.id); if (!doc) return;
          if (k === 'accept') await Store.put('friends', { ...doc, status: 'accepted', ats: Date.now() }); else await Store.del('friends', doc.id);
          await reload(); return;
        }
        if (m.id !== P.id) return;   // các thao tác dưới đây chỉ dành cho chủ trang
        if (k === 'cover') pick(async f => { try { P = await saveProf(P, { cover: await shrink(f, 1280, .78, 230000) }); paint(); say('Đã đổi ảnh bìa'); } catch (x) { say(x.message || x.code); } });
        else if (k === 'avatar') pick(async f => { try { P = await saveProf(P, { avatar: await Media.avatar(f, 160, .82) }); paint(); say('Đã đổi logo'); } catch (x) { say(x.message || x.code); } });
        else if (k === 'nocover') { P = await saveProf(P, { cover: '' }); paint(); say('Đã xoá ảnh bìa'); }
        else if (k === 'noavatar') { P = await saveProf(P, { avatar: '' }); paint(); say('Đã xoá logo'); }
      } catch (x) { say((x.message || x.code || 'Chưa thực hiện được') + (/permission|Rules/i.test(x.message || x.code || '') ? ' (admin cần cập nhật Firestore Rules, xem firestore.rules.additions.txt)' : '')); }
    };
    const f = $('#soForm');
    if (f) f.onsubmit = async ev => {
      ev.preventDefault(); const fd = new FormData(f), name = String(fd.get('name') || '').trim();
      if (!name) return say('Tên hiển thị không được để trống');
      try {
        P = await saveProf(P, { name: name.slice(0, 40), pageName: String(fd.get('pageName') || '').trim().slice(0, 60), bio: String(fd.get('bio') || '').trim().slice(0, 300), accent: ACC[fd.get('accent')] ? fd.get('accent') : 'sky' });
        view.edit = false; say('Đã lưu trang cá nhân'); paint();
      } catch (x) { say('Chưa lưu được: ' + (x.message || x.code)); }
    };
  }

  /* ---------- Quản lý dự án của chính mình (giống admin, không có sao lưu / người dùng / bot) ---------- */
  function manage() {
    const box = $('#soMg'); if (!box) return;
    const p = P, d = D, e = d.projs.find(x => x.id === mg.pid) || {}, eu = d.ups.find(x => x.id === mg.uid) || {};
    const mains = d.projs.filter(x => x.kind !== 'sub' && x.id !== e.id), name = id => (d.projs.find(x => x.id === id) || {}).name || '(đã xoá)';
    const Pn = pct(e.progress);
    box.innerHTML = `<div class="card"><h2>${e.id ? 'Sửa dự án' : 'Đăng dự án mới'}</h2><form id="mgPf">
      <label>Tên dự án</label><input name="name" required maxlength="120" value="${esc(e.name)}">
      <label>Mô tả</label><textarea name="desc" maxlength="2000">${esc(e.desc)}</textarea>
      <div class="two"><div><label>Loại</label><select name="kind"><option value="main" ${e.kind !== 'sub' ? 'selected' : ''}>Dự án chính</option><option value="sub" ${e.kind === 'sub' ? 'selected' : ''}>Dự án phụ</option></select></div>
      <div><label>Thuộc dự án chính (chỉ cho dự án phụ)</label><select name="parentId"><option value="">— Không —</option>${mains.map(x => `<option value="${esc(x.id)}" ${e.parentId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div></div>
      <div class="two"><div><label>Trạng thái</label><select name="status">${['Kế hoạch', 'Đang làm', 'Tạm dừng', 'Hoàn thành'].map(s => `<option ${e.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div><label>Tiến độ (%)</label><div class="prog"><input type="range" id="mgPr" min="0" max="100" value="${Pn}" aria-label="Kéo để chỉnh tiến độ"><input type="text" id="mgPn" name="progress" inputmode="numeric" maxlength="3" autocomplete="off" value="${Pn}" aria-label="Tiến độ (%)"></div></div></div>
      <label>Ảnh bìa dự án (tự thu nhỏ)</label><input type="file" id="mgBg" accept="image/*"><div class="pthumbs" id="mgBgPrev"></div>
      <button class="btn">${e.id ? 'Lưu thay đổi' : 'Đăng dự án'}</button>${e.id ? ' <button type="button" class="btn ghost" id="mgPx">Huỷ</button>' : ''}</form></div>
      <div class="card" style="margin-top:14px"><h2>Dự án của bạn</h2>${d.projs.map(x => `<div class="item"><div><b>${esc(x.name)}</b> <span class="tag">${x.kind === 'sub' ? 'Phụ' : 'Chính'}</span> <span class="tag">${esc(x.status)}</span> <small class="muted">${pct(x.progress)}%</small></div>
        <div><a class="btn ghost sm" href="#/p/${esc(x.id)}">Xem</a> <button type="button" class="btn ghost sm" data-pe="${esc(x.id)}">Sửa</button> <button type="button" class="btn danger" data-pd="${esc(x.id)}">Xoá</button></div></div>`).join('') || '<p class="muted">Chưa có dự án.</p>'}</div>
      <div class="card" style="margin-top:14px"><h2>${eu.id ? 'Sửa cập nhật' : 'Đăng cập nhật theo tuần'}</h2>${d.projs.length ? `<form id="mgUf"><div class="two"><div><label>Dự án</label><select name="projectId">${d.projs.map(x => `<option value="${esc(x.id)}" ${eu.projectId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div><label>Tuần</label><input name="week" required maxlength="40" value="${esc(eu.week || isoWeek())}"></div></div>
      <label>Tiêu đề</label><input name="title" required maxlength="160" value="${esc(eu.title)}"><label>Nội dung</label><textarea name="content" required maxlength="4000">${esc(eu.content)}</textarea>
      <label>Ảnh (tối đa 4, tự nén) · PDF nhỏ (dưới ~550KB)</label><input type="file" id="mgF" accept="image/*,application/pdf" multiple><div class="pthumbs" id="mgThumbs"></div>
      <label>Link video, PDF hoặc Google Drive (mỗi dòng một link)</label><textarea name="links" rows="3" placeholder="https://www.youtube.com/watch?v=...">${esc(mg.links)}</textarea>
      <button class="btn">${eu.id ? 'Lưu thay đổi' : 'Đăng cập nhật'}</button>${eu.id ? ' <button type="button" class="btn ghost" id="mgUx">Huỷ</button>' : ''}</form>` : '<p class="muted">Hãy đăng một dự án trước.</p>'}</div>
      <div class="card" style="margin-top:14px">${[...d.ups].reverse().map(u => `<div class="item"><div><small class="muted">${esc(name(u.projectId))} · ${esc(u.week)}${Media.list(u).length ? ' · 📎' + Media.list(u).length : ''}</small><br><b>${esc(u.title)}</b></div>
        <div><button type="button" class="btn ghost sm" data-ue="${esc(u.id)}">Sửa</button> <button type="button" class="btn danger" data-ud="${esc(u.id)}">Xoá</button></div></div>`).join('') || '<p class="muted">Chưa có cập nhật.</p>'}</div>`;

    const drawBg = () => { $('#mgBgPrev').innerHTML = mg.bg ? `<div class="pth" style="width:120px"><img src="${esc(mg.bg)}" alt="Ảnh bìa"><button type="button" id="mgBgRm" aria-label="Bỏ ảnh bìa">×</button></div>` : ''; const r = $('#mgBgRm'); if (r) r.onclick = () => { mg.bg = ''; drawBg(); }; };
    drawBg();
    $('#mgBg').onchange = async ev => { const f = ev.target.files[0]; ev.target.value = ''; if (!f) return; try { mg.bg = await shrink(f, 960, .75, 150000); drawBg(); } catch (x) { say(x.message); } };
    const pr = $('#mgPr'), pn = $('#mgPn');
    pr.oninput = () => { pn.value = pr.value; };
    pn.oninput = () => { pn.value = pn.value.replace(/\D/g, '').slice(0, 3); if (pn.value !== '') { pn.value = pct(pn.value); pr.value = pn.value; } };
    pn.onblur = () => { pn.value = pct(pn.value); pr.value = pn.value; };

    $('#mgPf').onsubmit = async ev => {
      ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target));
      if (!e.id && d.projs.length >= 30) return say('Mỗi người tối đa 30 dự án');
      const o = { ...e, name: f.name.trim().slice(0, 120), desc: String(f.desc || '').slice(0, 2000), status: f.status, progress: pct(f.progress), kind: f.kind === 'sub' ? 'sub' : 'main', owner: p.pageName || p.name, ownerName: p.name, ownerUid: p.id };
      if (o.kind === 'sub' && f.parentId) o.parentId = f.parentId; else delete o.parentId;
      if (mg.bg) o.bgImg = mg.bg; else delete o.bgImg;
      try { await Store.put('projects', o); } catch (x) { return say(x.message || x.code); }
      mg.pid = ''; mg.bg = ''; say('Đã lưu dự án'); reload();
    };
    if ($('#mgPx')) $('#mgPx').onclick = () => { mg.pid = ''; mg.bg = ''; manage(); };
    box.querySelectorAll('[data-pe]').forEach(b => b.onclick = () => { mg.pid = b.dataset.pe; const x = d.projs.find(y => y.id === mg.pid) || {}; mg.bg = okImg(x.bgImg) ? x.bgImg : ''; manage(); box.scrollIntoView(); });
    box.querySelectorAll('[data-pd]').forEach(b => b.onclick = async () => {
      if (!confirm('Xoá dự án này và các cập nhật của nó?')) return;
      try { for (const u of d.ups.filter(u => u.projectId === b.dataset.pd)) await Store.del('updates', u.id); await Store.del('projects', b.dataset.pd); } catch (x) { return say(x.message || x.code); }
      mg.pid = ''; reload();
    });

    if ($('#mgUf')) {
      const draw = () => {
        $('#mgThumbs').innerHTML = mg.files.map((m, i) => `<div class="pth">${m.t === 'img' ? `<img src="${esc(m.src)}" alt="">` : `<span class="pchip">📄 ${esc(m.name || 'PDF')}</span>`}<button type="button" data-rm="${i}" aria-label="Bỏ tệp này">×</button></div>`).join('');
        $('#mgThumbs').querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { mg.files.splice(+b.dataset.rm, 1); draw(); });
      };
      draw();
      $('#mgF').onchange = async ev => {
        for (const f of [...ev.target.files]) {
          try {
            if (f.type === 'application/pdf') mg.files.push({ t: 'pdf', src: await Media.pdf(f), name: f.name });
            else if (mg.files.filter(m => m.t === 'img').length >= 4) { say('Tối đa 4 ảnh'); break; }
            else mg.files.push({ t: 'img', src: await Media.image(f), name: '' });
          } catch (x) { say(x.message); }
        }
        ev.target.value = ''; draw();
      };
      $('#mgUf').onsubmit = async ev => {
        ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target));
        try {
          const media = collect(mg.files, f.links);
          await Store.put('updates', { ...eu, projectId: f.projectId, week: f.week.trim(), title: f.title.trim(), content: f.content, media, ownerUid: p.id });
        } catch (x) { return say(x.message || x.code); }
        mg.uid = ''; mg.files = []; mg.links = ''; say('Đã đăng'); reload();
      };
      if ($('#mgUx')) $('#mgUx').onclick = () => { mg.uid = ''; mg.files = []; mg.links = ''; manage(); };
    }
    box.querySelectorAll('[data-ue]').forEach(b => b.onclick = () => {
      mg.uid = b.dataset.ue; const u = d.ups.find(x => x.id === mg.uid) || {}, all = Media.list(u);
      mg.files = all.filter(m => m.src.startsWith('data:')); mg.links = all.filter(m => !m.src.startsWith('data:')).map(m => m.src).join('\n'); manage();
    });
    box.querySelectorAll('[data-ud]').forEach(b => b.onclick = async () => { if (confirm('Xoá cập nhật này?')) { try { await Store.del('updates', b.dataset.ud); } catch (x) { return say(x.message || x.code); } reload(); } });
  }

  // Từ trang dự án: chủ dự án bấm "Chỉnh sửa" để vào thẳng tab quản lý
  function openManage(uid) { view = { id: uid, tab: 'manage', edit: false }; resetMg(); location.hash = '#/u/' + uid; }

  window.Social = { page, ensureProfile, sync, openManage, reset: bust };

  /* ---------- CSS ---------- */
  const css = document.createElement('style');
  css.textContent = `
.so{--so:#0284c7;max-width:960px;margin:0 auto}
.so-cover{position:relative;height:clamp(150px,28vw,270px);border-radius:0 0 18px 18px;background:linear-gradient(120deg,var(--so),#0f172a) center/cover no-repeat}
.so-cam{position:absolute;right:12px;bottom:12px;border:0;border-radius:10px;background:rgba(255,255,255,.92);color:#0f172a;font:inherit;font-size:.85rem;font-weight:700;padding:8px 12px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.so-head{display:flex;flex-wrap:wrap;align-items:flex-end;gap:14px 18px;padding:0 18px;margin-top:-46px;position:relative}
.so-av{position:relative;flex:none}
.so-av .av{width:128px;height:128px;font-size:3.2rem;border:4px solid #fff;box-shadow:0 4px 16px rgba(15,23,42,.22)}
.so-avcam{position:absolute;right:2px;bottom:4px;width:34px;height:34px;border:2px solid #fff;border-radius:50%;background:var(--so);color:#fff;font-size:.95rem;cursor:pointer;padding:0}
.so-info{flex:1 1 260px;min-width:0;padding-top:50px}
.so-info h1{margin:0;font-size:1.6rem;line-height:1.2;color:#0f172a;overflow-wrap:anywhere}
.so-by{margin:2px 0 0;color:#64748b;font-size:.9rem}
.so-bio{margin:8px 0 0;color:#334155;white-space:pre-wrap;overflow-wrap:anywhere}
.so-stats{margin:10px 0 0;color:#64748b;font-size:.9rem}
.so-stat{border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer}.so-stat:hover{color:var(--so)}.so-stat b{color:#0f172a}
.so-acts{display:flex;flex-wrap:wrap;gap:8px;padding-top:50px;align-items:center}
.pt-app .so .btn:not(.ghost):not(.danger){background:var(--so);border-color:var(--so)}
.pt-app .so .btn.ghost{color:var(--so)}
.so-edit{margin:18px 18px 0}
.so-acc{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 12px}
.pt-app .so-sw{display:inline-block;margin:0;cursor:pointer}
.so-sw input{position:absolute;opacity:0;width:0;height:0}
.so-sw i{display:block;width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px #cbd5e1}
.so-sw input:checked+i{box-shadow:0 0 0 3px #0f172a}
.so-sw input:focus-visible+i{box-shadow:0 0 0 3px #0284c7}
.so-btns{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px}
.so-tabs{display:flex;gap:4px;margin:22px 18px 0;border-bottom:2px solid #e2e8f0;overflow-x:auto}
.so-tab{flex:none;border:0;background:none;padding:12px 14px;font:inherit;font-weight:700;color:#64748b;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px}
.so-tab b{font-weight:600;color:#94a3b8;margin-left:2px}
.so-tab.on{color:var(--so);border-bottom-color:var(--so)}
.so-tab:hover{color:var(--so)}
.so-body{padding:6px 18px 30px}
.so-h{margin:22px 0 10px;font-size:1.05rem;color:#0f172a}.so-h small{color:#94a3b8;font-weight:600}
.so-row{display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:8px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;color:inherit;text-decoration:none}
a.so-row:hover,.so-rl:hover{border-color:var(--so)}
.so-row>span,.so-rl>span{min-width:0;flex:1;display:block}
.so-row b{display:block;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.so-row small{display:block;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.so-req .so-rl{display:flex;align-items:center;gap:12px;flex:1;min-width:0;color:inherit;text-decoration:none}
.sr-av{float:left;margin:0 12px 0 -4px}
.psec{margin:26px 0 12px;font-size:1.15rem;font-weight:800;color:#0f172a}.psec small{color:#94a3b8;font-weight:600}
.psearch{display:flex;align-items:center;gap:10px;margin:14px 0 4px;padding:6px 14px;background:#fff;border:2px solid #bae6fd;border-radius:99px}
.psearch:focus-within{border-color:#0284c7}
.psearch input{flex:1;min-width:0;border:0;outline:0;background:none;font:inherit;font-size:16px;padding:8px 0}
.psearch i{color:#0284c7}
mark.pj{background:#fde68a;color:inherit;border-radius:3px;padding:0 1px}
.navuser.so-dot{position:relative}.navuser.so-dot::after{content:attr(data-n);position:absolute;top:-6px;left:22px;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#ef4444;color:#fff;font-size:.7rem;font-weight:700;line-height:18px;text-align:center;box-shadow:0 0 0 2px #fff}
@media(max-width:560px){.so-head{margin-top:-40px}.so-av .av{width:100px;height:100px;font-size:2.6rem}.so-info{padding-top:12px}.so-acts{padding-top:0;width:100%}}`;
  document.head.appendChild(css);
})();
