// Lớp dữ liệu: Firebase (Auth + Firestore) nếu có cấu hình, nếu không thì localStorage (chế độ thử).
(function () {
  const cfg = window.APP_CONFIG || {};
  const wantFb = !!(cfg.firebase && cfg.firebase.apiKey);
  let useFb = false, fdb, fauth, fbFail = '';
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); setTimeout(no, cfg.timeoutMs || 12000); });
  // Chỉ tải Firebase khi đã điền cấu hình => trang nhẹ hơn ở chế độ thử
  const ready = (async () => {
    if (!wantFb) return;
    try {
      const b = 'https://www.gstatic.com/firebasejs/10.12.2/';
      await load(b + 'firebase-app-compat.js');
      await Promise.all([load(b + 'firebase-auth-compat.js'), load(b + 'firebase-firestore-compat.js')]);
      firebase.initializeApp(cfg.firebase); fdb = firebase.firestore(); fauth = firebase.auth(); useFb = true;
    } catch (e) { fbFail = (e && e.message) || 'không tải được thư viện Firebase (mạng, trình chặn quảng cáo, hoặc firebase.com bị chặn)'; console.warn('Không tải được Firebase, dùng chế độ thử.', e); }
  })();
  const authUser = () => new Promise(res => { const un = fauth.onAuthStateChanged(u => { un(); res(u); }); });
  const hasPw = u => !!u && u.providerData.some(p => p.providerId === 'password');
  const lc = s => String(s || '').toLowerCase();
  const fbErr = e => {
    const c = e.code || '';
    if (c === 'auth/operation-not-allowed') return new Error('Chưa bật đăng nhập Email/Password trong Firebase Authentication (xem README, bước 2).');
    if (c === 'auth/weak-password') return new Error('Mật khẩu cần ít nhất 6 ký tự.');
    if (c === 'permission-denied' || c === 'firestore/permission-denied') return new Error('Rules Firestore từ chối thao tác này. Nếu bạn là admin: UID trong firestore.rules phải trùng UID của tài khoản admin (xem tab Người dùng trong admin) và đã Publish.');
    return e;
  };
  // Firebase treo (chưa tạo Firestore, mất mạng...) thì báo lỗi rõ ràng thay vì chờ mãi
  const tmo = (p, ms = (cfg.timeoutMs || 12000)) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(Object.assign(new Error('Không kết nối được Firebase (quá thời gian chờ). Kiểm tra đã tạo Firestore Database, đã Publish Rules và mạng còn tốt.'), { code: 'timeout' })), ms))]);
  const adminErr = e => {
    const c = e.code || '';
    if (/wrong-password|invalid-credential|invalid-login|user-not-found/.test(c)) return new Error('Sai mật khẩu, hoặc email admin chưa có tài khoản trong Firebase (Authentication → Users). Bấm "Quên mật khẩu admin?" để đặt lại. (' + c + ')');
    if (c === 'auth/too-many-requests') return new Error('Firebase tạm khoá vì nhập sai nhiều lần. Đợi 10–15 phút hoặc bấm "Quên mật khẩu admin?" rồi thử lại.');
    if (c === 'auth/network-request-failed') return new Error('Không có kết nối mạng tới Firebase.');
    if (c === 'auth/user-disabled') return new Error('Tài khoản admin đang bị vô hiệu hoá trong Firebase Console.');
    if (c === 'auth/invalid-email') return new Error('adminEmail trong config.js không phải email hợp lệ.');
    return fbErr(e);
  };
  const BAD_PW = /wrong-password|invalid-credential|invalid-login/;

  function seed() {
    const d = {
      projects: [{ id: 'p1', name: 'Pipe Traffic Core', desc: 'Hệ thống giao thông đường ống từ trường: lõi điều phối và mô phỏng.', status: 'Đang làm', progress: 40, owner: 'Admin', ts: 1 }],
      updates: [{ id: 'u1', projectId: 'p1', week: 'Tuần 1', title: 'Khởi động dự án', content: 'Chốt phạm vi, dựng khung repo và quy trình làm việc.', ts: 2 }],
      users: [], messages: [], comments: []
    };
    localStorage.setItem('pt_db', JSON.stringify(d));
    return d;
  }
  const db = () => { let d; try { d = JSON.parse(localStorage.getItem('pt_db')); } catch (e) {} d = d || seed(); d.comments = d.comments || []; return d; };
  const save = d => localStorage.setItem('pt_db', JSON.stringify(d));

  window.Store = {
    get mode() { return useFb ? 'firebase' : 'demo'; },
    get fbFailed() { return wantFb && !useFb; },            // đã điền Firebase nhưng không kết nối được
    get fbFailReason() { return fbFail; },
    // Thông tin chẩn đoán hiện trên trang đăng nhập admin (email được che bớt)
    info() { return { mode: useFb ? 'firebase' : 'demo', project: (cfg.firebase || {}).projectId || '', email: cfg.adminEmail ? cfg.adminEmail.replace(/^(.).*(@.+)$/, '$1***$2') : '' }; },
    sha,
    // Gọi một lần khi mở web: nếu phiên Google đã hết/đổi người thì xoá phiên đăng nhập cũ
    async init() {
      await ready;
      const m = this.me();
      if (useFb && m) { const u = await authUser(); if (!u || u.uid !== m.id) this.setMe(null, true); }
    },
    // ----- Dữ liệu chung (opt.where = [trường, '==', giá trị])
    async list(col, opt = {}) {
      await ready;
      let a;
      try {
        if (useFb) {
          let q = fdb.collection(col); if (opt.where) q = q.where(...opt.where);
          a = (await tmo(q.get())).docs.map(x => ({ ...x.data(), id: x.id }));
        } else {
          a = db()[col] || [];
          if (opt.where) { const [f, , v] = opt.where; a = a.filter(x => x[f] === v); }
        }
      } catch (e) { throw fbErr(e); }
      return a.sort((x, y) => x.ts - y.ts);
    },
    // Theo dõi thay đổi theo thời gian thực. Firebase: onSnapshot. Chế độ thử: đọc lại mỗi 0,8 giây.
    // Trả về hàm để HUỶ theo dõi.
    listen(col, opt, cb, onErr) {
      let stop = false, un = null, timer = null, bus = null;
      (async () => {
        await ready; if (stop) return;
        if (useFb) {
          let q = fdb.collection(col); if (opt && opt.where) q = q.where(...opt.where);
          un = q.onSnapshot(sn => { if (!stop) cb(sn.docs.map(x => ({ ...x.data(), id: x.id })).sort((a, b) => a.ts - b.ts)); }, er => onErr && onErr(fbErr(er)));
        } else {
          let last = '';
          bus = () => {
            if (stop) return;
            let a = db()[col] || []; if (opt && opt.where) { const [f, , v] = opt.where; a = a.filter(x => x[f] === v); }
            a = [...a].sort((x, y) => x.ts - y.ts); const sig = JSON.stringify(a);
            if (sig !== last) { last = sig; cb(a); }
          };
          window.addEventListener('pt-db', bus); bus(); timer = setInterval(bus, 800);
        }
      })();
      return () => { stop = true; if (un) un(); if (timer) clearInterval(timer); if (bus) window.removeEventListener('pt-db', bus); };
    },
    // Sao lưu / khôi phục toàn bộ dữ liệu (admin)
    COLS: ['projects', 'updates', 'team', 'journey', 'reviews', 'faq', 'comments', 'messages', 'users'],
    async exportAll() {
      const data = {};
      for (const c of this.COLS) { try { data[c] = await this.list(c); } catch (e) { data[c] = []; } }
      return { app: 'pipe-traffic', version: 1, exportedAt: new Date().toISOString(), data };
    },
    async importAll(obj) {
      if (!obj || obj.app !== 'pipe-traffic' || !obj.data) throw new Error('Đây không phải file sao lưu của web này.');
      let n = 0;
      for (const c of this.COLS) for (const d of (obj.data[c] || [])) { if (d && d.id) { await this.put(c, d); n++; } }
      return n;
    },
    async get(col, id) {
      await ready;
      try {
        if (useFb) { const s = await tmo(fdb.collection(col).doc(id).get()); return s.exists ? { ...s.data(), id: s.id } : null; }
      } catch (e) { throw fbErr(e); }
      return (db()[col] || []).find(x => x.id === id) || null;
    },
    async put(col, o) {
      await ready;
      o = { ...o }; if (!o.ts) o.ts = Date.now();
      const id = o.id || uid(); o.id = id;
      try {
        if (useFb) { const data = { ...o }; if (col === 'comments') delete data.id; await tmo(fdb.collection(col).doc(id).set(data)); }
        else { const d = db(); d[col] = d[col] || []; const i = d[col].findIndex(x => x.id === id); i < 0 ? d[col].push(o) : d[col][i] = o; save(d);  window.dispatchEvent(new Event('pt-db')); }
      } catch (e) { throw fbErr(e); }
      return o;
    },
    async del(col, id) {
      await ready;
      try {
        if (useFb) await tmo(fdb.collection(col).doc(id).delete());
        else { const d = db(); d[col] = (d[col] || []).filter(x => x.id !== id); save(d);  window.dispatchEvent(new Event('pt-db')); }
      } catch (e) { throw fbErr(e); }
    },
    // ----- Người dùng: bắt buộc Google trước, sau đó tên / giới tính / mật khẩu
    async google() {
      await ready;
      if (useFb) {
        const u = (await fauth.signInWithPopup(new firebase.auth.GoogleAuthProvider())).user;
        return { uid: u.uid, email: lc(u.email), hasPassword: hasPw(u) };
      }
      const e = lc((prompt('CHẾ ĐỘ THỬ: nhập email Google của bạn') || '').trim());
      if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error('Email không hợp lệ');
      return { uid: 'demo_' + (await sha(e)).slice(0, 16), email: e, hasPassword: true };
    },
    profile(uid) { return this.get('users', uid); },
    async linkPw(pw) {
      const u = fauth.currentUser;
      try { await u.linkWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, pw)); } catch (e) { throw fbErr(e); }
    },
    async register(g, name, gender, pw) {
      await ready;
      const o = { id: g.uid, name, gender, email: g.email, ts: Date.now() };
      if (useFb) { if (!g.hasPassword) await this.linkPw(pw); } else o.hash = await sha(pw);
      return this.put('users', o);
    },
    // Kiểm tra mật khẩu: Firebase tự xác thực (reauthenticate), không lưu hash ở Firestore
    async checkPw(g, pw, p) {
      await ready;
      if (!useFb) return p.hash === await sha(pw);
      if (!g.hasPassword) { await this.linkPw(pw); return true; }
      const u = fauth.currentUser;
      try { await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, pw)); return true; }
      catch (e) { if (BAD_PW.test(e.code || '')) return false; throw fbErr(e); }
    },
    async resetPw(email) {
      await ready;
      if (!useFb) throw new Error('Chế độ thử không gửi được email.');
      await fauth.sendPasswordResetEmail(email);
    },
    me() { try { return JSON.parse(localStorage.getItem('pt_user')); } catch (e) { return null; } },
    setMe(u, keepAuth) {
      u ? localStorage.setItem('pt_user', JSON.stringify({ id: u.id, name: u.name, gender: u.gender, email: u.email, avatar: u.avatar || '' })) : localStorage.removeItem('pt_user');
      if (!u && !keepAuth && useFb) fauth.signOut();
    },
    // ----- Admin (trang admin.html riêng). Firebase: đăng nhập bằng tài khoản Email/Password do bạn tạo.
    async adminLogin(user, pw) {
      await ready;
      const u = String(user || '').trim().toLowerCase();
      if (useFb) {
        if (!cfg.adminEmail) throw new Error('Chưa điền adminEmail trong config.js (xem README, bước 4).');
        // Chấp nhận "admin" hoặc chính email admin (trình duyệt hay tự điền email vào ô tên tài khoản)
        if (u !== String(cfg.adminUser).toLowerCase() && u !== lc(cfg.adminEmail)) throw new Error('Tên tài khoản là "' + cfg.adminUser + '" (hoặc email admin).');
        try {
          const r = await fauth.signInWithEmailAndPassword(cfg.adminEmail, pw);
          if (lc(r.user.email) !== lc(cfg.adminEmail)) return false;
          sessionStorage.setItem('pt_admin', '1'); return true;
        } catch (e) { throw adminErr(e); }
      }
      if (u !== String(cfg.adminUser).toLowerCase()) return false;
      if (await sha(pw) === cfg.adminHash) { sessionStorage.setItem('pt_admin', '1'); return true; }
      return false;
    },
    async isAdmin() {
      await ready;
      if (useFb) { const u = await authUser(); return !!u && !!cfg.adminEmail && lc(u.email) === lc(cfg.adminEmail) && hasPw(u); }
      return sessionStorage.getItem('pt_admin') === '1';
    },
    uid() { return useFb && fauth.currentUser ? fauth.currentUser.uid : ''; },
    // Gửi email đặt lại mật khẩu cho tài khoản admin (adminEmail trong config.js)
    async adminReset() {
      await ready;
      if (!useFb) throw new Error('Chế độ thử không gửi được email.');
      if (!cfg.adminEmail) throw new Error('Chưa điền adminEmail trong config.js.');
      try { await fauth.sendPasswordResetEmail(cfg.adminEmail); } catch (e) { throw fbErr(e); }
      return cfg.adminEmail.replace(/^(.).*(@.+)$/, '$1***$2');
    },
    async adminLogout() {
      await ready; sessionStorage.removeItem('pt_admin');
      if (useFb) await fauth.signOut();
    }
  };
})();


