/* ===== Mỗi người dùng = một "trang Pipe Traffic" riêng:  #/u/<id> =====
   - Ảnh bìa, logo, tên trang, giới thiệu, màu chủ đạo; theo dõi, kết bạn, nhắn tin.
   - Menu ☰ RIÊNG của chủ trang (thay menu của Pipe Traffic khi đang ở trang này): Dự án chính, Dự án phụ, Hành trình,
     Thành viên, Đánh giá, FAQ, Video, Liên hệ, Tin nhắn, Người theo dõi, Bạn bè.
   - Chủ trang tự đăng dự án (chính / phụ) + cập nhật tuần và sửa tất cả mục nội dung. KHÔNG có quản lý người dùng, sao lưu, dạy bot.
   - Bấm logo Pipe Traffic (hoặc "Về trang Pipe Traffic" trong menu) để quay lại trang chính, nơi hiện mọi dự án.
   Dữ liệu CÔNG KHAI nằm ở "profiles" (tên, logo, ảnh bìa, giới thiệu; KHÔNG có email). Nội dung từng trang ở "ucontent".
   Quan hệ: "follows" (id = từ_đến), "friends" (id = người gửi_người nhận; status pending | accepted).
   Cần cập nhật Firestore Rules (xem firestore.rules.additions.txt). */
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
  const COLOR_VN = { sky: 'Xanh da trời', indigo: 'Chàm', cyan: 'Xanh ngọc', rose: 'Hồng', emerald: 'Xanh lá' };
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
  let view = { id: '', tab: 'home', edit: false };
  let mg = { pid: '', uid: '', bg: '', files: [], links: '' };
  let ed = { sec: 'journey', id: '', photo: '', cover: '' };
  const resetState = () => { mg = { pid: '', uid: '', bg: '', files: [], links: '' }; ed = { sec: 'journey', id: '', photo: '', cover: '' }; };

  async function load(p) {
    const m = cur(), own = !!m && m.id === p.id, L = (c, w) => Store.list(c, { where: w }).catch(() => []);
    const [projs, fers, fing, f1, f2, rel, profs, ups, uc, st] = await Promise.all([
      L('projects', ['ownerUid', '==', p.id]), L('follows', ['to', '==', p.id]), L('follows', ['from', '==', p.id]),
      L('friends', ['from', '==', p.id]), L('friends', ['to', '==', p.id]), relation(m, p.id), profiles().catch(() => ({})),
      own ? L('updates', ['ownerUid', '==', p.id]) : Promise.resolve([]), L('ucontent', ['ownerUid', '==', p.id]),
      ctx && ctx.stats ? ctx.stats().catch(() => null) : Promise.resolve(null)
    ]);
    return { projs, fers, fing, friends: [...f1, ...f2].filter(x => x.status === 'accepted'), reqIn: f2.filter(x => x.status === 'pending'), rel, profs, ups, uc, st };
  }

  async function page(id, c) {
    ctx = c; const m = cur(), tk = ++token;
    if (!id) { if (m) location.replace('#/u/' + m.id); else location.hash = '#/login'; return; }
    ctx.wrap('<div class="loading">Đang tải trang…</div>');
    let p = await Store.get('profiles', id).catch(() => null);
    if (!p && m && m.id === id) p = await ensureProfile(m);
    if (tk !== token) return;
    if (!p) { ctx.wrap('<p>Không tìm thấy trang này. <a class="plink" href="#/">Về trang Pipe Traffic</a></p>'); return; }
    if (view.id !== id) { view = { id, tab: 'home', edit: false }; resetState(); }
    P = p; D = await load(p);
    if (tk !== token) return;
    paint();
  }
  async function reload() { D = await load(P); paint(); if (window.Search && Search.reset) Search.reset(); }

  /* ---------- Nội dung sửa được của từng trang (giống admin → Nội dung / Video & Liên hệ) ---------- */
  const SEC = {
    journey: { name: 'Hành trình', opt: [], label: x => `${x.week} · ${x.title}`,
      fields: [['week', 'Nhãn tuần', 'text', 'Tuần 1'], ['title', 'Tiêu đề', 'text'], ['items', 'Các ý (mỗi dòng một ý, có thể **in đậm**)', 'lines'], ['color', 'Màu', 'color']] },
    team: { name: 'Thành viên', opt: ['modalRole', 'detail', 'photo'], label: x => `${x.name} · ${x.role}`,
      fields: [['name', 'Họ tên', 'text'], ['role', 'Vai trò (dưới tên)', 'text'], ['short', 'Mô tả ngắn (1–2 dòng)', 'text'], ['modalRole', 'Vai trò đầy đủ (trong cửa sổ Chi tiết)', 'text'], ['detail', 'Mô tả chi tiết', 'area'], ['photo', 'Ảnh đại diện', 'photo'], ['color', 'Màu viền', 'color']] },
    reviews: { name: 'Đánh giá', opt: [], label: x => `${x.name} · ${'★'.repeat(+x.stars || 5)}`,
      fields: [['text', 'Nội dung nhận xét', 'area'], ['name', 'Tên', 'text'], ['title', 'Chức danh', 'text'], ['stars', 'Số sao', 'stars']] },
    faq: { name: 'FAQ', opt: [], label: x => x.q,
      fields: [['q', 'Câu hỏi', 'text'], ['a', 'Trả lời (có thể **in đậm**)', 'area']] },
    video: { name: 'Video', single: true, opt: ['tag', 'videoUrl', 'cover', 'playTitle', 'playSub', 'scenes', 'scenesTitle'],
      fields: [['tag', 'Dòng nhỏ phía trên tiêu đề', 'text'], ['title', 'Tiêu đề', 'text'],
        ['videoUrl', 'Link video (YouTube, Vimeo, Google Drive hoặc .mp4). Để trống thì chỉ hiện ảnh bìa', 'text', 'https://www.youtube.com/watch?v=...'],
        ['cover', 'Ảnh bìa video', 'cover'], ['playTitle', 'Dòng chữ lớn trên ảnh bìa', 'text'], ['playSub', 'Dòng chữ nhỏ trên ảnh bìa', 'text'],
        ['scenesTitle', 'Tiêu đề khung kịch bản', 'text'],
        ['scenes', 'Các phân cảnh: mỗi dòng một cảnh, dạng  Nhãn | Nội dung  (có thể **in đậm**). Xoá hết để ẩn khung này', 'lines']] },
    contact: { name: 'Liên hệ', single: true, opt: ['intro', 'note'],
      fields: [['title', 'Tiêu đề', 'text'], ['intro', 'Lời giới thiệu ngắn', 'area'],
        ['rows', 'Các dòng liên hệ: mỗi dòng dạng  Nhãn | Giá trị  (vd: Email | ban@gmail.com, Facebook | https://facebook.com/...). Email, số điện thoại và link tự thành liên kết bấm được', 'lines'],
        ['note', 'Ghi chú cuối', 'area']] }
  };
  const secList = k => Content.sort((D.uc || []).filter(x => x.sec === k));
  const secDoc = k => (D.uc || []).find(x => x.id === P.id + '_' + k) || null;

  function fieldHtml(S, f, v) {
    const [k, l, t, ph] = f, req = S.opt.includes(k) ? '' : 'required';
    if (t === 'area') return `<label>${l}</label><textarea name="${k}" rows="3" ${req}>${esc(v)}</textarea>`;
    if (t === 'lines') return `<label>${l}</label><textarea name="${k}" rows="5" ${req}>${esc((v || []).join('\n'))}</textarea>`;
    if (t === 'color') return `<label>${l}</label><select name="${k}">${Content.colors.map(c => `<option value="${c}" ${(v || 'sky') === c ? 'selected' : ''}>${COLOR_VN[c] || c}</option>`).join('')}</select>`;
    if (t === 'stars') return `<label>${l}</label><select name="${k}">${[5, 4, 3, 2, 1].map(n => `<option ${(+v || 5) === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    if (t === 'photo' || t === 'cover') return `<label>${l}</label><input type="file" id="${t}File" accept="image/*"><div class="pthumbs" id="${t}Prev"></div>
      <input name="${k}" placeholder="hoặc dán link ảnh https://..." value="${esc(v && !String(v).startsWith('data:') ? v : '')}">`;
    return `<label>${l}</label><input name="${k}" value="${esc(v)}" ${ph ? `placeholder="${esc(ph)}"` : ''} ${req}>`;
  }

  /* ---------- Giao diện ---------- */
  function paint() {
    const p = P, d = D, m = cur(), own = !!m && m.id === p.id, acc = ACC[p.accent] || ACC.sky, tab = view.tab;
    const people = ids => ids.map(id => {
      const u = d.profs[id] || { id, name: 'Người dùng' };
      return `<a class="so-row" href="#/u/${esc(id)}">${Avatar.html(u, 'sm')}<span><b>${esc(hideEmail(u.pageName || u.name))}</b><small>${esc(hideEmail(u.bio || ''))}</small></span></a>`;
    }).join('') || '<p class="muted">Chưa có ai.</p>';
    const byId = Object.fromEntries(d.projs.map(x => [x.id, x]));
    const section = (t, list) => `<h3 class="so-h">${t} <small>(${list.length})</small></h3>` + (list.length ? `<div class="yt-grid">${list.map(x => ctx.card(x, d.st, byId)).join('')}</div>` : '<p class="muted">Chưa có.</p>');
    const hint = lbl => own ? ` Mở ☰ → “Sửa nội dung” để thêm ${lbl}.` : '';

    let acts = '';
    if (own) acts = `<button type="button" class="btn" data-so="edit">${view.edit ? 'Đóng chỉnh sửa' : '✏️ Chỉnh sửa trang'}</button><a class="btn ghost" href="#/profile">⚙️ Tài khoản</a>`;
    else if (!m) acts = '<a class="btn" href="#/login">Đăng nhập để theo dõi / kết bạn</a>';
    else {
      const r = d.rel || {};
      acts = `<button type="button" class="btn ${r.following ? 'ghost' : ''}" data-so="follow">${r.following ? '✓ Đang theo dõi' : '＋ Theo dõi'}</button>`
        + (r.friend === 'in' ? `<button type="button" class="btn" data-so="accept" data-id="${esc(r.doc.id)}">Chấp nhận kết bạn</button><button type="button" class="btn ghost" data-so="decline" data-id="${esc(r.doc.id)}">Từ chối</button>`
          : `<button type="button" class="btn ghost" data-so="friend">${r.friend === 'yes' ? '✓ Bạn bè' : r.friend === 'out' ? 'Huỷ lời mời' : '👥 Kết bạn'}</button>`)
        + '<button type="button" class="btn ghost" data-so="dm">💬 Nhắn tin</button>';
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
    const mainsL = d.projs.filter(x => x.kind !== 'sub'), subsL = d.projs.filter(x => x.kind === 'sub');
    const cnt = k => SEC[k].single ? (secDoc(k) ? 1 : 0) : secList(k).length;
    if (tab === 'home') {
      const tile = (k, l, n) => `<button type="button" class="so-tile" data-so="tab" data-tab="${k}"><b>${n}</b><span>${l}</span></button>`;
      body = `<div class="card"><h3 class="so-h" style="margin-top:0">Giới thiệu</h3><p style="white-space:pre-wrap;overflow-wrap:anywhere;margin:0">${p.bio ? esc(hideEmail(p.bio)) : '<span class="muted">Chưa có giới thiệu.</span>'}</p></div>
        <div class="so-tiles">${tile('main', 'Dự án chính', mainsL.length)}${tile('sub', 'Dự án phụ', subsL.length)}${tile('journey', 'Hành trình', cnt('journey'))}${tile('team', 'Thành viên', cnt('team'))}${tile('faq', 'FAQ', cnt('faq'))}</div>`
        + (own && !d.projs.length ? '<div class="banner">Mở ☰ → “Quản lý dự án” để đăng dự án đầu tiên, và “Sửa nội dung” để viết Hành trình, Thành viên, FAQ, Video, Liên hệ của bạn.</div>' : '');
    } else if (tab === 'main') body = section('Dự án chính', mainsL);
    else if (tab === 'sub') body = section('Dự án phụ', subsL);
    else if (tab === 'journey') {
      const l = secList('journey');
      body = `<h3 class="so-h">Hành trình <small>(${l.length})</small></h3>` + (l.length
        ? `<section class="rounded-3xl bg-slate-900 text-white py-10 px-4"><div class="max-w-6xl mx-auto relative timeline-line">${Content.journey(l)}</div></section>`
        : `<p class="muted">Chưa có mốc hành trình nào.${hint('mốc hành trình')}</p>`);
    } else if (tab === 'team') {
      const l = secList('team');
      body = `<h3 class="so-h">Thành viên <small>(${l.length})</small></h3>` + (l.length ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">${Content.team(l)}</div>` : `<p class="muted">Chưa có thành viên nào.${hint('thành viên')}</p>`);
    } else if (tab === 'reviews') {
      const l = secList('reviews');
      body = `<h3 class="so-h">Đánh giá <small>(${l.length})</small></h3>` + (l.length ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">${Content.reviews(l)}</div>` : `<p class="muted">Chưa có đánh giá nào.${hint('đánh giá')}</p>`);
    } else if (tab === 'faq') {
      const l = secList('faq');
      body = `<h3 class="so-h">Câu hỏi thường gặp <small>(${l.length})</small></h3>` + (l.length ? `<div class="space-y-4">${Content.faq(l)}</div>` : `<p class="muted">Chưa có câu hỏi nào.${hint('câu hỏi')}</p>`);
    } else if (tab === 'video') {
      const v = secDoc('video');
      body = v ? `<section class="so-video rounded-3xl overflow-hidden" data-autotr>${Content.video(v)}</section>` : `<h3 class="so-h">Video</h3><p class="muted">Chưa có video.${hint('video')}</p>`;
    } else if (tab === 'contact') {
      const c = secDoc('contact');
      body = c ? `<div class="card so-contact">${Content.contact(c)}</div>` : `<h3 class="so-h">Liên hệ</h3><p class="muted">Chưa có thông tin liên hệ.${hint('thông tin liên hệ')}</p>`;
    } else if (tab === 'followers') {
      body = `<h3 class="so-h">Người theo dõi <small>(${d.fers.length})</small></h3>${people(d.fers.map(x => x.from))}<h3 class="so-h">Đang theo dõi <small>(${d.fing.length})</small></h3>${people(d.fing.map(x => x.to))}`;
    } else if (tab === 'friends') {
      const reqs = own && d.reqIn.length ? `<h3 class="so-h">Lời mời kết bạn <small>(${d.reqIn.length})</small></h3>${d.reqIn.map(x => {
        const u = d.profs[x.from] || { id: x.from, name: 'Người dùng' };
        return `<div class="so-row so-req"><a href="#/u/${esc(x.from)}" class="so-rl">${Avatar.html(u, 'sm')}<span><b>${esc(hideEmail(u.name))}</b></span></a><button type="button" class="btn sm" data-so="accept" data-id="${esc(x.id)}">Chấp nhận</button><button type="button" class="btn ghost sm" data-so="decline" data-id="${esc(x.id)}">Từ chối</button></div>`;
      }).join('')}` : '';
      body = reqs + `<h3 class="so-h">Bạn bè <small>(${d.friends.length})</small></h3>${people(d.friends.map(x => x.from === p.id ? x.to : x.from))}`;
    } else if (tab === 'manage' && own) body = '<div id="soMg"></div>';
    else if (tab === 'edit' && own) body = '<div id="soEd"></div>';

    ctx.wrap(`<div class="so" style="--so:${acc}">
      <div class="so-cover" ${okImg(p.cover) ? `style="background-image:url(${p.cover})"` : ''}>${own ? '<button type="button" class="so-cam" data-so="cover">📷 Đổi ảnh bìa</button>' : ''}</div>
      <div class="so-head"><div class="so-av">${Avatar.html(p, 'xl')}${own ? '<button type="button" class="so-avcam" data-so="avatar" aria-label="Đổi logo">📷</button>' : ''}</div>
        <div class="so-info"><h1>${esc(hideEmail(p.pageName || p.name))}</h1>
          ${p.pageName ? `<p class="so-by">${esc(hideEmail(p.name))}</p>` : ''}
          <p class="so-stats"><button type="button" class="so-stat" data-so="tab" data-tab="followers"><b>${d.fers.length}</b> người theo dõi</button> · <button type="button" class="so-stat" data-so="tab" data-tab="followers"><b>${d.fing.length}</b> đang theo dõi</button> · <button type="button" class="so-stat" data-so="tab" data-tab="friends"><b>${d.friends.length}</b> bạn bè</button></p>
        </div><div class="so-acts">${acts}</div></div>
      ${edit}
      <div class="so-body">${body}</div></div>`);
    wire(); setMenu();
    if (tab === 'manage' && own) manage();
    if (tab === 'edit' && own) editor();
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
        if (k === 'dm') { if (window.DM) DM.openWith(P.id); return; }
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

  /* ---------- Hamburger menu riêng của từng trang ---------- */
  const MENU = [['home', 'fa-house', 'Trang cá nhân'], ['main', 'fa-folder-open', 'Dự án chính'], ['sub', 'fa-folder-tree', 'Dự án phụ'], ['journey', 'fa-timeline', 'Hành trình (Journey)'],
    ['team', 'fa-users', 'Thành viên'], ['reviews', 'fa-star', 'Đánh giá'], ['faq', 'fa-circle-question', 'FAQ'], ['video', 'fa-circle-play', 'Video'], ['contact', 'fa-address-book', 'Liên hệ'],
    ['msg', 'fa-comment-dots', 'Tin nhắn'], ['followers', 'fa-user-group', 'Người theo dõi'], ['friends', 'fa-user-check', 'Bạn bè']];
  const MENU_OWN = [['manage', 'fa-screwdriver-wrench', 'Quản lý dự án'], ['edit', 'fa-pen-to-square', 'Sửa nội dung']];
  let mainMenu = null;
  function setMenu() {   // thay nội dung menu ☰ của Pipe Traffic bằng menu của chủ trang
    const el = $('#mobile-menu'); if (!el || !P) return;
    if (!mainMenu) mainMenu = el.innerHTML;
    const m = cur(), own = !!m && m.id === P.id, cls = 'block w-full text-left py-2 text-slate-700 hover:text-sky-600 font-medium border-b border-slate-100';
    el.innerHTML = `<a href="#/" onclick="toggleMobileMenu(true)" class="${cls} so-back"><i class="fa-solid fa-arrow-left text-sky-500 mr-2"></i> Về trang Pipe Traffic</a>
      <div class="so-mu">${Avatar.html(P, 'sm')}<b>${esc(hideEmail(P.pageName || P.name))}</b></div>`
      + [...MENU, ...(own ? MENU_OWN : [])].map(([k, ic, l]) => `<button type="button" data-sotab="${k}" class="${cls}${view.tab === k ? ' so-m-on' : ''}"><i class="fa-solid ${ic} text-sky-500 mr-2"></i> ${l}</button>`).join('')
      + '<div id="authSlotM"></div>';
    if (typeof renderAuth === 'function') renderAuth();
  }
  function restoreMenu() {   // rời trang cá nhân: trả lại menu của Pipe Traffic
    const el = $('#mobile-menu'); if (el && mainMenu) { el.innerHTML = mainMenu; mainMenu = null; }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-sotab]'); if (!b || !P) return;
    if (typeof toggleMobileMenu === 'function') toggleMobileMenu(true);
    if (b.dataset.sotab === 'msg') { if (!cur()) { location.hash = '#/login'; return; } if (window.DM) DM.openList(); return; }
    view.tab = b.dataset.sotab; paint(); window.scrollTo(0, 0);
  });

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

  /* ---------- Sửa nội dung trang: Hành trình / Thành viên / Đánh giá / FAQ (danh sách) + Video / Liên hệ (một tài liệu) ---------- */
  function editor() {
    const box = $('#soEd'); if (!box) return;
    const S = SEC[ed.sec], p = P;
    const tabs = `<div class="row" style="justify-content:flex-start;gap:8px;margin-bottom:14px;flex-wrap:wrap">${Object.entries(SEC).map(([k, v]) => `<button type="button" class="btn ${k === ed.sec ? '' : 'ghost'} sm" data-es="${k}">${v.name}</button>`).join('')}</div>`;
    const bindTabs = () => box.querySelectorAll('[data-es]').forEach(b => b.onclick = () => { ed = { sec: b.dataset.es, id: '', photo: '', cover: '' }; editor(); });
    const prevImg = (kind, get, set) => {   // xem trước + chọn ảnh (team: photo, video: cover)
      const pv = () => { const el = $('#' + kind + 'Prev'); if (el) el.innerHTML = get() ? `<div class="pth"><img src="${esc(get())}" alt=""><button type="button" id="${kind}Rm" aria-label="Bỏ ảnh">×</button></div>` : ''; const r = $('#' + kind + 'Rm'); if (r) r.onclick = () => { set(''); pv(); }; };
      pv();
      const fi = $('#' + kind + 'File');
      if (fi) fi.onchange = async ev => { try { set(kind === 'photo' ? await Media.avatar(ev.target.files[0]) : await shrink(ev.target.files[0], 960, .75, 150000)); pv(); } catch (x) { say(x.message); } ev.target.value = ''; };
    };
    const collectFields = (f, o) => S.fields.forEach(([k, , t]) => {
      if (t === 'lines') o[k] = String(f[k] || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
      else if (t === 'stars') o[k] = +f[k] || 5;
      else if (t === 'photo') o[k] = ed.photo || String(f[k] || '').trim();
      else if (t === 'cover') o[k] = ed.cover || String(f[k] || '').trim();
      else o[k] = String(f[k] ?? '').trim();
    });

    if (S.single) {   // Video / Liên hệ
      const doc = secDoc(ed.sec), v = { ...(Content.defaults[ed.sec] || {}), ...(doc || {}) };
      if (ed.cover === '' && v.cover && String(v.cover).startsWith('data:')) ed.cover = v.cover;
      box.innerHTML = `<h2 style="margin-top:0">Sửa nội dung trang</h2>${tabs}${doc ? '' : '<div class="banner">Mục này chưa có dữ liệu của bạn. Form đã điền sẵn nội dung mẫu; sửa rồi bấm Lưu.</div>'}
        <div class="card"><h2>${S.name}</h2><form id="edF">${S.fields.map(f => fieldHtml(S, f, v[f[0]])).join('')}<button class="btn">Lưu</button>${doc ? ' <button type="button" class="btn danger" id="edReset">Xoá, dùng lại nội dung mẫu</button>' : ''}</form></div>`;
      bindTabs(); prevImg('cover', () => ed.cover, x => { ed.cover = x; });
      $('#edF').onsubmit = async ev => {
        ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target)), o = {}; collectFields(f, o);
        if (o.videoUrl && !/^https?:\/\/\S+$/i.test(o.videoUrl)) return say('Link video phải bắt đầu bằng https://');
        if (o.cover && !/^(https?:\/\/\S+|data:image\/)/i.test(o.cover)) return say('Link ảnh bìa phải bắt đầu bằng https://');
        if (ed.sec === 'contact' && !o.rows.length) return say('Hãy nhập ít nhất một dòng liên hệ');
        try { await Store.put('ucontent', { ...(doc || {}), ...o, id: p.id + '_' + ed.sec, sec: ed.sec, ownerUid: p.id }); } catch (x) { return say(x.message || x.code); }
        say('Đã lưu'); reload();
      };
      if ($('#edReset')) $('#edReset').onclick = async () => { if (confirm('Xoá nội dung đã nhập và dùng lại nội dung mẫu?')) { try { await Store.del('ucontent', doc.id); } catch (x) { return say(x.message || x.code); } ed.cover = ''; say('Đã quay về nội dung mẫu'); reload(); } };
      return;
    }

    const list = secList(ed.sec), e = list.find(x => x.id === ed.id) || {};
    if (ed.id && e.id && !ed.photo && e.photo && String(e.photo).startsWith('data:')) ed.photo = e.photo;
    box.innerHTML = `<h2 style="margin-top:0">Sửa nội dung trang</h2>${tabs}
      <div class="card"><h2>${e.id ? 'Sửa' : 'Thêm'}: ${S.name}</h2><form id="edF">${S.fields.map(f => fieldHtml(S, f, e[f[0]])).join('')}
      <button class="btn">${e.id ? 'Lưu thay đổi' : 'Thêm'}</button>${e.id ? ' <button type="button" class="btn ghost" id="edX">Huỷ</button>' : ''}</form></div>
      <div class="card" style="margin-top:14px">${list.map((x, i) => `<div class="item"><div style="min-width:0"><b>${esc(S.label(x))}</b></div>
        <div style="display:flex;gap:6px;flex-shrink:0"><button type="button" class="btn ghost sm" data-mv="${esc(x.id)}|-1" ${i === 0 ? 'disabled' : ''} aria-label="Lên">▲</button><button type="button" class="btn ghost sm" data-mv="${esc(x.id)}|1" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Xuống">▼</button>
        <button type="button" class="btn ghost sm" data-ee="${esc(x.id)}">Sửa</button><button type="button" class="btn danger" data-ed="${esc(x.id)}">Xoá</button></div></div>`).join('') || '<p class="muted">Chưa có mục nào.</p>'}</div>`;
    bindTabs(); prevImg('photo', () => ed.photo, x => { ed.photo = x; });
    $('#edF').onsubmit = async ev => {
      ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target)), o = {}; collectFields(f, o);
      if (o.photo && !/^(https?:\/\/|data:image\/)/i.test(o.photo)) return say('Link ảnh phải bắt đầu bằng https://');
      if (!e.id && list.length >= 60) return say('Mỗi mục tối đa 60 dòng');
      o.order = e.id ? e.order ?? list.length * 10 : (list.reduce((m, x) => Math.max(m, x.order ?? 0), -10) + 10);
      try { await Store.put('ucontent', { ...e, ...o, sec: ed.sec, ownerUid: p.id }); } catch (x) { return say(x.message || x.code); }
      ed.id = ''; ed.photo = ''; say('Đã lưu'); reload();
    };
    if ($('#edX')) $('#edX').onclick = () => { ed.id = ''; ed.photo = ''; editor(); };
    box.querySelectorAll('[data-ee]').forEach(b => b.onclick = () => { ed.id = b.dataset.ee; ed.photo = ''; editor(); box.scrollIntoView(); });
    box.querySelectorAll('[data-ed]').forEach(b => b.onclick = async () => { if (confirm('Xoá mục này?')) { try { await Store.del('ucontent', b.dataset.ed); } catch (x) { return say(x.message || x.code); } ed.id = ''; reload(); } });
    box.querySelectorAll('[data-mv]').forEach(b => b.onclick = async () => {
      const [id, dir] = b.dataset.mv.split('|'), i = list.findIndex(x => x.id === id), j = i + +dir; if (j < 0 || j >= list.length) return;
      const ord = list.map(x => x.id); [ord[i], ord[j]] = [ord[j], ord[i]];
      try { for (let k = 0; k < ord.length; k++) { const x = list.find(y => y.id === ord[k]); if (x.order !== k * 10) await Store.put('ucontent', { ...x, order: k * 10 }); } } catch (x) { return say(x.message || x.code); }
      reload();
    });
  }

  // Từ trang dự án: chủ dự án bấm "Chỉnh sửa" để vào thẳng tab quản lý
  function openManage(uid) { view = { id: uid, tab: 'manage', edit: false }; resetState(); location.hash = '#/u/' + uid; }

  window.Social = { page, ensureProfile, sync, openManage, restoreMenu, profiles, reset: bust };

  /* ---------- CSS ---------- */
  const css = document.createElement('style');
  css.textContent = `
.so{--so:#0284c7;max-width:1000px;margin:0 auto}
.so-cover{position:relative;height:clamp(150px,28vw,270px);border-radius:0 0 18px 18px;background:linear-gradient(120deg,var(--so),#0f172a) center/cover no-repeat}
.so-cam{position:absolute;right:12px;bottom:12px;border:0;border-radius:10px;background:rgba(255,255,255,.92);color:#0f172a;font:inherit;font-size:.85rem;font-weight:700;padding:8px 12px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.so-head{display:flex;flex-wrap:wrap;align-items:flex-end;gap:14px 18px;padding:0 18px;margin-top:-46px;position:relative}
.so-av{position:relative;flex:none}
.so-av .av{width:128px;height:128px;font-size:3.2rem;border:4px solid #fff;box-shadow:0 4px 16px rgba(15,23,42,.22)}
.so-avcam{position:absolute;right:2px;bottom:4px;width:34px;height:34px;border:2px solid #fff;border-radius:50%;background:var(--so);color:#fff;font-size:.95rem;cursor:pointer;padding:0}
.so-info{flex:1 1 260px;min-width:0;padding-top:50px}
.so-info h1{margin:0;font-size:1.6rem;line-height:1.2;color:#0f172a;overflow-wrap:anywhere}
.so-by{margin:2px 0 0;color:#64748b;font-size:.9rem}
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
.so-body{padding:18px 18px 30px}
.so-h{margin:22px 0 10px;font-size:1.05rem;color:#0f172a}.so-h small{color:#94a3b8;font-weight:600}
.so-row{display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:8px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;color:inherit;text-decoration:none}
a.so-row:hover,.so-rl:hover{border-color:var(--so)}
.so-row>span,.so-rl>span{min-width:0;flex:1;display:block}
.so-row b{display:block;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.so-row small{display:block;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.so-req .so-rl{display:flex;align-items:center;gap:12px;flex:1;min-width:0;color:inherit;text-decoration:none}
.so-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:14px}
.so-tile{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;font:inherit;cursor:pointer;text-align:left}
.so-tile b{font-size:1.6rem;color:var(--so)}.so-tile span{color:#475569;font-weight:600}.so-tile:hover{border-color:var(--so)}
.so-mu{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #f1f5f9}.so-mu b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#0f172a}
#mobile-menu .so-m-on{color:#0284c7;font-weight:700}
.so-video{background:#fff;border:1px solid #e2e8f0}
.sr-av{float:left;margin:0 12px 0 -4px}
.psec{margin:26px 0 12px;font-size:1.15rem;font-weight:800;color:#0f172a}.psec small{color:#94a3b8;font-weight:600}
.psearch{display:flex;align-items:center;gap:10px;margin:14px 0 4px;padding:6px 14px;background:#fff;border:2px solid #bae6fd;border-radius:99px}
.psearch:focus-within{border-color:#0284c7}
.psearch input{flex:1;min-width:0;border:0;outline:0;background:none;font:inherit;font-size:16px;padding:8px 0;color:inherit}
.psearch i{color:#0284c7}
mark.pj{background:#fde68a;color:inherit;border-radius:3px;padding:0 1px}
html[data-theme=dark] .so-row,html[data-theme=dark] .so-tile,html[data-theme=dark] .so-video,html[data-theme=dark] .psearch{background:#111c31;border-color:#26364f;color:#e2e8f0}
html[data-theme=dark] .so-info h1,html[data-theme=dark] .so-stat b,html[data-theme=dark] .so-h,html[data-theme=dark] .so-row b,html[data-theme=dark] .so-mu b,html[data-theme=dark] .psec{color:#f1f5f9}
html[data-theme=dark] .so-tile span{color:#a7b4c7}
html[data-theme=dark] .so-av .av{border-color:#0f1a2e}
.yt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:22px 16px}
.yc{display:block;color:inherit;text-decoration:none;border-radius:14px}
.yc-th{position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:linear-gradient(135deg,#0ea5e9,#6366f1);transition:transform .15s,box-shadow .15s}
.yc:hover .yc-th{transform:translateY(-2px);box-shadow:0 10px 24px rgba(15,23,42,.18)}
.yc-th img{width:100%;height:100%;object-fit:cover;display:block}
.yc-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:3rem;font-weight:800;color:rgba(255,255,255,.9)}
.yc-pct,.yc-k{position:absolute;bottom:10px;padding:2px 8px;border-radius:6px;background:rgba(15,23,42,.82);color:#fff;font-size:.72rem;font-weight:700}
.yc-pct{right:8px}.yc-k{left:8px}
.yc-bar{position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(255,255,255,.35)}.yc-bar i{display:block;height:100%;background:#ef4444}
.yc-meta{display:flex;gap:10px;padding:10px 2px 0}.yc-meta .av{flex:none}
.yc-tx{min-width:0;display:flex;flex-direction:column;gap:2px}
.yc-t{font-size:.98rem;line-height:1.3;color:#0f172a;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.yc-o,.yc-s{font-size:.8rem;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.yh-bar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:6px}
.yh-q{flex:1 1 260px;max-width:420px;margin:0}
.yh-chips{display:flex;gap:8px;overflow-x:auto;padding:10px 0 16px;scrollbar-width:none}
.yh-chip{flex:none;border:0;border-radius:10px;padding:8px 14px;background:#f1f5f9;color:#0f172a;font:inherit;font-size:.88rem;font-weight:600;cursor:pointer}
.yh-chip.on{background:#0f172a;color:#fff}
.lk-btn{display:inline-flex;align-items:center;gap:8px;border:1px solid #cbd5e1;background:#fff;border-radius:99px;padding:8px 16px;font:inherit;font-weight:700;color:#334155;cursor:pointer}
.lk-btn.on{background:#fee2e2;border-color:#fca5a5;color:#dc2626}
html[data-theme=dark] .yc-t{color:#f1f5f9}
html[data-theme=dark] .yh-chip{background:#1e293b;color:#e2e8f0}
html[data-theme=dark] .yh-chip.on{background:#e2e8f0;color:#0f172a}
html[data-theme=dark] .lk-btn{background:#111c31;border-color:#26364f;color:#e2e8f0}
html[data-theme=dark] .lk-btn.on{background:#4c1d24;border-color:#b91c1c;color:#fca5a5}
@media(max-width:560px){.so-head{margin-top:-40px}.so-av .av{width:100px;height:100px;font-size:2.6rem}.so-info{padding-top:12px}.so-acts{padding-top:0;width:100%}}`;
  document.head.appendChild(css);
})();