// ===== Ảnh / video / PDF: lưu trong bản ghi (ảnh được nén) hoặc dán link YouTube / Vimeo / Google Drive / .mp4 / .pdf =====
(function () {
  const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Các tên trường mà bản ghi (kể cả bản ghi cũ) có thể dùng để chứa tệp đính kèm
  const KEYS = ['media', 'attachments', 'files', 'images', 'image', 'photo', 'photos', 'video', 'videos', 'videoUrl', 'pdf', 'pdfUrl', 'file', 'fileUrl', 'imageUrl', 'imgUrl', 'cover'];
  const kindOf = (src, hint = '') => {
    hint = String(hint).toLowerCase();
    if (/^data:image\//i.test(src)) return 'img';
    if (/^data:application\/pdf/i.test(src)) return 'pdf';
    if (!/^https?:\/\//i.test(src)) return null;                                   // chặn javascript:, file: ...
    if (/\.pdf([?#]|$)/i.test(src) || /pdf/.test(hint)) return 'pdf';
    if (/youtu\.be|youtube\.com|vimeo\.com|\.(mp4|webm|ogg)([?#]|$)/i.test(src) || /video/.test(hint)) return 'video';
    if (/drive\.google\.com\/(file\/d\/|open\?id=)/i.test(src)) return 'video';     // xem trước bằng khung nhúng
    if (/\.(png|jpe?g|gif|webp|svg|avif)([?#]|$)/i.test(src) || /img|image|photo|cover/.test(hint) || /firebasestorage|googleusercontent|postimg|imgur|cloudinary|unsplash/i.test(src)) return 'img';
    return /file|attach|media|link/.test(hint) ? 'link' : null;   // 'link' = link thường (vd. thư mục Google Drive), đọc lại vẫn giữ
  };
  const blobs = {};
  const Media = window.Media = {
    KEYS,
    // Gom mọi tệp đính kèm của một bản ghi thành [{t:'img'|'video'|'pdf'|'link', src, name}]
    list(doc) {
      const out = [], seen = new Set();
      const add = (src, hint, name) => {
        src = String(src || '').trim(); if (!src || seen.has(src)) return;
        const t = kindOf(src, hint); if (t) { seen.add(src); out.push({ t, src, name: name || '' }); }
      };
      const walk = (v, hint) => {
        if (!v) return;
        if (Array.isArray(v)) return v.forEach(x => walk(x, hint));
        if (typeof v === 'object') return add(v.src || v.url || v.href || v.downloadURL || v.link, v.t || v.type || hint, v.name);
        add(v, hint);
      };
      KEYS.forEach(k => walk(doc && doc[k], k));
      return out;
    },
    embed(url) {
      let m;
      if ((m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/))) return { k: 'iframe', src: 'https://www.youtube.com/embed/' + m[1] };
      if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return { k: 'iframe', src: 'https://player.vimeo.com/video/' + m[1] };
      if ((m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/))) return { k: 'iframe', src: 'https://drive.google.com/file/d/' + m[1] + '/preview' };
      if (/^https?:\/\/\S+\.(mp4|webm|ogg)([?#]\S*)?$/i.test(url)) return { k: 'video', src: url };
      return null;
    },
    blob(dataUrl) {   // PDF lưu dạng data: được đổi sang blob: để trình duyệt cho phép xem
      if (blobs[dataUrl]) return blobs[dataUrl];
      const bin = atob(dataUrl.split(',')[1] || ''), a = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      return blobs[dataUrl] = URL.createObjectURL(new Blob([a], { type: 'application/pdf' }));
    },
    html(list) {
      if (!list || !list.length) return '';
      return '<div class="pmedia">' + list.map(m => {
        const s = e(m.src);
        if (m.t === 'img') return `<img class="pimg" src="${s}" loading="lazy" alt="${e(m.name)}" onclick="Media.open(this.src)">`;
        if (m.t === 'video') {
          const x = Media.embed(m.src);
          if (!x) return `<a class="plink" href="${s}" target="_blank" rel="noopener">▶ Mở video</a>`;
          return x.k === 'video' ? `<div class="pvideo"><video controls preload="metadata" src="${e(x.src)}"></video></div>`
            : `<div class="pvideo"><iframe src="${e(x.src)}" allowfullscreen loading="lazy" allow="fullscreen; picture-in-picture"></iframe></div>`;
        }
        if (m.t === 'pdf') {
          const u = e(m.src.startsWith('data:') ? Media.blob(m.src) : m.src);
          return `<div class="ppdf"><iframe src="${u}" loading="lazy"></iframe><a class="plink" href="${u}" target="_blank" rel="noopener" download="${e(m.name || 'tai-lieu.pdf')}">📄 ${e(m.name || 'Mở / tải PDF')}</a></div>`;
        }
        return `<a class="plink" href="${s}" target="_blank" rel="noopener">${/drive\.google\.com\/drive\/folders\//i.test(m.src) ? '📁' : '📎'} ${e(m.name || (/drive\.google\.com\/drive\/folders\//i.test(m.src) ? 'Mở thư mục Google Drive' : 'Mở tệp đính kèm'))}</a>`;
      }).join('') + '</div>';
    },
    open(src) {   // xem ảnh phóng to
      const o = document.createElement('div'); o.className = 'plight'; const i = document.createElement('img'); i.src = src; o.appendChild(i);
      o.onclick = () => o.remove(); document.body.appendChild(o);
    },
    // Nén ảnh: cạnh dài tối đa 1280px, JPEG, mục tiêu dưới ~260KB
    async image(file) {
      if (!/^image\//.test(file.type)) throw new Error('"' + file.name + '" không phải ảnh');
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Không đọc được ảnh ' + file.name)); i.src = URL.createObjectURL(file); });
      let max = 1280, q = .8, out;
      for (let k = 0; k < 6; k++) {
        const sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        out = c.toDataURL('image/jpeg', q); if (out.length <= 260000) break; max *= .8; q = Math.max(.5, q - .08);
      }
      URL.revokeObjectURL(img.src);
      if (out.length > 300000) throw new Error('Ảnh ' + file.name + ' quá lớn để lưu');
      return out;
    },
    // Ảnh đại diện: cắt vuông giữa ảnh, mặc định 256px (size, q tuỳ chọn; avatar người dùng dùng 160px)
    async avatar(file, size, q) {
      const S = size || 256;
      if (!/^image\//.test(file.type)) throw new Error('"' + file.name + '" không phải ảnh');
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Không đọc được ảnh')); i.src = URL.createObjectURL(file); });
      const sz = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
      g.drawImage(img, (img.width - sz) / 2, (img.height - sz) / 2, sz, sz, 0, 0, S, S);
      URL.revokeObjectURL(img.src); return c.toDataURL('image/jpeg', q || .85);
    },
    pdf(file) {
      return new Promise((ok, no) => {
        if (file.type !== 'application/pdf') return no(new Error('"' + file.name + '" không phải PDF'));
        if (file.size > 550000) return no(new Error('PDF "' + file.name + '" lớn hơn ~550KB. Hãy đưa lên Google Drive rồi dán link.'));
        const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(new Error('Không đọc được PDF')); r.readAsDataURL(file);
      });
    }
  };
})();

// Ảnh đại diện dùng chung cho index.html và admin.html: có ảnh thì hiện ảnh, chưa có thì hiện chữ cái đầu trên nền màu
window.Avatar = (function () {
  const COL = ['#0ea5e9', '#6366f1', '#06b6d4', '#10b981', '#f59e0b'];
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return {
    ok: x => typeof x === 'string' && x.length < 60000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x),   // chỉ nhận data URL ảnh
    html(u, cls) {   // u = { name, avatar }; cls = 'sm' | 'lg' (kích thước)
      u = u || {}; const name = String(u.name || '?').trim() || '?';
      if (this.ok(u.avatar)) return '<img class="av ' + (cls || '') + '" src="' + u.avatar + '" alt="' + esc(name) + '">';
      const c = COL[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COL.length];
      return '<span class="av ' + (cls || '') + '" style="background:' + c + '" aria-label="' + esc(name) + '">' + esc(name.charAt(0).toUpperCase()) + '</span>';
    },
    admin(cls) { return '<img class="av ' + (cls || '') + '" src="logo.jpg" alt="Admin" onerror="this.onerror=null;this.src=\'https://i.postimg.cc/tgyk09xn/logo2.jpg\'">'; },
    ai(cls) { return '<span class="av ai ' + (cls || '') + '" aria-label="AI">AI</span>'; }
  };
})();
